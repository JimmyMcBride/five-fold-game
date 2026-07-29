---
updated: '2026-07-29T05:49:42Z'
---

# Project Workflows

## Start

1. Read `AGENTS.md` and relevant Brain context.
2. Run `brain prep --task "<task>"` or reuse the active session with `brain prep`.
3. Read the approved Plan spec and relevant project-local skills.
4. Use `brain search` for focused rules/project retrieval.

## Implement

Use the narrowest applicable skill: game rules, engine, dungeon authoring, frontend, or backend. Rules-sensitive work must label canonical text, explicit adaptation, or unresolved ambiguity. Keep PocketBase privileged data server-side and keep engine code deterministic.

## Verify And Review

Run through Brain:

- `brain session run -- bun run lint`
- `brain session run -- bun run check`
- `brain session run -- bun run test:unit`
- `brain session run -- bun run build`
- `brain session run -- bun run test:e2e` for browser-flow changes

Then use `fivefold-review`, run `brain context audit`, update durable context, and finish with `brain session finish`.

## Plan Ownership

Plan uses GitHub source mode. Use Plan assess/promote. Do not manually create planning issues, labels, milestones, or projects unless Plan reports `manual_fallback_allowed=true`. Promotion apply requires user review and confirmation.
