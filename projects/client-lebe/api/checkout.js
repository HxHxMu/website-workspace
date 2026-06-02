const Stripe = require('stripe');

const PRINTFUL_API_BASE = 'https://api.printful.com';

// Helper to make authenticated requests to Printful API
async function fetchFromPrintful(endpoint, apiKey, options = {}) {
  const response = await fetch(`${PRINTFUL_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    let errorText = await response.text();
    console.error('❌ Printful error status:', response.status);
    console.error('❌ Printful error text:', errorText);

    try {
      const error = JSON.parse(errorText);
      console.error('❌ Printful error JSON:', JSON.stringify(error, null, 2));
      throw new Error(`Printful API error: ${error.message || error.error?.message || response.statusText}`);
    } catch (e) {
      console.error('❌ Printful error (could not parse JSON)');
      throw new Error(`Printful API error: ${errorText || response.statusText}`);
    }
  }

  return response.json();
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

  const { items, customer, paymentIntentId } = req.body;

  if (!items || !customer || !paymentIntentId) {
    return res.status(400).json({ error: 'Missing items, customer, or paymentIntentId' });
  }

  try {
    // Verify Stripe payment succeeded before touching Printful
    const stripe = Stripe(STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not confirmed' });
    }

    // Create order in Printful
    const orderData = {
      recipient: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        address1: customer.address1,
        city: customer.city,
        state_code: (customer.state || '').toUpperCase(),
        zip_code: customer.zip,
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
      shipping: 'STANDARD',
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
