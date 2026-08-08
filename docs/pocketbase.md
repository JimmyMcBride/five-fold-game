---
updated: '2026-07-29T16:17:43Z'
---

# PocketBase Boundary

## Configuration

Server environment:

```sh
POCKETBASE_URL=https://fivefold-pb.jimmymcbride.dev
POCKETBASE_SERVICE_TOKEN=<long-lived _superusers static auth token>
```

The values are documented in `.env.example`. Local `.env` files are ignored.
Generate the service token specifically for server-to-server persistence and
never copy it into source, browser-visible environment variables, logs, or
client data.

## Request Lifecycle

`src/hooks.server.ts` creates a fresh identity client for every SvelteKit
request, loads its auth cookie, and stores the raw authenticated record only in
server locals. The same request-scoped client handles Discord OAuth and public
email/password sign-in or registration. Passwords pass directly from the form
request to PocketBase and never enter route data, query strings, or logs.
`src/lib/server/pocketbase.ts` owns URL resolution, the sanitized session
projection, and a separate request-scoped service client used only by the run
repository. `src/routes/+layout.server.ts` exposes only the sanitized projection.

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

The public-alpha persistence schema is defined by the initial
`pocketbase/pb_migrations/1785309600_create_fivefold_runs.js` migration and the
corrective `1785316900_fix_run_zero_values_and_history.js` and
`1785341801_add_run_history_index.js` migrations. Together they create:

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

The initial and zero-value migrations were applied on 2026-07-29 after a
verified PocketBase backup named
`pre_fivefold_web_20260729t091243z.zip`. Batch requests are enabled with 50
requests, a 3-second timeout, and locked collection API rules. The first
corrective migration permits the legitimate zero values used by initial run
versions and RNG cursors, permits first-command expected version zero, and adds
the `run_records.created` timestamp used for history ordering. The follow-up
migration replaces the owner-only run-record index with `(owner, created)` to
match the history filter and sort query. All migrations are verified in both
directions before public application.

Rollback removes the history index first, then the zero-value correction, and
finally deletes `run_records`, `run_actions`, and `game_runs` through the
initial migration rollback. The verified public backup is the recovery source
if unrelated settings or records must also be restored.

The production route treats missing collections as a sealed ledger and does not
fall back to client-authoritative state. `FIVEFOLD_TEST_MODE=true` enables an
in-memory repository and test-only login route for Playwright only; never set it
in a deployed environment.

## Public Alpha

The production application is [https://five-fold-game.vercel.app](https://five-fold-game.vercel.app). Vercel stores the canonical PocketBase URL and sensitive service token in the production environment; local `.env` mirrors those values with mode `0600`. Discord OAuth redirects to `https://five-fold-game.vercel.app/auth/callback`. PocketBase's existing `users` auth collection accepts public email/password registration with an eight-character minimum and does not require email verification; no schema migration or deployment-specific callback is needed for that flow.

A disposable impersonated-user probe verified live run creation, resume, PocketBase persistence, and cascade cleanup without enabling test mode.

## Safe Health Check

Read-only:

```sh
curl --fail --silent --show-error \
  https://fivefold-pb.jimmymcbride.dev/api/health
```
