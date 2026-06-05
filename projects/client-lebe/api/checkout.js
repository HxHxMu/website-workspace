const Stripe = require('stripe');
const crypto = require('crypto');

const PRINTFUL_API_BASE = 'https://api.printful.com';

function sendError(res, status, message) {
  return res.status(status).json({ error: message, message });
}

function normalizeRecipientAddress(customer) {
  return {
    name: String(customer?.name || '').trim(),
    email: String(customer?.email || '').trim().toLowerCase(),
    phone: String(customer?.phone || '').trim(),
    address1: String(customer?.address1 || '').trim(),
    city: String(customer?.city || '').trim(),
    state_code: String(customer?.state || '').trim().toUpperCase(),
    zip: String(customer?.zip || '').trim(),
    country_code: String(customer?.country || 'US').trim().toUpperCase(),
  };
}

function validateRecipient(customer) {
  const recipient = normalizeRecipientAddress(customer);
  const requiredFields = ['name', 'email', 'address1', 'city', 'state_code', 'zip', 'country_code'];
  const missingField = requiredFields.find((field) => !recipient[field]);
  if (missingField) {
    return { recipient, error: 'Missing or incomplete shipping recipient details.' };
  }
  return { recipient, error: null };
}

async function fetchFromPrintful(endpoint, apiKey, options = {}) {
  const response = await fetch(`${PRINTFUL_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Printful error status:', response.status);
    console.error('❌ Printful error text:', errorText);
    let message = errorText || response.statusText;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.message || parsed.error?.message || message;
    } catch (_) {}
    throw new Error(`Printful API error: ${message}`);
  }

  return response.json();
}

async function fetchExistingOrderByExternalId(externalId, apiKey) {
  const result = await fetchFromPrintful(`/orders?limit=100&offset=0`, apiKey);
  const orders = Array.isArray(result?.result) ? result.result : [];
  return orders.find((order) => String(order.external_id) === String(externalId)) || null;
}

function hashOrder(items, shippingId, customer) {
  const normalized = items
    .map(i => ({ id: String(i.syncVariantId), qty: Number(i.quantity) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const recipient = normalizeRecipientAddress(customer);
  return crypto.createHash('sha256')
    .update(JSON.stringify({ items: normalized, shipping: shippingId, recipient }))
    .digest('hex');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!PRINTFUL_API_KEY || !STRIPE_SECRET_KEY) {
    return sendError(res, 500, 'Missing environment variables');
  }

  const { items, customer, paymentIntentId, shippingMethod, orderHash } = req.body;

  if (!items || !customer || !paymentIntentId || !shippingMethod || !shippingMethod.id) {
    return sendError(res, 400, 'Missing items, customer, paymentIntentId, or shippingMethod');
  }

  const { recipient, error: recipientError } = validateRecipient(customer);
  if (recipientError) {
    return sendError(res, 400, recipientError);
  }

  try {
    // Verify Stripe payment succeeded and matches this exact order
    const stripe = Stripe(STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return sendError(res, 400, 'Payment not confirmed');
    }
    const expectedHash = hashOrder(items, shippingMethod.id, recipient);
    const storedHash = String(paymentIntent.metadata?.lebe_order_hash || '');
    const providedHash = String(orderHash || '');
    if (!storedHash || (providedHash && storedHash !== providedHash)) {
      console.error('❌ Order hash mismatch — possible PI substitution attempt', {
        storedHash,
        providedHash,
        expectedHash,
      });
      return sendError(res, 400, 'Payment does not match this order');
    }
    if (storedHash !== expectedHash) {
      console.warn('⚠️ Recomputed checkout hash differed from PaymentIntent hash; continuing because the original server-issued hash matches.', {
        storedHash,
        expectedHash,
      });
    }

    const estimateData = {
      recipient,
      items: items.map(item => ({
        sync_variant_id: Number(item.syncVariantId),
        quantity: Number(item.quantity)
      })),
      shipping: shippingMethod.id,
      currency: 'USD'
    };

    const estimateResult = await fetchFromPrintful('/orders/estimate-costs', PRINTFUL_API_KEY, {
      method: 'POST',
      body: JSON.stringify(estimateData)
    });

    const estimate = estimateResult?.result;
    if (!estimate || !estimate.costs || !estimate.retail_costs) {
      return sendError(res, 400, 'Unable to verify the order total for this shipment.');
    }

    const subtotal = parseFloat(estimate.retail_costs.subtotal ?? estimate.costs?.subtotal ?? 0);
    const shipping = parseFloat(estimate.retail_costs.shipping ?? estimate.costs?.shipping ?? 0);
    const tax = parseFloat(estimate.retail_costs.tax ?? estimate.costs?.tax ?? 0);
    const promoCode = String(paymentIntent.metadata?.promo_code || '').trim();
    let discountAmount = 0;

    if (promoCode) {
      const promoResult = await stripe.promotionCodes.list({
        code: promoCode,
        active: true,
        limit: 1,
        expand: ['data.coupon'],
      });
      const promotionCode = promoResult.data?.[0];
      const coupon = promotionCode?.coupon || {};
      if (promotionCode?.active && coupon) {
        if (Number.isFinite(Number(coupon.percent_off)) && Number(coupon.percent_off) > 0) {
          discountAmount = Math.min(subtotal, subtotal * (Number(coupon.percent_off) / 100));
        } else if (Number.isFinite(Number(coupon.amount_off)) && Number(coupon.amount_off) > 0) {
          discountAmount = Math.min(subtotal, Number(coupon.amount_off) / 100);
        }
      }
    }

    const expectedCents = Math.round((Math.max(0, subtotal - discountAmount) + shipping + tax) * 100);
    if (paymentIntent.amount !== expectedCents) {
      console.error('❌ Payment amount mismatch', { paymentIntentAmount: paymentIntent.amount, expectedCents });
      return sendError(res, 400, 'Payment does not match the latest verified order total.');
    }
    if (paymentIntent.metadata?.expected_amount_cents && Number(paymentIntent.metadata.expected_amount_cents) !== expectedCents) {
      console.error('❌ Metadata expected amount mismatch', { metadata: paymentIntent.metadata.expected_amount_cents, expectedCents });
      return sendError(res, 400, 'Payment metadata does not match this order.');
    }

    // Create order in Printful (external_id ties this order to the PI, preventing duplicates on retry)
    const orderData = {
      recipient,
      items: items.map(item => {
        const orderItem = {
          sync_variant_id: Number(item.syncVariantId),
          quantity: Number(item.quantity)
        };
        if (item.options && item.options.length > 0) {
          orderItem.options = {};
          item.options.forEach(opt => {
            orderItem.options[opt.id] = opt.value;
          });
        }
        return orderItem;
      }),
      external_id: paymentIntentId,
      shipping: shippingMethod.id,
      currency: 'USD',
      confirm: true
    };

    console.log('📦 Sending order to Printful:', JSON.stringify(orderData, null, 2));

    let result;
    try {
      result = await fetchFromPrintful('/orders', PRINTFUL_API_KEY, {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
    } catch (error) {
      if (/external_id|already exists|duplicate|conflict/i.test(String(error.message || ''))) {
        const existingOrder = await fetchExistingOrderByExternalId(paymentIntentId, PRINTFUL_API_KEY);
        if (existingOrder) {
          result = { result: existingOrder };
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    console.log('✓ Order created:', JSON.stringify(result, null, 2));

    const order = result.result;
    console.log('Order status:', order.status);
    console.log('Order estimated_delivery:', order.estimated_delivery);
    console.log('Order fulfillment_status:', order.fulfillment_status);

    // If Printful didn't return estimated_delivery (draft orders in test mode),
    // calculate it based on production time + shipping time
    let estimatedDelivery = order.estimated_delivery;
    if (!estimatedDelivery) {
      const productionDays = 10; // typical made-to-order production
      const shippingDays = shippingMethod.maxDeliveryDays || 5; // fallback to 5 days if not specified
      const totalDays = productionDays + shippingDays;
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + totalDays);
      estimatedDelivery = deliveryDate.toISOString().split('T')[0];
      console.log(`ℹ Calculated estimated_delivery (no API data): ${estimatedDelivery} (${totalDays} days)`);
    }

    res.status(200).json({
      success: true,
      orderId: order.id,
      externalId: order.external_id,
      estimatedDelivery,
      totalCost: order.total_cost,
      shippingCost: order.shipping_cost
    });
  } catch (error) {
    console.error('Error creating order:', error);
    sendError(res, 500, 'We could not finalize your order right now. Please contact support if your card was charged.');
  }
}
