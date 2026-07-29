---
created_at: '2026-07-29T05:42:40Z'
project: FiveFoldGame
slug: fivefold-web-text-dungeon-crawler-mvp
status: active
title: Fivefold web text dungeon crawler MVP
type: brainstorm
updated_at: '2026-07-29T06:24:28Z'
---

# Brainstorm: Fivefold web text dungeon crawler MVP

Started: 2026-07-29T05:42:40Z

## Focus Question

What is the smallest coherent Fivefold dungeon-crawler MVP that proves the text-first turn loop without silently changing canonical rules?

## Desired Outcome

A reviewable MVP scope that defines the initial player, dungeon, progression, rules, death, save, class, content, persistence, and verification boundaries before promotion.

## Vision

A browser-based, text-first, turn-based dungeon crawler where players move between rooms, encounter enemies and events, fight, collect loot, develop characters, and save runs. It is a player game, not a TTRPG table or GM tool.

## Supporting Material

- `docs/game-rules/README.md`
- `docs/game-rules-provenance.md`
- `docs/architecture.md`
- `docs/adaptations/README.md`
- `DESIGN.md`
- `docs/reference/fivefold-table/README.md`

## Constraints

- Keep specs canonical; preserve the imported rulebook; record adaptations explicitly; keep PocketBase server-only and authoritative.
- MVP is single-player, procedural, and run-based. Co-op, persistent campaigns, permanent metaprogression, and full rules automation are excluded.
- All five starting classes must be playable, but specializations and broad perk automation are outside the first spec.

## Resolved Decisions

- **Player mode:** single-player first.
- **Dungeon generation:** deterministic procedural generation first.
- **Progression:** run-based roguelike; character power, items, gold, and level exist only within a run.
- **Rules fit:** preserve canonical rules that are deterministic, solo-applicable, and useful to the text/turn-based loop.
- **Adaptation fit:** explicitly adapt rules that depend on GM judgment, party/group play, open-ended fiction, or table pacing.
- **Death:** reaching 0 HP ends the MVP run. Canonical Dying/Recovery Die death handling is an explicit deferred adaptation.
- **Save:** autosave after each accepted command; resume the latest active run; death closes that save and starts the next run fresh.
- **Run history:** keep read-only records for completed and dead runs, including seed, class, rooms cleared, enemies defeated, notable loot, and outcome.
- **Classes:** Warrior, Scout, Priest, Magi, and Versant all ship with viable level-1 kits. Specializations and the broad perk catalog are deferred.
- **First dungeon:** St. Bozma’s Tomb.
- **Initial dungeon scope:** one eight-room run: fixed Monastery Grounds entry, six procedurally selected and connected St. Bozma room templates, and fixed Saint Bozma’s Resting Chamber finale. Include at least one branch, two normal combats, one final combat, one noncombat event, and one loot/recovery decision.

## Rules Classification For MVP

- **Canonical where implemented:** five stats and modifiers; d100 normal/hard/critical results; natural 96+ failure; initiative; one Action and one Ability; weapon attacks and critical hits; Heart/Reflex defense; temporary HP; Near/Far ranks; momentum; basic maneuvers; class identity.
- **Explicit adaptations:** automated difficulty/target selection instead of GM calls; solo replacements for group or ally-only mechanics; authored choices for open-ended searching/social rulings; deterministic enemy decisions; procedural St. Bozma layout; immediate run-ending death at 0 HP; autosave without manual rollback.
- **Per-feature gate:** every implemented class feature, enemy ability, item, and room event must cite canonical text or name its adaptation in the promoted spec.

## Selected Initial Content

- Room pool derives from Monastery Grounds, Cabins, Storage Shack, Apiary, Sanctuary, Brewery, Cellar, Tomb Entry, Gallery, Paladin’s Prayer Room, and Groundskeeper’s Storage.
- Enemy pool starts with Scorched Raiders, Hellhornets, and Zeboul, plus one simplified Resting Chamber finale.
- A seed determines room graph, encounter placement, loot, and enemy rolls so a run can be replayed and diagnosed.
- Victory archives the run record and permits a fresh run; no permanent power carries forward.

## Ideas

- Build from the deterministic command/event engine, a seeded St. Bozma room graph, server-authoritative autosaves, read-only run records, and the Obsidian + Bone player UI.

## Raw Notes

Vision: A browser-based, text-first, turn-based dungeon crawler where players move between rooms, encounter enemies and events, fight, collect loot, develop characters, and save runs. This is not a TTRPG table or GM tool.

Supporting sources: docs/game-rules/README.md; docs/game-rules-provenance.md; docs/architecture.md; docs/adaptations/README.md; DESIGN.md; docs/reference/fivefold-table/README.md.

User decisions (2026-07-29): single-player first; procedural dungeon first; run-based roguelike progression; preserve exact Fivefold rules where they fit the text/turn-based RPG; explicitly adapt mechanics that do not fit; death starts a new run; active progress saves until death; retain previous-run records if practical; ship all five starting classes; initial dungeon must at minimum support room movement and combat; St. Bozma’s Tomb is the first playable dungeon. User delegated the exact initial dungeon scope to the product plan.

## Refinement

### Problem

Fivefold has canonical tabletop rules and a legacy multiplayer table implementation, but no bounded product contract for a player-facing web dungeon crawler. Building persistence or content before deciding the MVP shape risks encoding table assumptions and accidental rule changes.

### User / Value

Players get a focused text adventure with understandable tactical choices, trustworthy Fivefold outcomes, meaningful character growth, and resumable runs. Developers get one explicit boundary between canonical rules, adaptations, deterministic engine behavior, and persistence.

### Appetite

One 20–30 minute vertical slice: choose any of five level-1 classes, generate an eight-room St. Bozma run, move through at least one branch, resolve normal and final combat, gain run-scoped loot/progression, autosave/resume, and archive a victory/death record. Exclude co-op, permanent metaprogression, specializations, the broad perk catalog, procedural content authoring tools, and full rule automation.

### Remaining Open Questions

- No product-direction blockers remain for promotion preview.
- The promoted spec must enumerate the exact level-1 kit for each class and the simplified Resting Chamber finale before implementation approval.

### Candidate Approaches

- **Selected:** seeded procedural graph assembled from authored St. Bozma room and encounter templates.
- Fixed entry/finale preserves narrative coherence; six generated middle rooms provide replay variation.
- Server-authoritative autosave plus append-only command/event history preserves roguelike integrity and diagnosis.

### Decision Snapshot

Promote one bounded MVP spec: single-player, seeded procedural St. Bozma run, run-only progression, all five level-1 classes, automatic save/resume, immediate run-ending death at 0 HP, read-only run history, and explicit rule/adaptation classification.

## Promotion map

Target milestone: **Fivefold — Playable St. Bozma MVP**

### Spec 1 — Single-player procedural St. Bozma roguelike

#### Purpose

Deliver the first complete player-facing Fivefold run in the browser. A player chooses any starting class, explores a seeded eight-room version of St. Bozma’s Tomb, makes authored choices, fights normal encounters and a final battle, gains run-scoped rewards, resumes an interrupted run, and leaves a record after victory or death.

#### Scope

##### Run structure

- Start a new level-1 run by choosing Warrior, Scout, Priest, Magi, or Versant and either accepting a generated seed or entering one.
- Generate exactly eight reachable rooms: fixed Monastery Grounds entry, six distinct middle templates selected from the approved St. Bozma pool, and fixed Saint Bozma’s Resting Chamber finale.
- Generate at least one meaningful branch and a valid route from entry to finale. Never require an optional room, item, or failed roll to make the finale reachable.
- Place at least two normal combats, one noncombat event, and one loot-or-recovery decision before the final combat.
- Use the seed for topology, room selection, encounters, loot, enemy choices, and all rolls. The same seed, class, starting state, and command sequence must produce the same event stream and final state.
- Target a first successful run of 20–30 minutes. Victory and any defeat archive the run and permit a fresh start.

##### Player command loop

- Present legal commands for the current state; do not require free-text parser guessing.
- Support inspecting the current room and status, moving through revealed exits, making room/event choices, attacking, using the equipped class actions, abilities, and maneuvers, changing Near/Far rank when legal, patching up after combat, and ending a turn.
- Reject illegal or stale commands without consuming RNG, advancing the turn, or changing persisted state.
- Resolve each accepted command once through the pure engine, emit narration-ready domain events, persist the resulting state/version, and return only a sanitized player projection.

##### Five level-1 class kits

Every class receives a fixed origin-perk choice, compatible weapon/loadout, basic weapon attack, and the following initial identity-defining features. Feature math remains canonical unless an adaptation is named here.

- **Warrior (Heart):** Threatening Strike, Eye for an Eye, Know thy Weapon, and Live for Battle.
- **Scout (Reflex):** Surprise Attack, Sneak, Expertise, and Ambusher.
- **Priest (Soul):** Restorative Prayer, Sacred Light, Shield of Faith, and Divinity. “Target” may be the Priest; ally-only Rebuke is deferred.
- **Magi (Mind):** Shooting Star, Guidance, Bolt, and Inspired Brilliance. Shooting Star counts the Magi’s own qualifying rolls because no allies exist.
- **Versant (Voice):** Encouragement, Hushing Flame, Curse, Bless, and Tough Crowd. Encouragement uses its canonical no-ally momentum fallback; Bless may target the Versant.

Origin-perk choice, exact starting numbers, weapons, armor, and consumables must be represented as versioned content data and balance-tested so every kit can complete the seeded reference runs. Specializations, the broad perk catalog, summons, party-only effects, and unrestricted character building are not part of this spec.

##### Rules contract

- Implement canonical five-stat modifiers, d100 Normal/Hard/Critical bands, natural 96+ failure, initiative, one Action plus one Ability per turn, weapon attacks and critical hits, Heart/Reflex defensive rolls, temporary HP, Near/Far ranks, momentum, and the basic maneuvers required by the selected content.
- Prefer the canonical alternative experience rule for run-scoped advancement: award combat XP from defeated enemy levels, level at `10 × current level`, add 5 to one deterministic class-priority stat, and roll deterministic advancement checks for the others. Offer no specialization or new-perk choice in the MVP; record those as deferred when level-up occurs.
- Automate roll target and difficulty selection that the tabletop text assigns to a GM. Authored event choices declare their stat, difficulty, success result, and failure result.
- Replace group rolls, ally-only behavior, open-ended GM rulings, and freeform negotiation with explicit solo choices or defer the feature.
- Reaching 0 HP immediately ends the run. Do not enter the canonical Dying state or deplete Recovery Dice for death in the MVP.
- Keep Recovery Dice only for canonical post-combat Patch Up. A failed run cannot be restored, duplicated, or rolled back.
- Every implemented feature, enemy ability, item, and event must reference its canonical rule or have a named entry in `docs/adaptations/`.

##### Initial St. Bozma content

- Room templates: Cabins, Storage Shack, Apiary, Sanctuary, Brewery, Cellar, Tomb Entry, Gallery, Paladin’s Prayer Room, and Groundskeeper’s Storage, with Monastery Grounds and Resting Chamber fixed.
- Normal enemies: Scorched Raider, Hellhornet, and Zeboul. Reduce encounter counts and adapt capture, group, or Recovery-Die-loss effects that cannot resolve fairly for one character.
- Loot/recovery content: rations/gold as run-summary rewards, Bozman Sensor, Healing Potion, one compatible Tier 1 scroll reward, and Patch Up.
- Noncombat choices use authored options derived from searching, prayer, the Apiary threshold, the tomb’s moral test, or the locked routes. At least one earlier choice changes a later room or encounter.
- Simplified finale: Barnabe begins in Far rank behind one Scorched Raider. Barnabe alternates a deterministic attack with Decode; the third completed Decode is an objective-failure defeat. Defeating Barnabe before that clock completes is victory. Manessa’s dilemma appears in narration and an earlier authored choice can remove the Raider, but Manessa, the Flamecaller, three summoned Zeboul, and the Throne intervention are deferred from the solo combat.

##### Save, resume, and run records

- Permit one active run per player identity. Autosave after every accepted command and after run creation; no manual save slots, imports, rewinds, or client-authoritative snapshots.
- Submit commands with `runId`, stable `commandId`, and `expectedVersion`. Duplicate command IDs are idempotent. A stale version returns the latest sanitized projection without resolving the command.
- Persist the seed and RNG cursor/state, current snapshot, append-only accepted commands and domain events, and monotonically increasing version needed for deterministic replay.
- On victory, 0-HP death, or objective failure, close the active run and create an immutable summary containing class, seed, start/end time, outcome, rooms visited, enemies defeated, level reached, and notable loot.
- Provide resume-current-run and read-only previous-run list/detail flows. A completed run cannot become active again, and no gold, item, stat, perk, or other power carries into the next run.
- Reuse the existing PocketBase-authenticated server session boundary. Unauthenticated account creation, recovery, social login, and profile systems are outside this game-loop spec; local development may use a documented seeded test user.

#### Data / Interfaces

- Pure domain types: `RunState`, `RoomGraph`, `RoomTemplate`, `ActorState`, `EncounterState`, `ClassKit`, `GameCommand`, `GameEvent`, `RandomState`, and `RunSummary`.
- Engine contract: `resolveCommand(state, command, rng) -> { state, events }`; inputs remain immutable and domain code imports no Svelte, HTTP, or PocketBase modules.
- Server command envelope: `{ runId, commandId, expectedVersion, command }`; success returns `{ projection, events, version }`; stale conflict returns the current `{ projection, version }` without events.
- PocketBase collections: `game_runs` for the owner, active snapshot, seed/RNG state, status, outcome, and version; `run_actions` for append-only command/event records keyed by run and command ID; `run_records` for immutable completed summaries. Keep authored dungeon/class/enemy/item content versioned in source for this MVP.
- PocketBase access remains server-only through one request-scoped client. Collection rules restrict records to their owner; admin credentials and raw records never enter browser data.
- Migration work starts only after this spec is approved. Export the remote schema before applying it, add forward migrations and a local fixture path, and document rollback for newly created collections.

#### Acceptance criteria

- A player can start, play, leave, resume, win, die, suffer objective failure, inspect run history, and start fresh through the browser.
- Each of the five classes is selectable and completes the same curated deterministic smoke seed with a distinct legal command menu and at least one exercised signature feature.
- Every generated dungeon has eight reachable rooms, fixed entry/finale, six distinct approved middle templates, at least one branch, two normal combats, one noncombat event, one loot/recovery choice, and one final combat.
- The same seed, class, starting content version, and command sequence produces byte-equivalent domain events and terminal state across repeated engine runs.
- Normal and hard d100 outcomes, critical outcomes, natural 96+ failure, initiative, Action/Ability economy, defense, critical damage, temporary HP, ranks, momentum, Patch Up, XP, and level-up behave according to the canonical rules or a documented adaptation.
- The finale ends in victory when Barnabe is defeated, objective failure on the third Decode, or death at 0 HP; each outcome archives exactly one immutable run record and clears the active slot.
- Autosave survives browser refresh and a new server request. Duplicate command submission has one effect; stale-version submission has none.
- Browser payloads never contain PocketBase admin credentials, raw auth records, another player’s run data, hidden room/encounter state, or a writable historical snapshot.
- No co-op, campaign character, permanent power metaprogression, specialization, broad perk automation, free-text command parser, GM dashboard, or remote schema mutation outside the approved migrations enters the MVP.

#### Verification

- Run `brain session run -- bun run lint`.
- Run `brain session run -- bun run check`.
- Run `brain session run -- bun run test:unit`.
- Run `brain session run -- bun run build`.
- Run `brain session run -- bun run test:e2e`.
- Unit-test every selected canonical resolution boundary and named adaptation, including natural 96+, advantage/disadvantage, initiative ties, Action/Ability legality, ranks, momentum, temporary HP, 0-HP death, Patch Up, XP, and level-up.
- Property-test generated graphs over a broad fixed seed corpus for exact room count, uniqueness, reachability, fixed endpoints, branch presence, encounter/event quotas, and no progression dead ends.
- Replay identical command fixtures for all five classes and compare event/state snapshots; add distinct fixtures for victory, 0-HP death, and third-Decode failure.
- Integration-test atomic `expectedVersion` handling, duplicate `commandId` idempotency, autosave/resume, terminal-run immutability, active-slot clearing, and owner isolation against local PocketBase.
- Browser-test new run, each class selection, room movement, normal combat, class feature use, loot/recovery choice, refresh/resume, finale victory, death, objective failure, run-history detail, and fresh restart.
- Review `docs/adaptations/` and canonical citations as a release gate; fail the release checklist for any implemented rule with neither.

#### Dependencies

- blocked by: none
- note: implementation depends on the existing deterministic engine boundary, canonical rule corpus, PocketBase server adapter, and Obsidian + Bone shell already present in the repository.
- note: remote PocketBase migration deployment is separately gated by approved schema review and backup/rollback evidence.

#### Risks / Open Questions

- Five solo class kits may differ sharply in survivability. Curated cross-class reference seeds and explicit balance data are required before calling the slice complete.
- Procedural quotas can still produce unwinnable ordering. Generation must validate reachability and prerequisite safety before accepting a graph.
- Canonical tabletop wording sometimes assumes allies or GM discretion. The citation/adaptation release gate prevents silent substitutions.
- Objective-failure timing and autosave must be transactional; a retry cannot advance Decode or RNG twice.
- PocketBase does not replace application-level command serialization. The server must prove atomic version acceptance under concurrent requests.

#### Rollout

- Implement and verify content and the pure engine before enabling persistence migrations.
- Develop PocketBase migrations and fixtures locally; export/backup the target schema before remote application.
- Gate the game route behind an MVP feature flag until deterministic, persistence, isolation, and browser flows pass.
- If persistence rollout fails, disable new-run creation, preserve existing records, and roll back the new collections/rules using the reviewed migration procedure; never fall back to client-authoritative saves.
- Initial release has no permanent economy or compatibility promise for active pre-release runs. Content versions remain stored so archived summaries and replay fixtures stay interpretable.

#### Approval note

This promotion authorizes planning only. It does not authorize implementation, remote PocketBase schema changes, or deployment. Apply the Plan promotion only after the owner confirms this exact issue draft.

## Specs

- Single-player procedural St. Bozma roguelike

## Challenge

### Rabbit Holes

- Encoding every class, perk, item, condition, enemy ability, and edge case before one run is fun.
- Building a general dungeon generator instead of one St. Bozma-specific seeded graph.
- Treating “all five classes” as a requirement for every specialization and perk.
- Designing co-op synchronization before single-turn persistence semantics are proven.
- Treating legacy table specs as current product requirements.

### No-Gos

- TTRPG table or GM dashboard features.
- Silent canonical rule changes.
- Client-authoritative persisted turns.
- Manual save rollback or save-slot duplication that defeats run integrity.
- Permanent power progression in the initial roguelike.
- Remote PocketBase schema changes before approved spec.
- Speculative services, state machines, or game frameworks.

### Assumptions

- Text-first room and event presentation can carry the intended experience.
- Fivefold’s core resolution can support a deterministic digital loop with explicit adaptations.
- PocketBase can support snapshot/history/version persistence once schema is approved.
- Obsidian + Bone remains readable during repeated runs.
- Eight rooms and 20–30 minutes are enough to test navigation, class identity, combat, progression, death, victory, and replay variation.

### Likely Overengineering

Procedural topology, five class kits, broad combat automation, content tooling, generalized effects, and elaborate replay infrastructure can each consume the MVP. Keep the generator St. Bozma-specific, class kits level-1 only, event vocabulary small, and history read-only.

### Simpler Alternative

Fixed entry and finale with six seeded middle rooms; three normal enemy templates; one simplified final encounter; five prebuilt level-1 class kits; one active autosave; read-only run summaries. Expand only after this loop proves fun and trustworthy.
