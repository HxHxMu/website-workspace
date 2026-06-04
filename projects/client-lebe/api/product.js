const fs = require('fs');
const path = require('path');

const productsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/products.json'), 'utf8'));
const PRINTFUL_API_BASE = 'https://api.printful.com';

function normalizeLocalAssetPath(value) {
  if (!value) return value;
  const raw = String(value).trim();
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) {
    return raw;
  }
  return raw.replace(/^\.\//, '').replace(/^\/+/, '');
}

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

const imageMap = {};
productsData.products.forEach(p => {
  imageMap[p.externalId] = p.images;
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  if (!PRINTFUL_API_KEY) {
    return res.status(500).json({ error: 'PRINTFUL_API_KEY environment variable is not set' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Product id is required' });
  }

  try {
    const data = await fetchFromPrintful(`/store/products/${id}`, PRINTFUL_API_KEY);
    const syncProduct = data.result.sync_product;
    const syncVariants = data.result.sync_variants || [];

    if (!syncProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const customImages = (imageMap[syncProduct.external_id] || [])
      .map(normalizeLocalAssetPath)
      .filter(Boolean);

    const product = {
      id: syncProduct.id,
      externalId: syncProduct.external_id,
      name: syncProduct.name,
      images: customImages || [],
      variants: syncVariants.map(v => ({
        id: v.variant_id,
        syncVariantId: v.id,
        size: v.size || 'One Size',
        color: v.color || 'Default',
        price: parseFloat(v.retail_price) || 0,
        options: v.options || []
      }))
    };

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      error: 'Failed to fetch product',
      message: error.message
    });
  }
};
