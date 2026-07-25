const ALLOWED_EVENTS = new Set([
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'AddPaymentInfo',
  'Purchase',
  'Lead',
]);

const ALLOWED_SOURCE_HOSTS = new Set(['www.lebe.life', 'lebe.life']);

function configuredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value || /^your_/i.test(value)) return '';
  return value;
}

function allowedSourceUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    if (parsed.protocol !== 'https:') return '';
    if (!ALLOWED_SOURCE_HOSTS.has(parsed.hostname)) return '';
    return parsed.href;
  } catch (_) {
    return '';
  }
}

function validEmailHash(value) {
  const hash = String(value || '').trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(hash) ? hash : '';
}

function cleanContentIds(value) {
  if (!Array.isArray(value)) return undefined;
  const ids = value
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .slice(0, 50);
  return ids.length > 0 ? ids : undefined;
}

function cleanContents(value) {
  if (!Array.isArray(value)) return undefined;
  const contents = value
    .map((item) => {
      const id = String(item?.id || '').trim();
      if (!id) return null;
      return {
        id,
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        item_price: Math.max(0, Number(item.item_price) || 0),
      };
    })
    .filter(Boolean)
    .slice(0, 50);
  return contents.length > 0 ? contents : undefined;
}

function cleanCustomData(value) {
  const input = value && typeof value === 'object' ? value : {};
  const customData = {};
  const contentIds = cleanContentIds(input.content_ids);
  const contents = cleanContents(input.contents);
  const contentType = String(input.content_type || '').trim();
  const contentName = String(input.content_name || '').trim();
  const currency = String(input.currency || '').trim().toUpperCase();
  const numericValue = Number(input.value);

  if (currency) customData.currency = currency.slice(0, 3);
  if (Number.isFinite(numericValue) && numericValue >= 0) customData.value = numericValue;
  if (contentIds) customData.content_ids = contentIds;
  if (contents) customData.contents = contents;
  if (contentType === 'product' || contentType === 'product_group') customData.content_type = contentType;
  if (contentName) customData.content_name = contentName.slice(0, 200);

  return Object.keys(customData).length > 0 ? customData : undefined;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pixelId = configuredEnv('META_PIXEL_ID');
  const accessToken = configuredEnv('META_CAPI_TOKEN');

  if (!pixelId || !accessToken) {
    return res.status(200).json({ ok: false, skipped: true });
  }

  const { event_name: eventName, event_id: eventId, url, emailHash, custom_data: customData } = req.body || {};
  if (!eventName || !eventId) {
    return res.status(400).json({ error: 'event_name and event_id are required' });
  }
  if (!ALLOWED_EVENTS.has(eventName)) {
    return res.status(400).json({ error: 'Unsupported event_name' });
  }

  const sourceUrl = allowedSourceUrl(url);
  if (!sourceUrl) {
    return res.status(400).json({ error: 'Unsupported event_source_url' });
  }

  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const normalizedEmailHash = validEmailHash(emailHash);

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: sourceUrl,
      user_data: {
        em: normalizedEmailHash ? [normalizedEmailHash] : undefined,
        client_ip_address: forwardedFor || undefined,
        client_user_agent: req.headers['user-agent'] || undefined,
      },
      custom_data: cleanCustomData(customData),
    }],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Meta CAPI error:', data);
      return res.status(502).json({ ok: false });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Meta CAPI request failed:', error);
    return res.status(500).json({ ok: false });
  }
};
