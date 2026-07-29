---
name: fivefold-backend
description: Implement or review SvelteKit server and PocketBase work for authentication, sanitized projections, authoritative run commands, snapshots, action history, expected-version checks, and permissions.
---

# Fivefold Backend

Use for server, persistence, auth, and permission work.

## Required Context

Read `AGENTS.md`, `.brain/context/architecture.md`, `docs/architecture.md`, `docs/pocketbase.md`, relevant server files, and approved specs.

## Principles

- Create one PocketBase client per SvelteKit request.
- Keep raw auth records, secrets, privileged calls, and hidden content server-side.
- Expose explicit sanitized session and run projections.
- Server validates and resolves persisted commands authoritatively.
- Persist snapshots plus append-only command/event history.
- Require `expectedVersion` and atomically reject stale turns.
- Enforce ownership in server orchestration and PocketBase rules/hooks where direct writes could bypass it.
- Do not assume source-project collections match dungeon runs.
- No remote schema mutation without an approved persistence spec.

Use `fivefold-game-rules` and `fivefold-game-engine` when server behavior resolves game commands. Then use testing and review skills.
