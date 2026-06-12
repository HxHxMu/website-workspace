(function () {
  let productGalleryImages = [];
  let productGalleryIndex = 0;
  let productGalleryLastFocus = null;
  let productGalleryTouchStartX = null;
  let productGalleryZoomed = false;
  let productGallerySuppressClick = false;
  let productGalleryPanX = 0;
  let productGalleryPanY = 0;
  let productGalleryPointerStart = null;

  function getFullSizeImageSrc(src) {
    return String(src || '').replace(/-900(?=\.jpe?g(?:$|[?#]))/i, '');
  }

  function getProductGalleryPanBounds() {
    const image = document.getElementById('pdp-gallery-image');
    const figure = image?.closest('.pdp-gallery__figure');
    if (!image || !figure || !productGalleryZoomed) return { maxX: 0, maxY: 0 };

    const scale = Number.parseFloat(getComputedStyle(image).getPropertyValue('--pdp-gallery-zoom-scale')) || 1.2;
    const figureRect = figure.getBoundingClientRect();
    const maxX = Math.max(0, (figureRect.width * scale - figureRect.width) / (2 * scale));
    const maxY = Math.max(0, (figureRect.height * scale - figureRect.height) / (2 * scale));

    return { maxX, maxY };
  }

  function clampProductGalleryPan() {
    const { maxX, maxY } = getProductGalleryPanBounds();
    productGalleryPanX = Math.max(-maxX, Math.min(maxX, productGalleryPanX));
    productGalleryPanY = Math.max(-maxY, Math.min(maxY, productGalleryPanY));
  }

  function applyProductGalleryTransform() {
    const image = document.getElementById('pdp-gallery-image');
    if (!image) return;

    if (!productGalleryZoomed) {
      image.style.removeProperty('--pdp-gallery-pan-x');
      image.style.removeProperty('--pdp-gallery-pan-y');
      image.classList.remove('is-zoomed', 'is-dragging');
      image.setAttribute('aria-pressed', 'false');
      return;
    }

    clampProductGalleryPan();
    image.style.setProperty('--pdp-gallery-pan-x', `${productGalleryPanX}px`);
    image.style.setProperty('--pdp-gallery-pan-y', `${productGalleryPanY}px`);
    image.classList.add('is-zoomed');
    image.setAttribute('aria-pressed', 'true');
  }

  function resetProductGalleryZoom() {
    productGalleryZoomed = false;
    productGalleryPanX = 0;
    productGalleryPanY = 0;
    productGalleryPointerStart = null;
    applyProductGalleryTransform();
  }

  function renderProductGallery() {
    const gallery = document.getElementById('pdp-gallery');
    const image = document.getElementById('pdp-gallery-image');
    const count = document.getElementById('pdp-gallery-count');
    const prev = document.getElementById('pdp-gallery-prev');
    const next = document.getElementById('pdp-gallery-next');
    if (!gallery || !image || productGalleryImages.length === 0) return;

    productGalleryIndex = (productGalleryIndex + productGalleryImages.length) % productGalleryImages.length;
    const activeImage = productGalleryImages[productGalleryIndex];

    image.src = activeImage.thumb;
    image.dataset.fullSrc = activeImage.full;
    image.dataset.fallbackSrc = activeImage.thumb;
    image.dataset.fullRequested = 'false';
    image.dataset.triedFallback = 'false';
    
    // Alt text reads dynamically from the product name element
    const productName = document.getElementById('product-name')?.textContent || 'Product';
    image.alt = `${productName} image`;
    
    applyProductGalleryTransform();
    if (count) count.textContent = `${productGalleryIndex + 1} / ${productGalleryImages.length}`;

    const hasMultipleImages = productGalleryImages.length > 1;
    prev?.toggleAttribute('hidden', !hasMultipleImages);
    next?.toggleAttribute('hidden', !hasMultipleImages);
  }

  function preloadProductGalleryFullImage(index) {
    const activeImage = productGalleryImages[(index + productGalleryImages.length) % productGalleryImages.length];
    if (!activeImage?.full || activeImage.full === activeImage.thumb) return;
    const loader = new Image();
    loader.decoding = 'async';
    loader.src = activeImage.full;
  }

  function upgradeProductGalleryImageToFull() {
    const image = document.getElementById('pdp-gallery-image');
    if (!image) return;

    const fullSrc = image.dataset.fullSrc;
    if (!fullSrc || image.dataset.fullRequested === 'true') return;
    if (image.currentSrc.endsWith(fullSrc) || image.src.endsWith(fullSrc)) return;

    image.dataset.fullRequested = 'true';
    const loader = new Image();
    loader.decoding = 'async';
    loader.onload = () => {
      if (image.dataset.fullSrc === fullSrc) {
        image.src = fullSrc;
      }
    };
    loader.src = fullSrc;
  }

  function openProductGallery(index = 0) {
    const gallery = document.getElementById('pdp-gallery');
    const close = document.getElementById('pdp-gallery-close');
    if (!gallery || productGalleryImages.length === 0) return;

    productGalleryLastFocus = document.activeElement;
    productGalleryIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
    productGalleryZoomed = false;
    gallery.hidden = false;
    document.body.classList.add('pdp-gallery-open');
    renderProductGallery();
    window.LebeAnalytics?.track('open_product_gallery', {
      item_id: String(new URLSearchParams(window.location.search).get('id') || ''),
      item_name: document.getElementById('product-name')?.textContent || 'LEBE Item',
      image_index: productGalleryIndex + 1,
      image_count: productGalleryImages.length,
    });
    window.setTimeout(() => {
      preloadProductGalleryFullImage(productGalleryIndex);
      preloadProductGalleryFullImage(productGalleryIndex + 1);
    }, 120);
    close?.focus({ preventScroll: true });
  }

  function closeProductGallery() {
    const gallery = document.getElementById('pdp-gallery');
    if (!gallery || gallery.hidden) return;

    gallery.hidden = true;
    document.body.classList.remove('pdp-gallery-open');
    resetProductGalleryZoom();
    productGalleryLastFocus?.focus?.({ preventScroll: true });
    productGalleryLastFocus = null;
  }

  function navigateProductGallery(direction) {
    if (productGalleryImages.length < 2) return;
    productGalleryIndex += direction;
    resetProductGalleryZoom();
    renderProductGallery();
  }

  function toggleProductGalleryZoom() {
    productGalleryZoomed = !productGalleryZoomed;
    productGalleryPanX = 0;
    productGalleryPanY = 0;
    applyProductGalleryTransform();
    if (productGalleryZoomed) {
      upgradeProductGalleryImageToFull();
      window.LebeAnalytics?.track('zoom_product_image', {
        item_id: String(new URLSearchParams(window.location.search).get('id') || ''),
        item_name: document.getElementById('product-name')?.textContent || 'LEBE Item',
        image_index: productGalleryIndex + 1,
      });
    }
  }

  function startProductGalleryPan(event) {
    if (!productGalleryZoomed) return;
    const image = document.getElementById('pdp-gallery-image');
    if (!image) return;

    productGalleryPointerStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: productGalleryPanX,
      panY: productGalleryPanY,
      moved: false,
    };
    image.classList.add('is-dragging');
    image.setPointerCapture?.(event.pointerId);
  }

  function moveProductGalleryPan(event) {
    if (!productGalleryPointerStart || productGalleryPointerStart.id !== event.pointerId) return;

    const deltaX = event.clientX - productGalleryPointerStart.x;
    const deltaY = event.clientY - productGalleryPointerStart.y;
    if (Math.hypot(deltaX, deltaY) > 3) {
      productGalleryPointerStart.moved = true;
    }

    const scale = productGalleryZoomed
      ? Number.parseFloat(getComputedStyle(event.currentTarget).getPropertyValue('--pdp-gallery-zoom-scale')) || 1.2
      : 1;

    productGalleryPanX = productGalleryPointerStart.panX + (deltaX / scale);
    productGalleryPanY = productGalleryPointerStart.panY + (deltaY / scale);
    applyProductGalleryTransform();
  }

  function endProductGalleryPan(event) {
    if (!productGalleryPointerStart || productGalleryPointerStart.id !== event.pointerId) return;

    const image = document.getElementById('pdp-gallery-image');
    if (productGalleryPointerStart.moved) {
      productGallerySuppressClick = true;
    }
    productGalleryPointerStart = null;
    image?.classList.remove('is-dragging');
    image?.releasePointerCapture?.(event.pointerId);
  }

  function bindProductGalleryTriggers() {
    ['#image-carousel', '#image-grid'].forEach((containerSelector) => {
      const triggerImages = document.querySelectorAll(`${containerSelector} img`);
      triggerImages.forEach((img, index) => {
        img.classList.add('pdp-gallery-trigger');
        img.setAttribute('role', 'button');
        img.setAttribute('tabindex', '0');
        img.setAttribute('aria-label', `Open product image ${index + 1}`);
        img.onclick = () => openProductGallery(index);
        img.onkeydown = (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          openProductGallery(index);
        };
      });
    });
  }

  function initProductGallery() {
    const gallery = document.getElementById('pdp-gallery');
    const close = document.getElementById('pdp-gallery-close');
    const prev = document.getElementById('pdp-gallery-prev');
    const next = document.getElementById('pdp-gallery-next');
    const image = document.getElementById('pdp-gallery-image');
    if (!gallery || gallery.dataset.initialized === 'true') return;

    gallery.dataset.initialized = 'true';
    close?.addEventListener('click', closeProductGallery);
    prev?.addEventListener('click', () => navigateProductGallery(-1));
    next?.addEventListener('click', () => navigateProductGallery(1));
    image?.addEventListener('pointerdown', startProductGalleryPan);
    image?.addEventListener('pointermove', moveProductGalleryPan);
    image?.addEventListener('pointerup', endProductGalleryPan);
    image?.addEventListener('pointercancel', endProductGalleryPan);
    image?.addEventListener('click', () => {
      if (productGallerySuppressClick) {
        productGallerySuppressClick = false;
        return;
      }
      toggleProductGalleryZoom();
    });
    image?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleProductGalleryZoom();
    });
    image?.addEventListener('error', () => {
      const fallbackSrc = image.dataset.fallbackSrc;
      if (fallbackSrc && image.dataset.triedFallback !== 'true') {
        image.dataset.triedFallback = 'true';
        image.src = fallbackSrc;
      }
    });

    gallery.addEventListener('click', (event) => {
      if (event.target === gallery) closeProductGallery();
    });

    gallery.addEventListener('touchstart', (event) => {
      productGalleryTouchStartX = event.changedTouches?.[0]?.clientX ?? null;
    }, { passive: true });

    gallery.addEventListener('touchend', (event) => {
      if (productGalleryZoomed) return;
      if (productGalleryTouchStartX === null) return;
      const endX = event.changedTouches?.[0]?.clientX;
      if (typeof endX !== 'number') return;
      const deltaX = endX - productGalleryTouchStartX;
      productGalleryTouchStartX = null;
      if (Math.abs(deltaX) < 44) return;
      productGallerySuppressClick = true;
      navigateProductGallery(deltaX > 0 ? -1 : 1);
    }, { passive: true });

    document.addEventListener('keydown', (event) => {
      if (gallery.hidden) return;
      if (event.key === 'Escape') closeProductGallery();
      if (event.key === 'ArrowLeft') navigateProductGallery(-1);
      if (event.key === 'ArrowRight') navigateProductGallery(1);
    });
  }

  function setProductGalleryImages(images) {
    productGalleryImages = (Array.isArray(images) ? images : [])
      .filter(Boolean)
      .map((src) => ({
        thumb: String(src),
        full: getFullSizeImageSrc(src),
      }));
  }

  window.LebeProductGallery = {
    init: initProductGallery,
    setImages: setProductGalleryImages,
    bindTriggers: bindProductGalleryTriggers,
    open: openProductGallery,
    close: closeProductGallery,
  };
})();
