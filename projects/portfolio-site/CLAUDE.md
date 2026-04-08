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
- docs/architecture.md
- docs/sitemap.md
- docs/design-system.md
- docs/decisions.md
- docs/content-model.md
- content/

## Constraints
- strong visual clarity
- polished interaction design
- modern landing-page quality
- modular case study structure
- easy content updates
- identity files are relevant here

## Design System
This project uses a custom Editorial Product Portfolio design system.

Do NOT use Material Design for this project.

The visual language should feel:
- premium
- modern
- editorial
- product-minded
- minimal but expressive
- visually intentional
- polished for recruiters, hiring managers, and creative/product teams

The portfolio should communicate:
- strong product thinking
- refined visual taste
- storytelling ability
- systems clarity

See: docs/design-system.md

## Motion
This project should include tasteful motion and micro-interactions where useful.

Preferred motion style:
- subtle
- elegant
- smooth
- premium-feeling
- not distracting

Good use cases:
- hover states
- reveal transitions
- CTA polish
- section transitions
- card interaction
- navigation feedback

Avoid:
- gimmicky motion
- excessive movement
- motion that slows clarity

## Identity Loading
Yes. Load identity files for portfolio, About, case studies, and personal positioning.

## Codex Delegation
When a task requires working with the real repo, delegate it to Codex instead of doing it inline.

Keep Claude focused on:
- strategy
- UX critique
- architecture
- writing
- synthesis
- decision-making

Delegate to Codex for:
- searching the codebase
- reading multiple files for implementation context
- editing code
- refactoring
- debugging
- running tests, lint, or builds
- checking diffs
- verifying what changed in the repo

When delegating, provide:
- the specific task
- only the necessary context
- relevant files or paths
- any constraints

Ask Codex to return only:
1. what changed
2. issues or tradeoffs
3. verification performed
4. a short summary to paste back into Claude

If there are meaningful product or architecture tradeoffs, Codex should surface them before making a major decision.
