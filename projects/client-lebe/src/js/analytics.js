(function () {
  const BRAND = 'LEBE';
  const CURRENCY = 'USD';
  const onceKeys = new Set();
  const pendingMetaEvents = [];
  const debugPixel = new URLSearchParams(window.location.search).has('debug_pixel')
    || (() => {
      try {
        return window.localStorage?.getItem('LEBE_DEBUG_PIXEL') === '1';
      } catch (_) {
        return false;
      }
    })();
  const META_STANDARD_EVENTS = {
    view_item: 'ViewContent',
    add_to_cart: 'AddToCart',
    begin_checkout: 'InitiateCheckout',
    add_payment_info: 'AddPaymentInfo',
    purchase: 'Purchase',
    generate_lead: 'Lead',
  };
  const META_CUSTOM_EVENTS = new Set([
    'add_shipping_info',
    'open_product_gallery',
    'open_size_guide',
    'promo_code_applied',
    'select_item_color',
    'select_item_size',
    'select_promotion',
    'zoom_product_image',
  ]);

  function trackGoogle(eventName, params = {}) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
  }

  function debugLog(message, data = {}) {
    if (!debugPixel) return;
    console.info(`[LEBE pixel] ${message}`, data);
  }

  function metaParams(params = {}) {
    const items = Array.isArray(params.items) ? params.items : [];
    const contentIds = items
      .map((item) => item.item_id)
      .filter(Boolean)
      .map(String);
    const contents = items.map((item) => ({
      id: String(item.item_id || ''),
      quantity: Number(item.quantity) || 1,
      item_price: Number(item.price) || 0,
    })).filter((item) => item.id);

    const payload = {
      currency: params.currency || CURRENCY,
    };

    if (Number.isFinite(Number(params.value))) {
      payload.value = Number(params.value);
    }
    if (contentIds.length > 0) {
      payload.content_ids = contentIds;
      payload.contents = contents;
      payload.content_type = 'product';
    }
    if (params.item_name || items[0]?.item_name) {
      payload.content_name = params.item_name || items[0].item_name;
    }
    if (params.coupon || params.promotion_name || params.method) {
      payload.label = params.coupon || params.promotion_name || params.method;
    }

    return payload;
  }

  function trackMeta(eventName, params = {}) {
    if (typeof window.fbq !== 'function') {
      pendingMetaEvents.push([eventName, params]);
      debugLog('queued; fbq unavailable', { eventName, params });
      return;
    }

    const standardEvent = META_STANDARD_EVENTS[eventName];
    if (standardEvent) {
      const payload = metaParams(params);
      window.fbq('track', standardEvent, payload);
      debugLog('sent standard event', { eventName, standardEvent, payload });
      return;
    }

    if (META_CUSTOM_EVENTS.has(eventName)) {
      const payload = metaParams(params);
      window.fbq('trackCustom', eventName, payload);
      debugLog('sent custom event', { eventName, payload });
      return;
    }

    debugLog('ignored unmapped Meta event', { eventName, params });
  }

  function track(eventName, params = {}) {
    trackGoogle(eventName, params);
    trackMeta(eventName, params);
  }

  function flushMetaQueue() {
    if (typeof window.fbq !== 'function' || pendingMetaEvents.length === 0) return;
    debugLog('flushing queued Meta events', { count: pendingMetaEvents.length });
    pendingMetaEvents.splice(0).forEach(([eventName, params]) => {
      trackMeta(eventName, params);
    });
  }

  function trackOnce(key, eventName, params = {}) {
    if (!key || onceKeys.has(key)) return;
    onceKeys.add(key);
    track(eventName, params);
  }

  function number(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function ecommerceItem(item = {}) {
    const productId = item.productId ?? item.id ?? item.item_group_id;
    const catalogId = item.syncVariantId ?? item.sync_variant_id ?? item.item_id ?? productId;
    const name = item.name ?? item.item_name ?? 'LEBE Item';
    const color = item.color ?? item.item_category ?? item.item_category2 ?? 'Default';
    const size = item.size ?? item.item_variant ?? '';

    return {
      item_id: String(catalogId || ''),
      item_group_id: String(productId || catalogId || ''),
      item_name: String(name || 'LEBE Item'),
      item_brand: BRAND,
      item_category: String(color || 'Default'),
      item_variant: String(size || ''),
      price: number(item.price),
      quantity: Math.max(1, Math.floor(number(item.quantity, 1))),
    };
  }

  function cartItems(cart = []) {
    return (Array.isArray(cart) ? cart : []).map(ecommerceItem);
  }

  function cartValue(cart = []) {
    return cartItems(cart).reduce((sum, item) => sum + (number(item.price) * number(item.quantity, 1)), 0);
  }

  function productItem(product = {}, variant = null, quantity = 1, color = '') {
    return ecommerceItem({
      productId: product.id,
      syncVariantId: variant?.syncVariantId,
      name: product.name,
      price: variant?.price ?? product.price,
      size: variant?.size,
      color: color || variant?.color || window.LebeProductModel?.getProductColor?.(product) || 'Default',
      quantity,
    });
  }

  function classifyCheckoutError(message = '') {
    const normalized = String(message || '').toLowerCase();
    if (normalized.includes('promo') || normalized.includes('discount') || normalized.includes('code')) return 'promo';
    if (normalized.includes('shipping') || normalized.includes('zip') || normalized.includes('address')) return 'shipping';
    if (normalized.includes('stripe') || normalized.includes('payment') || normalized.includes('card')) return 'payment';
    if (normalized.includes('order') || normalized.includes('checkout')) return 'order';
    return 'unknown';
  }

  window.LebeAnalytics = {
    CURRENCY,
    track,
    trackOnce,
    flushMetaQueue,
    ecommerceItem,
    cartItems,
    cartValue,
    productItem,
    classifyCheckoutError,
    debugState: () => ({
      debugPixel,
      fbqType: typeof window.fbq,
      pendingMetaEvents: pendingMetaEvents.length,
    }),
  };

  window.addEventListener('load', flushMetaQueue);
  window.setTimeout(flushMetaQueue, 250);
  window.setTimeout(flushMetaQueue, 1000);
})();
