// Printful products (hardcoded for v1)
const PRODUCTS = [
  {
    id: 'sp432310961',
    name: 'Saguanari Seamless Ainbo Bra',
    thumbnail_url: 'https://files.cdn.printful.com/files/ba0/ba09b047dc3e9f9ec3234760ac944ffd_preview.png',
    published_to_stores: [{ sync_product_id: 432310961 }]
  },
  {
    id: 'sp432310896',
    name: 'High-Waist Ainbo Leggings',
    thumbnail_url: 'https://files.cdn.printful.com/files/3d9/3d90c76c641ed8a51a428bdb232d25b6_preview.png',
    published_to_stores: [{ sync_product_id: 432310896 }]
  },
  {
    id: 'sp6477600e15cb73',
    name: 'Sanguanari Sports Bra Black',
    thumbnail_url: 'https://files.cdn.printful.com/files/647/6477600e15cb73_thumb.png',
    published_to_stores: [{ sync_product_id: 432310962 }]
  },
  {
    id: 'sp64775fcaef5f21',
    name: 'Sanguanari Sports Bra White',
    thumbnail_url: 'https://files.cdn.printful.com/files/647/64775fcaef5f21_thumb.png',
    published_to_stores: [{ sync_product_id: 432310963 }]
  },
  {
    id: 'sp64000b204a6de9',
    name: 'Saguanari White Yoga Leggings',
    thumbnail_url: 'https://files.cdn.printful.com/files/640/64000b204a6de9_preview.png',
    published_to_stores: [{ sync_product_id: 432310964 }]
  },
  {
    id: 'sp63ec714091ff89',
    name: 'Saguanari Yoga Leggings',
    thumbnail_url: 'https://files.cdn.printful.com/files/63e/63ec714091ff89_preview.png',
    published_to_stores: [{ sync_product_id: 432310965 }]
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

  grid.innerHTML = products.slice(0, 6).map(product => {
    const syncId = product.published_to_stores?.[0]?.sync_product_id;
    const printfulLink = `https://lebe.printful.me/products/${syncId}`;
    return `
      <a href="${printfulLink}" target="_blank" rel="noopener noreferrer" class="group">
        <div class="aspect-square bg-surface rounded overflow-hidden mb-3">
          <div class="w-full h-full bg-gradient-to-br from-brand to-red-900 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <span class="text-white text-sm text-center px-4 font-semibold">${product.name}</span>
          </div>
        </div>
        <h2 class="font-semibold text-base line-clamp-2">${product.name}</h2>
        <p class="text-brand font-semibold mt-1">View details →</p>
      </a>
    `;
  }).join('');
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
