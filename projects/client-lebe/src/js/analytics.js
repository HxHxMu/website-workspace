(function () {
  const BRAND = 'LEBE';
  const CURRENCY = 'USD';
  const onceKeys = new Set();

  function track(eventName, params = {}) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
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
    const productId = item.productId ?? item.id ?? item.item_id;
    const name = item.name ?? item.item_name ?? 'LEBE Item';
    const color = item.color ?? item.item_category ?? item.item_category2 ?? 'Default';
    const size = item.size ?? item.item_variant ?? '';

    return {
      item_id: String(productId || ''),
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
    ecommerceItem,
    cartItems,
    cartValue,
    productItem,
    classifyCheckoutError,
  };
})();
