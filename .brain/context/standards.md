---
updated: '2026-07-29T05:41:32Z'
---

# Standards

## Engineering

- Use Svelte 5 runes, TypeScript, Bun, Tailwind CSS, ESLint, Prettier, Vitest, and Playwright.
- Keep changes small and traceable to an approved task/spec.
- Never use `Math.random()` in the game engine; inject seeded randomness.
- Do not mutate command input state.
- Server owns persisted command authorization and version validation.
- Expose only sanitized data to browser routes.

## Rules Lookup

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

Every rules-sensitive choice must be classified as canonical, explicit dungeon adaptation, or unresolved ambiguity. Never let UI convenience silently change a canonical rule.

## Interface

Obsidian + Bone is official: volcanic charcoal, bone type, tallow focus/command, clot danger, verdigris recovery/success, manuscript headings, mono logs/stats. No gradients, parchment, ornate MMO chrome, glassmorphism, nested card stacks, or inaccessible motion.
