---
updated: '2026-07-29T05:49:42Z'
---

# Project Architecture

See `docs/architecture.md` for the full contract.

## Boundaries

- `src/lib/game/`: pure TypeScript command resolution, immutable next state, domain events, and injected seeded RNG. No framework, HTTP, or PocketBase imports.
- `src/routes/`: SvelteKit presentation and server route orchestration. UI issues commands and renders events.
- `src/lib/server/` and `src/hooks.server.ts`: per-request PocketBase client, raw server auth, and sanitized projections.
- `docs/game-rules/`: byte-preserved canonical source.
- `docs/adaptations/` and approved Plan specs: product decisions that differ from or fill gaps in canonical rules.

Future runs use server-authoritative snapshots, append-only command/event history, deterministic replay data, and expected-version protection.
