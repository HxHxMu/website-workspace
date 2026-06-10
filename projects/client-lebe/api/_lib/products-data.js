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

function getProductImages(externalId, fallbackImages = []) {
  const customImages = imageMap[externalId] || [];
  return customImages.length > 0
    ? customImages
    : fallbackImages.map(normalizeLocalAssetPath).filter(Boolean);
}

function getColorVariants(productId) {
  return colorVariantMap[String(productId)]?.colors || null;
}

module.exports = {
  getColorVariants,
  getProductImages,
  productsData,
};
