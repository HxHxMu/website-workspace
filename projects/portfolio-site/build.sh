#!/usr/bin/env bash
# Build all HTML pages from partials
# Usage: ./build.sh

set -e

S="src/partials/shared"
H="src/partials/home"
A="src/partials/about"
C="src/partials/case-study"

# ── index.html ──
cat \
  "$S/_head.html" \
  "$S/_nav.html" \
  "$H/_hero.html" \
  "$H/_perspective.html" \
  "$H/_work.html" \
  "$H/_artifacts.html" \
  "$H/_practice.html" \
  "$H/_environments.html" \
  "$H/_thesis.html" \
  "$H/_cta.html" \
  "$S/_footer.html" \
  "$S/_scripts.html" \
  > src/index.html

# ── about.html ──
cat \
  "$S/_head-about.html" \
  "$S/_nav.html" \
  "$A/_hero.html" \
  "$A/_bio.html" \
  "$A/_cta.html" \
  "$S/_footer.html" \
  "$S/_scripts-page.html" \
  > src/about.html

# ── case-study.html ──
cat \
  "$S/_head-case-study.html" \
  "$S/_nav.html" \
  "$C/_hero.html" \
  "$C/_overview.html" \
  "$C/_content.html" \
  "$C/_nav.html" \
  "$S/_footer.html" \
  "$S/_scripts-page.html" \
  > src/case-study.html

# ── CSS ──
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --minify

echo "Built: index.html, about.html, case-study.html"
