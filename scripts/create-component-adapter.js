#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const allowedZones = new Set([
  'home-after-hero',
  'home-after-grid',
  'home-after-values',
  'home-after-background',
  'home-after-experience',
  'home-after-references',
  'home-after-about',
  'home-after-work',
  'home-after-contact',
  'about-after-hero',
  'about-after-bio',
  'about-after-cta',
  'case-after-hero',
  'case-after-overview',
  'case-after-content',
  'case-after-nav'
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith('--')) continue;
    const key = raw.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const args = parseArgs(process.argv);
const zone = String(args.zone || '').trim();
const slug = normalizeSlug(args.slug);
const sourceUrl = String(args.url || '').trim();
const title = String(args.title || slug || 'Component adapter').trim();

if (!allowedZones.has(zone)) {
  console.error('Invalid or missing --zone. Allowed zones:\n');
  [...allowedZones].forEach((z) => console.error(`- ${z}`));
  process.exit(1);
}

if (!slug) {
  console.error('Missing or invalid --slug. Example: --slug feature-tabs');
  process.exit(1);
}

if (!/^https?:\/\/\S+$/i.test(sourceUrl)) {
  console.error('Missing or invalid --url. Example: --url https://21st.dev/...');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const adaptersDir = path.join(projectRoot, 'src', 'partials', 'components', 'adapters');
const fileName = `${zone}--${slug}.html`;
const filePath = path.join(adaptersDir, fileName);

if (fs.existsSync(filePath)) {
  console.error(`Adapter already exists: ${fileName}`);
  process.exit(1);
}

const template = `<!-- Component Adapter: ${title} -->
<section
  class="component-adapter component-adapter--${slug}"
  data-component-zone="${zone}"
  data-component-adapter="${slug}"
  data-component-source-url="${sourceUrl}">
  <div class="mx-auto max-w-7xl px-6 md:px-10 py-16">
    <!-- Paste/adapt the component markup here. -->
  </div>
</section>
`;

fs.writeFileSync(filePath, template, 'utf8');
console.log(`Created adapter: src/partials/components/adapters/${fileName}`);
