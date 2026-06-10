(function () {
  const LebeProductData = {
    // Mapping of Printful external_id (string) to custom images
    // Used by backend to inject custom high-res images on API responses.
    imagesByExternalId: {
      "6a03a9f14842e6": [
        "assets/images/product-shots/ainbo_bra_terracota_1-900.jpg",
        "assets/images/product-shots/ainbo_bra_terracota_2-900.jpg"
      ],
      "6a03a9b1d61425": [
        "assets/images/product-shots/ainbo_leggin_terracota_1-900.jpg",
        "assets/images/product-shots/ainbo_leggin_terracota_2-900.jpg"
      ],
      "6477600e15cb73": [
        "assets/images/product-shots/saguanari_bra/17-900.jpg",
        "assets/images/product-shots/saguanari_bra/17.1-900.jpg",
        "assets/images/product-shots/saguanari_bra/17.2-900.jpg",
        "assets/images/product-shots/saguanari_bra/17.3-900.jpg"
      ],
      "64775fcaef5f21": [
        "assets/images/product-shots/saguanari_bra/11-900.jpg",
        "assets/images/product-shots/saguanari_bra/11.1-900.jpg",
        "assets/images/product-shots/saguanari_bra/11.2-900.jpg",
        "assets/images/product-shots/saguanari_bra/11.3-900.jpg"
      ],
      "64000b204a6de9": [
        "assets/images/product-shots/saguanari_leggings/9.0-900.jpg",
        "assets/images/product-shots/saguanari_leggings/9.1-900.jpg",
        "assets/images/product-shots/saguanari_leggings/9.2-900.jpg",
        "assets/images/product-shots/saguanari_leggings/9.3-900.jpg"
      ],
      "63ec714091ff89": [
        "assets/images/product-shots/saguanari_leggings/15-900.jpg",
        "assets/images/product-shots/saguanari_leggings/15.1-900.jpg",
        "assets/images/product-shots/saguanari_leggings/15.2-900.jpg",
        "assets/images/product-shots/saguanari_leggings/15.3-900.jpg"
      ]
    },

    // Static product previews mapped by Printful numeric product ID
    // Used for initial image preloading and fallback rendering in the frontend.
    previews: {
      309483674: {
        id: 309483674,
        name: 'Saguanari Sports Bra White',
        images: [
          'assets/images/product-shots/saguanari_bra/11-900.jpg',
          'assets/images/product-shots/saguanari_bra/11.1-900.jpg',
          'assets/images/product-shots/saguanari_bra/11.2-900.jpg',
          'assets/images/product-shots/saguanari_bra/11.3-900.jpg'
        ]
      },
      309483736: {
        id: 309483736,
        name: 'Saguanari Sports Bra Black',
        images: [
          'assets/images/product-shots/saguanari_bra/17-900.jpg',
          'assets/images/product-shots/saguanari_bra/17.1-900.jpg',
          'assets/images/product-shots/saguanari_bra/17.2-900.jpg',
          'assets/images/product-shots/saguanari_bra/17.3-900.jpg'
        ]
      },
      301596573: {
        id: 301596573,
        name: 'Saguanari Leggings White',
        images: [
          'assets/images/product-shots/saguanari_leggings/9.0-900.jpg',
          'assets/images/product-shots/saguanari_leggings/9.1-900.jpg',
          'assets/images/product-shots/saguanari_leggings/9.2-900.jpg',
          'assets/images/product-shots/saguanari_leggings/9.3-900.jpg'
        ]
      },
      300307426: {
        id: 300307426,
        name: 'Saguanari Leggings Black',
        images: [
          'assets/images/product-shots/saguanari_leggings/15-900.jpg',
          'assets/images/product-shots/saguanari_leggings/15.1-900.jpg',
          'assets/images/product-shots/saguanari_leggings/15.2-900.jpg',
          'assets/images/product-shots/saguanari_leggings/15.3-900.jpg'
        ]
      }
    },

    // Mapping of product ID (string) to variant configuration
    // Used by backend for API payload generation and by model.
    colorVariants: {
      "309483674": {
        "displayName": "Sanguanari Sports Bra",
        "colors": [
          { "name": "White", "productId": 309483674 },
          { "name": "Black", "productId": 309483736 }
        ]
      },
      "309483736": {
        "displayName": "Sanguanari Sports Bra",
        "colors": [
          { "name": "White", "productId": 309483674 },
          { "name": "Black", "productId": 309483736 }
        ]
      },
      "301596573": {
        "displayName": "Saguanari Yoga Leggings",
        "colors": [
          { "name": "White", "productId": 301596573 },
          { "name": "Black", "productId": 300307426 }
        ]
      },
      "300307426": {
        "displayName": "Saguanari Yoga Leggings",
        "colors": [
          { "name": "White", "productId": 301596573 },
          { "name": "Black", "productId": 300307426 }
        ]
      }
    },

    // Curated homepage slots. Mapped to Printful external IDs.
    designSlots: [
      {
        externalId: '64000b204a6de9',
        type: 'leggings',
        color: 'white',
        displayName: 'SAGUANARI LEGGINGS',
        images: [
          'assets/images/product-shots/saguanari_leggings/9.0-900.jpg',
          'assets/images/product-shots/saguanari_leggings/saguanari_leggin_wht_1-900.jpg'
        ],
        swatch: 'white'
      },
      {
        externalId: '64775fcaef5f21',
        type: 'bra',
        color: 'white',
        displayName: 'SAGUANARI BRA',
        images: [
          'assets/images/product-shots/saguanari_bra/11-900.jpg',
          'assets/images/product-shots/saguanari_bra/saguanari_bra_wht_1-900.jpg'
        ],
        swatch: 'white'
      },
      {
        externalId: '63ec714091ff89',
        type: 'leggings',
        color: 'black',
        displayName: 'SAGUANARI LEGGINGS',
        images: [
          'assets/images/product-shots/saguanari_leggings/15-900.jpg',
          'assets/images/product-shots/saguanari_leggings/saguanari_leggin_blk_1-900.jpg'
        ],
        swatch: 'black'
      },
      {
        externalId: '6477600e15cb73',
        type: 'bra',
        color: 'black',
        displayName: 'SAGUANARI BRA',
        images: [
          'assets/images/product-shots/saguanari_bra/17-900.jpg',
          'assets/images/product-shots/saguanari_bra/17.1-900.jpg'
        ],
        swatch: 'black'
      }
    ],

    // Upsell configurations mapped by dynamic product ID
    upsellByProductId: {
      309483674: { productId: 301596573, name: 'Saguanari Leggings', description: 'Pair it with the matching leggings for the full Saguanari set.' },
      309483736: { productId: 300307426, name: 'Saguanari Leggings', description: 'Pair it with the matching leggings for the full Saguanari set.' },
      301596573: { productId: 309483674, name: 'Saguanari Sports Bra', description: 'Pair it with the matching bra for the full Saguanari set.' },
      300307426: { productId: 309483736, name: 'Saguanari Sports Bra', description: 'Pair it with the matching bra for the full Saguanari set.' }
    },

    // Individual external ID to color mapping
    productColorByExternalId: {
      '6477600e15cb73': 'Black',
      '64775fcaef5f21': 'White',
      '64000b204a6de9': 'White',
      '63ec714091ff89': 'Black'
    },

    // Grouping of external IDs representing color options of the same core item
    colorGroupsByExternalId: [
      {
        White: '64775fcaef5f21',
        Black: '6477600e15cb73'
      },
      {
        White: '64000b204a6de9',
        Black: '63ec714091ff89'
      }
    ]
  };

  // Dual-compatibility export pattern
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LebeProductData;
  } else {
    window.LebeProductData = LebeProductData;
  }
})();
