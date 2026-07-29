# Fivefold

Browser-based, text-first, turn-based dungeon crawler built with SvelteKit, Svelte 5, TypeScript, Bun, Tailwind CSS, and PocketBase.

The current alpha implementation supports public Discord OAuth, run-scoped
character creation for all five classes, a seeded eight-room St. Bozma dungeon,
solo combat and progression, autosave/resume, and immutable run summaries. The
pure engine remains framework-independent and persisted commands are
server-authoritative.

## Develop

```sh
cp .env.example .env
bun install
bun run dev
```

`POCKETBASE_URL` defaults to the documented remote URL when absent. Production
run persistence also requires a server-only `POCKETBASE_SERVICE_TOKEN`; never
place it in a public environment variable.

The reviewed, reversible run-collection migrations under
`pocketbase/pb_migrations/` are applied to the public alpha. Read
`docs/pocketbase.md` before changing the persistence collections or PocketBase
batch API. `FIVEFOLD_TEST_MODE` is only for local Playwright and must never be
enabled in deployment.

## Verify

```sh
bun run lint
bun run check
bun run test:unit
bun run build
bun run test:e2e
```

Project work runs these commands through `brain session run -- ...` so Brain records verification.

## Project Map

- `src/lib/game/` — pure deterministic command engine.
- `src/lib/server/` — server-only integrations, including PocketBase.
- `src/routes/` — SvelteKit UI and server route boundaries.
- `pocketbase/pb_migrations/` — reviewed, reversible public-alpha run schema.
- `docs/game-rules/` — byte-preserved canonical Fivefold v0.8 Beta import.
- `docs/adaptations/` — explicit dungeon-crawler decisions; never canonical rules.
- `docs/reference/fivefold-table/` — legacy table-era implementation references.
- `skills/fivefold-*/` — project-local agent workflows.

Read `AGENTS.md` before substantial work.
