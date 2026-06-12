(function () {
  let sizeGuideLastFocus = null;

  const SIZE_GUIDES = {
    leggings: {
      description: 'This size guide shows body measurements. We suggest ordering a size down when your measurements are between sizes.',
      imageSrc: './assets/images/sizeChartFigure.png',
      imageAlt: 'Measure yourself: waist and hips',
      columns: ['Waist', 'Hips'],
      instructions: [
        'For all horizontal measurements, keep the tape measure parallel to the ground.',
        '<strong class="text-[#050505]">A Waist.</strong> Place the tape on the narrowest part of the waist and measure around.',
        '<strong class="text-[#050505]">B Hips.</strong> Put the beginning of the tape measure on one hip and bring the tape across the fullest part of the hips back to where you started measuring.',
      ],
      rows: [
        ['XS', '25 ¼', '35 ⅜'],
        ['S', '26 ¾', '37'],
        ['M', '28 ⅜', '38 ⅝'],
        ['L', '31 ½', '41 ¾'],
        ['XL', '34 ⅝', '44 ⅞'],
      ],
    },
    bra: {
      description: 'This size guide shows body measurements. We suggest ordering a size up when your measurements are between sizes.',
      imageSrc: './assets/images/sizeChartFigure-bra.png',
      imageAlt: 'Measure yourself: chest and underbust',
      columns: ['Chest', 'Underbust'],
      instructions: [
        'For all horizontal measurements, keep the tape measure parallel to the ground.',
        '<strong class="text-[#050505]">A Chest.</strong> Put one end of the tape measure on the fullest part of the chest and bring the tape around the back, under the armpits and over the shoulder blades, to where you started.',
        '<strong class="text-[#050505]">B Underbust girth.</strong> Put the measuring tape around your body, right under your breasts where the bra band sits.',
      ],
      rows: [
        ['XS', '33 ⅛', '27 ⅝'],
        ['S', '34 ⅝', '29 ⅛'],
        ['M', '36 ¼', '30 ¾'],
        ['L', '39 ⅜', '33 ½'],
        ['XL', '42 ½', '36 ¼'],
      ],
    },
  };

  function getProductSizeGuideType(product) {
    const productName = String(product?.name || '').toLowerCase();
    const productId = String(product?.id || '');
    return productName.includes('bra') || ['309483674', '309483736'].includes(productId)
      ? 'bra'
      : 'leggings';
  }

  function renderSizeGuide(product) {
    const guide = SIZE_GUIDES[getProductSizeGuideType(product)] || SIZE_GUIDES.leggings;
    const description = document.getElementById('size-guide-description');
    const image = document.getElementById('size-guide-figure-image');
    const instructions = document.getElementById('size-guide-instructions');
    const tableHead = document.getElementById('size-guide-table-head');
    const tableBody = document.getElementById('size-guide-table-body');

    if (description) description.textContent = guide.description;
    if (image) {
      image.src = guide.imageSrc;
      image.alt = guide.imageAlt;
    }

    if (instructions) {
      instructions.innerHTML = guide.instructions
        .map((instruction) => `<p>${instruction}</p>`)
        .join('');
    }

    if (tableHead) {
      tableHead.innerHTML = `
        <tr>
          <th scope="col">Size</th>
          ${guide.columns.map((column) => `<th scope="col">${column}</th>`).join('')}
        </tr>
      `;
    }

    if (tableBody) {
      tableBody.innerHTML = guide.rows
        .map(([size, ...values]) => `
          <tr>
            <th scope="row">${size}</th>
            ${values.map((value) => `<td>${value}</td>`).join('')}
          </tr>
        `)
        .join('');
    }
  }

  function openSizeGuide() {
    const modal = document.getElementById('size-guide-modal');
    const close = document.getElementById('size-guide-close');
    const trigger = document.getElementById('size-guide-trigger');
    if (!modal) return;

    sizeGuideLastFocus = document.activeElement;
    modal.hidden = false;
    trigger?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('pdp-size-guide-open');
    window.LebeAnalytics?.track('open_size_guide', {
      item_id: String(new URLSearchParams(window.location.search).get('id') || ''),
      item_name: document.getElementById('product-name')?.textContent || 'LEBE Item',
      size_guide_type: document.getElementById('size-guide-figure-image')?.alt || 'size guide',
    });
    close?.focus({ preventScroll: true });
  }

  function closeSizeGuide() {
    const modal = document.getElementById('size-guide-modal');
    const trigger = document.getElementById('size-guide-trigger');
    if (!modal || modal.hidden) return;

    modal.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('pdp-size-guide-open');
    sizeGuideLastFocus?.focus?.({ preventScroll: true });
    sizeGuideLastFocus = null;
  }

  function getSizeGuideFocusableElements(modal) {
    return Array.from(modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
  }

  function initSizeGuide() {
    const trigger = document.getElementById('size-guide-trigger');
    const modal = document.getElementById('size-guide-modal');
    const close = document.getElementById('size-guide-close');
    if (!trigger || !modal || modal.dataset.initialized === 'true') return;

    modal.dataset.initialized = 'true';
    trigger.addEventListener('click', openSizeGuide);
    close?.addEventListener('click', closeSizeGuide);

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeSizeGuide();
    });

    document.addEventListener('keydown', (event) => {
      if (modal.hidden) return;
      if (event.key === 'Escape') {
        closeSizeGuide();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusableElements = getSizeGuideFocusableElements(modal);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    });
  }

  window.LebeSizeGuide = {
    init: initSizeGuide,
    render: renderSizeGuide,
    open: openSizeGuide,
    close: closeSizeGuide,
  };
})();
