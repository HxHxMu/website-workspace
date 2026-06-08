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
FULFILLMENT_ADMIN_TOKEN=...
RESEND_API_KEY=...
SUPPORT_INBOX=support@lebe.life
SUPPORT_FROM_EMAIL="LEBE Support <support@lebe.life>"
```

`FULFILLMENT_ADMIN_TOKEN` should be a long random value. It protects the manual reconciliation endpoint.

`RESEND_API_KEY` powers the private support forms. `SUPPORT_INBOX` is where contact and order issue requests are delivered. `SUPPORT_FROM_EMAIL` must use a sender/domain verified in Resend.

## Stripe Setup

1. Create or use a Stripe account in test mode first.
2. Add `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`.
3. In Stripe Dashboard, create a webhook endpoint:
   - URL: `https://<your-domain>/api/stripe-webhook`
   - Event: `payment_intent.succeeded`
4. Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Create Promotion Codes in Stripe for any customer-facing discount codes.

## Printful Setup

1. Create a Printful API key from Printful settings.
2. Add it as `PRINTFUL_API_KEY`.
3. Confirm every storefront variant has both:
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

### `POST /api/stripe-webhook`

Durable fulfillment path for `payment_intent.succeeded`. Stripe retries this endpoint if Printful is temporarily unavailable.

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
