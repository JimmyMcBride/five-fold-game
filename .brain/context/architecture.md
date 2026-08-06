---
updated: '2026-08-06T18:46:56Z'
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

`scripts/import-game-rules.mjs` is a promoted verification utility. It pins the
v0.8.5 Google Docs export identity, byte count, and SHA-256, then validates and
splits all 17 canonical sections without normalizing source bytes. Other
scripts remain disposable unless promoted into `package.json`.

## Application Boundary

`src/routes/+page.svelte` is the Obsidian + Bone playable alpha. UI submits
versioned commands and renders projections/events; it does not reimplement
outcomes.

`src/lib/ui/` contains pure projection-to-view helpers for target ordering,
selected-command filtering, and bounded health display math. It may consume game
types and server-provided legal commands, but it does not own combat rules,
browser state, or side effects.

`src/hooks.server.ts` creates one PocketBase identity client per
request. `src/lib/server/pocketbase.ts` owns URL resolution, sanitized sessions,
and the request-scoped service-token client for locked run collections.
`src/lib/server/run-repository.ts` owns active runs, atomic command commits,
idempotency, resume, and history.

Game snapshots dispatch explicitly by `contentVersion`.
`st-bozma-expedition-v4` is the new-run default. It retains the v3 expedition
model while adding 5 XP to ambush victories and a one-AP, once-per-turn combat
weapon swap that never changes rank. `st-bozma-expedition-v3`,
`st-bozma-v0.8.5-v2`, and `st-bozma-mvp-v1` retain their historical state shapes
and resolver behavior. Persisted snapshots are decoded and validated before
replay; unknown or incomplete versions do not mutate.

Tomb Record events stay chronological in projections and persistence. The
Svelte shell renders a reversed view, treats the top as the pinned latest edge,
and compensates scroll height when new entries arrive above a player reviewing
older events.

## Persistence Direction

Server-authoritative runs use snapshots plus append-only command/event history,
seeded replay data, and atomic `expectedVersion` checks. Illegal and stale
commands do not advance the version. Production commits use PocketBase’s
transactional batch endpoint, unique command IDs, and a unique resulting-version
index. The reviewed migration is present in source but remains unapplied to the
remote alpha instance.

## Rules And Content

Canonical rules live only in `docs/game-rules/`. The current corpus is the
byte-verified v0.8.5 export; its manifest records full and per-section hashes.
Explicit browser adaptations live in `docs/adaptations/` or approved Plan
specs. Table-era files under `docs/reference/fivefold-table/` are legacy
references, not current product specs.

`src/lib/game/content/expedition.ts` owns the approved Issue #9 adaptation
catalog and decorates the reusable eight-room graph with interaction, treasure,
merchant, and finale roles. Hidden rewards and ambush composition remain in
snapshots; `projection.ts` exposes only public warnings, inventory, prices, and
relic clauses.
