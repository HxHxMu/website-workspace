const PRINTFUL_API_BASE = 'https://api.printful.com';

function normalizeAddress(address) {
  return {
    name: address.name || 'Valued Customer',
    email: address.email || 'customer@example.com',
    phone: address.phone || '',
    address1: address.address1,
    city: address.city,
    state_code: String(address.state).toUpperCase(),
    zip: String(address.zip),
    country_code: String(address.country || 'US').toUpperCase()
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  if (!PRINTFUL_API_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const { items, address } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing or empty items' });
  }

  if (!address || !address.city || !address.state || !address.zip) {
    return res.status(400).json({ error: 'Missing or incomplete shipping address' });
  }

  try {
    const payload = {
      recipient: normalizeAddress(address),
      items: items.map((item) => ({
        variant_id: Number(item.variantId),
        quantity: Number(item.quantity),
      })),
      currency: 'USD',
      locale: 'en_US',
    };

    const response = await fetch(`${PRINTFUL_API_BASE}/shipping/rates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Unable to load shipping methods: ${text}`);
    }

    const data = await response.json();
    const rates = Array.isArray(data.result) ? data.result : [];

    res.status(200).json({
      rates: rates.map((rate) => ({
        id: rate.id,
        name: rate.name,
        rate: parseFloat(rate.rate || 0),
        currency: rate.currency || 'USD',
        minDeliveryDays: rate.minDeliveryDays ?? null,
        maxDeliveryDays: rate.maxDeliveryDays ?? null,
      }))
    });
  } catch (error) {
    console.error('shipping-rates error:', error);
    res.status(500).json({ error: error.message });
  }
};
