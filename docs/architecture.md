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

The engine now owns seeded eight-room graphs, five fixed class kits, legal command
projection, d100 bands, initiative, turn economy, ranks, defensive rolls,
temporary health, momentum, selected class features, solo enemy behavior,
progression, events, loot, Barnabe’s Decode clock, and terminal outcomes.
Explicit omissions remain in `docs/adaptations/st-bozma-mvp.md`.

### SvelteKit application

Routes render sanitized state and submit commands. UI reads domain events as narration rather than rebuilding rule outcomes in components.

SvelteKit server code owns identity, authorization, version checks, and persisted command orchestration. Client optimism may improve feel later, but server resolution wins.

### PocketBase persistence

Create request-scoped PocketBase clients: one user-authenticated identity client
for Discord OAuth and one service-token client for locked run collections. Raw
auth records, the service token, privileged collection access, and unsanitized
records stay server-side. Browser route data receives only explicit session and
game projections.

`src/lib/server/run-repository.ts` owns active-run creation, expected-version
commands, idempotency, resume, and history. Production commits use PocketBase’s
transactional batch endpoint; Playwright uses an explicitly gated in-memory
repository.

## Run Persistence Contract

The unapplied migration creates `game_runs`, `run_actions`, and `run_records`.
Each accepted command carries `runId`, stable `commandId`, and
`expectedVersion`. The server resolves the pure engine, then atomically appends
the action, advances the snapshot/version, and creates a terminal summary when
needed. A unique `(run, command_id)` index makes retries idempotent. A unique
`(run, resulting_version)` index allows only one atomic batch to advance a
given version; a losing writer reloads the latest snapshot as stale. Direct
Discord-user access to all three collections is locked.

Illegal commands do not consume RNG, increment the version, or append history.
Stale commands return the current sanitized projection. Raw graphs, hidden state,
auth records, and PocketBase credentials never enter browser route data.

The migration and batch setting remain unapplied to the remote alpha instance
until separately authorized.

## Rule Boundary

Canonical rules live only in `docs/game-rules/`. Product adaptations live in `docs/adaptations/` or approved Plan specs. UI convenience cannot silently alter a canonical rule.
