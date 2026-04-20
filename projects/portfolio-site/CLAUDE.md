# Project Context

## Project Type
Portfolio / case study site

## Goal
Build a polished portfolio and case study website for Luis E. Bonilla that feels high-end, modern, thoughtful, and visually distinctive.

## Stack
- HTML
- JavaScript
- Tailwind CSS
- Vercel deployment
- static-first architecture

## Source of Truth
- `src/partials/` for page composition
- `src/css/` for custom styling layers
- `src/js/` for runtime behavior
- `content/` for written project content when populated
- `refs/` and `visual-tests/` for visual matching inputs
- `docs/architecture.md` for technical build and guardrail rules

## Constraints
- strong visual clarity
- polished interaction design
- modern landing-page quality
- modular case study structure
- easy content updates

## Design System & Visual Direction
This project uses a custom **Editorial Product Portfolio** design system. Do NOT use Material Design or generic SaaS dashboard UI.
The visual language should feel premium, modern, editorial, thoughtful, and high-signal/low-clutter. It must read as "a product designer with elite visual taste and strong systems thinking." 

**Layout & Component Principles**: 
- Prefer strong spacing, large clean sections, and readable content width.
- Components should feel clean, lightweight, and refined. Avoid overbuilt UI chrome or app-like heaviness.
- Do not let Tailwind dictate the visual identity; the design system leads.

**Typography Principles**: Typography leads the system. Prioritize strong headline hierarchy, clear section rhythm, and elegant contrast between large and small text. The site currently uses **DM Sans**; preserve that choice unless there is a deliberate design reason to change it.

**Color Principles**:
- Preserve the existing warm-neutral palette, strong contrast, and restrained accent usage.
- Color tokens and palette values live in `src/css/base.css`.
- Maintain WCAG AA contrast for body text and primary UI states.
- Always verify contrast before shipping palette or typography changes.

## Motion
Follow standard website motion defaults (subtle, fast, purpose-driven).
Key focus areas for this project: hover states, reveal transitions, and interactive visual feedback.

## Identity Loading
Load identity and positioning references when working on portfolio framing, About content, case studies, or personal brand language.

### Interaction Language
- Preserve the site's existing interaction language unless intentionally redesigning it.
- Prefer pseudo-elements and CSS classes over inline styles for hover and active states.
- Keep motion subtle, fast, and purposeful.

## Pending — Post-MVP

**Case studies (intentionally excluded from MVP launch):**
- Work cards in `src/partials/home/_work.html` are commented out — restore when case study pages are ready
- Each card links to its own page (LFA, Disney, AI Workflow) — pages need to be built before re-enabling
- `case-study.html` exists and builds correctly but is not linked from the homepage
- "Cases" link removed from sidebar nav and overlay menu in `src/partials/shared/_sidebar.html` — restore both links (`#work`, data-section="work") when case studies are re-enabled

**Other:**
- Work collage grid finalization (Figma export)
- Deploy to Vercel and test across devices/browsers
