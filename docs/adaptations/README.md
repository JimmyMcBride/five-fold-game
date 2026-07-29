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

## Unresolved Product Decisions

- Single-player first, co-op, or both.
- Authored dungeon first or procedural generation.
- Run-based roguelike progression or persistent campaign character.
- Exact rules versus explicit dungeon adaptations.
- Death and save models.
- Initial class count.
- Initial dungeon scope.
- Whether St. Bozma’s Tomb is the first playable dungeon.

Resolve these through the Plan brainstorm and approved specs.
