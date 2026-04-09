# Design System

Shared design system for the website workspace. Based on **Flowbite** with custom brand tokens.

## Structure

- `color-mapping.md` — Flowbite variable → brand color mapping
- `tokens.json` — Brand token definitions (exported from Figma)
- `tailwind.preset.js` — Workspace Tailwind preset (shared across projects)
- `flowbite-reference.txt` — Flowbite LLM reference (component specs for AI)

## Usage

### In Figma
- Import Flowbite UI Kit as a library
- Customize variables using `color-mapping.md`
- Design using Flowbite components + custom ones
- Export tokens as JSON

### In Code
- Projects extend `tailwind.preset.js`
- Use Flowbite Tailwind classes
- Keep implementations consistent across projects

## Projects Using This System
- portfolio-site
