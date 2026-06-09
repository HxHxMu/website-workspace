const {
  escapeHtml,
  renderButton,
  renderDataTable,
  renderEmailLayout,
  renderParagraph,
  renderRows,
  renderSection,
} = require('./_email-layout');

function formatMoneyFromCents(cents) {
  return `$${((Number(cents) || 0) / 100).toFixed(2)}`;
}

function formatAddress(recipient = {}) {
  return [
    recipient.name,
    recipient.address1,
    `${recipient.city || ''}, ${recipient.state_code || recipient.state || ''} ${recipient.zip || ''}`.trim(),
    recipient.country_code || recipient.country,
  ].filter(Boolean).join('\n');
}

function itemLabel(item = {}) {
  const details = [item.color, item.size].filter(Boolean).join(' / ');
  return [
    item.name || 'LEBE garment',
    details || '',
    `Qty: ${Number(item.quantity) || 1}`,
  ].filter(Boolean).join(' · ');
}

function itemName(item = {}) {
  return item.name || 'LEBE garment';
}

function itemDetails(item = {}) {
  return [item.color, item.size].filter(Boolean).join(' / ') || item.variantName || 'Made-to-order';
}

function orderItemName(item = {}) {
  return item.name || item.product?.name || item.sync_product?.name || '';
}

function orderItemDetails(item = {}) {
  return item.variant_name || item.variantName || [item.color, item.size].filter(Boolean).join(' / ') || 'Made-to-order';
}

function normalizeOrderItems(order = {}, metadataItems = []) {
  const orderItems = Array.isArray(order.items) ? order.items : [];
  if (orderItems.length > 0) {
    return orderItems.map((item, index) => {
      const metadataItem = metadataItems[index] || {};
      return {
        name: orderItemName(item) || metadataItem.name || 'LEBE garment',
        variantName: orderItemDetails(item),
        size: metadataItem.size || item.size || '',
        color: metadataItem.color || item.color || '',
        quantity: Number(item.quantity || item.qty || metadataItem.quantity) || 1,
      };
    });
  }

  return metadataItems;
}

function buildItemsText(items = []) {
  return items.map((item) => `- ${itemLabel(item)}`).join('\n');
}

function buildItemsTable(items = []) {
  return renderDataTable({
    headers: ['Item', 'Details', 'Qty'],
    rows: items.map((item) => [
      itemName(item),
      itemDetails(item),
      String(Number(item.quantity) || 1),
    ]),
  });
}

function addressHtml(recipient = {}) {
  return escapeHtml(formatAddress(recipient)).replaceAll('\n', '<br>');
}

function buildOrderEmail({ paymentIntent, fulfillment }) {
  const recipient = fulfillment.recipient || {};
  const items = fulfillment.items || [];
  const estimate = fulfillment.estimate || {};
  const discountCents = Number(fulfillment.discountCents) || 0;
  const orderId = fulfillment.order?.id || '';
  const orderReference = fulfillment.order?.external_id || paymentIntent.id;
  const shippingLabel = fulfillment.shippingMethod?.label || fulfillment.shippingMethod?.id || 'Selected shipping';

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
    buildItemsText(items),
    '',
    totalsText,
    '',
    'Ship to',
    formatAddress(recipient),
    '',
    'Shipping method',
    shippingLabel,
    '',
    'Production & tracking',
    'Your pieces are made to order. Production typically takes 2–7 business days before shipment. Tracking will be available once the order ships.',
    '',
    'Questions? Use the contact or order issue forms on lebe.life.',
  ].filter(Boolean).join('\n');

  const html = renderEmailLayout({
    kicker: 'order information',
    title: 'Order confirmed.',
    asideKicker: 'customer order.',
    asideText: 'Made-to-order pieces.',
    footer: 'Questions? Use the contact or order issue forms on lebe.life.',
    children: `
      ${renderSection('Overview.', [
        renderParagraph('Thank you for your LEBE order. We’ve received your payment and your order is queued for fulfillment.'),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:18px;">${renderRows([
          { label: 'Order reference', value: orderReference },
          orderId ? { label: 'Printful order', value: orderId } : null,
        ])}</table>`,
      ].join(''))}
      ${renderSection('Items.', buildItemsTable(items))}
      ${renderSection('Order total.', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${renderRows([
        { label: 'Subtotal', value: formatMoneyFromCents(estimate.subtotalCents) },
        discountCents ? { label: 'Discount', value: `-${formatMoneyFromCents(discountCents)}` } : null,
        { label: 'Shipping', value: formatMoneyFromCents(estimate.shippingCents) },
        { label: 'Estimated tax', value: formatMoneyFromCents(estimate.taxCents) },
        { label: 'Total paid', value: formatMoneyFromCents(paymentIntent.amount) },
      ])}</table>`)}
      ${renderSection('Shipping method.', renderParagraph(shippingLabel))}
      ${renderSection('Ship to.', `<p style="margin:0 0 16px;">${addressHtml(recipient)}</p>`)}
      ${renderSection('Production & tracking.', [
        renderParagraph('Your pieces are made to order. Production typically takes 2–7 business days before shipment.'),
        renderParagraph('Tracking will be available once the order ships, and we’ll send it to you automatically.'),
      ].join(''))}
    `,
  });

  return { text, html, subject: 'Your LEBE order is confirmed' };
}

function buildProductionEmail({ paymentIntent, order, metadataItems = [] }) {
  const orderReference = order.external_id || paymentIntent.id;
  const recipient = order.recipient || {};
  const items = normalizeOrderItems(order, metadataItems);
  const shippingLabel = order.shipping_service_name || order.shipping || paymentIntent.metadata?.ship_label || 'Selected shipping';

  const text = [
    'Your LEBE order is now in production.',
    '',
    `Order reference: ${orderReference}`,
    '',
    'Production & tracking',
    'Your pieces are made to order and are now being prepared for fulfillment. Production typically takes 2–7 business days before shipment.',
    'We’ll send tracking information as soon as the carrier receives your package.',
    '',
    'Shipping method',
    shippingLabel,
    '',
    'Items',
    buildItemsText(items),
    '',
    'Ship to',
    formatAddress(recipient),
  ].filter(Boolean).join('\n');

  const html = renderEmailLayout({
    kicker: 'production update',
    title: 'In production.',
    asideKicker: 'order status.',
    asideText: 'Now being made.',
    footer: 'We’ll send tracking as soon as your order ships.',
    children: `
      ${renderSection('Overview.', [
        renderParagraph('Your LEBE order is now in production. Your pieces are made to order and are being prepared for fulfillment.'),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:18px;">${renderRows([
          { label: 'Order reference', value: orderReference },
        ])}</table>`,
      ].join(''))}
      ${renderSection('Production & tracking.', [
        renderParagraph('Production typically takes 2–7 business days before shipment.'),
        renderParagraph('We’ll send tracking information as soon as the carrier receives your package.'),
      ].join(''))}
      ${renderSection('Shipping method.', renderParagraph(shippingLabel))}
      ${renderSection('Items.', buildItemsTable(items))}
      ${renderSection('Ship to.', `<p style="margin:0 0 16px;">${addressHtml(recipient)}</p>`)}
    `,
  });

  return { subject: 'Your LEBE order is in production', text, html };
}

function normalizeShipment(shipment = {}) {
  const trackingNumber = shipment.tracking_number || shipment.trackingNumber || '';
  const trackingUrl = shipment.tracking_url || shipment.trackingUrl || shipment.url || '';
  const carrier = shipment.carrier || shipment.service || shipment.shipment_service_name || shipment.shipping_service_name || '';
  return {
    id: shipment.id || shipment.shipment_id || trackingNumber || 'shipment',
    trackingNumber,
    trackingUrl,
    carrier,
  };
}

function buildShipmentEmail({ paymentIntent, order, shipment = {}, metadataItems = [] }) {
  const normalizedShipment = normalizeShipment(shipment);
  const orderReference = order.external_id || paymentIntent.id;
  const items = normalizeOrderItems(order, metadataItems);
  const trackingLine = normalizedShipment.trackingUrl
    ? `${normalizedShipment.trackingNumber || 'Tracking'}: ${normalizedShipment.trackingUrl}`
    : (normalizedShipment.trackingNumber || 'Tracking is now available from the carrier.');

  const text = [
    'Your LEBE order has shipped.',
    '',
    `Order reference: ${orderReference}`,
    '',
    'Tracking',
    normalizedShipment.carrier ? `Carrier: ${normalizedShipment.carrier}` : '',
    trackingLine,
    '',
    'Production & tracking',
    'Your made-to-order pieces have left production and are now with the carrier. Tracking may take a short time to update after the label is created.',
    '',
    'Items',
    buildItemsText(items),
  ].filter(Boolean).join('\n');

  const html = renderEmailLayout({
    kicker: 'shipping update',
    title: 'On its way.',
    asideKicker: 'tracking.',
    asideText: 'With the carrier.',
    footer: 'Tracking can take a short time to update after the label is created.',
    children: `
      ${renderSection('Overview.', [
        renderParagraph('Your LEBE order has shipped. Your made-to-order pieces have left production and are now with the carrier.'),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:18px;">${renderRows([
          { label: 'Order reference', value: orderReference },
          normalizedShipment.carrier ? { label: 'Carrier', value: normalizedShipment.carrier } : null,
          normalizedShipment.trackingNumber ? { label: 'Tracking number', value: normalizedShipment.trackingNumber } : null,
        ])}</table>`,
        renderButton({ href: normalizedShipment.trackingUrl, label: 'Track package' }),
      ].join(''))}
      ${renderSection('Production & tracking.', renderParagraph('Tracking may take a short time to update after the carrier receives the package.'))}
      ${renderSection('Items.', buildItemsTable(items))}
    `,
  });

  return { subject: 'Your LEBE order has shipped', text, html, shipment: normalizedShipment };
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
    throw new Error(`Resend order email failed: ${response.status} ${detail}`);
  }
}

function getReplyTo() {
  return process.env.SUPPORT_REPLY_TO || process.env.SUPPORT_INBOX || 'support@lebe.life';
}

async function sendCustomerEmail({ to, email }) {
  await sendResendEmail({
    to,
    reply_to: getReplyTo(),
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
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
  await sendCustomerEmail({ to: customerEmail, email });

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

async function sendProductionEmailOnce({ stripe, paymentIntent, order, metadataItems = [] }) {
  const latestIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
  if (latestIntent.metadata?.production_email_sent === 'true') {
    return { sent: false, skipped: true };
  }

  const customerEmail = order.recipient?.email || latestIntent.metadata?.rec_email;
  if (!customerEmail) {
    return { sent: false, skipped: true, reason: 'missing customer email' };
  }

  const email = buildProductionEmail({ paymentIntent: latestIntent, order, metadataItems });
  await sendCustomerEmail({ to: customerEmail, email });

  await stripe.paymentIntents.update(latestIntent.id, {
    metadata: {
      production_email_sent: 'true',
      production_email_sent_at: new Date().toISOString(),
      printful_order_id: String(order.id || latestIntent.metadata?.printful_order_id || ''),
      printful_order_status: String(order.status || ''),
    },
  });

  return { sent: true, skipped: false };
}

function shipmentMetadataKey(shipment = {}) {
  const shipmentId = String(normalizeShipment(shipment).id || 'shipment').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
  return `shipment_email_${shipmentId || 'sent'}`.slice(0, 40);
}

async function sendShipmentEmailOnce({ stripe, paymentIntent, order, shipment, metadataItems = [] }) {
  const latestIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
  const metadataKey = shipmentMetadataKey(shipment);
  if (latestIntent.metadata?.[metadataKey] === 'true') {
    return { sent: false, skipped: true };
  }

  const customerEmail = order.recipient?.email || latestIntent.metadata?.rec_email;
  if (!customerEmail) {
    return { sent: false, skipped: true, reason: 'missing customer email' };
  }

  const email = buildShipmentEmail({ paymentIntent: latestIntent, order, shipment, metadataItems });
  await sendCustomerEmail({ to: customerEmail, email });

  await stripe.paymentIntents.update(latestIntent.id, {
    metadata: {
      [metadataKey]: 'true',
      [`${metadataKey}_at`.slice(0, 40)]: new Date().toISOString(),
      printful_order_id: String(order.id || latestIntent.metadata?.printful_order_id || ''),
      printful_order_status: String(order.status || ''),
    },
  });

  return { sent: true, skipped: false, shipmentId: email.shipment.id };
}

module.exports = {
  buildProductionEmail,
  buildShipmentEmail,
  trySendOrderConfirmationEmail,
  sendProductionEmailOnce,
  sendShipmentEmailOnce,
};
