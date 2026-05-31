import productsData from '../src/data/products.json' assert { type: 'json' };

const PRINTFUL_API_BASE = 'https://api.printful.com';

// Helper to make authenticated requests to Printful API
async function fetchFromPrintful(endpoint, apiKey) {
  const response = await fetch(`${PRINTFUL_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.statusText}`);
  }

  return response.json();
}

// Build image map for quick lookup by externalId
const imageMap = {};
productsData.products.forEach(p => {
  imageMap[p.externalId] = p.images;
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  if (!PRINTFUL_API_KEY) {
    return res.status(500).json({ error: 'PRINTFUL_API_KEY environment variable is not set' });
  }

  try {
    // Fetch products from your store
    const data = await fetchFromPrintful('/store/products', PRINTFUL_API_KEY);
    const printfulProducts = data.result || [];

    // Merge with custom images
    const products = printfulProducts.map(product => {
      const customImages = imageMap[product.external_id];

      return {
        id: product.id,
        externalId: product.external_id,
        name: product.name,
        price: null,
        images: customImages || [product.thumbnail_url].filter(Boolean),
        variantCount: product.variants
      };
    });

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    });
  }
}
