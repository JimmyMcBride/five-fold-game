---
created_at: '2026-08-03T08:25:21Z'
project: FiveFoldGame
slug: selectable-prebuilt-parties-for-solo-controlled-dungeon-runs
status: active
title: Selectable prebuilt parties for solo-controlled dungeon runs
type: brainstorm
updated_at: '2026-08-03T08:27:20Z'
---

# Brainstorm: Selectable prebuilt parties for solo-controlled dungeon runs

Started: 2026-08-03T08:25:21Z

## Focus Question

How can Fivefold support a player-controlled party without turning a fast browser dungeon run into character-management overhead or silently changing the canonical party rules?

## Desired Outcome

A player can select one to three distinct prebuilt characters from the five starting classes, understand the tactical tradeoff, and play the complete run while directly controlling every party member. The feature should make ally abilities, formation, individual initiative, and party recovery meaningful while keeping solo and reduced-party challenge runs viable.

## Vision

Before entering St. Bozma's Tomb, the player sees five complete adventurers: one Warrior, Scout, Priest, Magi, and Versant. Each has a fixed name, identity, level-1 rules package, equipment, concise tactical role, and sensible starting rank. The player clicks one to three characters, optionally adjusts their starting ranks, and begins. No naming form, stat allocation, or build wizard interrupts the run.

During play, the initiative order decides which character the player controls. The active character receives the full action surface; companions remain compact but legible, with health, Recovery Dice, momentum, rank, and conditions always visible. The same roster supports inspection and valid ally targeting without allowing arbitrary turn swapping.

The party moves as one expedition outside combat. A chosen leader resolves searches and interactions, and the player can switch leaders before committing an exploration action. In combat, each member keeps an individual rank and may reposition through normal rules. A character at 0 HP is Down and unavailable, healing can return them, and the run ends only when the whole party is Down.

## Supporting Material

- `docs/game-rules/sections/02-combat-rules.md` — canonical AP, ranks, fleeing, and combat behavior.
- `docs/game-rules/sections/10-classes-perks-and-advancement.md` — five starting classes, ally-facing features, and party-divided XP.
- `src/lib/game/content/classes.ts` — current playable level-1 class kits.
- `src/lib/game/model.ts`, `src/lib/game/state.ts`, and `src/lib/game/projection.ts` — current singular-player state and projection boundaries that must become party-aware.
- `DESIGN.md` and `.impeccable.md` — Obsidian + Bone interface direction.
- Confirmed party-selection design brief from the 2026-08-03 planning conversation.

## Constraints

- One human directly controls the entire party; no companion AI.
- Select one to three characters from five fixed, named, prebuilt level-1 templates.
- Each selected character must have a distinct class; no duplicates initially.
- Full character creation, persistent account rosters, and custom builds are deferred to a separate future feature.
- Preserve canonical individual initiative, two AP per character, individual ranks, and party-divided XP.
- Down characters still receive their encounter XP share to avoid a compounding recovery penalty.
- Party size changes encounter composition, not enemy HP or damage multipliers.
- Gold, relics, quest items, and expedition inventory are shared. HP, Recovery Dice, momentum, AP, equipment, rank, abilities, and conditions remain character-specific.
- The party stays together during exploration; no dungeon splitting.
- Enemies deterministically prefer the closest conscious valid target unless their authored behavior overrides that rule. Equal candidates use a stable seeded tie-breaker.
- Down characters are normally ignored by enemy targeting.
- Preserve deterministic replay, server-authoritative persistence, content-version compatibility, and one-command/one-transition engine behavior.
- Keep the feature compatible with the completed rules/time update; implementation must revalidate canonical citations and snapshots against the then-current engine.
- Maintain WCAG AA, keyboard access, visible focus, minimum hit targets, readable text density, and full mobile functionality.

## Open Questions

- What are the names, identities, species/background/calling choices, exact stats, Origin perks, equipment, and default ranks for the five prebuilt characters?
- What deterministic encounter composition produces fair but distinct one-, two-, and three-character runs?
- How should canonical per-character fleeing interact with the product rule that the expedition does not split outside combat?
- Which existing class features still assume a single player or target and require party-aware targeting?
- How should shared inventory interact with character-owned equipment without creating a full inventory-management feature?
- What compatibility behavior applies to saved solo runs created before party state exists?

## Ideas

- Present the five characters as a roster, not a generic card grid: strong identity, concise role, signature feature, current kit, and starting rank.
- Clicking toggles selection. The start action enables at one member and selection caps at three with clear feedback.
- Label one- and two-character parties as challenge choices without promising a separate difficulty system.
- Give each prebuilt character a stable template ID independent of display name and class so saved runs and future content revisions remain traceable.
- Store the selected party in stable order, but let initiative—not selection order—control combat turns.
- Use a compact party rail during play. Expand only the active character's commands; preserve all members' critical state at a glance.
- Use the same member interaction for inspect and ally-target modes, with explicit eligible, selected, invalid, active, and Down states.
- Let the player change exploration leader before a roll. Record the acting character and full roll math in the Tomb Record.
- Scale encounters by adding or changing enemies and elites through authored deterministic budgets. Avoid health-sponge scaling.
- Run records capture party lineup, size, depth, rooms, defeated enemies, treasure, Down events, and final outcome/cause.

## Raw Notes

- Party size: minimum 1, maximum 3.
- Available classes: Warrior, Scout, Priest, Magi, Versant.
- Prebuilt selection replaces character creation for this release.
- Closest valid enemy remains the player's default target; any valid in-range enemy can be selected.
- Closest conscious party member is the default enemy target; authored enemy traits can override it.
- Every party member receives the canonical divided XP share, including members who are Down when victory resolves.
- At 0 HP a member is Down, cannot act, and may be restored by healing. After combat, Patch Up may restore them if Recovery Dice remain. Full-party Down ends the run.

## Refinement

### Problem

The current engine, persistence model, projection, and UI are built around one `player`. Fivefold's class kit and combat rules assume a party: individual initiative, ally targets, same-rank effects, healing, reactions, and complementary roles. Simply rendering three copies of the solo character panel would not supply correct cross-character rules or a usable control model.

### User / Value

Browser dungeon players gain the tactical party play Fivefold was designed around without coordinating other humans or learning a character builder. They can compose a standard three-character expedition or deliberately attempt the tomb with one or two characters for a harder run.

### Appetite

One bounded party-foundation feature. It includes prebuilt selection, party-aware deterministic state, initiative control, ally/enemy targeting, party defeat and recovery, encounter scaling, save/resume, run records, and responsive party UI. It excludes full character creation, companion AI, co-op, persistent rosters, and broad inventory management.

### Remaining Open Questions

- Resolve the six questions above in the Promotion map. Exact prebuilt content and encounter composition require rules review plus deterministic reference-run testing; they must not be guessed inside Svelte components.

### Candidate Approaches

- 1. **Party-native state and commands (recommended).** Replace singular player assumptions at the domain boundary with a bounded party collection, stable member IDs, active initiative actor, explicit source/target IDs, and party-aware projections. More foundational work, but it correctly supports ally rules, persistence, and replay.
- 2. **Wrap multiple solo states.** Keep one independent game state per character and coordinate them in the route/UI. Initially smaller, but duplicates rooms and enemies, breaks shared effects and initiative, and makes atomic persistence unreliable. Reject.
- 3. **Simulate companions as abilities.** Retain one player and expose other classes as summon-style commands. Cheap, but it does not deliver selectable party control or Fivefold's class interplay. Reject.
- 4. **Build full character and roster architecture now.** Adds flexibility the release does not need and delays the playable party loop. Reject.

### Decision Snapshot

- Build a party-native engine model rather than composing solo sessions.
- Ship exactly five fixed prebuilt templates, one per class.
- Let the player select one to three unique-class members for each new run.
- Keep one human in control and obey individual initiative.
- Share expedition resources while retaining individual combat and equipment state.
- Use Down/full-party-defeat as the initial dungeon adaptation; defer full Dying automation.
- Scale enemy composition deterministically by party size.
- Keep the interface active-character-led with a persistent compact party rail.

## Challenge

### Rabbit Holes

- Designing a general-purpose character builder or account roster.
- Adding companion personalities, autonomous behavior, relationship systems, or dialogue trees.
- Treating party selection as a reason to introduce co-op networking or simultaneous clients.
- Automating the entire canonical Dying, specialization, perk, hunger, encumbrance, torch, or ration ruleset.
- Rebuilding all inventory and equipment flows before the party loop proves itself.
- Creating elaborate drag-and-drop formation controls for a two-rank system.
- Hand-balancing every procedural encounter instead of defining small deterministic party-size budgets and reference fixtures.

### No-Gos

- No duplicate classes in the initial roster.
- No arbitrary combat turn swapping.
- No hidden companion AI decisions.
- No HP/damage multipliers masquerading as party-size balance.
- No party splitting during dungeon exploration.
- No loss of deterministic replay or expected-version persistence protection.
- No silent reinterpretation of canonical ally, range, XP, AP, or initiative rules.
- No three full solo dashboards competing with the Tomb Record and command surface.

### Assumptions

- Existing class kits are sufficiently complete to seed five prebuilt characters, but not necessarily balanced for every party combination.
- The procedural encounter system can accept a party-size budget without abandoning authored enemy behavior.
- Stable member/template IDs can be introduced without making display names identity keys.
- Shared expedition items can remain simple until equipment assignment is explicitly specified.
- Existing solo runs need a defined compatibility path rather than an implicit conversion.

### Likely Overengineering

A generic entity-component actor system, reusable squad framework, formation editor, dynamic roster database, AI behavior planner, or multiplayer-ready event protocol would exceed the approved need. The smallest durable abstraction is a party of one to three player-character records with stable IDs, an initiative actor, explicit targets, and deterministic commands.

### Simpler Alternative

Ship a fixed three-character party only. This would reduce selection and scaling work, but it removes the player's requested composition choice and one-/two-character challenge runs. The recommended bounded alternative is still five fixed templates with selection capped at three; defer every customization layer beyond selection and starting rank.

## Promotion map

### Spec 1 — Selectable prebuilt parties for solo-controlled dungeon runs

#### Purpose

Move Fivefold from a singular-player dungeon state to a bounded party-native run: one human selects and directly controls one to three fixed prebuilt characters while canonical initiative, ally abilities, individual ranks, shared expedition resources, deterministic persistence, and the Obsidian + Bone play surface remain coherent.

#### Problem

Current engine, persistence, projection, and UI center one `player`. Fivefold's class rules assume several player characters through individual initiative, ally targets, same-rank effects, healing, reactions, and complementary roles. Rendering several independent solo panels would break shared encounters, cross-character effects, atomic persistence, and usable turn control.

#### Goals

- Let players begin a run by selecting one to three of five fixed prebuilt characters, one per starting class.
- Let one human directly control every selected member through canonical individual initiative.
- Make ally targeting, party formation, recovery, and complementary class roles functional.
- Preserve one-character and two-character challenge runs without a separate difficulty setting.
- Keep party state, commands, replay, save/resume, and run history deterministic and server authoritative.
- Keep the active turn obvious while preserving glanceable state for every party member.
- Retain exact replay support for all older solo content versions and snapshots.

#### Non-Goals

- Full character creation, editable names, stat allocation, custom builds, duplicate classes, or account-level rosters.
- Companion AI, autonomous tactics, simultaneous clients, co-op networking, or party splitting during exploration.
- Arbitrary turn swapping, simultaneous party turns, or a generalized action scheduler.
- Full canonical Dying automation, fleeing, specializations, broad perk automation, hunger, encumbrance, torches, or rations.
- A general inventory transfer/equipment-management system.
- Enemy HP or damage multipliers based on party size.
- Rewriting older snapshots or historical records into party state.
- Production deployment or PocketBase schema mutation without separate authorization.

#### Design Direction

Preserve Obsidian + Bone as a severe tactical ledger. Party selection feels like choosing doomed adventurers, not completing a form. Active actor, eligible targets, Down state, health, rank, and turn order must remain readable without relying on color. Desktop and mobile retain the same decisions; mobile compacts the party rail rather than hiding members or commands.

#### Scope

##### 1. Five fixed prebuilt characters

- Define exactly five stable character templates: Warrior, Scout, Priest, Magi, and Versant.
- Give every template a stable `templateId`, fixed authored name, short identity, tactical role, class, existing level-1 stats, Origin perk, features, equipment, and default Near/Far rank.
- Reuse current `CLASS_KITS` as the mechanical baseline. Do not add unimplemented species, background, calling, perk, or equipment mechanics merely to enrich biography text.
- Describe roles from actual commands: Warrior front-line protection/control, Scout mobile precision, Priest recovery/support, Magi occult control/damage, and Versant momentum/support/damage.
- Keep template IDs independent from display names and class labels so saved runs remain traceable after copy revisions.
- Review all five templates through `fivefold-game-rules`; cite canonical class rules and label every retained dungeon adaptation.

##### 2. Party selection and run creation

- Replace name/class creation for new-version runs with a roster of all five prebuilts.
- Clicking a roster entry adds or removes it. Require one member, cap selection at three, and prevent duplicate template/class selection server-side.
- Show fixed name, class, role, signature feature, equipment summary, and default rank before selection.
- Label one- and two-member lineups as challenge choices without inventing difficulty tiers or changing rewards.
- Let players accept class default ranks or choose each selected member's starting Near/Far rank before departure.
- Show a compact selected lineup and enable `Enter the Tomb` only for a valid one-to-three-member party.
- Submit template IDs and starting ranks through the existing authenticated run-creation boundary. Server reconstructs canonical templates and rejects unknown, repeated, empty, or over-cap input.

##### 3. Party-native deterministic state

- Replace new-version singular `player` state with a bounded ordered `party` of one to three player-character records carrying stable run-member IDs and template IDs.
- Keep HP, maximum HP, Recovery Dice, momentum, AP, equipment, rank, abilities, conditions, and progression on each member.
- Keep gold, relics, quest state, consumable inventory, dungeon graph, room state, merchant state, RNG state, and run outcome at expedition level.
- Add explicit active actor and exploration leader IDs. Never use display name or array index as durable identity.
- Add actor and target IDs to rules-sensitive commands and events. Command resolution validates actor turn, target type, target eligibility, AP, range, and expected snapshot version before consuming RNG or mutating state.
- Preserve one legal command -> one deterministic state transition -> one ordered event batch.

##### 4. Individual initiative and turn ownership

- Roll initiative for every conscious party member and enemy using canonical `d10 + Reflex Modifier` behavior.
- Produce one deterministic interleaved turn order. Resolve ties through the existing seeded deterministic rule or a documented seeded tie-breaker.
- Grant and reset AP, used-action IDs, and turn-scoped effects per acting character.
- Automatically focus the active member's commands when their turn begins.
- Clicking another member never steals the turn; outside a valid target mode it opens inspection only.
- Skip Down actors deterministically. End or advance the round only after every eligible actor receives its turn.

##### 5. Ally, enemy, and authored AI targeting

- Make sanitized legal commands the sole source for eligible self, ally, enemy, rank, and untargeted actions.
- Preserve existing closest-valid enemy selection for player offense; players may select any other legal in-range enemy.
- Let ally-targeting commands select any legal conscious or Down member allowed by the underlying feature. Do not reinterpret target rules in Svelte.
- Audit every current class feature for source actor, target, same-rank, duration, and stacking assumptions. Convert solo self-only shortcuts to canonical ally/self behavior where the imported rule supports it; otherwise retain and document the existing adaptation.
- Enemies prefer the closest conscious legal party target unless authored behavior supplies another deterministic priority.
- Resolve equal enemy targets with a stable seeded tie-breaker. Down members are ignored unless a future approved enemy trait explicitly targets them.
- Record acting character, target, roll math, damage/healing math, and state changes in the Tomb Record.

##### 6. Down, recovery, party defeat, and progression

- For this release, 0 HP makes a member `Down`: unavailable for actions and normal enemy targeting but still present in party state.
- Valid healing above 0 HP returns a Down member to play at the next legal initiative opportunity; it never grants an immediate extra turn.
- After encounter victory, allow existing Patch Up behavior to restore a Down member only when that member has Recovery Dice and the resulting roll raises HP above 0.
- End the run immediately when all party members are Down simultaneously. One-member runs therefore preserve current run-ending defeat at 0 HP.
- Divide encounter XP canonically by fixed party size, rounded down. Every selected member receives the same share after victory, including members Down at encounter end.
- Keep level, XP, health growth, and future level-up choices per member.
- Defer full canonical Dying and per-character fleeing. Existing product has no Flee command; this spec does not add one.

##### 7. Exploration leadership and shared resources

- Party movement changes one shared room position; exploration never separates members.
- Maintain one exploration leader. Show the leader and allow switching to any conscious member before a search, interaction, merchant action, or room commitment.
- Resolve an exploration roll from the committed leader's stats and record their identity and full math.
- If leader becomes Down, select the next conscious member in stable party order. If none exists, party defeat already applies.
- Treat gold, relic slots, quest items, consumables, merchant stock, searches, ambush outcomes, and room consequences as expedition state.
- A consumable from shared inventory is used by the acting character or explicit legal target through a server-provided command.
- Keep equipped and reserve weapons on individual members. Do not add general item transfer; any future equippable loot requires a separate approved inventory rule.

##### 8. Party-size encounter composition

- Keep all enemy stat blocks, attacks, health, rewards, and authored behavior unchanged across party sizes.
- Retain current single-character encounter compositions as the solo baseline.
- Add explicit deterministic two- and three-character composition variants to encounter content instead of a generic HP/damage scaler.
- Variants may add standard enemies, substitute a stronger authored enemy, or add an elite only where current content and room fiction support it.
- Select variants from content version, seed, room/encounter identity, and party size. Identical inputs produce identical enemies, order, ranks, and RNG cursor.
- Define curated reference seeds for all three sizes. Tune composition using completion, resource-pressure, class-role, and party-wipe evidence; do not guarantee every lineup identical win rates.
- Preserve encounter rewards from defeated authored enemies, then apply canonical party XP division.

##### 9. Persistence, versions, and run records

- Introduce a new stable content version for party-enabled runs; never use `latest` as stored identity.
- Continue resolving older solo snapshots through their recorded content versions and singular-player types. Do not convert, reroll, or rewrite them.
- Persist complete party records, active actor, initiative order, leader, shared resources, RNG cursor, history, and expected version atomically.
- Unknown or malformed party versions fail closed without mutation. Stale/replayed commands preserve current idempotency behavior.
- Resume restores the same party, leader, ranks, targets, turn, commands, shared state, and Tomb Record.
- Extend immutable run summaries with party template/member IDs, fixed names, classes, party size, depth/rooms, defeated enemies, gold/treasure, Down events, and final victory or defeat cause.
- Historical solo summaries remain readable without synthesized party members.
- No PocketBase collection change is expected if party state remains inside versioned snapshots/summaries. If implementation discovers a schema requirement, stop that portion for separate migration approval.

##### 10. Active-character-led party UI

- Party picker shows five roster entries plus a compact selected lineup and rank controls.
- In play, expand the active member's full commands and essential state. Keep other members in a persistent compact party rail showing name/class, HP, Recovery Dice, momentum, rank, conditions, and Down state.
- Expose current initiative order and clear `Active` text; color remains supplemental.
- Reuse member rows for inspection and ally targeting with explicit eligible, selected, invalid, active, pending, and Down states.
- Disable party/target/command controls during pending submissions and explain server-provided unavailable reasons.
- Preserve Tomb Record priority and enemy target controls; avoid three competing full dashboards or nested card stacks.
- Support keyboard selection, semantic controls, visible focus, minimum 44px targets, screen-reader state/turn announcements, reduced motion, and full desktop/mobile reachability.

##### 11. Delivery slices

1. Party data/version boundary: templates, member IDs, shared/individual state, old snapshot compatibility.
2. Party run creation: roster validation, starting ranks, authenticated creation, deterministic initialization.
3. Multi-actor combat: initiative, AP/turn state, actor-aware commands/events, enemy targeting, Down/full-party defeat.
4. Ally/class behavior: target legality, healing/support, same-rank effects, duration/stacking audit, XP/progression.
5. Exploration/economy: leader selection, shared items/gold/relics, party-size encounter variants.
6. Persistence/history: atomic snapshots, resume/idempotency, terminal summaries, old solo readability.
7. UI/accessibility: picker, party rail, active controls, ally targeting, responsive and assistive states.
8. Reference and browser verification across all party sizes and five templates.

#### Acceptance Criteria

- New-version run creation accepts one to three unique known template IDs plus legal starting ranks and rejects empty, duplicate, unknown, or over-cap parties without creating a run.
- All five fixed prebuilts expose stable template IDs, authored names/roles, current level-1 mechanical kits, equipment, signature features, and canonical/adaptation citations.
- Identical content version, seed, selected templates, starting ranks, and commands produce byte-equivalent party state, events, enemy compositions, and RNG cursor.
- Every party member rolls individual initiative, receives only their own legal turn/AP, and cannot act during another member's turn.
- Clicking a non-active member inspects or legally targets them without changing initiative ownership.
- Player enemy targeting and enemy party targeting remain deterministic; authored enemy priorities override only through explicit content data.
- Legal ally/self features apply to the chosen valid member with correct rank, duration, stacking, roll, healing/damage, and Tomb Record math.
- A member at 0 HP becomes Down, leaves normal turn/target eligibility, can return through valid healing, and does not gain an extra turn.
- Full-party Down archives exactly one defeat summary; a surviving conscious member keeps the run active.
- Victory awards every selected member the same rounded-down canonical XP share, including Down members.
- One-character encounter composition matches current solo baseline; two- and three-character variants change authored composition without modifying enemy stats.
- Exploration movement stays shared, leader switching changes the committed actor for the next legal interaction, and leader fallback after Down is deterministic.
- Gold, relics, quest state, consumables, merchant/search state, and room outcomes remain shared; character combat/equipment/progression state remains individual.
- Save/resume restores exact party, turn, leader, target, shared state, history, and legal commands with existing stale/idempotent protections.
- Every prior solo content-version fixture still decodes, replays, and reaches byte-equivalent state/events without party conversion.
- Run history distinguishes party and solo runs and truthfully displays party lineup, size, progress, rewards, Down events, and terminal cause.
- Desktop and mobile keep all party members, turn state, targets, Tomb Record, and legal actions reachable without horizontal clipping.
- Keyboard and screen-reader users can select a party, set ranks, identify active/Down state, choose legal targets, submit commands, and understand pending/errors without color-only cues.
- No companion AI, duplicate class, character builder, generalized inventory transfer, co-op architecture, schema mutation, deployment, or historical rewrite lands under this spec.

#### Verification

- Add template validation tests for one-to-three limits, uniqueness, known IDs, stable IDs, rank validation, and deterministic initialization.
- Add engine tests for interleaved initiative, seeded ties, per-member AP/used actions, actor validation, turn advancement, Down skipping, healing return, full-party defeat, and illegal-command RNG invariants.
- Add LegalCommand tests for self/ally/enemy targets, same-rank restrictions, explicit actor/target IDs, pending/stale rejection, and enemy deterministic target priority.
- Audit every shipped class feature in a table-driven suite covering source actor, eligible targets, durations, stacking, healing/damage, and Down behavior.
- Add encounter fixtures proving solo composition compatibility and deterministic two-/three-member variants without stat mutation.
- Exercise all 25 unique one-, two-, and three-class combinations through deterministic smoke runs; add curated completion/reference seeds for every party size and every class appearing in its intended role.
- Add snapshot/repository tests for old solo decoding and byte-equivalent replay, new party serialization, autosave/resume, idempotent retry, stale version rejection, terminal archival, and history projection.
- Add Playwright flows for one-member creation, three-member selection/ranks, interleaved turns, alternate enemy and ally targeting, a Down/heal return, refresh/resume, party wipe/history, and keyboard use.
- Run desktop and mobile viewports; verify party rail, active commands, Tomb Record, enemy targets, pending state, and errors remain reachable.
- Run `brain session run -- bun run lint`.
- Run `brain session run -- bun run check`.
- Run `brain session run -- bun run test:unit`.
- Run `brain session run -- bun run build`.
- Run `brain session run -- bun run test:e2e`.
- Run `brain context audit`, then project-required `fivefold-testing` and `fivefold-review` workflows before implementation closeout.

#### Dependencies

- blocked by: none
- note: implementation starts from latest `main`, where Issues #4, #6, #9, and #16 are closed baselines rather than blockers
- note: deployment and any discovered PocketBase migration remain separately authorized

#### Readiness

Ready for promotion and implementation planning.
