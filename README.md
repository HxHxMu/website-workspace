# Website Workspace

Token-conscious workspace for:
- portfolio sites
- case study sites
- landing pages
- advanced marketing websites

## Global defaults
- Tailwind CSS
- GitHub
- Vercel
- static-first architecture
- no database by default
- optional Supabase only when needed

## Context model
- `.claude/system` = global rules
- `.claude/identity` = personal context, opt-in only
- `projects/*` = isolated project context
- `tools/visual-loop` = screenshot comparison workflow

## Design rule
Tailwind is global.
Design systems are chosen per project.

## Portfolio rule
The portfolio uses a custom Editorial Product Portfolio design system.

## Visual matching
Reference-driven visual matching lives in:
- project refs/
- project visual-tests/
- tools/visual-loop/
