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

// Color configuration for sublimation products (no variant color data in Printful)
// Maps externalId -> color. Scales to support multiple POD providers.
const PRODUCT_COLOR_MAP = {
  '6477600e15cb73': 'Black',  // Saguanari Sports Bra Black
  '64775fcaef5f21': 'White',  // Saguanari Sports Bra White
  '64000b204a6de9': 'White',  // Saguanari Leggings White
  '63ec714091ff89': 'Black',  // Saguanari Leggings Black
};

const findColorVariants = (productId) => {
  if (!allProducts) return null;

  const currentProd = allProducts.find(p => p.id === productId);
  if (!currentProd) return null;

  const colorMap = {};

  // Strategy 1: Check manual color map (for sublimation/single-product-per-color items)
  const manualColor = PRODUCT_COLOR_MAP[currentProd.externalId];
  if (manualColor) {
    // Find all products with matching base name and map their colors from manual map
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

    variants.forEach(v => {
      const vColor = PRODUCT_COLOR_MAP[v.externalId];
      if (vColor) {
        colorMap[vColor] = v.id;
      }
    });

    if (Object.keys(colorMap).length > 0) return colorMap;
  }

  // Strategy 2: Use variant color data (for products with actual variants)
  // If current product has variants with color info, use those
  // TODO: Implement if/when you add products with variant color data

  // Strategy 3: Fall back to name parsing (legacy)
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

  variants.forEach(v => {
    const colorMatch = v.name.match(/\b(Black|White)\b/i);
    let color = colorMatch ? colorMatch[1] : null;

    if (!color && variants.length === 2) {
      const hasWhite = variants.some(p => p.name.match(/\bWhite\b/i));
      if (hasWhite && !v.name.match(/\bWhite\b/i)) {
        color = 'Black';
      }
    }

    if (color) {
      colorMap[color] = v.id;
    }
  });

  return Object.keys(colorMap).length > 0 ? colorMap : null;
};

const updateCareInstructions = () => {
  const careEl = document.getElementById('care-instructions');
  if (!careEl) return;

  if (currentColor && currentColor.toLowerCase() === 'black') {
    careEl.textContent = 'Printful all-over-print. Cold wash only. Hang dry. Heat will fade the black.';
  } else {
    careEl.textContent = 'Printful all-over-print. Cold wash, hang dry. Gold may soften with wear.';
  }
};

const populateImageGallery = (images) => {
  console.log('populateImageGallery called with:', images);
  if (!images || images.length === 0) {
    console.warn('No images provided to populateImageGallery');
    return;
  }

  // Populate carousel slides (mobile)
  const carouselSlides = document.querySelectorAll('#image-carousel .splide__slide');
  console.log('Found carousel slides:', carouselSlides.length);
  carouselSlides.forEach((slide, index) => {
    if (index < images.length) {
      const img = slide.querySelector('img');
      console.log(`Slide ${index}: img exists?`, !!img, 'src:', images[index]);
      if (!img) {
        slide.innerHTML = `<div class="aspect-[4/5] overflow-hidden bg-neutral-100"><img src="${images[index]}" alt="" class="h-full w-full object-cover" /></div>`;
      } else {
        img.src = images[index];
      }
    }
  });

  // Populate grid items (desktop)
  const gridItems = document.querySelectorAll('#image-grid > div');
  console.log('Found grid items:', gridItems.length);
  gridItems.forEach((item, index) => {
    if (index < images.length) {
      const img = item.querySelector('img');
      console.log(`Grid item ${index}: img exists?`, !!img, 'src:', images[index]);
      if (img) {
        img.src = images[index];
      } else if (index > 0) {
        const newImg = document.createElement('img');
        newImg.src = images[index];
        newImg.alt = '';
        newImg.className = 'h-full w-full object-cover';
        item.innerHTML = '';
        item.appendChild(newImg);
      }
    }
  });
};

const initMobileCarousel = () => {
  if (window.innerWidth >= 768) return;
  if (typeof Splide === 'undefined') return;
  const carousel = document.getElementById('image-carousel');
  if (!carousel) return;
  new Splide('#image-carousel', {
    type: 'slide',
    perPage: 1,
    arrows: false,
    pagination: true,
    drag: true,
    rewind: true,
  }).mount();
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

    const getFirstVariantForSize = (size) => currentProduct.variants.find(
      (variant) => String(variant.size || '').toUpperCase() === String(size || '').toUpperCase()
    );

    const getVariantForSizeAndColor = (size, color) => currentProduct.variants.find(
      (variant) =>
        String(variant.size || '').toUpperCase() === String(size || '').toUpperCase() &&
        String(variant.color || '').toLowerCase() === String(color || '').toLowerCase()
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
      currentColor = currentVariant?.color || currentProduct.variants[0].color;

      productPrice.textContent = `$${currentVariant.price.toFixed(2)}`;
      updateCareInstructions();
    }

    if (currentProduct.images && currentProduct.images.length > 0) {
      const productImage = document.getElementById('product-image');
      if (productImage) {
        productImage.src = currentProduct.images[0];
        productImage.alt = currentProduct.name;
      }
      const carouselImage = document.getElementById('carousel-product-image');
      if (carouselImage) {
        carouselImage.src = currentProduct.images[0];
        carouselImage.alt = currentProduct.name;
      }
      populateImageGallery(currentProduct.images);
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
          const preferredVariant = getVariantForSizeAndColor(nextSize, currentColor) || getFirstVariantForSize(nextSize);
          if (!preferredVariant) return;

          currentVariant = preferredVariant;
          currentColor = preferredVariant.color || currentColor;
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

    // Client-side color switching (no page reload)
    const switchProduct = async (newProductId) => {
      try {
        const response = await fetch(`/api/product?id=${newProductId}`);
        if (!response.ok) throw new Error('Product not found');
        const newProduct = await response.json();

        if (!newProduct.variants || newProduct.variants.length === 0) {
          console.error('Switched product has no variants:', newProduct.id);
          return;
        }

        // Update global state
        currentProduct = newProduct;
        currentVariant = getPreferredDefaultVariant() || newProduct.variants[0];
        currentColor = currentVariant?.color || newProduct.variants[0].color;
        currentQuantity = 1;

        // Update URL without reload
        window.history.replaceState({}, '', `/product?id=${newProductId}`);

        // Update page title
        document.title = newProduct.name + ' — LEBE';

        // Update all images with fade effect
        if (newProduct.images && newProduct.images.length > 0) {
          // Fade out all images
          const allImages = document.querySelectorAll('#image-grid img, #image-carousel img');
          allImages.forEach(img => {
            img.style.opacity = '0.5';
            img.style.transition = 'opacity 0.1s ease-out';
          });

          // Update images
          const productImage = document.getElementById('product-image');
          const carouselImage = document.getElementById('carousel-product-image');
          if (productImage) {
            productImage.src = newProduct.images[0];
            productImage.alt = newProduct.name;
          }
          if (carouselImage) {
            carouselImage.src = newProduct.images[0];
            carouselImage.alt = newProduct.name;
          }
          populateImageGallery(newProduct.images);

          // Fade back in after a brief delay
          setTimeout(() => {
            allImages.forEach(img => {
              img.style.opacity = '1';
            });
          }, 100);
        }

        // Update text content
        productName.textContent = newProduct.name;
        productPrice.textContent = `$${currentVariant.price.toFixed(2)}`;
        qtyDisplay.textContent = '1';
        qtyInput.value = '1';
        updateCareInstructions();

        // Re-render size and color selectors
        renderSizeButtons();
        renderColorSelectors();
      } catch (error) {
        console.error('Error switching product:', error);
      }
    };

    const renderColorSelectors = () => {
      if (!colorSelector || !colorVariants) return;

      const colorOrder = ['White', 'Black'];
      colorSelector.innerHTML = colorOrder
        .filter(color => colorVariants[color])
        .map((color) => {
          const isSelected = currentProduct.id === colorVariants[color];
          const isWhite = color.toLowerCase() === 'white';

          return `
            <button
              type="button"
              data-color="${color}"
              data-product-id="${colorVariants[color]}"
              aria-label="Select ${color}"
              aria-pressed="${isSelected}"
              class="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#050505]/20 transition hover:border-[#050505]/60"
              style="${isSelected ? 'box-shadow: 0 0 0 2px #e9e9e9, 0 0 0 4px #050505;' : ''}"
            >
              <span class="h-7 w-7 rounded-full ${isWhite ? 'bg-white border border-[#050505]/15' : 'bg-[#050505]'}"></span>
            </button>
          `;
        }).join('');

      // Attach click handlers for client-side switching
      colorSelector.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const newProductId = parseInt(btn.dataset.productId);
          if (newProductId !== currentProduct.id) {
            switchProduct(newProductId);
          }
        });
      });
    };

    if (colorSelector && colorVariants) {
      renderColorSelectors();
    }

  } catch (error) {
    console.error('Error loading product:', error);
    productName.textContent = 'Failed to load product';
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded - initializing product page');

  const buyButton = document.getElementById('buy-button');
  const qtyDisplay = document.getElementById('qty-display');
  const qtyInput = document.getElementById('quantity');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  if (!id) {
    document.getElementById('product-name').textContent = 'No product specified';
    return;
  }

  buyButton?.addEventListener('click', window.handleBuyClick);

  qtyMinus?.addEventListener('click', (e) => {
    e.preventDefault();
    currentQuantity = Math.max(1, currentQuantity - 1);
    if (qtyDisplay) qtyDisplay.textContent = String(currentQuantity);
    if (qtyInput) qtyInput.value = String(currentQuantity);
  });

  qtyPlus?.addEventListener('click', (e) => {
    e.preventDefault();
    currentQuantity += 1;
    if (qtyDisplay) qtyDisplay.textContent = String(currentQuantity);
    if (qtyInput) qtyInput.value = String(currentQuantity);
  });

  try {
    // Pre-load catalog so color selectors render on the single loadProductData call below
    try {
      const productsRes = await fetch('/api/products');
      if (productsRes.ok) {
        allProducts = await productsRes.json();
        colorVariants = findColorVariants(id);
        console.log('Color variants:', colorVariants);
      }
    } catch (_) {}

    await loadProductData(id);
    initMobileCarousel();
  } catch (error) {
    console.error('Error initializing:', error);
  }
});
