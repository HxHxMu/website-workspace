# Modularity & Maintainability Plan — LEBE Site

**Date:** 2026-06-06
**Branch:** `lebe-2.0`
**Goal:** Reduce *blast radius* — the number of places that silently break when you change one thing. Make the site modular enough that a change to checkout, products, or styling stays contained.
**Constraint respected:** Static-first. No bundler. Modularity comes from native ES modules and shared files, all Vercel-compatible.

---

## How to read this

The site works. This is not a rewrite. It is a sequenced extraction that turns implicit coupling (globals, copy-paste, scattered data) into explicit contracts (modules, shared libs, one source of truth). Each stage is independently shippable and leaves the site working.

The ordering is deliberate: **lock behavior with tests first, then de-duplicate contracts, then break up the monolith.** Refactoring a monolith with no tests is how you create the breakage you are trying to prevent.

---

## Part 1 — Where the blast radius is worst today

Ranked by how silently and how widely a change propagates.

### Hazard 1 — The 970-line inline checkout script
**Location:** `src/cart.html` lines 416–1382 (inline `<script>`)

The entire checkout state machine lives inside the HTML file: Stripe Elements, shipping rate selection, promo application, ZIP verification, billing form, a 60-field `refs` object built from `getElementById`, and the `state` object — all in one IIFE.

**Why it hurts:** Cannot be unit-tested, cannot be reused, cannot be linted as a module. Every checkout change (a new field, a copy tweak, a Stripe option) means editing the same 970-line block, and there is no boundary protecting promo logic from shipping logic from payment logic. One typo anywhere can break the whole flow.

### Hazard 2 — `hashOrder` is a duplicated cross-file contract
**Location:** `api/checkout.js:30` and `api/stripe-intent.js:6` (byte-identical)

`stripe-intent` *writes* the order hash into PI metadata; `checkout` *re-computes and verifies* it. The two copies must stay identical forever or **every order silently fails verification and cannot be fulfilled.** Nothing enforces the match.

**Why it hurts:** The most dangerous kind of duplication — a contract split across two files with no link between them. A well-meaning edit to one (e.g. adding the address to the hash, which the security review recommends) breaks all checkouts until someone notices the other copy.

### Hazard 3 — The product/variant/color model is scattered across ~6 places with two ID spaces
**Locations:**
- `dev-server.js` — `mockProducts` (IDs 1–15), `MOCK_COLOR_VARIANTS`, `COLOR_BY_EXTERNAL_ID`, `buildMockVariants`
- `src/data/products.json` — `products`, `colorVariants`
- `src/js/product.js` — `PRODUCT_COLOR_MAP`, `PRODUCT_COLOR_GROUPS`, `findColorVariants` (3 fallback strategies), `buildColorVariantMap`
- `src/js/main.js` — `PRODUCT_COLOR_UPSELL_MAP`, `PRODUCT_SETS`
- `src/js/printful.js` — `FIXED_DESIGN_SLOTS`

Dev uses product IDs 1–15; prod uses Printful sync IDs (`309483674`, etc.). The same concept — "which products are color variants of each other" — is encoded five different ways against two incompatible ID spaces.

**Why it hurts:** Adding or renaming a product means editing up to six files, and dev/prod drift by construction. This already produced a real defect: the upsell map in `main.js` is keyed to IDs that never match what `/api/product` returns, so the feature silently no-ops.

### Hazard 4 — The frontend communicates only through `window` globals and DOM string IDs
**Examples:**
- `main.js` calls `window.resetCheckoutState` — defined in the `cart.html` inline script
- the `cart.html` inline script calls `window.renderCart` — defined in `main.js`
- `window.Cart` (cart.js), `window.handleBuyClick` (product.js), `window.__lebeHandleImageFallback` (printful.js)
- ~60 `getElementById('literal-string')` calls binding JS to exact HTML IDs

**Why it hurts:** No import graph, no contracts, load-order dependent. Reorder two `<script>` tags, rename one HTML `id`, or rename a global, and something silently becomes `null` and throws later, far from the cause. There is no way to know what depends on what without grepping the whole codebase.

### Hazard 5 — Duplicated helpers
- `fetchFromPrintful`, `normalizeLocalAssetPath`, `PRINTFUL_API_BASE` — copy-pasted across `api/product.js`, `api/products.js`, `api/checkout.js`, `api/shipping-rates.js`
- `summarizePromotionCode` (`stripe-intent.js:15`) and `buildDiscountSummary` (`promo-code.js:3`) — same function, two names
- `escHtml` (`main.js:2`) and `escapeHtml` (`printful.js:50`) — two escapers
- color-variant resolution — 3+ implementations (Hazard 3)

**Why it hurts:** A fix or behavior change has to be applied N times; miss one and behavior diverges by file.

---

## Part 2 — Target architecture

Small, explicit modules with one job each. No bundler; native ES modules and shared files.

### API layer
```
api/
  _lib/
    printful.js        // PRINTFUL_API_BASE, fetchFromPrintful, normalizeLocalAssetPath
    order-hash.js      // hashOrder (single source — Hazard 2 fixed)
    discount.js        // summarizePromotionCode, calculateDiscountAmount (Hazard 5)
    products-data.js   // loads products.json once, exposes imageMap + colorVariantMap
    http.js            // method guard, JSON body parse, safe error response (Hazard from bug #12)
  checkout.js          // imports _lib, orchestrates only
  stripe-intent.js     // imports _lib, orchestrates only
  products.js
  product.js
  promo-code.js
  shipping-rates.js
  stripe-config.js
```
Vercel serverless functions can `require`/`import` sibling files under `api/`, so `_lib/` ships fine.

### Frontend (ES modules)
```
src/js/
  lib/
    dom.js             // escapeHtml, $ (typed getElementById helper that throws on missing)
    money.js           // formatMoney — one money formatter for the whole site
    api.js             // thin fetch wrappers for each endpoint, one place for error handling
  data/
    product-model.js   // ONE color/variant resolution module (Hazard 3 + the 3 dupes)
  cart/
    cart-store.js      // window.Cart's logic as an exported module (quantity validation lives here)
    cart-view.js       // renderCart, upsell (from main.js)
  checkout/
    state.js           // the checkout state machine (from cart.html inline)
    refs.js            // the refs object, one place
    stripe.js          // Stripe Elements mount + confirm
    shipping.js        // rate fetch + render + selection
    promo.js           // promo apply + display
    zip.js             // ZIP verification
    index.js           // wires the above; the only thing cart.html loads for checkout
  pages/
    product-page.js    // from product.js
    home-grid.js       // product grid (from printful.js)
    site.js            // menu toggle, reveal observer (shared chrome)
```
`cart.html` shrinks from a 970-line inline script to `<script type="module" src="js/checkout/index.js"></script>`.

---

## Part 3 — Staged migration (safe order)

Each stage ships on its own. Stop after any stage and the site still works.

### Stage 0 — Safety net (do this first)
- Add a checkout smoke test that drives the real flow: add to cart → shipping → promo → payment form mounts → (test-mode) order placed. I can run this with the browser tooling against `localhost:8080`.
- Capture current API response shapes for `/api/products`, `/api/product`, `/api/stripe-intent`, `/api/shipping-rates` as fixtures.
- **De-risks:** every later stage. Without this, "did I break checkout?" is a manual click-through each time.

### Stage 1 — Shared `api/_lib/` (kills Hazard 2 and most of Hazard 5)
- Extract `hashOrder` → `api/_lib/order-hash.js`; import in both `checkout.js` and `stripe-intent.js`.
- Extract `fetchFromPrintful` / `normalizeLocalAssetPath` / `PRINTFUL_API_BASE` → `api/_lib/printful.js`.
- Extract the discount summary → `api/_lib/discount.js`.
- Add `api/_lib/http.js` with a safe error responder (also closes bug #12, raw error leakage).
- **De-risks:** the contract that silently fails all orders. Smallest, highest-leverage change.
- **Lowest blast radius to perform** — pure extraction, no behavior change.

### Stage 2 — One product/variant data model (kills Hazard 3)
- Decide one ID space (Printful sync IDs) and make `dev-server.js` serve the *same shape* as prod from `products.json` fixtures instead of hardcoded `mockProducts`.
- Move all color/variant/upsell mapping into `products.json` (or one `product-model.js`), and have `product.js`, `main.js`, `printful.js` read from it.
- Delete `PRODUCT_COLOR_MAP`, `PRODUCT_COLOR_GROUPS`, `PRODUCT_COLOR_UPSELL_MAP`, `PRODUCT_SETS`, `FIXED_DESIGN_SLOTS` in favor of the single model.
- **De-risks:** the 6-files-per-product-change problem and the dev/prod drift that caused the dead upsell.

### Stage 3 — Frontend shared libs (kills Hazard 5 remainder)
- `lib/money.js` (one `formatMoney`), `lib/dom.js` (one escaper + a `$()` that throws on a missing id so a renamed HTML id fails loudly, not silently), `lib/api.js` (fetch wrappers).
- Move quantity validation/clamping into `cart-store.js` (also closes bug #11).
- **De-risks:** silent `null` from renamed IDs; inconsistent money formatting; scattered fetch error handling.

### Stage 4 — Break up the checkout monolith (kills Hazard 1 and 4)
- Convert scripts to `<script type="module">`.
- Extract the `cart.html` inline script into `js/checkout/*` modules with explicit imports; replace `window.renderCart` / `window.resetCheckoutState` cross-calls with imports.
- `cart.html` ends with one module script tag.
- **De-risks:** the largest single file and the global-coupling web. Do it last, on top of the Stage 0 safety net, because it is the biggest move.

### Stage 5 — Guardrails so it stays modular
- Add a lint rule / simple CI check: no new `window.*` assignments for cross-module calls; no duplicate `PRINTFUL_API_BASE`.
- Document the module boundaries in `docs/architecture.md`.
- **De-risks:** regression back into globals and copy-paste.

---

## Part 4 — Effort and sequencing notes

- Stages 0–1 are quick and almost risk-free; they deliver the biggest safety gain (the order-hash contract). Worth doing even if you stop there.
- Stage 2 is medium and touches data; the smoke test from Stage 0 covers it.
- Stage 4 is the largest, but by then the API and data layers are stable and tested, so the checkout extraction is the only moving part.
- This work creates the natural seams to land the payment-integrity fixes from `docs/code-review-2026-06-05.md` (amount verification, address-in-hash, redemption enforcement) — Stage 1 and Stage 4 are where those belong.

---

## Recommended starting point

**Stage 0 + Stage 1.** A checkout smoke test plus the shared `api/_lib/` extraction. It removes the single most dangerous coupling (the duplicated order-hash contract) with near-zero behavioral risk, and gives you the safety net for everything after.
