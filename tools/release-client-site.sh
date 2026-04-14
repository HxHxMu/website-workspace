#!/usr/bin/env bash
# Build and package a standalone static delivery artifact for a project.
# Usage:
#   ./tools/release-client-site.sh <project-slug>
#   ./tools/release-client-site.sh <project-slug> --dry-run
#   ./tools/release-client-site.sh <project-slug> --allow-external
#   ./tools/release-client-site.sh <project-slug> --strict-external

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DELIVERIES_DIR="$ROOT_DIR/deliveries"
ALLOW_EXTERNAL=""
EXTERNAL_MODE_SET="false"
DRY_RUN="false"

usage() {
  echo "Usage: ./tools/release-client-site.sh <project-slug> [--dry-run] [--allow-external] [--strict-external]"
  echo "Example: ./tools/release-client-site.sh client-acme"
  echo "Default mode: client-* slugs are strict; non-client slugs allow external runtime deps."
}

if [ "${1-}" = "" ]; then
  usage
  exit 1
fi

SLUG="$1"
shift

if [[ ! "$SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "Error: project slug must match ^[a-z0-9-]+$"
  exit 1
fi

# Default policy:
# - client-* projects are strict by default (block external runtime deps)
# - non-client projects allow external runtime deps by default
if [[ "$SLUG" == client-* ]]; then
  ALLOW_EXTERNAL="false"
else
  ALLOW_EXTERNAL="true"
fi

while [ "${1-}" != "" ]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      ;;
    --allow-external)
      ALLOW_EXTERNAL="true"
      EXTERNAL_MODE_SET="true"
      ;;
    --strict-external)
      ALLOW_EXTERNAL="false"
      EXTERNAL_MODE_SET="true"
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

PROJECT_DIR="$ROOT_DIR/projects/$SLUG"
SRC_DIR="$PROJECT_DIR/src"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: project not found at $PROJECT_DIR"
  exit 1
fi

if [ ! -f "$PROJECT_DIR/package.json" ]; then
  echo "Error: expected package.json in $PROJECT_DIR"
  exit 1
fi

if [ ! -f "$PROJECT_DIR/build.sh" ]; then
  echo "Error: expected build.sh in $PROJECT_DIR"
  exit 1
fi

if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  echo "Installing dependencies in projects/$SLUG..."
  (cd "$PROJECT_DIR" && npm install)
fi

echo "Building projects/$SLUG..."
(cd "$PROJECT_DIR" && npm run build)

if [ ! -f "$SRC_DIR/index.html" ]; then
  echo "Error: build did not produce src/index.html"
  exit 1
fi

if [ ! -f "$SRC_DIR/output.css" ]; then
  echo "Error: build did not produce src/output.css"
  exit 1
fi

SCAN_OUTPUT="$(mktemp)"
if rg -n --glob '*.html' --glob '*.css' '<script[^>]+src=["'"'"']https?://|<link[^>]+href=["'"'"']https?://|@import\s+url\(["'"'"']?https?://' "$SRC_DIR" >"$SCAN_OUTPUT"; then
  if [ "$ALLOW_EXTERNAL" = "false" ]; then
    echo
    echo "Blocked: external runtime dependency detected."
    cat "$SCAN_OUTPUT"
    echo
    echo "Fix these references or rerun with --allow-external."
    rm -f "$SCAN_OUTPUT"
    exit 1
  fi
  echo
  if [ "$EXTERNAL_MODE_SET" = "true" ]; then
    echo "Warning: external runtime references detected and allowed by --allow-external."
  else
    echo "Warning: external runtime references detected and allowed by default for non-client projects."
    echo "Use --strict-external to enforce standalone dependency policy."
  fi
  cat "$SCAN_OUTPUT"
fi
rm -f "$SCAN_OUTPUT"

if [ "$DRY_RUN" = "true" ]; then
  echo "Dry run complete: build and dependency checks passed for projects/$SLUG."
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$DELIVERIES_DIR/$SLUG/$STAMP"
SITE_DIR="$RELEASE_DIR/site"
ARCHIVE="$RELEASE_DIR/${SLUG}-${STAMP}.tar.gz"

mkdir -p "$SITE_DIR"

rsync -a \
  --exclude 'partials' \
  --exclude 'css' \
  --exclude 'input.css' \
  --exclude '._*' \
  --exclude '.__*' \
  "$SRC_DIR"/ "$SITE_DIR"/

if [ ! -f "$SITE_DIR/index.html" ]; then
  echo "Error: delivery packaging failed to include index.html"
  exit 1
fi

(
  cd "$RELEASE_DIR"
  find site -type f -print | sort | while IFS= read -r file; do
    shasum -a 256 "$file"
  done > checksums.sha256
)

cat > "$RELEASE_DIR/DELIVERY.md" <<EOF
# Delivery Package

- Project: $SLUG
- Built: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
- Mode: standalone static delivery

## Contents

- \`site/\`: deploy-ready static site
- \`checksums.sha256\`: artifact integrity checks

## Deploy

Deploy the contents of \`site/\` directly to GitHub Pages, Vercel static hosting, Netlify, S3+CloudFront, or any static server.
EOF

tar -czf "$ARCHIVE" -C "$RELEASE_DIR" site checksums.sha256 DELIVERY.md

echo "Delivery created:"
echo "  $RELEASE_DIR"
echo "Archive:"
echo "  $ARCHIVE"
