# Combat I1 Data Foundation Spec

## Status

Complete.

## Purpose

Build the combat data foundation for Fivefold's first playable encounter flow.

Target feel: text-based, turn-based Pokemon-style combat. Players and DM choose clear actions, server-side game logic resolves supported actions, combat state updates automatically, and the log explains what happened. DM override remains available for rulings and corrections.

## Product Decisions

- One active encounter per game at a time.
- Multiple ended encounters can exist throughout a game.
- Combat starts in a new Encounter panel.
- Players choose their own actions from the Encounter panel.
- Initial player action set: Attack, Shift Rank, Brace, Flee, Pass.
- Combat state updates through game logic first.
- DM can override combat state.
- Hidden enemies are supported from day one.
- Players see aggregate hidden-threat counts such as `2 unrevealed threats`.
- Hidden counts must not leak names, stats, HP, rank, or individual identities.
- Encounter history is role-aware.
- Players see completed public summaries/logs.
- DMs see full hidden enemy details.

## Data Model

### `game_encounters`

Purpose: one combat encounter instance in a game.

Fields:

- `game`: relation to `games`, required.
- `scene`: relation to `game_scenes`, optional.
- `name`: text, required.
- `status`: select, `draft`, `active`, `ended`.
- `round`: integer, default `1`.
- `turnIndex`: integer, default `0`.
- `gmMomentumPending`: JSON/text for pending GM momentum trigger state.
- `createdBy`: relation to `users`, required.
- timestamps.

Rules:

- Game members can read encounters.
- DMs can create/update encounters.
- Only one `active` encounter may exist per game.
- Ending an encounter preserves it for history.

### `game_combatants`

Purpose: encounter-specific actor/enemy snapshot.

Fields:

- `game`: relation to `games`, required.
- `encounter`: relation to `game_encounters`, required.
- `actor`: relation to `game_actors`, optional.
- `kind`: select, `pc`, `enemy`, `ally`, `npc`.
- `side`: select, `party`, `enemy`, `neutral`.
- `name`: text, required.
- `owner`: relation to `users`, optional.
- `level`: integer.
- `size`: integer.
- `vice`: text/select.
- `creatureType`: text.
- `soul`, `heart`, `mind`, `reflex`, `voice`: integer snapshots.
- `rawReflex`: text or integer display value.
- `reflexMod`: integer normalized initiative modifier.
- `maxHp`: integer.
- `currentHp`: integer.
- `tempHp`: integer.
- `recoveryDiceMax`: integer.
- `recoveryDiceRemaining`: integer.
- `rank`: select, `near`, `far`, `offstage`, `fled`, `banished`.
- `visibleToPlayers`: boolean.
- `revealedRound`: integer, optional.
- `initiativeRoll`: integer.
- `initiativeScore`: integer.
- `turnOrder`: integer.
- `momentum`: integer.
- `momentumThreshold`: integer, default `10` for PCs.
- `actionUsed`: boolean.
- `abilityUsed`: boolean.
- `maneuverUsed`: boolean.
- `conditions`: JSON/text.
- `resistances`: JSON/text.
- `vulnerabilities`: JSON/text.
- `immunities`: JSON/text.
- `statBlock`: JSON/text for enemy attacks, abilities, maneuvers, tactics.
- `notes`: public text.
- `dmNotes`: DM-only text.
- timestamps.

Rules:

- Game members can read visible combatants.
- DMs can read all combatants.
- Hidden enemy combatants are DM-only until revealed.
- Player-facing projection derives aggregate hidden-threat counts from hidden combatants.
- DMs can create/update any combatant in their games.
- Players can submit actions for their own PC combatant.
- Players cannot directly edit arbitrary combatant state during MVP.

### `game_combat_actions`

Purpose: submitted/resolved combat actions and action audit.

Fields:

- `game`: relation to `games`, required.
- `encounter`: relation to `game_encounters`, required.
- `combatant`: relation to `game_combatants`, required.
- `actor`: relation to `game_actors`, optional.
- `submittedBy`: relation to `users`, required.
- `kind`: select, `attack`, `shiftRank`, `brace`, `flee`, `pass`, `override`, `damage`, `heal`, `reveal`.
- `targetCombatant`: relation to `game_combatants`, optional.
- `payload`: JSON/text.
- `status`: select, `submitted`, `resolved`, `cancelled`.
- `result`: JSON/text.
- timestamps.

Rules:

- Players can create allowed actions for their own PC combatant.
- DMs can create/cancel/resolve actions for any combatant.
- Server-side action handling validates target visibility and ownership.
- Supported action kinds update combat state automatically.

## Server Behavior

Load on `/games/[gameId]`:

- active encounter, if any.
- visible combatants for players.
- all combatants for DMs.
- aggregate hidden-threat count for players.
- ended encounter history.
- role-aware history details.

Mutation actions:

- start encounter.
- end encounter.
- add PC combatant from existing actor.
- add manual enemy combatant.
- reveal/hide enemy combatant.
- submit player action.
- resolve supported action.
- apply damage.
- heal.
- DM override combatant state.

Damage foundation:

- Damage reduces `tempHp` first.
- Overflow reduces `currentHp`.
- Healing increases `currentHp` only, capped by `maxHp`.
- DM override can correct HP/temp HP.
- Full defensive roll handling can deepen in later milestone.

Initial player action behavior:

- Attack: submit target and attack intent; first pass can apply an explicit damage payload through server-side damage logic. Full weapon/stat roll attack automation lands later with the attack-assistant initiative.
- Shift Rank: toggles between `near` and `far` when allowed.
- Brace: marks combatant for next defensive-roll advantage.
- Flee: marks flee intent and updates rank/state only when resolved by rules.
- Pass: consumes turn/action intent without state damage.

## UI Scope

Encounter panel:

- active encounter header.
- start/end encounter controls for DMs.
- party and enemy combatant lists.
- aggregate hidden-threat count for players.
- DM hidden enemy controls.
- player action controls for own PC.
- DM action/override controls.
- simple ended encounter history list.

Out of first UI pass:

- full main-surface combat redesign.
- enemy template picker.
- full weapon sheet automation.
- advanced animation.

## Acceptance Criteria

- DM can create one active encounter.
- Attempting a second active encounter is prevented or deactivates/ends the old one by explicit logic.
- DM can end an encounter and see it in history.
- Player can see public encounter history.
- DM can see full history with hidden enemy details.
- DM can add PCs from existing actors.
- DM can add manual enemy combatants.
- Hidden enemy details do not reach player projections.
- Players see aggregate hidden-threat counts.
- Players can submit Attack, Shift Rank, Brace, Flee, and Pass for their own PC combatant.
- Players cannot submit actions for other combatants.
- Basic damage/heal actions update HP/temp HP automatically.
- DM can override combatant state.
- Realtime updates propagate active encounter/combatant changes.

## Verification Plan

Unit tests:

- enemy Reflex normalization.
- hidden-threat count derivation.
- damage application with temp HP overflow.
- healing cap at max HP.
- player action ownership validation helpers.
- one-active-encounter invariant helpers if implemented outside hooks.

Server/API checks:

- DM creates encounter.
- DM cannot create a second active encounter without explicit transition behavior.
- player reads active encounter without hidden enemy details.
- DM reads hidden enemy details.
- player submits own PC action.
- player cannot submit action for another PC/enemy.
- damage action updates combatant HP/temp HP.
- ended encounter appears in history.

Browser checks:

- Encounter panel opens.
- player sees own PC actions.
- player sees aggregate hidden-threat count.
- DM sees hidden enemy details.
- ended encounter history appears with role-appropriate details.

## Open Implementation Notes

- PocketBase hooks should guard sensitive writes and hidden data.
- SvelteKit server projections should also redact hidden details before sending page data.
- If PocketBase API rules cannot express a constraint, enforce it in `pb_hooks`.
- Keep implementation narrow: no enemy templates, no full attack assistant, no structured gear.
