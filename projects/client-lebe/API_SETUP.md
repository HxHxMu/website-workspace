# Printful API Integration Setup

## Overview

This project uses Vercel Functions to securely integrate with the Printful API. Your custom designs are served from the frontend while product data (pricing, inventory, variants) is fetched from Printful in real-time.

## Getting Your Printful API Key

1. Log in to your Printful account (https://www.printful.com/admin)
2. Go to **Settings** → **API** (https://www.printful.com/admin/settings/api)
3. Copy your API key
4. Create `.env.local` in the project root (copy from `.env.local.example`)
5. Add your API key:
   ```
   PRINTFUL_API_KEY=your_api_key_here
   ```

## Project Structure

```
projects/client-lebe/
├── api/
│   ├── products.js      # Fetch products from Printful + merge with custom images
│   └── checkout.js      # Create orders on Printful
├── src/
│   ├── data/
│   │   └── products.json # Image mappings (static, won't change)
│   └── js/
│       └── printful.js   # Frontend that calls the API
└── .env.local.example    # Environment variable template
```

## Image Mapping

Update `src/data/products.json` to add/remove product images:

```json
{
  "products": [
    {
      "printfulId": "product-id-from-printful",
      "images": [
        "/assets/images/photo1.jpg",
        "/assets/images/photo2.jpg"
      ]
    }
  ]
}
```

- `printfulId`: Must match the product ID from Printful
- `images`: Your custom image paths (won't change after set)

## API Endpoints

### GET /api/products
Returns all products from Printful with merged custom images.

**Response:**
```json
[
  {
    "id": "product-id",
    "name": "Product Name",
    "description": "...",
    "price": 45.00,
    "images": ["/path/to/image1.jpg", "/path/to/image2.jpg"],
    "variants": [...]
  }
]
```

### POST /api/checkout
Creates an order on Printful.

**Request:**
```json
{
  "items": [
    {
      "variantId": 123,
      "quantity": 1,
      "syncVariantId": "abc123"
    }
  ],
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  }
}
```

**Response:**
```json
{
  "success": true,
  "orderId": 123456,
  "externalId": "ext-id",
  "estimatedDelivery": "2024-06-15",
  "totalCost": 55.00,
  "shippingCost": 10.00
}
```

## Local Testing

1. Copy `.env.local.example` to `.env.local` and add your API key
2. Run `npm run serve` to start the local server
3. Products will fetch from your Printful store

## Deployment to Vercel

1. Push to GitHub
2. Connect your repo to Vercel
3. Add `PRINTFUL_API_KEY` to Vercel environment variables
4. Deploy

Vercel Functions automatically handle the `/api/*` routes.

## Next Steps

- Build checkout flow (form → POST /api/checkout)
- Add to-cart functionality
- Handle payment confirmation
- Order status tracking
