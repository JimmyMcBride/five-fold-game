---
updated: '2026-07-28T22:15:45Z'
---

# Combat Roadmap

## Purpose

Get Fivefold combat playable inside the current live table without trying to automate every class, perk, item, summon, and enemy puzzle up front.

The first shippable combat slice should help the table answer these questions in real time:

- Who is in this fight?
- What rank are they on?
- Whose turn is it?
- What can they still do this turn?
- What are their current HP, temporary HP, recovery dice, momentum, and conditions?
- What just happened in the combat log?

Full rules automation should come after this tracker is reliable.

## Current App Understanding

The current game route is already a live table surface, not just a roster page. It loads active scene, non-archived scenes, messages, actors, roster, DM notes, PocketBase URL, and realtime token through `src/routes/games/[gameId]/+page.server.ts`. The paired Svelte page owns realtime subscriptions and the Obsidian + Bone table UI.

Persistent table data currently lives in PocketBase collections:

- `game_scenes`
- `game_messages`
- `game_actors`
- `game_dm_notes`

`game_actors` is the identity layer for PCs and NPCs. It is not yet a combat-state layer.

Current PC actor fields already support character-sheet basics:

- `kind`, `owner`, `name`, `class`
- `species`, `vice`, `level`
- `soul`, `heart`, `mind`, `reflex`, `voice`
- backgrounds, calling, first perk, gold, gear
- free-text `summary`, `status`, `hpNotes`, and DM-only `dmNotes`

Current NPC actors are intentionally lightweight:

- `name`, optional `class`
- free-text `summary`, `status`, `hpNotes`, DM-only `dmNotes`

Current roll support is chat-first. `src/lib/server/dice.ts` supports `/r`, `/roll`, `/m`, and `/math`, and `game_messages.kind = "roll"` stores roll output. It does not yet know Fivefold stat rolls, advantage/disadvantage, success degree, combat targets, damage application, or turn context.

Current permission model is useful for combat:

- DMs can create NPCs and update any actor.
- Players can create and update only their own PC.
- DMs can send system/dialogue messages.
- Players can chat as their own PC.
- Roll messages cannot spoof actor speech.
- Non-DMs cannot see actor `dmNotes`.

## Rules Understanding

### PC Stats

Fivefold has five primary stats: Soul, Heart, Mind, Reflex, Voice. Stats are 0-90 for mortal natural stats. Modifier is `floor(stat / 10)`.

PC max HP equals Heart. Recovery dice max equals level plus twice the highest stat modifier. A dying PC can still act, but using an action, ability, or maneuver costs one recovery die. Taking damage while dying also costs one recovery die. A dying PC with no recovery dice left dies.

Level 1 character creation uses stat array 10, 20, 30, 40, 50, then 50 extra points allocated across stats, with no level 1 stat above 70.

### Rolls

Most rolls are d100 roll-under:

- Normal success: result <= stat.
- Hard success: result <= half stat.
- Critical success: result <= modifier.
- Natural 96+ always fails.

Combat needs advantage/disadvantage support. Existing dice parser can roll raw expressions but does not evaluate this success ladder.

### Turn Order

When combat begins, each combatant rolls d10 plus Reflex modifier. Highest result acts first.

Each PC turn normally allows one Action and one Ability. Maneuvers usually come from momentum and may occur outside normal turn order when a PC reaches momentum threshold.

Enemies default to either one weapon attack or one ability on their turn unless their stat block says otherwise. Some boss enemies explicitly get multiple attacks and an ability.

### Ranks

Combat has Near and Far ranks. Near weapons require attacker and target to both be Near. Far weapons can target Near or Far. Switching Near to Far requires an Action or Shift Rank maneuver. If no enemies are in Near rank, enemies automatically close to Near at start of round.

The old app-level `game_actors.rank` field was removed, so rank must return as encounter state, not global actor identity.

### Player Momentum

Player momentum threshold is 10. When a PC reaches it, they immediately make a Maneuver and momentum resets. PCs gain momentum from weapon attacks, class/perk effects, and ending turn on Near rank.

Basic maneuvers are Shift Rank, Brace, and Weapon Attack. Weapon Attack maneuver does not grant momentum.

### GM Momentum

The bestiary now has newer momentum rules. Each monster lists a momentum die count next to its name, such as `1d10`, `2d10`, or `10d10`. At start of each round, the GM rolls those dice for each living monster. Any 10 lets the GM use a monster maneuver on that monster's turn. Extra 10s may trigger other maneuvers, grant extra weapon attacks, or empower a maneuver.

Older text still mentions a GM momentum threshold of 30. Roadmap should use the newer die-on-10 rule because later changelog entries say monster momentum dice were added, and the bestiary foregrounds the new rule.

### Enemy Stats

Enemy stat blocks are not shaped like PCs. They usually include:

- name and momentum dice
- level
- creature type
- vice type
- sin gained or absolved for angels/demons
- size
- health
- reflex
- resistances, vulnerabilities, immunities
- passive notes
- maneuver
- weapon attack
- abilities
- tactics text

Important ambiguity: enemy Reflex values are inconsistent. Many enemies show single-digit Reflex values like `4`, `6`, or `7`, which look like modifiers. Throne shows `Reflex: 74`, which looks like a full stat. Before initiative automation, decide whether enemy Reflex is stored as full stat, modifier, or either with normalization.

### Damage and Defense

PC weapon attacks roll against the weapon's attacking stat. On success, damage follows weapon formula. Critical hits double associated damage for weapon attacks or roll-based damage abilities.

When an enemy attacks a PC with a weapon attack, the PC chooses Reflex or Heart:

- Reflex success avoids all damage.
- Heart normal success reduces damage by Heart modifier.
- Heart hard success reduces by Heart modifier plus 2.
- Heart critical success avoids all damage.

Temporary HP absorbs damage first. Healing does not restore temporary HP. Temp HP from same source refreshes; different sources stack.

Many enemy abilities use defensive rolls with custom stats and effects. MVP should allow manual effect text plus guided roll/damage application instead of trying to encode every bestiary ability.

### Conditions

Core conditions are Banished, Blinded, Bound, Dazed, Hidden, Paralyzed, Silenced, and Stunned. Other combat effects appear in class/perk/enemy text, such as Taunted, Pacified, Concentrating, Marked, Poisoned, Focus, Sow, Burning, Fled, Dying, and custom telegraphs.

## Product Principle

Do not start with a complete combat rules engine.

Build a combat operating layer first: encounter, combatants, ranks, HP, turn order, logs, momentum, and conditions. Then add rules assistants around that layer. DMs must always be able to override state because Fivefold has many table-ruling effects, enemy puzzles, and bespoke abilities.

The target feel is a text-based, turn-based Pokemon-style combat flow: players and the DM choose clear actions, the system resolves trusted game logic, combat state updates automatically, and the log explains the result. Manual edits are an override path, not the primary way combat works.

## Initiative Track

Work through these initiatives in order. Each initiative should close with documented decisions, focused implementation, and verification before moving to the next one.

Specs:

- [Combat I0 Rules Lock Spec](./combat-i0-rules-lock-spec.md)
- [Combat I1 Data Foundation Spec](./combat-i1-data-foundation-spec.md)
- [Combat I3 Initiative And Turn Loop Spec](./combat-i3-initiative-turn-loop-spec.md)

## Collaboration Checkpoints

Before each initiative starts, confirm only the decisions that affect player experience, rule direction, or data shape. Keep the questions narrow so implementation can keep moving.

Checkpoint rhythm:

- Start of initiative: ask 2-5 direction questions.
- During implementation: ask only if a decision changes UX, rules interpretation, or schema permanence.
- End of initiative: document what shipped, what changed from the plan, and what the next initiative needs.

Current open questions for Initiatives 1 and 3: answered.

Answers:

1. One active encounter at a time, with many historical/ended encounters allowed throughout a game.
2. Combat state should be updated by game logic first. For example, if an attack deals 5 damage, HP should automatically drop by 5. DM override remains available for corrections and rulings.
3. Enemy combatants should be hidden until revealed from day one.
4. Combat starts in a new Encounter panel.
5. Players choose their own combat actions in the Encounter panel.
6. Hidden enemies show vague player-facing placeholders instead of disappearing completely.
7. Ended encounters should be visible in a simple encounter history list right away.
8. First-pass player action set is Attack, Shift Rank, Brace, Flee, and Pass.
9. Hidden enemy placeholders show an aggregate count, such as `2 unrevealed threats`, not individual placeholders.
10. Encounter history is role-aware: players see completed public summaries/logs, while DMs see full hidden enemy details.
11. Initiative is rolled by an explicit DM control after combatants are added, not automatically when an encounter starts.
12. Initiative ties resolve by higher Reflex modifier, then a persisted random tiebreaker.
13. Players can end their own current turn. The DM can advance, rewind, or override any turn.
14. Normal player actions are blocked after their relevant Action or Ability allowance is spent. The UI explains why, and the DM retains override controls.

### Initiative 0: Rules Lock

Goal: remove ambiguity before schema/code.

Deliverables:

- Enemy Reflex decision.
- GM momentum rule decision.
- Enemy entry strategy.
- Gear automation decision.

Exit criteria:

- Decisions are documented.
- Schema work is unblocked.

Status: complete.

### Initiative 1: Combat Data Foundation

Goal: persist active combat.

Deliverables:

- `game_encounters`.
- `game_combatants`.
- PocketBase hooks/permissions.
- Server projections, types, and validation.
- Logic-ready combat mutation actions for damage, healing, visibility, and DM override.
- Player action submission from the Encounter panel.
- Aggregate hidden-threat counts for player-facing hidden enemy state.
- Simple encounter history for ended encounters.
- Active encounter load on `/games/[gameId]`.

Exit criteria:

- DM can create/end an encounter.
- Combatants persist and realtime sync.
- Rank/HP live on combatants, not `game_actors`.
- Logic-driven HP/temp HP updates work through server actions.
- Players can choose available actions from the Encounter panel.
- Hidden enemies do not leak details but can still signal an aggregate count of vague threats to players.
- Ended encounters are readable from role-aware encounter history.

Status: complete.

### Initiative 2: Encounter Tracker UI

Goal: manual combat works at table speed.

Deliverables:

- Encounter tool panel.
- Add PCs from actors.
- Add manual enemies.
- Edit HP, temp HP, rank, conditions, and status.
- Party/enemy layout by rank.

Exit criteria:

- DM can run a fight manually without notes-only hacks.

Status: complete. Delivered as part of the Initiative 1 Encounter panel slices.

### Initiative 3: Initiative And Turn Loop

Goal: know whose turn it is.

Deliverables:

- Roll initiative.
- Store turn order.
- Current combatant highlight.
- Next/previous turn controls.
- Round advancement.
- Action/Ability used flags.

Exit criteria:

- Combat can proceed round by round after refresh/realtime.

Status: complete.

### Initiative 4: Fivefold Roll And HP Engine

Goal: core rules assistance.

Deliverables:

- Stat roll helper for normal, hard, critical, and failed rolls.
- Advantage/disadvantage.
- Natural 96+ failure.
- Apply damage/heal.
- Temp HP first.
- Dying/recovery dice tracking.

Exit criteria:

- Rolls and damage are trustworthy enough for live play.

Status: next.

### Initiative 5: Momentum, Ranks, Conditions

Goal: tactical flow.

Deliverables:

- PC momentum and threshold prompt.
- GM monster momentum dice.
- Shift Rank, Brace, and basic maneuver logging.
- Condition chips with expiry notes.
- Flee, return, banished, and offstage states.

Exit criteria:

- Combat starts feeling like Fivefold, not a generic HP tracker.

Status: pending.

### Initiative 6: Enemy Templates

Goal: reduce DM setup work.

Deliverables:

- Code-based bestiary templates.
- First set: Bandit, Bandit Archer, Bandit Bruiser, Hellhornet, Winged Wolf, Scorched Raider.
- Enemy picker.
- Stat block cards with attack, ability, maneuver, and tactics text.

Exit criteria:

- DM can add common enemies quickly.

Status: pending.

### Initiative 7: Attack Assistants

Goal: guided combat resolution.

Deliverables:

- PC weapon attack assistant.
- Weapon list data.
- Rank legality checks.
- Attack result plus suggested damage.
- Enemy attack to PC defensive roll assistant.
- Heart defensive reduction ladder.

Exit criteria:

- Common attacks are guided, but DM still confirms damage.

Status: pending.

## Initiative 0 Decisions

Use these as the working defaults for implementation. Revisit only if playtesting or rules review shows a concrete mismatch.

### Enemy Reflex

Decision: store both raw enemy Reflex text/value and a normalized `reflexMod` for initiative.

Rationale: bestiary entries are inconsistent. Most enemies list single-digit Reflex values that read like modifiers, while Throne lists `Reflex: 74`, which reads like a full stat. Initiative only needs `d10 + Reflex modifier`, so combat state should keep the original value for display and use a normalized modifier for mechanics.

Normalization:

- If enemy Reflex is 0-10, treat it as the modifier.
- If enemy Reflex is 11-90, treat it as a full stat and use `floor(reflex / 10)`.
- Allow DM override when creating/editing enemy combatants.

### GM Momentum

Decision: use the newer monster momentum dice rule.

At the start of each round, roll each living monster's listed momentum dice. Every 10 creates a pending monster maneuver trigger. Extra 10s can be spent by the DM for extra attacks, additional maneuvers, or empowered maneuvers according to the stat block.

Rationale: the bestiary foregrounds the new rule, and the changelog says monster momentum dice were added after the older threshold-30 rule.

### Enemy Entry

Decision: manual enemy entry first; code-based templates after the combat tracker works.

Rationale: manual entry unblocks combat state and UI faster. Templates need stat-block curation and should land once the data shape is proven.

### Gear Automation

Decision: keep gear free-text for the MVP. Add structured selected weapons in the attack-assistant initiative.

Rationale: core combat needs HP, turns, ranks, and rolls first. Gear, scrolls, dual wielding, shields, and armor modifiers are too deep for the first data foundation.

## Data Model Roadmap

### Phase 1: Encounter State

Add `game_encounters`:

- `game` relation
- `scene` optional relation
- `name`
- `status`: `draft`, `active`, `ended`
- `round`
- `turnIndex`
- `gmMomentumLog` or `gmMomentumPending`
- `createdBy`
- timestamps

Invariant: only one encounter can be `active` per game at a time. Ended encounters remain as game history.

History rule: ended encounters should be readable in the Encounter panel through a simple history list, including name, status, round count, timestamps, and visible/revealed participants. Players see public summaries/logs only. DMs see full hidden enemy details.

Add `game_combatants`:

- `game` relation
- `encounter` relation
- optional `actor` relation
- `kind`: `pc`, `enemy`, `ally`, `npc`
- `side`: `party`, `enemy`, `neutral`
- `name`
- `owner` optional user relation for player-owned PCs
- `level`, `size`, `vice`, `creatureType`
- `soul`, `heart`, `mind`, `reflex`, `voice` snapshot fields when relevant
- `reflexMod` optional normalized enemy initiative field
- `maxHp`, `currentHp`, `tempHp`
- `recoveryDiceMax`, `recoveryDiceRemaining`
- `rank`: `near`, `far`, `offstage`, `fled`, `banished`
- `visibleToPlayers`
- `revealedRound`
- `initiativeRoll`, `initiativeScore`, `turnOrder`
- `momentum`, `momentumThreshold`
- `actionUsed`, `abilityUsed`, `maneuverUsed`
- `conditions` JSON
- `resistances`, `vulnerabilities`, `immunities` JSON or text
- `statBlock` JSON or text for enemy attacks, abilities, maneuvers, and tactics
- `notes` visible text and `dmNotes` hidden text

Visibility rule: PCs and revealed combatants are player-visible. Hidden enemy combatants are DM-only until revealed, but players see an aggregate count such as `2 unrevealed threats` when hidden danger exists. The count must not leak names, stats, HP, rank, or individual identities.

Add `game_combat_actions` or an equivalent action-log shape if simple server actions are not enough:

- `game` relation
- `encounter` relation
- `combatant` relation
- `actor` optional relation
- `submittedBy` user relation
- `kind`
- `targetCombatant` optional relation
- `payload` JSON
- `status`: `submitted`, `resolved`, `cancelled`
- `result` JSON or text
- timestamps

Initial action kinds: `attack`, `shiftRank`, `brace`, `flee`, `pass`.

Action rule: players submit their own combat actions from the Encounter panel. Server-side game logic resolves supported action kinds and updates combat state. DM override/cancel remains available.

Why separate combatants from actors: actors are persistent table identities; combatants are encounter snapshots. Same NPC can appear in multiple encounters. Enemy stat blocks can exist without polluting the actor roster. Rank and HP are encounter-specific, not identity-specific.

### Phase 2: Combat Log

Either extend `game_messages` or add `game_combat_events`.

Recommended early choice: extend `game_messages` with combat-specific system messages first. Add `game_combat_events` only when filtering, undo, or auditability becomes painful.

Combat log entries should include enough text for humans:

- initiative rolled
- turn started/ended
- rank shifted
- attack/defense roll result
- damage applied
- combatant revealed or hidden
- condition added/removed
- momentum gained/spent
- maneuver triggered
- round advanced

## Implementation Roadmap

### Milestone 0: Rules Decisions

Goal: unblock schema without encoding wrong rules.

Tasks:

- Decide enemy Reflex normalization: full stat, modifier, or mixed with explicit field.
- Confirm new GM momentum dice replace older threshold 30 rule.
- Decide whether enemies should be stored as templates before active encounters or entered manually first.
- Decide whether player gear stays free text for MVP or gets structured equipped weapons early.

Success criteria:

- Short design note added to `docs/combat-roadmap.md` or project architecture.
- No UI/code work blocked by rules ambiguity.

### Milestone 1: Active Encounter Tracker

Goal: DM can start an encounter and the system can persist logic-ready combat state.

Tasks:

- Add PocketBase migrations for `game_encounters` and `game_combatants`.
- Add server validation/projection helpers in `src/lib/server/games.ts` or a focused combat module.
- Add PocketBase hooks enforcing game membership, DM-only encounter creation/update, player-owned PC visibility, and DM-only enemy management.
- Enforce one active encounter per game.
- Support hidden enemy combatants and reveal state.
- Support aggregate hidden-enemy counts for players.
- Add a simple role-aware ended-encounter history projection.
- Add player-submitted action support for own PC combatants.
- Add server-side damage/heal mutation helpers so HP/temp HP changes are logic-driven, not just text edits.
- Load active encounter and combatants from `/games/[gameId]`.
- Add an Encounter tool panel to existing live table UI.

Minimum UI:

- Start/end encounter.
- Add PCs from existing actors.
- Add manual enemy combatants.
- Submit Attack, Shift Rank, Brace, Flee, and Pass actions for own PC combatants.
- Reveal/hide enemy combatants.
- Show aggregate hidden-enemy counts to players.
- Apply damage/healing through combat actions.
- DM override for current HP/temp HP/rank/status/conditions.
- Show ended encounter history.
- Show party and enemy columns by rank.

Success criteria:

- DM can start one active encounter in a game.
- Ended encounters can remain in game history.
- Players can read public ended-encounter history.
- DMs can read full ended-encounter history with hidden enemy details.
- Players can see encounter board and their own PC state.
- Players can submit own-PC combat actions.
- Hidden enemies stay DM-only until revealed.
- Hidden enemies show only aggregate counts without leaking names, stats, HP, rank, or individual identities unless revealed.
- Damage/heal actions update HP/temp HP automatically and all connected clients update realtime.
- DM can override combatant HP/rank when needed.

### Milestone 2: Initiative and Turn Loop

Goal: table can run rounds and turns.

Tasks:

- Add initiative roll action using d10 plus PC Reflex modifier or enemy normalized Reflex value.
- Store initiative score and stable turn order.
- Add next-turn, previous-turn, and end-round actions for DM.
- Track `actionUsed` and `abilityUsed` per current combatant.
- Reset per-turn flags when turn advances.
- Add system log messages for initiative and turn changes.

Success criteria:

- DM can roll initiative for all combatants and order is deterministic.
- Current turn is obvious in UI.
- Round advances after final combatant.
- Turn changes survive refresh and realtime updates.

### Milestone 3: Fivefold Roll Assistant

Goal: existing `/r` is upgraded with Fivefold-aware combat rolls without replacing freeform dice.

Tasks:

- Add helper functions for modifier, normal/hard/critical success, natural critical failure, and advantage/disadvantage.
- Add server-side stat roll action, probably not only chat slash parsing.
- Add UI controls on combatants: roll Soul, Heart, Mind, Reflex, Voice.
- Allow optional target number adjustment for effects like Guidance, armor, shield, scrolls, and disadvantage/advantage.
- Log result with success degree.

Success criteria:

- PC or DM can roll a stat and log normal/hard/critical/failure.
- Natural 96+ always fails.
- Advantage/disadvantage is visible in log.
- Unit tests cover success degree boundaries.

### Milestone 4: Defensive Damage, Temp HP, and Dying

Goal: expand the foundation damage actions into Fivefold-grade damage resolution.

Tasks:

- Extend Initiative 1 damage/heal actions with defensive roll outcomes.
- Apply Heart defensive reduction ladder.
- Apply Reflex full-dodge outcomes.
- Keep true current HP separate from temp HP.
- Mark PCs Dying at 0 HP.
- Track recovery dice remaining and cost when Dying actor acts or takes damage.
- Support manual damage type tags for later resistance/vulnerability automation.
- Add undo-last-damage only if needed; otherwise keep DM override edits.

Success criteria:

- Damage and healing update state and log before/after values.
- Temp HP cannot go below 0 and overflow hits true HP.
- Dying state is visible and recovery dice depletion is trackable.
- DM can override bad state manually.

### Milestone 5: Ranks, Conditions, and Common Effects

Goal: core tactical state works.

Tasks:

- Add rank controls: Near, Far, Offstage, Fled, Banished.
- Add condition chips with expiry notes: end of next turn, start of next round, manual.
- Encode core condition labels and descriptions for UI help.
- Add Brace state for next defensive roll.
- Add Flee/Return actions as logged state changes; keep roll outcome manual at first.
- Add start-of-round reminder for enemies auto-closing if no enemies are Near.

Success criteria:

- DM can apply/remove each core condition.
- Players can understand why a combatant is blocked or hidden.
- Rank changes are visible and logged.

### Milestone 6: Momentum MVP

Goal: table can use PC and GM momentum without full automation.

Tasks:

- Track PC momentum and threshold, default 10.
- Add controls to add/spend/reset momentum.
- Trigger visible `Maneuver ready` state at threshold.
- Add basic maneuver buttons: Shift Rank, Brace, Weapon Attack log.
- At round start, roll GM momentum dice for living enemies using their die count.
- Store pending GM maneuver triggers from rolled 10s.
- Let DM mark triggers spent on a monster turn.

Success criteria:

- PC momentum threshold creates a clear interrupt prompt.
- GM round momentum dice roll and 10s are logged.
- DM can spend or clear pending monster maneuver triggers.

### Milestone 7: Enemy Stat Blocks and Templates

Goal: DM stops typing every enemy from scratch.

Tasks:

- Create a small template library from bestiary MVP enemies: Bandit, Bandit Archer, Bandit Bruiser, Hellhornet, Winged Wolf, Scorched Raider.
- Store templates in code first, not database, unless DM custom templates become an immediate need.
- Add enemy picker that creates combatants with level, size, health, vice, reflex, momentum dice, attacks, abilities, maneuvers, resistances, vulnerabilities, and tactics notes.
- Keep attack and ability execution as log + manual apply-damage until attack automation is ready.

Success criteria:

- DM can add common enemies in under 10 seconds.
- Enemy cards show weapon attack, ability, maneuver, and tactics text.
- Template-created enemies behave like manual combatants.

### Milestone 8: Weapon Attack Assistant

Goal: common PC weapon attacks become guided.

Tasks:

- Decide whether equipped weapons are structured enough for automation. If not, add a simple selected weapon field per combatant inside encounter state.
- Encode base weapon list from rules with stat options, range, momentum, damage formula, type, handedness, light flag, and ability text.
- Add legal target/rank checks.
- Roll attack d100 against selected attacking stat.
- Calculate critical status and suggested damage formula.
- Add momentum on weapon attack, excluding maneuver weapon attack.
- Keep final damage application confirmable by DM.

Success criteria:

- PC can choose weapon, stat, target, and roll attack.
- Log includes hit/miss, success degree, suggested damage, damage type, and momentum gained.
- DM confirms/applies damage separately.

### Milestone 9: Enemy Attack and Defensive Roll Assistant

Goal: common enemy attacks become guided but still DM-driven.

Tasks:

- Add enemy attack action from stat block weapon attack.
- Prompt target PC defensive choice: Reflex or Heart.
- Support Heart reduction ladder and Reflex full avoid.
- Support advantage/disadvantage and manual roll modifiers.
- Add custom defensive roll for enemy abilities with selected stat and required success degree.

Success criteria:

- DM can launch enemy attack and target can roll defense.
- System calculates avoid/reduce result for normal weapon attacks.
- Ability defenses still allow custom text and manual adjudication.

### Milestone 10: Automation Depth

Goal: add specific rules only after core combat loop is stable.

Candidate modules:

- Class base features for Warrior, Scout, Priest, Magi, Versant.
- Starting perks and common prerequisite perks.
- Temporary HP source stacking.
- Resistances, vulnerabilities, immunities.
- Summons and concentration.
- Poison/burn/delayed damage effects.
- Taunt targeting constraints.
- Per-round effect expiration.
- Structured gear, armor, shields, scrolls.

Success criteria:

- Each automation module has unit tests and a manual override path.
- No module blocks DM from fixing state at table speed.

## MVP Cut

Fastest useful MVP is Milestones 1 through 4:

1. Logic-ready encounter tracker.
2. Initiative and turn loop.
3. Fivefold stat roll assistant.
4. Defensive damage, temp HP, and dying tracker.

This gives playable combat with action choices, automatic state updates, and DM override. Ranks, conditions, momentum, enemy templates, and weapon automation can then land as focused follow-ups.

## Test Plan

Unit tests:

- stat modifier calculation
- success degree boundaries
- natural 96+ failure
- advantage/disadvantage roll selection
- recovery dice max
- temp HP damage application
- Heart defensive reduction ladder
- turn order sorting and round advancement
- hidden enemy projection

Server/action tests:

- non-member cannot read encounter
- player cannot create/update enemy combatants
- players cannot arbitrarily edit combat state during MVP
- player-facing combat actions update state through game logic when enabled
- DM can start/end encounter and update combatants
- only one active encounter per game
- ended encounters remain accessible as game history

PocketBase hook/API verification:

- DM creates active encounter
- player sees active encounter
- player does not see hidden enemy combatants
- DM reveals a hidden enemy and player receives it realtime
- player cannot mutate enemy HP/rank/conditions
- damage/heal action updates HP/temp HP automatically
- realtime updates reach another session

Browser verification:

- desktop encounter board fits beside existing scene/log layout or opens in tool dialog without document scroll regression
- mobile can open encounter tool and update own visible state
- turn highlight and HP changes update without reload

## Risks

- Enemy Reflex ambiguity was resolved as a normalization rule, but implementation must preserve raw Reflex display and normalized `reflexMod`.
- Full class/perk automation is too large for first combat slice. Keep DM override path.
- The old `game_actors.rank` removal was correct for character sheets, but combat rank must return as encounter state.
- Existing `hpNotes` and `status` text fields are not enough for damage, dying, temp HP, or turn logic.
- Combat state should not leak DM-only notes or hidden enemy data to non-DMs.
- Multiple untracked/migrated repo changes exist right now, so combat work should stay narrow and avoid unrelated cleanup.
