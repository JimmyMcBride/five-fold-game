---
updated: '2026-07-29T05:49:42Z'
---

# Project Overview

Fivefold is a browser-based, text-first, turn-based dungeon crawler. Players move between rooms, encounter enemies and events, fight, collect loot, develop characters, and save runs. It is not a TTRPG table or GM tool.

## Foundation

- SvelteKit and Svelte 5 with TypeScript on Bun.
- Tailwind CSS, ESLint, Prettier, Vitest, and Playwright.
- Pure deterministic game engine under `src/lib/game/`.
- Server-only PocketBase integration under `src/lib/server/`.
- Canonical rulebook under `docs/game-rules/`.
- Explicit adaptations under `docs/adaptations/`.
- Obsidian + Bone player interface.

Current bootstrap proves movement, one encounter, combat, narration events, loot, and progression. Product scope remains in the Plan brainstorm.
