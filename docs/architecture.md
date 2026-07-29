# Architecture

## Runtime Boundaries

### Pure game engine

`src/lib/game/` contains pure TypeScript domain code. It must not import Svelte, SvelteKit routes, HTTP clients, or PocketBase.

```text
resolveCommand(state, command, rng) -> { state, events }
```

- State input is never mutated.
- Seeded randomness enters through `RandomSource`.
- Commands describe player intent.
- Events explain outcomes to UI, persistence, and replay tools.
- Room movement, encounters, combat, loot, inventory, and progression grow inside this boundary.

The bootstrap engine is intentionally narrow. It proves movement, one encounter, seeded combat rolls, loot, and level progression without automating the full Fivefold rulebook.

### SvelteKit application

Routes render sanitized state and submit commands. UI reads domain events as narration rather than rebuilding rule outcomes in components.

SvelteKit server code owns identity, authorization, version checks, and persisted command orchestration. Client optimism may improve feel later, but server resolution wins.

### PocketBase persistence

Create one PocketBase client per SvelteKit request. Raw auth records, admin credentials, privileged collection access, and unsanitized records stay server-side. Browser route data receives only explicit session and game projections.

No remote schema changes are part of bootstrap.

## Run Persistence Direction

Anticipated collections:

- `users`
- `characters`
- `game_runs`
- `run_snapshots`
- `run_actions`
- `dungeons`
- `rooms`
- `enemies`
- `items`
- `loot_tables`

A persisted run should combine:

- Periodic state snapshots.
- Append-only accepted command and emitted event history.
- Seed/RNG state needed for deterministic replay.
- `expectedVersion` on each submitted command.
- Atomic version increment with command acceptance.

If a command supplies a stale `expectedVersion`, reject it and return the current sanitized run projection. Never resolve two turns from the same run version.

Collection shape, access rules, snapshot cadence, and history retention require an approved spec before migration work.

## Rule Boundary

Canonical rules live only in `docs/game-rules/`. Product adaptations live in `docs/adaptations/` or approved Plan specs. UI convenience cannot silently alter a canonical rule.
