const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8080';

function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const body = options.body ? JSON.stringify(options.body) : null;

  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? require('https') : require('http');
    const req = transport.request(url, {
      method: options.method || 'GET',
      headers: {
        ...(body ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          raw,
          json() {
            return raw ? JSON.parse(raw) : null;
          },
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const homepage = await request('/');
  assert(homepage.status === 200, `Homepage returned ${homepage.status}`);
  assert(homepage.raw.includes('js/product-model.js'), 'Homepage is missing product-model.js');
  assert(homepage.raw.indexOf('js/product-model.js') < homepage.raw.indexOf('js/printful.js'), 'Product model must load before printful.js');

  const productsResponse = await request('/api/products');
  assert(productsResponse.status === 200, `/api/products returned ${productsResponse.status}`);
  const products = productsResponse.json();
  assert(Array.isArray(products) && products.length > 0, '/api/products returned no products');

  const product = products.find((item) => item?.id && Number.isFinite(Number(item.price))) || products[0];
  assert(product.id, 'Product is missing id');
  assert(Number.isFinite(Number(product.price)), 'Product is missing numeric price');

  const productResponse = await request(`/api/product?id=${encodeURIComponent(product.id)}`);
  assert(productResponse.status === 200, `/api/product returned ${productResponse.status}`);
  const productDetail = productResponse.json();
  assert(Array.isArray(productDetail.variants) && productDetail.variants.length > 0, 'Product detail returned no variants');

  const variant = productDetail.variants[0];
  assert(variant.id, 'Variant is missing variant id');
  assert(variant.syncVariantId, 'Variant is missing sync variant id');

  const shippingResponse = await request('/api/shipping-rates', {
    method: 'POST',
    body: {
      address: {
        name: 'Smoke Test',
        email: 'smoke@example.com',
        phone: '5555555555',
        address1: '123 Test St',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'US',
      },
      items: [{
        productId: productDetail.id,
        variantId: variant.id,
        syncVariantId: variant.syncVariantId,
        quantity: 1,
        size: variant.size,
        color: variant.color,
        price: variant.price,
      }],
    },
  });
  assert(shippingResponse.status === 200, `/api/shipping-rates returned ${shippingResponse.status}: ${shippingResponse.raw}`);
  const shipping = shippingResponse.json();
  assert(Array.isArray(shipping.rates) && shipping.rates.length > 0, 'Shipping returned no rates');

  const intentResponse = await request('/api/stripe-intent', {
    method: 'POST',
    body: {},
  });
  assert(
    intentResponse.status === 200 || intentResponse.status === 503,
    `/api/stripe-intent returned unexpected status ${intentResponse.status}`
  );
  if (intentResponse.status === 503) {
    const intent = intentResponse.json();
    assert(intent.localDev === true, 'Local stripe-intent 503 must include localDev=true');
  }

  console.log(`Smoke passed against ${BASE_URL}`);
}

main().catch((error) => {
  console.error(`Smoke failed: ${error.message}`);
  process.exit(1);
});
