# Website Defaults

## Global Stack Defaults
- HTML
- JavaScript
- Tailwind CSS (global default)
- Vercel deployment
- GitHub source control
- static-first architecture
- no database by default

## Tailwind Rule
Tailwind CSS is the global default styling framework across all projects in this workspace.

Use Tailwind as the implementation layer for:
- spacing
- layout
- typography
- responsive behavior
- utility styling
- transitions where useful

Avoid writing large custom CSS systems unless the project clearly requires it.

## Design System Rule
Design systems are defined per project — not globally.

Do NOT apply one visual system across all projects.

Each project must define its own design system and visual language.

Possible project-level design system choices:
- custom portfolio system
- custom brand system
- custom editorial system
- Material Design 3 (when appropriate)
- other project-specific UI systems

## Material Design Rule
Material Design is optional and per project only.

Use Material Design only when a project benefits from:
- product/app-like UI
- dashboard behavior
- highly structured interface patterns
- familiar systemized interaction models

Do not use Material by default for:
- portfolio sites
- editorial sites
- luxury marketing pages
- brand-heavy landing pages

## Motion Rule
Motion is defined per project.

Default motion principles (unless overridden):
- subtle
- purposeful
- fast
- not distracting
- reinforce hierarchy, feedback, and delight

Prefer:
- CSS-first motion
- lightweight transitions
- hover/focus/scroll polish
- minimal JS for interaction

Avoid:
- excessive animation
- motion for decoration only
- heavy animation libraries unless clearly justified

## Backend Rule
Do not assume a backend is needed.

Supabase is optional only — use when a project explicitly needs:
- authentication
- persistent data
- uploads / storage
- dashboards
- custom workflows
- gated or user-specific experiences

## Architecture Defaults
- multi-page by default unless SPA behavior is justified
- modular components
- reusable sections
- content separated when useful
- minimal dependencies
- progressive enhancement

## Accessibility Defaults
Always maintain:
- semantic structure
- keyboard usability
- visible focus states
- readable contrast
- reduced motion awareness where relevant

## Performance Defaults
Prefer:
- optimized assets
- minimal JS
- small bundles
- lazy loading where appropriate
- clean semantic markup
