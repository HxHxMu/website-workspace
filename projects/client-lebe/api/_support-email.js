const crypto = require('crypto');

const SUPPORT_INBOX = process.env.SUPPORT_INBOX || 'support@lebe.life';
const SUPPORT_FROM_EMAIL = process.env.SUPPORT_FROM_EMAIL || 'LEBE Support <support@lebe.life>';

class SupportError extends Error {
  constructor(status, publicMessage) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeText(value, maxLength = 2000) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeSubject(value) {
  return normalizeText(value, 180).replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  const email = normalizeText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new SupportError(400, 'Please enter a valid email address.');
  }
  return email;
}

function requiredText(fields, key, label, maxLength = 1000) {
  const value = normalizeText(fields[key], maxLength);
  if (!value) {
    throw new SupportError(400, `${label} is required.`);
  }
  return value;
}

function generateReferenceId() {
  const year = new Date().getUTCFullYear();
  const token = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `LEBE-${year}-${token}`;
}

function validateHoneypot(fields) {
  if (normalizeText(fields.company, 120)) {
    throw new SupportError(400, 'Unable to submit this request.');
  }
}

async function sendResendEmail(message) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new SupportError(503, 'Support email is not configured yet.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...message,
      from: SUPPORT_FROM_EMAIL,
      subject: normalizeSubject(message.subject),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Resend email error:', response.status, detail);
    throw new SupportError(502, 'We could not send your request right now. Please try again.');
  }
}

function renderFieldList(fields) {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
    .map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong><br>${escapeHtml(value).replaceAll('\n', '<br>')}</p>`)
    .join('\n');
}

function renderCustomerConfirmation(referenceId, intro) {
  return [
    'LEBE received your request.',
    '',
    `Reference: ${referenceId}`,
    '',
    intro,
    '',
    'We’ll review it and respond as soon as possible.',
  ].join('\n');
}

async function sendSupportRequest({
  referenceId,
  customerEmail,
  customerName,
  staffSubject,
  staffIntro,
  staffFields,
  customerSubject,
  customerIntro,
}) {
  const replyTo = customerEmail;
  const staffText = [
    staffIntro,
    '',
    `Reference: ${referenceId}`,
    '',
    ...Object.entries(staffFields).map(([label, value]) => `${label}: ${value || '—'}`),
  ].join('\n');

  const staffHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #050505;">
      <p>${escapeHtml(staffIntro)}</p>
      <p><strong>Reference:</strong> ${escapeHtml(referenceId)}</p>
      ${renderFieldList(staffFields)}
    </div>
  `;

  const customerText = renderCustomerConfirmation(referenceId, customerIntro);
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #050505;">
      <p>LEBE received your request.</p>
      <p><strong>Reference:</strong> ${escapeHtml(referenceId)}</p>
      <p>${escapeHtml(customerIntro)}</p>
      <p>We’ll review it and respond as soon as possible.</p>
    </div>
  `;

  await Promise.all([
    sendResendEmail({
      to: SUPPORT_INBOX,
      reply_to: replyTo,
      subject: normalizeSubject(staffSubject),
      text: staffText,
      html: staffHtml,
    }),
    sendResendEmail({
      to: customerEmail,
      subject: normalizeSubject(customerSubject),
      text: customerText,
      html: customerHtml,
    }),
  ]);
}

module.exports = {
  SupportError,
  generateReferenceId,
  normalizeEmail,
  normalizeText,
  requiredText,
  sendSupportRequest,
  validateHoneypot,
};
