---
status: done
title: Selectable prebuilt parties for solo-controlled dungeon runs
type: spec
updated_at: '2026-08-07T07:49:37Z'
---

## Spec

Selectable prebuilt parties for solo-controlled dungeon runs

## Problem

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

## Constraints

- GitHub Issue #18 remains canonical; this file only enables Plan CLI execution.
- New party behavior uses a stable content version and must not reinterpret or
  rewrite older solo snapshots, commands, events, or history.
- `src/lib/game/` remains deterministic, immutable, seeded, and framework-free.
- Server LegalCommands own actor, target, range, turn, and economy legality;
  Svelte may only present sanitized projections.
- Party size stays between one and three unique fixed prebuilts. No character
  builder, duplicate class, AI companion, co-op, party splitting, generalized
  scheduler, or generalized inventory transfer.
- Enemy stats never scale by party size; only authored deterministic encounter
  composition changes.
- No PocketBase schema mutation, production migration, or deployment. Discovery
  of a schema requirement stops that portion for separate approval.
- Obsidian + Bone, keyboard access, visible focus, 44px targets, non-color state,
  reduced motion, and desktop/mobile reachability remain release constraints.

## Solution Shape

- Introduce one new party-native content version beside unchanged legacy solo
  resolvers.
- Reconstruct one-to-three fixed templates server-side from stable template IDs
  and starting ranks; persist stable member IDs and one exploration leader.
- Keep member combat/equipment/progression state individual and expedition
  resources shared.
- Resolve one interleaved seeded initiative over party members and enemies, with
  explicit actor/target IDs, per-member AP, Down skipping, and full-party defeat.
- Extend explicit typed class-feature targeting, party-size encounter variants,
  sanitized projections, snapshots, summaries, and repository idempotency.
- Present roster selection, active-member controls, compact party rail, ally
  targeting, and turn order through server-provided legality.

## Risks / Open Questions

- No product decision remains open. Implementation risk centers on preserving
  exact legacy replay while widening shared engine types.
- Ally conversion can expose hidden self-only shortcuts; every shipped feature
  needs table-driven source/target/rank/duration review.
- Multi-actor interruption around Down, healing return, encounter end, and stale
  retries can duplicate turns or terminal history unless event order is pinned.
- Authored two-/three-member compositions need deterministic balance evidence;
  they cannot rely on enemy stat scaling.
- Dense party state can crowd Tomb Record and target controls, especially on
  mobile; browser verification must cover full reachable flows.
- Rollback is version selection: stop new party-run creation while retaining
  party snapshot decoding. Never rewrite party runs into legacy solo state.

## Scope

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

## Acceptance Criteria

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

## Verification

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

## Dependencies

- blocked by: none

## Readiness

- status: ready
- note: Ready for promotion and implementation planning.

## Source

- .plan/brainstorms/selectable-prebuilt-parties-for-solo-controlled-dungeon-runs.md

## Execution Compatibility

- Canonical planning issue: https://github.com/JimmyMcBride/five-fold-game/issues/18
- Promotion source: `.plan/brainstorms/selectable-prebuilt-parties-for-solo-controlled-dungeon-runs.md`
- This file exists only for Plan CLI execution compatibility.

## Analysis

### Missing Constraints

- None.

### Success Criteria Gaps

- None.

### Hidden Dependencies

- [warn] The spec mentions data-shape changes without calling out migration or data-safety risks.

### Risk Gaps

- None.

### What/Why vs How Leakage

- [warn] The narrative sections include implementation detail that belongs in Solution Shape or Data / Interfaces.

### Recommended Revisions

- [warn] Add migration, backfill, or rollback concerns to ## Risks / Open Questions and ## Rollout.
- [warn] Keep ## Why, ## Problem, ## Goals, and ## Non-Goals product-facing, then move technical detail into ## Solution Shape or ## Data / Interfaces.

## Checklist

### general

status: ok
blocking_findings: 0
guidance_findings: 0

- [ok] No findings.
