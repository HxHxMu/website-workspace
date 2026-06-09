const crypto = require('crypto');
const {
  PRINTFUL_API_BASE,
  fetchFromPrintful: fetchFromPrintfulRaw,
} = require('./_lib/printful');

const MAX_CART_QUANTITY = 25;
const METADATA_CHUNK_SIZE = 450;
const SUPPORTED_COUNTRY_CODE = 'US';

class CheckoutError extends Error {
  constructor(status, publicMessage, logMessage = publicMessage) {
    super(logMessage);
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

function centsFromAmount(value) {
  return Math.round((Number(value) || 0) * 100);
}

function amountFromCents(cents) {
  return (Number(cents) || 0) / 100;
}

function normalizeRecipientAddress(address = {}) {
  const countryCode = String(address.country_code || address.country || SUPPORTED_COUNTRY_CODE)
    .trim()
    .toUpperCase();

  return {
    name: String(address.name || '').trim(),
    email: String(address.email || '').trim().toLowerCase(),
    phone: String(address.phone || '').trim(),
    address1: String(address.address1 || '').trim(),
    city: String(address.city || '').trim(),
    state_code: String(address.state_code || address.state || '').trim().toUpperCase(),
    zip: String(address.zip || '').trim(),
    country_code: countryCode,
  };
}

function validateRecipient(address) {
  const recipient = normalizeRecipientAddress(address);
  const requiredFields = ['name', 'email', 'address1', 'city', 'state_code', 'zip', 'country_code'];
  const missingField = requiredFields.find((field) => !recipient[field]);
  if (missingField) {
    throw new CheckoutError(400, 'Missing or incomplete shipping recipient details.');
  }
  if (recipient.country_code !== SUPPORTED_COUNTRY_CODE) {
    throw new CheckoutError(400, 'We currently ship only within the United States.');
  }
  return recipient;
}

function normalizeQuantity(quantity) {
  const numeric = Math.floor(Number(quantity));
  if (!Number.isFinite(numeric) || numeric < 1) {
    throw new CheckoutError(400, 'Cart contains an invalid item quantity.');
  }
  return Math.min(MAX_CART_QUANTITY, numeric);
}

function normalizeOptions(options) {
  if (!options) return {};

  if (Array.isArray(options)) {
    return options.reduce((result, option) => {
      const id = String(option?.id || '').trim();
      if (id) result[id] = option?.value;
      return result;
    }, {});
  }

  if (typeof options === 'object') {
    return Object.keys(options).reduce((result, key) => {
      const id = String(key || '').trim();
      if (id) result[id] = options[key];
      return result;
    }, {});
  }

  return {};
}

function normalizeLineItem(item = {}) {
  return {
    productId: item.productId ? String(item.productId) : '',
    variantId: Number(item.variantId) > 0 ? Number(item.variantId) : null,
    syncVariantId: Number(item.syncVariantId) > 0 ? Number(item.syncVariantId) : null,
    quantity: normalizeQuantity(item.quantity),
    size: String(item.size || '').trim(),
    color: String(item.color || '').trim(),
    name: String(item.name || '').trim(),
    options: normalizeOptions(item.options),
  };
}

function normalizeLineItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CheckoutError(400, 'Missing or empty items.');
  }
  return items.map(normalizeLineItem);
}

async function fetchFromPrintful(endpoint, apiKey, options = {}) {
  try {
    return await fetchFromPrintfulRaw(endpoint, apiKey, options);
  } catch (error) {
    throw new CheckoutError(
      502,
      'Printful could not verify this order right now.',
      error.message || 'Printful API error'
    );
  }
}

async function fetchStoreProduct(productId, apiKey) {
  const data = await fetchFromPrintful(`/store/products/${encodeURIComponent(productId)}`, apiKey);
  const variants = data?.result?.sync_variants || [];
  return variants.map((variant) => ({
    variantId: Number(variant.variant_id) || null,
    syncVariantId: Number(variant.id) || null,
    size: String(variant.size || '').trim(),
    color: String(variant.color || '').trim(),
    name: String(variant.name || '').trim(),
    options: variant.options || [],
  }));
}

function findMatchingVariant(variants, item) {
  if (item.syncVariantId) {
    return variants.find((variant) => Number(variant.syncVariantId) === Number(item.syncVariantId));
  }

  if (item.variantId) {
    return variants.find((variant) => Number(variant.variantId) === Number(item.variantId));
  }

  const size = item.size.toLowerCase();
  const color = item.color.toLowerCase();
  return variants.find((variant) => {
    const sameSize = !size || variant.size.toLowerCase() === size;
    const sameColor = !color || variant.color.toLowerCase() === color;
    return sameSize && sameColor;
  }) || variants.find((variant) => {
    const sameSize = !size || variant.size.toLowerCase() === size;
    return sameSize;
  });
}

async function hydratePrintfulItems(items, apiKey, requirements = {}) {
  const normalizedItems = normalizeLineItems(items);
  const productCache = new Map();

  const hydratedItems = await Promise.all(normalizedItems.map(async (item) => {
    if (item.productId) {
      if (!productCache.has(item.productId)) {
        productCache.set(item.productId, fetchStoreProduct(item.productId, apiKey));
      }

      const variants = await productCache.get(item.productId);
      const match = findMatchingVariant(variants, item);
      if (match) {
        if (item.variantId && item.syncVariantId) {
          const sameVariant = Number(match.variantId) === Number(item.variantId)
            && Number(match.syncVariantId) === Number(item.syncVariantId);
          if (!sameVariant) {
            throw new CheckoutError(400, 'Cart item variant data is out of date. Please remove and re-add the item.');
          }
        }

        return {
          ...item,
          variantId: match.variantId || item.variantId,
          syncVariantId: match.syncVariantId || item.syncVariantId,
          name: item.name || match.name,
          size: item.size || match.size,
          color: item.color || match.color,
          options: Object.keys(item.options).length ? item.options : normalizeOptions(match.options),
        };
      }
    }

    return item;
  }));

  const missingSyncVariant = hydratedItems.some((item) => !item.syncVariantId);
  if (requirements.requireSyncVariantId && missingSyncVariant) {
    throw new CheckoutError(400, 'Cart item variant data is missing. Please remove and re-add the item.');
  }

  const missingVariant = hydratedItems.some((item) => !item.variantId);
  if (requirements.requireVariantId && missingVariant) {
    throw new CheckoutError(400, 'Cart item shipping data is missing. Please remove and re-add the item.');
  }

  return hydratedItems;
}

function optionHashEntries(options) {
  return Object.entries(normalizeOptions(options))
    .map(([id, value]) => [String(id), String(value ?? '')])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function hashOrder(items, shippingId, recipient) {
  const normalized = normalizeLineItems(items)
    .map((item) => ({
      id: String(item.syncVariantId || ''),
      qty: Number(item.quantity),
      opt: optionHashEntries(item.options),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return crypto.createHash('sha256')
    .update(JSON.stringify({
      items: normalized,
      shipping: String(shippingId || ''),
      recipient: normalizeRecipientAddress(recipient),
    }))
    .digest('hex');
}

function buildEstimateItems(items) {
  return items.map((item) => ({
    sync_variant_id: Number(item.syncVariantId),
    quantity: Number(item.quantity),
  }));
}

function buildShippingRateItems(items) {
  return items.map((item) => ({
    variant_id: Number(item.variantId),
    quantity: Number(item.quantity),
  }));
}

function buildOrderItems(items) {
  return items.map((item) => {
    const orderItem = {
      sync_variant_id: Number(item.syncVariantId),
      quantity: Number(item.quantity),
    };

    if (Object.keys(item.options).length > 0) {
      orderItem.options = item.options;
    }

    return orderItem;
  });
}

async function estimatePrintfulOrder({ items, recipient, shippingId, apiKey }) {
  const estimateResult = await fetchFromPrintful('/orders/estimate-costs', apiKey, {
    method: 'POST',
    body: JSON.stringify({
      recipient,
      items: buildEstimateItems(items),
      shipping: shippingId,
      currency: 'USD',
    }),
  });

  const estimate = estimateResult?.result;
  if (!estimate || !estimate.costs || !estimate.retail_costs) {
    throw new CheckoutError(400, 'Unable to verify the order total for this shipment.');
  }

  return {
    subtotalCents: centsFromAmount(estimate.retail_costs.subtotal ?? estimate.costs?.subtotal ?? 0),
    shippingCents: centsFromAmount(estimate.retail_costs.shipping ?? estimate.costs?.shipping ?? 0),
    taxCents: centsFromAmount(estimate.retail_costs.tax ?? estimate.costs?.tax ?? 0),
    raw: estimate,
  };
}

function summarizePromotionCode(promotionCode) {
  const coupon = promotionCode?.coupon || {};
  return {
    promotionCodeId: promotionCode.id,
    code: promotionCode.code,
    couponId: coupon.id || null,
    name: coupon.name || promotionCode.code,
    percentOff: Number.isFinite(Number(coupon.percent_off)) ? Number(coupon.percent_off) : null,
    amountOff: Number.isFinite(Number(coupon.amount_off)) ? amountFromCents(coupon.amount_off) : null,
    currency: coupon.currency || 'usd',
    minimumAmount: promotionCode.restrictions?.minimum_amount
      ? amountFromCents(promotionCode.restrictions.minimum_amount)
      : null,
    minimumAmountCurrency: promotionCode.restrictions?.minimum_amount_currency || null,
  };
}

function validatePromotionCode(promotionCode, subtotalCents, currency = 'usd') {
  const coupon = promotionCode?.coupon || {};
  if (!promotionCode || !promotionCode.active || !coupon || coupon.valid === false) {
    throw new CheckoutError(400, 'This discount code is invalid or expired.');
  }

  if (promotionCode.expires_at && promotionCode.expires_at * 1000 < Date.now()) {
    throw new CheckoutError(400, 'This discount code is invalid or expired.');
  }

  if (promotionCode.max_redemptions && promotionCode.times_redeemed >= promotionCode.max_redemptions) {
    throw new CheckoutError(400, 'This discount code has already been fully redeemed.');
  }

  if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
    throw new CheckoutError(400, 'This discount code has already been fully redeemed.');
  }

  if (promotionCode.restrictions?.first_time_transaction) {
    throw new CheckoutError(400, 'This discount code can’t be used in this checkout.');
  }

  const minimumAmount = Number(promotionCode.restrictions?.minimum_amount);
  const minimumCurrency = String(promotionCode.restrictions?.minimum_amount_currency || currency).toLowerCase();
  if (Number.isFinite(minimumAmount) && minimumAmount > 0) {
    if (minimumCurrency !== currency) {
      throw new CheckoutError(400, 'This discount code can’t be used for USD orders.');
    }
    if (subtotalCents < minimumAmount) {
      throw new CheckoutError(400, `This discount code requires a subtotal of at least $${amountFromCents(minimumAmount).toFixed(2)}.`);
    }
  }

  if (coupon.amount_off && String(coupon.currency || '').toLowerCase() !== currency) {
    throw new CheckoutError(400, 'This discount code can’t be used for USD orders.');
  }
}

function calculateDiscountCents(subtotalCents, promotionCode) {
  const coupon = promotionCode?.coupon || {};
  if (Number.isFinite(Number(coupon.percent_off)) && Number(coupon.percent_off) > 0) {
    return Math.min(subtotalCents, Math.round(subtotalCents * (Number(coupon.percent_off) / 100)));
  }

  if (Number.isFinite(Number(coupon.amount_off)) && Number(coupon.amount_off) > 0) {
    return Math.min(subtotalCents, Number(coupon.amount_off));
  }

  return 0;
}

async function resolvePromotionDiscount(stripe, { code, subtotalCents, currency = 'usd' }) {
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode) {
    return { promotionCode: null, summary: null, discountCents: 0 };
  }

  const promoResult = await stripe.promotionCodes.list({
    code: normalizedCode,
    active: true,
    limit: 1,
    expand: ['data.coupon'],
  });

  const promotionCode = promoResult.data?.[0];
  validatePromotionCode(promotionCode, subtotalCents, currency);

  return {
    promotionCode,
    summary: summarizePromotionCode(promotionCode),
    discountCents: calculateDiscountCents(subtotalCents, promotionCode),
  };
}

function writeMetadataChunks(metadata, key, value) {
  const chunks = String(value || '').match(new RegExp(`.{1,${METADATA_CHUNK_SIZE}}`, 'g')) || [''];
  metadata[`${key}_chunks`] = String(chunks.length);
  chunks.forEach((chunk, index) => {
    metadata[`${key}_${index}`] = chunk;
  });
}

function readMetadataChunks(metadata, key) {
  const chunkCount = Number(metadata?.[`${key}_chunks`] || 0);
  if (!Number.isFinite(chunkCount) || chunkCount <= 0) return '';
  let value = '';
  for (let index = 0; index < chunkCount; index += 1) {
    value += String(metadata?.[`${key}_${index}`] || '');
  }
  return value;
}

function createOrderMetadata({ items, recipient, shippingMethod, orderHash, expectedCents, discountCents, appliedDiscount }) {
  const metadata = {
    lebe_order_hash: orderHash,
    expected_amount_cents: String(expectedCents),
    discount_amount_cents: String(discountCents || 0),
    promo_code: appliedDiscount?.code || '',
    promotion_code_id: appliedDiscount?.promotionCodeId || '',
    ship_id: String(shippingMethod.id),
    ship_label: String(shippingMethod.label || shippingMethod.name || shippingMethod.id).slice(0, 500),
    ship_min_days: shippingMethod.minDeliveryDays == null ? '' : String(shippingMethod.minDeliveryDays),
    ship_max_days: shippingMethod.maxDeliveryDays == null ? '' : String(shippingMethod.maxDeliveryDays),
    rec_name: recipient.name,
    rec_email: recipient.email,
    rec_phone: recipient.phone,
    rec_address1: recipient.address1,
    rec_city: recipient.city,
    rec_state: recipient.state_code,
    rec_zip: recipient.zip,
    rec_country: recipient.country_code,
  };

  const compactItems = items.map((item) => {
    const optionEntries = optionHashEntries(item.options);
    const compact = [
      String(item.syncVariantId),
      item.quantity,
      item.variantId ? String(item.variantId) : '',
      optionEntries,
    ];
    compact.push(String(item.productId || ''));
    compact.push(String(item.name || '').slice(0, 160));
    compact.push(String(item.size || '').slice(0, 80));
    compact.push(String(item.color || '').slice(0, 80));
    return compact;
  });

  writeMetadataChunks(metadata, 'order_items', JSON.stringify(compactItems));
  return metadata;
}

function readOrderSnapshotFromMetadata(metadata = {}) {
  const rawItems = readMetadataChunks(metadata, 'order_items');
  if (!rawItems) {
    throw new CheckoutError(400, 'Payment is missing order details.');
  }

  let compactItems;
  try {
    compactItems = JSON.parse(rawItems);
  } catch (error) {
    throw new CheckoutError(400, 'Payment order details are invalid.');
  }

  const items = compactItems.map((entry) => {
    const hasOptionArray = Array.isArray(entry[3]);
    const displayStart = hasOptionArray ? 4 : 3;
    return {
      syncVariantId: entry[0],
      quantity: entry[1],
      variantId: entry[2],
      options: hasOptionArray
      ? entry[3].reduce((result, optionEntry) => {
        result[optionEntry[0]] = optionEntry[1];
        return result;
      }, {})
      : {},
      productId: entry[displayStart] ? String(entry[displayStart]) : '',
      name: entry[displayStart + 1] ? String(entry[displayStart + 1]) : '',
      size: entry[displayStart + 2] ? String(entry[displayStart + 2]) : '',
      color: entry[displayStart + 3] ? String(entry[displayStart + 3]) : '',
    };
  });

  const recipient = normalizeRecipientAddress({
    name: metadata.rec_name,
    email: metadata.rec_email,
    phone: metadata.rec_phone,
    address1: metadata.rec_address1,
    city: metadata.rec_city,
    state: metadata.rec_state,
    zip: metadata.rec_zip,
    country: metadata.rec_country,
  });

  return {
    items,
    recipient,
    shippingMethod: {
      id: metadata.ship_id,
      label: metadata.ship_label || metadata.ship_id,
      minDeliveryDays: metadata.ship_min_days ? Number(metadata.ship_min_days) : null,
      maxDeliveryDays: metadata.ship_max_days ? Number(metadata.ship_max_days) : null,
    },
    orderHash: metadata.lebe_order_hash,
  };
}

async function fetchExistingOrderByExternalId(externalId, apiKey) {
  try {
    const direct = await fetchFromPrintful(`/orders/@${encodeURIComponent(externalId)}`, apiKey);
    if (direct?.result) return direct.result;
  } catch (_) {}

  for (let offset = 0; offset <= 1000; offset += 100) {
    const result = await fetchFromPrintful(`/orders?limit=100&offset=${offset}`, apiKey);
    const orders = Array.isArray(result?.result) ? result.result : [];
    const existing = orders.find((order) => String(order.external_id) === String(externalId));
    if (existing) return existing;
    if (orders.length < 100) break;
  }

  return null;
}

function getMetadataDiscountCents(metadata, subtotalCents) {
  const cents = Number(metadata?.discount_amount_cents);
  const legacyAmount = Number(metadata?.discount_amount);
  const discountCents = Number.isFinite(cents)
    ? cents
    : (Number.isFinite(legacyAmount) ? centsFromAmount(legacyAmount) : 0);

  if (discountCents < 0 || discountCents > subtotalCents) {
    throw new CheckoutError(400, 'Payment discount metadata does not match this order.');
  }

  return discountCents;
}

async function fulfillPaidOrder({ stripe, paymentIntentId, paymentIntent, apiKey, requestOrder = null }) {
  const intent = paymentIntent || await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== 'succeeded') {
    throw new CheckoutError(400, 'Payment not confirmed.');
  }

  const metadata = intent.metadata || {};
  let recipient;
  let items;
  let shippingMethod;
  let providedHash = '';

  if (requestOrder) {
    recipient = validateRecipient(requestOrder.customer);
    items = await hydratePrintfulItems(requestOrder.items, apiKey, { requireSyncVariantId: true });
    shippingMethod = requestOrder.shippingMethod;
    providedHash = String(requestOrder.orderHash || '');
  } else {
    const snapshot = readOrderSnapshotFromMetadata(metadata);
    recipient = validateRecipient(snapshot.recipient);
    items = await hydratePrintfulItems(snapshot.items, apiKey, { requireSyncVariantId: true });
    shippingMethod = snapshot.shippingMethod;
    providedHash = snapshot.orderHash;
  }

  if (!shippingMethod?.id) {
    throw new CheckoutError(400, 'Missing shipping method.');
  }

  const expectedHash = hashOrder(items, shippingMethod.id, recipient);
  const storedHash = String(metadata.lebe_order_hash || '');
  if (!storedHash || storedHash !== expectedHash || (providedHash && providedHash !== storedHash)) {
    throw new CheckoutError(400, 'Payment does not match this order.', 'Order hash mismatch.');
  }

  const estimate = await estimatePrintfulOrder({
    items,
    recipient,
    shippingId: shippingMethod.id,
    apiKey,
  });

  const discountCents = getMetadataDiscountCents(metadata, estimate.subtotalCents);
  const expectedCents = Math.max(0, estimate.subtotalCents - discountCents)
    + estimate.shippingCents
    + estimate.taxCents;

  if (intent.amount !== expectedCents) {
    throw new CheckoutError(400, 'Payment does not match the latest verified order total.', 'Payment amount mismatch.');
  }

  if (metadata.expected_amount_cents && Number(metadata.expected_amount_cents) !== expectedCents) {
    throw new CheckoutError(400, 'Payment metadata does not match this order.', 'Payment metadata amount mismatch.');
  }

  const orderData = {
    recipient,
    items: buildOrderItems(items),
    external_id: intent.id,
    shipping: shippingMethod.id,
    currency: 'USD',
    confirm: true,
  };

  let result;
  try {
    result = await fetchFromPrintful('/orders', apiKey, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  } catch (error) {
    if (/external_id|already exists|duplicate|conflict/i.test(String(error.message || ''))) {
      const existingOrder = await fetchExistingOrderByExternalId(intent.id, apiKey);
      if (existingOrder) {
        result = { result: existingOrder };
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  const order = result.result;
  let estimatedDelivery = order.estimated_delivery;
  if (!estimatedDelivery) {
    const productionDays = 10;
    const shippingDays = Number(shippingMethod.maxDeliveryDays) || 5;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + productionDays + shippingDays);
    estimatedDelivery = deliveryDate.toISOString().split('T')[0];
  }

  return {
    order,
    estimatedDelivery,
    totalCost: order.total_cost,
    shippingCost: order.shipping_cost,
    recipient,
    items,
    shippingMethod,
    estimate,
    discountCents,
    expectedCents,
  };
}

module.exports = {
  CheckoutError,
  PRINTFUL_API_BASE,
  SUPPORTED_COUNTRY_CODE,
  amountFromCents,
  buildShippingRateItems,
  createOrderMetadata,
  estimatePrintfulOrder,
  fetchFromPrintful,
  fulfillPaidOrder,
  hashOrder,
  hydratePrintfulItems,
  normalizeRecipientAddress,
  resolvePromotionDiscount,
  summarizePromotionCode,
  validateRecipient,
};
