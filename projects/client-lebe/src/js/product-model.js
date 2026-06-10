(function () {
  const data = window.LebeProductData || {};
  const PRODUCT_COLOR_BY_EXTERNAL_ID = data.productColorByExternalId || {};
  const COLOR_GROUPS_BY_EXTERNAL_ID = data.colorGroupsByExternalId || [];
  const DESIGN_SLOTS = data.designSlots || [];
  const UPSELL_BY_PRODUCT_ID = data.upsellByProductId || {};

  function buildColorVariantMap(product) {
    if (!Array.isArray(product?.colorVariants) || product.colorVariants.length === 0) {
      return null;
    }

    const entries = product.colorVariants.reduce((acc, entry) => {
      if (!entry?.name || !entry?.productId) return acc;
      acc[String(entry.name).trim()] = Number(entry.productId);
      return acc;
    }, {});

    return Object.keys(entries).length > 0 ? entries : null;
  }

  function findColorVariants(productId, products) {
    const allProducts = Array.isArray(products) ? products : [];
    const currentProduct = allProducts.find((product) => String(product.id) === String(productId));
    if (!currentProduct) return null;

    const explicitVariants = buildColorVariantMap(currentProduct);
    if (explicitVariants) return explicitVariants;

    const externalGroup = COLOR_GROUPS_BY_EXTERNAL_ID.find((group) =>
      Object.values(group).some((externalId) => String(externalId) === String(currentProduct.externalId))
    );
    if (!externalGroup) return null;

    const resolvedGroup = Object.entries(externalGroup).reduce((acc, [color, externalId]) => {
      const match = allProducts.find((product) => String(product.externalId) === String(externalId));
      if (match) acc[color] = Number(match.id);
      return acc;
    }, {});

    return Object.keys(resolvedGroup).length > 0 ? resolvedGroup : null;
  }

  function getProductColor(productOrExternalId) {
    const externalId = typeof productOrExternalId === 'object'
      ? productOrExternalId?.externalId
      : productOrExternalId;
    return PRODUCT_COLOR_BY_EXTERNAL_ID[String(externalId || '')] || null;
  }

  function getUpsell(productId) {
    return UPSELL_BY_PRODUCT_ID[String(productId)] || null;
  }

  function getDesignSlots() {
    return DESIGN_SLOTS.map((slot) => ({
      ...slot,
      images: [...slot.images],
    }));
  }

  window.LebeProductModel = {
    buildColorVariantMap,
    findColorVariants,
    getDesignSlots,
    getProductColor,
    getUpsell,
  };
})();
