// Cart rendering for cart.html
function escHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.renderCart = function() {
  const cartEmpty = document.getElementById('cart-empty');
  const cartContent = document.getElementById('cart-content');
  const cartItems = document.getElementById('cart-items');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartTotal = document.getElementById('cart-total');

  if (!cartItems) return;

  const cart = Cart.getCart();

  if (cart.length === 0) {
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
    <div class="grid grid-cols-[96px_1fr] gap-5 border-b border-black/15 pb-6 md:grid-cols-[140px_1fr]">
      <a href="/product?id=${escHtml(item.productId)}" class="block overflow-hidden bg-neutral-100">
        <img src="${escHtml(item.image)}" alt="${escHtml(item.name)}" class="aspect-[4/5] h-full w-full object-cover transition duration-500 hover:scale-105" />
      </a>
      <div class="flex min-w-0 flex-col justify-between gap-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <a href="/product?id=${escHtml(item.productId)}" class="font-semibold uppercase tracking-[-0.03em] transition hover:text-black/55">
              ${escHtml(item.name)}
            </a>
            <p class="mt-2 text-sm text-black/55">${escHtml(item.size)}.</p>
          </div>
          <p class="shrink-0 font-semibold">$${item.price.toFixed(2)}</p>
        </div>
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-black/40">quantity</p>
            <div class="inline-flex h-10 items-center border border-black">
              <button type="button" class="h-full w-10 text-lg leading-none transition hover:bg-black hover:text-white qty-minus" data-sync-variant-id="${svid}">−</button>
              <span class="flex h-full w-12 items-center justify-center border-x border-black text-sm font-semibold qty-value">${item.quantity}</span>
              <button type="button" class="h-full w-10 text-lg leading-none transition hover:bg-black hover:text-white qty-plus" data-sync-variant-id="${svid}">+</button>
            </div>
          </div>
          <button type="button" class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-black/50 transition hover:text-black remove-btn" data-sync-variant-id="${svid}">
            <svg class="h-4 w-4" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            remove.
          </button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  // Update summary
  const subtotal = Cart.getSubtotal();
  cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  cartTotal.textContent = `$${subtotal.toFixed(2)}`;

  // Event handlers — dataset values are always strings; compare with String() to handle numeric IDs
  cartItems.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const svid = btn.dataset.syncVariantId;
      const item = Cart.getCart().find(i => String(i.syncVariantId) === svid);
      if (item) {
        Cart.updateQuantity(item.syncVariantId, item.quantity - 1);
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
      window.renderCart();
    });
  });
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
