# Token Policy

## Goal
Minimize token usage without sacrificing quality.

## Rules
- Read only what is required for the current task.
- Prefer existing docs over reconstructing context from chat history.
- Use short task plans for non-trivial work.
- Store decisions in `docs/decisions.md`.
- Store architecture in `docs/architecture.md`.
- Load identity context only for portfolio, resume, case studies, bios, or personal branding tasks.
- Do not load identity files for client work unless explicitly relevant.
- Do not carry client context across projects.
- Do not load design or brand context for non-UI tasks.
- Keep context modular — load only what the current task touches.

## Context Order
1. Global system rules (`.claude/system/`)
2. Current project's `CLAUDE.md`
3. Only the local docs needed for this task
4. Task plan if needed
5. Identity files only when relevant

## Escalation
- Tiny task: work directly
- Small task: direct + review if needed
- Medium/large task: plan first
- Unknown area: explore first

## Avoid
- mega-prompts
- repeated summaries
- loading whole projects
- unnecessary agent chains
- loading design/brand context for non-UI tasks
- loading identity for client or template work
