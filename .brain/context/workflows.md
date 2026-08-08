---
updated: '2026-08-08T01:32:33Z'
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

Frontend-only derivation helpers live under `src/lib/ui/` with colocated Vitest
specs. Keep canonical eligibility in engine/server `LegalCommand` output; helpers
may order or filter that projection but must not reproduce range or guard rules.

`package.json` owns Bun commands. `tsconfig.json` is the SvelteKit TypeScript project config and must stay aligned with generated `.svelte-kit/tsconfig.json` behavior.
`vercel.json` pins production dependency installation to Bun 1.3.9 with the
frozen lockfile.

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

V3 changes must also retain the pinned v2 state/legal-command fixture, exercise
the eight-room guarantees over a seed matrix, and replay one deterministic
expedition per class through search, economy, item use, and signature combat.
Browser changes cover both desktop and mobile inventory, merchant, warning, and
relic-replacement states.

V4 changes must retain explicit v3 fixtures, exercise ambush XP and combat equip
legality without altering v3 replay, and cover chronological Tomb Record behavior
at bottom-pinned and manually reviewed scroll positions. Browser coverage also
keeps the complete enemy selector visible without its own scrollbar on desktop
and mobile.

V5 party changes must retain all v1-v4 fixtures; validate every one-, two-, and
three-class combination; cover actor ownership, individual initiative/AP, ally
targets, formation, Down/healing/wipe behavior, shared resources, authored
party-size composition, snapshot/idempotency/stale safety, and party summaries.
Command-boundary changes also cover malformed envelopes in the colocated
`src/routes/api/runs/[runId]/commands/server.spec.ts`, especially optional actor
and target field types, before repository orchestration is invoked.
Browser coverage includes keyboard roster/rank selection, active-member handoff,
ally commands, refresh/resume, member inspection, and mobile containment.

Authentication changes require focused server-route tests for successful and failed PocketBase calls, safe error redirects, registration validation, and automatic post-registration sign-in. Playwright keeps signed-out form semantics and the authenticated game flow covered.

## Closeout

Run `brain context audit`, update durable context for meaningful changes, review the full diff through `fivefold-review`, then `brain session finish`.
