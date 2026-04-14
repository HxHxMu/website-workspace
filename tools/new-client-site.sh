#!/usr/bin/env bash
# Scaffold a new client site from projects/client-site-template
# Usage: ./tools/new-client-site.sh client-acme

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE_DIR="$ROOT_DIR/projects/client-site-template"

usage() {
  echo "Usage: ./tools/new-client-site.sh <project-slug>"
  echo "Example: ./tools/new-client-site.sh client-acme"
}

if [ "${1-}" = "" ]; then
  usage
  exit 1
fi

SLUG="$1"

if [[ ! "$SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "Error: project slug must match ^[a-z0-9-]+$"
  exit 1
fi

TARGET_DIR="$ROOT_DIR/projects/$SLUG"

if [ -e "$TARGET_DIR" ]; then
  echo "Error: target already exists at $TARGET_DIR"
  exit 1
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: template not found at $TEMPLATE_DIR"
  exit 1
fi

mkdir -p "$TARGET_DIR"
rsync -a \
  --exclude 'node_modules' \
  --exclude 'src/index.html' \
  --exclude 'src/output.css' \
  "$TEMPLATE_DIR"/ "$TARGET_DIR"/

find "$TARGET_DIR" -name '._*' -delete

if [ -f "$TARGET_DIR/package.json" ]; then
  perl -0777 -i -pe "s/\"name\":\\s*\"client-site-template\"/\"name\": \"$SLUG\"/" "$TARGET_DIR/package.json"
fi

echo "Created: projects/$SLUG"
echo "Next steps:"
echo "  cd projects/$SLUG"
echo "  npm install"
echo "  npm run build"
echo "  npm run serve"
echo "  # then from workspace root for delivery:"
echo "  ./tools/release-client-site.sh $SLUG"
