---
updated: '2026-07-29T05:41:32Z'
---

# Architecture

## Deterministic Domain

`src/lib/game/` is pure TypeScript. It may not import Svelte, SvelteKit routes, HTTP, browser persistence, or PocketBase. `resolveCommand(state, command, rng)` returns a new state plus narration-ready domain events. Input state stays unchanged. Randomness is injected through a seeded `RandomSource`.

Bootstrap modules:

- `commands.ts` — player intent
- `events.ts` — readable domain outcomes
- `state.ts` — serializable run state
- `rng.ts` — seeded deterministic source
- `engine.ts` — command resolution
- `content/rooms.ts` — specimen room content

## Application Boundary

`src/routes/+page.svelte` is the Obsidian + Bone playable specimen. UI issues commands and renders events; it does not reimplement outcomes. `src/hooks.server.ts` creates one PocketBase client per request. `src/lib/server/pocketbase.ts` owns URL resolution and sanitized session projection.

## Persistence Direction

Server-authoritative runs will use snapshots plus append-only command/event history, seeded replay data, and atomic `expectedVersion` checks. Stale commands must be rejected. PocketBase collection shape requires an approved spec; bootstrap performs no remote schema mutation.

## Rules And Content

Canonical rules live only in `docs/game-rules/`. Explicit browser adaptations live in `docs/adaptations/` or approved Plan specs. Table-era files under `docs/reference/fivefold-table/` are legacy references, not current product specs.
