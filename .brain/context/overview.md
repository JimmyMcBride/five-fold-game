---
updated: '2026-07-29T05:40:53Z'
---

# Overview

## Project

`five-fold-game` is a browser-based, text-first, turn-based Fivefold dungeon crawler. It is a player game, not a TTRPG table or GM tool.

## Runtime

- SvelteKit and Svelte 5
- TypeScript on Bun
- Tailwind CSS with project CSS tokens
- Vitest and Playwright
- PocketBase JavaScript SDK

## High-Signal Paths

- `src/lib/game/` — pure deterministic domain engine
- `src/lib/server/` — server-only integrations
- `src/routes/` — playable SvelteKit shell
- `docs/game-rules/` — canonical byte-preserved rules corpus
- `docs/adaptations/` — explicit dungeon-crawler decisions
- `docs/reference/fivefold-table/` — legacy table-product references
- `skills/fivefold-*/` — project-local workflows

## Product Status

Bootstrap specimen supports room movement, one encounter, seeded combat, narration events, loot, and level progression. Persistence, auth flows, production content, and full rules automation remain future approved-spec work.
