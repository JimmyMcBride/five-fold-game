---
updated: '2026-07-29T08:06:48Z'
---

# Architecture

## Deterministic Domain

`src/lib/game/` is pure TypeScript. It may not import Svelte, SvelteKit routes, HTTP, browser persistence, or PocketBase. `resolveCommand(state, command, rng)` returns a new state plus narration-ready domain events. Input state stays unchanged. Randomness is injected through a seeded `RandomSource`.

`package.json` is the runtime manifest and canonical Bun script surface.

Core modules:

- `commands.ts` — player intent
- `events.ts` — readable domain outcomes
- `model.ts` / `state.ts` — serializable run model and initialization
- `rng.ts` — seeded deterministic source
- `engine.ts` — command resolution
- `src/lib/game/content/` — fixed class/enemy/room data and dungeon generation
- `projection.ts` — sanitized player-facing run projection

`scripts/` is reserved for disposable development utilities; no script is part
of the application runtime or verification contract unless promoted into
`package.json`.

## Application Boundary

`src/routes/+page.svelte` is the Obsidian + Bone playable alpha. UI submits
versioned commands and renders projections/events; it does not reimplement
outcomes. `src/hooks.server.ts` creates one PocketBase identity client per
request. `src/lib/server/pocketbase.ts` owns URL resolution, sanitized sessions,
and the request-scoped service-token client for locked run collections.
`src/lib/server/run-repository.ts` owns active runs, atomic command commits,
idempotency, resume, and history.

## Persistence Direction

Server-authoritative runs use snapshots plus append-only command/event history,
seeded replay data, and atomic `expectedVersion` checks. Illegal and stale
commands do not advance the version. Production commits use PocketBase’s
transactional batch endpoint, unique command IDs, and a unique resulting-version
index. The reviewed migration is present in source but remains unapplied to the
remote alpha instance.

## Rules And Content

Canonical rules live only in `docs/game-rules/`. Explicit browser adaptations live in `docs/adaptations/` or approved Plan specs. Table-era files under `docs/reference/fivefold-table/` are legacy references, not current product specs.
