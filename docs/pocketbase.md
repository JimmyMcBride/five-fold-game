# PocketBase Boundary

## Configuration

Server environment:

```sh
POCKETBASE_URL=https://fivefold-pb.jimmymcbride.dev
POCKETBASE_SERVICE_TOKEN=<long-lived _superusers impersonation token>
```

The values are documented in `.env.example`. Local `.env` files are ignored.
Generate the service token specifically for server-to-server persistence and
never copy it into source, browser-visible environment variables, logs, or
client data.

## Request Lifecycle

`src/hooks.server.ts` creates a fresh identity client for every SvelteKit
request, loads its auth cookie, and stores the raw authenticated record only in
server locals. `src/lib/server/pocketbase.ts` owns URL resolution, the sanitized
session projection, and a separate request-scoped service client used only by
the run repository. `src/routes/+layout.server.ts` exposes only the sanitized
projection.

Rules:

- No module-global PocketBase client.
- No privileged token or raw auth record in browser data.
- Run collection API rules are locked. A Discord user token cannot create,
  inspect, or mutate run records directly.
- No remote schema mutation without an approved persistence spec.
- Owner filtering and command validation remain in SvelteKit. Atomic batch
  writes plus the unique `(run, resulting_version)` index make concurrent
  writers conflict.

## Run Persistence

The approved but unapplied migration is
`pocketbase/pb_migrations/1785309600_create_fivefold_runs.js`. It creates:

- `game_runs` — one owner-scoped active snapshot, seed/RNG cursor, status, and
  monotonic version.
- `run_actions` — immutable accepted commands, emitted events, resulting player
  projections, and a unique `(run, command_id)` key.
- `run_records` — one immutable terminal summary per run.

The SvelteKit command service resolves the pure engine and commits the action,
snapshot/version update, and optional terminal summary through PocketBase’s
transactional batch API. Run collection API rules are locked to superuser
access. The unique `(run, resulting_version)` action index makes two batches
from the same version mutually exclusive; the losing request reloads the latest
snapshot as stale.

Before applying the migration to the alpha instance:

1. Export the remote collections snapshot and settings.
2. Confirm PocketBase batch requests are enabled with at least 3 requests and a
   short transaction timeout.
3. Generate a long-lived `_superusers` impersonation token for the application
   server, store it as `POCKETBASE_SERVICE_TOKEN`, and confirm it never enters a
   rendered page or log.
4. Apply the migration in a non-production copy and run owner-isolation,
   duplicate-command, stale-version, terminal immutability, and rollback tests.
5. Apply to alpha only with explicit authorization.

Rollback deletes `run_records`, `run_actions`, then `game_runs`. The prior remote
snapshot is the recovery source if any unrelated setting changes are needed.

The production route treats missing collections as a sealed ledger and does not
fall back to client-authoritative state. `FIVEFOLD_TEST_MODE=true` enables an
in-memory repository and test-only login route for Playwright only; never set it
in a deployed environment.

## Safe Health Check

Read-only:

```sh
curl --fail --silent --show-error \
  https://fivefold-pb.jimmymcbride.dev/api/health
```
