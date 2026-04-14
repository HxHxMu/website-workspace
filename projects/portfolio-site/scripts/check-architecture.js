#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const partialsRoot = path.join(projectRoot, 'src', 'partials');
const adaptersRoot = path.join(partialsRoot, 'components', 'adapters');
const cssRoot = path.join(projectRoot, 'src', 'css');
const jsRoot = path.join(projectRoot, 'src', 'js');

const adapterZones = new Set([
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

const allowedScriptPartials = new Set([
  path.join(partialsRoot, 'shared', '_scripts.html'),
  path.join(partialsRoot, 'shared', '_scripts-page.html')
]);

const allowedHeadPartials = new Set([
  path.join(partialsRoot, 'shared', '_head.html'),
  path.join(partialsRoot, 'shared', '_head-about.html'),
  path.join(partialsRoot, 'shared', '_head-case-study.html')
]);

const allowedExternalLinkHosts = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com'
]);

function walkFiles(dir, extension, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    if (entry.name.startsWith('._')) return;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absolute, extension, files);
      return;
    }
    if (entry.isFile() && absolute.endsWith(extension)) {
      files.push(absolute);
    }
  });
  return files;
}

function relativeFromRoot(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

const htmlFiles = walkFiles(partialsRoot, '.html').sort();
const cssFiles = walkFiles(cssRoot, '.css').sort();
const topLevelJsFiles = fs.readdirSync(jsRoot)
  .filter((file) => file.endsWith('.js') && !file.startsWith('._'))
  .map((file) => path.join(jsRoot, file))
  .sort();

const violations = [];
let inlineStyleCount = 0;
const discoveredScriptSources = [];

htmlFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = relativeFromRoot(filePath);
  const isAdapterFile = filePath.startsWith(`${adaptersRoot}${path.sep}`);

  const inlineScriptMatches = [...content.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>/gi)];
  if (inlineScriptMatches.length > 0) {
    violations.push(`${relPath}: contains inline <script> blocks (move logic into src/js).`);
  }

  const scriptTags = [...content.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  if (scriptTags.length > 0 && !allowedScriptPartials.has(filePath)) {
    violations.push(`${relPath}: only shared script partials can include <script src=...>.`);
  }

  scriptTags.forEach((match) => {
    const src = match[1];
    discoveredScriptSources.push(src);
    if (/^https?:\/\//i.test(src)) {
      violations.push(`${relPath}: external script source "${src}" is not allowed.`);
    }
    if (!src.startsWith('js/')) {
      violations.push(`${relPath}: script source "${src}" must use local js/ assets.`);
    }
    const jsAsset = path.join(projectRoot, 'src', src);
    if (!fs.existsSync(jsAsset)) {
      violations.push(`${relPath}: script source "${src}" does not exist at src/${src}.`);
    }
  });

  const linkTags = [...content.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  if (linkTags.length > 0 && !allowedHeadPartials.has(filePath)) {
    violations.push(`${relPath}: only shared head partials can include <link href=...>.`);
  }

  linkTags.forEach((match) => {
    const href = match[1];
    if (!/^https?:\/\//i.test(href)) return;
    const host = new URL(href).hostname.toLowerCase();
    if (!allowedExternalLinkHosts.has(host)) {
      violations.push(`${relPath}: external link host "${host}" is not in the allowlist.`);
    }
  });

  const inlineStyleMatches = content.match(/\sstyle\s*=\s*["'][^"']*["']/gi) || [];
  inlineStyleCount += inlineStyleMatches.length;

  const sourceUrlAttrMatches = [...content.matchAll(/data-component-source-url\s*=\s*["']([^"']+)["']/gi)];
  const adapterIdMatches = [...content.matchAll(/data-component-adapter\s*=\s*["']([^"']+)["']/gi)];
  const zoneAttrMatches = [...content.matchAll(/data-component-zone\s*=\s*["']([^"']+)["']/gi)];

  if (isAdapterFile) {
    const fileName = path.basename(filePath, '.html');
    const adapterMatch = fileName.match(/^([a-z0-9-]+)--([a-z0-9-]+)$/);
    if (!adapterMatch) {
      violations.push(`${relPath}: adapter filename must match "<zone>--<slug>.html".`);
    } else {
      const fileZone = adapterMatch[1];
      const fileSlug = adapterMatch[2];

      if (!adapterZones.has(fileZone)) {
        violations.push(`${relPath}: adapter zone "${fileZone}" is not allowed.`);
      }

      if (adapterIdMatches.length !== 1) {
        violations.push(`${relPath}: adapter must include exactly one data-component-adapter attribute.`);
      } else if (adapterIdMatches[0][1] !== fileSlug) {
        violations.push(`${relPath}: data-component-adapter must match slug "${fileSlug}".`);
      }

      if (zoneAttrMatches.length !== 1) {
        violations.push(`${relPath}: adapter must include exactly one data-component-zone attribute.`);
      } else if (zoneAttrMatches[0][1] !== fileZone) {
        violations.push(`${relPath}: data-component-zone must match zone "${fileZone}".`);
      }
    }

    if (sourceUrlAttrMatches.length !== 1) {
      violations.push(`${relPath}: adapter must include exactly one data-component-source-url attribute.`);
    } else if (!/^https?:\/\/\S+$/i.test(sourceUrlAttrMatches[0][1])) {
      violations.push(`${relPath}: data-component-source-url must be a valid absolute URL.`);
    }
  } else {
    if (sourceUrlAttrMatches.length > 0 || adapterIdMatches.length > 0 || zoneAttrMatches.length > 0) {
      violations.push(`${relPath}: component adapter metadata attributes are only allowed in adapter partials.`);
    }
  }
});

if (inlineStyleCount > 0) {
  violations.push(`inline style attributes found: ${inlineStyleCount} (must be 0; move styles into CSS classes).`);
}

const cssImportsOutsideEntry = cssFiles
  .filter((filePath) => path.basename(filePath) !== 'input.css')
  .filter((filePath) => /@import\s+/i.test(fs.readFileSync(filePath, 'utf8')))
  .map(relativeFromRoot);

if (cssImportsOutsideEntry.length > 0) {
  violations.push(
    `@import is only allowed in src/input.css. Found in: ${cssImportsOutsideEntry.join(', ')}`
  );
}

const jsSourcesSet = new Set(discoveredScriptSources);
const orphanTopLevelScripts = topLevelJsFiles
  .map((filePath) => `js/${path.basename(filePath)}`)
  .filter((srcPath) => !jsSourcesSet.has(srcPath));

if (orphanTopLevelScripts.length > 0) {
  violations.push(
    `top-level src/js files are not wired in shared script partials: ${orphanTopLevelScripts.join(', ')}`
  );
}

if (violations.length > 0) {
  console.error('\nArchitecture guardrail check failed:\n');
  violations.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('Architecture guardrail check passed.');
