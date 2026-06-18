const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const MIN_SUBMIT_AGE_MS = 2500;
const MAX_SUBMIT_AGE_MS = 2 * 60 * 60 * 1000;
const FORM_MARKER = 'support-form-v1';

const rateBuckets = new Map();

function getHeader(req, name) {
  return String(req.headers?.[name] || req.headers?.[name.toLowerCase()] || '').trim();
}

function genericSpamError(SupportError) {
  return new SupportError(400, 'Unable to submit this request.');
}

function getClientIp(req) {
  const forwardedFor = getHeader(req, 'x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return getHeader(req, 'x-real-ip') || req.socket?.remoteAddress || 'unknown';
}

function pruneRateBuckets(now) {
  for (const [key, bucket] of rateBuckets.entries()) {
    if (!bucket.length || now - bucket[bucket.length - 1] > RATE_LIMIT_WINDOW_MS) {
      rateBuckets.delete(key);
    }
  }
}

function validateRateLimit(req, SupportError) {
  const now = Date.now();
  pruneRateBuckets(now);

  const key = `${getClientIp(req)}:${req.url || 'support'}`;
  const bucket = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp <= RATE_LIMIT_WINDOW_MS);

  if (bucket.length >= RATE_LIMIT_MAX) {
    throw new SupportError(429, 'Too many requests. Please wait a few minutes and try again.');
  }

  bucket.push(now);
  rateBuckets.set(key, bucket);
}

function validateOrigin(req, SupportError) {
  const origin = getHeader(req, 'origin');
  const host = getHeader(req, 'host');
  const fetchSite = getHeader(req, 'sec-fetch-site').toLowerCase();

  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    throw genericSpamError(SupportError);
  }

  if (!origin || !host) {
    throw genericSpamError(SupportError);
  }

  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      throw genericSpamError(SupportError);
    }
  } catch (_) {
    throw genericSpamError(SupportError);
  }
}

function validateRequestShape(req, fields, SupportError) {
  const contentType = getHeader(req, 'content-type').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw genericSpamError(SupportError);
  }

  if (fields.lebe_support_marker !== FORM_MARKER) {
    throw genericSpamError(SupportError);
  }

  const startedAt = Number(fields.lebe_form_started_at);
  const age = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || age < MIN_SUBMIT_AGE_MS || age > MAX_SUBMIT_AGE_MS) {
    throw genericSpamError(SupportError);
  }
}

function countMatches(value, regex) {
  return (String(value || '').match(regex) || []).length;
}

function scoreSpamText(value, { allowLinks = false } = {}) {
  const text = String(value || '').toLowerCase();
  let score = 0;

  const urlCount = countMatches(text, /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|info|biz|xyz|top|click|site|online|ru|cn)\b)/gi);
  if (urlCount >= 2) score += 3;
  if (urlCount === 1 && !allowLinks) score += 1;

  const promoTerms = [
    'backlink',
    'casino',
    'crypto',
    'domain authority',
    'guest post',
    'increase traffic',
    'investment opportunity',
    'rank on google',
    'seo services',
    'telegram',
    'viagra',
    'web design services',
    'whatsapp',
  ];
  score += promoTerms.filter((term) => text.includes(term)).length;

  if (countMatches(text, /[\u0400-\u04FF]/g) > 8) score += 2;
  if (/(.)\1{12,}/.test(text)) score += 1;

  return score;
}

function validateTextQuality(fields, textKeys, SupportError, options = {}) {
  const combinedText = textKeys.map((key) => fields[key]).join('\n');
  if (scoreSpamText(combinedText, options) >= 3) {
    throw genericSpamError(SupportError);
  }
}

function validateSupportSubmission(req, fields, SupportError, options = {}) {
  if (String(fields.website || fields.company_website || '').trim()) {
    throw genericSpamError(SupportError);
  }

  validateOrigin(req, SupportError);
  validateRequestShape(req, fields, SupportError);
  validateRateLimit(req, SupportError);
  validateTextQuality(fields, options.textKeys || [], SupportError, options);
}

module.exports = {
  validateSupportSubmission,
};
