# Portfolio Architecture

## Site Model
Multi-page static site

## Stack
- HTML
- JavaScript
- Tailwind CSS

## Deployment
- GitHub
- Vercel

## Backend
None by default

## Styling
Tailwind CSS is the implementation layer.

Use Tailwind for:
- spacing
- layout
- typography
- responsive behavior
- utility styling
- transitions where useful

## Design System
This project uses a custom Editorial Product Portfolio design system.

See:
- docs/design-system.md

## CSS Entry Point
- `src/input.css` — Tailwind source
- `src/output.css` — compiled output (do not edit directly)

## Page Structure
- `src/index.html` — homepage
- `src/about.html` — about page
- `src/case-study.html` — case study template

## JS Structure
- keep JS minimal
- use JS only for interactions that add real value
- keep motion lightweight and purposeful

## Content Strategy
- page structure in HTML
- long-form writing in `content/`
- case study writing kept separate from layout

## Rule
Keep the site clean, visual, polished, and easy to expand.
