(function () {
  const CART_KEY = 'lebe_cart';
  const MAX_DISPLAY_COUNT = 99;

  function getBagCount() {
    try {
      const rawCart = localStorage.getItem(CART_KEY);
      const cart = rawCart ? JSON.parse(rawCart) : [];
      if (!Array.isArray(cart)) return 0;

      return cart.reduce((sum, item) => {
        const quantity = Math.floor(Number(item?.quantity));
        return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
      }, 0);
    } catch (_) {
      return 0;
    }
  }

  function updateBagIndicators() {
    const count = getBagCount();
    const displayCount = count > MAX_DISPLAY_COUNT ? `${MAX_DISPLAY_COUNT}+` : String(count);

    document.querySelectorAll('.lebe-bag').forEach((bagLink) => {
      const badge = bagLink.querySelector('[data-bag-count]');
      bagLink.classList.toggle('has-items', count > 0);
      bagLink.setAttribute('aria-label', count > 0 ? `Shopping bag, ${count} item${count === 1 ? '' : 's'}` : 'Shopping bag');
      if (badge) {
        badge.textContent = count > 0 ? displayCount : '';
      }
    });
  }

  function initBagIndicators() {
    updateBagIndicators();
    window.addEventListener('storage', (event) => {
      if (event.key === CART_KEY) updateBagIndicators();
    });
    window.addEventListener('lebe:cart-updated', updateBagIndicators);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBagIndicators, { once: true });
  } else {
    initBagIndicators();
  }
}());
