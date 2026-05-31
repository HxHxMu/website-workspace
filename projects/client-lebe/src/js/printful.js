// Fetch products from API
async function fetchProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Render product grid
async function renderProductGrid() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const products = await fetchProducts();

  if (products.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center text-text-muted">No products available</p>';
    return;
  }

  grid.innerHTML = products.slice(0, 6).map((product, idx) => {
    const carouselId = `carousel-${idx}`;
    const images = product.images || [];

    // Use first image as fallback if no images
    const displayImages = images.length > 0 ? images : ['https://via.placeholder.com/400'];

    return `
      <div class="group" data-product-id="${product.id}">
        <div class="carousel-container aspect-square bg-surface rounded overflow-hidden mb-3 relative">
          <div id="${carouselId}" class="carousel w-full h-full relative">
            ${displayImages.map((img, imgIdx) => `
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
        </div>

        <!-- Carousel dots (mobile visible, desktop hidden) -->
        ${displayImages.length > 1 ? `
          <div class="flex justify-center gap-2 mt-2 sm:hidden">
            ${displayImages.map((_, imgIdx) => `
              <button class="carousel-dot w-2 h-2 rounded-full transition-colors ${imgIdx === 0 ? 'bg-brand' : 'bg-text/30'}" data-index="${imgIdx}" aria-label="Image ${imgIdx + 1}"></button>
            `).join('')}
          </div>
        ` : ''}

        <h2 class="font-semibold text-base line-clamp-2 mt-3">${product.name}</h2>
        <p class="text-text-muted text-sm mt-1">${product.description || ''}</p>
        <div class="flex items-center gap-2 mt-2">
          <span class="text-brand font-semibold">$${product.price ? product.price.toFixed(2) : 'N/A'}</span>
        </div>
        <button class="buy-btn text-brand font-semibold text-sm mt-2 cursor-pointer">View details →</button>
      </div>
    `;
  }).join('');

  // Add carousel handlers
  document.querySelectorAll('.carousel-container').forEach(container => {
    const carousel = container.querySelector('[id^="carousel-"]');
    const parentCard = container.closest('[data-product-id]');
    const dots = parentCard.querySelectorAll('.carousel-dot');
    const images = carousel.querySelectorAll('.carousel-img');
    const prevBtn = container.querySelector('.carousel-prev');
    const nextBtn = container.querySelector('.carousel-next');
    let currentIdx = 0;
    let touchStartX = 0;

    const showImage = (idx, direction = 'next') => {
      const current = images[currentIdx];
      const next = images[idx];

      next.style.display = 'block';
      void next.offsetWidth;

      if (direction === 'next') {
        current.style.animation = 'slideOutLeft 0.4s ease-in-out forwards';
        next.style.animation = 'slideInRight 0.4s ease-in-out forwards';
      } else {
        current.style.animation = 'slideOutRight 0.4s ease-in-out forwards';
        next.style.animation = 'slideInLeft 0.4s ease-in-out forwards';
      }

      setTimeout(() => {
        current.style.animation = '';
        current.style.display = 'none';
      }, 400);

      currentIdx = idx;

      dots.forEach(d => {
        d.classList.remove('bg-brand');
        d.classList.add('bg-text/30');
      });
      if (dots[idx]) {
        dots[idx].classList.remove('bg-text/30');
        dots[idx].classList.add('bg-brand');
      }
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
    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showImage((currentIdx - 1 + images.length) % images.length, 'prev');
    });

    nextBtn?.addEventListener('click', (e) => {
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

      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          showImage((currentIdx + 1) % images.length, 'next');
        } else {
          showImage((currentIdx - 1 + images.length) % images.length, 'prev');
        }
      }
    });
  });

  // Buy button handlers
  document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productCard = e.target.closest('[data-product-id]');
      const productId = productCard.dataset.productId;
      window.location.href = '/product?id=' + productId;
    });
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-grid')) {
    renderProductGrid();
  }
});
