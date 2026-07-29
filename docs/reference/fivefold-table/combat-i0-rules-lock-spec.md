# Combat I0 Rules Lock Spec

## Status

Complete.

## Purpose

Lock the rules and product assumptions that affect combat data shape before implementing Initiative 1.

I0 is not a code initiative. It is a decision contract for combat implementation.

## Locked Decisions

### Enemy Reflex

Store enemy Reflex in two forms:

- Raw Reflex value/text for display and audit.
- Normalized `reflexMod` for initiative and turn-order logic.

Normalization:

- `0-10`: treat as an already-provided modifier.
- `11-90`: treat as a full stat and calculate `floor(reflex / 10)`.
- DM can override `reflexMod` during enemy setup or edit.

Reason:

Bestiary entries are inconsistent. Most enemies use single-digit Reflex values that read like modifiers. Throne uses `Reflex: 74`, which reads like a full stat. Initiative requires `d10 + Reflex modifier`, so storing both values preserves source fidelity and gives the app a clear mechanic.

### GM Momentum

Use the newer monster momentum dice rule.

Rule:

- Each living monster rolls its listed momentum dice at the start of a round.
- Each rolled `10` creates a pending maneuver trigger.
- Extra `10`s can trigger other maneuvers, grant extra weapon attacks, or empower a maneuver according to the stat block.

Reason:

The bestiary foregrounds this rule, and the changelog says monster momentum dice were added after the older threshold-30 rule.

### Enemy Entry

Use manual enemy entry for the first implementation.

Reason:

Manual entry proves encounter/combatant state faster than curating templates. Enemy templates come later after the combat data shape is proven.

### Gear Automation

Keep gear free-text for MVP. Do not structure equipped weapons, armor, shields, or scrolls in Initiative 1.

Reason:

Combat needs reliable encounter state, actions, HP, visibility, and history first. Gear automation belongs with later attack-assistant work.

## Out Of Scope

- Enemy templates.
- Structured gear.
- Full class/perk automation.
- Full attack automation.
- Final UI composition.

## Acceptance Criteria

- Enemy Reflex normalization is documented.
- GM momentum rule is documented.
- Enemy entry strategy is documented.
- Gear automation boundary is documented.
- Initiative 1 can proceed without rules ambiguity in schema design.

## Verification

- Read `docs/combat-roadmap.md`.
- Read this spec.
- Confirm no Initiative 1 schema field depends on an unresolved I0 decision.
