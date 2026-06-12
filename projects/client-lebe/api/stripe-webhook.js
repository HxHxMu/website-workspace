const Stripe = require('stripe');
const {
  CheckoutError,
  fulfillPaidOrder,
} = require('./_checkout-utils');
const { trySendOrderConfirmationEmail, trySendAdminAlertEmail } = require('./_order-email');

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  if (!PRINTFUL_API_KEY || !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const stripe = Stripe(STRIPE_SECRET_KEY);
  let event;

  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers['stripe-signature'],
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error('stripe-webhook signature error:', error);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return res.status(200).json({ received: true });
  }

  const paymentIntent = event.data.object;
  if (!paymentIntent.metadata?.order_items_chunks) {
    console.warn('stripe-webhook ignored PaymentIntent without checkout snapshot:', paymentIntent.id);
    return res.status(200).json({ received: true, ignored: true });
  }

  try {
    const fulfillment = await fulfillPaidOrder({
      stripe,
      paymentIntent,
      apiKey: PRINTFUL_API_KEY,
    });
    const confirmationEmail = await trySendOrderConfirmationEmail({
      stripe,
      paymentIntent,
      fulfillment,
    });

    return res.status(200).json({
      received: true,
      orderId: fulfillment.order.id,
      confirmationEmail,
    });
  } catch (error) {
    console.error('stripe-webhook fulfillment error:', error);
    await trySendAdminAlertEmail({ paymentIntent, error });
    if (error instanceof CheckoutError && error.status < 500) {
      return res.status(200).json({ received: true, ignored: error.publicMessage });
    }
    return res.status(500).json({ error: 'Fulfillment failed; Stripe should retry this webhook.' });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
