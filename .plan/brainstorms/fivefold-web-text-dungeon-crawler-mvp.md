---
created_at: '2026-07-29T05:42:40Z'
project: FiveFoldGame
slug: fivefold-web-text-dungeon-crawler-mvp
status: active
title: Fivefold web text dungeon crawler MVP
type: brainstorm
updated_at: '2026-07-29T05:43:12Z'
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

- Keep specs canonical; preserve the imported rulebook; record adaptations explicitly; keep PocketBase server-only and authoritative; avoid full-rule automation, procedural systems, co-op architecture, or schema work until approved.

## Open Questions

- Single-player first, co-op, or both?

- Authored dungeon first or procedural generation?

- Run-based roguelike progression or persistent campaign character?

- Which Fivefold rules remain exact?

- Which TTRPG mechanics require explicit dungeon-crawler adaptations?

- What are the death model and save model?

- How many classes ship initially?

- What is the initial dungeon scope?

- Does St. Bozma’s Tomb become the first playable dungeon?

## Ideas

- Build from the deterministic command/event engine, one authored playable dungeon slice, server-authoritative run saves, and Obsidian + Bone player UI.

## Raw Notes

Vision: A browser-based, text-first, turn-based dungeon crawler where players move between rooms, encounter enemies and events, fight, collect loot, develop characters, and save runs. This is not a TTRPG table or GM tool.

Supporting sources: docs/game-rules/README.md; docs/game-rules-provenance.md; docs/architecture.md; docs/adaptations/README.md; DESIGN.md; docs/reference/fivefold-table/README.md.

## Refinement

### Problem

Fivefold has canonical tabletop rules and a legacy multiplayer table implementation, but no bounded product contract for a player-facing web dungeon crawler. Building persistence or content before deciding the MVP shape risks encoding table assumptions and accidental rule changes.

### User / Value

Players get a focused text adventure with understandable tactical choices, trustworthy Fivefold outcomes, meaningful character growth, and resumable runs. Developers get one explicit boundary between canonical rules, adaptations, deterministic engine behavior, and persistence.

### Appetite

One coherent vertical slice: character entry, a small dungeon, room movement, one or more event/encounter types, combat, loot/progression, save/resume, and clear run completion or death. Exclude broad content libraries, co-op infrastructure, procedural generation, and full rule automation unless review selects them as essential.

### Remaining Open Questions

- Single-player first, co-op, or both?
- Authored dungeon first or procedural generation?
- Run-based roguelike progression or persistent campaign character?
- Which Fivefold rules remain exact?
- Which TTRPG mechanics require explicit dungeon-crawler adaptations?
- What are the death and save models?
- How many classes ship initially?
- What is the initial dungeon scope?
- Does St. Bozma’s Tomb become the first playable dungeon?

### Candidate Approaches

- Small authored single-player vertical slice; defer co-op and procedural generation.
- Small authored core with a persistent campaign character; keep individual dungeon runs replayable.
- Run-based roguelike slice with between-run progression; treat campaign continuity as later work.
- St. Bozma’s Tomb adaptation versus a new tutorial dungeon built to expose fewer unresolved rules.

### Decision Snapshot

Foundation is ready, but MVP product scope is not. Review must choose player mode, dungeon/content model, progression, exact/adapted rule boundary, death/save model, class count, and first dungeon before promotion.

## Challenge

### Rabbit Holes

- Encoding every class, perk, item, condition, enemy ability, and edge case before one run is fun.
- Adding procedural generation before authored room/encounter pacing is proven.
- Designing co-op synchronization before single-turn persistence semantics are proven.
- Treating legacy table specs as current product requirements.

### No-Gos

- TTRPG table or GM dashboard features.
- Silent canonical rule changes.
- Client-authoritative persisted turns.
- Remote PocketBase schema changes before approved persistence spec.
- Speculative services, state machines, or game frameworks.

### Assumptions

- Text-first room and event presentation can carry the intended experience.
- Fivefold’s core resolution can support a deterministic digital loop with explicit adaptations.
- PocketBase can support snapshot/history/version persistence once schema is approved.
- Obsidian + Bone remains readable during repeated runs.

### Likely Overengineering

Co-op, procedural dungeons, content tooling, full rules automation, generalized effect systems, and elaborate replay infrastructure can each consume the MVP. The first spec should select one narrow path and use manual or authored content where automation does not prove the core loop.

### Simpler Alternative

One authored, single-player dungeon slice with one initial class, a fixed character or constrained creator, deterministic room/encounter commands, one save slot, and explicit rule adaptations. This is a challenge proposal, not an approved choice.
