# Pure Deterministic Game Engine

Status: accepted bootstrap architecture.

`src/lib/game/` stays framework-independent. Commands resolve through `resolveCommand(state, command, rng)` into a fresh state and domain events. No Svelte, route, HTTP, PocketBase, browser storage, or `Math.random()` imports belong in this boundary. UI renders events as narration. Server orchestration later authorizes and persists accepted resolutions.
