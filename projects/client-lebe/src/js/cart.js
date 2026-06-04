(function() {
  const CART_KEY = 'lebe_cart';

  function getCart() {
    try {
      const cart = localStorage.getItem(CART_KEY);
      const parsed = cart ? JSON.parse(cart) : [];
      return parsed;
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
      item = { ...item, syncVariantId: String(item.syncVariantId) };
      const existing = cart.find(i => i.syncVariantId === item.syncVariantId);

      if (existing) {
        existing.quantity += item.quantity;
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
      console.log('updateQuantity called:', syncVariantId, 'qty:', quantity);
      const svid = String(syncVariantId);
      const cart = getCart();

      if (quantity <= 0) {
        console.log('Quantity <= 0, removing item');
        this.removeItem(svid);
        return;
      }

      const item = cart.find(i => String(i.syncVariantId) === svid);
      console.log('Found item:', item);
      if (item) {
        console.log('Updating quantity from', item.quantity, 'to', quantity);
        item.quantity = quantity;
        console.log('Item after update:', item);
        saveCart(cart);
        console.log('Cart saved');
      } else {
        console.log('Item not found with syncVariantId:', syncVariantId);
      }
    },

    clearCart() {
      saveCart([]);
    },

    getCount() {
      return getCart().reduce((sum, item) => sum + item.quantity, 0);
    },

    getSubtotal() {
      return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
  };
})();
