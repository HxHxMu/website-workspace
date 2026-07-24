const { fetchFromPrintful } = require('./_lib/printful');
const { getColorVariants, getProductImages, getPublishedProductById, getProductPath } = require('./_lib/products-data');

function buildLocalProduct(product) {
  return {
    id: product.id,
    externalId: product.externalId,
    name: product.name,
    displayName: product.displayName,
    type: product.type,
    color: product.color,
    slug: product.slug,
    path: getProductPath(product),
    seo: product.seo || {},
    pdp: product.pdp || {},
    material: product.material || '',
    images: getProductImages(product.externalId, product.images || []),
    colorVariants: getColorVariants(product.id),
    variants: (product.variants || []).map((variant) => ({
      id: variant.variantId || variant.variant_id || '',
      variantId: variant.variantId || variant.variant_id || '',
      syncVariantId: variant.syncVariantId || variant.sync_variant_id || '',
      size: variant.size || 'One Size',
      color: variant.color || 'Default',
      price: parseFloat(variant.price || variant.retail_price) || 0,
      options: variant.options || []
    }))
  };
}

function sendLocalProduct(res, publishedProduct, status = 200) {
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(status).json(buildLocalProduct(publishedProduct));
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Product id is required' });
  }

  const publishedProduct = getPublishedProductById(id);
  if (!publishedProduct) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  if (!PRINTFUL_API_KEY) {
    return sendLocalProduct(res, publishedProduct);
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
    console.warn('Falling back to local product data:', error.message);
    return sendLocalProduct(res, publishedProduct);
  }
};
