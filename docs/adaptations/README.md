# Dungeon-Crawler Adaptations

This directory holds explicit, approved adaptations from canonical Fivefold rules to the browser dungeon crawler.

## Classification

Every rules-sensitive implementation must identify one status:

1. **Canonical** — directly supported by `docs/game-rules/`.
2. **Adaptation** — an explicit product decision documented here or in an approved Plan spec.
3. **Unresolved** — ambiguous or undecided; do not hide a choice in UI or engine code.

## Bootstrap Decisions

- Commands resolve through a deterministic, seeded engine and emit narration events.
- The bootstrap encounter demonstrates architecture and interaction only. Its room, enemy, damage, loot, and progression values are specimen content, not canonical balance.
- Persistence will use server-authoritative command validation, snapshots, and append-only history.
- Canonical rules remain untouched even when a browser flow needs a simplified specimen.

## Approved MVP Direction

- Single-player first.
- Seeded procedural dungeon generation first.
- Run-based roguelike progression with no permanent power carryover.
- All five starting classes receive viable level-1 kits; specializations and broad perk automation are deferred.
- St. Bozma’s Tomb supplies the first room, enemy, loot, and narrative templates.
- Initial run: fixed Monastery Grounds entry, six procedural middle rooms, fixed Resting Chamber finale, at least one branch, two normal combats, one final combat, one noncombat event, and one loot/recovery choice.
- Active progress autosaves after accepted commands. Death ends and archives the run; the next run starts fresh. Run history remains read-only.
- MVP death adaptation: 0 HP ends the run. Canonical Dying and Recovery Die death handling is deferred.

## Rules Fit Test

Keep a canonical rule exact when it is deterministic, solo-applicable, useful to the room/combat loop, and within the approved implementation surface. Explicitly adapt mechanics that require GM judgment, group/ally play, open-ended fictional rulings, or table pacing.

Every implemented class feature, enemy ability, item, and room event must cite its canonical source or name its adaptation in the approved spec.
