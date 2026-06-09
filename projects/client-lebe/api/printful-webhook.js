const Stripe = require('stripe');
const { readOrderSnapshotFromMetadata } = require('./_checkout-utils');
const {
  sendProductionEmailOnce,
  sendShipmentEmailOnce,
} = require('./_order-email');

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return {};
    }
  }
  return req.body;
}

function getQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function verifyWebhookSecret(req) {
  const expectedSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return { ok: false, status: 500, error: 'PRINTFUL_WEBHOOK_SECRET is not configured.' };
  }

  const providedSecret = req.headers['x-lebe-webhook-secret']
    || getQueryValue(req.query?.secret)
    || getQueryValue(req.query?.token);

  if (providedSecret !== expectedSecret) {
    return { ok: false, status: 401, error: 'Invalid webhook secret.' };
  }

  return { ok: true };
}

function getEventType(payload = {}) {
  return String(payload.type || payload.event || payload.action || '').trim();
}

function getEventData(payload = {}) {
  return payload.data || payload;
}

function getOrder(payload = {}) {
  const data = getEventData(payload);
  return data.order || data;
}

function getShipment(payload = {}) {
  const data = getEventData(payload);
  return data.shipment || data.package || data;
}

function getExternalId(order = {}, payload = {}) {
  const data = getEventData(payload);
  return String(order.external_id || data.external_id || data.order_external_id || '').trim();
}

function getMetadataItems(paymentIntent) {
  try {
    return readOrderSnapshotFromMetadata(paymentIntent.metadata || {}).items || [];
  } catch (_) {
    return [];
  }
}

function isPrintfulOrderMismatch(paymentIntent, order = {}) {
  const storedOrderId = String(paymentIntent.metadata?.printful_order_id || '').trim();
  const webhookOrderId = String(order.id || '').trim();
  return Boolean(storedOrderId && webhookOrderId && storedOrderId !== webhookOrderId);
}

async function handleOrderUpdated({ stripe, paymentIntent, order }) {
  if (String(order.status || '').toLowerCase() !== 'inprocess') {
    return { ignored: true, reason: `status ${order.status || 'unknown'}` };
  }

  return sendProductionEmailOnce({
    stripe,
    paymentIntent,
    order,
    metadataItems: getMetadataItems(paymentIntent),
  });
}

async function handlePackageShipped({ stripe, paymentIntent, order, shipment }) {
  return sendShipmentEmailOnce({
    stripe,
    paymentIntent,
    order,
    shipment,
    metadataItems: getMetadataItems(paymentIntent),
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secretCheck = verifyWebhookSecret(req);
  if (!secretCheck.ok) {
    return res.status(secretCheck.status).json({ error: secretCheck.error });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY is not configured.' });
  }

  const payload = parseBody(req);
  const eventType = getEventType(payload);
  const order = getOrder(payload);
  const externalId = getExternalId(order, payload);

  if (!externalId) {
    console.warn('printful-webhook ignored event without external_id:', eventType);
    return res.status(200).json({ received: true, ignored: 'missing external_id' });
  }

  const stripe = Stripe(STRIPE_SECRET_KEY);
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(externalId);
  } catch (error) {
    console.error('printful-webhook could not retrieve PaymentIntent:', externalId, error);
    return res.status(200).json({ received: true, ignored: 'payment intent not found' });
  }

  if (paymentIntent.status !== 'succeeded') {
    return res.status(200).json({ received: true, ignored: 'payment not succeeded' });
  }

  if (isPrintfulOrderMismatch(paymentIntent, order)) {
    console.warn('printful-webhook ignored mismatched Printful order:', {
      paymentIntent: paymentIntent.id,
      storedOrderId: paymentIntent.metadata.printful_order_id,
      webhookOrderId: order.id,
    });
    return res.status(200).json({ received: true, ignored: 'order mismatch' });
  }

  try {
    let emailResult;
    if (eventType === 'order_updated') {
      emailResult = await handleOrderUpdated({ stripe, paymentIntent, order });
    } else if (eventType === 'package_shipped') {
      emailResult = await handlePackageShipped({
        stripe,
        paymentIntent,
        order,
        shipment: getShipment(payload),
      });
    } else {
      return res.status(200).json({ received: true, ignored: `event ${eventType || 'unknown'}` });
    }

    return res.status(200).json({ received: true, event: eventType, email: emailResult });
  } catch (error) {
    console.error('printful-webhook email error:', error);
    return res.status(500).json({ error: 'Status email failed; Printful should retry this webhook.' });
  }
};
