(function () {
  const PUBLISHED_PRODUCTS = [
    {
      id: 301596573,
      externalId: '64000b204a6de9',
      name: 'Saguanari Leggings White',
      displayName: 'Saguanari Leggings',
      type: 'leggings',
      color: 'White',
      swatch: 'white',
      colorGroup: 'saguanari-leggings',
      published: true,
      homepageOrder: 1,
      sizeGuideType: 'leggings',
      careCopy: 'Cold wash only. Hang dry. Gold may soften with wear.',
      images: [
        'assets/images/product-shots/saguanari_leggings/9.0-900.jpg',
        'assets/images/product-shots/saguanari_leggings/9.1-900.jpg',
        'assets/images/product-shots/saguanari_leggings/9.2-900.jpg',
        'assets/images/product-shots/saguanari_leggings/9.3-900.jpg',
      ],
      homepageImages: [
        'assets/images/product-shots/saguanari_leggings/9.0-900.jpg',
        'assets/images/product-shots/saguanari_leggings/saguanari_leggin_wht_1-900.jpg',
      ],
      upsellProductId: 309483674,
      feed: {
        titleBase: 'Saguanari Leggings',
        category: 'Clothing & Accessories > Clothing > Activewear > Leggings',
        productType: 'Apparel & Accessories > Clothing > Activewear > Leggings',
        description: 'Made-to-order LEBE leggings with premium all-over print artwork.',
      },
    },
    {
      id: 309483674,
      externalId: '64775fcaef5f21',
      name: 'Saguanari Sports Bra White',
      displayName: 'Saguanari Sports Bra',
      type: 'bra',
      color: 'White',
      swatch: 'white',
      colorGroup: 'saguanari-bra',
      published: true,
      homepageOrder: 2,
      sizeGuideType: 'bra',
      careCopy: 'Cold wash only. Hang dry. Gold may soften with wear.',
      images: [
        'assets/images/product-shots/saguanari_bra/11-900.jpg',
        'assets/images/product-shots/saguanari_bra/11.1-900.jpg',
        'assets/images/product-shots/saguanari_bra/11.2-900.jpg',
        'assets/images/product-shots/saguanari_bra/11.3-900.jpg',
      ],
      homepageImages: [
        'assets/images/product-shots/saguanari_bra/11-900.jpg',
        'assets/images/product-shots/saguanari_bra/saguanari_bra_wht_1-900.jpg',
      ],
      upsellProductId: 301596573,
      feed: {
        titleBase: 'Saguanari Sports Bra',
        category: 'Clothing & Accessories > Clothing > Activewear > Sports Bras',
        productType: 'Apparel & Accessories > Clothing > Activewear > Sports Bras',
        description: 'Made-to-order LEBE sports bra with premium all-over print artwork.',
      },
    },
    {
      id: 300307426,
      externalId: '63ec714091ff89',
      name: 'Saguanari Leggings Black',
      displayName: 'Saguanari Leggings',
      type: 'leggings',
      color: 'Black',
      swatch: 'black',
      colorGroup: 'saguanari-leggings',
      published: true,
      homepageOrder: 3,
      sizeGuideType: 'leggings',
      careCopy: 'Cold wash only. Hang dry. Heat will fade the black.',
      images: [
        'assets/images/product-shots/saguanari_leggings/15-900.jpg',
        'assets/images/product-shots/saguanari_leggings/15.1-900.jpg',
        'assets/images/product-shots/saguanari_leggings/15.2-900.jpg',
        'assets/images/product-shots/saguanari_leggings/15.3-900.jpg',
      ],
      homepageImages: [
        'assets/images/product-shots/saguanari_leggings/15-900.jpg',
        'assets/images/product-shots/saguanari_leggings/saguanari_leggin_blk_1-900.jpg',
      ],
      upsellProductId: 309483736,
      feed: {
        titleBase: 'Saguanari Leggings',
        category: 'Clothing & Accessories > Clothing > Activewear > Leggings',
        productType: 'Apparel & Accessories > Clothing > Activewear > Leggings',
        description: 'Made-to-order LEBE leggings with premium all-over print artwork.',
      },
    },
    {
      id: 309483736,
      externalId: '6477600e15cb73',
      name: 'Saguanari Sports Bra Black',
      displayName: 'Saguanari Sports Bra',
      type: 'bra',
      color: 'Black',
      swatch: 'black',
      colorGroup: 'saguanari-bra',
      published: true,
      homepageOrder: 4,
      sizeGuideType: 'bra',
      careCopy: 'Cold wash only. Hang dry. Heat will fade the black.',
      images: [
        'assets/images/product-shots/saguanari_bra/17-900.jpg',
        'assets/images/product-shots/saguanari_bra/17.1-900.jpg',
        'assets/images/product-shots/saguanari_bra/17.2-900.jpg',
        'assets/images/product-shots/saguanari_bra/17.3-900.jpg',
      ],
      homepageImages: [
        'assets/images/product-shots/saguanari_bra/17-900.jpg',
        'assets/images/product-shots/saguanari_bra/17.1-900.jpg',
      ],
      upsellProductId: 300307426,
      feed: {
        titleBase: 'Saguanari Sports Bra',
        category: 'Clothing & Accessories > Clothing > Activewear > Sports Bras',
        productType: 'Apparel & Accessories > Clothing > Activewear > Sports Bras',
        description: 'Made-to-order LEBE sports bra with premium all-over print artwork.',
      },
    },
  ];

  const publishedProductList = PUBLISHED_PRODUCTS.filter((product) => product.published);

  const publishedProducts = publishedProductList
    .reduce((acc, product) => {
      acc[String(product.id)] = product;
      return acc;
    }, {});

  const imagesByExternalId = publishedProductList
    .reduce((acc, product) => {
      acc[product.externalId] = [...product.images];
      return acc;
    }, {});

  const previews = publishedProductList
    .reduce((acc, product) => {
      acc[String(product.id)] = {
        id: product.id,
        name: product.name,
        images: [...product.images],
      };
      return acc;
    }, {});

  const productColorByExternalId = publishedProductList
    .reduce((acc, product) => {
      acc[product.externalId] = product.color;
      return acc;
    }, {});

  const groupedProducts = publishedProductList
    .reduce((acc, product) => {
      if (!product.colorGroup) return acc;
      acc[product.colorGroup] = acc[product.colorGroup] || [];
      acc[product.colorGroup].push(product);
      return acc;
    }, {});

  const colorVariants = Object.values(groupedProducts)
    .reduce((acc, group) => {
      const colors = group
        .map((product) => ({
          name: product.color,
          productId: product.id,
        }));
      const displayName = group[0]?.displayName || group[0]?.name || '';

      group.forEach((product) => {
        acc[String(product.id)] = {
          displayName,
          colors,
        };
      });

      return acc;
    }, {});

  const colorGroupsByExternalId = Object.values(groupedProducts)
    .map((group) => group.reduce((acc, product) => {
      acc[product.color] = product.externalId;
      return acc;
    }, {}));

  const designSlots = publishedProductList
    .filter((product) => Number.isFinite(product.homepageOrder))
    .sort((a, b) => a.homepageOrder - b.homepageOrder)
    .map((product) => ({
      productId: product.id,
      externalId: product.externalId,
      type: product.type,
      color: product.swatch,
      displayName: product.displayName.toUpperCase(),
      images: [...(product.homepageImages || product.images)],
      swatch: product.swatch,
    }));

  const upsellByProductId = publishedProductList
    .reduce((acc, product) => {
      const upsell = publishedProducts[String(product.upsellProductId)];
      if (!upsell) return acc;

      acc[String(product.id)] = {
        productId: upsell.id,
        name: upsell.displayName,
        description: `Pair it with the matching ${upsell.type === 'bra' ? 'bra' : 'leggings'} for the full Saguanari set.`,
      };
      return acc;
    }, {});

  const LebeProductData = {
    publishedProductIds: publishedProductList.map((product) => product.id),
    publishedProducts,
    imagesByExternalId,
    previews,
    colorVariants,
    designSlots,
    upsellByProductId,
    productColorByExternalId,
    colorGroupsByExternalId,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LebeProductData;
  } else {
    window.LebeProductData = LebeProductData;
  }
})();
