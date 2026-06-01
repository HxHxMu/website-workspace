#!/usr/bin/env bash
# Build site HTML
# - index.html is composed from partials
# - product.html and cart.html are maintained as standalone templates
# Usage: ./build.sh

set -e

S="src/partials/shared"
H="src/partials/home"

cat \
  "$S/_head.html" \
  "$S/_header.html" \
  "$H/_hero.html" \
  "$S/_footer.html" \
  "$S/_scripts.html" \
  > src/index.html

echo "Built HTML: index.html"

# Validate presence of standalone pages so full site build is consistent
for page in src/product.html src/cart.html; do
  if [ ! -f "$page" ]; then
    echo "Missing required page: $page" >&2
    exit 1
  fi
done

echo "Verified HTML: product.html, cart.html"
