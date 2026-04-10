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

## Build & Architecture

### CSS Architecture
- **Layer structure**: `@layer utilities` → custom utilities, animations, components
- **Entry point**: `src/input.css` imports Tailwind, then custom CSS files
- **Tokenization**: Use CSS custom properties to reduce duplication
  - `--ww: 242 240 235` (warm-white RGB channels) — use as `rgba(var(--ww), <opacity>)`
  - Applied globally via `:root` in `base.css`
  - Single-point maintenance for palette changes
- **File organization**:
  - `tokens.css` — deleted (tokens now in tailwind.config.js)
  - `base.css` — root variables, HTML/body resets, selection styling
  - `animations.css` — @keyframes for reveals, orbs, transitions
  - `utilities.css` — component utilities, navigation, interactive elements
  - `typography.css` — heading scales (clamp-based), letter-spacing groups
  - `components.css` — card systems, atmospheric overlays, decorative elements

### Build Process
- **Command**: `./build.sh` in project root
- **Steps**:
  1. Concatenates HTML partials in order: head → nav → sidebar → home sections → footer → scripts
  2. Runs Tailwind CLI: `npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --minify`
  3. Outputs compiled site to `src/` directory
- **No build tools required**: Pure HTML concatenation + Tailwind compilation
- **JS handling**: External `src/js/main.js` (241 lines) loaded with `<script src="js/main.js" defer>`

### Responsive Design
- **Breakpoints**: Tailwind defaults (lg = 1024px)
- **Mobile-first media queries**: Test at 375px (mobile), 768px (tablet), 1024px+ (desktop)
- **Key patterns**:
  - Sidebar nav: hidden <1024px, fixed left at 1024px+
  - Hamburger menu: visible <1024px, hidden at 1024px+ (use `@media (min-width: 1024px) { display: none; }`, avoid `lg:hidden` Tailwind class)
  - Always remove conflicting utility classes from HTML when using custom @media rules

### Color System & Accessibility
- **Updated for WCAG AA** (4.5:1 contrast minimum):
  - `warm-white: #f2f0eb`
  - `warm-muted: #b8b0a8` (4.9:1 ratio, body text)
  - `warm-dim: #a89f96` (3.8:1 ratio, acceptable for large text)
- **Project accent**: `#e05c28` (orange, used for highlights/hovers)
- **Always verify contrast** before deploying

### JavaScript Architecture
- **One main file**: `src/js/main.js` (no build step, runs directly in browser)
- **Sections** (in order):
  1. Orb physics engine (hero section, ~95 lines)
  2. Hero parallax + fade on scroll
  3. Scroll reveal observer (IntersectionObserver)
  4. Hero title word-wrap animation
  5. Mobile menu toggle (click/escape handlers)
  6. Sidebar active link highlighting (scroll detection)
  7. Audience tab copy swapping
  8. Artifact tile hover label reveal
- **No frameworks**: Vanilla JS, requestAnimationFrame for physics, IntersectionObserver for reveals
- **Performance**: Debounce scroll listeners (passive: true), use `will-change` for animated elements

## Code Quality

### Avoid Dead Code
Periodically audit for unused patterns:
- Deleted classes: `.hero-frag-*`, `.float-slow`, `.placeholder-module`, `.card-visual-col`, `.img-perspective-fragment`
- Never commit unused @keyframes or utility classes
- Use `grep -r "class-name" src/` to verify usage before keeping code

### Navigation Hover States
- **Sidebar links**: Animated gradient underline slides from left (500ms, cubic-bezier easing) with subtle letter-spacing expansion
- **Overlay menu links**: Color fades white + radial glow appears (elastic scaleX 1.01)
- **Audience tabs**: Border glow expands (box-shadow 0 to 16px, warm accent color)
- **Pattern**: Use pseudo-elements (::before, ::after) for layered hover effects; avoid inline styles

### Inline Styles
❌ **Do NOT use inline `style="..."` attributes in HTML**
✓ Use CSS classes for all visual styles (ref: `/Users/luisbonilla/.claude/projects/-Volumes-lebe-website-workspace/memory/feedback_no_inline_styles.md`)

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

## Recent Optimizations (2026-04-09)

**Completed:**
- ✅ Architecture audit & cleanup (158 lines of dead CSS removed, -2.7kb minified output)
- ✅ CSS tokenization: `--ww` custom property for warm-white across 41 occurrences
- ✅ Extracted inline JS to external file (`src/js/main.js`, 241 lines)
- ✅ Removed empty `tokens.css` file
- ✅ Cleaned 50+ macOS resource fork files (`._*`), added to `.gitignore`
- ✅ Enhanced navigation hover states with trendy animations (gradient underline, glowing borders, elastic scale)
- ✅ Fixed hamburger menu visibility (removed conflicting `lg:hidden` Tailwind class)

**Files changed:**
- `src/css/components.css` (-62 lines)
- `src/css/animations.css` (-23 lines)
- `src/css/utilities.css` (-41 lines, +animation rules, +tokenization)
- `src/input.css` (-1 line, removed tokens.css import)
- `src/partials/shared/_scripts.html` (refactored to external script tag)
- `src/js/main.js` (new, 241 lines)
- `src/partials/shared/_sidebar.html` (fixed hamburger class)
- `.gitignore` (added `._*` pattern)

## Pending Tasks

**Content & Assets:**
- [ ] Profile photo → `src/assets/img/` + wire to contact section
- [ ] Work collage grid finalization (Figma export)
- [ ] Case study pages (currently link to generic placeholder)
- [ ] About page (not yet implemented)

**Deployment:**
- [ ] Commit optimizations to git
- [ ] Deploy to Vercel
- [ ] Test across devices/browsers
