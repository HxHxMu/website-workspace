document.addEventListener('DOMContentLoaded', () => {
  window.renderCart?.();

  const state = {
    mode: 'cart',
    step: 1,
    verifiedAddress: null,
    shippingRates: [],
    selectedShipping: null,
    paymentSetup: null,
    checkoutItems: null,
    promoCode: '',
    appliedDiscount: null,
  };

  let stripeInstance = null;
  let stripeElements = null;
  let cardNumberElementInstance = null;
  let cardExpiryElementInstance = null;
  let cardCvcElementInstance = null;
  let paymentSetupRequestId = 0;
  let paymentSetupAbortController = null;

  const refs = {
    bagHero: document.getElementById('bag-hero'),
    checkoutHero: document.getElementById('checkout-hero'),
    stepKicker: document.getElementById('checkout-step-kicker'),
    stepTitle: document.getElementById('checkout-step-title'),
    cartItemsPanel: document.getElementById('cart-items-panel'),
    upsellModule: document.getElementById('upsell-module'),
    checkoutPanel: document.getElementById('checkout-panel'),
    cartContent: document.getElementById('cart-content'),
    emptyState: document.getElementById('cart-empty'),
    shippingStep: document.getElementById('shipping-step'),
    shippingMethodStep: document.getElementById('shipping-method-step'),
    paymentStep: document.getElementById('payment-step'),
    checkoutToggle: document.getElementById('checkout-toggle'),
    shippingOptions: document.getElementById('shipping-method-options'),
    shippingLoadingBox: document.getElementById('shipping-loading-box'),
    shippingErrorBox: document.getElementById('shipping-error-box'),
    continueToMethodsBtn: document.getElementById('continue-to-methods-btn'),
    continueToPaymentBtn: document.getElementById('continue-to-payment-btn'),
    editAddressBtn: document.getElementById('edit-address-btn'),
    editShippingBtn: document.getElementById('edit-shipping-btn'),
    paymentForm: document.getElementById('payment-form'),
    billingSameAsShipping: document.getElementById('billing-same-as-shipping'),
    billingForm: document.getElementById('billing-form'),
    paymentLoading: document.getElementById('payment-loading'),
    cardNumberElement: document.getElementById('card-number-element'),
    cardExpiryElement: document.getElementById('card-expiry-element'),
    cardCvcElement: document.getElementById('card-cvc-element'),
    checkoutError: document.getElementById('checkout-error'),
    placeOrderBtn: document.getElementById('place-order-btn'),
    summaryCopy: document.getElementById('summary-copy'),
    subtotal: document.getElementById('cart-subtotal'),
    discountRow: document.getElementById('discount-row'),
    discount: document.getElementById('cart-discount'),
    shipping: document.getElementById('cart-shipping'),
    tax: document.getElementById('cart-tax'),
    total: document.getElementById('cart-total'),
    promoSections: Array.from(document.querySelectorAll('.cart-only')),
    cartOnlyElements: Array.from(document.querySelectorAll('[data-cart-only]')),
    selectedShippingLabel: document.getElementById('selected-shipping-label'),
    selectedShippingPrice: document.getElementById('selected-shipping-price'),
    zipStatusBox: document.getElementById('zip-status-box'),
    orderConfirmation: document.getElementById('order-confirmation'),
    confirmOrderIdKicker: document.getElementById('confirm-order-id-kicker'),
    name: document.getElementById('c-name'),
    email: document.getElementById('c-email'),
    phone: document.getElementById('c-phone'),
    address1: document.getElementById('c-address1'),
    city: document.getElementById('c-city'),
    state: document.getElementById('c-state'),
    zip: document.getElementById('c-zip'),
    country: document.getElementById('c-country'),
    billingName: document.getElementById('b-name'),
    billingEmail: document.getElementById('b-email'),
    billingPhone: document.getElementById('b-phone'),
    billingAddress1: document.getElementById('b-address1'),
    billingCity: document.getElementById('b-city'),
    billingState: document.getElementById('b-state'),
    billingZip: document.getElementById('b-zip'),
    billingCountry: document.getElementById('b-country'),
    promoInput: document.getElementById('promo'),
    promoApplyBtn: document.getElementById('promo-apply-btn'),
    promoStatus: document.getElementById('promo-status'),
    promoSection: document.getElementById('promo-section'),
    appliedPromoNote: document.getElementById('applied-promo-note'),
    appliedPromoCode: document.getElementById('applied-promo-code'),
  };

  const stepTitles = {
    1: 'Shipping Details.',
    2: 'Shipping Method.',
    3: 'Payment Details.',
  };

  function formatMoney(value) {
    const amount = Number(value) || 0;
    return `$${amount.toFixed(2)}`;
  }

  function formatOrderId(id) {
    const raw = String(id || 'LEBE-2026-000');
    return raw.startsWith('#') ? raw : `#${raw}`;
  }

  function formatTransitLabel(rate) {
    const min = Number(rate.minDeliveryDays);
    const max = Number(rate.maxDeliveryDays);

    if (Number.isFinite(min) && Number.isFinite(max)) {
      if (min === max) {
        return `${min} business day${min === 1 ? '' : 's'} after fulfillment`;
      }
      return `${min}–${max} business days after fulfillment`;
    }

    return 'Fastest available delivery after fulfillment';
  }

  function formatShippingLabel(rate) {
    const rawName = String(rate.name || rate.label || '').trim();
    const normalized = rawName
      .replace(/\s*\(Estimated delivery:[^)]+\)\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (/carbon offset/i.test(normalized)) {
      return 'Standard + Carbon Offset';
    }

    if (/flat rate/i.test(normalized) || /^standard$/i.test(normalized)) {
      return 'Standard';
    }

    return normalized || 'Shipping';
  }

  function getSummaryNote() {
    if (state.mode === 'cart') {
      return 'Shipping and tax are calculated after your address is verified.';
    }

    if (state.step === 1) {
      return 'Shipping and tax are calculated after your address is verified.';
    }

    if (state.step === 2) {
      return 'Shipping rates are calculated live based on your address and items. Fulfillment typically takes around 2–5 business days before shipment. You’ll receive tracking as soon as your order ships.';
    }

    return 'Made-to-order. Ships in ~14 days. You’ll receive tracking once your order ships.';
  }

  function resetCartSummary() {
    const subtotal = Cart.getSubtotal();
    refs.subtotal.textContent = formatMoney(subtotal);
    refs.discountRow.classList.toggle('hidden', !(Number(state.appliedDiscount?.amount) > 0));
    refs.discount.textContent = `-${formatMoney(state.appliedDiscount?.amount || 0)}`;
    refs.shipping.textContent = 'Calculated';
    refs.tax.textContent = 'Calculated';
    refs.total.textContent = formatMoney(Math.max(0, subtotal - (state.appliedDiscount?.amount || 0)));
    refs.summaryCopy.textContent = getSummaryNote();
    renderAppliedPromoNote();
  }

  function applyCalculatedSummary(summary) {
    refs.subtotal.textContent = formatMoney(summary.subtotal);
    refs.discountRow.classList.toggle('hidden', !(Number(summary.discount) > 0));
    refs.discount.textContent = `-${formatMoney(summary.discount || 0)}`;
    refs.shipping.textContent = formatMoney(summary.shipping);
    refs.tax.textContent = formatMoney(summary.tax);
    refs.total.textContent = formatMoney(summary.total);
    refs.summaryCopy.textContent = getSummaryNote();
    renderAppliedPromoNote();
  }

  function setPromoStatus(message = '', isError = false) {
    refs.promoStatus.classList.toggle('hidden', !message);
    refs.promoStatus.textContent = message;
    refs.promoStatus.classList.toggle('text-[#050505]/60', !isError);
    refs.promoStatus.classList.toggle('text-[#8a1f1f]', !!isError);
  }

  async function readJsonResponse(response, fallbackMessage) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();
    const isHtml = /^\s*</.test(text);
    throw new Error(isHtml ? fallbackMessage : (text || fallbackMessage));
  }

  function renderAppliedPromoNote() {
    const showNote = state.mode === 'checkout' && !!state.appliedDiscount?.code;
    refs.appliedPromoNote?.classList.toggle('hidden', !showNote);
    if (refs.appliedPromoCode) {
      refs.appliedPromoCode.textContent = state.appliedDiscount?.code || '';
    }
  }

  function setCheckoutMode(mode) {
    state.mode = mode;

    const isCheckout = mode === 'checkout';
    const isSuccess = mode === 'success';

    refs.cartContent.classList.toggle('cart-mode-cart', mode === 'cart');
    refs.cartContent.classList.toggle('cart-mode-checkout', isCheckout);
    refs.cartContent.classList.toggle('cart-mode-success', isSuccess);
    refs.bagHero.classList.toggle('hidden', isCheckout || isSuccess);
    refs.checkoutHero.classList.toggle('hidden', !isCheckout);
    refs.cartItemsPanel.classList.toggle('hidden', isCheckout || isSuccess);
    refs.upsellModule?.classList.toggle('hidden', isCheckout || isSuccess || Cart.getCart().length === 0);
    refs.checkoutPanel.classList.toggle('hidden', !isCheckout);
    refs.cartContent.classList.toggle('hidden', isSuccess);
    refs.orderConfirmation.classList.toggle('hidden', !isSuccess);
    refs.orderConfirmation.classList.toggle('flex', isSuccess);

    refs.promoSections.forEach((section) => {
      section.classList.toggle('hidden', isCheckout || isSuccess);
    });

    refs.cartOnlyElements.forEach((element) => {
      element.classList.toggle('hidden', isCheckout || isSuccess);
      element.style.display = isCheckout || isSuccess ? 'none' : '';
    });

    refs.summaryCopy.textContent = getSummaryNote();
    renderAppliedPromoNote();
  }

  function setStep(step) {
    state.step = step;
    refs.stepKicker.textContent = `STEP ${step} OF 3`;
    refs.stepTitle.textContent = stepTitles[step];

    refs.shippingStep.classList.toggle('hidden', step !== 1);
    refs.shippingMethodStep.classList.toggle('hidden', step !== 2);
    refs.paymentStep.classList.toggle('hidden', step !== 3);
    refs.summaryCopy.textContent = getSummaryNote();
    renderAppliedPromoNote();
  }

  function setShippingFormDisabled(disabled) {
    [refs.name, refs.email, refs.phone, refs.address1, refs.city, refs.state, refs.zip].forEach((input) => {
      if (input) input.disabled = disabled;
    });
    refs.continueToMethodsBtn.disabled = disabled;
    refs.continueToMethodsBtn.textContent = disabled ? 'Calculating...' : 'Continue to Payment';
  }

  function showStep2State({ loading = false, error = '' } = {}) {
    refs.shippingLoadingBox.classList.toggle('hidden', !loading);
    refs.shippingErrorBox.classList.toggle('hidden', !error);
    refs.shippingErrorBox.textContent = error;
  }

  function clearPaymentElement() {
    [cardNumberElementInstance, cardExpiryElementInstance, cardCvcElementInstance].forEach((elementInstance) => {
      if (elementInstance) {
        elementInstance.unmount();
      }
    });
    cardNumberElementInstance = null;
    cardExpiryElementInstance = null;
    cardCvcElementInstance = null;

    stripeElements = null;
    refs.cardNumberElement.innerHTML = '';
    refs.cardExpiryElement.innerHTML = '';
    refs.cardCvcElement.innerHTML = '';
  }

  function getAddressFromForm() {
    return {
      name: refs.name.value.trim(),
      email: refs.email.value.trim(),
      phone: refs.phone.value.trim(),
      address1: refs.address1.value.trim(),
      city: refs.city.value.trim(),
      state: refs.state.value.trim(),
      zip: refs.zip.value.trim(),
      country: 'US',
    };
  }

  function syncBillingFormFromShipping() {
    refs.billingName.value = refs.name.value.trim();
    refs.billingEmail.value = refs.email.value.trim();
    refs.billingPhone.value = refs.phone.value.trim();
    refs.billingAddress1.value = refs.address1.value.trim();
    refs.billingCity.value = refs.city.value.trim();
    refs.billingState.value = refs.state.value.trim();
    refs.billingZip.value = refs.zip.value.trim();
    refs.billingCountry.value = 'US';
  }

  function getBillingDetails() {
    if (refs.billingSameAsShipping.checked) {
      return {
        name: refs.name.value.trim(),
        email: refs.email.value.trim(),
        phone: refs.phone.value.trim(),
        address: {
          line1: refs.address1.value.trim(),
          city: refs.city.value.trim(),
          state: refs.state.value.trim(),
          postal_code: refs.zip.value.trim(),
          country: 'US',
        }
      };
    }

    return {
      name: refs.billingName.value.trim(),
      email: refs.billingEmail.value.trim(),
      phone: refs.billingPhone.value.trim(),
      address: {
        line1: refs.billingAddress1.value.trim(),
        city: refs.billingCity.value.trim(),
        state: refs.billingState.value.trim(),
        postal_code: refs.billingZip.value.trim(),
        country: 'US',
      }
    };
  }

  function validateBillingDetails() {
    const billing = getBillingDetails();
    if (!billing.name || !billing.email || !billing.phone || !billing.address.line1 || !billing.address.city || !billing.address.state || !billing.address.postal_code || !billing.address.country) {
      return 'Please complete your billing details before placing the order.';
    }
    return '';
  }

  async function verifyZip(zipValue) {
    const cleanZip = (zipValue || '').trim();
    if (!cleanZip) {
      refs.zipStatusBox.textContent = 'Please enter your ZIP code so we can verify your address and load rates.';
      return null;
    }

    try {
      const response = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(cleanZip)}`);
      if (!response.ok) {
        refs.zipStatusBox.textContent = 'We could not verify that ZIP code. Please check it and try again.';
        return null;
      }

      const data = await response.json();
      const place = data?.places?.[0];
      if (!place) {
        refs.zipStatusBox.textContent = 'We could not verify that ZIP code. Please check it and try again.';
        return null;
      }

      refs.city.value = place['place name'];
      refs.state.value = place['state abbreviation'];
      refs.zipStatusBox.textContent = `ZIP verified for ${place['place name']}, ${place['state abbreviation']}. We’ll confirm your available rates next.`;

      return {
        city: place['place name'],
        state: place['state abbreviation'],
        zip: cleanZip,
      };
    } catch (error) {
      // Network error — ZIP service unavailable. Allow proceeding if city/state are already filled.
      const city = refs.city.value.trim();
      const state = refs.state.value.trim();
      if (!city || !state) {
        refs.zipStatusBox.textContent = 'ZIP lookup is unavailable. Please type your city and state manually to continue.';
        return null;
      }
      refs.zipStatusBox.textContent = 'ZIP lookup is unavailable. Continuing with the city and state you entered.';
      return { city, state, zip: cleanZip };
    }
  }

  function resetPreparedCheckout() {
    paymentSetupRequestId += 1;
    if (paymentSetupAbortController) {
      paymentSetupAbortController.abort();
      paymentSetupAbortController = null;
    }
    state.shippingRates = [];
    state.selectedShipping = null;
    state.paymentSetup = null;
    state.checkoutItems = null;
    clearPaymentElement();
    refs.checkoutError.classList.add('hidden');
    refs.checkoutError.textContent = '';
    refs.shippingOptions.innerHTML = '';
    refs.selectedShippingLabel.textContent = 'Select a shipping method to continue.';
    refs.selectedShippingPrice.textContent = formatMoney(0);
    refs.continueToPaymentBtn.disabled = true;
    refs.billingSameAsShipping.checked = true;
    refs.billingForm.classList.add('hidden');
    resetCartSummary();
  }

  function resetCheckoutState() {
    state.verifiedAddress = null;
    resetPreparedCheckout();
    setShippingFormDisabled(false);
    setCheckoutMode('cart');
    setStep(1);
    refs.placeOrderBtn.disabled = false;
    refs.placeOrderBtn.textContent = 'Place Order';
  }

  window.resetCheckoutState = resetCheckoutState;

  async function hydrateMissingVariantIds(items) {
    const cartItems = Array.isArray(items) ? items : [];
    const itemsNeedingRepair = cartItems.filter((item) => item.productId);
    if (itemsNeedingRepair.length === 0) {
      return cartItems;
    }

    const detailCache = new Map();

    const hydratedItems = await Promise.all(cartItems.map(async (item) => {
      if (!item.productId) {
        return item;
      }

      const productId = String(item.productId);
      if (!detailCache.has(productId)) {
        detailCache.set(productId, fetch(`/api/product?id=${encodeURIComponent(productId)}`).then(async (response) => {
          const data = await readJsonResponse(response, 'Product API returned a non-JSON response. Please refresh and try again.');
          if (!response.ok) {
            throw new Error(data.error || 'Unable to refresh product data.');
          }
          return data;
        }));
      }

      try {
        const product = await detailCache.get(productId);
        const variants = Array.isArray(product?.variants) ? product.variants : [];
        const normalizedItemSize = String(item.size || '').trim().toLowerCase();
        const normalizedItemColor = String(item.color || '').trim().toLowerCase();
        const normalizedItemName = String(item.name || '').trim().toLowerCase();

        let matchingVariant = variants.find((variant) => (
          item.syncVariantId && String(variant.syncVariantId) === String(item.syncVariantId)
        ));

        if (!matchingVariant) {
          matchingVariant = variants.find((variant) => (
            item.variantId && Number(variant.id) === Number(item.variantId)
          ));
        }

        if (!matchingVariant) {
          matchingVariant = variants.find((variant) => {
            const sameSize = !normalizedItemSize || String(variant.size || '').trim().toLowerCase() === normalizedItemSize;
            const sameColor = !normalizedItemColor || String(variant.color || '').trim().toLowerCase() === normalizedItemColor;
            return sameSize && sameColor;
          });
        }

        if (!matchingVariant) {
          matchingVariant = variants.find((variant) => {
            const sameSize = !normalizedItemSize || String(variant.size || '').trim().toLowerCase() === normalizedItemSize;
            return sameSize;
          });
        }

        if (!matchingVariant) {
          matchingVariant = variants.find((variant) => {
            const variantName = `${product?.name || ''} ${variant.size || ''} ${variant.color || ''}`.trim().toLowerCase();
            return normalizedItemName && variantName.includes(normalizedItemName);
          });
        }

        if (!matchingVariant && variants.length === 1) {
          matchingVariant = variants[0];
        }

        if (!matchingVariant) {
          return item;
        }

        return {
          ...item,
          variantId: Number(matchingVariant.id) || item.variantId,
          syncVariantId: item.syncVariantId || String(matchingVariant.syncVariantId || ''),
          size: item.size || matchingVariant.size || '',
          color: item.color || matchingVariant.color || '',
          price: Number(matchingVariant.price) || Number(item.price) || 0,
          options: Array.isArray(item.options) && item.options.length > 0 ? item.options : (matchingVariant.options || []),
        };
      } catch (error) {
        console.warn('Unable to hydrate missing variant id for cart item:', item, error);
        return item;
      }
    }));

    if (hydratedItems.some((item, index) => (
      Number(item.variantId) !== Number(cartItems[index].variantId) ||
      Number(item.price) !== Number(cartItems[index].price)
    ))) {
      Cart.replaceCart(hydratedItems);
      window.renderCart?.();
    }

    return hydratedItems;
  }

  async function fetchShippingRates(address) {
    const cart = await hydrateMissingVariantIds(Cart.getCart());
    const response = await fetch('/api/shipping-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart, address }),
    });

    const data = await readJsonResponse(response, 'Shipping API returned a non-JSON response. Please refresh and try again.');
    if (!response.ok) {
      throw new Error(data.error || 'We couldn’t load shipping options right now. Please try again.');
    }

    return Array.isArray(data.rates) ? data.rates : [];
  }

  function renderShippingRates() {
    if (state.shippingRates.length === 0) {
      refs.shippingOptions.innerHTML = '';
      refs.continueToPaymentBtn.disabled = true;
      return;
    }

    refs.shippingOptions.innerHTML = state.shippingRates.map((rate) => {
      const isSelected = state.selectedShipping?.id === rate.id;
      const borderClass = isSelected ? 'border-[#050505] bg-[#f5efe8]' : 'border-[#050505]/12 bg-white';
      const indicator = isSelected
        ? '<span class="mt-1.5 inline-block h-3.5 w-3.5 rounded-full bg-[#050505]"></span>'
        : '<span class="mt-1.5 inline-block h-3.5 w-3.5 rounded-full border border-[#050505]/35 bg-transparent"></span>';

      return `
        <button
          type="button"
          class="shipping-rate-btn flex w-full items-start justify-between gap-5 border px-6 py-6 text-left transition hover:border-[#050505] ${borderClass}"
          data-rate-id="${rate.id}"
        >
          <span class="shipping-rate-copy flex min-w-0 items-start gap-4">
            ${indicator}
            <span class="min-w-0">
              <span class="block font-serif text-[28px] leading-[1.08] tracking-[-0.03em] lg:text-[30px]">${formatShippingLabel(rate)}</span>
              <span class="mt-3 block text-[13px] leading-7 text-[#050505]/60">${formatTransitLabel(rate)}</span>
            </span>
          </span>
          <span class="shipping-rate-price shrink-0 text-[18px] font-semibold">${formatMoney(rate.rate)}</span>
        </button>
      `;
    }).join('');

    refs.shippingOptions.querySelectorAll('.shipping-rate-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const rate = state.shippingRates.find((item) => item.id === button.dataset.rateId);
        if (!rate) return;
        state.selectedShipping = {
          id: rate.id,
          label: formatShippingLabel(rate),
          rate: rate.rate,
          minDeliveryDays: rate.minDeliveryDays,
          maxDeliveryDays: rate.maxDeliveryDays,
        };
        renderShippingRates();
        await preparePaymentSetup();
      });
    });
  }

  async function preparePaymentSetup() {
    if (!state.verifiedAddress || !state.selectedShipping) {
      return;
    }

    const cart = await hydrateMissingVariantIds(Cart.getCart());
    const requestId = paymentSetupRequestId + 1;
    const previousPaymentIntentId = state.paymentSetup?.paymentIntentId || null;
    paymentSetupRequestId = requestId;
    if (paymentSetupAbortController) {
      paymentSetupAbortController.abort();
    }
    paymentSetupAbortController = new AbortController();
    state.checkoutItems = cart.map((item) => ({ ...item }));

    refs.continueToPaymentBtn.disabled = true;
    refs.continueToPaymentBtn.textContent = 'Calculating...';
    showStep2State({ loading: true, error: '' });
    refs.checkoutError.classList.add('hidden');
    refs.checkoutError.textContent = '';
    clearPaymentElement();
    state.paymentSetup = null;

    try {
      const response = await fetch('/api/stripe-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          address: state.verifiedAddress,
          shippingMethod: state.selectedShipping,
          previousPaymentIntentId,
          promoCode: state.promoCode || null,
        }),
        signal: paymentSetupAbortController.signal,
      });

      const data = await readJsonResponse(response, 'Payment setup API returned a non-JSON response. Please refresh and try again.');
      if (!response.ok) {
        const error = new Error(data.error || 'We couldn’t calculate this shipping method right now.');
        error.isLocalDevPaymentSetup = !!data.localDev;
        throw error;
      }
      if (requestId !== paymentSetupRequestId) {
        return;
      }

      state.paymentSetup = data;
      state.appliedDiscount = data.appliedDiscount
        ? { ...data.appliedDiscount, amount: Number(data.discount || 0) }
        : null;
      applyCalculatedSummary(data);
      refs.selectedShippingPrice.textContent = formatMoney(data.shipping);
      refs.selectedShippingLabel.textContent = `${formatShippingLabel(state.selectedShipping)} · ${formatTransitLabel(state.selectedShipping)}`;
      refs.continueToPaymentBtn.disabled = false;
      if (state.appliedDiscount) {
        setPromoStatus(`${state.appliedDiscount.code} applied.`, false);
      } else if (state.promoCode) {
        setPromoStatus('No discount was applied.', true);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      if (requestId !== paymentSetupRequestId) {
        return;
      }
      showStep2State({ loading: false, error: error.message });
      refs.continueToPaymentBtn.disabled = true;
      refs.continueToPaymentBtn.textContent = error.isLocalDevPaymentSetup ? 'Use Vercel Preview' : 'Continue to Payment';
      resetCartSummary();
      return;
    }

    if (requestId !== paymentSetupRequestId) {
      return;
    }
    showStep2State({ loading: false, error: '' });
    refs.continueToPaymentBtn.textContent = 'Continue to Payment';
  }

  async function mountPaymentElement() {
    if (!state.paymentSetup?.clientSecret) {
      refs.checkoutError.textContent = 'Payment form not ready. Please review your shipping details and try again.';
      refs.checkoutError.classList.remove('hidden');
      return;
    }

    refs.paymentLoading.classList.remove('hidden');
    refs.checkoutError.classList.add('hidden');

    try {
      if (!stripeInstance) {
        const configResponse = await fetch('/api/stripe-config');
        const configData = await readJsonResponse(configResponse, 'Stripe config API returned a non-JSON response. Please refresh and try again.');
        if (!configResponse.ok) {
          throw new Error(configData.error || 'Stripe config is unavailable.');
        }
        stripeInstance = Stripe(configData.publishableKey);
      }

      clearPaymentElement();

      stripeElements = stripeInstance.elements({
        clientSecret: state.paymentSetup.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#050505',
            colorBackground: '#ffffff',
            colorText: '#050505',
            colorDanger: '#dc2626',
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontSizeBase: '14px',
            colorIcon: '#050505',
            borderRadius: '0px',
            spacingUnit: '4px'
          },
          rules: {
            '.Input': { border: 'none', boxShadow: 'none', padding: '0px' },
            '.Input:focus': { boxShadow: 'none', outline: 'none' },
            '.Label': { fontWeight: '700', fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(5,5,5,0.5)', marginBottom: '8px' },
            '.Block': { boxShadow: 'none', backgroundColor: '#ffffff' }
          }
        }
      });

      const baseCardStyle = {
        style: {
          base: {
            color: '#050505',
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontSize: '14px',
            '::placeholder': {
              color: 'rgba(5, 5, 5, 0.34)'
            },
            iconColor: '#050505'
          },
          invalid: {
            color: '#dc2626',
            iconColor: '#dc2626'
          }
        }
      };

      cardNumberElementInstance = stripeElements.create('cardNumber', {
        ...baseCardStyle,
        placeholder: '1234 1234 1234 1234',
      });
      cardExpiryElementInstance = stripeElements.create('cardExpiry', {
        ...baseCardStyle,
        placeholder: 'MM / YY',
      });
      cardCvcElementInstance = stripeElements.create('cardCvc', {
        ...baseCardStyle,
        placeholder: 'CVC',
      });

      const handleCardChange = (event) => {
        if (event.error) {
          refs.checkoutError.textContent = event.error.message;
          refs.checkoutError.classList.remove('hidden');
        } else if (!refs.checkoutError.dataset.persisted) {
          refs.checkoutError.textContent = '';
          refs.checkoutError.classList.add('hidden');
        }
      };

      cardNumberElementInstance.on('change', handleCardChange);
      cardExpiryElementInstance.on('change', handleCardChange);
      cardCvcElementInstance.on('change', handleCardChange);

      cardNumberElementInstance.mount('#card-number-element');
      cardExpiryElementInstance.mount('#card-expiry-element');
      cardCvcElementInstance.mount('#card-cvc-element');
    } catch (error) {
      refs.checkoutError.textContent = error.message;
      refs.checkoutError.classList.remove('hidden');
    } finally {
      refs.paymentLoading.classList.add('hidden');
    }
  }

  async function openShippingMethods() {
    const address = getAddressFromForm();
    if (!address.name || !address.email || !address.phone || !address.address1 || !address.zip) {
      refs.zipStatusBox.textContent = 'Please fill out your name, email, phone, address, and ZIP code before continuing.';
      return;
    }

    setShippingFormDisabled(true);
    resetPreparedCheckout();

    const verified = await verifyZip(address.zip);
    if (!verified) {
      setShippingFormDisabled(false);
      return;
    }

    state.verifiedAddress = {
      ...address,
      city: verified.city,
      state: verified.state,
      zip: verified.zip,
    };

    setStep(2);
    showStep2State({ loading: true, error: '' });

    try {
      const rates = await fetchShippingRates(state.verifiedAddress);
      if (rates.length === 0) {
        throw new Error('We couldn’t load shipping options right now. Please try again.');
      }

      state.shippingRates = rates;
      state.selectedShipping = {
        id: rates[0].id,
        label: formatShippingLabel(rates[0]),
        rate: rates[0].rate,
        minDeliveryDays: rates[0].minDeliveryDays,
        maxDeliveryDays: rates[0].maxDeliveryDays,
      };

      renderShippingRates();
      await preparePaymentSetup();
    } catch (error) {
      showStep2State({ loading: false, error: error.message });
    } finally {
      setShippingFormDisabled(false);
    }
  }

  refs.checkoutToggle?.addEventListener('click', () => {
    setCheckoutMode('checkout');
    setStep(1);
    resetCartSummary();

    // GA4 Enhanced E-commerce: begin_checkout
    if (typeof gtag === 'function') {
      const cartItems = Cart.getCart();
      gtag('event', 'begin_checkout', {
        currency: 'USD',
        value: Cart.getSubtotal(),
        items: cartItems.map(item => ({
          item_id: String(item.productId),
          item_name: item.name,
          price: item.price,
          item_variant: item.size,
          item_category: item.color,
          quantity: item.quantity
        }))
      });
    }
  });

  refs.continueToMethodsBtn?.addEventListener('click', async (event) => {
    event.preventDefault();
    await openShippingMethods();
  });

  refs.continueToPaymentBtn?.addEventListener('click', async (event) => {
    event.preventDefault();
    if (!state.paymentSetup) return;
    setStep(3);
    await mountPaymentElement();
  });

  refs.editAddressBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    state.verifiedAddress = null;
    resetPreparedCheckout();
    setStep(1);
  });

  refs.editShippingBtn?.addEventListener('click', async (event) => {
    event.preventDefault();
    clearPaymentElement();
    refs.checkoutError.classList.add('hidden');
    refs.checkoutError.textContent = '';
    setStep(2);
    renderShippingRates();
    if (state.selectedShipping) {
      await preparePaymentSetup();
    }
  });

  refs.zip?.addEventListener('blur', async () => {
    if (!refs.zip.value.trim()) return;
    await verifyZip(refs.zip.value.trim());
  });

  refs.zip?.addEventListener('input', () => {
    refs.city.value = '';
    refs.state.value = '';
    refs.zipStatusBox.textContent = 'ZIP verification runs quietly after entry. We’ll confirm rates once your address is ready.';
    state.verifiedAddress = null;
    resetPreparedCheckout();
    if (state.mode === 'checkout' && state.step > 1) {
      setStep(1);
    }
  });

  refs.billingSameAsShipping?.addEventListener('change', () => {
    const sameAsShipping = refs.billingSameAsShipping.checked;
    refs.billingForm.classList.toggle('hidden', sameAsShipping);
    if (sameAsShipping) {
      syncBillingFormFromShipping();
    }
  });

  refs.promoApplyBtn?.addEventListener('click', async () => {
    const code = String(refs.promoInput.value || '').trim().toUpperCase();
    refs.promoInput.value = code;

    if (!code) {
      state.promoCode = '';
      state.appliedDiscount = null;
      setPromoStatus('Please enter a discount code.', true);
      resetCartSummary();
      if (state.selectedShipping && state.verifiedAddress) {
        await preparePaymentSetup();
      }
      return;
    }

    refs.promoApplyBtn.disabled = true;
    refs.promoApplyBtn.textContent = '...';
    setPromoStatus('Checking code...', false);

    try {
      const response = await fetch('/api/promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: Cart.getSubtotal() }),
      });
      const data = await readJsonResponse(response, 'Promo code API returned a non-JSON response. Please refresh and try again.');
      if (!response.ok) {
        throw new Error(data.error || 'We couldn’t validate that discount code.');
      }

      state.promoCode = code;
      const subtotal = Cart.getSubtotal();
      const discountAmount = Math.min(subtotal, Math.max(0, Number(data.discountAmount) || 0));
      state.appliedDiscount = { ...data.discount, amount: discountAmount };
      setPromoStatus(`${code} applied.`, false);

      if (state.selectedShipping && state.verifiedAddress) {
        await preparePaymentSetup();
      } else {
        resetCartSummary();
      }
    } catch (error) {
      state.promoCode = '';
      state.appliedDiscount = null;
      setPromoStatus(error.message, true);
      resetCartSummary();
    } finally {
      refs.promoApplyBtn.disabled = false;
      refs.promoApplyBtn.textContent = 'apply.';
    }
  });

  refs.promoInput?.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await refs.promoApplyBtn?.click();
    }
  });

  refs.paymentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!stripeInstance || !stripeElements || !cardNumberElementInstance || !state.selectedShipping || !state.verifiedAddress) {
      refs.checkoutError.textContent = 'Payment form not ready. Please review your shipping details and try again.';
      refs.checkoutError.classList.remove('hidden');
      return;
    }

    refs.checkoutError.classList.add('hidden');
    refs.placeOrderBtn.disabled = true;
    refs.placeOrderBtn.textContent = 'Processing...';

    try {
      const billingValidationError = validateBillingDetails();
      if (billingValidationError) {
        throw new Error(billingValidationError);
      }

      const { paymentIntent, error: stripeError } = await stripeInstance.confirmCardPayment(
        state.paymentSetup.clientSecret,
        {
          payment_method: {
            card: cardNumberElementInstance,
            billing_details: getBillingDetails(),
          },
        },
      );

      if (stripeError) throw new Error(stripeError.message);
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment was not completed. Please try again.');
      }

      const customer = {
        ...state.verifiedAddress,
      };

      const cart = Array.isArray(state.checkoutItems) && state.checkoutItems.length > 0
        ? state.checkoutItems.map((item) => ({ ...item }))
        : await hydrateMissingVariantIds(Cart.getCart());

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customer,
          paymentIntentId: paymentIntent.id,
          shippingMethod: state.selectedShipping,
          orderHash: state.paymentSetup?.orderHash || '',
        })
      });

      const data = await readJsonResponse(response, 'Checkout API returned a non-JSON response. Please refresh and try again.');
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Order failed');
      }

      // GA4 Enhanced E-commerce: purchase
      if (typeof gtag === 'function') {
        gtag('event', 'purchase', {
          transaction_id: String(data.orderId || paymentIntent.id),
          value: state.paymentSetup ? state.paymentSetup.total : Cart.getSubtotal(),
          currency: 'USD',
          shipping: state.paymentSetup ? state.paymentSetup.shipping : 0,
          tax: state.paymentSetup ? state.paymentSetup.tax : 0,
          items: cart.map(item => ({
            item_id: String(item.productId),
            item_name: item.name,
            price: item.price,
            item_variant: item.size,
            item_category: item.color,
            quantity: item.quantity
          }))
        });
      }

      Cart.clearCart();
      refs.confirmOrderIdKicker.textContent = formatOrderId(data.orderId);

      if (data.estimatedDelivery) {
        try {
          const deliveryDate = new Date(data.estimatedDelivery);
          if (!isNaN(deliveryDate.getTime())) {
            const formatted = deliveryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const deliveryEl = document.getElementById('estimated-delivery');
            if (deliveryEl) {
              const span = deliveryEl.querySelector('span');
              if (span) {
                span.textContent = formatted;
              }
            }
          }
        } catch (e) {
          console.warn('Error formatting delivery date:', e);
        }
      }

      setCheckoutMode('success');
    } catch (error) {
      refs.checkoutError.textContent = error.message;
      refs.checkoutError.classList.remove('hidden');
      refs.placeOrderBtn.disabled = false;
      refs.placeOrderBtn.textContent = 'Place Order';
    }
  });

  hydrateMissingVariantIds(Cart.getCart()).then(() => {
    resetCartSummary();
  });
});
