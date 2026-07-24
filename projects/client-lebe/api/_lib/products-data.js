const path = require('path');
const { normalizeLocalAssetPath } = require('./printful');

const productsData = require(path.join(__dirname, '../../src/js/product-data'));

const imageMap = {};
Object.entries(productsData.imagesByExternalId).forEach(([externalId, images]) => {
  imageMap[externalId] = (images || [])
    .map(normalizeLocalAssetPath)
    .filter(Boolean);
});

const colorVariantMap = productsData.colorVariants || {};
const publishedProductMap = productsData.publishedProducts || {};
const publishedProductIds = productsData.publishedProductIds || Object.keys(publishedProductMap);
const publishedProducts = publishedProductIds
  .map((productId) => publishedProductMap[String(productId)])
  .filter(Boolean);

function normalizeProductId(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function getProductImages(externalId, fallbackImages = []) {
  const customImages = imageMap[externalId] || [];
  return customImages.length > 0
    ? customImages
    : fallbackImages.map(normalizeLocalAssetPath).filter(Boolean);
}

function getColorVariants(productId) {
  return colorVariantMap[String(productId)]?.colors || null;
}

function getPublishedProducts() {
  return publishedProducts.map((product) => ({
    ...product,
    images: [...(product.images || [])],
    homepageImages: [...(product.homepageImages || [])],
    variants: [...(product.variants || [])],
    seo: { ...(product.seo || {}) },
    pdp: { ...(product.pdp || {}) },
    feed: { ...(product.feed || {}) },
  }));
}

function getPublishedProductById(productId) {
  return publishedProductMap[normalizeProductId(productId)] || null;
}

function getPublishedProductByExternalId(externalId) {
  const id = normalizeProductId(externalId);
  return publishedProducts.find((product) => normalizeProductId(product.externalId) === id) || null;
}

function getPublishedProductBySlug(slug) {
  const normalized = normalizeProductId(slug).replace(/^\/+|\/+$/g, '');
  return publishedProducts.find((product) => normalizeProductId(product.slug) === normalized) || null;
}

function getProductPath(productOrId) {
  const product = typeof productOrId === 'object' && productOrId !== null
    ? productOrId
    : getPublishedProductById(productOrId);

  if (!product?.slug) return '';
  return `/product/${product.slug}`;
}

function getProductUrl(productOrId, domain = 'https://www.lebe.life') {
  const path = getProductPath(productOrId);
  return path ? `${domain}${path}` : '';
}

function isPublishedProduct(productOrId) {
  if (typeof productOrId === 'object' && productOrId !== null) {
    return Boolean(
      getPublishedProductById(productOrId.id) ||
      getPublishedProductByExternalId(productOrId.external_id || productOrId.externalId)
    );
  }

  return Boolean(getPublishedProductById(productOrId));
}

module.exports = {
  getColorVariants,
  getProductImages,
  getPublishedProductByExternalId,
  getPublishedProductById,
  getPublishedProductBySlug,
  getPublishedProducts,
  getProductPath,
  getProductUrl,
  isPublishedProduct,
  productsData,
};
