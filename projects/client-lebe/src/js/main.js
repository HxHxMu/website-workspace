// Cart rendering for cart.html
function escHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.renderCart = function() {
  const cartEmpty = document.getElementById('cart-empty');
  const cartContent = document.getElementById('cart-content');
  const cartItems = document.getElementById('cart-items');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartShipping = document.getElementById('cart-shipping');
  const cartTax = document.getElementById('cart-tax');
  const cartTotal = document.getElementById('cart-total');

  if (!cartItems) return;

  const cart = Cart.getCart();

  if (cart.length === 0) {
    window.resetCheckoutState?.();
    cartEmpty.classList.remove('hidden');
    cartContent.classList.add('hidden');
    return;
  }

  cartEmpty.classList.add('hidden');
  cartContent.classList.remove('hidden');

  // Render items
  cartItems.innerHTML = cart.map(item => {
    const svid = escHtml(String(item.syncVariantId));
    return `
    <div class="grid grid-cols-[88px_minmax(0,1fr)] gap-4 border-b border-black/15 pb-6 sm:grid-cols-[96px_minmax(0,1fr)] lg:grid-cols-[140px_minmax(0,1fr)] lg:gap-5">
      <a href="/product?id=${escHtml(item.productId)}" class="block overflow-hidden bg-neutral-100">
        <img src="${escHtml(item.image)}" alt="${escHtml(item.name)}" class="aspect-[4/5] h-full w-full object-cover transition duration-500 hover:scale-105" />
      </a>
      <div class="flex min-w-0 flex-col justify-between gap-5">
        <div class="flex min-w-0 items-start justify-between gap-3">
          <div class="min-w-0">
            <a href="/product?id=${escHtml(item.productId)}" class="font-semibold uppercase tracking-[-0.03em] transition hover:text-black/55">
              ${escHtml(item.name)}
            </a>
            <p class="mt-2 text-sm text-black/55">${escHtml(item.size)}.</p>
          </div>
          <p class="shrink-0 font-semibold">$${item.price.toFixed(2)}</p>
        </div>
        <div class="flex items-end justify-between gap-3">
          <div class="min-w-0">
            <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-black/40">quantity</p>
            <div class="inline-flex h-10 items-center border border-black">
              <button type="button" class="h-full w-10 text-lg leading-none transition hover:bg-black hover:text-white qty-minus" data-sync-variant-id="${svid}">−</button>
              <span class="flex h-full w-12 items-center justify-center border-x border-black text-sm font-semibold qty-value">${item.quantity}</span>
              <button type="button" class="h-full w-10 text-lg leading-none transition hover:bg-black hover:text-white qty-plus" data-sync-variant-id="${svid}">+</button>
            </div>
          </div>
          <button type="button" class="inline-flex h-11 w-11 shrink-0 items-center justify-center text-black/50 transition hover:text-black remove-btn" aria-label="Remove item from bag" data-sync-variant-id="${svid}">
            <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  // Update summary
  const subtotal = Cart.getSubtotal();
  if (typeof window.resetCartSummary === 'function') {
    window.resetCartSummary();
  } else {
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    if (cartShipping) cartShipping.textContent = 'Calculated';
    if (cartTax) cartTax.textContent = 'Calculated';
    cartTotal.textContent = `$${subtotal.toFixed(2)}`;
  }

  // Event handlers — dataset values are always strings; compare with String() to handle numeric IDs
  cartItems.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const svid = btn.dataset.syncVariantId;
      const item = Cart.getCart().find(i => String(i.syncVariantId) === svid);
      if (item) {
        Cart.updateQuantity(item.syncVariantId, item.quantity - 1);
        window.resetCheckoutState?.();
        window.renderCart();
      }
    });
  });

  cartItems.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const svid = btn.dataset.syncVariantId;
      const item = Cart.getCart().find(i => String(i.syncVariantId) === svid);
      if (item) {
        Cart.updateQuantity(item.syncVariantId, item.quantity + 1);
        window.resetCheckoutState?.();
        window.renderCart();
      }
    });
  });

  cartItems.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const svid = btn.dataset.syncVariantId;
      const item = Cart.getCart().find(i => String(i.syncVariantId) === svid);
      if (item) Cart.removeItem(item.syncVariantId);
      window.resetCheckoutState?.();
      window.renderCart();
    });
  });

  // Upsell logic: suggest complementary products for incomplete sets
  const upsellModule = document.getElementById('upsell-module');
  if (upsellModule) {
    checkAndShowUpsell(cart);
  }
};

async function checkAndShowUpsell(cart) {
  const upsellModule = document.getElementById('upsell-module');
  if (!upsellModule) return;

  // Don't show upsell if cart is empty or has multiple different products
  if (cart.length === 0) {
    upsellModule.classList.add('hidden');
    return;
  }

  // Check if all items in cart are from the same set but incomplete
  const firstItem = cart[0];
  const upsellData = window.LebeProductModel?.getUpsell(firstItem.productId);

  if (!upsellData) {
    upsellModule.classList.add('hidden');
    return;
  }

  // Check if complementary product is already in cart
  const hasComplement = cart.some(item => String(item.productId) === String(upsellData.productId));
  if (hasComplement) {
    upsellModule.classList.add('hidden');
    return;
  }

  // Fetch complementary product details
  try {
    const response = await fetch(`/api/product?id=${encodeURIComponent(upsellData.productId)}`);
    const complementProduct = await response.json();

    if (!response.ok || !complementProduct || !Array.isArray(complementProduct.variants) || complementProduct.variants.length === 0) {
      upsellModule.classList.add('hidden');
      return;
    }

    const matchingVariant = complementProduct.variants.find((variant) => {
      const sameColor = !firstItem.color || !variant.color || String(variant.color).toLowerCase() === String(firstItem.color).toLowerCase();
      const sameSize = !firstItem.size || !variant.size || String(variant.size).toLowerCase() === String(firstItem.size).toLowerCase();
      return sameColor && sameSize;
    }) || complementProduct.variants.find((variant) => {
      const sameColor = !firstItem.color || !variant.color || String(variant.color).toLowerCase() === String(firstItem.color).toLowerCase();
      return sameColor;
    }) || complementProduct.variants[0];

    // Show upsell module with complementary product
    document.getElementById('upsell-name').textContent = upsellData.name;
    document.getElementById('upsell-description').textContent = upsellData.description;
    document.getElementById('upsell-price').textContent = `$${Number(matchingVariant.price || complementProduct.price || 0)}`;
    document.getElementById('upsell-image-src').src = complementProduct.images?.[0] || '';

    // Store upsell product data for add button
    const addBtn = document.getElementById('upsell-add-btn');
    addBtn.dataset.productId = complementProduct.id;
    addBtn.dataset.variantId = matchingVariant?.id || '';
    addBtn.dataset.syncVariantId = matchingVariant?.syncVariantId || '';
    addBtn.dataset.price = matchingVariant?.price || complementProduct.price || 0;
    addBtn.dataset.name = complementProduct.name;
    addBtn.dataset.image = complementProduct.images?.[0] || '';
    addBtn.dataset.size = matchingVariant?.size || firstItem.size || 'M';
    addBtn.dataset.color = matchingVariant?.color || firstItem.color || '';

    // Handle add button click
    addBtn.onclick = (e) => {
      e.preventDefault();
      const cartItem = {
        productId: Number(addBtn.dataset.productId),
        variantId: Number(addBtn.dataset.variantId) || 0,
        syncVariantId: addBtn.dataset.syncVariantId,
        name: addBtn.dataset.name,
        size: addBtn.dataset.size || firstItem.size || 'M',
        color: addBtn.dataset.color || firstItem.color,
        price: Number(addBtn.dataset.price),
        quantity: 1,
        image: addBtn.dataset.image,
        options: []
      };
      Cart.addItem(cartItem);
      window.renderCart();
    };

    upsellModule.classList.remove('hidden');
  } catch (error) {
    console.error('Error loading upsell product:', error);
    upsellModule.classList.add('hidden');
  }
};

(function () {
  const menuButton = document.getElementById('menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!menuButton || !mobileMenu) return;

  menuButton.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('hidden');
    menuButton.setAttribute('aria-expanded', String(!isOpen));
  });
}());

(function () {
  const revealItems = document.querySelectorAll('.reveal');
  if (revealItems.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });

  revealItems.forEach((item) => observer.observe(item));
}());
