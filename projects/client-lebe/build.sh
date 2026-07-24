#!/usr/bin/env bash
# Build site HTML using unified compilation engine
# Usage: ./build.sh

set -e

node scripts/build-html.js

# Validate presence of all compiled pages so full site build is consistent
for page in src/index.html src/cart.html src/privacy.html src/terms.html src/shipping.html src/returns.html src/size-guide.html src/care.html src/contact.html src/order-issue.html src/404.html src/products-feed.xml src/products-feed-meta.xml; do
  if [ ! -f "$page" ]; then
    echo "Missing compiled page: $page" >&2
    exit 1
  fi
done

if ! find src/product -name '*.html' -type f | grep -q .; then
  echo "Missing compiled product pages in src/product" >&2
  exit 1
fi

echo "Successfully verified all output HTML pages."
