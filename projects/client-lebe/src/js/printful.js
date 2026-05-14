// Printful products with image carousel (2 shots each)
const PRODUCTS = [
  {
    id: 'saguanari-seamless-ainbo-bra',
    name: 'Ainbo Seamless Bra',
    color: 'Terracota',
    originalPrice: 75,
    salePrice: 45,
    url: 'https://lebe.printful.me/product/saguanari-seamless-ainbo-bra',
    images: [
      './assets/images/product%20shots/ainbo_bra_terracota_1.jpg',
      './assets/images/product%20shots/ainbo_bra_terracota_2.jpg'
    ]
  },
  {
    id: 'ainbo-high-waist-legging',
    name: 'Ainbo High-Waist Leggings',
    color: 'Terracota',
    originalPrice: 70,
    salePrice: 40,
    url: 'https://lebe.printful.me/product/ainbo-high-waist-legging',
    images: [
      './assets/images/product%20shots/ainbo_leggin_terracota_1.jpg',
      './assets/images/product%20shots/ainbo_leggin_terracota_2.jpg'
    ]
  },
  {
    id: 'saguanari-racerback-bra-black',
    name: 'Saguanari Sports Bra',
    color: 'Black',
    originalPrice: 60,
    salePrice: 40,
    url: 'https://lebe.printful.me/product/saguanari-racerback-bra-black',
    images: [
      './assets/images/product%20shots/saguanari_bra_blk_1.jpg',
      './assets/images/product%20shots/saguanari_bra_blk_2.jpg'
    ]
  },
  {
    id: 'saguanari-racerback-bra-white',
    name: 'Saguanari Sports Bra',
    color: 'White',
    originalPrice: 60,
    salePrice: 40,
    bestSeller: true,
    url: 'https://lebe.printful.me/product/saguanari-racerback-bra-white',
    images: [
      './assets/images/product%20shots/saguanari_bra_wht_1.jpg',
      './assets/images/product%20shots/saguanari_bra_wht_2.jpg'
    ]
  },
  {
    id: 'saguanari-high-waist-white-legging',
    name: 'Saguanari Yoga Leggings',
    color: 'White',
    originalPrice: 70,
    salePrice: 40,
    bestSeller: true,
    url: 'https://lebe.printful.me/product/saguanari-high-waist-white-legging',
    images: [
      './assets/images/product%20shots/saguanari_leggin_wht_1.jpg',
      './assets/images/product%20shots/saguanari_leggin_wht_2.jpg'
    ]
  },
  {
    id: 'saguanari-high-waist-black-legging',
    name: 'Saguanari Yoga Leggings',
    color: 'Black',
    originalPrice: 70,
    salePrice: 40,
    url: 'https://lebe.printful.me/product/saguanari-high-waist-black-legging',
    images: [
      './assets/images/product%20shots/saguanari_leggin_blk_1.jpg',
      './assets/images/product%20shots/saguanari_leggin_blk_2.jpg'
    ]
  }
];

// Fetch products (returns hardcoded for v1)
async function fetchProducts() {
  return PRODUCTS;
}

// Render product grid
async function renderProductGrid() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const products = await fetchProducts();

  if (products.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center text-text-muted">Loading products...</p>';
    return;
  }

  grid.innerHTML = products.slice(0, 6).map((product, idx) => {
    const printfulLink = product.url;
    const carouselId = `carousel-${idx}`;
    const discountPercent = Math.round(((product.originalPrice - product.salePrice) / product.originalPrice) * 100);
    return `
      <a href="${printfulLink}" target="_blank" rel="noopener noreferrer" class="group">
        <div class="carousel-container aspect-square bg-surface rounded overflow-hidden mb-3 relative">
          <div id="${carouselId}" class="carousel w-full h-full relative">
            ${product.images.map((img, imgIdx) => `
              <img
                src="${img}"
                alt="${product.name}"
                class="product-card carousel-img w-full h-full object-cover absolute inset-0"
                style="${imgIdx === 0 ? '' : 'display: none;'}"
                loading="lazy"
                data-index="${imgIdx}"
              >
            `).join('')}
          </div>

          <!-- Arrow buttons (desktop only, hidden on mobile) -->
          <button class="carousel-arrow carousel-prev hidden md:flex absolute left-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/60 hover:bg-black text-white p-3 rounded-full items-center justify-center" aria-label="Previous image">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button class="carousel-arrow carousel-next hidden md:flex absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/60 hover:bg-black text-white p-3 rounded-full items-center justify-center" aria-label="Next image">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>

          <!-- Carousel dots (mobile visible, desktop hidden) -->
          <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 md:hidden">
            ${product.images.map((_, imgIdx) => `
              <button class="carousel-dot w-2 h-2 rounded-full transition-colors ${imgIdx === 0 ? 'bg-brand' : 'bg-white/50'}" data-index="${imgIdx}" aria-label="Image ${imgIdx + 1}"></button>
            `).join('')}
          </div>

          <!-- Badges -->
          ${product.bestSeller ? '<div class="absolute top-3 left-3 bg-text/80 text-ink px-3 py-1 rounded-full text-xs font-semibold z-20">Best Seller</div>' : ''}
          <div class="absolute bottom-3 left-3 bg-white/90 text-brand px-3 py-1 rounded font-bold text-sm z-20">${discountPercent}% OFF</div>
        </div>
        <h2 class="font-semibold text-base line-clamp-2">${product.name}</h2>
        <p class="text-text-muted text-sm mt-1">${product.color}</p>
        <div class="flex items-center gap-2 mt-2">
          <span class="text-text-muted text-sm line-through">$${product.originalPrice}</span>
          <span class="text-brand font-semibold">$${product.salePrice}</span>
        </div>
        <p class="text-brand font-semibold mt-2">View details →</p>
      </a>
    `;
  }).join('');

  // Add carousel handlers
  document.querySelectorAll('.carousel-container').forEach(container => {
    const carousel = container.querySelector('[id^="carousel-"]');
    const dots = container.querySelectorAll('.carousel-dot');
    const images = carousel.querySelectorAll('.carousel-img');
    const prevBtn = container.querySelector('.carousel-prev');
    const nextBtn = container.querySelector('.carousel-next');
    let currentIdx = 0;
    let touchStartX = 0;

    const showImage = (idx, direction = 'next') => {
      const current = images[currentIdx];
      const next = images[idx];

      // Show the next image immediately (for animation to work)
      next.style.display = 'block';

      // Force reflow to ensure animation plays
      void next.offsetWidth;

      if (direction === 'next') {
        // Current image pushes out to the left
        current.style.animation = 'slideOutLeft 0.4s ease-in-out forwards';
        // New image slides in from the right
        next.style.animation = 'slideInRight 0.4s ease-in-out forwards';
      } else {
        // Current image pushes out to the right
        current.style.animation = 'slideOutRight 0.4s ease-in-out forwards';
        // New image slides in from the left
        next.style.animation = 'slideInLeft 0.4s ease-in-out forwards';
      }

      // Hide the previous image after animation
      setTimeout(() => {
        current.style.animation = '';
        current.style.display = 'none';
      }, 400);

      currentIdx = idx;

      dots.forEach(d => {
        d.classList.remove('bg-brand');
        d.classList.add('bg-white/50');
      });
      dots[idx].classList.remove('bg-white/50');
      dots[idx].classList.add('bg-brand');
    };

    // Dot clicks (mobile)
    dots.forEach((dot, idx) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showImage(idx);
      });
    });

    // Arrow buttons (desktop)
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showImage((currentIdx - 1 + images.length) % images.length, 'prev');
    });

    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showImage((currentIdx + 1) % images.length, 'next');
    });

    // Touch/swipe support for mobile
    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    });

    carousel.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > 50) { // Swipe threshold
        if (diff > 0) {
          // Swipe left → next image
          showImage((currentIdx + 1) % images.length, 'next');
        } else {
          // Swipe right → prev image
          showImage((currentIdx - 1 + images.length) % images.length, 'prev');
        }
      }
    });
  });
}

// Render product detail
async function renderProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) return;

  try {
    const response = await fetch(`${PRINTFUL_API_BASE}/products/${productId}`, {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_TOKEN}`
      }
    });
    const data = await response.json();
    const product = data.data;

    if (!product) {
      console.error('Product not found');
      return;
    }

    document.getElementById('product-name').textContent = product.name;

    // Get thumbnail image
    if (product.thumbnail_url) {
      document.getElementById('product-image').src = product.thumbnail_url;
      document.getElementById('product-image').alt = product.name;
    }

    // Fetch product variants for sizes/colors
    const variantsResponse = await fetch(`${PRINTFUL_API_BASE}/products/${productId}/variants`, {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_TOKEN}`
      }
    });
    const variantsData = await variantsResponse.json();
    const variants = variantsData.data || [];

    const colorSwatches = document.getElementById('color-swatches');
    const sizeSelect = document.getElementById('size-select');

    if (variants.length > 0) {
      // Extract unique sizes
      const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
      if (sizeSelect && sizes.length > 0) {
        sizeSelect.innerHTML += sizes.map(size => `<option value="${size}">${size}</option>`).join('');
      }

      // Set price from first variant
      const price = variants[0]?.retail_price || variants[0]?.price;
      if (price) {
        document.getElementById('product-price').textContent = `$${price}`;
      }
    }

    // Buy button handler - redirect to Printful storefront
    const buyButton = document.getElementById('buy-button');
    if (buyButton) {
      buyButton.addEventListener('click', () => {
        const selectedSize = sizeSelect.value;

        if (!selectedSize) {
          alert('Please select a size');
          return;
        }

        // Redirect to Printful hosted store for checkout
        const syncId = product.published_to_stores[0]?.sync_product_id;
        if (syncId) {
          window.location.href = `https://lebe.printful.me/products/${syncId}`;
        }
      });
    }
  } catch (error) {
    console.error('Error loading product:', error);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-grid')) {
    renderProductGrid();
  }
  if (document.getElementById('product-form')) {
    renderProductDetail();
  }
});
