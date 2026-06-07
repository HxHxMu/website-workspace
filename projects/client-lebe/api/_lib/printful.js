const PRINTFUL_API_BASE = 'https://api.printful.com';

function normalizeLocalAssetPath(value) {
  if (!value) return value;
  const raw = String(value).trim();
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) {
    return raw;
  }
  return raw.replace(/^\.\//, '').replace(/^\/+/, '');
}

async function getPrintfulErrorMessage(response) {
  const errorText = await response.text();
  let message = errorText || response.statusText;
  try {
    const parsed = JSON.parse(errorText);
    message = parsed.result || parsed.message || parsed.error?.message || message;
  } catch (_) {}
  return message;
}

async function fetchFromPrintful(endpoint, apiKey, options = {}) {
  const response = await fetch(`${PRINTFUL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await getPrintfulErrorMessage(response);
    const error = new Error(`Printful API error: ${message}`);
    error.statusCode = response.status;
    error.printfulMessage = message;
    throw error;
  }

  return response.json();
}

module.exports = {
  PRINTFUL_API_BASE,
  fetchFromPrintful,
  normalizeLocalAssetPath,
};
