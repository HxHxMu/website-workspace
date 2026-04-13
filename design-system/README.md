# Design System

Shared workspace design-system assets for projects that want common tokens or a shared Tailwind preset.

## Current Files
- `tokens.json` = brand token definitions exported from Figma
- `tailwind.preset.js` = shared Tailwind preset
- `README.md` = usage notes

## Rule
Tailwind may be shared across the workspace, but visual systems are still chosen per project.

## Usage
- Extend `tailwind.preset.js` only when a project actually benefits from shared tokens
- Keep project-specific visual decisions inside the project, not here
- Update this README when new shared files are added so references stay accurate

## Current Consumer
- `projects/portfolio-site/`
