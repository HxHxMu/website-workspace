#!/usr/bin/env node
/**
 * generate-images — Generate placeholder images via Pollinations.ai (free, no key)
 *
 * Usage:
 *   node generate.js --manifest <path-to-manifest.json> [--out-dir <override>]
 *
 * Manifest format: see manifest.example.json
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve, isAbsolute } from "node:path";

// ── Parse args ──
const args = process.argv.slice(2);
let manifestPath = null;
let outDirOverride = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--manifest" && args[i + 1]) manifestPath = args[++i];
  if (args[i] === "--out-dir" && args[i + 1]) outDirOverride = args[++i];
}

if (!manifestPath) {
  console.error("Usage: node generate.js --manifest <path-to-manifest.json>");
  process.exit(1);
}

// Resolve manifest relative to cwd
manifestPath = isAbsolute(manifestPath) ? manifestPath : resolve(process.cwd(), manifestPath);

const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
console.log(`Loaded ${manifest.length} image(s) from manifest\n`);

// ── Style prefix ──
const STYLE_PREFIX = `Realistic high-fidelity UI mockup screenshot, dark theme, near-black background, clean modern premium design, no watermarks.`;

// ── Generate images ──
const manifestDir = dirname(manifestPath);

for (const item of manifest) {
  const { id, prompt, output, width = 1024, height = 768 } = item;
  const outputPath = isAbsolute(output)
    ? output
    : resolve(outDirOverride || manifestDir, output);

  const fullPrompt = `${STYLE_PREFIX} ${prompt}`;
  const encoded = encodeURIComponent(fullPrompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${id.length * 7}`;

  console.log(`Generating: ${id}`);
  console.log(`  Prompt: ${prompt.slice(0, 80)}...`);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buffer);
    console.log(`  Saved: ${outputPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }

  // Be polite to the free API
  await new Promise((r) => setTimeout(r, 3000));
}

console.log("\nDone.");
