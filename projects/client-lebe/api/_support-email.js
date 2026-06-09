const crypto = require('crypto');
const {
  escapeHtml,
  renderEmailLayout,
  renderParagraph,
  renderRows,
  renderSection,
} = require('./_email-layout');

const SUPPORT_INBOX = process.env.SUPPORT_INBOX || 'support@lebe.life';
const SUPPORT_FROM_EMAIL = process.env.SUPPORT_FROM_EMAIL || 'LEBE Store <support@mail.lebe.life>';

class SupportError extends Error {
  constructor(status, publicMessage) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
  }
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
  if (normalizeText(fields.lebe_confirm_url, 120)) {
    throw new SupportError(400, 'Unable to submit this request.');
  }
}

async function sendResendEmail(message, label = 'email') {
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
    console.error(`Resend ${label} error:`, response.status, detail);
    throw new SupportError(502, 'We could not send your request right now. Please try again.');
  }

  return response.json().catch(() => ({}));
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

  const staffHtml = renderEmailLayout({
    kicker: 'support request',
    title: 'New request.',
    asideKicker: 'internal note.',
    asideText: 'Customer care.',
    footer: 'Reply to this notification to respond to the customer.',
    children: `
      ${renderSection('Overview.', [
        renderParagraph(staffIntro),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:18px;">${renderRows([
          { label: 'Reference', value: referenceId },
        ])}</table>`,
      ].join(''))}
      ${renderSection('Details.', renderFieldList(staffFields))}
    `,
  });

  const customerText = renderCustomerConfirmation(referenceId, customerIntro);
  const customerHtml = renderEmailLayout({
    kicker: 'customer care',
    title: 'Request received.',
    asideKicker: 'support.',
    asideText: 'We have your note.',
    footer: 'LEBE customer care',
    children: `
      ${renderSection('Overview.', [
        renderParagraph('LEBE received your request.'),
        renderParagraph(customerIntro),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:18px;">${renderRows([
          { label: 'Reference', value: referenceId },
        ])}</table>`,
      ].join(''))}
      ${renderSection('Next step.', renderParagraph('We’ll review it and respond as soon as possible.'))}
    `,
  });

  await sendResendEmail({
    to: SUPPORT_INBOX,
    reply_to: replyTo,
    subject: normalizeSubject(staffSubject),
    text: staffText,
    html: staffHtml,
  }, 'staff notification');

  let customerConfirmationSent = true;
  try {
    await sendResendEmail({
      to: customerEmail,
      subject: normalizeSubject(customerSubject),
      text: customerText,
      html: customerHtml,
    }, 'customer confirmation');
  } catch (error) {
    customerConfirmationSent = false;
    console.error(`Customer confirmation failed for ${referenceId}:`, error.message);
  }

  return { customerConfirmationSent };
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
