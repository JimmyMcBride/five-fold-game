# PocketBase Boundary

## Configuration

Server environment:

```sh
POCKETBASE_URL=https://fivefold-pb.jimmymcbride.dev
```

The value is documented in `.env.example`. Local `.env` files are ignored. Never copy secrets from the source project.

## Request Lifecycle

`src/hooks.server.ts` creates a fresh client for every SvelteKit request, loads its auth cookie, and stores the raw authenticated record only in server locals. `src/lib/server/pocketbase.ts` owns URL resolution and the sanitized session projection. `src/routes/+layout.server.ts` exposes only that projection.

Rules:

- No module-global PocketBase client.
- No privileged token or raw auth record in browser data.
- No direct client assumption that source-project collections fit dungeon runs.
- No remote schema mutation without an approved persistence spec.
- Authorization and stale-turn protection remain server-side even if PocketBase collection rules also enforce them.

## Persistence Direction

Expected future collections are documented in `docs/architecture.md`. Run state should use snapshots plus append-only command/event history and an `expectedVersion` guard. Remote collection names and schema are not assumed to exist during bootstrap.

## Safe Health Check

Read-only:

```sh
curl --fail --silent --show-error \
  https://fivefold-pb.jimmymcbride.dev/api/health
```
