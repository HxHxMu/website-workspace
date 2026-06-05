# Code Review — LEBE Checkout (branch `lebe-2.0`)

**Date:** 2026-06-05
**Scope:** `git diff main...HEAD` plus working tree — the Printful + Stripe checkout build
**Method:** Two passes. High-effort multi-angle review (API layer + product page), then a max-effort pass that added the 970-line `cart.html` checkout state machine, `main.js`, and `printful.js`, plus a gap sweep.
**Files reviewed:** `api/checkout.js`, `api/stripe-intent.js`, `api/promo-code.js`, `api/shipping-rates.js`, `api/product.js`, `api/products.js`, `api/stripe-config.js`, `src/cart.html` (inline checkout script), `src/js/cart.js`, `src/js/product.js`, `src/js/main.js`, `src/js/printful.js`, `dev-server.js`

---

## Summary

22 findings. The payment and order-creation path has the highest concentration of real defects: a buyer can pay a low amount and receive an expensive order, promo codes have no enforced redemption limit, and a charged customer can end up with an unshippable order. None of these are style issues — they are money and fulfillment integrity holes.

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | Critical | `api/checkout.js:61` | PI amount never verified against order cost | CONFIRMED |
| 2 | Critical | `api/checkout.js:53` | Customer recipient fields not validated | CONFIRMED |
| 3 | Critical | `api/stripe-intent.js:161` | Promo not attached to PI → `max_redemptions` unenforceable | CONFIRMED |
| 4 | High | `api/shipping-rates.js:49` | `variant_id` vs `sync_variant_id` ID-space mismatch | CONFIRMED |
| 5 | High | `src/cart.html:987` | `previousPaymentIntentId` always null → orphaned PaymentIntents | CONFIRMED |
| 6 | High | `api/checkout.js:103` | No idempotency on retry → 500 though order placed | CONFIRMED |
| 7 | High | `api/checkout.js:65` | Order hash omits shipping address | CONFIRMED |
| 8 | High | `api/promo-code.js:16` | No rate limiting → promo brute-force oracle | CONFIRMED |
| 9 | Medium | `src/cart.html:891` | `NaN !== NaN` fires spurious `replaceCart`/`renderCart` | CONFIRMED |
| 10 | Medium | `src/js/main.js:71` / `src/cart.html:576` | Displayed total drops discount after qty change | CONFIRMED |
| 11 | Medium | `src/js/cart.js:49` / `src/js/main.js:87` | Quantity unbounded and not integer-validated | CONFIRMED |
| 12 | Medium | `api/stripe-intent.js:191` / `api/checkout.js:140` | Raw upstream error text leaked to client | CONFIRMED |
| 13 | Medium | `src/js/main.js:78` | `syncVariantId:'undefined'` collision mutates wrong row | PLAUSIBLE |
| 14 | Medium | `api/products.js:51` | N+1 Printful calls for price lookup | CONFIRMED |
| 15 | Medium | `src/js/product.js:20` | Removed size-selection gate | CONFIRMED |
| 16 | Low | `api/stripe-intent.js:154` | Percent-off float math → 1¢ drift from displayed total | PLAUSIBLE |
| 17 | Low | `api/checkout.js:30` + `api/stripe-intent.js:6` | `hashOrder` duplicated across files | CONFIRMED |
| 18 | Low | `api/stripe-intent.js:15` + `api/promo-code.js:3` | Discount-summary builder duplicated | CONFIRMED |
| 19 | Low | `src/js/main.js:148` | Upsell map keyed to wrong ID space; only checks `cart[0]` | PLAUSIBLE |
| 20 | Low | `src/js/main.js:185` | Upsell price rendered without `.toFixed(2)` | CONFIRMED |
| 21 | Low | `src/cart.html:1098` | Dead `dataset.persisted` guard | CONFIRMED |
| 22 | Low | `src/cart.html:1260` | Client/server subtotal divergence misleads preview | PLAUSIBLE |

---

## Critical — block ship

### 1. PaymentIntent amount is never verified against the order cost
**Location:** `api/checkout.js:61`
**Status:** CONFIRMED

`checkout.js` checks `paymentIntent.status === 'succeeded'` and that `lebe_order_hash` matches the submitted items + shipping. It never reads `paymentIntent.amount` and never re-runs the Printful cost estimate. The hash covers `syncVariantId + quantity + shippingMethod.id` only — not the dollar amount.

**Failure scenario:** Attacker creates a PI for a $1 cart via `/api/stripe-intent`, pays it, then POSTs `/api/checkout` with an expensive item list that hashes the same. Verification passes and Printful ships the expensive order for $1 charged.

**Fix:** On checkout, re-derive the expected amount server-side (re-run `/orders/estimate-costs` with the submitted items + shipping, re-apply the promo), then assert `paymentIntent.amount === expectedCents` before creating the order. Alternatively, store `expectedCents` in PI metadata at intent time and compare it here. Trusting "PI succeeded" is not authorization to fulfill an arbitrary cart.

---

### 2. Customer recipient fields are not validated before order creation
**Location:** `api/checkout.js:53`
**Status:** CONFIRMED

The guard is `if (!items || !customer || !paymentIntentId || !shippingMethod || !shippingMethod.id)`. It checks that `customer` is truthy but never checks `customer.name`, `email`, `address1`, `city`, `zip`. The order hash also omits the address (see #7), so nothing downstream catches a blank recipient. The card is already charged in `cart.html` before `/api/checkout` runs.

**Failure scenario:** Request `{items, customer:{name:'x'}, paymentIntentId, shippingMethod}` passes the guard. Printful receives `address1: undefined, city: undefined, zip: undefined`, and either rejects with a 500 (customer already paid, no order) or — in test/draft mode — creates an unshippable confirmed order.

**Fix:** Validate every required recipient field explicitly and return 400 before touching Stripe/Printful. Mirror the field set already validated in `stripe-intent.js:` (`address1`, `city`, `state`, `zip`).

---

### 3. Promo code is not attached to the PaymentIntent — `max_redemptions` is unenforceable
**Location:** `api/stripe-intent.js:161`
**Status:** CONFIRMED

The code validates the promo via `stripe.promotionCodes.list({ active: true })` and computes the discount manually, but `paymentIntents.create()` is called with only `amount`, `currency`, `payment_method_types`, and `metadata`. No `promotion_code` is attached. Stripe only decrements a code's redemption counter when it is attached to a Checkout Session or Invoice, so the counter never moves.

**Failure scenario:** A code with `max_redemptions=1` passes the `active:true` check for every caller. Two concurrent shoppers both get the discount; both pay; the code remains usable indefinitely.

**Fix:** Either move to a Stripe Checkout Session (which natively tracks redemptions), or attach the promotion code to the PI and reconcile redemptions yourself, or enforce `max_redemptions`/`times_redeemed` manually by reading the promotion code object before honoring it. At minimum, check `promotionCode.max_redemptions` against `promotionCode.times_redeemed` server-side.

---

## High

### 4. Shipping rates use `variant_id`; the charge uses `sync_variant_id`
**Location:** `api/shipping-rates.js:49`
**Status:** CONFIRMED

`shipping-rates.js` sends `variant_id: Number(item.variantId)` to Printful `/shipping/rates`. `stripe-intent.js:94` and `checkout.js` send `sync_variant_id: Number(item.syncVariantId)` to `/orders/estimate-costs` and `/orders`. These are different Printful ID spaces (generic catalog variant vs store-specific sync variant).

**Failure scenario:** The same cart item resolves to variants with different dimensions/weights across the two ID spaces. The rate quoted to the customer (and used to pick `shippingMethod.id`) differs from the shipping cost baked into the PI. Customer sees Standard at $5.99 but is charged $8.99, or vice versa.

**Fix:** Use one ID consistently. Confirm which field Printful `/shipping/rates` expects and align `stripe-intent`/`checkout` to match, or convert IDs in one place so all three endpoints describe the same physical variant.

---

### 5. `previousPaymentIntentId` is always null — orphaned PaymentIntents leak
**Location:** `src/cart.html:987` (server-side dead code at `api/stripe-intent.js:72-79`)
**Status:** CONFIRMED

In `preparePaymentSetup`, `state.paymentSetup = null` runs at line 977, then the fetch body at line 987 reads `previousPaymentIntentId: state.paymentSetup?.paymentIntentId || null`. Because `paymentSetup` was just nulled, this is always `null`. The server's cancellation block only runs when `previousPaymentIntentId` is truthy, so it never executes.

**Failure scenario:** User picks shipping A (creates PI-1), then picks shipping B / applies a promo / re-calcs. A fresh PI-2 is created and PI-1 is never cancelled. Every re-selection leaks an uncancelled PaymentIntent in `requires_payment_method` state.

**Fix:** Capture the id before resetting:
```js
const prevIntentId = state.paymentSetup?.paymentIntentId || null;
state.paymentSetup = null;
// ...send previousPaymentIntentId: prevIntentId
```

---

### 6. No idempotency on Printful order creation — retry returns 500 though the order was placed
**Location:** `api/checkout.js:103`
**Status:** CONFIRMED

`external_id` is set to `paymentIntentId` to dedupe, but the catch block at `:136` is undifferentiated — a Printful duplicate-`external_id` rejection is treated like any other failure and returns `{ error: 'Failed to create order' }`.

**Failure scenario:** Client times out and retries `/checkout`. The first call already created the order; Printful rejects the second with a conflict; the customer sees "Failed to create order" while the order is real and will ship. They may re-pay or open a support ticket.

**Fix:** Inspect the Printful error for a duplicate-`external_id`/conflict signal and, on that case, fetch the existing order and return it as success (2xx) instead of 500. This makes checkout safely retryable.

---

### 7. Order hash omits the shipping address
**Location:** `api/checkout.js:65` (hash defined `:30`)
**Status:** CONFIRMED

`hashOrder` covers `syncVariantId + quantity + shippingMethod.id`. The recipient address is not part of the hash, so it can be changed between PI creation and order submission without invalidating verification.

**Failure scenario:** Customer enters address A, gets a PI, pays, then submits `/checkout` with address B. Hash still matches; the order ships to an address that was never validated or tied to the payment.

**Fix:** Include the normalized recipient address in the hashed payload, or re-derive and bind the address server-side from the PI metadata rather than trusting the checkout request body.

---

### 8. Promo validation endpoint is an unthrottled brute-force oracle
**Location:** `api/promo-code.js:16`
**Status:** CONFIRMED

`/api/promo-code` takes an arbitrary `code`, calls `stripe.promotionCodes.list`, and returns 200 + discount details on a hit, 404 on a miss. No rate limiting, captcha, or attempt cap.

**Failure scenario:** A script submits thousands of guesses. The 200-vs-404 split reveals which codes are live and their percent/amount off, and each call consumes Stripe API quota.

**Fix:** Add per-IP rate limiting and a short lockout on repeated misses. Consider returning a uniform response shape and not echoing discount details until a code is actually applied at intent time.

---

## Medium

### 9. `NaN !== NaN` causes spurious `replaceCart` + `renderCart` mid-checkout
**Location:** `src/cart.html:891`
**Status:** CONFIRMED

`hydrateMissingVariantIds` ends with `hydratedItems.some((item, index) => Number(item.variantId) !== Number(cartItems[index].variantId))`. When an item legitimately can't be hydrated (returned unchanged at `:873`, `variantId` stays undefined), `Number(undefined) !== Number(undefined)` is `NaN !== NaN`, which is `true`.

**Failure scenario:** Any unhydratable item makes `.some()` true on every call, so `Cart.replaceCart()` rewrites the cart and `renderCart()` re-binds all qty/remove handlers on every `fetchShippingRates` / `preparePaymentSetup` / checkout submit. Wasted work plus a re-render flash during checkout.

**Fix:** Use a NaN-safe comparison, or only flag items whose `variantId` actually became defined: `Number.isFinite(Number(item.variantId)) && Number(item.variantId) !== Number(cartItems[index].variantId)`.

---

### 10. Displayed total drops the discount after a quantity change
**Location:** `src/js/main.js:71` overwrites `src/cart.html:576`
**Status:** CONFIRMED

`renderCart` (main.js) writes `cartTotal = subtotal.toFixed(2)` with no discount. `resetCartSummary` (cart.html) writes `subtotal − discount`. The qty handler order at `main.js:80-82` is `updateQuantity → resetCheckoutState (→resetCartSummary) → renderCart`, so `renderCart` runs last and wins. `resetCheckoutState` never clears `state.appliedDiscount`, so the discount row stays visible while the total ignores it. The frozen `appliedDiscount.amount` is also stale (computed against the old quantity).

**Failure scenario:** User applies SAVE10, clicks qty+. Bag now shows Subtotal $X, Discount −$D, Total $X — total contradicts the discount line. Reducing quantity can over-subtract the frozen dollar amount.

**Fix:** Make one function the single owner of summary rendering. Have `renderCart` subtract the active discount (or delegate to `resetCartSummary`), and recompute `appliedDiscount.amount` from the current subtotal whenever quantity changes.

---

### 11. Quantity is unbounded and not integer-validated
**Location:** `src/js/cart.js:49` (and `:30`), `src/js/main.js:87`, `src/js/product.js` qty controls
**Status:** CONFIRMED

`Cart.addItem` does `existing.quantity += item.quantity` and `Cart.updateQuantity` stores the raw value; neither coerces to a positive integer or caps a maximum. `qty-plus` increments without limit. Server endpoints take `Number(item.quantity)` with no bound.

**Failure scenario:** Holding qty+ (or editing localStorage) sets quantity to 9999 → `stripe-intent` charges and `checkout` submits a confirm-true order for 9999 made-to-order units. A string/NaN quantity makes `getSubtotal` return NaN → totals render `$NaN` and checkout breaks with no UI recovery.

**Fix:** Clamp and validate at the `Cart` boundary: `quantity = Math.max(1, Math.min(MAX, Math.floor(Number(quantity) || 1)))`. Enforce the same ceiling server-side in `stripe-intent` and `checkout`.

---

### 12. Raw upstream error text is returned to the browser
**Location:** `api/stripe-intent.js:191`, `api/checkout.js:140`
**Status:** CONFIRMED

Both endpoints return `error.message` directly. Because Printful failures throw with the raw upstream response text embedded, internal Printful messages reach the client verbatim.

**Failure scenario:** A Printful 4xx body describing store/variant/account internals is forwarded to the shopper. Information disclosure plus confusing vendor strings in the UI.

**Fix:** Log the raw error server-side; return a generic, user-safe message to the client. Keep a correlation id if you want to trace it.

---

### 13. `syncVariantId: 'undefined'` collision mutates the wrong cart row
**Location:** `src/js/main.js:78` (also `:91`, `:104`; `cart.js:45`, `:60`)
**Status:** PLAUSIBLE

Cart handlers match items by `String(i.syncVariantId) === svid`. Two distinct items both lacking `syncVariantId` render `data-sync-variant-id="undefined"` and collide. `Cart.updateQuantity`/`removeItem` also key solely on `syncVariantId`.

**Failure scenario:** Cart holds two legacy/migrated items with no `syncVariantId` (the case `hydrateMissingVariantIds` exists for). Clicking remove/qty on the second row finds the first → wrong item changed or removed.

**Fix:** Key cart rows by a stable composite (productId + size + color) or assign a per-line id when items are added, rather than relying on `syncVariantId` alone.

---

### 14. N+1 Printful calls in the product list endpoint
**Location:** `api/products.js:51`
**Status:** CONFIRMED

`/api/products` fetches the list, then fires one extra `GET /store/products/:id` per product solely to read `retail_price`.

**Failure scenario:** A 15-product catalog makes 16 calls per request. On a CDN cache miss during a traffic spike this exceeds Printful's ~120 req/min limit; price lookups throw, are swallowed, and products render with `price: null` (shown as `—`).

**Fix:** Cache the detail responses, store starting prices in `products.json`, or precompute a price map at build time. Reduce to a single list call on the hot path.

---

### 15. Removed size-selection gate
**Location:** `src/js/product.js:20`
**Status:** CONFIRMED

The previous `product.js` blocked add-to-cart until the user explicitly chose a size. The rewrite pre-selects M (`getPreferredDefaultVariant`) and allows immediate purchase.

**Failure scenario:** User taps add-to-cart without noticing M is pre-selected (the selector can sit below the fold on mobile). A made-to-order item ships in the wrong size with no exchange path.

**Fix:** Require an explicit size tap before enabling the buy button, or make the pre-selected size visually unmistakable and confirm on add.

---

## Low — cleanup, display, and hardening

### 16. Percent-off float math drifts 1¢ from the displayed total
**Location:** `api/stripe-intent.js:154`
**Status:** PLAUSIBLE

`calculateDiscountAmount` multiplies floats before `Math.round(finalTotal * 100)`. A 15% discount on $29.99 (4.4985) can round to a `finalCents` that is 1¢ off the client-displayed total, showing up on receipts/chargebacks.

**Fix:** Compute discounts in integer cents throughout.

---

### 17. `hashOrder` duplicated across files
**Location:** `api/checkout.js:30` and `api/stripe-intent.js:6`
**Status:** CONFIRMED

Byte-for-byte identical. The hash is the order-integrity contract; if the two copies ever diverge (someone adds a field to one), every order silently fails hash validation at checkout.

**Fix:** Extract to a shared `api/_lib/order.js`.

---

### 18. Discount-summary builder duplicated
**Location:** `api/stripe-intent.js:15` (`summarizePromotionCode`) and `api/promo-code.js:3` (`buildDiscountSummary`)
**Status:** CONFIRMED

Structurally identical under two names. Adding a coupon field to one leaves the other stale, producing inconsistent discount objects between validation and intent.

**Fix:** Single shared helper.

---

### 19. Upsell map keyed to the wrong ID space; only inspects `cart[0]`
**Location:** `src/js/main.js:148`
**Status:** PLAUSIBLE

`PRODUCT_COLOR_UPSELL_MAP` is keyed by hardcoded Printful IDs (e.g. `309483674`). Cart `productId` comes from `/api/product`'s `syncProduct.id` (and dev-server's 1–15). Neither space matches the constants except by coincidence, so the upsell mostly no-ops. The logic also only looks at `cart[0]`.

**Fix:** Derive complements from the same product data the rest of the page uses, and evaluate the whole cart, not just the first item.

---

### 20. Upsell price rendered without `.toFixed(2)`
**Location:** `src/js/main.js:185` (dataset at `:193`)
**Status:** CONFIRMED

`$${Number(matchingVariant.price || complementProduct.price || 0)}` prints `$129.5` or `$95` instead of the site-wide two-decimal format. The `||` chain also treats a legitimate price of 0 as falsy.

**Fix:** `$${Number(...).toFixed(2)}`.

---

### 21. Dead `dataset.persisted` guard
**Location:** `src/cart.html:1098`
**Status:** CONFIRMED

`refs.checkoutError.dataset.persisted` is read but never set anywhere. The branch always clears the error on card input change. Benign today (fails open), but the intended "keep order error pinned while editing card" behavior does not exist, and setting it to a truthy string later would invert the guard.

**Fix:** Either implement the persisted-error flag properly or remove the dead check.

---

### 22. Client/server subtotal divergence misleads the pre-checkout preview
**Location:** `src/cart.html:1260`
**Status:** PLAUSIBLE

The promo handler computes the discount against `Cart.getSubtotal()` (localStorage retail prices) while the server computes against Printful's `retail_costs.subtotal`. If cached prices are stale (or an upsell item's price came from a different field), the bag preview total differs from what is actually charged once shipping loads.

**Fix:** Treat the server total as authoritative and label the bag figure as an estimate, or fetch the authoritative subtotal before showing a discounted preview.

---

## Also noted (not itemized above)

- `normalizeLocalAssetPath` and `fetchFromPrintful` are copy-pasted across `api/product.js`, `api/products.js`, and partially in `checkout.js`/`shipping-rates.js`. A shared `api/_lib/printful.js` removes four copies.
- `findColorVariants` Strategy 1 and Strategy 3 in `src/js/product.js` duplicate the same base-name extraction and O(n²) filter; `buildColorVariantMap` repeats the entry-reduce logic used inline in `findColorVariants`.
- Two HTML escapers exist: `escHtml` (`main.js:2`) and `escapeHtml` (`printful.js:50`).

---

## Recommended order of work

1. **Block ship on #1, #2, #3** — direct money/fulfillment integrity holes in `checkout.js` and `stripe-intent.js`.
2. **Then #4–#8** — shipping ID mismatch, orphaned PIs, retry idempotency, address binding, promo brute-force.
3. **Then #9–#15** — checkout state correctness and quantity bounds.
4. **Low items** as cleanup once the integrity work lands; #17 and #18 reduce the chance of reintroducing #1/#3 later.
