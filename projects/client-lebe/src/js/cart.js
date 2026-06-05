(function() {
  const CART_KEY = 'lebe_cart';
  const MAX_CART_QUANTITY = 25;

  function normalizeQuantity(quantity) {
    const numeric = Math.floor(Number(quantity));
    if (!Number.isFinite(numeric) || numeric < 1) return 1;
    return Math.min(MAX_CART_QUANTITY, numeric);
  }

  function normalizeItem(item) {
    return {
      ...item,
      syncVariantId: String(item.syncVariantId || ''),
      quantity: normalizeQuantity(item.quantity),
      price: Number(item.price) || 0,
    };
  }

  function getCart() {
    try {
      const cart = localStorage.getItem(CART_KEY);
      const parsed = cart ? JSON.parse(cart) : [];
      return Array.isArray(parsed) ? parsed.map(normalizeItem) : [];
    } catch (e) {
      console.error('Error reading cart:', e);
      return [];
    }
  }

  function saveCart(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }

  window.Cart = {
    getCart() {
      return getCart();
    },

    addItem(item) {
      const cart = getCart();
      item = normalizeItem(item);
      const existing = cart.find(i => i.syncVariantId === item.syncVariantId);

      if (existing) {
        existing.quantity = normalizeQuantity(existing.quantity + item.quantity);
      } else {
        cart.push(item);
      }

      saveCart(cart);
    },

    removeItem(syncVariantId) {
      const svid = String(syncVariantId);
      const cart = getCart();
      const filtered = cart.filter(i => String(i.syncVariantId) !== svid);
      saveCart(filtered);
    },

    updateQuantity(syncVariantId, quantity) {
      const svid = String(syncVariantId);
      const cart = getCart();
      const normalizedQuantity = Math.floor(Number(quantity));

      if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
        this.removeItem(svid);
        return;
      }

      const item = cart.find(i => String(i.syncVariantId) === svid);
      if (item) {
        item.quantity = normalizeQuantity(normalizedQuantity);
        saveCart(cart);
      }
    },

    clearCart() {
      saveCart([]);
    },

    replaceCart(items) {
      const normalized = Array.isArray(items)
        ? items.map((item) => normalizeItem(item))
        : [];
      saveCart(normalized);
    },

    getCount() {
      return getCart().reduce((sum, item) => sum + item.quantity, 0);
    },

    getSubtotal() {
      return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
  };
})();
