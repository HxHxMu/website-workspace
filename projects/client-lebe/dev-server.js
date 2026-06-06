const http = require('http');
const fs = require('fs');
const path = require('path');
const productsApi = require('./api/products');
const productApi = require('./api/product');

['.env.local', '.env'].forEach((envFile) => {
  const envPath = path.join(__dirname, envFile);
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) return;

      const [, key, rawValue] = match;
      if (process.env[key]) return;
      process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
    });
});

const productsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/products.json'), 'utf8'));

// Build image map from products.json
const imageMap = {};
productsData.products.forEach(p => {
  imageMap[p.externalId] = p.images || [];
});

const COLOR_BY_EXTERNAL_ID = {
  '6477600e15cb73': 'Black',
  '64775fcaef5f21': 'White',
  '64000b204a6de9': 'White',
  '63ec714091ff89': 'Black',
};

const MOCK_COLOR_VARIANTS = {
  3: [
    { name: 'White', productId: 4 },
    { name: 'Black', productId: 3 },
  ],
  4: [
    { name: 'White', productId: 4 },
    { name: 'Black', productId: 3 },
  ],
  5: [
    { name: 'White', productId: 5 },
    { name: 'Black', productId: 6 },
  ],
  6: [
    { name: 'White', productId: 5 },
    { name: 'Black', productId: 6 },
  ],
};

const REAL_TO_MOCK_PRODUCT_ID = {
  309483736: 3,
  309483674: 4,
  301596573: 5,
  300307426: 6,
};

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL'];

function buildMockVariants(product) {
  const color = COLOR_BY_EXTERNAL_ID[product.externalId] || 'Default';
  return SIZE_ORDER.map((size, index) => ({
    id: product.id * 100 + index + 1,
    syncVariantId: `${product.id}-${size}`,
    size,
    color,
    price: Number(product.price) || 0,
    options: [],
  }));
}

// Mock products with images from products.json
const mockProducts = [
  { id: 1, externalId: '6a03a9f14842e6', name: 'Ainbo Bra - Terracotta', price: 89, images: imageMap['6a03a9f14842e6'] || [] },
  { id: 2, externalId: '6a03a9b1d61425', name: 'Ainbo Leggings - Terracotta', price: 129, images: imageMap['6a03a9b1d61425'] || [] },
  { id: 3, externalId: '6477600e15cb73', name: 'Saguanari Bra - Black', price: 95, images: imageMap['6477600e15cb73'] || [] },
  { id: 4, externalId: '64775fcaef5f21', name: 'Saguanari Bra - White', price: 95, images: imageMap['64775fcaef5f21'] || [] },
  { id: 5, externalId: '64000b204a6de9', name: 'Saguanari Leggings - White', price: 135, images: imageMap['64000b204a6de9'] || [] },
  { id: 6, externalId: '63ec714091ff89', name: 'Saguanari Leggings - Black', price: 135, images: imageMap['63ec714091ff89'] || [] },
  { id: 7, externalId: '63d3c0f8bb5d12', name: 'Saguanari Tank - Black', price: 75, images: imageMap['63d3c0f8bb5d12'] || [] },
  { id: 8, externalId: '63d3c0f8bb5d13', name: 'Saguanari Tank - White', price: 75, images: imageMap['63d3c0f8bb5d13'] || [] },
  { id: 9, externalId: '63d3c0f8bb5d14', name: 'Saguanari Shorts - Black', price: 85, images: imageMap['63d3c0f8bb5d14'] || [] },
  { id: 10, externalId: '63d3c0f8bb5d15', name: 'Saguanari Shorts - Tan', price: 85, images: imageMap['63d3c0f8bb5d15'] || [] },
  { id: 11, externalId: '63d3c0f8bb5d16', name: 'Ainbo Bra - Black', price: 89, images: imageMap['63d3c0f8bb5d16'] || [] },
  { id: 12, externalId: '63d3c0f8bb5d17', name: 'Ainbo Bra - White', price: 89, images: imageMap['63d3c0f8bb5d17'] || [] },
  { id: 13, externalId: '63d3c0f8bb5d18', name: 'Ainbo Leggings - Black', price: 129, images: imageMap['63d3c0f8bb5d18'] || [] },
  { id: 14, externalId: '63d3c0f8bb5d19', name: 'Ainbo Leggings - White', price: 129, images: imageMap['63d3c0f8bb5d19'] || [] },
  { id: 15, externalId: '63d3c0f8bb5d20', name: 'Ainbo Tank - Terracotta', price: 65, images: imageMap['63d3c0f8bb5d20'] || [] }
];

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

async function runApiHandler(handler, req, res, query = {}) {
  req.query = query;

  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };

  res.json = (data) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(data));
    return res;
  };

  try {
    await handler(req, res);
  } catch (error) {
    console.error('Local API handler failed:', error);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Local API handler failed', message: error.message });
    }
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');

  // API endpoints
  if (requestUrl.pathname === '/api/products' && req.method === 'GET') {
    await runApiHandler(productsApi, req, res);
    return;
  }

  if (requestUrl.pathname === '/api/product' && req.method === 'GET') {
    await runApiHandler(productApi, req, res, {
      id: requestUrl.searchParams.get('id'),
    });
    return;
  }

  if (requestUrl.pathname === '/api/shipping-rates' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const address = body.address || {};
    if (!address.city || !address.state || !address.zip) {
      sendJson(res, 400, { error: 'Missing or incomplete shipping address.' });
      return;
    }
    if (String(address.country || address.country_code || 'US').toUpperCase() !== 'US') {
      sendJson(res, 400, { error: 'We currently ship only within the United States.' });
      return;
    }

    sendJson(res, 200, {
      rates: [
        {
          id: 'STANDARD',
          name: 'Standard',
          rate: 7.95,
          currency: 'USD',
          minDeliveryDays: 3,
          maxDeliveryDays: 6,
        },
        {
          id: 'EXPRESS',
          name: 'Express',
          rate: 14.95,
          currency: 'USD',
          minDeliveryDays: 2,
          maxDeliveryDays: 3,
        },
      ],
    });
    return;
  }

  if (requestUrl.pathname === '/api/promo-code' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const code = String(body.code || '').trim().toUpperCase();
    const subtotal = Math.max(0, Number(body.subtotal) || 0);
    if (!code) {
      sendJson(res, 400, { error: 'Please enter a discount code.' });
      return;
    }

    if (['LEBE10', 'SAVE10', 'TEST10'].includes(code)) {
      sendJson(res, 200, {
        discount: {
          code,
          percentOff: 10,
          amountOff: null,
          name: 'Local test discount',
        },
        discountAmount: Number((subtotal * 0.1).toFixed(2)),
      });
      return;
    }

    sendJson(res, 400, {
      error: 'Promo code was not found. In local dev, use LEBE10, SAVE10, or TEST10; real Stripe promo codes work on the Vercel preview.',
    });
    return;
  }

  if (requestUrl.pathname === '/api/stripe-config' && req.method === 'GET') {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      sendJson(res, 500, { error: 'STRIPE_PUBLISHABLE_KEY is not set locally. Use the Vercel preview for real payments.' });
      return;
    }
    sendJson(res, 200, { publishableKey });
    return;
  }

  if (requestUrl.pathname === '/api/stripe-intent' && req.method === 'POST') {
    sendJson(res, 503, {
      error: 'Local dev can mock shipping and promo codes, but real payment setup must be tested on the Vercel preview.',
      localDev: true,
    });
    return;
  }

  if (requestUrl.pathname.startsWith('/api/')) {
    sendJson(res, 404, { error: 'Local API route not implemented.' });
    return;
  }

  // URL rewrites from vercel.json
  let urlPath = requestUrl.pathname;

  if (urlPath === '/product') {
    urlPath = '/product.html';
  } else if (urlPath === '/cart') {
    urlPath = '/cart.html';
  } else if (urlPath === '/') {
    urlPath = '/index.html';
  } else if (!path.extname(urlPath)) {
    // If no file extension and not a directory, try .html
    const htmlPath = path.join(__dirname, 'src', urlPath + '.html');
    if (fs.existsSync(htmlPath)) {
      urlPath = urlPath + '.html';
    } else {
      // Fall back to index.html for SPA routing
      urlPath = '/index.html';
    }
  }

  // Static file serving
  let filePath = path.join(__dirname, 'src', urlPath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
      '.json': 'application/json'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

const PORT = 8080;
const HOST = '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`Dev server running at http://${HOST}:${PORT}`);
});
