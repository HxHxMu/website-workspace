const FIXED_DESIGN_SLOTS = [
  {
    externalId: '64000b204a6de9',
    type: 'leggings',
    color: 'white',
    displayName: 'SAGUANARI LEGGINGS',
    images: [
      'assets/images/9.jpg',
      'assets/images/product-shots/saguanari_leggin_wht_1.jpg',
    ],
    swatch: 'white',
  },
  {
    externalId: '64775fcaef5f21',
    type: 'bra',
    color: 'white',
    displayName: 'SAGUANARI BRA',
    images: [
      'assets/images/11.jpg',
      'assets/images/product-shots/saguanari_bra_wht_1.jpg',
    ],
    swatch: 'white',
  },
  {
    externalId: '63ec714091ff89',
    type: 'leggings',
    color: 'black',
    displayName: 'SAGUANARI LEGGINGS',
    images: [
      'assets/images/15.jpg',
      'assets/images/product-shots/saguanari_leggin_blk_1.jpg',
    ],
    swatch: 'black',
  },
  {
    externalId: '6477600e15cb73',
    type: 'bra',
    color: 'black',
    displayName: 'SAGUANARI BRA',
    images: [
      'assets/images/17.jpg',
      'assets/images/product-shots/saguanari_bra_blk_1.jpg',
    ],
    swatch: 'black',
  },
];

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildAssetPathVariants(path) {
  const rawPath = String(path || '').trim();
  if (!rawPath) return [];
  if (/^(https?:)?\/\//i.test(rawPath) || rawPath.startsWith('data:')) return [rawPath];

  const withoutDot = rawPath.replace(/^\.\//, '');
  const normalized = withoutDot.replace(/^\/+/, '');
  const runtimeBase = window.location.pathname === '/src' || window.location.pathname.startsWith('/src/')
    ? '/src'
    : '';

  return [...new Set([
    runtimeBase ? `${runtimeBase}/${normalized}` : '',
    `/${normalized}`,
    `./${normalized}`,
    `/src/${normalized}`,
  ].filter(Boolean))];
}

function collectSlotImageVariants(slot) {
  const sources = Array.isArray(slot.images) ? slot.images : [];
  const expanded = sources.flatMap((source) => buildAssetPathVariants(source));
  return [...new Set(expanded)];
}

function handleImageFallback(imgEl) {
  const variants = (imgEl?.dataset?.fallbackSrcs || '')
    .split('|')
    .map((value) => value.trim())
    .filter(Boolean);

  if (variants.length === 0) {
    imgEl.onerror = null;
    imgEl.src = TRANSPARENT_PIXEL;
    return;
  }

  const currentIndex = Number.parseInt(imgEl.dataset.fallbackIndex || '0', 10);
  const safeCurrent = Number.isFinite(currentIndex) ? currentIndex : 0;
  const nextIndex = safeCurrent + 1;

  if (nextIndex < variants.length) {
    imgEl.dataset.fallbackIndex = String(nextIndex);
    imgEl.src = variants[nextIndex];
    return;
  }

  imgEl.onerror = null;
  imgEl.src = TRANSPARENT_PIXEL;
}

window.__lebeHandleImageFallback = handleImageFallback;

function slotMatch(product, slot) {
  const haystack = `${product?.name || ''}`.toLowerCase();
  return haystack.includes(slot.type) && haystack.includes(slot.color);
}

function mapProductsToSlots(products) {
  const usedIds = new Set();
  return FIXED_DESIGN_SLOTS.map((slot) => {
    const byExternalId = products.find(
      (product) =>
        !usedIds.has(product.id) &&
        String(product.externalId || '') === slot.externalId
    );
    const byTokens = byExternalId || products.find(
      (product) => !usedIds.has(product.id) && slotMatch(product, slot)
    );
    const matched = byTokens || null;
    if (matched) {
      usedIds.add(matched.id);
    }
    return { __slot: slot, product: matched };
  });
}

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
    grid.innerHTML = '<p class="col-span-full text-center text-[#050505]/50">No products available</p>';
    return;
  }

  const orderedSlots = mapProductsToSlots(products);

  grid.innerHTML = orderedSlots.map((slotEntry) => {
    const { __slot: slot, product } = slotEntry;
    const imageVariants = collectSlotImageVariants(slot);
    const displayImage = imageVariants[0] || TRANSPARENT_PIXEL;
    const fallbackSrcs = imageVariants.join('|');
    const isWhite = slot.swatch === 'white';
    const displayName = slot.displayName;
    const numericPrice = Number(product?.price);
    const displayPrice = Number.isFinite(numericPrice) ? `$${numericPrice.toFixed(0)}.` : '—';
    const productHref = product ? `/product?id=${encodeURIComponent(product.id)}` : '#';
    const productAlt = product?.name || displayName;

    return `
      <article class="group flex h-full flex-col">
        <a href="${productHref}" class="block aspect-[4/5] overflow-hidden bg-neutral-100">
          <img
            src="${escapeHtml(displayImage)}"
            data-fallback-srcs="${escapeHtml(fallbackSrcs)}"
            data-fallback-index="0"
            onerror="window.__lebeHandleImageFallback && window.__lebeHandleImageFallback(this)"
            alt="${escapeHtml(productAlt)}"
            class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </a>
        <div class="flex min-h-[100px] flex-1 items-start justify-between gap-4 border-b border-[#050505]/15 py-5">
          <div class="flex-1">
            <h3 class="min-h-[3.25rem] text-base font-semibold uppercase leading-tight tracking-[-0.03em] text-[#050505] md:text-lg">
              ${displayName}
            </h3>
            <div class="mt-2 flex items-center gap-3">
              <span
                class="inline-block h-3 w-3 rounded-full border border-[#050505]/30 ${isWhite ? 'bg-white' : 'bg-[#050505]'}"
              ></span>
              <p class="text-sm font-medium text-[#050505]/55">${displayPrice}</p>
            </div>
          </div>
          <a
            href="${productHref}"
            class="shrink-0 border border-[#050505] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] transition duration-300 hover:bg-[#050505] hover:text-white"
          >
            view.
          </a>
        </div>
      </article>
    `;
  }).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-grid')) {
    renderProductGrid();
  }
});
