const Stripe = require('stripe');

const PRINTFUL_API_BASE = 'https://api.printful.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!PRINTFUL_API_KEY || !STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing or empty items' });
  }

  try {
    // Look up retail prices from Printful server-side so the client can't fake the amount
    let totalCents = 0;
    for (const item of items) {
      const r = await fetch(`${PRINTFUL_API_BASE}/store/variants/${Number(item.syncVariantId)}`, {
        headers: {
          'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Variant lookup failed for ${item.syncVariantId}: ${text}`);
      }

      const data = await r.json();
      const variant = data.result;
      if (!variant || !variant.retail_price) throw new Error(`Variant not found: ${item.syncVariantId}`);

      const price = parseFloat(variant.retail_price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`Invalid price for variant ${item.syncVariantId}`);
      }

      totalCents += Math.round(price * 100) * Math.max(1, Number(item.quantity));
    }

    const stripe = Stripe(STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true }
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('stripe-intent error:', error);
    res.status(500).json({ error: error.message });
  }
};
