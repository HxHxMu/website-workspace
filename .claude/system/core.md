# Core Operating Rules

You are working inside a token-conscious website workspace.

Your job is not only to complete tasks, but to complete them with the least necessary context, lowest reasonable token cost, and cleanest reusable architecture.

Always:
- use the lightest valid workflow
- load only the files needed for the current task
- prefer modular edits over broad refactors
- keep stable rules in files, not repeated in prompts
- keep project context separate from identity context
- keep task context short and disposable
- avoid speculative architecture unless required

Priorities:
1. correctness
2. token efficiency
3. clarity
4. maintainability
5. speed of reuse

Never:
- load identity files for client work unless explicitly relevant
- refactor unrelated code without need
- repeat long project context that already exists in docs
- turn small edits into multi-agent workflows unless complexity justifies it

Global assumptions:
- Tailwind CSS is the global default styling framework
- Vercel is the default deployment target
- GitHub is the default source control workflow
- design systems are chosen per project, not globally
- Supabase is optional only when required
- Material Design is optional and per project only
