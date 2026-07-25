const fs = require('fs');
const path = require('path');
const {
  getColorVariants,
  getProductImages,
  getPublishedProductByExternalId,
  getPublishedProductById,
  getPublishedProducts,
  getProductPath,
  getProductUrl,
  productsData,
} = require('../api/_lib/products-data');

const ROOT = path.join(__dirname, '..');
const DOMAIN = 'https://www.lebe.life';

// Placeholder — swap for teacher UGC photo when available. See LEBE_teacher_seeding_kit.md.
const heroMovementImage = '/assets/images/product-shots/saguanari_leggings/9.1-900.jpg';
const heroMovementImageAlt = 'Saguanari white leggings in a raised-knee movement pose, gold dot print visible in motion';

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

function configuredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value || /^your_/i.test(value)) return '';
  return value;
}

function normalizeFeedUrl(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${DOMAIN}/${raw.replace(/^\/+/, '')}`;
}

const PROD_HOSTS_JS = "['www.lebe.life', 'lebe.life']";

function getMetaPixelCode() {
  const pixelId = configuredEnv('META_PIXEL_ID');
  if (!pixelId) return '';

  const safePixelId = escapeJsString(pixelId);
  return `
  <!-- Meta Pixel Code — production hosts only, keeps previews/localhost out of Meta data -->
  <script>
    if (${PROD_HOSTS_JS}.indexOf(window.location.hostname) !== -1) {
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
    }
  </script>
  <!-- End Meta Pixel Code -->`;
}

function getPinterestTagCode() {
  const tagId = configuredEnv('PINTEREST_TAG_ID');
  if (!tagId) return '';

  const safeTagId = escapeJsString(tagId);
  return `
  <!-- Pinterest Tag — production hosts only, keeps previews/localhost out of Pinterest data -->
  <script>
    if (${PROD_HOSTS_JS}.indexOf(window.location.hostname) !== -1) {
      !function(e){if(!window.pintrk){window.pintrk = function () {
      window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
      n=window.pintrk;n.queue=[],n.version="3.0";var
      t=document.createElement("script");t.async=!0,t.src=e;var
      r=document.getElementsByTagName("script")[0];
      r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
      pintrk('load', '${safeTagId}');
      pintrk('page');
    }
  </script>
  <!-- End Pinterest Tag -->`;
}

function getStripePublishableKeyScript() {
  const publishableKey = configuredEnv('STRIPE_PUBLISHABLE_KEY');
  if (!publishableKey) return '';

  return `<script>window.LEBE_STRIPE_PUBLISHABLE_KEY="${escapeJsString(publishableKey)}";</script>`;
}

// 1. Load layout partial templates
const headTemplate = fs.readFileSync(getPath('src/partials/shared/_head.html'), 'utf8');
const headerTemplate = fs.readFileSync(getPath('src/partials/shared/_header.html'), 'utf8');
const footerTemplate = fs.readFileSync(getPath('src/partials/shared/_footer.html'), 'utf8');
const scriptsTemplate = fs.readFileSync(getPath('src/partials/shared/_scripts.html'), 'utf8');
const policyTemplate = fs.readFileSync(getPath('src/partials/policies/_policy.html'), 'utf8');
const productTemplate = fs.readFileSync(getPath('src/partials/product/_product.html'), 'utf8');
const analyticsScript = '<script src="/js/analytics.js" defer></script>';
const bagIndicatorScript = '<script src="/js/bag-indicator.js" defer></script>';

const klaviyoCompanyId = configuredEnv('KLAVIYO_COMPANY_ID');
const klaviyoListId = configuredEnv('KLAVIYO_LIST_ID');
const klaviyoSignupScript = (klaviyoCompanyId && klaviyoListId)
  ? '<script src="/js/klaviyo-footer-signup.js" defer></script>'
  : '';

function getHomeNewsletterSignupHtml() {
  if (!klaviyoCompanyId || !klaviyoListId) return '';

  return `
  <section class="lebe-newsletter bg-[#f5f2ea] text-[#050505]" aria-labelledby="newsletter-title">
    <div class="lebe-main-shell grid gap-8 py-16 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-stretch md:py-24">
      <figure class="lebe-newsletter__media">
        <img src="./assets/images/newsletter/welcome15.jpg" alt="Close-up of black LEBE leggings with gold detailing" loading="lazy" />
      </figure>
      <div class="lebe-newsletter__content">
        <p class="lebe-kicker">join the list</p>
        <h2 id="newsletter-title" class="lebe-newsletter__title">Get 15% off your first order.</h2>
        <p class="lebe-newsletter__copy">
          Join the LEBE list for first access to new drops, restocks, and a welcome offer sent to your inbox.
        </p>
        <form data-klaviyo-signup data-company-id="${escapeHtml(klaviyoCompanyId)}" data-list-id="${escapeHtml(klaviyoListId)}" data-success-message="You’re in. Check your email for your welcome offer." class="newsletter-signup">
          <label for="home-newsletter-email" class="sr-only">Email address</label>
          <div class="newsletter-signup__row">
            <input id="home-newsletter-email" name="email" type="email" required autocomplete="email" placeholder="Email address" class="newsletter-signup__input" />
            <button type="submit" class="newsletter-signup__submit">Sign up</button>
          </div>
          <p class="newsletter-signup__legal">
            By signing up, you agree to receive LEBE emails. Unsubscribe anytime. Offer valid on first order only.
          </p>
          <p class="newsletter-signup__status" data-form-status aria-live="polite"></p>
        </form>
      </div>
    </div>
  </section>`;
}

function normalizeAssetPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `/${raw.replace(/^\.?\//, '').replace(/^\/+/, '')}`;
}

function absoluteAssetUrl(value) {
  const pathValue = normalizeAssetPath(value);
  if (!pathValue) return '';
  if (/^https?:\/\//i.test(pathValue)) return pathValue;
  return `${DOMAIN}${pathValue}`;
}

function formatMoney(value) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return `$${Math.round(amount)}.`;
}

function productAlt(product = {}) {
  return product.seo?.imageAlt || `${product.seo?.productName || product.name || 'LEBE product'} product image`;
}

function productDisplayName(product = {}) {
  return product.seo?.productName || product.name || product.displayName || 'LEBE product';
}

function productStory(product = {}) {
  return product.seo?.schemaDescription || product.seo?.description || '';
}

function productHighlights(product = {}) {
  const type = String(product.type || '').toLowerCase();
  if (type === 'bra') return ['Racerback support', 'Removable padding', 'Pairs as a set'];
  if (type === 'leggings') return ['High-rise waist', 'Four-way stretch', 'Pairs as a set'];
  return ['Made after purchase', 'Soft stretch handfeel', 'Limited-run piece'];
}

function productPriceLabel(product = {}) {
  const prices = variantPrices(product.variants || []);
  if (prices.length === 0) return '';
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  return lowPrice === highPrice
    ? formatMoney(lowPrice)
    : `From ${formatMoney(lowPrice)}`;
}

function renderParagraphs(value) {
  return String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => `<p${index > 0 ? ' class="mt-3"' : ''}>${escapeHtml(paragraph)}</p>`)
    .join('\n');
}

function renderHomeProductGridHtml() {
  const products = getPublishedProducts()
    .filter((product) => product.slug)
    .sort((a, b) => Number(a.homepageOrder || 0) - Number(b.homepageOrder || 0));

  return products.map((product) => {
    const image = normalizeAssetPath(product.homepageImages?.[0] || product.images?.[0]);
    const href = getProductPath(product);
    const isWhite = String(product.swatch || product.color || '').toLowerCase() === 'white';
    const displayName = productDisplayName(product);
    const priceLabel = productPriceLabel(product);

    return `
      <article class="group flex h-full flex-col">
        <a href="${escapeHtml(href)}" class="block aspect-[4/5] overflow-hidden bg-neutral-100">
          <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(productAlt(product))}"
            class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div class="flex min-h-[100px] flex-1 items-start justify-between gap-4 border-b border-[#050505]/15 py-5">
          <div class="flex-1">
            <h3 class="min-h-[3.25rem] text-base font-semibold leading-tight tracking-[-0.03em] text-[#050505] md:text-lg">
              ${escapeHtml(displayName)}
            </h3>
            <div class="mt-2 flex items-center gap-3 text-sm font-semibold text-[#050505]/70">
              <span
                style="width: 24px; height: 24px; background-color: ${isWhite ? '#ffffff' : '#050505'}; border: 1px solid rgba(5, 5, 5, 0.3); border-radius: 50%; display: inline-block;"
              ></span>
              ${priceLabel ? `<span>${escapeHtml(priceLabel)}</span>` : ''}
            </div>
          </div>
          <a
            href="${escapeHtml(href)}"
            class="shrink-0 border border-[#050505] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] transition duration-300 hover:bg-[#050505] hover:text-white"
          >
            view.
          </a>
        </div>
      </article>`;
  }).join('\n');
}

function getHomeMovementBandHtml() {
  if (!heroMovementImage) return '';

  return `
  <section class="w-full overflow-hidden bg-[#050505]" aria-label="Saguanari in movement">
    <img
      src="${escapeHtml(heroMovementImage)}"
      alt="${escapeHtml(heroMovementImageAlt)}"
      class="h-[62vh] min-h-[360px] w-full object-cover md:h-[72vh]"
      loading="lazy"
      decoding="async"
    />
  </section>`;
}

function getHomeItemListJsonLd() {
  const products = getPublishedProducts()
    .filter((product) => product.slug)
    .sort((a, b) => Number(a.homepageOrder || 0) - Number(b.homepageOrder || 0));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'LEBE Saguanari capsule',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: getProductUrl(product, DOMAIN),
      name: productDisplayName(product),
      image: absoluteAssetUrl(product.images?.[0] || product.homepageImages?.[0] || ''),
    })),
  };

  return `<script type="application/ld+json">${escapeScriptJson(schema)}</script>`;
}

function escapeScriptJson(value) {
  return JSON.stringify(value, null, 2).replaceAll('<', '\\u003c');
}

function productImages(product = {}, detail = null) {
  const images = detail?.images?.length ? detail.images : product.images || [];
  return images.map(normalizeAssetPath).filter(Boolean);
}

function variantPrices(variants = []) {
  return variants
    .map((variant) => Number.parseFloat(variant.retail_price || variant.price))
    .filter((price) => Number.isFinite(price) && price > 0);
}

function buildProductJsonLd(product, detail = null) {
  const variants = detail?.variants?.length ? detail.variants : product.variants || [];
  const prices = variantPrices(variants);
  const lowPrice = prices.length ? Math.min(...prices) : undefined;
  const highPrice = prices.length ? Math.max(...prices) : undefined;
  const url = getProductUrl(product, DOMAIN);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.seo?.productName || product.name,
    description: product.seo?.schemaDescription || product.seo?.description || '',
    image: productImages(product, detail).map(absoluteAssetUrl),
    sku: String(product.id),
    brand: { '@type': 'Brand', name: 'LEBE' },
    material: product.material || '82% polyester, 18% spandex',
    color: product.color || '',
    audience: { '@type': 'PeopleAudience', suggestedGender: product.audienceGender || 'female' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: lowPrice === undefined ? undefined : lowPrice.toFixed(2),
      highPrice: highPrice === undefined ? undefined : highPrice.toFixed(2),
      offerCount: variants.length || undefined,
      availability: 'https://schema.org/MadeToOrder',
      itemCondition: 'https://schema.org/NewCondition',
      url,
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'US',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
        merchantReturnLink: `${DOMAIN}/returns`,
      },
    },
  };

  return schema;
}

function renderProductTemplate(product, detail = null) {
  const images = productImages(product, detail);
  const primaryImage = images[0] || '';
  const alt = productAlt(product);
  const variants = detail?.variants?.length ? detail.variants : product.variants || [];
  const prices = variantPrices(variants);
  const displayPrice = prices.length ? formatMoney(Math.min(...prices)) : '';
  const highlights = productHighlights(product);

  const mobileSlides = images.slice(1, 4).map((image, index) => `
          <li class="splide__slide">
            <div class="aspect-[4/5] overflow-hidden bg-neutral-100">
              <img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" class="h-full w-full object-cover" loading="lazy" decoding="async" />
            </div>
          </li>`).join('\n');

  const desktopImages = images.slice(1, 4).map((image) => `
      <div class="aspect-[4/5] overflow-hidden bg-neutral-100">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" class="h-full w-full object-cover" loading="lazy" decoding="async" />
      </div>`).join('\n');

  return productTemplate
    .replaceAll('{{PRODUCT_PRIMARY_IMAGE}}', escapeHtml(primaryImage))
    .replaceAll('{{PRODUCT_MOBILE_SLIDES}}', mobileSlides)
    .replaceAll('{{PRODUCT_DESKTOP_IMAGES}}', desktopImages)
    .replaceAll('{{PRODUCT_IMAGE_ALT}}', escapeHtml(alt))
    .replaceAll('{{PRODUCT_NAME}}', escapeHtml(productDisplayName(product)))
    .replaceAll('{{PRODUCT_PRICE}}', escapeHtml(displayPrice))
    .replaceAll('{{PRODUCT_STORY}}', escapeHtml(productStory(product)))
    .replaceAll('{{PRODUCT_HIGHLIGHT_1}}', escapeHtml(highlights[0]))
    .replaceAll('{{PRODUCT_HIGHLIGHT_2}}', escapeHtml(highlights[1]))
    .replaceAll('{{PRODUCT_HIGHLIGHT_3}}', escapeHtml(highlights[2]))
    .replaceAll('{{PRODUCT_WHY}}', escapeHtml(product.pdp?.why || ''))
    .replaceAll('{{PRODUCT_FIT}}', escapeHtml(product.pdp?.fit || ''))
    .replaceAll('{{PRODUCT_FABRIC}}', renderParagraphs(product.pdp?.fabric || ''));
}

function productDetailMap(feedProducts = []) {
  return feedProducts.reduce((acc, item) => {
    if (item?.product?.id) acc[String(item.product.id)] = item;
    return acc;
  }, {});
}

function cleanProductOutput() {
  fs.rmSync(getPath('src', 'product.html'), { force: true });
  fs.rmSync(getPath('src', 'product'), { recursive: true, force: true });
  fs.mkdirSync(getPath('src', 'product'), { recursive: true });
}

function cleanAppleDoubleFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  fs.readdirSync(dirPath)
    .filter((fileName) => fileName.startsWith('._'))
    .forEach((fileName) => {
      fs.rmSync(path.join(dirPath, fileName), { force: true });
    });
}

function buildProductPages(feedProducts = []) {
  const detailsById = productDetailMap(feedProducts);
  const productDir = getPath('src', 'product');
  cleanProductOutput();

  getPublishedProducts().forEach((product) => {
    if (!product.slug) return;

    const detail = detailsById[String(product.id)] || null;
    const images = productImages(product, detail);
    const contentHtml = renderProductTemplate(product, detail);
    const productUrl = getProductUrl(product, DOMAIN);
    const jsonLd = buildProductJsonLd(product, detail);
    const preloads = images.slice(0, 4).map((image, index) => `
  <link rel="${index === 0 ? 'preload' : 'prefetch'}" as="image" href="${escapeHtml(image)}"${index === 0 ? ' fetchpriority="high"' : ''} />`).join('');

    const html = assemblePage({
      slug: `product/${product.slug}`,
      canonicalUrl: productUrl,
      title: product.seo?.title || `${product.name} | LEBE`,
      description: product.seo?.description || product.feed?.description || '',
      bodyClass: 'bg-[#e9e9e9] text-[#050505]',
      headerClass: '',
      ogType: 'product',
      ogImage: absoluteAssetUrl(images[0] || ''),
      extraHead: `
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css" />${preloads}
  <script>
    window.LEBE_PRODUCT_ID = ${Number(product.id)};
    window.LEBE_PDP_PRELOAD_IMAGES = ${escapeScriptJson(images)};
    window.LEBE_PDP_IMAGE_ALT = ${escapeScriptJson(productAlt(product))};
  </script>
  <script id="ld-json-product" type="application/ld+json">${escapeScriptJson(jsonLd)}</script>`,
      scripts: `
<script src="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js"></script>
<script src="/js/product-data.js" defer></script>
<script src="/js/cart.js" defer></script>
<script src="/js/product-model.js" defer></script>
<script src="/js/product-gallery.js" defer></script>
<script src="/js/product-size-guide.js" defer></script>
<script src="/js/product.js" defer></script>`,
      contentHtml,
    });

    fs.writeFileSync(getPath('src', 'product', `${product.slug}.html`), html);
    console.log(`Built HTML: product/${product.slug}.html`);
  });

  cleanAppleDoubleFiles(productDir);
}

// 2. Define compilation engine
function assemblePage(config) {
  const newsletterHtml = config.homeNewsletter ? getHomeNewsletterSignupHtml() : '';
  const contentSource = config.contentHtml ?? fs.readFileSync(getPath(config.contentFile), 'utf8');
  const content = contentSource
    .replaceAll('{{HOME_NEWSLETTER_SIGNUP}}', newsletterHtml)
    .replaceAll('{{HOME_PRODUCT_GRID}}', renderHomeProductGridHtml())
    .replaceAll('{{HOME_MOVEMENT_BAND}}', config.slug === 'index' ? getHomeMovementBandHtml() : '')
    .replaceAll('{{HOME_ITEM_LIST_JSON_LD}}', config.slug === 'index' ? getHomeItemListJsonLd() : '');

  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION
    ? `<meta name="google-site-verification" content="${process.env.GOOGLE_SITE_VERIFICATION}" />`
    : '';

  const canonicalUrl = config.canonicalUrl || `${DOMAIN}${config.slug === 'index' ? '' : '/' + config.slug}`;
  const ogType = config.ogType || 'website';
  const ogImage = config.ogImage || `${DOMAIN}/assets/images/lebeHero1.jpg`;
  const metaPixelCode = getMetaPixelCode();
  const pinterestTagCode = getPinterestTagCode();

  // Substitute head place holders
  let head = headTemplate
    .replaceAll('{{TITLE}}', config.title)
    .replaceAll('{{DESCRIPTION}}', config.description)
    .replaceAll('{{GOOGLE_SITE_VERIFICATION}}', googleVerification)
    .replaceAll('{{META_PIXEL_CODE}}', metaPixelCode)
    .replaceAll('{{PINTEREST_TAG_CODE}}', pinterestTagCode)
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
    .replaceAll('{{SCRIPTS}}', `${analyticsScript}\n${config.scripts || ''}\n${bagIndicatorScript}\n${config.homeNewsletter ? klaviyoSignupScript : ''}`);

  // Concatenate parts
  return `${head}\n${header}\n${content}\n${footerTemplate.replaceAll('{{FOOTER_SIGNUP}}', '')}\n${scripts}`;
}

// 3. Define configuration for core HTML pages
const corePages = [
  {
    slug: 'index',
    title: 'LEBE — Saguanari Yoga Wear',
    description: 'Discover LEBE Saguanari made-to-order yoga wear: high-waist leggings and racerback sports bras. Production takes about 14 days.',
    bodyClass: 'bg-white text-[#050505]',
    headerClass: 'lebe-header--hero',
    extraHead: '<link rel="preload" as="image" href="/assets/images/lebeHero1.jpg" fetchpriority="high" />',
    homeNewsletter: true,
    scripts: `
<script src="/js/product-data.js" defer></script>
<script src="/js/product-model.js" defer></script>
<script src="/js/html-utils.js" defer></script>
<script src="/js/main.js" defer></script>`,
    contentFile: 'src/partials/home/_hero.html'
  },
  {
    slug: 'cart',
    title: 'Cart — LEBE',
    description: 'Review your cart and proceed to checkout.',
    bodyClass: 'bg-white text-[#050505]',
    headerClass: '',
    extraHead: `<script src="https://js.stripe.com/v3/"></script>\n${getStripePublishableKeyScript()}`,
    scripts: `
<script src="/js/product-data.js" defer></script>
<script src="/js/cart.js" defer></script>
<script src="/js/product-model.js" defer></script>
<script src="/js/html-utils.js" defer></script>
<script src="/js/main.js" defer></script>
<script src="/js/checkout.js" defer></script>`,
    contentFile: 'src/partials/cart/_cart.html'
  },
  {
    slug: 'size-guide',
    title: 'Size Guide — LEBE',
    description: 'Body and garment measurements for LEBE leggings and bras, with fit guidance for between sizes.',
    bodyClass: 'bg-white text-[#050505]',
    headerClass: '',
    extraHead: '',
    scripts: '',
    contentFile: 'src/partials/size-guide/_size-guide.html'
  },
  {
    slug: 'contact',
    title: 'Contact — LEBE',
    description: 'Contact LEBE for general product, order, and policy questions.',
    bodyClass: 'bg-white text-[#050505]',
    headerClass: '',
    extraHead: '',
    scripts: `<script src="/js/support-form.js" defer></script>`,
    contentFile: 'src/partials/contact/_contact.html'
  },
  {
    slug: 'order-issue',
    title: 'Order Issue — LEBE',
    description: 'Report a damaged, defective, incorrect, or missing LEBE order.',
    bodyClass: 'bg-white text-[#050505]',
    headerClass: '',
    extraHead: '',
    scripts: `<script src="/js/support-form.js" defer></script>`,
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

buildProductPages();

// 4. Define and Compile Policy Pages
const UPDATED = 'June 2026';
const returnsMerchantPolicyJsonLd = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MerchantReturnPolicy",
  "name": "LEBE Returns & Refunds",
  "url": "https://www.lebe.life/returns",
  "applicableCountry": "US",
  "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
  "merchantReturnLink": "https://www.lebe.life/returns",
  "returnMethod": "https://schema.org/ReturnByMail",
  "returnFees": "https://schema.org/FreeReturn",
  "returnShippingFeesAmount": {
    "@type": "MonetaryAmount",
    "value": 0,
    "currency": "USD"
  },
  "refundType": "https://schema.org/FullRefund"
}
</script>`;
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
    extraHead: returnsMerchantPolicyJsonLd,
    updated: 'July 2026',
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
          'Refunds are issued to the original payment method within 5–10 business days of approval.',
        ],
      },
      {
        heading: 'Return shipping.',
        body: [
          'Approved damaged, defective, or incorrect orders do not need to be shipped back. There is no return shipping cost.',
          'Because every item is made to order, we do not accept returns for size, fit, or change of mind. No return shipping applies.',
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
    .replaceAll('{{UPDATED}}', policy.updated || UPDATED);
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
    extraHead: policy.extraHead || '',
    scripts: '' // base scripts only (Meta Pixel will be loaded by scriptsTemplate)
  };

  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION
    ? `<meta name="google-site-verification" content="${process.env.GOOGLE_SITE_VERIFICATION}" />`
    : '';

  const canonicalUrl = `${DOMAIN}/${policy.slug}`;
  const ogType = 'website';
  const ogImage = `${DOMAIN}/assets/images/lebeHero1.jpg`;
  const metaPixelCode = getMetaPixelCode();
  const pinterestTagCode = getPinterestTagCode();

  // Compile full page html
  let head = headTemplate
    .replaceAll('{{TITLE}}', config.title)
    .replaceAll('{{DESCRIPTION}}', config.description)
    .replaceAll('{{GOOGLE_SITE_VERIFICATION}}', googleVerification)
    .replaceAll('{{META_PIXEL_CODE}}', metaPixelCode)
    .replaceAll('{{PINTEREST_TAG_CODE}}', pinterestTagCode)
    .replaceAll('{{CANONICAL_URL}}', canonicalUrl)
    .replaceAll('{{OG_TYPE}}', ogType)
    .replaceAll('{{OG_IMAGE}}', ogImage)
    .replaceAll('{{EXTRA_HEAD}}', config.extraHead)
    .replaceAll('{{BODY_CLASS}}', config.bodyClass);

  let header = headerTemplate
    .replaceAll('{{HEADER_CLASS}}', config.headerClass);

  let scripts = scriptsTemplate
    .replaceAll('{{SCRIPTS}}', `${analyticsScript}\n${config.scripts || ''}\n${bagIndicatorScript}`);

  const fullHtml = `${head}\n${header}\n${contentHtml}\n${footerTemplate.replaceAll('{{FOOTER_SIGNUP}}', '')}\n${scripts}`;
  
  fs.writeFileSync(getPath('src', `${policy.slug}.html`), fullHtml);
  console.log(`Built HTML: ${policy.slug}.html`);
});

// 5. Generate Dynamic XML Sitemap
function buildSitemap() {
  try {
    const urls = [];

    // Core static pages
    const staticSlugs = ['index', 'cart', 'contact', 'order-issue', 'privacy', 'shipping', 'returns', 'size-guide', 'care', 'terms'];
    staticSlugs.forEach((slug) => {
      const path = slug === 'index' ? '' : `/${slug}`;
      urls.push(`${DOMAIN}${path}`);
    });

    // Dynamic product pages
    getPublishedProducts().forEach((product) => {
      const url = getProductUrl(product, DOMAIN);
      if (url) urls.push(url);
    });

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
  const publishedProduct = getPublishedProductById(productId) ||
    getPublishedProductByExternalId(product.external_id);
  if (publishedProduct?.feed) {
    return publishedProduct.feed;
  }

  const haystack = [
    product.name,
    productsData.colorVariants?.[String(productId)]?.displayName,
  ].filter(Boolean).join(' ').toLowerCase();

  if (haystack.includes('bra')) {
    return {
      category: 'Apparel & Accessories > Clothing > Activewear',
      productType: 'Activewear > Sports Bras',
      titleBase: 'Saguanari Sports Bra',
      description: 'Made-to-order LEBE sports bra with premium all-over print artwork.',
    };
  }

  return {
    category: 'Apparel & Accessories > Clothing > Activewear',
    productType: 'Activewear > Leggings',
    titleBase: 'Saguanari Leggings',
    description: 'Made-to-order LEBE leggings with premium all-over print artwork.',
  };
}

function variantOption(variant = {}, key = '') {
  const option = (variant.options || []).find((item) => String(item.id || '').toLowerCase() === key.toLowerCase());
  return option?.value || '';
}

function variantColor(product = {}, variant = {}) {
  const publishedProduct = getPublishedProductByExternalId(product.external_id);
  if (publishedProduct?.color) return publishedProduct.color;

  const colors = getColorVariants(product.id) || [];
  const current = colors.find((color) => String(color.productId) === String(product.id));
  if (current?.name) return current.name;

  return variant.color || variantOption(variant, 'color') || 'Default';
}

function productGroupId(product = {}) {
  return String(product.id || product.external_id || '');
}

function variantSize(variant = {}) {
  return variant.size || variantOption(variant, 'size') || 'One Size';
}

function formatFeedPrice(value) {
  const amount = Number.parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return `${amount.toFixed(2)} USD`;
}

function buildFeedItem({ product, variant, image, itemGroupId, kind, availability = 'in_stock' }) {
  const productId = product.id;
  const syncVariantId = variant.syncVariantId || variant.id || variant.sync_variant_id || `${productId}-${variant.variant_id || variantSize(variant)}`;
  const color = variantColor(product, variant);
  const size = variantSize(variant);
  const title = kind.title || kind.titleBase || product.name;
  const link = getProductUrl(productId, DOMAIN);
  const price = formatFeedPrice(variant.retail_price || variant.price);
  const additionalImages = (productImages(product).slice(1, 4))
    .map((additionalImage) => `      <g:additional_image_link>${escapeXml(normalizeFeedUrl(additionalImage))}</g:additional_image_link>`)
    .join('\n');

  if (!price || !image || !link) return '';

  return `    <item>
      <g:id>${escapeXml(syncVariantId)}</g:id>
      <g:item_group_id>${escapeXml(itemGroupId)}</g:item_group_id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(kind.description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(normalizeFeedUrl(image))}</g:image_link>
${additionalImages ? `${additionalImages}\n` : ''}      <g:availability>${escapeXml(availability)}</g:availability>
      <g:inventory>999</g:inventory>
      <g:quantity_to_sell_on_facebook>999</g:quantity_to_sell_on_facebook>
      <g:price>${escapeXml(price)}</g:price>
      <g:brand>LEBE</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>${escapeXml(kind.category)}</g:google_product_category>
      <g:product_type>${escapeXml(kind.productType)}</g:product_type>
      <g:color>${escapeXml(color)}</g:color>
      <g:size>${escapeXml(size)}</g:size>
      <g:size_type>regular</g:size_type>
      <g:size_system>US</g:size_system>
      <g:material>82% polyester, 18% spandex</g:material>
      <g:gender>female</g:gender>
      <g:age_group>adult</g:age_group>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
}

function buildLocalFeedProducts() {
  return getPublishedProducts().map((product) => {
    const variants = (product.variants || []).map((variant) => ({
      ...variant,
      color: variant.color || product.color,
    }));

    return {
      product: {
        ...product,
        external_id: product.externalId,
      },
      variants,
      images: productImages(product),
    };
  });
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

function buildFeedXml(items) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>LEBE — Saguanari Yoga Wear</title>
    <link>${DOMAIN}</link>
    <description>Made-to-order activewear.</description>
${items.join('\n')}
  </channel>
</rss>`;
}

async function buildProductsFeed() {
  try {
    const feedProducts = buildLocalFeedProducts().filter(Boolean);
    buildProductPages(feedProducts);

    const googleItems = [];
    const metaItems = [];

    feedProducts.forEach(({ product, variants, images }) => {
      const kind = productKind(product, product.id);
      const itemGroupId = productGroupId(product);
      const image = images[0] || '';

      variants.forEach((variant) => {
        const googleItem = buildFeedItem({
          product,
          variant,
          image,
          itemGroupId,
          kind,
          availability: 'in_stock',
        });
        if (googleItem) googleItems.push(googleItem);

        const metaItem = buildFeedItem({
          product,
          variant,
          image,
          itemGroupId,
          kind,
          availability: 'in stock',
        });
        if (metaItem) metaItems.push(metaItem);
      });
    });

    fs.writeFileSync(getPath('src', 'products-feed.xml'), buildFeedXml(googleItems));
    fs.writeFileSync(getPath('src', 'products-feed-meta.xml'), buildFeedXml(metaItems));
    console.log(`Built XML: products-feed.xml (${googleItems.length} items)`);
    console.log(`Built XML: products-feed-meta.xml (${metaItems.length} items)`);
  } catch (error) {
    console.error('Error building products feed:', error.message);
    throw error;
  }
}

buildProductsFeed();
