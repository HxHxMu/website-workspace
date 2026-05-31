console.log('product.js loaded');

let currentProduct = null;
let currentVariant = null;

window.handleBuyClick = function(e) {
  console.log('=== HANDLE BUY CLICK CALLED ===');

  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const sizeSelect = document.getElementById('size-select');

  if (!sizeSelect || !sizeSelect.value) {
    console.log('❌ No size selected - NOT REDIRECTING');
    if (sizeSelect) {
      sizeSelect.classList.add('border-brand', 'bg-brand/5');
      setTimeout(() => sizeSelect.classList.remove('border-brand', 'bg-brand/5'), 2000);
    }
    return false; // Prevent any further action
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

  const qtySelect = document.getElementById('quantity');
  const quantity = qtySelect ? parseInt(qtySelect.value) || 1 : 1;

  const cartItem = {
    productId: currentProduct.id,
    variantId: currentVariant.id,
    syncVariantId: currentVariant.syncVariantId,
    name: currentProduct.name,
    size: currentVariant.size,
    color: currentVariant.color,
    price: currentVariant.price,
    quantity: quantity,
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

  const productForm = document.getElementById('product-form');
  const productName = document.getElementById('product-name');
  const productPrice = document.getElementById('product-price');
  const sizeSelect = document.getElementById('size-select');
  const buyButton = document.getElementById('buy-button');

  console.log('Elements found:', { productForm: !!productForm, sizeSelect: !!sizeSelect, buyButton: !!buyButton });

  if (!productForm) {
    console.error('Product form not found');
    return;
  }


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

    // Render images
    if (currentProduct.images && currentProduct.images.length > 0) {
      const imageSection = document.querySelector('div > img#product-image')?.parentElement;
      if (imageSection) {
        console.log('Rendering', currentProduct.images.length, 'images');

        let html = `<div style="width: 100%; aspect-ratio: 1/1; background: #f8f8f8; border-radius: 8px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center;">`;
        html += `<div style="width: 100%; height: 100%; position: relative;">`;

        currentProduct.images.forEach((img, idx) => {
          html += `<img src="${img}" alt="Product" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; ${idx === 0 ? '' : 'display: none;'}" data-index="${idx}">`;
        });

        html += `</div></div>`;
        imageSection.innerHTML = html;
        console.log('Images rendered');
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
      console.log('Size select populated');

      // Set initial variant and price
      currentVariant = currentProduct.variants[0];
      productPrice.textContent = `$${currentVariant.price.toFixed(2)}`;

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


  } catch (error) {
    console.error('Error loading product:', error);
    productName.textContent = 'Failed to load product';
  }
});
