import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/products.json'), 'utf8'));

// Build image map from products.json
const imageMap = {};
productsData.products.forEach(p => {
  imageMap[p.externalId] = p.images || [];
});

// Mock products with images from products.json
const mockProducts = [
  { id: 1, externalId: '6a03a9f14842e6', name: 'Ainbo Bra - Terracotta', price: 89, images: imageMap['6a03a9f14842e6'] || [] },
  { id: 2, externalId: '6a03a9b1d61425', name: 'Ainbo Leggings - Terracotta', price: 129, images: imageMap['6a03a9b1d61425'] || [] },
  { id: 3, externalId: '6477600e15cb73', name: 'Saguanari Bra - Black', price: 95, images: imageMap['6477600e15cb73'] || [] },
  { id: 4, externalId: '64775fcaef5f21', name: 'Saguanari Bra - White', price: 95, images: imageMap['64775fcaef5f21'] || [] },
  { id: 5, externalId: '64000b204a6de9', name: 'Saguanari Leggings - Black', price: 135, images: imageMap['64000b204a6de9'] || [] },
  { id: 6, externalId: '63ec714091ff89', name: 'Saguanari Leggings - Tan', price: 135, images: imageMap['63ec714091ff89'] || [] },
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

const server = http.createServer((req, res) => {
  // API endpoints
  if (req.url === '/api/products' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockProducts));
    return;
  }

  if (req.url.startsWith('/api/product') && req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const id = url.searchParams.get('id');
    const product = mockProducts.find(p => p.id === parseInt(id));

    if (product) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(product));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Product not found' }));
    }
    return;
  }

  // URL rewrites from vercel.json
  let urlPath = new URL(req.url, `http://localhost`).pathname;

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
server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
