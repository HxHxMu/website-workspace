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
  "$S/_sidebar.html" \
  "$S/_intro.html" \
  "$H/_hero.html" \
  "$H/_grid.html" \
  "$H/_values.html" \
  "$H/_background.html" \
  "$H/_work.html" \
  "$H/_experience.html" \
  "$H/_contact.html" \
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

echo "Built HTML: index.html, about.html, case-study.html"
