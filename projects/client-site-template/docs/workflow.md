# Client Site Template Workflow

## Quick Start

1. Install dependencies:
   - `npm install`
2. Build:
   - `npm run build`
3. Preview locally:
   - `npm run serve`

## Project Editing

- Edit content in `src/partials/home/*`.
- Edit shell layout in `src/partials/shared/*`.
- Edit theme in `src/input.css` and `src/css/*`.
- Edit interactions in `src/js/main.js`.

## Deployment

This template is static-first and Vercel-ready (`vercel.json` included).

## Delivery (Standalone)

From workspace root:

- `./tools/release-client-site.sh <project-slug>`

This generates a deploy-ready delivery package under `deliveries/<project-slug>/<timestamp>/` with:

- `site/` static files only
- `checksums.sha256`
- `DELIVERY.md`

By default the release command blocks external runtime dependencies (CDN script/link and remote CSS imports).

Policy note:

- Projects named `client-*` are strict by default.
- Non-client slugs allow external runtime dependencies by default.
- Use `--strict-external` to force strict checks for any slug.
