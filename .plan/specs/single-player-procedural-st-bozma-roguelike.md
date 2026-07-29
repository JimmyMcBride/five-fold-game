---
status: implementing
title: Single-player procedural St. Bozma roguelike
type: spec
updated_at: '2026-07-29T07:16:15Z'
---

## Spec

Single-player procedural St. Bozma roguelike

## Purpose

Deliver the first complete player-facing Fivefold run in the browser. Anyone with a Discord account can follow a shared link, sign in without an invite, create a named run character from any of the five starting classes, explore a seeded eight-room version of St. Bozma’s Tomb, make authored choices, fight normal encounters and a final battle, gain run-scoped rewards, resume an interrupted run, and leave a record after victory or death.

## Problem

The repository has a playable foundation and canonical Fivefold source material, but it does not yet deliver a complete account-owned roguelike run. A new tester cannot follow a link, authenticate, create a character, play a deterministic procedural dungeon through a terminal outcome, resume safely across requests, or review prior runs. The remaining tabletop rules and St. Bozma content also need bounded solo adaptations before they can be implemented consistently.

## Goals

- Let any Discord user access the public alpha without an invitation and create a named, run-scoped character from all five class templates.
- Deliver one deterministic, seeded, eight-room St. Bozma run with movement, meaningful choices, two normal combats, progression, loot/recovery, and a final battle.
- Preserve identifiable canonical Fivefold mechanics while documenting every dungeon-crawler adaptation.
- Make the pure command engine replayable and keep accepted server commands atomic, versioned, idempotent, and owner-isolated.
- Autosave one active run per player and retain immutable summaries after victory or defeat.
- Verify all templates, generated graphs, terminal outcomes, OAuth/session boundaries, and persistence concurrency behavior.

## Non-Goals

- Co-op, parties, a GM dashboard, or a free-text command parser.
- Persistent campaign characters, permanent power metaprogression, or power carried between runs.
- Species, Vice, background, Calling, specializations, unrestricted character building, or broad perk/rules automation.
- Full St. Bozma encounter composition, ally-only mechanics, capture, the canonical Dying state, or deferred finale actors and interventions.
- Auth providers other than Discord in the alpha UI, rich profiles, password recovery flows, or an invite system.
- Remote PocketBase schema mutation or deployment without separate authorization.

## Constraints

- Use SvelteKit, Svelte 5, TypeScript, Bun, Tailwind CSS, the existing pure engine boundary, and PocketBase.
- GitHub Issue #1 remains the canonical spec; this file is a Plan CLI v0.1.28 execution compatibility mirror.
- The server owns auth, hidden state, RNG state, command validation, persistence, and player projections.
- The same content version, seed, class template, initial state, and commands must replay byte-equivalent domain events and terminal state.
- The dungeon contains exactly eight reachable rooms with fixed entry/finale, six distinct middle rooms, a branch, and no progression dead end.
- Death at 0 HP and the third completed Decode end the run permanently; no rewind or manual save slot exists.
- Production data changes remain gated even while application implementation is approved.

## Scope

##### Public alpha access and character creation

- Present a public landing page with a primary **Continue with Discord** action backed by the existing PocketBase `users` auth collection and enabled Discord OAuth provider.
- Permit first-time Discord OAuth users to create an account automatically. Do not require an invitation, allowlist, administrator action, or pre-provisioned user.
- After sign-in, a player starts a run by entering a display name and selecting one of the five fixed class templates. The name and class belong to that run; a future run may use a different name or class.
- Persist account-owned run history, but carry no character power, inventory, level, gold, or perks between runs. Persistent campaign characters and profile customization remain deferred.
- Support OAuth callback, cancellation/failure, logout, and return-to-game behavior. The game UI exposes Discord sign-in only for this alpha even if other PocketBase auth methods exist.
- Keep the PocketBase auth token in the existing server session boundary with secure production cookie settings. Browser code receives only a sanitized session projection and never PocketBase administrator credentials or raw auth records.

##### Run structure

- Start a new level-1 run by naming the character, choosing Warrior, Scout, Priest, Magi, or Versant, and either accepting a generated seed or entering one.
- Generate exactly eight reachable rooms: fixed Monastery Grounds entry, six distinct middle templates selected from the approved St. Bozma pool, and fixed Saint Bozma’s Resting Chamber finale.
- Generate at least one meaningful branch and a valid route from entry to finale. Never require an optional room, item, or failed roll to make the finale reachable.
- Place exactly two required normal combats, at least one noncombat event, and at least one loot-or-recovery decision before the final combat. Optional choices may modify or avoid an encounter but cannot make advancement or the finale unreachable.
- Use the seed for topology, room selection, encounters, loot, enemy choices, advancement checks, and all rolls. The same seed, class template, starting state, and command sequence must produce the same event stream and final state.
- Target a first successful run of 20–30 minutes. Victory and any defeat archive the run and permit a fresh start.

##### Player command loop

- Present legal commands for the current state; do not require free-text parser guessing.
- Support inspecting the current room and status, moving through revealed exits, making room/event choices, attacking, using the equipped class actions, abilities, and maneuvers, changing Near/Far rank when legal, patching up after combat, and ending a turn.
- Reject illegal or stale commands without consuming RNG, advancing the turn, or changing persisted state.
- Resolve each accepted command once through the pure engine, emit narration-ready domain events, persist the resulting state/version atomically, and return only a sanitized player projection.

##### Five fixed level-1 class templates

All templates use final stat totals of `70 / 50 / 40 / 30 / 10`, one fixed origin perk, canonical class features, compatible equipment, and versioned content data. Species, Vice, background, Calling, specializations, the broad perk catalog, summons, party-only effects, and unrestricted character building are deferred.

- **Warrior:** Heart 70, Reflex 50, Soul 40, Voice 30, Mind 10; Iron Resolve; Threatening Strike, Eye for an Eye, Know thy Weapon, Live for Battle, and Aegis Raised; heavy armor; longsword and shield.
- **Scout:** Reflex 70, Mind 50, Heart 40, Voice 30, Soul 10; Steady Aim; Surprise Attack, Sneak, Expertise, Ambusher, and Sharpshooter; light armor; shortbow and dagger.
- **Priest:** Soul 70, Voice 50, Heart 40, Mind 30, Reflex 10; No Weapon Formed Against Me; Restorative Prayer, Sacred Light, Shield of Faith, Divinity, and Prayer of Healing; cloth armor; prayer book and mace. “Target” may be the Priest; ally-only Rebuke is deferred.
- **Magi:** Mind 70, Soul 50, Reflex 40, Voice 30, Heart 10; Divination; Shooting Star, Guidance, Bolt, Inspired Brilliance, and Black Cloud; cloth armor; wand and serpent staff. Shooting Star counts the Magi’s own qualifying rolls because no allies exist.
- **Versant:** Voice 70, Heart 50, Soul 40, Reflex 30, Mind 10; Firebrand; Encouragement, Hushing Flame, Curse, Bless, Tough Crowd, and Tongues of Fire; light armor; Flame-scroll shortbow and shortsword. Encouragement uses its canonical no-ally momentum fallback; Bless may target the Versant.

Exact starting HP, Recovery Dice, weapon math, armor math, and consumables follow the cited canonical class/equipment rules and are serialized in the content version. Every template must complete the deterministic reference runs.

##### Rules contract

- Implement canonical five-stat modifiers, d100 Normal/Hard/Critical bands, natural 96+ failure, initiative, one Action plus one Ability per turn, weapon attacks and critical hits, Heart/Reflex defensive rolls, temporary HP, Near/Far ranks, momentum, and the basic maneuvers required by the selected content.
- Adapt run XP to the bounded dungeon: award 5 XP after each of the two required normal-combat victories. The second victory reaches the level-2 threshold of 10 XP. On level-up, add 5 to the template’s primary stat and resolve seeded deterministic advancement checks for the other four stats. Offer no specialization or new-perk choice; record both as deferred in the level-up event.
- Automate roll target and difficulty selection that the tabletop text assigns to a GM. Authored event choices declare their stat, difficulty, success result, and failure result.
- Replace group rolls, ally-only behavior, open-ended GM rulings, and freeform negotiation with explicit solo choices or defer the feature.
- Reaching 0 HP immediately ends the run. Do not enter the canonical Dying state or deplete Recovery Dice for death in the MVP.
- Keep Recovery Dice only for canonical post-combat Patch Up. A failed run cannot be restored, duplicated, or rolled back.
- Disable capture and Vice-specific enemy clauses in the MVP because neither has a complete solo resolution path.
- Every implemented feature, enemy ability, item, and event must reference its canonical rule or have a named entry in `docs/adaptations/`.

##### Initial St. Bozma content

- Room templates: Cabins, Storage Shack, Apiary, Sanctuary, Brewery, Cellar, Tomb Entry, Gallery, Paladin’s Prayer Room, and Groundskeeper’s Storage, with Monastery Grounds and Resting Chamber fixed.
- Solo normal enemies use one foe per encounter: canonical Hellhornet at 20 HP, canonical Scorched Raider at 44 HP, or the adventure-scale Zeboul at 75 HP rather than the 258-HP bestiary version. Encounter composition remains seed-driven within the fixed two-combat quota.
- Loot/recovery content: rations/gold as run-summary rewards, Bozman Sensor, Healing Potion, one compatible Tier 1 scroll reward, and Patch Up.
- Noncombat choices use authored options derived from searching, prayer, the Apiary threshold, the tomb’s moral test, or the locked routes. At least one earlier choice changes a later room or encounter.
- Simplified finale: Barnabe has 60 HP and Reflex 4, begins in Far rank behind one Scorched Raider, and uses a `1d10 + 5` Dark Far attack. On his turns he alternates attack and Decode; the third completed Decode is an objective-failure defeat. Defeating Barnabe before that clock completes is victory. Manessa’s dilemma appears in narration and an earlier authored choice can remove the Raider, but Manessa, the Flamecaller, three summoned Zeboul, and the Throne intervention are deferred from the solo combat.

##### Save, resume, commands, and run records

- Permit one active run per authenticated player. Autosave after every accepted command and after run creation; no manual save slots, imports, rewinds, or client-authoritative snapshots.
- Submit commands with `runId`, stable `commandId`, and `expectedVersion`. Duplicate command IDs are idempotent. A stale version returns the latest sanitized projection without resolving the command.
- Resolve version check, idempotency check, state update, action append, and terminal summary creation in one PocketBase server-side transactional command endpoint. Enforce uniqueness for `(run, commandId)`.
- Persist the seed and RNG cursor/state, current snapshot, append-only accepted commands and domain events, and monotonically increasing version needed for deterministic replay.
- On victory, 0-HP death, or objective failure, close the active run and create an immutable summary containing character name, class, seed, start/end time, outcome, rooms visited, enemies defeated, level reached, and notable loot.
- Provide resume-current-run and read-only previous-run list/detail flows. A completed run cannot become active again, and no gold, item, stat, perk, or other power carries into the next run.

#### Data / Interfaces

- Pure domain types: `RunState`, `RoomGraph`, `RoomTemplate`, `ActorState`, `EncounterState`, `ClassKit`, `GameCommand`, `GameEvent`, `RandomState`, and `RunSummary`.
- Engine contract: `resolveCommand(state, command, rng) -> { state, events }`; inputs remain immutable and domain code imports no Svelte, HTTP, or PocketBase modules.
- Server command envelope: `{ runId, commandId, expectedVersion, command }`; success returns `{ projection, events, version }`; stale conflict returns the current `{ projection, version }` without events.
- PocketBase collections: `game_runs` for the owner, character name, active snapshot, seed/RNG state, status, outcome, and version; `run_actions` for append-only command/event records keyed by run and command ID; `run_records` for immutable completed summaries. Keep authored dungeon/class/enemy/item content versioned in source for this MVP.
- PocketBase access remains server-only through request-scoped identity and service clients. Run collection rules are locked against Discord user tokens; a private server service token performs storage operations after SvelteKit owner checks. The service token and raw records never enter browser data.
- Migration work starts only after this spec is approved and still requires separate authorization before touching the remote alpha instance. Export the remote schema before applying it, add forward migrations and a local fixture path, and document rollback for newly created collections.

## Acceptance Criteria

- A first-time visitor can open a shared link, choose Continue with Discord, authorize or reuse Discord, receive a PocketBase account without an invite, enter a character name, choose any of the five templates, and begin play.
- A returning player can resume one active run, inspect owned prior runs, logout, and log back in. OAuth cancellation/failure returns a useful retry state. One player can never read or mutate another player’s runs.
- A player can play, leave, resume, win, die, suffer objective failure, inspect run history, and start fresh through the browser.
- Each of the five fixed templates is selectable and completes the same curated deterministic smoke seed with its specified stats, loadout, distinct legal command menu, and at least one exercised signature feature.
- Every generated dungeon has eight reachable rooms, fixed entry/finale, six distinct approved middle templates, at least one branch, exactly two required normal combats, one noncombat event, one loot/recovery choice, and one final combat.
- The same seed, class template, starting content version, and command sequence produces byte-equivalent domain events and terminal state across repeated engine runs.
- Normal and hard d100 outcomes, critical outcomes, natural 96+ failure, initiative, Action/Ability economy, defense, critical damage, temporary HP, ranks, momentum, Patch Up, 5-XP awards, and deterministic level-up behave according to the canonical rules or a documented adaptation.
- The finale ends in victory when 60-HP Barnabe is defeated, objective failure on the third Decode, or death at 0 HP; each outcome archives exactly one immutable run record and clears the active slot.
- Autosave survives browser refresh and a new server request. Duplicate command submission has one effect; stale-version submission has none, including under concurrent requests.
- Browser payloads never contain PocketBase admin credentials, raw auth records, another player’s run data, hidden room/encounter state, or a writable historical snapshot.
- No invite gate, co-op, campaign character, permanent power metaprogression, specialization, broad perk automation, free-text command parser, GM dashboard, or unapproved remote schema mutation enters the MVP.

## Verification

- Run `brain session run -- bun run lint`.
- Run `brain session run -- bun run check`.
- Run `brain session run -- bun run test:unit`.
- Run `brain session run -- bun run build`.
- Run `brain session run -- bun run test:e2e`.
- Unit-test every selected canonical resolution boundary and named adaptation, including natural 96+, advantage/disadvantage, initiative ties, Action/Ability legality, ranks, momentum, temporary HP, 0-HP death, Patch Up, fixed XP, deterministic level-up, and the exact solo enemy/finale values.
- Property-test generated graphs over a broad fixed seed corpus for exact room count, uniqueness, reachability, fixed endpoints, branch presence, encounter/event quotas, and no progression dead ends.
- Replay identical command fixtures for all five templates and compare event/state snapshots; add distinct fixtures for victory, 0-HP death, and third-Decode failure.
- Integration-test atomic `expectedVersion` handling, duplicate `commandId` idempotency, autosave/resume, terminal-run immutability, active-slot clearing, and owner isolation against local PocketBase.
- Mock OAuth/session boundaries in automated tests. Browser-test signed-out landing, successful first-time Discord callback, cancellation/failure, character naming, each class selection, room movement, normal combat, class feature use, loot/recovery choice, refresh/resume, finale victory, death, objective failure, run-history detail, logout, and fresh restart.
- Before alpha release, manually smoke-test the real Discord OAuth round trip from the deployed shared URL with a new Discord account and a returning account.
- Review `docs/adaptations/` and canonical citations as a release gate; fail the release checklist for any implemented rule with neither.

## Dependencies

- blocked by: none

## Readiness

- status: approved
- note: The owner approved the reviewed recommendations on 2026-07-29 with public Discord self-service access replacing pre-provisioned users. Implementation is authorized on a linked feature branch. Remote PocketBase schema mutation and deployment remain separately gated.

## Source

- Canonical planning issue: https://github.com/JimmyMcBride/five-fold-game/issues/1
- Promotion source: `.plan/brainstorms/fivefold-web-text-dungeon-crawler-mvp.md`
- This checked-in file is an execution compatibility mirror for Plan CLI v0.1.28.
