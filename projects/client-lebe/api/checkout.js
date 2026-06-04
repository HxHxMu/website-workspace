const Stripe = require('stripe');
const crypto = require('crypto');

const PRINTFUL_API_BASE = 'https://api.printful.com';

async function fetchFromPrintful(endpoint, apiKey, options = {}) {
  const response = await fetch(`${PRINTFUL_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Printful error status:', response.status);
    console.error('❌ Printful error text:', errorText);
    let message = errorText || response.statusText;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.message || parsed.error?.message || message;
    } catch (_) {}
    throw new Error(`Printful API error: ${message}`);
  }

  return response.json();
}

function hashOrder(items, shippingId) {
  const normalized = items
    .map(i => ({ id: String(i.syncVariantId), qty: Number(i.quantity) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return crypto.createHash('sha256')
    .update(JSON.stringify({ items: normalized, shipping: shippingId }))
    .digest('hex');
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

  const { items, customer, paymentIntentId, shippingMethod } = req.body;

  if (!items || !customer || !paymentIntentId || !shippingMethod || !shippingMethod.id) {
    return res.status(400).json({ error: 'Missing items, customer, paymentIntentId, or shippingMethod' });
  }

  try {
    // Verify Stripe payment succeeded and matches this exact order
    const stripe = Stripe(STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not confirmed' });
    }
    const expectedHash = hashOrder(items, shippingMethod.id);
    if (paymentIntent.metadata?.lebe_order_hash !== expectedHash) {
      console.error('❌ Order hash mismatch — possible PI substitution attempt');
      return res.status(400).json({ error: 'Payment does not match this order' });
    }

    // Create order in Printful (external_id ties this order to the PI, preventing duplicates on retry)
    const orderData = {
      recipient: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        address1: customer.address1,
        city: customer.city,
        state_code: (customer.state || '').toUpperCase(),
        zip: customer.zip,
        country_code: (customer.country || 'US').toUpperCase()
      },
      items: items.map(item => {
        const orderItem = {
          sync_variant_id: Number(item.syncVariantId),
          quantity: Number(item.quantity)
        };
        if (item.options && item.options.length > 0) {
          orderItem.options = {};
          item.options.forEach(opt => {
            orderItem.options[opt.id] = opt.value;
          });
        }
        return orderItem;
      }),
      external_id: paymentIntentId,
      shipping: shippingMethod.id,
      currency: 'USD',
      confirm: true
    };

    console.log('📦 Sending order to Printful:', JSON.stringify(orderData, null, 2));

    const result = await fetchFromPrintful('/orders', PRINTFUL_API_KEY, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });

    console.log('✓ Order created:', result);

    const order = result.result;

    res.status(200).json({
      success: true,
      orderId: order.id,
      externalId: order.external_id,
      estimatedDelivery: order.estimated_delivery,
      totalCost: order.total_cost,
      shippingCost: order.shipping_cost
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      error: 'Failed to create order',
      message: error.message
    });
  }
}
