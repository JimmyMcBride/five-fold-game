---
updated: '2026-07-29T05:41:32Z'
---

# Workflows

## Startup

1. Read `AGENTS.md` and relevant `.brain/context/` notes.
2. Run `brain prep --task "<task>"` when no validated session exists; otherwise `brain prep`.
3. Use `brain find` or `brain search` for focused rules/project retrieval.
4. Read the active Plan spec before implementation work.

## Skill Selection

- Rules-sensitive: `fivefold-game-rules`
- Pure domain: `fivefold-game-engine`
- Rooms/encounters/loot: `fivefold-dungeon-authoring`
- Svelte UI: `fivefold-frontend`
- Server/PocketBase: `fivefold-backend`
- Every implementation: `fivefold-testing`, then `fivefold-review`

Plan specs are canonical execution contracts. In GitHub source mode, use Plan assess/promote and never create planning issues, labels, milestones, or projects manually unless Plan reports `manual_fallback_allowed=true`.

## Required Verification

Run through Brain:

- `brain session run -- bun run lint`
- `brain session run -- bun run check`
- `brain session run -- bun run test:unit`
- `brain session run -- bun run build`
- `brain session run -- bun run test:e2e` for browser-flow changes

## Closeout

Run `brain context audit`, update durable context for meaningful changes, review the full diff through `fivefold-review`, then `brain session finish`.
