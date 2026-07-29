---
updated: '2026-07-28T22:15:45Z'
---

# Combat I3 Initiative And Turn Loop Spec

## Status

Complete.

## Implementation Outcome

- Initiative and turn state persist through PocketBase with monotonic revision checks.
- Players can use Action and Ability allowances and end only their owned current PC turn.
- DMs can roll/reroll initiative, move or rewind the turn, and override current-turn allowances.
- The Encounter panel presents ordered initiative, current turn, round, allowance state, disabled reasons, and unplaced combatants.
- Hidden combatants, exact hidden initiative slots, and hidden turn identities remain redacted from player route data and public logs.
- Initiative, allowance, turn, round, and override changes produce combat audit records and player-safe system messages.
- Realtime verification confirmed that a separate connected client receives turn changes without reloading.

The four implementation slices are recorded under `.brain/resources/slices/combat-i3-slice-*.md`.

## Purpose

Turn the persistent encounter tracker into a reliable round-by-round combat loop.

The DM deliberately rolls initiative after adding combatants. The server creates and persists a stable order, the current combatant is obvious, players can act only for their own PC on that PC's turn, and turn changes survive refresh and realtime synchronization.

## Rules Sources

- `docs/game-rules/sections/01-basic-rules.md`
- `docs/game-rules/sections/02-combat-rules.md`
- `docs/combat-i0-rules-lock-spec.md`
- `docs/combat-i1-data-foundation-spec.md`

## Locked Rules

- Initiative is `d10 + Reflex modifier`.
- PC Reflex modifier is `floor(reflex / 10)`.
- Enemy initiative uses the normalized `reflexMod` locked in I0.
- A normal turn grants one Action and one Ability.
- Initiative order is descending by initiative score.

## Approved Product Decisions

- Initiative is rolled from an explicit DM control after combatants are added.
- Ties resolve by higher Reflex modifier, then a persisted random tiebreaker.
- Players can end their own current turn.
- The DM can advance, rewind, or override any turn.
- Normal player actions are blocked after their relevant Action or Ability allowance is spent.
- The UI explains blocked actions.
- DM override remains available.

## Turn Model

Before initiative:

- The encounter has no active combatant.
- Player turn-gated controls are disabled.
- The DM can continue adding or editing combatants.

Rolling initiative:

- The server rolls one `d10` for every eligible combatant.
- Initiative score is `initiativeRoll + reflexMod`.
- Sort order is initiative score descending, Reflex modifier descending, persisted random tiebreaker descending.
- The resulting integer `turnOrder` is persisted for every eligible combatant.
- The encounter starts at round `1`, turn index `0`.
- Per-turn usage flags reset.
- Rolling initiative again replaces the prior order after a DM confirmation.

Eligible combatants are active encounter participants whose rank/state is not `fled`, `banished`, or `offstage`. A combatant added after initiative remains unplaced until the DM rerolls initiative. The UI must identify unplaced combatants to the DM without changing the current order automatically.

Advancing turns:

- A player may end the turn only for their owned PC when it is the current combatant.
- The DM may move to the next or previous turn.
- Moving forward from the final combatant increments the round and selects the first combatant.
- Moving backward from the first combatant decrements the round when the round is greater than `1` and selects the final combatant.
- Rewinding changes the pointer only. It does not undo actions, HP changes, logs, or other combat state.
- Entering a combatant's turn for the first time in a round resets that combatant's per-turn usage flags.
- Re-entering an already-started turn in the same round does not grant another Action or Ability.

Hidden turns:

- Hidden enemy identity, stats, HP, rank, initiative values, and exact order never reach player route data.
- If a hidden enemy is current, players see a generic `An unrevealed threat is acting` state.
- The DM sees the hidden combatant's full turn information.

## Persistence Changes

Add encounter/combatant fields only where the current I1 model cannot safely express the turn loop:

- `game_encounters.initiativeStatus`: `unrolled` or `rolled`.
- `game_combatants.initiativeTieBreaker`: persisted integer used only after score and Reflex ties.
- `game_combatants.lastTurnStartedRound`: integer used to prevent rewind/advance from resetting allowances twice in one round.

Continue using the existing:

- `game_encounters.round`
- `game_encounters.turnIndex`
- `game_combatants.initiativeRoll`
- `game_combatants.initiativeScore`
- `game_combatants.turnOrder`
- `game_combatants.actionUsed`
- `game_combatants.abilityUsed`
- `game_combatants.maneuverUsed`

Schema and hooks must preserve the current hidden-enemy and membership boundaries.

## Server Behavior

Add server-side operations for:

- Roll or reroll initiative for all eligible combatants.
- Advance to the next turn.
- Rewind to the previous turn.
- End the authenticated player's current PC turn.
- DM override the current turn and usage flags.
- Mark an Action or Ability allowance used through validated combat action handling.

Every operation must validate:

- Active encounter membership.
- Authenticated user role.
- Current combatant ownership for player turn completion.
- Initiative has been rolled.
- Relevant allowance remains available for player actions.
- Hidden targets and combatants are not exposed through errors or response payloads.

Concurrent next-turn or end-turn requests must not skip combatants. The mutation path must compare the expected round/current combatant or otherwise reject stale submissions and return the refreshed state.

## Action Allowance Scope

For I3:

- Attack consumes the Action allowance.
- Shift Rank submitted as an Action consumes the Action allowance.
- Pass consumes both Action and Ability and is ready to end the turn.
- Flee intent consumes the full turn, but its roll and success resolution remain part of the later rank/effects work.
- Ability use is a manual declaration/log entry that consumes the Ability allowance; class/perk effects remain manual.
- Brace remains a maneuver placeholder until PC momentum is implemented. It marks maneuver use but does not invent a momentum trigger.

The DM may override any usage flag for corrections or table rulings.

## Combat Log

Record human-readable combat events for:

- Initiative rolled or rerolled.
- Turn started.
- Turn ended by a player.
- DM advanced or rewound the turn.
- Round advanced.
- Action or Ability allowance used.
- Usage flags overridden.

Player-facing logs must use the generic hidden-threat label whenever an unrevealed enemy is involved. DM-facing data may retain the real combatant identity.

## UI Scope

Encounter panel additions:

- DM `Roll Initiative` and confirmed `Reroll Initiative` controls.
- Ordered initiative list.
- Current combatant highlight.
- Round and turn position.
- DM previous/next controls.
- Player `End Turn` control on their current PC only.
- Action and Ability remaining/used indicators.
- Clear disabled reasons when it is not the player's turn or an allowance is spent.
- Generic hidden-threat current-turn presentation for players.
- DM warning for combatants added after initiative who are not in the current order.

Keep the UI inside the existing Encounter panel and Obsidian + Bone direction. A full combat-screen redesign remains out of scope.

## Vague Placeholders And Assumptions

- The rulebook does not define initiative tie handling. The approved persisted tiebreaker is an implementation rule, not a canonical game rule.
- Generic Ability declaration tracks allowance use but does not resolve class/perk text.
- Brace cannot be fully validated until momentum is implemented.
- Flee roll difficulty and resolution remain manual until the Fivefold roll/rank initiative.
- Rewind is navigation correction, not state undo.

These choices are deliberately reversible and must not be expanded into broader automation during I3.

## Acceptance Criteria

- The DM can roll initiative after adding combatants.
- Initiative uses the correct PC and enemy Reflex modifiers.
- Ties produce a stable persisted order.
- The current turn and round survive refresh and realtime updates.
- Players never receive hidden enemy turn details.
- A player can act and end turn only for their own current PC.
- A player cannot consume an already-used Action or Ability.
- The DM can advance, rewind, reroll, and override usage state.
- Rewind and re-advance do not grant duplicate allowances in the same round.
- Advancing from the final combatant increments the round.
- Concurrent stale turn submissions do not skip a combatant.
- Initiative and turn changes produce role-safe combat log entries.

## Verification Plan

Unit tests:

- Initiative score and sort ordering.
- Score tie resolved by Reflex modifier.
- Full tie resolved by persisted tiebreaker.
- Eligible-combatant filtering.
- Forward and backward turn transitions at round boundaries.
- First entry versus same-round re-entry flag resets.
- Action and Ability allowance validation.
- Hidden-current-turn projection.

Server/API checks:

- DM rolls and rerolls initiative.
- Player cannot roll, advance, rewind, or override.
- Player can end only their owned current PC turn.
- Stale duplicate end-turn request is rejected.
- Hidden enemy turn data is absent from player responses.
- Added-after-roll combatant remains unplaced until reroll.

Browser checks:

- Initiative order and current-turn highlight render for DM and player.
- Player controls enable only on the owned PC's turn.
- Disabled controls explain turn or allowance restrictions.
- Hidden enemy current turn is generic for players.
- Two connected clients receive turn and round updates.

Project checks:

- `brain session run -- bun run lint`
- `brain session run -- bun run check`
- `brain session run -- bun run test:unit`
- `brain session run -- bun run build`
- `brain session run -- bun run test:e2e`

## Implementation Slices

1. I3-S01: initiative and turn-domain helpers with focused unit tests.
2. I3-S02: PocketBase persistence, role-safe projections, and server mutation actions.
3. I3-S03: Encounter panel initiative order, turn controls, and allowance UI.
4. I3-S04: role-safe combat logging, realtime concurrency verification, and browser polish.
