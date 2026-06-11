const Stripe = require('stripe');
const {
  CheckoutError,
  amountFromCents,
  createOrderMetadata,
  estimatePrintfulOrder,
  hashOrder,
  hydratePrintfulItems,
  resolvePromotionDiscount,
  validateRecipient,
} = require('./_checkout-utils');

function sendCheckoutError(res, error) {
  const status = error instanceof CheckoutError ? error.status : 500;
  const message = error instanceof CheckoutError ? error.publicMessage : error.message;
  return res.status(status).json({ error: message });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!PRINTFUL_API_KEY || !STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    const { items, address, shippingMethod, previousPaymentIntentId, promoCode } = req.body;
    if (!shippingMethod?.id) {
      throw new CheckoutError(400, 'Missing shipping method.');
    }

    const stripe = Stripe(STRIPE_SECRET_KEY);

    if (previousPaymentIntentId) {
      try {
        const previousIntent = await stripe.paymentIntents.retrieve(previousPaymentIntentId);
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(previousIntent.status)) {
          await stripe.paymentIntents.cancel(previousPaymentIntentId);
        }
      } catch (_) {}
    }

    const recipient = validateRecipient(address);
    const hydratedItems = await hydratePrintfulItems(items, PRINTFUL_API_KEY, { requireSyncVariantId: true });
    const estimate = await estimatePrintfulOrder({
      items: hydratedItems,
      recipient,
      shippingId: shippingMethod.id,
      apiKey: PRINTFUL_API_KEY,
    });

    const promo = await resolvePromotionDiscount(stripe, {
      code: promoCode,
      subtotalCents: estimate.subtotalCents,
      currency: 'usd',
      allowFirstTimeTransaction: true,
      enforceFirstTimeTransaction: true,
      customerEmail: recipient.email,
    });

    const discountedSubtotalCents = Math.max(0, estimate.subtotalCents - promo.discountCents);
    const finalCents = discountedSubtotalCents + estimate.shippingCents + estimate.taxCents;
    const orderHash = hashOrder(hydratedItems, shippingMethod.id, recipient);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalCents,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: createOrderMetadata({
        items: hydratedItems,
        recipient,
        shippingMethod,
        orderHash,
        expectedCents: finalCents,
        discountCents: promo.discountCents,
        appliedDiscount: promo.summary,
      }),
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      orderHash,
      shippingMethod: {
        id: shippingMethod.id,
        label: shippingMethod.label || shippingMethod.name || shippingMethod.id,
        minDeliveryDays: shippingMethod.minDeliveryDays ?? null,
        maxDeliveryDays: shippingMethod.maxDeliveryDays ?? null,
      },
      subtotal: amountFromCents(estimate.subtotalCents),
      discount: amountFromCents(promo.discountCents),
      discountedSubtotal: amountFromCents(discountedSubtotalCents),
      shipping: amountFromCents(estimate.shippingCents),
      tax: amountFromCents(estimate.taxCents),
      total: amountFromCents(finalCents),
      appliedDiscount: promo.summary,
    });
  } catch (error) {
    console.error('stripe-intent error:', error);
    return sendCheckoutError(res, error);
  }
};
