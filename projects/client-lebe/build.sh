#!/usr/bin/env bash
# Build site HTML using unified compilation engine
# Usage: ./build.sh

set -e

node scripts/build-html.js

# Validate presence of all compiled pages so full site build is consistent
for page in src/index.html src/product.html src/cart.html src/privacy.html src/terms.html src/shipping.html src/returns.html src/contact.html src/order-issue.html; do
  if [ ! -f "$page" ]; then
    echo "Missing compiled page: $page" >&2
    exit 1
  fi
done

echo "Successfully verified all output HTML pages."
