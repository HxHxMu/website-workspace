const fs = require('fs');
const path = require('path');
const { normalizeLocalAssetPath } = require('./printful');

const productsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/data/products.json'), 'utf8'));

const imageMap = {};
productsData.products.forEach((product) => {
  imageMap[product.externalId] = (product.images || [])
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
