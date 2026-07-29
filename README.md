# Fivefold

Browser-based, text-first, turn-based dungeon crawler built with SvelteKit, Svelte 5, TypeScript, Bun, Tailwind CSS, and PocketBase.

The bootstrap includes one playable local specimen: enter the Crooked Ossuary, resolve a deterministic encounter, collect loot, and level a character. The pure game engine is framework-independent; persisted runs will remain server-authoritative.

## Develop

```sh
cp .env.example .env
bun install
bun run dev
```

`POCKETBASE_URL` defaults to the documented remote URL when absent. Never place privileged PocketBase credentials in client-exposed environment variables.

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
- `docs/game-rules/` — byte-preserved canonical Fivefold v0.8 Beta import.
- `docs/adaptations/` — explicit dungeon-crawler decisions; never canonical rules.
- `docs/reference/fivefold-table/` — legacy table-era implementation references.
- `skills/fivefold-*/` — project-local agent workflows.

Read `AGENTS.md` before substantial work.
