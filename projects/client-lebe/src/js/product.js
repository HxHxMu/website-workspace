console.log('product.js loaded');

let currentProduct = null;
let currentVariant = null;
let currentQuantity = 1;

window.handleBuyClick = function(e) {
  console.log('=== HANDLE BUY CLICK CALLED ===');

  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const sizeSelect = document.getElementById('size-select');

  if (!sizeSelect || !sizeSelect.value) {
    console.log('❌ No size selected');
    alert('Please select a size');
    return false;
  }

  if (!currentVariant) {
    console.error('❌ No variant selected');
    return false;
  }

  if (typeof Cart === 'undefined') {
    console.error('❌ Cart object not defined');
    alert('Cart system not ready. Please reload the page.');
    return false;
  }

  const cartItem = {
    productId: currentProduct.id,
    variantId: currentVariant.id,
    syncVariantId: currentVariant.syncVariantId,
    name: currentProduct.name,
    size: currentVariant.size,
    color: currentVariant.color,
    price: currentVariant.price,
    quantity: currentQuantity,
    image: currentProduct.images[0] || '',
    options: currentVariant.options || []
  };

  console.log('✓ ADDING TO CART:', cartItem);
  Cart.addItem(cartItem);
  console.log('✓ Item added, REDIRECTING TO /cart');
  window.location.href = '/cart';
  return false;
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded - initializing product page');

  const productName = document.getElementById('product-name');
  const productPrice = document.getElementById('product-price');
  const sizeSelect = document.getElementById('size-select');
  const buyButton = document.getElementById('buy-button');
  const colorSelector = document.getElementById('color-selector');
  const qtyDisplay = document.getElementById('qty-display');
  const qtyInput = document.getElementById('quantity');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');

  // Get product ID from URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    productName.textContent = 'No product specified';
    return;
  }

  console.log('Fetching product:', id);

  try {
    const response = await fetch(`/api/product?id=${id}`);
    if (!response.ok) throw new Error('Product not found');
    currentProduct = await response.json();
    console.log('Product loaded:', currentProduct);

    // Update title and name
    document.title = currentProduct.name + ' — LEBE';
    productName.textContent = currentProduct.name;

    // Update price from first variant
    if (currentProduct.variants && currentProduct.variants.length > 0) {
      currentVariant = currentProduct.variants[0];
      productPrice.textContent = `$${currentVariant.price.toFixed(2)}`;
    }

    // Render images
    if (currentProduct.images && currentProduct.images.length > 0) {
      const productImage = document.getElementById('product-image');
      if (productImage) {
        productImage.src = currentProduct.images[0];
        productImage.alt = currentProduct.name;
      }
    }

    // Populate size select
    if (sizeSelect && currentProduct.variants && currentProduct.variants.length > 0) {
      const sizes = [...new Set(currentProduct.variants.map(v => v.size))];
      console.log('Populating sizes:', sizes);

      let options = '<option value="">Select a size</option>';
      sizes.forEach(size => {
        const variant = currentProduct.variants.find(v => v.size === size);
        if (variant) {
          options += `<option value="${variant.syncVariantId}" data-price="${variant.price}">${size}</option>`;
        }
      });

      sizeSelect.innerHTML = options;

      // Size change handler
      sizeSelect.addEventListener('change', (e) => {
        console.log('Size changed');
        const variant = currentProduct.variants.find(v => v.syncVariantId === e.target.value);
        if (variant) {
          currentVariant = variant;
          productPrice.textContent = `$${variant.price.toFixed(2)}`;
          console.log('Price updated to:', variant.price);
        }
      });
    }

    // Color selector
    if (colorSelector && currentProduct.variants) {
      colorSelector.innerHTML = currentProduct.variants.map((variant) => {
        const isSelected = variant.syncVariantId === currentVariant?.syncVariantId;
        const isWhite = variant.color === 'White' || variant.color === 'white';

        return `
          <button
            type="button"
            data-variant-id="${variant.syncVariantId}"
            aria-label="Select ${variant.color}"
            aria-pressed="${isSelected}"
            class="flex h-9 w-9 items-center justify-center rounded-full border transition ${isSelected ? 'border-[#050505]' : 'border-[#050505]/25 hover:border-[#050505]'}"
          >
            <span class="h-6 w-6 rounded-full border border-[#050505]/20 ${isWhite ? 'bg-white' : 'bg-[#050505]'}"></span>
          </button>
        `;
      }).join('');

      // Color button handlers
      colorSelector.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const variantId = btn.dataset.variantId;
          const variant = currentProduct.variants.find(v => v.syncVariantId === variantId);
          if (variant) {
            currentVariant = variant;
            productPrice.textContent = `$${variant.price.toFixed(2)}`;

            // Update active state
            colorSelector.querySelectorAll('button').forEach(b => {
              b.classList.remove('border-[#050505]');
              b.classList.add('border-[#050505]/25');
            });
            btn.classList.remove('border-[#050505]/25');
            btn.classList.add('border-[#050505]');
          }
        });
      });
    }

    // Quantity controls
    qtyMinus?.addEventListener('click', (e) => {
      e.preventDefault();
      currentQuantity = Math.max(1, currentQuantity - 1);
      qtyDisplay.textContent = currentQuantity;
      qtyInput.value = currentQuantity;
    });

    qtyPlus?.addEventListener('click', (e) => {
      e.preventDefault();
      currentQuantity += 1;
      qtyDisplay.textContent = currentQuantity;
      qtyInput.value = currentQuantity;
    });

    // Buy button click
    buyButton?.addEventListener('click', window.handleBuyClick);

  } catch (error) {
    console.error('Error loading product:', error);
    productName.textContent = 'Failed to load product';
  }
});
