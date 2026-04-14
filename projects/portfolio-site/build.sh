#!/usr/bin/env bash
# Build all HTML pages from partials
# Usage: ./build.sh

set -e

S="src/partials/shared"
H="src/partials/home"
A="src/partials/about"
C="src/partials/case-study"
AD="src/partials/components/adapters"

render_adapters() {
  local zone="$1"
  local file
  for file in "$AD"/"$zone"--*.html; do
    if [ -f "$file" ]; then
      cat "$file"
    fi
  done
}

# ── index.html ──
{
  cat "$S/_head.html"
  cat "$S/_nav.html"
  cat "$S/_theme-toggle.html"
  cat "$S/_sidebar.html"
  cat "$S/_intro.html"
  cat "$H/_hero.html"
  render_adapters "home-after-hero"
  cat "$H/_grid.html"
  render_adapters "home-after-grid"
  cat "$H/_values.html"
  render_adapters "home-after-values"
  cat "$H/_background.html"
  render_adapters "home-after-background"
  cat "$H/_experience.html"
  render_adapters "home-after-experience"
  cat "$H/_references.html"
  render_adapters "home-after-references"
  cat "$H/_about.html"
  render_adapters "home-after-about"
  cat "$H/_work.html"
  render_adapters "home-after-work"
  cat "$H/_contact.html"
  render_adapters "home-after-contact"
  cat "$S/_footer.html"
  cat "$S/_scripts.html"
} > src/index.html

# ── about.html ──
{
  cat "$S/_head-about.html"
  cat "$S/_nav.html"
  cat "$S/_theme-toggle.html"
  cat "$A/_hero.html"
  render_adapters "about-after-hero"
  cat "$A/_bio.html"
  render_adapters "about-after-bio"
  cat "$A/_cta.html"
  render_adapters "about-after-cta"
  cat "$S/_footer.html"
  cat "$S/_scripts-page.html"
} > src/about.html

# ── case-study.html ──
{
  cat "$S/_head-case-study.html"
  cat "$S/_nav.html"
  cat "$S/_theme-toggle.html"
  cat "$C/_hero.html"
  render_adapters "case-after-hero"
  cat "$C/_overview.html"
  render_adapters "case-after-overview"
  cat "$C/_content.html"
  render_adapters "case-after-content"
  cat "$C/_nav.html"
  render_adapters "case-after-nav"
  cat "$S/_footer.html"
  cat "$S/_scripts-page.html"
} > src/case-study.html

echo "Built HTML: index.html, about.html, case-study.html"
