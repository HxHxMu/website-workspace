console.log('product.js loaded');

let currentProduct = null;
let currentVariant = null;
let currentQuantity = 1;
let currentColor = null;
let colorVariants = null;
let allProducts = null;

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL'];

window.handleBuyClick = function(e) {
  console.log('=== HANDLE BUY CLICK CALLED ===');

  if (e) {
    e.preventDefault();
    e.stopPropagation();
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
    color: currentColor || currentVariant.color,
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

const findColorVariants = (productId) => {
  if (!allProducts) return null;

  const currentProd = allProducts.find(p => p.id === productId);
  if (!currentProd) return null;

  const baseNameWords = currentProd.name.toLowerCase()
    .replace(/\b(black|white|color)\b/gi, '')
    .trim()
    .split(/\s+/);

  const variants = allProducts.filter(p => {
    const nameWords = p.name.toLowerCase()
      .replace(/\b(black|white|color)\b/gi, '')
      .trim()
      .split(/\s+/);

    return nameWords.length === baseNameWords.length &&
           baseNameWords.every(word => nameWords.includes(word));
  });

  const colorMap = {};
  variants.forEach(v => {
    const colorMatch = v.name.match(/\b(Black|White)\b/i);
    let color = colorMatch ? colorMatch[1] : null;

    if (!color) {
      if (variants.length === 2) {
        const hasWhite = variants.some(p => p.name.match(/\bWhite\b/i));
        if (hasWhite && !v.name.match(/\bWhite\b/i)) {
          color = 'Black';
        }
      }
    }

    if (color) {
      colorMap[color] = v.id;
    }
  });

  return Object.keys(colorMap).length > 0 ? colorMap : null;
};

const loadProductData = async (productId) => {
  const productName = document.getElementById('product-name');
  const productPrice = document.getElementById('product-price');
  const sizeSelector = document.getElementById('size-selector');
  const buyButton = document.getElementById('buy-button');
  const colorSelector = document.getElementById('color-selector');
  const qtyDisplay = document.getElementById('qty-display');
  const qtyInput = document.getElementById('quantity');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');

  try {
    const response = await fetch(`/api/product?id=${productId}`);
    if (!response.ok) throw new Error('Product not found');
    currentProduct = await response.json();
    console.log('Product loaded:', currentProduct);

    document.title = currentProduct.name + ' — LEBE';
    productName.textContent = currentProduct.name;

    const getVariantFor = (size, color) => currentProduct.variants.find(
      (variant) =>
        String(variant.size || '').toUpperCase() === String(size || '').toUpperCase() &&
        String(variant.color || '').toLowerCase() === String(color || '').toLowerCase()
    );

    const getFirstVariantForSize = (size) => currentProduct.variants.find(
      (variant) => String(variant.size || '').toUpperCase() === String(size || '').toUpperCase()
    );

    const getPreferredDefaultVariant = () => {
      const preferredSizes = ['M', ...SIZE_ORDER.filter((size) => size !== 'M')];
      for (const size of preferredSizes) {
        const match = getFirstVariantForSize(size);
        if (match) return match;
      }
      return currentProduct.variants[0] || null;
    };

    if (currentProduct.variants && currentProduct.variants.length > 0) {
      currentVariant = getPreferredDefaultVariant();

      // Derive color from product name since variant color field may be unreliable
      let colorFromName = null;
      if (currentProduct.name.match(/\bBlack\b/i)) {
        colorFromName = 'Black';
      } else if (currentProduct.name.match(/\bWhite\b/i)) {
        colorFromName = 'White';
      }
      currentColor = colorFromName || currentVariant?.color || currentProduct.variants[0].color;

      productPrice.textContent = `$${currentVariant.price.toFixed(2)}`;
    }

    if (currentProduct.images && currentProduct.images.length > 0) {
      const productImage = document.getElementById('product-image');
      if (productImage) {
        productImage.src = currentProduct.images[0];
        productImage.alt = currentProduct.name;
      }
    }

    const renderSizeButtons = () => {
      if (!sizeSelector || !currentProduct.variants) return;

      const availableSizes = SIZE_ORDER.filter((size) =>
        currentProduct.variants.some((variant) => String(variant.size || '').toUpperCase() === size)
      );

      let buttons = '';
      availableSizes.forEach((size) => {
        const variant = getFirstVariantForSize(size);
        if (!variant) return;

        const isSelected = variant.syncVariantId === currentVariant?.syncVariantId;
        const bgClass = isSelected ? 'bg-[#050505] text-white' : 'bg-white text-[#050505]';
        const hoverClass = isSelected ? '' : 'hover:bg-[#050505] hover:text-white';
        buttons += `
          <button
            type="button"
            data-size="${size}"
            data-variant-id="${variant.syncVariantId}"
            aria-pressed="${isSelected}"
            class="size-button flex h-14 min-w-14 items-center justify-center border border-[#050505] px-4 text-sm font-bold uppercase tracking-[0.12em] transition ${bgClass} ${hoverClass}"
          >
            ${size}
          </button>
        `;
      });

      sizeSelector.innerHTML = buttons;

      sizeSelector.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const nextSize = btn.dataset.size;
          const preferredVariant = getFirstVariantForSize(nextSize);
          if (!preferredVariant) return;

          currentVariant = preferredVariant;
          productPrice.textContent = `$${currentVariant.price.toFixed(2)}`;

          sizeSelector.querySelectorAll('button').forEach((b) => {
            b.classList.remove('bg-[#050505]', 'text-white');
            b.classList.add('bg-white', 'text-[#050505]');
            b.setAttribute('aria-pressed', 'false');
          });

          btn.classList.add('bg-[#050505]', 'text-white');
          btn.classList.remove('bg-white', 'text-[#050505]');
          btn.setAttribute('aria-pressed', 'true');
        });
      });
    };

    if (sizeSelector && currentProduct.variants && currentProduct.variants.length > 0) {
      renderSizeButtons();
    }

    if (colorSelector && colorVariants) {
      const colorOrder = ['White', 'Black'];

      colorSelector.innerHTML = colorOrder
        .filter(color => colorVariants[color])
        .map((color) => {
          const isSelected = color.toLowerCase() === (currentColor || '').toLowerCase();
          const isWhite = color.toLowerCase() === 'white';

          return `
            <button
              type="button"
              data-color="${color}"
              data-product-id="${colorVariants[color]}"
              aria-label="Select ${color}"
              aria-pressed="${isSelected}"
              class="flex h-10 w-10 items-center justify-center rounded-full border transition md:h-10 md:w-10 ${isSelected ? 'border-[#050505]' : 'border-[#050505]/25 hover:border-[#050505]'}"
            >
              <span class="h-7 w-7 rounded-full border border-[#050505]/20 ${isWhite ? 'bg-white' : 'bg-[#050505]'}"></span>
            </button>
          `;
        }).join('');

      colorSelector.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const newProductId = parseInt(btn.dataset.productId);
          if (newProductId !== currentProduct.id) {
            window.location.href = `/product?id=${newProductId}`;
          }
        });
      });
    }

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

    buyButton?.addEventListener('click', window.handleBuyClick);

  } catch (error) {
    console.error('Error loading product:', error);
    productName.textContent = 'Failed to load product';
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded - initializing product page');

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  if (!id) {
    document.getElementById('product-name').textContent = 'No product specified';
    return;
  }

  try {
    const productsRes = await fetch('/api/products');
    allProducts = await productsRes.json();
    colorVariants = findColorVariants(id);
    console.log('Color variants:', colorVariants);

    await loadProductData(id);
  } catch (error) {
    console.error('Error initializing:', error);
  }
});
