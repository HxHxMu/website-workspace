# Website Workspace

Token-conscious workspace for static marketing sites, case studies, and portfolio projects.

## Global Defaults
- Tailwind CSS
- GitHub
- Vercel
- static-first architecture
- no database by default
- optional Supabase only when needed

## Context Layout
- `.claude/system/` = workspace-wide rules and routing
- `.claude/identity/` = personal background and case-study context
- `projects/*` = isolated project implementations and project-specific docs
- `design-system/` = shared tokens and preset-level guidance
- `tools/visual-loop/` = screenshot comparison workflow

## Documentation Strategy
- Keep global rules in the workspace root and `.claude/system/`
- Keep design language decisions inside each project
- Keep project docs aligned to files that actually exist
- Prefer short, current docs over aspirational doc trees

## Project Notes
- `projects/portfolio-site/` uses a custom Editorial Product Portfolio design system
- `projects/client-site-template/` is a lighter marketing-site starter

## Visual Matching
Reference-driven visual matching lives in:
- project `refs/`
- project `visual-tests/`
- `tools/visual-loop/`
