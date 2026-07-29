# St. Bozma Dungeon Adaptations

This file classifies rules-sensitive behavior for both persisted content
versions. `st-bozma-mvp-v1` remains the historical Issue #1 contract.
`st-bozma-v0.8.5-v2` governs newly created runs.

## Canonical v0.8.5 Rules

- Five stats, d100 bands, the natural stat cap of 85, Heart contribution to
  maximum health, Recovery Dice, and light:
  `docs/game-rules/sections/01-basic-rules.md`.
- Two AP, duplicate Action/Ability lockout, Deathblows, Block, Dodge, temporary
  health, momentum, basic Maneuvers, Shove, size, and Near/Far:
  `docs/game-rules/sections/02-combat-rules.md`.
- Starting maximum health:
  `docs/game-rules/sections/06-character-creation.md`.
- Class features and level-up health:
  `docs/game-rules/sections/10-classes-perks-and-advancement.md`.
- Origin and selected perks:
  `docs/game-rules/sections/11-perks.md`.
- Armor, weapons, Healing Potion, and Prayer Book:
  `docs/game-rules/sections/13-items-gold-and-gear.md`.
- Hellhornet, Scorched Raider, and Zeboul values:
  `docs/game-rules/sections/15-bestiary.md`.
- St. Bozma rooms, Bozman Sensor, adventure Zeboul, Barnabe, Decode, and finale
  rewards: `docs/game-rules/sections/16-st-bozmas-tomb.md`.

## Shared Approved Dungeon Adaptations

- One fixed template per class uses final stats `70 / 50 / 40 / 30 / 10`;
  species, Vice, background, Calling, and unrestricted building are deferred.
- The bounded run awards 5 XP for each required normal victory. The second
  victory reaches level 2; perk and specialization selection are deferred.
- Zero HP ends the run immediately instead of entering the tabletop Dying state.
- Capture, Recovery-Die-loss enemy clauses, Vice-only clauses, summons, party
  effects, and open-ended GM rulings are inactive.
- A hard Soul event choice can remove Manessa’s Raider from the finale.
- Advantage keeps the lower d100 and disadvantage keeps the higher d100.
- A Priest’s approved Soul defense avoids the attack on a success.
- Initiative ties favor the solo player.
- The server keeps version-guarded snapshots, idempotent command IDs,
  append-only action history, and one immutable terminal summary.

## V2 Reconciliation

- New runs use `st-bozma-v0.8.5-v2`; v1 snapshots are never upgraded or
  reinterpreted.
- Starting maximum health is seeded once as
  `Heart + 1d10 + Heart Modifier`. Level-up adds
  `1d10 + current Heart Modifier`, plus any direct Heart increase.
- Two AP replace the v1 Action/Ability split. Each Action or Ability costs one
  AP and its identity is locked for the rest of the turn. Maneuvers do not cost
  AP. End Turn stays explicit after AP reaches zero so a pending momentum
  Maneuver can resolve first.
- Dodge avoids damage; hard and critical successes grant 1 and 2 momentum.
  Block reduces by one or two Heart Modifiers; a critical avoids all damage and
  counterattacks when the equipped weapon can reach the attacker.
- A natural 1 Deathblows any target, including Barnabe. The source permits GM
  boss discretion, but the deterministic solo adaptation does not create a
  boss exception.
- Shove can be an Action or Maneuver. Size 3 requires a hard Heart success.
  Selected enemies above size 5 would be omitted as deterministic impossible
  targets.
- Far weapons may attack Near or Far enemies. Near weapons require both the
  wielder and target to be Near. A Near occupant therefore protects Far allies
  only from Near weapons; there is no melee-role tag.
- When the hostile Near rank is empty, `Close distance` moves the player and
  remaining hostiles Near without AP. V1 retains its automatic end-of-round
  collapse.
- Scout Surprise Attack uses Reflex Modifier bonus dice when advantage already
  exists. Warden and Cling to Shadows changes are recorded canonically, but
  specialization remains deferred. Misdirection and Calculated Risk are also
  deferred because the fixed kits do not select them.
- Normal encounters use Hellhornet 18 HP and Scorched Raider 36 HP. Adventure
  Zeboul retains its adventure-defined 75 HP and uses `2d10 + 9` Gore.

## Barnabe V2 Solo Adaptation

- Barnabe uses the canonical 75 HP and stays Far while a Near Raider lives.
  Far weapons can target him through that line; Near weapons cannot.
- Barnabe is a coward and does not attack. He alternates a deterministic
  momentum-gathering turn with Decode; the third Decode remains objective
  failure. This is the solo proxy for “every other GM maneuver” because the
  crawler does not automate a shared GM momentum pool.
- Canonical recurring 25 temporary health is omitted for the bounded solo
  balance. The amulet remains narrative reward text; equipping it and
  Valefor’s Profane Shield are outside the run’s item surface.
- Manessa’s full clan, Flamecaller, three-Zeboul summon, Throne intervention,
  group targeting, and flight with the corpse remain deferred.

## Historical V1 Contract

- V1 uses one Action plus one Ability, automatic rank collapse, the former
  defensive bands, Heart-only maximum health, a stat cap of 90, and Surprise
  Attack bonus dice equal to level.
- V1 normal enemies remain Hellhornet 20 HP, Scorched Raider 44 HP, and
  adventure Zeboul `2d10 + 7`.
- V1 Barnabe remains 60 HP with a `1d10 + 5` Far attack, alternating attack and
  Decode, and universal `guarded` targeting while the Raider lives.
- V1 state and encounter objects do not receive v2 AP, health-roll, or size
  properties.

## Deferred

- Divination’s stored d10 digit replacement needs a dedicated pre-roll
  interception command.
- Ally-only Rebuke and Curse’s GM momentum interaction remain explicit deferred
  class data.
- Concentration, dual wielding, full GM escalation, broad enemy abilities,
  scroll slots, damage types/resistances, Sin, broad conditions, capture,
  fleeing, summons, and party-only effects.
- Remote schema changes and deployment remain separately authorized.
