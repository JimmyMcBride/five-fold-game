---
updated: '2026-07-29T07:51:01Z'
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

The approved Issue #1 implementation is active on its linked branch. It provides
public Discord entry, fixed five-class run creation, deterministic eight-room
generation, solo St. Bozma combat and events, fixed XP progression, terminal run
records, and versioned server command APIs. The PocketBase migration is reviewed
in source but remains unapplied pending separate authorization.
