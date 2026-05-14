#!/usr/bin/env bash
# Build index.html from partials
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
