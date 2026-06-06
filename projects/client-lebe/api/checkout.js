const Stripe = require('stripe');
const {
  CheckoutError,
  fulfillPaidOrder,
} = require('./_checkout-utils');

function sendError(res, status, message) {
  return res.status(status).json({ error: message, message });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!PRINTFUL_API_KEY || !STRIPE_SECRET_KEY) {
    return sendError(res, 500, 'Missing environment variables');
  }

  try {
    const { items, customer, paymentIntentId, shippingMethod, orderHash } = req.body;
    if (!items || !customer || !paymentIntentId || !shippingMethod?.id) {
      return sendError(res, 400, 'Missing items, customer, paymentIntentId, or shippingMethod');
    }

    const stripe = Stripe(STRIPE_SECRET_KEY);
    const fulfillment = await fulfillPaidOrder({
      stripe,
      paymentIntentId,
      apiKey: PRINTFUL_API_KEY,
      requestOrder: {
        items,
        customer,
        shippingMethod,
        orderHash,
      },
    });

    return res.status(200).json({
      success: true,
      orderId: fulfillment.order.id,
      externalId: fulfillment.order.external_id,
      estimatedDelivery: fulfillment.estimatedDelivery,
      totalCost: fulfillment.totalCost,
      shippingCost: fulfillment.shippingCost,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    if (error instanceof CheckoutError) {
      return sendError(res, error.status, error.publicMessage);
    }
    return sendError(res, 500, 'We could not finalize your order right now. Please contact support if your card was charged.');
  }
};
