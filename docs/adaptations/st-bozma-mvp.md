# St. Bozma MVP Adaptations

This file classifies the rules-sensitive behavior implemented by the approved
`Single-player procedural St. Bozma roguelike` spec.

## Canonical Rules

- Five stats, modifiers, d100 Normal/Hard/Critical bands, and natural 96+ failure:
  `docs/game-rules/sections/01-basic-rules.md`.
- Recovery Dice and post-combat Patch Up:
  `docs/game-rules/sections/01-basic-rules.md`.
- Initiative, one Action plus one Ability, weapon damage, critical hits,
  Heart/Reflex defensive rolls, temporary health, momentum, maneuvers, and
  Near/Far ranks: `docs/game-rules/sections/02-combat-rules.md`.
- Class features and base advancement checks:
  `docs/game-rules/sections/10-classes-perks-and-advancement.md`.
- Origin perks and selected starting perks:
  `docs/game-rules/sections/11-perks.md`.
- Armor, weapons, Healing Potion, and Prayer Book:
  `docs/game-rules/sections/13-items-gold-and-gear.md`.
- Hellhornet and Scorched Raider values:
  `docs/game-rules/sections/15-bestiary.md`.
- St. Bozma rooms, Bozman Sensor, 75-HP adventure Zeboul, and Barnabe’s three
  Decode objective: `docs/game-rules/sections/16-st-bozmas-tomb.md`.

## Approved Dungeon Adaptations

- One fixed template per class uses final stats `70 / 50 / 40 / 30 / 10`;
  species, Vice, background, Calling, and unrestricted building are deferred.
- The bounded run awards 5 XP for each required normal victory. The second
  victory reaches level 2; the primary stat gains 5 and the other advancement
  checks use seeded d100 rolls. Perk and specialization selection are deferred.
- Zero HP ends the run immediately instead of entering the tabletop Dying state.
- Capture, Recovery-Die-loss enemy clauses, and Vice-only clauses are inactive.
- Normal encounters contain one Hellhornet (20 HP), Scorched Raider (44 HP), or
  adventure Zeboul (75 HP).
- Barnabe uses 60 HP, Reflex modifier 4, a `1d10 + 5` Far attack, and alternates
  attack with Decode. The third Decode is objective failure. The solo finale
  defers Manessa, the Flamecaller, summoned Zeboul, and Throne intervention.
- A hard Soul event choice can remove the guarding Raider from the finale.
- Advantage keeps the lower d100 and disadvantage keeps the higher d100. This
  resolves the rule text’s otherwise unstated d100 convention. The Brace
  maneuver uses advantage on the next defensive roll.
- A Priest’s approved Soul defense behaves like successful Reflex defense and
  avoids the attack.
- Initiative ties favor the solo player so a deterministic tie never requires a
  GM ruling.
- The server uses PocketBase’s enabled transactional batch endpoint for the
  action append, version-guarded snapshot update, and terminal record creation.
  The unique `(run, command_id)` index makes retries idempotent.

## Deferred

- Divination’s two stored d10 results and per-digit d100 replacement are present
  in Magi content data but not automated. A safe text UI needs a dedicated
  pre-roll interception command so the server can offer the choice without
  revealing or rerolling hidden state.
- Ally-only Rebuke and Curse’s unimplemented GM momentum-pool interaction remain
  represented as explicitly deferred class data rather than no-op commands.
- Scroll slot math, damage types/resistances, Sin, conditions beyond the selected
  solo features, capture, fleeing, summons, and party-only effects.
- Remote PocketBase migration and deployment until separately authorized.
