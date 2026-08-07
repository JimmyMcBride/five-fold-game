---
updated: '2026-08-07'
---

# Party Run Adaptations

`st-bozma-party-v5` is the party-native content version approved by GitHub
Issue #18. Older `st-bozma-mvp-v1`, `st-bozma-v0.8.5-v2`,
`st-bozma-expedition-v3`, and `st-bozma-expedition-v4` snapshots remain singular
and continue through their original resolver without conversion.

## Canonical rules retained

- Every conscious character and enemy rolls `d10 + Reflex Modifier` and acts in
  descending initiative order. Each player character owns two AP and its own
  duplicate-action lock: `sections/02-combat-rules.md`.
- Player characters select a starting Near or Far rank. Far weapons can reach
  either rank; Near weapons require both combatants Near. Shove, Shift Rank,
  Brace, and free closing against an empty Near line retain their existing v4
  mechanics: `sections/02-combat-rules.md`.
- Recovery Dice remain per character. Patch Up spends the selected character's
  die after combat: `sections/01-basic-rules.md`.
- Restorative Prayer, Shield of Faith, Guidance, and Bless accept explicit
  legal self/ally targets; Divinity grants the Priest momentum after healing or
  temporary health: `sections/10-classes-perks-and-advancement.md`.
- Encounter XP is the approved five-XP dungeon reward divided by fixed party
  size and rounded down for every selected character, including a Down member.
  This applies the canonical party division rule to the existing bounded reward:
  `sections/10-classes-perks-and-advancement.md`.
- Healing Potions use an Action and heal as Patch Up:
  `sections/13-items-gold-and-gear.md`.
- Hellhornet, Scorched Raider, Zeboul, and Barnabe statistics remain unchanged:
  `sections/15-bestiary.md` and `sections/16-st-bozmas-tomb.md`.

## Approved v5 adaptations

- One human controls one to three unique fixed prebuilts. Their authored names,
  biographies, stable template IDs, and tactical summaries are product content;
  their mechanical kits remain the fixed class adaptations documented in
  `st-bozma-mvp.md`.
- The browser crawler uses one stable deterministic tie rule: equal initiative
  favors party members, then stable actor ID. This replaces a table ruling.
- A conscious Near party member holds the front line against Near enemy weapon
  attacks. Those enemies cannot select Far members until no conscious member
  remains Near. Far enemy attacks retain closest-conscious targeting.
- Enemy target ties prefer Near, then stable party order. Hidden and Down members
  are ignored. Authored enemy priority may replace this only when represented in
  content data.
- Zero HP produces `Down`, not canonical Dying. Down members cannot act or be
  normally targeted. True healing above zero returns them at their next normal
  initiative opportunity; temporary health does not. All members Down ends the
  run. Full Dying automation remains deferred.
- Movement uses one shared room and an explicit conscious exploration leader.
  Gold, consumables, relics, quest items, merchant stock, searches, and room
  outcomes are shared expedition state. Combat equipment, HP, Recovery Dice,
  effects, AP, momentum, XP, and levels remain individual.
- Solo compositions are unchanged. Two-member encounters add one authored
  Hellhornet. Three-member encounters add a Hellhornet plus a Scorched Raider;
  the finale substitutes the latter addition with a Zeboul. Enemy statistics do
  not scale.
- Fixed roster identities and starting-rank choices are reconstructed and
  validated server-side. Unknown, repeated, empty, or four-plus lineups fail
  before a run is persisted.

## Still deferred

- Companion AI, co-op clients, party splitting, arbitrary turn swapping,
  generalized inventory transfer, fleeing, full Dying, broad perks,
  specializations, and custom character creation.
- PocketBase schema changes and production deployment.
