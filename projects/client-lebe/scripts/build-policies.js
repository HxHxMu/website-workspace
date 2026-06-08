const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const template = fs.readFileSync(path.join(ROOT, 'src/partials/policies/_template.html'), 'utf8');

const UPDATED = 'June 2026';

const pages = [
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
          'All LEBE products are made to order. Shipping rates are calculated live at checkout based on your address and selected shipping method.',
        ],
      },
      {
        heading: 'Processing time.',
        body: [
          'Orders typically require 2–7 business days for production before shipment.',
        ],
      },
      {
        heading: 'Shipping time.',
        body: [
          'Most domestic U.S. orders arrive within 3–10 business days after shipment.',
          'Shipping times are estimates and are not guaranteed.',
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
        heading: 'Product & fabric disclaimers.',
        body: [
          'In areas where the fabric is double-layered, such as pockets, details from the inner fabric layer may subtly show through, especially with lighter designs.',
          'Contact with rough surfaces should be avoided, as they can pull white fibers from the fabric and damage the leggings.',
          'In case of low fabric stock, we may use comparable fabric to fulfill the order. Any substitute fabric will be as close to the original as possible.',
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
  },
];

function renderSections(sections) {
  return sections.map((section) => `
          <section>
            <h2>${section.heading}</h2>
            ${section.body.map((paragraph) => `<p>${paragraph}</p>`).join('\n            ')}
          </section>`).join('\n\n');
}

function renderPage(page) {
  return template
    .replaceAll('{{META_TITLE}}', page.metaTitle)
    .replaceAll('{{META_DESCRIPTION}}', page.metaDescription)
    .replaceAll('{{EYEBROW}}', page.eyebrow)
    .replaceAll('{{TITLE}}', page.title)
    .replaceAll('{{SIDE_TITLE}}', page.sideTitle)
    .replaceAll('{{SIDE_NOTE}}', page.sideNote)
    .replaceAll('{{CONTENT}}', renderSections(page.sections))
    .replaceAll('{{UPDATED}}', UPDATED);
}

pages.forEach((page) => {
  const target = path.join(ROOT, 'src', `${page.slug}.html`);
  fs.writeFileSync(target, `${renderPage(page)}\n`);
  console.log(`Built HTML: ${page.slug}.html`);
});
