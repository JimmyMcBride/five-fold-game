# Project: FiveFoldGame

Created: 2026-07-29T05:42:16Z

## Vision

Create a browser-based, text-first, turn-based Fivefold dungeon crawler where players explore rooms, face events and enemies, resolve combat, collect loot, develop characters, and save runs.

## Principles

- Player game, not a TTRPG table or GM tool.
- Canonical Fivefold rules remain identifiable and untouched.
- Dungeon adaptations require explicit decisions and approved specs.
- Deterministic game engine; server-authoritative persistence.
- Obsidian + Bone supports dense, readable long-form play.

## Constraints

- SvelteKit, Svelte 5, TypeScript, Bun, Tailwind CSS, and PocketBase.
- Single-player, run-based roguelike MVP.
- Deterministic procedural St. Bozma dungeon from authored room, encounter, enemy, and loot templates.
- All five starting classes ship with viable level-1 kits; specializations and broad perk automation remain later work.
- Public alpha access uses self-service Discord OAuth; each run starts with a character name and one fixed class template.
- No co-op architecture, full rules automation, permanent metaprogression, or speculative services in the MVP.
- No unreviewed GitHub planning promotion.

## Planning Rules

- Specs are the canonical execution contract.
- Stories are created only after spec approval.
- Stories should be execution-ready and verification-aware.

## Notes

- GitHub is planning source of truth.
- User resolved MVP direction on 2026-07-29.
- Plan promoted the reviewed draft to GitHub Issue #1, `Single-player procedural St. Bozma roguelike`, on 2026-07-29. The owner approved the resolved spec on 2026-07-29, replacing pre-provisioned users with public Discord self-service access. Implementation is authorized on a linked feature branch; remote PocketBase schema mutation and deployment remain separately gated.
