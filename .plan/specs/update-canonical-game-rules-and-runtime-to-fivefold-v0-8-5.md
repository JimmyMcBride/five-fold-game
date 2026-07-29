---
status: done
title: Update canonical game rules and runtime to Fivefold v0.8.5
type: spec
updated_at: '2026-07-29T17:59:55Z'
---

## Spec

Update canonical game rules and runtime to Fivefold v0.8.5

## Purpose

Replace the repository's May 27 v0.8 Beta rules snapshot with the current
v0.8.5 Google Doc export, prove the import is complete and reproducible, and
move new dungeon runs to v0.8.5 behavior without changing how v1 snapshots or
historical records resolve.

## Problem

`docs/game-rules/` is a byte-preserved import from 2026-05-27, but the source
Google Doc now identifies itself as `Fivefold (v0.8.5 Beta)` and was modified on
2026-06-30. Its June changes alter core combat economy, defense, health,
progression, class features, perks, enemy balance, GM momentum, and the St.
Bozma finale. Current application behavior and approved adaptations encode
several older mechanics.

## Goals

- Make v0.8.5 the identifiable canonical rules corpus.
- Make the import reproducible and byte-verifiable.
- Record complete section-level and behavior-level differences.
- Reconcile every changed rule currently implemented by the dungeon crawler.
- Route new runs to a stable v2 content version while preserving v1 replay.
- Keep every noncanonical or deferred behavior explicitly classified.
- Verify all five templates and terminal outcomes under v2.

## Non-Goals

- Editing or publishing the source Google Doc.
- Automating all classes, specializations, perks, Vices, summons, GM maneuvers,
  items, enemies, or the full tabletop St. Bozma encounter.
- Adding unrestricted character creation.
- Rewriting Issue #1 as though v0.8.5 governed its original implementation.
- Migrating active snapshots in place or rewriting immutable run history.
- Building continuous Google Drive synchronization.
- PocketBase schema changes, production data mutation, or deployment.

## Constraints

- Canonical Google Docs markdown remains source-exact; no typo cleanup or
  adaptation text enters imported sections.
- Document ID is
  `1JTO4JWvfuGg8itgcIA0ffoL_5BAZpKo93J2hgp-Oe3I`, tab `t.0`.
- Pinned title is `Fivefold (v0.8.5 Beta)`, modified time
  `2026-06-30T05:45:19.904Z`, export size `217152` bytes, SHA-256
  `0a2b64f9ad9e83b3916152e6e4928ec6824c594e63987371ec970ee7ea77cadd`.
- A changed source identity or hash stops implementation for re-baselining.
- `src/lib/game/` stays deterministic and framework-free.
- Existing snapshots resolve under their recorded content version.
- Google Doc stays read-only; production deployment remains separately gated.
- GitHub Issue #4 is canonical. This file is an execution compatibility mirror.

## Scope

### Reproducible import

- Add a repository command that consumes an exported markdown file, verifies
  the pinned SHA, validates all required major headings, and splits all 17
  canonical section files without changing source bytes.
- Support verification-only mode and fail on missing, duplicate, reordered, or
  empty sections.
- Record full-export and per-section hashes, source metadata, byte counts, line
  ranges, and split strategy in `source-manifest.json`.
- Re-running against unchanged source must produce no git diff.

### Canonical corpus and provenance

- Replace all files under `docs/game-rules/sections/` from one pinned export.
- Preserve section order, filenames, odd formatting, and source wording.
- Update game-rules README, provenance, root README, and durable Brain context
  from v0.8 to v0.8.5.
- Add a durable section-by-section change report classifying each delta as
  canonical v0.8.5, retained/revised adaptation, deferred, source ambiguity, or
  formatting-only.

### Version boundary

- Preserve `st-bozma-mvp-v1` resolver/content behavior for v1 snapshots.
- Introduce stable `st-bozma-v0.8.5-v2` behavior for new runs.
- Dispatch initialization, commands, content, projection, and replay by
  `contentVersion`; unknown versions fail without mutation.
- Never rewrite a v1 snapshot or historical summary to v2.
- Pin byte-equivalent v1 command/event/state fixtures before refactoring.

### AP and command economy

- Replace separate one-Action/one-Ability availability with two Action Points.
- Actions and Abilities cost one AP; the same named Action or Ability cannot be
  used twice in one turn.
- Maneuvers remain momentum-triggered and do not consume AP.
- Expose AP remaining and used action/ability identities in v2 state,
  projections, legal commands, narration, UI, and tests.

### Block, Dodge, Deathblows, and Shove

- Dodge: normal avoids damage; hard also gains 1 momentum; critical gains 2.
- Block: normal reduces by Heart Modifier; hard by twice Heart Modifier;
  critical avoids all damage and immediately counterattacks without AP.
- Counterattacks use normal weapon resolution and can critically hit or
  Deathblow.
- Natural 1 on a damaging attack/feature Deathblows the target; no boss
  exception without a separately approved adaptation.
- Add Shove as both Action and basic Maneuver with Heart roll, hard threshold
  for size 3+, deterministic impossible-target handling, and rank movement.

### Near/Far clarification

- Far weapons may target Near or Far enemies even while a Near line exists.
- Near weapons may target only Near enemies while the wielder is Near.
- Any combatant occupying Near protects Far allies only from Near weapons; no
  melee-role tag exists.
- When the opposing Near rank is empty, expose free closing without AP.
- Replace Barnabe's universal `guarded` targeting immunity: the Raider protects
  Barnabe only from Near weapons, while Far weapons may target Barnabe.

### Health, advancement, and stats

- Enforce v2 natural stat cap 85.
- Seed starting maximum HP as `Heart + 1d10 + Heart Modifier`.
- On level-up add seeded `1d10 + current Heart Modifier`, plus direct maximum-HP
  gain from any Heart increase.
- Record HP rolls and RNG consumption for deterministic replay.
- Never reroll HP when loading a snapshot.

### Current class, enemy, and dungeon content

- Reconcile all five fixed kits against v0.8.5.
- Change Scout Surprise Attack bonus dice from level to Reflex Modifier.
- Update Cling to Shadows/Warden citations; specialization stays deferred.
- Record Misdirection and Calculated Risk as deferred unless selected later.
- Update Hellhornet HP `20 -> 18`, Scorched Raider HP `44 -> 36`, and adventure
  Zeboul attack math while retaining its adventure-defined HP.
- Re-evaluate the solo Barnabe adaptation against new 75 HP, recurring temporary
  HP, momentum dice, Decode behavior, and amulet text. Keep multi-actor finale
  deferred and label every simplification as adaptation.

### UI, server, and persistence

- Display two AP, AP remaining, Block/Dodge labels, and duplicate-command
  lockout reasons.
- Narrate Deathblows, counterattacks, Shove, free closing, and HP growth.
- Keep server-authoritative version/idempotency behavior unchanged.
- Illegal commands consume no RNG/AP and append no history.
- Decode snapshots with explicit v1/v2 types; never guess missing v2 fields.
- No PocketBase collection change is expected or authorized.

### Documentation and rollout

- Reconcile `docs/adaptations/st-bozma-mvp.md` and all current source citations.
- Preserve Issue #1 as historical v1 contract; link supersession without
  rewriting it.
- Enable v2 only for newly created runs; v1 active runs continue through v1.
- Rollback may stop new v2 creation but must never downgrade v2 markers.
- Production inventory, rollout, and smoke remain separately authorized.

## Acceptance Criteria

- Export identity and SHA match pinned baseline before import.
- All 17 sections derive from one export and match manifest hashes.
- Import verification is idempotent and detects boundary/hash failures.
- Provenance and durable diff report identify v0.8.5 completely.
- Every runtime-relevant delta has one classification and verification.
- New runs use v2 AP, Block/Dodge, Deathblow, Shove, rank, health, and stat rules.
- Far weapons can attack Barnabe through a living Raider; Near weapons cannot.
- Current selected content matches v0.8.5 or a named adaptation.
- v1 fixtures retain identical legal commands, RNG, events, and terminal states.
- v2 replays identically from version, seed, initial state, and commands.
- Unknown content versions fail without mutation.
- All five v2 templates complete curated reference smoke with signature feature.
- Victory, death, and objective failure archive exactly one immutable summary.
- UI exposes AP and new combat language without leaking hidden state.
- No Google Doc edit, historical rewrite, schema mutation, or deployment occurs.

## Verification

- Run import verification twice; second run is clean.
- Verify full-export/per-section hashes and boundary coverage.
- Run `brain session run -- bun run lint`.
- Run `brain session run -- bun run check`.
- Run `brain session run -- bun run test:unit`.
- Run `brain session run -- bun run build`.
- Run `brain session run -- bun run test:e2e`.
- Unit-test AP, repeat rejection, Maneuvers, every defense band, counterattack,
  Deathblow, Shove, Near/Far targeting, 85 cap, HP rolls, and RNG invariants.
- Replay pinned v1 fixtures and new v2 fixtures for all templates/outcomes.
- Test snapshot decoding, unknown-version rejection, idempotency, stale versions,
  sanitized projections, autosave, and resume.
- Browser-test AP, duplicate lockout, Block/Dodge, targeting, Shove,
  counterattack/Deathblow narration, refresh/resume, and terminal history.
- Run `fivefold-testing`, then `fivefold-review`, then Brain context audit.

## Dependencies

- blocked by: none
- note: implementation requires the pinned exported markdown bytes
- note: production rollout remains separately authorized

## Readiness

- status: approved
- note: GitHub Issue #4 carries `plan:ready`; owner authorized execution from
  `origin/main` on 2026-07-29.

## Source

- Canonical planning issue:
  https://github.com/JimmyMcBride/five-fold-game/issues/4
- Promotion source:
  `.plan/brainstorms/update-canonical-game-rules-to-fivefold-v0-8-5.md`
- This file exists only for Plan CLI execution compatibility.
