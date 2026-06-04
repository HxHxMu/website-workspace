const Stripe = require('stripe');
const crypto = require('crypto');

const PRINTFUL_API_BASE = 'https://api.printful.com';

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

  const { items, address, shippingMethod, previousPaymentIntentId } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing or empty items' });
  }

  if (!address || !address.address1 || !address.city || !address.state || !address.zip) {
    return res.status(400).json({ error: 'Missing or incomplete shipping address' });
  }

  if (!shippingMethod || !shippingMethod.id) {
    return res.status(400).json({ error: 'Missing shipping method' });
  }

  try {
    // Cancel any previous unused intent for this session to avoid orphaned intents
    if (previousPaymentIntentId) {
      try {
        const stripe = Stripe(STRIPE_SECRET_KEY);
        const prev = await stripe.paymentIntents.retrieve(previousPaymentIntentId);
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(prev.status)) {
          await stripe.paymentIntents.cancel(previousPaymentIntentId);
        }
      } catch (_) {}
    }

    // 1. Call Printful estimate endpoint to get shipping, taxes, and subtotal securely on the server
    const estimateData = {
      recipient: {
        name: address.name || 'Valued Customer',
        email: address.email || 'customer@example.com',
        phone: address.phone || '',
        address1: address.address1,
        city: address.city,
        state_code: String(address.state).toUpperCase(),
        zip: String(address.zip),
        country_code: String(address.country || 'US').toUpperCase()
      },
      items: items.map(item => ({
        sync_variant_id: Number(item.syncVariantId),
        quantity: Number(item.quantity)
      })),
      shipping: shippingMethod.id,
      currency: 'USD'
    };

    console.log('📦 Requesting Printful cost estimation:', JSON.stringify(estimateData, null, 2));

    const estimateRes = await fetch(`${PRINTFUL_API_BASE}/orders/estimate-costs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(estimateData)
    });

    if (!estimateRes.ok) {
      const text = await estimateRes.text();
      console.error('❌ Printful estimate failure response:', text);
      let errorMsg = text;
      try {
        const errorJson = JSON.parse(text);
        errorMsg = errorJson.result || errorJson.error?.message || text;
      } catch (e) {}
      throw new Error(`Shipping calculation failed: ${errorMsg}`);
    }

    const estimate = await estimateRes.json();
    const result = estimate.result;
    if (!result || !result.costs || !result.retail_costs) {
      throw new Error('Invalid response from shipping estimation');
    }

    // Extract costs — use ?? so explicit 0 values are preserved; fall back to costs fields for older API responses
    const subtotal = parseFloat(result.retail_costs.subtotal ?? result.costs?.subtotal ?? 0);
    const shipping = parseFloat(result.retail_costs.shipping ?? result.costs.shipping ?? 0);
    const tax = parseFloat(result.retail_costs.tax ?? result.costs.tax ?? 0);

    const finalTotal = subtotal + shipping + tax;
    const finalCents = Math.round(finalTotal * 100);

    console.log(`✓ Calculated costs: subtotal=${subtotal}, shipping=${shipping}, tax=${tax}, total=${finalTotal} (${finalCents} cents)`);

    // 2. Create Stripe Payment Intent for the calculated final total (cents)
    const stripe = Stripe(STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalCents,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: { lebe_order_hash: hashOrder(items, shippingMethod.id) }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      shippingMethod: {
        id: shippingMethod.id,
        label: shippingMethod.label || shippingMethod.id,
        minDeliveryDays: shippingMethod.minDeliveryDays ?? null,
        maxDeliveryDays: shippingMethod.maxDeliveryDays ?? null,
      },
      subtotal,
      shipping,
      tax,
      total: finalTotal
    });
  } catch (error) {
    console.error('stripe-intent error:', error);
    res.status(500).json({ error: error.message });
  }
};
