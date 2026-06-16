const fs = require('fs');
const path = require('path');
const { fetchFromPrintful } = require('../api/_lib/printful');
const { getColorVariants, getProductImages, productsData } = require('../api/_lib/products-data');

const ROOT = path.join(__dirname, '..');
const DOMAIN = 'https://lebe.life';

// Helper to resolve absolute path in the workspace
function getPath(...parts) {
  return path.join(ROOT, ...parts);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;

    const [key, ...valueParts] = trimmed.split('=');
    const name = key.trim();
    if (!name || process.env[name]) return;

    let value = valueParts.join('=').trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[name] = value;
  });
}

loadEnvFile(getPath('.env'));
loadEnvFile(getPath('.env.local'));

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function escapeJsString(value) {
  return JSON.stringify(String(value ?? '')).slice(1, -1);
}

function normalizeFeedUrl(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${DOMAIN}/${raw.replace(/^\/+/, '')}`;
}

function getMetaPixelCode() {
  const pixelId = String(process.env.META_PIXEL_ID || '').trim();
  if (!pixelId) return '';

  const safePixelId = escapeJsString(pixelId);
  const noscriptUrl = `https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`;

  return `
  <!-- Meta Pixel Code -->
  <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${safePixelId}');
    fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none" alt="" src="${noscriptUrl}" /></noscript>
  <!-- End Meta Pixel Code -->`;
}

// 1. Load layout partial templates
const headTemplate = fs.readFileSync(getPath('src/partials/shared/_head.html'), 'utf8');
const headerTemplate = fs.readFileSync(getPath('src/partials/shared/_header.html'), 'utf8');
const footerTemplate = fs.readFileSync(getPath('src/partials/shared/_footer.html'), 'utf8');
const scriptsTemplate = fs.readFileSync(getPath('src/partials/shared/_scripts.html'), 'utf8');
const policyTemplate = fs.readFileSync(getPath('src/partials/policies/_policy.html'), 'utf8');
const analyticsScript = '<script src="js/analytics.js" defer></script>';
const bagIndicatorScript = '<script src="js/bag-indicator.js" defer></script>';

// 2. Define compilation engine
function assemblePage(config) {
  const content = fs.readFileSync(getPath(config.contentFile), 'utf8');

  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION
    ? `<meta name="google-site-verification" content="${process.env.GOOGLE_SITE_VERIFICATION}" />`
    : '';

  const canonicalUrl = `https://lebe.life${config.slug === 'index' ? '' : '/' + config.slug}`;
  const ogType = config.ogType || 'website';
  const ogImage = config.ogImage || 'https://lebe.life/assets/images/lebeHero1.jpg';
  const metaPixelCode = getMetaPixelCode();

  // Substitute head place holders
  let head = headTemplate
    .replaceAll('{{TITLE}}', config.title)
    .replaceAll('{{DESCRIPTION}}', config.description)
    .replaceAll('{{GOOGLE_SITE_VERIFICATION}}', googleVerification)
    .replaceAll('{{META_PIXEL_CODE}}', metaPixelCode)
    .replaceAll('{{CANONICAL_URL}}', canonicalUrl)
    .replaceAll('{{OG_TYPE}}', ogType)
    .replaceAll('{{OG_IMAGE}}', ogImage)
    .replaceAll('{{EXTRA_HEAD}}', config.extraHead || '')
    .replaceAll('{{BODY_CLASS}}', config.bodyClass || 'bg-white text-[#050505]');

  // Substitute header class placeholder
  let header = headerTemplate
    .replaceAll('{{HEADER_CLASS}}', config.headerClass || '');

  // Substitute scripts placeholder
  let scripts = scriptsTemplate
    .replaceAll('{{SCRIPTS}}', `${analyticsScript}\n${config.scripts || ''}\n${bagIndicatorScript}`);

  // Concatenate parts
  return `${head}\n${header}\n${content}\n${footerTemplate}\n${scripts}`;
}

// 3. Define configuration for core HTML pages
const corePages = [
  {
    slug: 'index',
    title: 'LEBE — Saguanari Yoga Wear',
    description: 'Made-to-order yoga wear. Ships in ~14 days.',
    bodyClass: 'bg-white text-[#050505]',
    headerClass: 'lebe-header--hero',
    extraHead: '',
    scripts: `
<script src="js/product-data.js" defer></script>
<script src="js/product-model.js" defer></script>
<script src="js/html-utils.js" defer></script>
<script src="js/main.js" defer></script>
<script src="js/printful.js" defer></script>`,
    contentFile: 'src/partials/home/_hero.html'
  },
  {
    slug: 'product',
    title: 'Product — LEBE',
    description: 'Explore LEBE made-to-order activewear, product details, sizing, and gallery imagery.',
    bodyClass: 'bg-[#e9e9e9] text-[#050505]',
    headerClass: '',
    extraHead: `
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css" />
  <script src="js/product-data.js"></script>
  <script>
    (() => {
      const id = new URLSearchParams(window.location.search).get('id');
      const previews = window.LebeProductData?.previews || {};
      const product = previews[id];
      const hrefs = product ? product.images : [];
      window.LEBE_PDP_PRELOAD_IMAGES = hrefs;
      hrefs.forEach((href, index) => {
        const link = document.createElement('link');
        link.rel = index === 0 ? 'preload' : 'prefetch';
        link.as = 'image';
        link.href = href;
        if (index === 0) link.fetchPriority = 'high';
        document.head.appendChild(link);
      });
    })();
  </script>`,
    scripts: `
<script src="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js"></script>
<script src="js/cart.js" defer></script>
<script src="js/product-model.js" defer></script>
<script src="js/product-gallery.js" defer></script>
<script src="js/product-size-guide.js" defer></script>
<script src="js/product.js" defer></script>`,
    contentFile: 'src/partials/product/_product.html'
  },
  {
    slug: 'cart',
    title: 'Cart — LEBE',
    description: 'Review your cart and proceed to checkout.',
    bodyClass: 'bg-white text-[#050505]',
    headerClass: '',
    extraHead: '<script src="https://js.stripe.com/v3/"></script>',
    scripts: `
<script src="js/product-data.js" defer></script>
<script src="js/cart.js" defer></script>
<script src="js/product-model.js" defer></script>
<script src="js/html-utils.js" defer></script>
<script src="js/main.js" defer></script>
<script src="js/checkout.js" defer></script>`,
    contentFile: 'src/partials/cart/_cart.html'
  },
  {
    slug: 'contact',
    title: 'Contact — LEBE',
    description: 'Contact LEBE for general product, order, and policy questions.',
    bodyClass: 'bg-white text-[#050505]',
    headerClass: '',
    extraHead: '',
    scripts: `<script src="./js/support-form.js" defer></script>`,
    contentFile: 'src/partials/contact/_contact.html'
  },
  {
    slug: 'order-issue',
    title: 'Order Issue — LEBE',
    description: 'Report a damaged, defective, incorrect, or missing LEBE order.',
    bodyClass: 'bg-white text-[#050505]',
    headerClass: '',
    extraHead: '',
    scripts: `<script src="./js/support-form.js" defer></script>`,
    contentFile: 'src/partials/order-issue/_order-issue.html'
  },
  {
    slug: '404',
    title: 'Page Not Found — LEBE',
    description: 'The requested LEBE page could not be found.',
    bodyClass: 'bg-[#e9e9e9] text-[#050505]',
    headerClass: '',
    extraHead: '<meta name="robots" content="noindex" />',
    scripts: '',
    contentFile: 'src/partials/errors/_404.html'
  }
];

// Compile core pages
corePages.forEach((page) => {
  const html = assemblePage(page);
  fs.writeFileSync(getPath('src', `${page.slug}.html`), html);
  console.log(`Built HTML: ${page.slug}.html`);
});

// 4. Define and Compile Policy Pages
const UPDATED = 'June 2026';
const policies = [
  {
    slug: 'privacy',
    title: 'Privacy',
    eyebrow: 'data & discretion',
    sideTitle: 'legal information.',
    sideNote: 'Customer data.',
    metaTitle: 'Privacy Policy — LEBE',
    metaDescription: 'How LEBE collects, uses, and protects customer information.',
    sections: [
      {
        heading: 'Overview.',
        body: [
          'At LEBE, we respect your privacy and are committed to protecting your personal information.',
        ],
      },
      {
        heading: 'Information we collect.',
        body: [
          'When you place an order or contact us, we may collect your name, email address, shipping and billing address, phone number, payment information, order details, and communications you send to us.',
          'Payment information is processed securely through our payment providers. LEBE does not store full payment card details.',
        ],
      },
      {
        heading: 'How we use information.',
        body: [
          'We use your information to process and fulfill orders, provide customer support, communicate about your purchase, improve our products and website, prevent fraud and unauthorized transactions, and comply with legal obligations.',
        ],
      },
      {
        heading: 'Analytics & advertising.',
        body: [
          'We may use analytics and advertising pixels, including Google Analytics and Meta Pixel, to understand site performance, measure product interest, and improve marketing.',
          'These tools may collect device, browser, page view, and interaction information. We do not use them to store full payment card details.',
        ],
      },
      {
        heading: 'Print-on-demand fulfillment.',
        body: [
          'LEBE partners with Printful, Inc. to manufacture and fulfill products ordered through our store.',
          'When you place an order, we share the information necessary to process and deliver your purchase, including your name, shipping address, email address, phone number if provided, and order details.',
          'Printful uses this information for order production, fulfillment, shipping, customer support, fraud prevention, and legal compliance.',
        ],
      },
      {
        heading: 'Third-party services.',
        body: [
          'We may use trusted third-party providers for payment processing, order fulfillment, shipping and delivery, website analytics, and email communications.',
          'These providers receive only the information necessary to perform their services.',
        ],
      },
      {
        heading: 'Data security.',
        body: [
          'We take reasonable measures to protect your information. However, no method of transmission or storage can be guaranteed to be completely secure.',
        ],
      },
      {
        heading: 'Data retention.',
        body: [
          'We keep order, support, and transaction records only as long as reasonably necessary for fulfillment, customer support, fraud prevention, accounting, and legal obligations.',
        ],
      },
      {
        heading: 'California privacy rights.',
        body: [
          'California residents may request information regarding the categories of personal information collected and may request deletion of personal information, subject to applicable legal exceptions.',
        ],
      },
      {
        heading: 'Contact.',
        body: [
          'For privacy-related questions, use the <a href="/contact">contact form</a>.',
        ],
      },
    ],
  },
  {
    slug: 'shipping',
    title: 'shipping',
    eyebrow: 'delivery information',
    sideTitle: 'shipping notes.',
    sideNote: 'Made-to-order.',
    metaTitle: 'Shipping Policy — LEBE',
    metaDescription: 'Shipping, production, and delivery information for LEBE orders.',
    sections: [
      {
        heading: 'Overview.',
        body: [
          'All LEBE products are made to order. Production happens after purchase, then your selected carrier service begins once the package ships.',
          'Shipping rates are calculated live at checkout based on your address, items, and selected shipping method.',
        ],
      },
      {
        heading: 'Processing time.',
        body: [
          'Orders typically require 2–7 business days for production before shipment. During higher-volume periods, production can take longer.',
        ],
      },
      {
        heading: 'Shipping time.',
        body: [
          'Most domestic U.S. orders arrive within 3–10 business days after shipment, depending on the selected shipping method and carrier conditions.',
          'Shipping times are estimates, not guarantees. Delivery dates begin after production is complete.',
        ],
      },
      {
        heading: 'Tracking.',
        body: [
          'Tracking is sent automatically once the carrier receives your package. It can take a short time for carrier scans to appear after a label is created.',
        ],
      },
      {
        heading: 'United States only.',
        body: [
          'LEBE currently ships only within the United States.',
        ],
      },
      {
        heading: 'Address accuracy.',
        body: [
          'Customers are responsible for providing accurate shipping information. LEBE is not responsible for orders shipped to incorrectly entered addresses.',
        ],
      },
      {
        heading: 'Carrier delays.',
        body: [
          'LEBE is not responsible for delays caused by shipping carriers, weather events, holidays, supply chain disruptions, or circumstances beyond our control.',
        ],
      },
      {
        heading: 'Lost or stolen packages.',
        body: [
          'Once a shipment has been marked as delivered by the carrier, responsibility for the package transfers to the customer.',
        ],
      },
      {
        heading: 'Questions.',
        body: [
          'For general shipping questions, use the <a href="/contact">contact form</a>.',
        ],
      },
    ],
  },
  {
    slug: 'returns',
    title: 'Returns',
    eyebrow: 'returns & refunds',
    sideTitle: 'order care.',
    sideNote: 'Made for you.',
    metaTitle: 'Returns & Refunds — LEBE',
    metaDescription: 'Return, refund, damaged item, and cancellation information for LEBE orders.',
    sections: [
      {
        heading: 'Overview.',
        body: [
          'Because every product is made specifically to order, we do not accept returns or exchanges for incorrect size selection, change of mind, buyer’s remorse, or preference regarding color, fit, or style.',
          'Please review sizing information carefully before placing your order.',
        ],
      },
      {
        heading: 'Damaged, defective, or incorrect items.',
        body: [
          'If your order arrives damaged, defective, or incorrect, submit an <a href="/order-issue">order issue request</a> within 30 days of delivery.',
          'Include your order number, a description of the issue, and any available photo links. We may request photos before approving a replacement or refund.',
          'If approved, we will provide a replacement or refund at no additional cost.',
        ],
      },
      {
        heading: 'Order changes & cancellations.',
        body: [
          'Requests to modify or cancel an order must be submitted within 12 hours of purchase.',
          'Once production has begun, orders cannot be modified, canceled, or refunded.',
        ],
      },
      {
        heading: 'Contact.',
        body: [
          'For damaged, defective, incorrect, or missing orders, use the <a href="/order-issue">order issue form</a>. For general questions, use the <a href="/contact">contact form</a>.',
        ],
      },
    ],
  },
  {
    slug: 'care',
    title: 'Care',
    eyebrow: 'fabric & product care',
    sideTitle: 'garment notes.',
    sideNote: 'Handle with care.',
    metaTitle: 'Care — LEBE',
    metaDescription: 'Garment care, fabric notes, and product details for LEBE made-to-order pieces.',
    sections: [
      {
        heading: 'Overview.',
        body: [
          'LEBE pieces are made to order. Treat the fabric gently to preserve the surface, print, and color over time.',
        ],
      },
      {
        heading: 'Washing.',
        body: [
          'Cold wash only. Hang dry. Avoid bleach, high heat, and rough laundering.',
        ],
      },
      {
        heading: 'Fabric notes.',
        body: [
          'In areas where the fabric is double-layered, such as pockets, details from the inner fabric layer may subtly show through, especially with lighter designs.',
          'Avoid contact with rough surfaces, as they can pull white fibers from the fabric and damage the garment.',
          'In case of low fabric stock, we may use comparable fabric to fulfill the order. Any substitute fabric will be as close to the original as possible.',
        ],
      },
      {
        heading: 'Color care.',
        body: [
          'Gold details may soften with wear. Black garments should be kept away from high heat, which can fade the color.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms',
    eyebrow: 'use & purchase terms',
    sideTitle: 'legal information.',
    sideNote: 'Site terms.',
    metaTitle: 'Terms & Conditions — LEBE',
    metaDescription: 'Terms and conditions for using the LEBE website and placing orders.',
    sections: [
      {
        heading: 'Overview.',
        body: [
          'By using this website and placing an order, you agree to these terms.',
        ],
      },
      {
        heading: 'Product information.',
        body: [
          'We strive to present products as accurately as possible. However, actual colors, print placement, and appearance may vary slightly due to manufacturing processes and screen settings.',
        ],
      },
      {
        heading: 'Sizing disclaimer.',
        body: [
          'Measurements are approximate and may vary slightly between products.',
          'Customers are responsible for selecting the appropriate size before completing a purchase.',
        ],
      },
      {
        heading: 'Intellectual property.',
        body: [
          'All content on this website, including designs, artwork, graphics, logos, photographs, product imagery, and branding, is the exclusive property of LEBE and may not be copied, reproduced, distributed, or used without written permission.',
        ],
      },
      {
        heading: 'Limitation of liability.',
        body: [
          'To the fullest extent permitted by law, LEBE’s total liability arising from any purchase shall not exceed the amount paid for the applicable product.',
        ],
      },
      {
        heading: 'Governing law.',
        body: [
          'These terms shall be governed by the laws of the State of California, without regard to conflict of law principles.',
        ],
      },
      {
        heading: 'Changes to these policies.',
        body: [
          'LEBE reserves the right to update these policies at any time. Changes become effective immediately upon posting to the website.',
        ],
      },
      {
        heading: 'Contact.',
        body: [
          'Questions regarding these terms may be sent through the <a href="/contact">contact form</a>.',
        ],
      },
    ],
  }
];

function renderSections(sections) {
  return sections.map((section) => `
          <section>
            <h2>${section.heading}</h2>
            ${section.body.map((paragraph) => `<p>${paragraph}</p>`).join('\n            ')}
          </section>`).join('\n\n');
}

function renderPolicyContent(policy) {
  return policyTemplate
    .replaceAll('{{EYEBROW}}', policy.eyebrow)
    .replaceAll('{{TITLE}}', policy.title)
    .replaceAll('{{SIDE_TITLE}}', policy.sideTitle)
    .replaceAll('{{SIDE_NOTE}}', policy.sideNote)
    .replaceAll('{{CONTENT}}', renderSections(policy.sections))
    .replaceAll('{{UPDATED}}', UPDATED);
}

// Compile policy pages
policies.forEach((policy) => {
  const contentHtml = renderPolicyContent(policy);
  
  // Substitute head/header/scripts place holders using the policy content
  const config = {
    title: policy.metaTitle,
    description: policy.metaDescription,
    bodyClass: 'bg-white text-[#050505]',
    headerClass: '',
    extraHead: '',
    scripts: '' // base scripts only (Meta Pixel will be loaded by scriptsTemplate)
  };

  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION
    ? `<meta name="google-site-verification" content="${process.env.GOOGLE_SITE_VERIFICATION}" />`
    : '';

  const canonicalUrl = `https://lebe.life/${policy.slug}`;
  const ogType = 'website';
  const ogImage = 'https://lebe.life/assets/images/lebeHero1.jpg';
  const metaPixelCode = getMetaPixelCode();

  // Compile full page html
  let head = headTemplate
    .replaceAll('{{TITLE}}', config.title)
    .replaceAll('{{DESCRIPTION}}', config.description)
    .replaceAll('{{GOOGLE_SITE_VERIFICATION}}', googleVerification)
    .replaceAll('{{META_PIXEL_CODE}}', metaPixelCode)
    .replaceAll('{{CANONICAL_URL}}', canonicalUrl)
    .replaceAll('{{OG_TYPE}}', ogType)
    .replaceAll('{{OG_IMAGE}}', ogImage)
    .replaceAll('{{EXTRA_HEAD}}', config.extraHead)
    .replaceAll('{{BODY_CLASS}}', config.bodyClass);

  let header = headerTemplate
    .replaceAll('{{HEADER_CLASS}}', config.headerClass);

  let scripts = scriptsTemplate
    .replaceAll('{{SCRIPTS}}', `${analyticsScript}\n${config.scripts || ''}\n${bagIndicatorScript}`);

  const fullHtml = `${head}\n${header}\n${contentHtml}\n${footerTemplate}\n${scripts}`;
  
  fs.writeFileSync(getPath('src', `${policy.slug}.html`), fullHtml);
  console.log(`Built HTML: ${policy.slug}.html`);
});

// 5. Generate Dynamic XML Sitemap
function buildSitemap() {
  try {
    const LebeProductData = require(getPath('src/js/product-data'));
    const DOMAIN = 'https://lebe.life';
    const urls = [];

    // Core static pages
    const staticSlugs = ['index', 'cart', 'contact', 'order-issue', 'privacy', 'shipping', 'returns', 'care', 'terms'];
    staticSlugs.forEach((slug) => {
      const path = slug === 'index' ? '' : `/${slug}`;
      urls.push(`${DOMAIN}${path}`);
    });

    // Dynamic product pages
    if (LebeProductData && LebeProductData.previews) {
      Object.keys(LebeProductData.previews).forEach((id) => {
        urls.push(`${DOMAIN}/product?id=${id}`);
      });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>${url.endsWith('.life') || url.endsWith('.life/') ? '1.0' : (url.includes('/product') ? '0.8' : '0.5')}</priority>
  </url>`).join('\n')}
</urlset>`;

    fs.writeFileSync(getPath('src', 'sitemap.xml'), xml);
    console.log('Built XML: sitemap.xml');
  } catch (error) {
    console.error('Error building sitemap:', error);
  }
}

buildSitemap();

function productKind(product = {}, productId = '') {
  const haystack = [
    product.name,
    productsData.colorVariants?.[String(productId)]?.displayName,
  ].filter(Boolean).join(' ').toLowerCase();

  if (haystack.includes('bra')) {
    return {
      category: 'Clothing & Accessories > Clothing > Activewear > Sports Bras',
      productType: 'Apparel & Accessories > Clothing > Activewear > Sports Bras',
      titleBase: 'Saguanari Sports Bra',
      description: 'Made-to-order LEBE sports bra with premium all-over print artwork.',
    };
  }

  return {
    category: 'Clothing & Accessories > Clothing > Activewear > Leggings',
    productType: 'Apparel & Accessories > Clothing > Activewear > Leggings',
    titleBase: 'Saguanari Leggings',
    description: 'Made-to-order LEBE leggings with premium all-over print artwork.',
  };
}

function variantOption(variant = {}, key = '') {
  const option = (variant.options || []).find((item) => String(item.id || '').toLowerCase() === key.toLowerCase());
  return option?.value || '';
}

function variantColor(product = {}, variant = {}) {
  const storefrontColor = productsData.productColorByExternalId?.[product.external_id];
  if (storefrontColor) return storefrontColor;

  const colors = getColorVariants(product.id) || [];
  const current = colors.find((color) => String(color.productId) === String(product.id));
  if (current?.name) return current.name;

  return variant.color || variantOption(variant, 'color') || 'Default';
}

function productGroupId(product = {}) {
  const externalId = String(product.external_id || '');
  return `lebe-${externalId || product.id}`;
}

function variantSize(variant = {}) {
  return variant.size || variantOption(variant, 'size') || 'One Size';
}

function formatFeedPrice(value) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return `${amount.toFixed(2)} USD`;
}

function buildFeedItem({ product, variant, image, itemGroupId, kind }) {
  const productId = product.id;
  const syncVariantId = variant.id || variant.sync_variant_id || `${productId}-${variant.variant_id || variantSize(variant)}`;
  const color = variantColor(product, variant);
  const size = variantSize(variant);
  const titleParts = [kind.titleBase || product.name, color, size].filter(Boolean);
  const link = `${DOMAIN}/product?id=${encodeURIComponent(productId)}`;
  const price = formatFeedPrice(variant.retail_price || variant.price);

  if (!price || !image) return '';

  return `    <item>
      <g:id>${escapeXml(syncVariantId)}</g:id>
      <g:item_group_id>${escapeXml(itemGroupId)}</g:item_group_id>
      <title>${escapeXml(titleParts.join(' - '))}</title>
      <description>${escapeXml(kind.description)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(normalizeFeedUrl(image))}</g:image_link>
      <g:availability>in stock</g:availability>
      <g:inventory>999</g:inventory>
      <g:quantity_to_sell_on_facebook>999</g:quantity_to_sell_on_facebook>
      <g:price>${escapeXml(price)}</g:price>
      <g:brand>LEBE</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>${escapeXml(kind.category)}</g:google_product_category>
      <g:product_type>${escapeXml(kind.productType)}</g:product_type>
      <g:color>${escapeXml(color)}</g:color>
      <g:size>${escapeXml(size)}</g:size>
      <g:gender>female</g:gender>
      <g:age_group>adult</g:age_group>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
}

async function getFeedProducts(apiKey) {
  const publishedProductIds = Object.keys(productsData.previews || {});

  return Promise.all(publishedProductIds.map(async (productId) => {
    const detail = await fetchFromPrintful(`/store/products/${encodeURIComponent(productId)}`, apiKey);
    const syncProduct = detail?.result?.sync_product;
    const syncVariants = detail?.result?.sync_variants || [];

    if (!syncProduct || syncVariants.length === 0) return null;

    const fallbackImages = [
      syncProduct.thumbnail_url,
      ...syncVariants
        .flatMap((variant) => variant.files || [])
        .filter((file) => file.type === 'preview' && file.preview_url)
        .map((file) => file.preview_url),
    ].filter(Boolean);

    return {
      product: syncProduct,
      variants: syncVariants,
      images: getProductImages(syncProduct.external_id, fallbackImages),
    };
  }));
}

function buildEmptyProductsFeed() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>LEBE — Saguanari Yoga Wear</title>
    <link>${DOMAIN}</link>
    <description>Made-to-order activewear.</description>
  </channel>
</rss>`;
}

async function buildProductsFeed() {
  const apiKey = process.env.PRINTFUL_API_KEY;

  if (!apiKey) {
    fs.writeFileSync(getPath('src', 'products-feed.xml'), buildEmptyProductsFeed());
    console.warn('Built XML: products-feed.xml without products because PRINTFUL_API_KEY is not set.');
    return;
  }

  try {
    const feedProducts = (await getFeedProducts(apiKey)).filter(Boolean);
    const items = [];

    feedProducts.forEach(({ product, variants, images }) => {
      const kind = productKind(product, product.id);
      const itemGroupId = productGroupId(product);
      const image = images[0] || '';

      variants.forEach((variant) => {
        const item = buildFeedItem({
          product,
          variant,
          image,
          itemGroupId,
          kind,
        });
        if (item) items.push(item);
      });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>LEBE — Saguanari Yoga Wear</title>
    <link>${DOMAIN}</link>
    <description>Made-to-order activewear.</description>
${items.join('\n')}
  </channel>
</rss>`;

    fs.writeFileSync(getPath('src', 'products-feed.xml'), xml);
    console.log(`Built XML: products-feed.xml (${items.length} items)`);
  } catch (error) {
    fs.writeFileSync(getPath('src', 'products-feed.xml'), buildEmptyProductsFeed());
    console.error('Error building products feed:', error.message);
  }
}

buildProductsFeed();
