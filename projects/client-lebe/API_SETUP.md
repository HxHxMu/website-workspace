# Checkout API Setup

## Overview

This project uses Vercel Functions for a custom Stripe + Printful checkout.

- Product, shipping, tax, and fulfillment data come from Printful.
- Payment is collected by Stripe PaymentIntents.
- Promo codes are managed in Stripe Promotion Codes.
- Printful fulfillment is guarded by a Stripe payment amount check and order hash.
- Stripe webhooks provide durable fulfillment retry if the customer closes the tab after payment.

## Environment Variables

Copy `.env.local.example` to `.env.local` for local work, and add the same values in Vercel.

```bash
PRINTFUL_API_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PRINTFUL_WEBHOOK_SECRET=...
FULFILLMENT_ADMIN_TOKEN=...
RESEND_API_KEY=...
SUPPORT_INBOX=support@lebe.life
SUPPORT_FROM_EMAIL="LEBE Store <support@mail.lebe.life>"
SUPPORT_REPLY_TO=support@lebe.life
META_PIXEL_ID=...
META_CAPI_TOKEN=...
PINTEREST_TAG_ID=...
KLAVIYO_COMPANY_ID=...
KLAVIYO_LIST_ID=...
```

`FULFILLMENT_ADMIN_TOKEN` should be a long random value. It protects the manual reconciliation endpoint.

`RESEND_API_KEY` powers support and order confirmation emails. `SUPPORT_INBOX` is where contact and order issue requests are delivered. `SUPPORT_FROM_EMAIL` must use a sender/domain verified in Resend. `SUPPORT_REPLY_TO` should point to the real customer support inbox.

## Analytics & Marketing Setup

GA4, Meta Pixel, and the Pinterest tag only fire on `www.lebe.life` / `lebe.life` — they're skipped on Vercel previews and localhost by hostname check in `src/partials/shared/_head.html` and `scripts/build-html.js`, so testing and preview traffic never pollutes production data.

`META_PIXEL_ID` is required for both the browser pixel and server-side CAPI. `META_CAPI_TOKEN` comes from Events Manager -> your pixel -> Settings -> Conversions API -> Generate access token. With both set, `api/capi.js` mirrors standard browser pixel events (ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase, Lead) server-side, deduplicated against the browser event via a shared `event_id`. Email (when available, e.g. at purchase or lead submission) is SHA-256 hashed client-side before it's sent.

`PINTEREST_TAG_ID` comes from a Pinterest Business account -> Ads -> Conversions -> install the tag. Domain claiming and catalog setup for Product Pins still happen in the Pinterest dashboard.

`KLAVIYO_COMPANY_ID` (public API key / Site ID) and `KLAVIYO_LIST_ID` control the homepage newsletter offer. Leave either unset and the homepage newsletter section is omitted from the build entirely — no broken form. Submissions POST directly to Klaviyo's client API (`src/js/klaviyo-footer-signup.js`).

The newsletter offer is 15% off a customer's first order. The storefront does not reveal the discount code; Klaviyo sends it in the welcome email. Stripe must have an active Promotion Code named `WELCOME15`; Klaviyo should include the same code in the welcome email.

Klaviyo setup:

1. Create or choose the newsletter list in Audience -> Lists & Segments.
2. Copy the list ID into `KLAVIYO_LIST_ID`.
3. Copy the public API key / Site ID into `KLAVIYO_COMPANY_ID`.
4. Create a welcome flow triggered by subscribing to that list.
5. Send the first email immediately with the code `WELCOME15` and a clear first-order-only note.
6. Optional: add a reminder email for subscribers who have not purchased after 1-2 days.

## Stripe Setup

1. Create or use a Stripe account in test mode first.
2. Add `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`. The publishable key is injected into the cart page at build time so it does not consume a separate Vercel Serverless Function.
3. In Stripe Dashboard, create a webhook endpoint:
   - URL: `https://<your-domain>/api/stripe-webhook`
   - Event: `payment_intent.succeeded`
4. Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Create Promotion Codes in Stripe for any customer-facing discount codes.
6. For the newsletter offer, create a 15% off coupon and an active Promotion Code named `WELCOME15`. Enable Stripe's first-time-transaction restriction for this promotion code; otherwise repeat customers can still use the code.

## Printful Setup

1. Create a Printful API key from Printful settings.
2. Add it as `PRINTFUL_API_KEY`.
3. Create a long random `PRINTFUL_WEBHOOK_SECRET` and add it in Vercel.
4. Configure a Printful webhook endpoint:
   - URL: `https://<your-domain>/api/printful-webhook?secret=<PRINTFUL_WEBHOOK_SECRET>`
   - Events: `order_updated`, `package_shipped`
5. Confirm every storefront variant has both:
   - Printful catalog `variant_id`, used for shipping rates.
   - Printful store `syncVariantId`, used for cost estimates and orders.

The server validates and repairs older cart items when possible, but checkout fails safely if variant identity cannot be proven.

## API Endpoints

### `POST /api/shipping-rates`

Calculates live Printful shipping rates from canonical variant IDs.

### `POST /api/promo-code`

Validates a Stripe Promotion Code against subtotal, currency, redemption, expiration, and supported restrictions.

### `POST /api/stripe-intent`

Creates a Stripe PaymentIntent from server-calculated Printful totals and stores a compact order snapshot in PaymentIntent metadata.

### `POST /api/checkout`

Client-side fulfillment path after Stripe confirms payment. It re-verifies:

- Payment succeeded.
- Payment amount matches latest Printful subtotal, shipping, tax, and Stripe discount metadata.
- Order hash matches the exact items, shipping method, and recipient.
- Printful `external_id` equals the PaymentIntent ID for duplicate protection.

After successful fulfillment, this endpoint sends a customer order confirmation email through Resend and marks the Stripe PaymentIntent metadata to avoid duplicate confirmation emails.

### `POST /api/stripe-webhook`

Durable fulfillment path for `payment_intent.succeeded`. Stripe retries this endpoint if Printful is temporarily unavailable.

This endpoint also attempts the same duplicate-guarded customer order confirmation email after successful fulfillment.

### `POST /api/printful-webhook`

Receives Printful order lifecycle events after fulfillment:

- `order_updated`: sends a duplicate-safe customer email when the order status becomes `inprocess`.
- `package_shipped`: sends a duplicate-safe customer email with tracking details when Printful ships a package.

Because Printful webhooks do not use Stripe-style signed payloads, protect the URL with `PRINTFUL_WEBHOOK_SECRET` as a query string secret.

### `POST /api/reconcile-fulfillment`

Manual recovery endpoint for a paid PaymentIntent that still needs Printful fulfillment retry.

```bash
curl -X POST https://<your-domain>/api/reconcile-fulfillment \
  -H "Authorization: Bearer $FULFILLMENT_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentIntentId":"pi_..."}'
```

### `POST /api/contact`

Receives the public contact form, validates the request, sends the private support inbox a copy, and sends the customer a confirmation with a `LEBE-YYYY-XXXXXX` reference.

### `POST /api/order-issue`

Receives damaged, defective, incorrect, missing, or other order issue requests. The public site does not expose the support email address; requests are routed privately through Resend.

## Test Checklist

Before going live:

1. Run `npm run build`.
2. Place a Stripe test order and confirm a Printful order is created.
3. Replay the Stripe webhook for the same PaymentIntent and confirm no duplicate Printful order is created.
4. Test an invalid/expired promo code.
5. Test a fixed-amount promo code in USD.
6. Test changing shipping methods quickly and confirm only the latest total is paid.
7. Test manual reconciliation with a known paid test PaymentIntent.

## Deployment to Vercel

1. Add all environment variables in Vercel.
2. Deploy.
3. Configure the Stripe webhook to the deployed domain.
4. Run the test checklist against the deployed preview or production URL.
