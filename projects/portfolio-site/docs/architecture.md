# Portfolio Site Architecture Guardrails

This project is static-first and follows an anti-entanglement structure so component work stays isolated and predictable.

## Layer Boundaries

- `src/input.css` is the single CSS entrypoint.
- `src/css/base.css` owns global element defaults and resets only.
- `src/css/animations.css` owns animation primitives and reveal timing.
- `src/css/typography.css` owns reusable text scale/spacing classes.
- `src/css/components.css` owns section/component skins and visual systems.
- `src/css/utilities.css` owns shared utility classes used across sections.
- `src/js/reveal.js` owns shared reveal behavior for all pages.
- `src/js/main.js` owns home-only interaction logic.
- `src/js/orb-physics.js` owns orb simulation only.
- `src/partials/shared/*` owns all page shell concerns (head/nav/scripts/footer).
- `src/partials/home/*`, `about/*`, `case-study/*` own page content only.

## Hard Rules

- No inline `<script>` blocks in partials.
- No inline `style=""` attributes in partials.
- No external script CDNs in partials.
- Script tags are only allowed in:
  - `src/partials/shared/_scripts.html`
  - `src/partials/shared/_scripts-page.html`
- Link tags are only allowed in shared head partials.
- CSS `@import` is only allowed in `src/input.css`.

## 21st.dev Component Integration Pattern

When integrating a component from 21st.dev:

1. Generate an adapter partial:
   - `npm run adapter:new -- --zone <zone> --slug <name> --url <component-url>`
2. Paste/adapt markup inside `src/partials/components/adapters/<zone>--<name>.html`.
3. Keep source metadata on the adapter root element:
   - `data-component-zone`
   - `data-component-adapter`
   - `data-component-source-url`
4. Move visual styling into `components.css` (or `typography.css` if text-scale only).
5. If interaction is needed:
   - Home page behavior goes in `main.js` (isolated IIFE blocks).
   - Cross-page behavior goes in a shared JS file wired from shared script partials.
6. Never paste vendor scripts directly into section partials.
7. Validate with `npm run verify` before commit.

### Available Adapter Zones

- Home page:
  - `home-after-hero`
  - `home-after-grid`
  - `home-after-values`
  - `home-after-background`
  - `home-after-experience`
  - `home-after-references`
  - `home-after-about`
  - `home-after-work`
  - `home-after-contact`
- About page:
  - `about-after-hero`
  - `about-after-bio`
  - `about-after-cta`
- Case study page:
  - `case-after-hero`
  - `case-after-overview`
  - `case-after-content`
  - `case-after-nav`

## Guardrail Commands

- `npm run guardrails` checks architecture constraints.
- `npm run verify` runs guardrails + full build.
