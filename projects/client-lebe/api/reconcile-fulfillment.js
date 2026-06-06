const Stripe = require('stripe');
const {
  CheckoutError,
  fulfillPaidOrder,
} = require('./_checkout-utils');

function getBearerToken(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const FULFILLMENT_ADMIN_TOKEN = process.env.FULFILLMENT_ADMIN_TOKEN;

  if (!PRINTFUL_API_KEY || !STRIPE_SECRET_KEY || !FULFILLMENT_ADMIN_TOKEN) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  if (getBearerToken(req) !== FULFILLMENT_ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const paymentIntentId = String(req.body?.paymentIntentId || '').trim();
  if (!paymentIntentId) {
    return res.status(400).json({ error: 'Missing paymentIntentId' });
  }

  try {
    const stripe = Stripe(STRIPE_SECRET_KEY);
    const fulfillment = await fulfillPaidOrder({
      stripe,
      paymentIntentId,
      apiKey: PRINTFUL_API_KEY,
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
    console.error('reconcile-fulfillment error:', error);
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ error: error.publicMessage });
    }
    return res.status(500).json({ error: 'Fulfillment reconciliation failed.' });
  }
};
