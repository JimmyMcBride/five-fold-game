---
created_at: '2026-07-29T20:51:05Z'
project: FiveFoldGame
slug: combat-readability-and-target-selection
status: active
title: Combat readability and target selection
type: brainstorm
updated_at: '2026-07-29T20:53:59Z'
---

# Brainstorm: Combat readability and target selection

Started: 2026-07-29T20:51:05Z

## Focus Question

Make Tomb Record updates non-disruptive, enemy health glanceable, and offensive targeting explicit without duplicating canonical eligibility rules.

## Desired Outcome

Player reads newest combat result, selects intended eligible enemy, and issues a valid offensive command without scanning duplicated enemy-specific buttons. Manual Tomb Record review is never interrupted.

## Vision

## Supporting Material

## Constraints

- Obsidian + Bone tactical ledger. LegalCommand data remains sole UI source for target and range eligibility. Canonical combat rules remain in docs/game-rules/sections/02-combat-rules.md; nearest-target default and persistent selection are reversible UI adaptations. Guarded Barnabe behavior remains engine-owned. Desktop/mobile accessibility and reduced motion required.

## Open Questions

## Ideas

- Approved UI improvement brief: Obsidian + Bone tactical ledger with functional motion, server-derived command legality, accessible radio-style enemy targeting, and browser coverage.

## Raw Notes

## Promotion map

### Spec 1 — Combat readability and target selection

#### Purpose

Improve combat readability and control so players can follow the newest Tomb Record result, review earlier events without disruption, compare enemy health at a glance, select one intended enemy, and issue the valid offensive command associated with that target.

#### Problem

Combat results and enemy state demand too much scanning. New Tomb Record entries can disrupt manual review, enemy HP is not glanceable, and the command panel repeats offensive commands for every enemy. Multi-enemy turns therefore obscure both current state and player intent.

#### Goals

- Keep newest Tomb Record entries visible for players already pinned to the bottom.
- Preserve manual scroll position when players review earlier entries.
- Make every visible enemy's current/max health, rank, and availability glanceable.
- Give multi-enemy combat one accessible selected target.
- Show offensive commands valid for that selected target without duplicating range or guard rules in Svelte.
- Retain utility and self-targeted abilities independently.
- Preserve full control on desktop, mobile, keyboard, and reduced-motion configurations.

#### Non-Goals

- Changing canonical Near/Far, guard, attack, ability, or command-authorization rules.
- Moving command legality or authorization into the browser.
- Redesigning combat mechanics, enemy AI, room generation, persistence, or PocketBase schema.
- Replacing Tomb Record content, narration, or history storage.
- Adding drag targeting, multi-select, decorative animation, gradients, or color-only state.
- Building a generic targeting service, global combat UI store, or virtualized log.
- Deploying to production under this spec.

#### Design Direction

Use the existing Obsidian + Bone tactical ledger: dense, severe, and readable. Tallow identifies selected target; clot fills remaining hostile health. Typography, borders, labels, and numeric values communicate state without relying on color. Motion remains short and functional; reduced-motion users receive instant scrolling.

#### Scope

##### 1. Tomb Record scrolling

- Put the Tomb Record list in a positioned scroll wrapper with roughly a 24px bottom threshold.
- Preserve the existing empty waiting message.
- Track whether the player was pinned before a log update. After Svelte renders the new DOM, automatically reveal the newest entry only when that prior state was pinned.
- When the player is reviewing older text, preserve their scroll position and never steal focus.
- Show no jump control merely because the player scrolls upward.
- When a new entry arrives while the player is scrolled upward, preserve position and show a 44px down-arrow control inside the lower-right corner.
- Give the control accessible name `Jump to latest tomb record`; reserve enough inner spacing that it never covers the final entry.
- Activating the control jumps to bottom, clears unread state, and resumes pinned auto-scroll.
- Reset scroll and unread state when run identity changes.
- Use short functional scrolling normally and instant scrolling under `prefers-reduced-motion: reduce`.

##### 2. Enemy target list and health

- Render the encounter target list beneath room description.
- Each enemy row shows name, Near/Far rank, guarded or unavailable state, current/max HP formatted like `18 / 44 HP`, a health progress bar, and selected-target marker.
- Clamp visual health percentage safely for zero, negative, over-max, or zero-max inputs while retaining truthful numeric values.
- Use semantic progress information with an accessible name/value; clot color supplements rather than replaces numeric health.
- Keep guarded enemies visible but unavailable and labeled `Guarded`.
- Show `Out of range` only from server-provided command availability/reason data. Do not infer canonical range rules in Svelte.
- Keep layout usable without horizontal loss of controls at supported desktop and mobile widths.

##### 3. Target selection state

- Use native radio inputs or equivalent single-selection radiogroup semantics for eligible enemy choices.
- Clicking an eligible row selects it. Keyboard Tab and arrow behavior supports switching according to radio semantics.
- Give selected row tallow focus treatment plus visible `Target` text so color is never the only signal.
- Automatically select the sole eligible enemy.
- With multiple eligible enemies, initially select the nearest Near enemy; encounter order breaks ties. If no Near enemy is eligible, select first eligible enemy in encounter order.
- Preserve selected enemy ID across turn/projection updates while it remains eligible.
- If selected enemy dies or becomes invalid, select the nearest remaining eligible enemy using the same deterministic ordering.
- If no offensive target is eligible, clear selection; do not force one.
- Reset transient selection when run identity changes.
- Disable targeting while command submission is pending.

##### 4. Command-panel integration and authority boundary

- Keep server-provided `LegalCommand` data as sole source of target eligibility, range/guard availability, and submit payload.
- Associate visible target options with existing legal offensive commands by enemy ID; add only sanitized projection metadata needed for stable identity or unavailable reason display.
- For selected target, show the offensive command controls already associated with that enemy ID.
- Stop repeating the same offensive command group once per enemy.
- Submit the exact legal command associated with selected enemy; do not reconstruct or reinterpret it in Svelte.
- Keep self-targeted, untargeted, defensive, movement, and utility commands available independently according to existing legal-command data.
- Disable command controls while submission is pending.
- Illegal, stale, or manipulated commands remain rejected by existing server-authoritative path without state mutation.

##### 5. Rules classification and documentation

- Near/Far eligibility remains canonical combat behavior from `docs/game-rules/sections/02-combat-rules.md`.
- Guarded Barnabe targeting remains approved dungeon behavior already enforced by engine.
- Nearest-target default and persistent UI selection are reversible dungeon UI adaptations.
- Legal command list remains source of truth.
- If implementation requires new unavailable-reason metadata, expose a sanitized engine/server classification; never encode a competing browser rule table.
- Update adaptation or interface documentation only where the reversible target-default decision needs a durable record.

##### 6. Delivery slices

1. Tomb Record scrolling: pinned auto-scroll, preserved manual position, unread jump control, run reset, reduced motion.
2. Enemy health bars: percentages, zero/max safety, numeric labels, semantic progress, responsive rows.
3. Target selection: Near-first default, radio semantics, persistence, death/invalid retargeting, guarded and unavailable states.
4. Command integration: selected-target attack/ability submission, no duplicated enemy command groups, unaffected utility commands, pending disablement.
5. Browser coverage: multi-enemy flow, manual log scrolling, new event, jump-to-latest, keyboard/alternate target, command submission, desktop/mobile access.

#### Acceptance Criteria

- Latest event becomes immediately visible when player was at Tomb Record bottom.
- Manual log review is never interrupted by arriving entries and receives no focus change.
- Jump button appears only after unseen entries arrive while player is away from bottom.
- Jump button is 44px, named `Jump to latest tomb record`, does not obscure final entry, and clears unread state when activated.
- New run clears Tomb Record scroll/unread state; reduced motion uses instant scrolling.
- Every visible enemy exposes current and maximum HP both visually and textually, with safe percentage handling.
- Enemy health, selection, guarded state, and range availability never rely on color alone.
- Exactly one eligible target is selected during multi-enemy combat; no target is forced when none is eligible.
- Closest eligible Near enemy is selected initially, with encounter order as deterministic tie-breaker.
- Selection persists across turns and retargets deterministically after selected enemy dies or becomes invalid.
- Clicking or keyboard-selecting another eligible enemy redirects next offensive command to that enemy ID.
- Guarded/unavailable enemies remain visible, labeled, and unselectable.
- Command panel presents selected-target offensive commands once while utility/self commands remain independently available.
- Svelte never reimplements canonical range or guard rules; eligibility and payloads derive from `LegalCommand` data.
- Pending submission disables both target and command controls.
- Desktop and mobile retain all targeting controls without clipped or horizontally inaccessible actions.

#### Verification

- Add focused unit tests for target reconciliation/default ordering and health-percentage safety if those behaviors are extracted into pure helpers.
- Add component/integration coverage for target semantics, labels, selected state, unavailable state, selected command derivation, utility command independence, and pending disablement.
- Add Tomb Record coverage for pinned updates, preserved manual position, unread transition, jump behavior, run reset, focus preservation, and reduced motion.
- Add Playwright flow with multiple enemies: select alternate target by pointer and keyboard, submit offensive command, confirm associated enemy ID receives it, manually scroll log upward, trigger new event, verify position preservation and jump button, then jump latest.
- Exercise responsive desktop and mobile viewports and verify every target/control remains reachable.
- Run `brain session run -- bun run lint`.
- Run `brain session run -- bun run check`.
- Run `brain session run -- bun run test:unit`.
- Run `brain session run -- bun run build`.
- Run `brain session run -- bun run test:e2e`.
- Run `brain context audit`, then project-required `fivefold-testing` and `fivefold-review` workflows before implementation closeout.

#### Dependencies

- blocked by: none

#### Readiness

- status: ready

## Non-Goals

- Changing canonical Near/Far, guard, or command eligibility rules.
- Moving command authorization into the browser or adding client-derived legality.
- Redesigning combat mechanics, enemy AI, room generation, persistence, or PocketBase schema.
- Replacing Tomb Record content, narration, or history storage.
- Adding drag targeting, multi-select, decorative animation, gradients, or color-only state.
- Adding broad component abstractions beyond the encounter target list, command derivation, and log-scroll behavior required here.

## Initial Solution Shape

- Extend sanitized enemy presentation only where current/max HP or stable encounter identity is absent; continue sourcing legal offensive commands from the server projection.
- Render one encounter target radiogroup beneath room copy. Rows expose visible rank/status/HP, native or equivalent radio semantics, tallow-selected state, and disabled explanations.
- Keep selected enemy ID as reversible page/component UI state. Reconcile it after every projection: preserve a still-eligible ID, otherwise choose first eligible by Near-first then encounter order, otherwise clear.
- Derive selected-target offensive controls by filtering existing `LegalCommand` entries by selected enemy ID. Render untargeted utility/self commands separately and unchanged.
- Treat `Out of range` as presentation of missing/inapplicable legal commands, never as a second Svelte rules engine. Exact unavailable copy must follow server data already exposed; add sanitized reason metadata only if current projection cannot distinguish guarded from range limitations.
- Implement Tomb Record with a scroll container, pre-update pinned measurement, post-render scroll reconciliation, unread flag, 24px bottom threshold, and an in-container 44px jump button with bottom padding so final content remains unobscured.
- Reset selection/log transient state on run identity change. Disable both target and command input during pending submission.
- Cover pure selection/percentage helpers with unit tests where extracted; use Playwright for DOM scroll behavior, keyboard selection, responsive access, and alternate-target submission.

## Approved UI improvement brief

### Feature summary

- Tomb Record keeps newest events visible without disrupting players reviewing earlier text.
- Enemy health becomes glanceable through progress bars.
- Multiple enemies become selectable targets before attacks or offensive abilities.

### Layout and content

- Enemy encounter area becomes target list beneath room description.
- Each enemy row shows name, Near/Far rank, guarded/unavailable state, current/max HP, health progress bar, and selected-target marker.
- Command panel shows offensive commands valid for selected target instead of repeating commands per enemy. Self-targeted and utility abilities stay unchanged.
- Tomb Record gains positioned scroll wrapper. Jump-to-latest button sits inside lower-right without covering final entry.
- Labels: `Target`, `Guarded`, `Out of range`, `Jump to latest tomb record`; HP format `18 / 44 HP`.
- Color never carries health or selection alone.

### Tomb Record states and interaction

- Empty keeps existing waiting message.
- At bottom, new entries scroll into view automatically.
- Scrolled upward with no new entries: preserve position; no button.
- Scrolled upward with new entries: preserve position; show 44px down-arrow button.
- Activating button jumps to bottom, clears unread state, resumes automatic scrolling.
- New run resets scroll and unread state.
- Reduced motion uses instant scrolling.
- Bottom threshold roughly 24px.
- Log update waits for DOM render, then handles pinned state.
- Reviewing older text never loses scroll position.
- Accessible button name: `Jump to latest tomb record`.
- New entries never steal focus.

### Enemy targeting states and interaction

- One eligible enemy automatically selected.
- With multiple eligible enemies, nearest Near enemy selected; encounter order breaks ties.
- Selection persists across turns.
- If selected enemy dies or becomes invalid, select nearest remaining eligible enemy.
- Guarded enemy remains visible but unavailable and labeled `Guarded`.
- Out-of-range enemy remains visible but unavailable for commands requiring unavailable range.
- Pending command disables targeting and command controls.
- No eligible offensive target means no forced selection.
- Target choices use single-selection radio semantics.
- Clicking eligible enemy selects it; selected row gets tallow focus and visible `Target` label.
- Keyboard arrows/tab support switching.
- Commands derive target eligibility from server-provided `LegalCommand`; Svelte duplicates no range/guard rules.
- Offensive command submits the command associated with selected enemy ID.
- Non-targeted abilities remain independently available.

### Rules classification

- Near/Far eligibility: canonical combat rule in `docs/game-rules/sections/02-combat-rules.md`.
- Guarded Barnabe targeting: approved dungeon behavior already enforced by engine.
- Nearest-target default and persistent UI selection: reversible dungeon UI adaptation.
- Legal command list remains source of truth.

### Delivery slices

1. Tomb Record scrolling: verify pinned auto-scroll, preserved manual position, jump button, reduced motion.
2. Enemy health bars: verify percentages, zero/max safety, numeric labels, responsive layout.
3. Target selection: verify default Near target, persistence, death retargeting, guarded/out-of-range states.
4. Command-panel integration: verify selected target receives attack/ability; utility commands remain unaffected.
5. Browser coverage: Playwright flow with multiple enemies, manual log scrolling, new event, jump-to-latest, alternate-target attack.

### Acceptance criteria

- Latest event immediately visible while player remains at bottom.
- Manual log review never interrupted.
- Jump button appears only after unseen entries.
- Every enemy exposes current and maximum HP visually and textually.
- Exactly one eligible target selected during multi-enemy combat.
- Closest Near enemy selected initially.
- Clicking another eligible enemy redirects next offensive command.
- UI never reimplements canonical range or guard rules.
- Desktop and mobile retain all targeting controls.

### Approval

Owner explicitly approved this brief for promotion to an implementation spec. No blocking questions.

## Refinement

### Problem

Combat results and enemy state demand too much scanning. New Tomb Record entries can disrupt manual review, enemy HP is not glanceable, and duplicated target-specific command buttons make multi-enemy intent unclear.

### User / Value

Players can read the latest outcome, review earlier history without interruption, select the intended eligible enemy, and issue one clear offensive command. Keyboard, reduced-motion, desktop, and mobile users retain equivalent control.

### Appetite

Five bounded delivery slices: log scrolling, HP bars, target selection, command integration, and one multi-enemy Playwright flow. Reuse existing encounter projection and LegalCommand model; no combat-system, persistence, or design-system rewrite.

### Remaining Open Questions

### Candidate Approaches

- Use one encounter radiogroup backed by stable enemy IDs and existing LegalCommand target associations.
- Reconcile selected target after each server projection: preserve if eligible, else Near-first encounter order, else clear.
- Use pre-update pinned measurement plus post-render scroll reconciliation and unread jump state for Tomb Record.

### Decision Snapshot

Approve one GitHub spec. Server projection remains legality source; Svelte owns only reversible target preference and log-scroll UI state. Obsidian + Bone styling uses tallow selection, clot HP fill, numeric/status text, and short functional motion.

## Challenge

### Rabbit Holes

- Building client-side range or guard rules.
- Generalizing target selection into a new combat framework.
- Redesigning encounter data, narration history, or persistence.
- Adding decorative animation or broad visual cleanup.

### No-Gos

- No canonical combat-rule changes.
- No browser-owned command authorization.
- No PocketBase schema or production deployment changes.
- No color-only health, selection, or availability state.
- No focus stealing or forced scroll while reviewing older log entries.

### Assumptions

- Sanitized projection exposes stable enemy IDs, encounter order, rank, HP, and LegalCommand target IDs; add only missing safe presentation metadata.
- Existing pending-command state can disable both command and target controls.
- Run identity is available to reset transient selection and Tomb Record state.
- Browser fixtures can produce multiple simultaneously visible enemies.

### Likely Overengineering

A generic targeting service, global state store, custom virtualized log, or duplicated eligibility model would exceed need. Keep state local and derive commands directly from projection.

### Simpler Alternative

One local selected enemy ID, one server-command filter, one semantic enemy list, one health-percentage clamp, and one scroll/unread controller. Existing room, command submission, utility controls, and narration content stay intact.
