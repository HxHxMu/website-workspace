const { fetchFromPrintful } = require('./_lib/printful');
const { getColorVariants, getProductImages, getPublishedProductById, getProductPath, getPublishedProducts, isPublishedProduct } = require('./_lib/products-data');

function buildLocalProductSummary(product) {
  const prices = (product.variants || [])
    .map((variant) => Number.parseFloat(variant.price || variant.retail_price))
    .filter((price) => Number.isFinite(price) && price > 0);

  return {
    id: product.id,
    externalId: product.externalId,
    name: product.name,
    displayName: product.displayName || product.name,
    type: product.type || '',
    color: product.color || '',
    slug: product.slug || '',
    path: getProductPath(product),
    seo: product.seo || {},
    pdp: product.pdp || {},
    price: prices.length ? Math.min(...prices) : null,
    images: getProductImages(product.externalId, product.images || []),
    variantCount: (product.variants || []).length,
    colorVariants: getColorVariants(product.id),
  };
}

function sendLocalProducts(res) {
  const products = getPublishedProducts().map(buildLocalProductSummary);
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json(products);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  if (!PRINTFUL_API_KEY) {
    return sendLocalProducts(res);
  }

  try {
    const data = await fetchFromPrintful('/store/products', PRINTFUL_API_KEY);
    const printfulProducts = (data.result || []).filter(isPublishedProduct);

    const products = await Promise.all(printfulProducts.map(async (product) => {
      const productImages = getProductImages(product.external_id, [product.thumbnail_url]);
      let price = null;

      try {
        const detail = await fetchFromPrintful(`/store/products/${product.id}`, PRINTFUL_API_KEY);
        const variants = detail?.result?.sync_variants || [];
        const prices = variants
          .map((v) => parseFloat(v.retail_price))
          .filter((v) => Number.isFinite(v) && v > 0);
        if (prices.length > 0) {
          price = Math.min(...prices);
        }
      } catch (e) {
        console.warn(`Price lookup failed for product ${product.id}:`, e.message);
      }

      const publishedProduct = getPublishedProductById(product.id);

      return {
        id: product.id,
        externalId: product.external_id,
        name: product.name,
        displayName: publishedProduct?.displayName || product.name,
        type: publishedProduct?.type || '',
        color: publishedProduct?.color || '',
        slug: publishedProduct?.slug || '',
        path: publishedProduct ? getProductPath(publishedProduct) : `/product?id=${encodeURIComponent(product.id)}`,
        seo: publishedProduct?.seo || {},
        pdp: publishedProduct?.pdp || {},
        price,
        images: productImages,
        variantCount: product.variants,
        colorVariants: getColorVariants(product.id)
      };
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(products);
  } catch (error) {
    console.warn('Falling back to local products data:', error.message);
    return sendLocalProducts(res);
  }
};
