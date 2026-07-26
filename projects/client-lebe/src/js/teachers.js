(function () {
  const DEFAULT_CODE = 'AMBASSADOR';
  const SET_VARIANTS = {
    black: {
      leggings: {
        XS: '3762113356',
        S: '3762113357',
        M: '3762113358',
        L: '3762113359',
        XL: '3762113360',
      },
      bra: {
        XS: '3910804393',
        S: '3910804394',
        M: '3910804395',
        L: '3910804396',
        XL: '3910804397',
      },
    },
    white: {
      leggings: {
        XS: '3784396045',
        S: '3784396046',
        M: '3784396047',
        L: '3784396048',
        XL: '3784396050',
      },
      bra: {
        XS: '3910803308',
        S: '3910803309',
        M: '3910803310',
        L: '3910803311',
        XL: '3910803312',
      },
    },
  };

  function cleanCode(value) {
    const code = String(value || '').trim().toUpperCase();
    return /^[A-Z0-9_-]{3,40}$/.test(code) ? code : DEFAULT_CODE;
  }

  function getTeacherCode() {
    const params = new URLSearchParams(window.location.search);
    return cleanCode(params.get('code') || DEFAULT_CODE);
  }

  function buildCartHref(setName, leggingsSize, braSize, code) {
    const set = SET_VARIANTS[setName] || SET_VARIANTS.black;
    const leggingsId = set.leggings[leggingsSize] || set.leggings.S;
    const braId = set.bra[braSize] || set.bra.S;
    const params = new URLSearchParams({
      products: `${leggingsId}:1,${braId}:1`,
      coupon: code,
      cart_origin: 'teacher_program',
    });
    return `/cart?${params.toString()}`;
  }

  function updateSetCardLink(card, code) {
    const setName = card.dataset.teacherSet || 'black';
    const leggingsSize = card.querySelector('[data-teacher-size="leggings"]')?.value || 'S';
    const braSize = card.querySelector('[data-teacher-size="bra"]')?.value || 'S';
    const link = card.querySelector('[data-teacher-cart-link]');
    if (link) link.setAttribute('href', buildCartHref(setName, leggingsSize, braSize, code));
  }

  function updateCartLinks(code) {
    document.querySelectorAll('[data-teacher-set-card]').forEach((card) => {
      updateSetCardLink(card, code);
    });
  }

  async function copyCode(code, statusEl) {
    try {
      await navigator.clipboard.writeText(code);
      if (statusEl) statusEl.textContent = 'Copied.';
    } catch (_) {
      if (statusEl) statusEl.textContent = 'Select and copy the code above.';
    }
  }

  function init() {
    const code = getTeacherCode();
    const codeEl = document.querySelector('[data-teacher-code]');
    const copyButton = document.querySelector('[data-teacher-code-copy]');
    const statusEl = document.querySelector('[data-teacher-code-status]');

    if (codeEl) codeEl.textContent = code;
    updateCartLinks(code);

    document.querySelectorAll('[data-teacher-set-card]').forEach((card) => {
      card.querySelectorAll('[data-teacher-size]').forEach((select) => {
        select.addEventListener('change', () => updateSetCardLink(card, code));
      });
    });

    copyButton?.addEventListener('click', () => {
      copyCode(code, statusEl);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
