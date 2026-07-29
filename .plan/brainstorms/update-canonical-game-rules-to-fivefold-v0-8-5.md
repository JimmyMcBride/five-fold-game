---
created_at: '2026-07-29T16:22:07Z'
project: FiveFoldGame
slug: update-canonical-game-rules-to-fivefold-v0-8-5
status: active
title: Update canonical game rules to Fivefold v0.8.5
type: brainstorm
updated_at: '2026-07-29T16:22:07Z'
---

# Brainstorm: Update canonical game rules to Fivefold v0.8.5

Started: 2026-07-29T16:22:07Z

## Focus Question

How do we replace the repository's May 27 Fivefold v0.8 rule snapshot with the
current v0.8.5 Google Doc, preserve exact source provenance, and reconcile every
implemented rule without breaking deterministic replay or existing saved runs?

## Desired Outcome

A reviewable, execution-ready specification covering source acquisition,
byte-verifiable rulebook import, section splitting, provenance, mechanical
change inventory, application impact, adaptation decisions, content versioning,
saved-run compatibility, testing, and rollout.

## Vision

The repository should clearly identify Fivefold v0.8.5 as its current canonical
rule source. Future agents and developers should be able to prove exactly which
Google Doc export was imported, reproduce the split corpus, understand every
meaningful change from the prior snapshot, and tell whether game behavior is a
canonical v0.8.5 rule, an explicit dungeon adaptation, or legacy v1 behavior.
New runs should use the updated rules without altering historical records or
making an in-progress run replay differently after deployment.

## Supporting Material

- Google Doc: https://docs.google.com/document/d/1JTO4JWvfuGg8itgcIA0ffoL_5BAZpKo93J2hgp-Oe3I/edit
- Current Doc title: `Fivefold (v0.8.5 Beta)`
- Current Doc modified time observed through Google Drive:
  `2026-06-30T05:45:19.904Z`
- Current markdown export SHA-256:
  `0a2b64f9ad9e83b3916152e6e4928ec6824c594e63987371ec970ee7ea77cadd`
- Existing import: `docs/game-rules/`
- Existing provenance: `docs/game-rules-provenance.md`
- Existing dungeon adaptations: `docs/adaptations/st-bozma-mvp.md`
- Existing canonical MVP spec:
  `.plan/specs/single-player-procedural-st-bozma-roguelike.md`
- Pure engine boundary: `src/lib/game/`

## Constraints

- Preserve Google Doc export text exactly in canonical section files. Do not
  normalize wording, correct source typos, or mix adaptations into imported
  rule text.
- Keep `src/lib/game/` deterministic and framework-free.
- Existing run snapshots and immutable run records must remain readable and
  replayable according to their recorded content version.
- New rules cannot silently change a named dungeon adaptation. Every conflict
  must be reclassified explicitly.
- Google Doc is read-only for this work.
- No PocketBase schema mutation or production deployment is authorized by this
  planning task.
- GitHub is the planning source of truth. Plan must create or update the
  canonical issue; do not create planning issues manually.

## Open Questions

- No source-identity blocker remains: the supplied Doc ID matches the existing
  manifest and now identifies itself as v0.8.5.
- Implementation must re-read Doc metadata and export bytes. If title,
  modified time, or SHA differs from the pinned baseline above, stop and
  re-baseline this spec before replacing canonical files.
- Product recommendation: retain the current v1 resolver for old active runs
  and create a v0.8.5 content version for new runs. Do not migrate an active
  snapshot in place.

## Ideas

- Add one deterministic import/verification command so future refreshes do not
  depend on hand splitting.
- Generate a machine-readable section manifest containing source identity,
  export hash, section ranges, section hashes, and import time.
- Treat the rules refresh and behavior migration as one spec with explicit
  gates: source sync first, impact classification second, v2 runtime third,
  rollout last.

## Raw Notes

The repository copied a v0.8 Beta markdown export imported on 2026-05-27. The
current Doc is v0.8.5 and adds changelog entries dated 2026-05-29, 2026-06-22,
2026-06-25, and 2026-06-28.

Observed substantive changes include:

- stat cap 90 to 85 and level-based maximum-health growth;
- two Action Points replacing one Action plus one Ability;
- concentration timing and AP-based summon capacity;
- Deathblows on natural 1;
- named Block/Dodge resolution, hard/critical benefits, and critical-block
  counterattacks;
- Shove as both Action and Maneuver plus revised free rank closing;
- less agency-removing Vice penalties;
- specialization requirements raised to 80;
- Scout feature tuning and Archer replaced by Warden;
- new defensive origin perks, Summon Furies rewrite, and perk corrections;
- spear damage change;
- enemy escalation die, AP language, health/damage rebalance, and ability fixes;
- new Shifting Radiance lore;
- expanded Barnabe finale rules and amulet reward.

Current implementation conflicts are concrete:

- `CombatTurnState` stores `actionUsed` and `abilityUsed`;
- command legality and `consumeEconomy` enforce one of each;
- player HP starts at Heart and level-up resets max HP to Heart;
- Heart hard defense subtracts `Heart Modifier + 2`, not double modifier;
- Dodge hard/critical success grants no momentum;
- critical Block grants no counterattack;
- Deathblows and Shove are absent;
- selected Hellhornet, Raider, and Zeboul values reflect the older snapshot;
- the solo Barnabe adaptation cites older finale text;
- UI/legal-command copy uses generic defense and Action/Ability terminology;
- v1 tests and reference runs encode the old rules.

## Refinement

### Problem

The canonical corpus is one rule release behind the live source. Updating only
markdown would leave application behavior, citations, adaptations, deterministic
fixtures, and saved-run semantics inconsistent. Updating only runtime behavior
would erase provenance and make historical replay untrustworthy.

### User / Value

Players receive the current rules consistently. Maintainers receive a
reproducible source pipeline, explicit rule/adaptation decisions, stable replay,
and a reviewable map from source changes to behavior changes.

### Appetite

One thorough rules-version migration. Avoid unrelated content expansion,
generalized rulebook publishing infrastructure, character-builder work, broad
Vice/perk automation, or a full tabletop simulator.

### Remaining Open Questions

- No question blocks creation of the draft spec.
- Exact solo treatment of newly canonical but still deferred systems
  (summons, Vices, broad perks, full GM momentum, multi-actor finale) remains
  deferred unless the current MVP already implements the affected behavior.
- The implementation PR must include a reviewed decision table for every
  changed rule that intersects current code.

### Candidate Approaches

- **Selected:** reproducible full-source refresh plus versioned v2 runtime,
  leaving v1 behavior available for v1 snapshots.
- Rejected: overwrite docs only. This creates known runtime contradictions.
- Rejected: mutate all active snapshots to v0.8.5. This invalidates deterministic
  replay and changes in-progress outcomes.
- Rejected: permanently fork imported text to fit the dungeon crawler. Canonical
  text and adaptations must remain separate.

### Decision Snapshot

Promote one spec: import and pin v0.8.5, classify its complete diff, update
implemented mechanics and selected content under a new content version, keep v1
run compatibility, update adaptations/citations/UI/tests, and gate rollout on
cross-version replay evidence.

## Challenge

### Rabbit Holes

- Automating every new class, perk, Vice, summon, enemy maneuver, and finale
  actor.
- Building a general Google Docs synchronization service.
- Redesigning persistence when snapshot content versioning already exists.
- Retrofitting historical run records with values they never contained.

### No-Gos

- No edits to Google Doc.
- No silent source cleanup.
- No in-place rules change for an active v1 run.
- No deletion or rewriting of historical run records.
- No production migration/deployment under this spec without separate approval.
- No claim of canonical behavior without a source citation.

### Assumptions

- Google Doc export remains accessible to the implementation agent.
- Current snapshots retain `contentVersion`.
- v1 compatibility can be bounded to existing implemented MVP behavior rather
  than preserving a generalized old rules engine.
- New runs can select v2 at creation without PocketBase schema changes.

### Likely Overengineering

- A pluggable rules DSL or generalized multi-version framework.
- Storing the full rulebook in PocketBase.
- A permanent background sync from Google Drive.
- Migrating every old snapshot when deterministic dispatch by content version
  is safer.

### Simpler Alternative

One checked-in import script, one pinned manifest, one explicit v1/v2 resolver
dispatch, and focused updates to currently implemented mechanics and content.
Leave unimplemented tabletop systems deferred.

## Promotion map

Target milestone: **Fivefold — Rules v0.8.5**

### Spec 1 — Update canonical game rules and runtime to Fivefold v0.8.5

#### Purpose

Replace the repository's May 27 v0.8 Beta rules snapshot with the current
v0.8.5 Google Doc export, prove the import is complete and reproducible, and
move new dungeon runs to v0.8.5 behavior without changing how v1 snapshots or
historical records resolve.

#### Problem

`docs/game-rules/` is a byte-preserved import from 2026-05-27, but the source
Google Doc now identifies itself as `Fivefold (v0.8.5 Beta)` and was modified on
2026-06-30. Its June changes alter core combat economy, defense, health,
progression, class features, perks, enemy balance, GM momentum, and the St.
Bozma finale. The current application and its approved adaptations encode
several older mechanics. A docs-only replacement would knowingly mislabel old
runtime behavior as current canonical behavior; a runtime-only replacement
would lose source fidelity and replay safety.

#### Goals

- Make v0.8.5 the identifiable canonical rules corpus.
- Make the import reproducible and byte-verifiable from the supplied Google Doc.
- Record a complete section-level and behavior-level diff from the prior import.
- Reconcile every changed rule currently implemented by the dungeon crawler.
- Route new runs to a new content version while preserving v1 snapshot replay.
- Keep every noncanonical or deferred behavior explicitly classified.
- Verify all five templates and terminal outcomes under v2.

#### Non-Goals

- Editing or publishing the source Google Doc.
- Automating all classes, specializations, perks, Vices, summons, GM maneuvers,
  items, enemies, or the full tabletop St. Bozma encounter.
- Adding unrestricted character creation.
- Rewriting Issue #1 as though v0.8.5 had governed its original implementation.
- Migrating active snapshots in place or rewriting immutable run history.
- Building continuous Google Drive synchronization.
- PocketBase schema changes, production data mutation, or deployment without
  separate authorization.

#### Source Baseline

- Document ID:
  `1JTO4JWvfuGg8itgcIA0ffoL_5BAZpKo93J2hgp-Oe3I`.
- Canonical URL:
  `https://docs.google.com/document/d/1JTO4JWvfuGg8itgcIA0ffoL_5BAZpKo93J2hgp-Oe3I/edit`.
- Tab: `t.0`, title `Fivefold`.
- Observed document title: `Fivefold (v0.8.5 Beta)`.
- Observed modified time: `2026-06-30T05:45:19.904Z`.
- Observed markdown export size: `217152` bytes.
- Observed markdown export SHA-256:
  `0a2b64f9ad9e83b3916152e6e4928ec6824c594e63987371ec970ee7ea77cadd`.
- Prior repository import: `Fivefold (v0.8 Beta)`, imported
  `2026-05-27T18:16:32-05:00`.
- If any source identity field or export hash changes before implementation,
  stop before file replacement, regenerate the diff inventory, and amend this
  spec with the newly reviewed baseline.

#### Scope

##### 1. Reproducible source acquisition

- Add one repository command that accepts the canonical Doc ID or URL, exports
  the `t.0` tab as Google Docs markdown, normalizes only transport line endings
  when required by the exporter, and retains all source markdown syntax and
  wording.
- Keep downloaded staging files outside tracked source. Never commit auth
  material, cookies, connector references, or temporary exports.
- Compute the full-export SHA-256 before splitting.
- Fail on an unexpected title, missing tab, missing required major heading,
  duplicate major heading, reordered major section, empty section, or changed
  pinned hash unless the caller explicitly performs a reviewed re-baseline.
- Do not fix source typos, punctuation, malformed headings, odd backticks,
  table formatting, or spacing during import.

##### 2. Canonical corpus refresh

- Replace all 17 files under `docs/game-rules/sections/` from one pinned export,
  using these major boundaries: Changelog, Basic Rules, Combat Rules,
  Conditions, Survival, Hexes & Travel, Character Creation, Species, Vices &
  Sin, Background & Calling, Classes/Perks/Advancement, Perks, Triumphs & Fame,
  Items/Gold/Gear, The World, Bestiary, and St. Bozma’s Tomb.
- Preserve section order and filenames so existing citations remain stable.
- Update `docs/game-rules/source-manifest.json` with document ID, canonical URL,
  document title, tab ID/title, source modified time when available, import
  time, export size, export SHA-256, split strategy, line ranges, byte counts,
  and per-section SHA-256 values.
- Update `docs/game-rules/README.md`,
  `docs/game-rules-provenance.md`, root `README.md`, and relevant Brain context
  from v0.8 to v0.8.5.
- Keep the old version recoverable through git history. Do not add a second
  copied legacy rule tree.

##### 3. Diff report and classification

- Produce a reviewed change report, stored beside other durable rule/adaptation
  docs, comparing the pinned old and new exports section by section.
- For each substantive delta, record: old text, new text, affected product
  behavior, current implementation path or `not implemented`, classification
  (`canonical v0.8.5`, `existing adaptation retained`, `adaptation revised`,
  `deferred`, or `source ambiguity`), and required test.
- Distinguish source-semantic changes from export-only blank-line/format changes.
- Minimum reviewed inventory:

  | Section            | Required delta coverage                                                                   |
  | ------------------ | ----------------------------------------------------------------------------------------- |
  | Changelog          | May 29, June 22, June 25, and June 28 entries                                             |
  | Basic Rules        | 85 stat cap; Heart/maximum-health wording; light typo fix                                 |
  | Combat             | AP economy; concentration; dual wielding; Deathblows; Block/Dodge; Shove; rank closing    |
  | Character Creation | starting-health roll                                                                      |
  | Species            | Moon Elf `10,000 Hours` replacement                                                       |
  | Vices & Sin        | Lust, Greed, Sloth, Gluttony, Envy, and Pride revisions                                   |
  | Classes            | health-on-level; specialization 80; Scout changes; Archer to Warden; corrections          |
  | Perks              | wording/math fixes; Extra Attack; new Calculated Risk/Misdirection; Summon Furies; rename |
  | Items              | spear damage and source formatting                                                        |
  | World              | Shifting Radiance lore                                                                    |
  | Bestiary           | escalation die; AP terminology; stats/health/damage/ability rebalances                    |
  | St. Bozma          | route typo; Barnabe combat details; amulet reward                                         |

##### 4. Content-version and replay boundary

- Keep `st-bozma-mvp-v1` behavior available for snapshots whose
  `contentVersion` is v1.
- Introduce a distinct v0.8.5 content version for all newly created runs after
  rollout; use a stable identifier, not `latest`.
- Dispatch resolution, content lookup, projection, and replay by the snapshot's
  content version. Unknown versions fail closed with a recoverable service error
  and do not mutate state.
- Never run a v1 snapshot through v2 rules or rewrite its `contentVersion`.
- Preserve historical summaries as recorded. Read-only history may display its
  content/rules version when available but must not synthesize missing fields.
- Keep compatibility surgical: retain only code/data needed to resolve already
  supported v1 snapshots. Do not build a generalized plugin framework.
- Prove v1 reference fixtures remain byte-equivalent before and after v2 work.

##### 5. v0.8.5 engine mechanics

- Replace separate one-Action/one-Ability availability with two AP. An Action
  or Ability costs one AP unless its canonical/adapted definition says
  otherwise. A character cannot use the same named Action or Ability twice in
  one turn.
- Preserve Maneuvers as momentum-triggered, out-of-band choices. Do not charge
  AP unless the source explicitly labels the effect an Action.
- Update legal-command generation, turn state, events, projections, persistence
  snapshots, UI labels, and tests to expose AP remaining and per-turn reuse
  restrictions.
- Implement Block and Dodge names and exact v0.8.5 result bands:
  - Dodge normal: no damage.
  - Dodge hard: no damage and +1 momentum.
  - Dodge critical: no damage and +2 momentum.
  - Block normal: reduce by Heart Modifier.
  - Block hard: reduce by twice Heart Modifier.
  - Block critical: avoid all damage and immediately counterattack.
- Counterattacks consume no AP, cannot be offered when no legal enemy target
  exists, use normal weapon resolution, and can trigger critical hits or
  Deathblows.
- Implement Deathblows: natural 1 on a damaging attack/feature immediately
  defeats its target. For the v2 solo game, do not invoke the optional GM boss
  exception unless a separate named adaptation is approved.
- Add Shove as an Action and basic Maneuver. Resolve canonical Heart
  requirements, size-3 hard-success threshold, rank movement, AP/momentum
  costs, and impossible-target handling deterministically.
- Apply revised rank movement: normal switching costs one AP or a Shift Rank
  Maneuver; when no opponent remains in Near, expose deterministic free closing
  without spending AP.
- Far weapons may target Near or Far enemies even while a Near line exists.
  Near weapons may target only Near enemies while their wielder is Near. Any
  combatant occupying Near protects Far allies only from Near weapons; no
  melee-role tag exists.
- Replace Barnabe's universal Raider `guarded` targeting immunity. A living
  Raider protects Barnabe from Near weapons, but Far weapons may target Barnabe.
- Update dual-wield behavior only where current v2 templates actually equip a
  valid off-hand weapon. Do not expand inventory/loadout systems solely for it.
- Keep summons deferred, but update canonical citations and deferred notes for
  concentration timing and AP capacity.

##### 6. Health, advancement, and stat rules

- Enforce the canonical 85 natural stat cap for v2 growth and validation.
- Generate v2 starting maximum health as `Heart + 1d10 + Heart Modifier` using
  the seeded RNG. Record the roll in replayable events/state so creation remains
  deterministic.
- On level-up, increase maximum health by a seeded
  `1d10 + current Heart Modifier`, in addition to any direct maximum-health
  increase caused by a Heart-stat increase.
- Do not retroactively reroll HP when loading a snapshot.
- Update projections, narration, fixtures, template balance, and expected RNG
  cursors for the added rolls.

##### 7. Selected class, perk, enemy, and dungeon content

- Reconcile all five current fixed class kits against v0.8.5, even when a changed
  rule remains deferred.
- Update Scout Surprise Attack bonus dice from level to Reflex Modifier.
- Reconcile Cling to Shadows and Warden naming/content in citations; do not add
  specialization selection to MVP.
- Retain Shooting Star's self-roll correction and update its citation.
- Record new Misdirection and Calculated Risk as deferred unless explicitly
  selected for a fixed kit.
- Update currently selected enemy values at minimum:
  Hellhornet `20 -> 18` HP, Scorched Raider `44 -> 36` HP, and adventure Zeboul
  attack math to the latest bestiary while retaining its source-defined
  adventure HP when applicable.
- Re-evaluate, document, and test the solo Barnabe adaptation against the new
  75 HP, recurring temporary HP, momentum dice, Decode behavior, and amulet
  text. Keep the multi-actor finale deferred unless separately brought into
  scope. Any retained simplification must be labeled `adaptation retained`,
  never `canonical`.
- Update source citations in class/enemy/room content data and
  `docs/adaptations/st-bozma-mvp.md`.
- Increment deterministic content fixtures whenever source-defined numbers or
  legal commands change.

##### 8. UI and server compatibility

- Show `2 AP`, remaining AP, and why a repeated Action/Ability is unavailable.
- Rename Heart/Reflex defense choices to Block/Dodge while preserving the
  selected defense in sanitized projections.
- Narrate Deathblows, critical Block counterattacks, Shove, free closing,
  health-growth rolls, and updated enemy values without leaking hidden state.
- Continue to submit commands through the existing server-authoritative,
  versioned, idempotent path. Illegal commands consume no RNG or AP and append no
  history.
- Treat changed snapshot shapes as content-versioned data. Add tolerant readers
  or explicit v1/v2 types; do not guess missing v2 fields on a v1 snapshot.
- No PocketBase collection change is expected. If implementation discovers one,
  stop that portion and obtain separate migration authorization.

##### 9. Documentation and adaptation reconciliation

- Update `docs/adaptations/st-bozma-mvp.md` so every currently implemented
  mechanic points to v0.8.5 text or a named adaptation.
- Preserve Issue #1 and its local mirror as the historical v1 contract. Add a
  supersession/link note only; do not rewrite its original acceptance criteria.
- Update architecture/current-state/workflow documentation where content-version
  dispatch or import commands become durable project behavior.
- Run `brain context audit` after the docs/code surface changes and promote
  durable findings through Brain-managed files.

##### 10. Rollout

- Land source import and diff evidence in the same branch as behavior changes or
  in an ordered first commit; never deploy a state where docs claim v0.8.5 while
  new runs still silently use v1.
- Before production rollout, inventory active runs by `contentVersion` using a
  read-only query.
- Enable v2 only for newly created runs. Existing v1 runs resume through v1.
- Verify production health and one disposable v2 run after separately approved
  deployment.
- Keep rollback able to stop new v2 creation while preserving v2 snapshots for
  later replay; never downgrade their content-version marker.

##### 11. Risks and decision gates

- The source Doc can change after this spec. Hash mismatch is a hard re-baseline gate, not an invitation to import unreviewed changes.
- Starting and level-up HP add RNG consumption. Versioned initialization and fixtures must prevent cursor drift across v1.
- AP changes touch most combat legality and UI paths. Keep the data-model change focused and avoid a generalized action scheduler.
- Literal Deathblows can trivialize Barnabe. The v2 default follows canonical text; changing boss treatment requires a named adaptation.
- New Barnabe source values may be unbalanced for solo play. Retain or revise the existing simplification only with deterministic cross-class evidence.
- Keeping v1 forever creates maintenance drag. Removal requires zero active v1 runs, retained historical readability, and a separate approved cleanup spec.

#### Acceptance Criteria

- A fresh canonical export matches the pinned document identity and full-export SHA-256, or implementation stops for explicit re-baselining.
- All 17 section files are generated from that single export in manifest order, and each generated file matches its manifest SHA-256.
- Re-running import/verification on unchanged source produces no git diff.
- Manifest, README, provenance, and Brain context identify v0.8.5, source modified time, import time, export hash, and split strategy.
- Durable diff report covers every substantive line change and labels formatting-only changes separately.
- Every changed rule intersecting current code has exactly one reviewed classification and at least one verification reference.
- New runs record v2 and use two AP, same-action/ability reuse restrictions, updated Block/Dodge bands, critical Block counterattack, Deathblows, Shove, revised rank closing, 85 cap, seeded starting HP, and seeded level-up HP.
- Current selected enemy/class content reflects the reviewed v0.8.5 diff or a named retained adaptation.
- Far weapons can attack Barnabe through a living Raider, while Near weapons cannot.
- v1 snapshots still load, present the same legal commands, consume the same RNG, emit byte-equivalent events, and reach the same terminal states as pinned v1 fixtures.
- v2 snapshots replay byte-equivalently from identical version, seed, initial state, and command sequence.
- Unknown content versions fail without state mutation.
- Every one of the five v2 templates completes the curated reference smoke and exercises a signature feature under the new AP/defense/health rules.
- Victory, death, and objective-failure flows archive exactly one immutable summary under v2; retry/stale semantics remain unchanged.
- UI visibly identifies AP and Block/Dodge, explains unavailable duplicate commands, and narrates newly implemented outcomes.
- No source Doc edit, historical-record rewrite, unauthorized schema mutation, or production deployment occurs.

#### Verification

- Run import in verification mode twice and prove the second run is clean.
- Verify full-export and per-section SHA-256 values against the manifest.
- Run a section-boundary test covering all required headings, order, non-emptiness, and no dropped/duplicated source bytes.
- Run `brain session run -- bun run lint`.
- Run `brain session run -- bun run check`.
- Run `brain session run -- bun run test:unit`.
- Run `brain session run -- bun run build`.
- Run `brain session run -- bun run test:e2e`.
- Unit-test AP spending, duplicate Action/Ability rejection, Maneuver independence, every Block/Dodge result band, momentum gain, counterattack, Deathblow, Shove thresholds, free closing, 85 cap, starting HP, level-up HP, and illegal-command RNG invariants.
- Snapshot v1 legal commands/events/states before refactor and replay afterward.
- Add v2 deterministic fixtures for all five templates and all three terminal outcomes.
- Test old and new snapshot decoding, unknown-version rejection, sanitized projections, idempotent retries, stale versions, and autosave/resume.
- Browser-test AP display, repeated-command lockout, Block/Dodge selection, Shove, critical Block/Deathblow narration, refresh/resume, and terminal history.
- Run `brain context audit` and the project-required `fivefold-testing` then `fivefold-review` workflows before closeout.

#### Dependencies

- blocked by: none for source import and local implementation
- note: current Google Doc access is required at implementation time
- note: production rollout remains separately authorized
- note: v1 compatibility depends on preserving pinned pre-change fixtures before refactoring
