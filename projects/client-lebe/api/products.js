const { fetchFromPrintful } = require('./_lib/printful');
const { getColorVariants, getProductImages } = require('./_lib/products-data');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  if (!PRINTFUL_API_KEY) {
    return res.status(500).json({ error: 'PRINTFUL_API_KEY environment variable is not set' });
  }

  try {
    const data = await fetchFromPrintful('/store/products', PRINTFUL_API_KEY);
    const printfulProducts = data.result || [];

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

      return {
        id: product.id,
        externalId: product.external_id,
        name: product.name,
        price,
        images: productImages,
        variantCount: product.variants,
        colorVariants: getColorVariants(product.id)
      };
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    });
  }
};
