---
status: implementing
title: Combat readability and target selection
type: spec
updated_at: '2026-07-29T20:58:34Z'
---

## Spec

Combat readability and target selection

## Purpose

Keep the newest Tomb Record result readable without interrupting manual review,
make hostile health glanceable, and let the player select one intended enemy
before issuing an offensive command.

## Problem

New Tomb Record entries can disrupt players reviewing older events. Enemy
health is difficult to compare at a glance. Multi-enemy combat repeats
target-specific offensive controls, obscuring both available actions and player
intent.

## Goals

- Auto-scroll the Tomb Record only while the player remains pinned to its end.
- Preserve manual log position and expose an accessible jump-to-latest control
  only after unseen entries arrive.
- Show every enemy's rank, availability, numeric HP, and semantic health bar.
- Provide one accessible, persistent enemy target selection.
- Derive selected-target commands from server-provided `LegalCommand` data.
- Preserve utility and self-targeted controls on desktop and mobile.

## Non-Goals

- Changing canonical Near/Far, guard, attack, ability, or authorization rules.
- Moving command legality into Svelte.
- Redesigning combat, enemy AI, room generation, persistence, or PocketBase.
- Adding decorative motion, drag targeting, multi-select, or color-only state.
- Production deployment.

## Constraints

- Follow Obsidian + Bone: tallow selection, clot hostile health, numeric and
  textual state, severe borders, and short functional motion.
- Near/Far behavior remains canonical to
  `docs/game-rules/sections/02-combat-rules.md`.
- Guarded Barnabe behavior remains engine-owned.
- Near-first default and persistent selection are reversible UI adaptations.
- GitHub Issue #6 is canonical. This file is an execution compatibility mirror.

## Scope

### Tomb Record

- Use a positioned scroll wrapper and a roughly 24px bottom threshold.
- Measure pinned state before updates, wait for DOM rendering, then reveal the
  latest entry only if the player was pinned.
- Preserve scroll and focus while the player reviews older entries.
- Reveal a 44px down-arrow button only when unseen entries arrive away from the
  bottom. Name it `Jump to latest tomb record` and keep it clear of final text.
- Jumping clears unread state and resumes automatic scrolling.
- Reset scroll/unread state for a new run. Reduced motion scrolls instantly.

### Enemy health and target rows

- Render enemy rows beneath room description.
- Show name, Near/Far rank, availability, `current / max HP`, semantic progress,
  and selected marker.
- Clamp visual percentage safely for zero/max edge cases while preserving true
  numeric text.
- Keep guarded and out-of-range enemies visible, labeled, and unavailable.
- Never infer range or guard behavior in the browser.

### Selection

- Use native radio or equivalent single-selection semantics.
- Support pointer, Tab, and arrow selection with visible focus.
- Show tallow treatment and visible `Target` text for the selected row.
- Select the sole eligible enemy automatically.
- For multiple enemies, select the first eligible Near enemy, breaking ties by
  encounter order; otherwise select first eligible encounter enemy.
- Preserve selection while eligible. When it dies or becomes invalid, apply the
  same deterministic fallback. Clear selection if no offensive target exists.
- Reset on run change and disable while a command is pending.

### Command integration

- Treat `LegalCommand` as sole source for eligibility and submit payload.
- Show selected-target offensive controls once, associated by enemy ID.
- Keep self, utility, defensive, movement, and untargeted controls independent.
- Submit the exact server-provided command. Disable controls while pending.
- Existing server validation continues to reject stale or manipulated commands.

## Acceptance Criteria

- Latest event is visible immediately while the player remains at log bottom.
- Manual log review and focus are never interrupted by new entries.
- Jump button appears only after unseen entries arrive away from bottom, has a
  44px target, accessible name, and does not obscure the final entry.
- New runs clear transient log state; reduced-motion scrolling is instant.
- Every enemy exposes current/max HP visually and textually with safe math.
- Health, selection, guard, and range state never rely on color alone.
- Exactly one eligible target is selected in multi-enemy combat; none is forced
  when no offensive target exists.
- Closest eligible Near enemy is the deterministic initial target.
- Selection persists and retargets after death or invalidation.
- Pointer or keyboard selection redirects the next offensive command to the
  selected enemy ID.
- Guarded/unavailable enemies remain visible, labeled, and unselectable.
- Offensive commands render once for selected target; utility/self commands
  remain independently available.
- Svelte duplicates no range or guard rules.
- Pending state disables target and command controls.
- Desktop and mobile retain every target and action.

## Verification

- Unit-test target reconciliation/default ordering and health percentage safety.
- Cover radio semantics, labels, unavailable state, selected command filtering,
  utility command independence, and pending disablement.
- Cover pinned log updates, manual position, unread state, jump, reset, focus,
  and reduced motion.
- Add Playwright multi-enemy flow for pointer/keyboard alternate selection,
  selected-target command submission, manual scrolling, unseen event, and jump.
- Exercise desktop and mobile viewports.
- Run `brain session run -- bun run lint`.
- Run `brain session run -- bun run check`.
- Run `brain session run -- bun run test:unit`.
- Run `brain session run -- bun run build`.
- Run `brain session run -- bun run test:e2e`.
- Run `fivefold-testing`, then `fivefold-review`, then Brain context audit.

## Dependencies

- blocked by: none

## Readiness

- status: approved
- note: GitHub Issue #6 carries `plan:ready`; owner authorized execution from
  clean `origin/main` on 2026-07-29.

## Source

- Canonical planning issue:
  https://github.com/JimmyMcBride/five-fold-game/issues/6
- Promotion source:
  `.plan/brainstorms/combat-readability-and-target-selection.md`
- This file exists only for Plan CLI execution compatibility.

## Analysis

### Missing Constraints

- None.

### Success Criteria Gaps

- None.

### Hidden Dependencies

- None.

### Risk Gaps

- [warn] Risks / Open Questions is empty, so unresolved edges are not visible before implementation.

### What/Why vs How Leakage

- None.

### Recommended Revisions

- [warn] Add concrete risks, open questions, or rollback concerns under ## Risks / Open Questions.
