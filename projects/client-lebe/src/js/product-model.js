(function () {
  const PRODUCT_COLOR_BY_EXTERNAL_ID = {
    '6477600e15cb73': 'Black',
    '64775fcaef5f21': 'White',
    '64000b204a6de9': 'White',
    '63ec714091ff89': 'Black',
  };

  const COLOR_GROUPS_BY_EXTERNAL_ID = [
    {
      White: '64775fcaef5f21',
      Black: '6477600e15cb73',
    },
    {
      White: '64000b204a6de9',
      Black: '63ec714091ff89',
    },
  ];

  const DESIGN_SLOTS = [
    {
      externalId: '64000b204a6de9',
      type: 'leggings',
      color: 'white',
      displayName: 'SAGUANARI LEGGINGS',
      images: [
        'assets/images/product-shots/saguanari_leggings/9.0-900.jpg',
        'assets/images/product-shots/saguanari_leggings/saguanari_leggin_wht_1-900.jpg',
      ],
      swatch: 'white',
    },
    {
      externalId: '64775fcaef5f21',
      type: 'bra',
      color: 'white',
      displayName: 'SAGUANARI BRA',
      images: [
        'assets/images/product-shots/saguanari_bra/11-900.jpg',
        'assets/images/product-shots/saguanari_bra/saguanari_bra_wht_1-900.jpg',
      ],
      swatch: 'white',
    },
    {
      externalId: '63ec714091ff89',
      type: 'leggings',
      color: 'black',
      displayName: 'SAGUANARI LEGGINGS',
      images: [
        'assets/images/product-shots/saguanari_leggings/15-900.jpg',
        'assets/images/product-shots/saguanari_leggings/saguanari_leggin_blk_1-900.jpg',
      ],
      swatch: 'black',
    },
    {
      externalId: '6477600e15cb73',
      type: 'bra',
      color: 'black',
      displayName: 'SAGUANARI BRA',
      images: [
        'assets/images/product-shots/saguanari_bra/17-900.jpg',
        'assets/images/product-shots/saguanari_bra/17.1-900.jpg',
      ],
      swatch: 'black',
    },
  ];

  const UPSELL_BY_PRODUCT_ID = {
    309483674: { productId: 301596573, name: 'Saguanari Leggings', description: 'Pair it with the matching leggings for the full Saguanari set.' },
    309483736: { productId: 300307426, name: 'Saguanari Leggings', description: 'Pair it with the matching leggings for the full Saguanari set.' },
    301596573: { productId: 309483674, name: 'Saguanari Sports Bra', description: 'Pair it with the matching bra for the full Saguanari set.' },
    300307426: { productId: 309483736, name: 'Saguanari Sports Bra', description: 'Pair it with the matching bra for the full Saguanari set.' },
  };

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
