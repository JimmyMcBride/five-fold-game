---
updated: '2026-07-29T17:59:35Z'
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

`package.json` owns Bun commands. `tsconfig.json` is the SvelteKit TypeScript project config and must stay aligned with generated `.svelte-kit/tsconfig.json` behavior.

Canonical rule imports use one pinned markdown export:

- `bun run rules:import -- <export.md>` regenerates all sections and the
  manifest after identity/hash/boundary validation.
- `bun run rules:verify -- <export.md>` performs the same validation without
  writing and must be clean after import.

## Required Verification

Run through Brain:

- `brain session run -- bun run lint`
- `brain session run -- bun run check`
- `brain session run -- bun run test:unit`
- `brain session run -- bun run build`
- `brain session run -- bun run test:e2e` for browser-flow changes

The curated `reference-100756` engine smoke must continue to reach victory with
all five v1 class templates and exercise each template’s signature feature. V2
uses pinned per-class seeds in `reference-runs.spec.ts`; every class must replay
identically to victory and exercise its signature feature.

## Closeout

Run `brain context audit`, update durable context for meaningful changes, review the full diff through `fivefold-review`, then `brain session finish`.
