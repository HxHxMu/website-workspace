let currentProduct = null;
let currentVariant = null;
let currentQuantity = 1;
let currentColor = null;
let colorVariants = null;
let allProducts = null;

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL'];
const PRODUCT_CACHE_KEY = 'lebe_products_cache_v2';
const PRODUCT_CACHE_MAX_AGE = 1000 * 60 * 60;

function getCachedProducts() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(PRODUCT_CACHE_KEY) || 'null');
    if (!cached || !Array.isArray(cached.products)) return [];
    if (Date.now() - Number(cached.savedAt || 0) > PRODUCT_CACHE_MAX_AGE) return [];
    return cached.products;
  } catch (_) {
    return [];
  }
}

function cacheProducts(products) {
  try {
    if (Array.isArray(products)) {
      sessionStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        products,
      }));
    }
  } catch (_) {}
}

function getProductImageElements() {
  return [
    document.getElementById('product-image'),
    document.getElementById('carousel-product-image'),
  ].filter(Boolean);
}

function setHeroImages(images, name) {
  const firstImage = Array.isArray(images) ? images[0] : '';
  if (!firstImage) return;

  getProductImageElements().forEach((img) => {
    if (img.src.endsWith(firstImage)) return;
    img.src = firstImage;
    img.alt = name || '';
  });
}



function applyProductPreview(product) {
  if (!product) return;

  const productName = document.getElementById('product-name');
  const productPrice = document.getElementById('product-price');

  document.title = `${product.name || 'Product'} — LEBE`;
  if (productName && product.name) productName.textContent = product.name;
  if (productPrice && Number.isFinite(Number(product.price))) {
    productPrice.textContent = `$${Number(product.price).toFixed(2)}`;
  }
  populateImageGallery(product.images);
  setHeroImages(product.images, product.name);
  window.LebeSizeGuide.render(product);
}



window.handleBuyClick = function(e) {
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

  Cart.addItem(cartItem);

  // GA4 Enhanced E-commerce: add_to_cart
  if (typeof gtag === 'function') {
    gtag('event', 'add_to_cart', {
      currency: 'USD',
      value: cartItem.price * cartItem.quantity,
      items: [{
        item_id: String(cartItem.productId),
        item_name: cartItem.name,
        price: cartItem.price,
        item_variant: cartItem.size,
        item_category: cartItem.color,
        quantity: cartItem.quantity
      }]
    });
  }

  window.location.href = '/cart';
  return false;
};

const findColorVariants = (productId) => {
  return window.LebeProductModel?.findColorVariants(productId, allProducts) || null;
};

const buildColorVariantMap = (product) => {
  return window.LebeProductModel?.buildColorVariantMap(product) || null;
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
  if (!images || images.length === 0) {
    return;
  }
  window.LebeProductGallery.setImages(images);

  // Populate carousel slides (mobile)
  const carouselSlides = document.querySelectorAll('#image-carousel .splide__slide');
  carouselSlides.forEach((slide, index) => {
    if (index < images.length) {
      const img = slide.querySelector('img');
      if (!img) {
        slide.innerHTML = `<div class="aspect-[4/5] overflow-hidden bg-neutral-100"><img src="${images[index]}" alt="${currentProduct?.name || 'Product image'}" class="h-full w-full object-cover" loading="eager" decoding="async" /></div>`;
      } else {
        img.src = images[index];
        img.alt = currentProduct?.name || 'Product image';
        img.loading = 'eager';
      }
    }
  });

  // Populate grid items (desktop)
  const gridItems = document.querySelectorAll('#image-grid > div');
  gridItems.forEach((item, index) => {
    if (index < images.length) {
      const img = item.querySelector('img');
      if (img) {
        img.src = images[index];
        img.alt = currentProduct?.name || 'Product image';
        img.loading = 'eager';
      } else if (index > 0) {
        const newImg = document.createElement('img');
        newImg.src = images[index];
        newImg.alt = currentProduct?.name || 'Product image';
        newImg.loading = 'eager';
        newImg.decoding = 'async';
        newImg.className = 'h-full w-full object-cover';
        item.innerHTML = '';
        item.appendChild(newImg);
      }
    }
  });

  window.LebeProductGallery.bindTriggers();
};

async function loadCatalogForColorVariants(productId) {
  const cachedProducts = getCachedProducts();
  if (cachedProducts.length > 0) {
    allProducts = cachedProducts;
    colorVariants = findColorVariants(productId);
  }

  try {
    const productsRes = await fetch('/api/products');
    if (productsRes.ok) {
      allProducts = await productsRes.json();
      cacheProducts(allProducts);
      colorVariants = findColorVariants(productId);
    }
  } catch (_) {}
}

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
  window.LebeProductGallery.bindTriggers();
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
    window.LebeSizeGuide.render(currentProduct);
    colorVariants = buildColorVariantMap(currentProduct) || colorVariants || findColorVariants(productId);

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
      currentColor = window.LebeProductModel?.getProductColor(currentProduct)
        || currentVariant?.color
        || currentProduct.variants[0].color;

      productPrice.textContent = `$${currentVariant.price.toFixed(2)}`;
      updateCareInstructions();
      buyButton?.removeAttribute('disabled');
    } else {
      currentVariant = null;
      buyButton?.setAttribute('disabled', 'disabled');
    }

    if (currentProduct.images && currentProduct.images.length > 0) {
      setHeroImages(currentProduct.images, currentProduct.name);
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
          currentColor = window.LebeProductModel?.getProductColor(currentProduct)
            || preferredVariant.color
            || currentColor;
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
        window.LebeSizeGuide.render(newProduct);
        colorVariants = buildColorVariantMap(newProduct) || findColorVariants(newProductId);
        currentVariant = getPreferredDefaultVariant() || newProduct.variants[0];
        currentColor = window.LebeProductModel?.getProductColor(newProduct)
          || currentVariant?.color
          || newProduct.variants[0].color;
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
          setHeroImages(newProduct.images, newProduct.name);
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
        if (qtyDisplay) qtyDisplay.textContent = '1';
        if (qtyInput) qtyInput.value = '1';
        updateCareInstructions();

        // Re-render size and color selectors
        renderSizeButtons();
        renderColorSelectors();

        // GA4 Enhanced E-commerce: view_item
        if (typeof gtag === 'function') {
          gtag('event', 'view_item', {
            currency: 'USD',
            value: currentVariant ? currentVariant.price : 0,
            items: [{
              item_id: String(currentProduct.id),
              item_name: currentProduct.name,
              price: currentVariant ? currentVariant.price : 0,
              item_category: window.LebeProductModel?.getProductColor(currentProduct) || 'Default',
              quantity: 1
            }]
          });
        }
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
          const isSelected = String(currentProduct.id) === String(colorVariants[color]);
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
          const newProductId = Number(btn.dataset.productId);
          if (String(newProductId) !== String(currentProduct.id)) {
            switchProduct(newProductId);
          }
        });
      });
    };

    if (colorSelector && colorVariants) {
      renderColorSelectors();
    }

    // GA4 Enhanced E-commerce: view_item
    if (typeof gtag === 'function') {
      gtag('event', 'view_item', {
        currency: 'USD',
        value: currentVariant ? currentVariant.price : 0,
        items: [{
          item_id: String(currentProduct.id),
          item_name: currentProduct.name,
          price: currentVariant ? currentVariant.price : 0,
          item_category: window.LebeProductModel?.getProductColor(currentProduct) || 'Default',
          quantity: 1
        }]
      });
    }

  } catch (error) {
    console.error('Error loading product:', error);
    productName.textContent = 'Failed to load product';
  }
};

async function initProductPage() {
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

  if (buyButton) {
    buyButton.onclick = window.handleBuyClick;
  }

  window.LebeProductGallery.init();
  window.LebeSizeGuide.init();

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
    const cachedProducts = getCachedProducts();
    let previewApplied = false;

    if (cachedProducts.length > 0) {
      allProducts = cachedProducts;
      const cachedProduct = cachedProducts.find((product) => String(product.id) === String(id));
      applyProductPreview(cachedProduct);
      previewApplied = Boolean(cachedProduct);
      colorVariants = findColorVariants(id);
    }

    if (!previewApplied) {
      applyProductPreview(window.LebeProductData?.previews?.[id]);
    }

    const catalogPromise = loadCatalogForColorVariants(id);
    await loadProductData(id);
    await catalogPromise;
    initMobileCarousel();
  } catch (error) {
    console.error('Error initializing:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProductPage, { once: true });
} else {
  initProductPage();
}
