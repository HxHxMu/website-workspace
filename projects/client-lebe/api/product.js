const { fetchFromPrintful } = require('./_lib/printful');
const { getColorVariants, getProductImages, getPublishedProductById, getProductPath } = require('./_lib/products-data');

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

  const publishedProduct = getPublishedProductById(id);
  if (!publishedProduct) {
    return res.status(404).json({ error: 'Product not found' });
  }

  try {
    const data = await fetchFromPrintful(`/store/products/${id}`, PRINTFUL_API_KEY);
    const syncProduct = data.result.sync_product;
    const syncVariants = data.result.sync_variants || [];

    if (!syncProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const variantPreviews = syncVariants
      .flatMap((v) => v.files || [])
      .filter((f) => f.type === 'preview' && f.preview_url)
      .map((f) => f.preview_url);

    const fallbackImages = [...new Set([syncProduct.thumbnail_url, ...variantPreviews])].filter(Boolean);

    const product = {
      id: syncProduct.id,
      externalId: syncProduct.external_id,
      name: syncProduct.name,
      displayName: publishedProduct.displayName,
      type: publishedProduct.type,
      color: publishedProduct.color,
      slug: publishedProduct.slug,
      path: getProductPath(publishedProduct),
      seo: publishedProduct.seo || {},
      pdp: publishedProduct.pdp || {},
      material: publishedProduct.material || '',
      images: getProductImages(syncProduct.external_id, fallbackImages),
      colorVariants: getColorVariants(syncProduct.id),
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
