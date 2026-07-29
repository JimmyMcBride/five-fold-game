---
name: fivefold-game-rules
description: Retrieve and classify Fivefold rules before implementing combat, characters, enemies, conditions, progression, perks, items, loot, or other rules-sensitive dungeon behavior.
---

# Fivefold Game Rules

Use before any rules-sensitive decision.

## Retrieval Map

- General rolls: `docs/game-rules/sections/01-basic-rules.md`
- Combat: `docs/game-rules/sections/02-combat-rules.md`
- Conditions: `docs/game-rules/sections/03-conditions.md`
- Character creation: `docs/game-rules/sections/06-character-creation.md`
- Species: `docs/game-rules/sections/07-species.md`
- Vices and sin: `docs/game-rules/sections/08-vices-and-sin.md`
- Background/calling: `docs/game-rules/sections/09-background-and-calling.md`
- Classes/advancement: `docs/game-rules/sections/10-classes-perks-and-advancement.md`
- Perks: `docs/game-rules/sections/11-perks.md`
- Items/gear: `docs/game-rules/sections/13-items-gold-and-gear.md`
- World: `docs/game-rules/sections/14-the-world.md`
- Enemies: `docs/game-rules/sections/15-bestiary.md`
- Example dungeon: `docs/game-rules/sections/16-st-bozmas-tomb.md`

Read only relevant sections. Use `brain find` or `brain search` when retrieval helps.

## Required Classification

Record one status before implementation:

1. **Canonical rule** — direct rulebook support. Cite source path.
2. **Dungeon adaptation** — explicit approved decision in `docs/adaptations/` or a Plan spec.
3. **Unresolved ambiguity** — no approved answer. Keep implementation reversible or stop for product direction.

Legacy files under `docs/reference/fivefold-table/` may clarify history but are not current specs. Never let UI convenience silently change canonical rules. Never edit imported canonical section files during ordinary product work.
