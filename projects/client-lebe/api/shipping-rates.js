const {
  CheckoutError,
  PRINTFUL_API_BASE,
  SUPPORTED_COUNTRY_CODE,
  buildShippingRateItems,
  hydratePrintfulItems,
  normalizeRecipientAddress,
} = require('./_checkout-utils');

function summarizeItems(items) {
  return items.map((item) => ({
    variantId: Number(item.variantId),
    syncVariantId: Number(item.syncVariantId),
    quantity: Number(item.quantity),
    name: item.name || '',
    size: item.size || '',
  }));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  if (!PRINTFUL_API_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    const { items, address } = req.body;
    if (!address || !address.city || !address.state || !address.zip) {
      throw new CheckoutError(400, 'Missing or incomplete shipping address.');
    }

    const recipient = normalizeRecipientAddress(address);
    if (recipient.country_code !== SUPPORTED_COUNTRY_CODE) {
      throw new CheckoutError(400, 'We currently ship only within the United States.');
    }

    const hydratedItems = await hydratePrintfulItems(items, PRINTFUL_API_KEY, {
      requireVariantId: true,
      requireSyncVariantId: true,
    });

    const payload = {
      recipient,
      items: buildShippingRateItems(hydratedItems),
      currency: 'USD',
      locale: 'en_US',
    };

    console.log('📦 Shipping rates request:', JSON.stringify({
      address: {
        city: payload.recipient.city,
        state_code: payload.recipient.state_code,
        zip: payload.recipient.zip,
        country_code: payload.recipient.country_code,
        hasPhone: Boolean(payload.recipient.phone),
      },
      items: summarizeItems(hydratedItems),
    }, null, 2));

    const response = await fetch(`${PRINTFUL_API_BASE}/shipping/rates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
      })),
    });
  } catch (error) {
    console.error('shipping-rates error:', error);
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ error: error.publicMessage });
    }
    return res.status(500).json({ error: error.message });
  }
};
