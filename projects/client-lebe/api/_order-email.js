function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatMoneyFromCents(cents) {
  return `$${((Number(cents) || 0) / 100).toFixed(2)}`;
}

function formatAddress(recipient = {}) {
  return [
    recipient.name,
    recipient.address1,
    `${recipient.city}, ${recipient.state_code} ${recipient.zip}`.trim(),
    recipient.country_code,
  ].filter(Boolean).join('\n');
}

function itemLabel(item = {}) {
  return [
    item.name || 'LEBE item',
    item.color ? `Color: ${item.color}` : '',
    item.size ? `Size: ${item.size}` : '',
    `Qty: ${Number(item.quantity) || 1}`,
  ].filter(Boolean).join(' · ');
}

function buildOrderEmail({ paymentIntent, fulfillment }) {
  const recipient = fulfillment.recipient || {};
  const items = fulfillment.items || [];
  const estimate = fulfillment.estimate || {};
  const discountCents = Number(fulfillment.discountCents) || 0;
  const orderId = fulfillment.order?.id || '';
  const orderReference = fulfillment.order?.external_id || paymentIntent.id;
  const shippingLabel = fulfillment.shippingMethod?.label || fulfillment.shippingMethod?.id || 'Selected shipping';

  const itemLines = items.map((item) => `- ${itemLabel(item)}`).join('\n');
  const itemRows = items.map((item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e4;">${escapeHtml(item.name || 'LEBE item')}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e4;">${escapeHtml([item.color, item.size].filter(Boolean).join(' / ') || '—')}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e4; text-align: right;">${Number(item.quantity) || 1}</td>
    </tr>
  `).join('');

  const totalsText = [
    `Subtotal: ${formatMoneyFromCents(estimate.subtotalCents)}`,
    discountCents ? `Discount: -${formatMoneyFromCents(discountCents)}` : '',
    `Shipping: ${formatMoneyFromCents(estimate.shippingCents)}`,
    `Estimated tax: ${formatMoneyFromCents(estimate.taxCents)}`,
    `Total paid: ${formatMoneyFromCents(paymentIntent.amount)}`,
  ].filter(Boolean).join('\n');

  const text = [
    'Thank you for your LEBE order.',
    '',
    `Order reference: ${orderReference}`,
    orderId ? `Printful order: ${orderId}` : '',
    '',
    'Items',
    itemLines,
    '',
    totalsText,
    '',
    'Ship to',
    formatAddress(recipient),
    '',
    `Shipping method: ${shippingLabel}`,
    '',
    'Your pieces are made to order. Production typically takes 2–7 business days before shipment. Tracking will be available once the order ships.',
    '',
    'Questions? Use the contact or order issue forms on lebe.life.',
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #050505; max-width: 640px;">
      <p style="font-size: 18px;">Thank you for your LEBE order.</p>
      <p><strong>Order reference:</strong> ${escapeHtml(orderReference)}</p>
      ${orderId ? `<p><strong>Printful order:</strong> ${escapeHtml(orderId)}</p>` : ''}

      <h2 style="font-size: 18px; margin-top: 32px;">Items</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 0 0 10px; border-bottom: 1px solid #050505; text-align: left;">Item</th>
            <th style="padding: 0 0 10px; border-bottom: 1px solid #050505; text-align: left;">Details</th>
            <th style="padding: 0 0 10px; border-bottom: 1px solid #050505; text-align: right;">Qty</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <h2 style="font-size: 18px; margin-top: 32px;">Order total</h2>
      <p>
        Subtotal: ${formatMoneyFromCents(estimate.subtotalCents)}<br>
        ${discountCents ? `Discount: -${formatMoneyFromCents(discountCents)}<br>` : ''}
        Shipping: ${formatMoneyFromCents(estimate.shippingCents)}<br>
        Estimated tax: ${formatMoneyFromCents(estimate.taxCents)}<br>
        <strong>Total paid: ${formatMoneyFromCents(paymentIntent.amount)}</strong>
      </p>

      <h2 style="font-size: 18px; margin-top: 32px;">Shipping</h2>
      <p>${escapeHtml(formatAddress(recipient)).replaceAll('\n', '<br>')}</p>
      <p><strong>Method:</strong> ${escapeHtml(shippingLabel)}</p>

      <h2 style="font-size: 18px; margin-top: 32px;">Production & tracking</h2>
      <p>Your pieces are made to order. Production typically takes 2–7 business days before shipment. Tracking will be available once the order ships.</p>
      <p>Questions? Use the contact or order issue forms on lebe.life.</p>
    </div>
  `;

  return { text, html, subject: 'Your LEBE order is confirmed' };
}

async function sendResendEmail(message) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const from = process.env.SUPPORT_FROM_EMAIL || 'LEBE Store <support@mail.lebe.life>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, ...message }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend order confirmation failed: ${response.status} ${detail}`);
  }
}

async function sendOrderConfirmationEmailOnce({ stripe, paymentIntent, fulfillment }) {
  const latestIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
  if (latestIntent.metadata?.order_confirmation_email_sent === 'true') {
    return { sent: false, skipped: true };
  }

  const customerEmail = fulfillment.recipient?.email || latestIntent.metadata?.rec_email;
  if (!customerEmail) {
    return { sent: false, skipped: true, reason: 'missing customer email' };
  }

  const email = buildOrderEmail({ paymentIntent: latestIntent, fulfillment });
  await sendResendEmail({
    to: customerEmail,
    reply_to: process.env.SUPPORT_REPLY_TO || process.env.SUPPORT_INBOX || 'support@lebe.life',
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  await stripe.paymentIntents.update(latestIntent.id, {
    metadata: {
      order_confirmation_email_sent: 'true',
      order_confirmation_email_sent_at: new Date().toISOString(),
      printful_order_id: String(fulfillment.order?.id || ''),
    },
  });

  return { sent: true, skipped: false };
}

async function trySendOrderConfirmationEmail(args) {
  try {
    return await sendOrderConfirmationEmailOnce(args);
  } catch (error) {
    console.error('order confirmation email error:', error);
    return { sent: false, skipped: false, error: error.message };
  }
}

module.exports = {
  trySendOrderConfirmationEmail,
};
