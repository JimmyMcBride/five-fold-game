---
updated: '2026-08-08T00:36:05Z'
---

# Issue #18 Party Runs

## Outcome

Implemented `st-bozma-party-v5` as a separate party-native state and resolver for
one to three fixed, server-validated prebuilts. V1-v4 singular snapshots remain
on the original engine path. V5 owns stable member/template IDs, individual
initiative and AP, explicit actor/ally targets, Down/full-party defeat, shared
expedition resources, exploration leadership, authored party-size encounters,
party projections/history, and the accessible roster/party rail.

Rules classifications and deferred behavior live in
`docs/adaptations/party-runs.md`. No PocketBase schema mutation or deployment was
required.

PR review follow-up hardened malformed v5 template decoding, aligned
`use-item.targetId` request validation with the command schema, and moved
start-of-turn effects to the owning party member's activation without changing
legacy solo timing.

## Verification

- Canonical 17-section rule corpus: 217152 bytes; SHA-256
  `0a2b64f9ad9e83b3916152e6e4928ec6824c594e63987371ec970ee7ea77cadd`.
- `bun run lint`
- `bun run check`
- `bun run test:unit` — 118 tests.
- `bun run build`
- `bun run test:e2e` — six desktop/mobile/keyboard flows.

`bun run rules:verify` without an export path prints usage by design. The
session instead verified every section hash and the concatenated corpus against
the pinned manifest without writing source files.
