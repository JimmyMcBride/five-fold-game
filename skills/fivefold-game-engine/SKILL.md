---
name: fivefold-game-engine
description: Implement or review deterministic Fivefold command resolution, state, domain events, seeded randomness, replay, combat, exploration, inventory, loot, and progression.
---

# Fivefold Game Engine

Use for `src/lib/game/`.

## Boundary

- Pure TypeScript only.
- No Svelte, route, HTTP, browser storage, or PocketBase imports.
- Resolve `state + command + RNG` into a new state and domain events.
- Never mutate input state.
- Inject seeded randomness; never call `Math.random()`.
- Events must carry enough readable meaning for narration and replay.
- Keep rules decisions traceable through `fivefold-game-rules`.

## Workflow

1. Identify command, affected invariant, and expected events.
2. Classify each rules-sensitive choice.
3. Add deterministic unit tests for success, failure, and boundary paths.
4. Keep content data separate from resolution code when it becomes reusable.
5. Hand off to `fivefold-testing`, then `fivefold-review`.

Persistence/version checks belong to server orchestration, not this engine.
