---
updated: '2026-07-29T09:28:28Z'
---

# Current State

Updated 2026-07-29.

## Bootstrap

- GitHub repository: [JimmyMcBride/five-fold-game](https://github.com/JimmyMcBride/five-fold-game) (public), default branch `main`.
- Initial foundation commit: `73edf91` (`feat: bootstrap Fivefold dungeon crawler`).
- SvelteKit/Svelte 5/Bun application includes Tailwind, ESLint, Prettier, Vitest, Playwright, and PocketBase SDK.
- `/` renders an Obsidian + Bone playable shell with character state, room description, exits, actions, seeded encounter combat, loot, progression, and narration log.
- Pure engine lives under `src/lib/game/`; PocketBase request boundary lives under `src/lib/server/` and `src/hooks.server.ts`.
- `POCKETBASE_URL` is documented in `.env.example`; remote `/api/health` returned 200 and no schema was changed.
- Canonical rules corpus has 17 byte-preserved section files plus manifest and README.
- Legacy table-era combat references are isolated under `docs/reference/fivefold-table/`.
- Seven adapted project-local skills cover rules, engine, content, frontend, backend, testing, and review.

## Plan

Plan check passes and source mode is `github`. The owner confirmed promotion of brainstorm `fivefold-web-text-dungeon-crawler-mvp`. Plan created [GitHub Issue #1](https://github.com/JimmyMcBride/five-fold-game/issues/1), `Single-player procedural St. Bozma roguelike`, with the `enhancement` and `plan:spec` labels. The owner approved the resolved issue on 2026-07-29; readiness is approved and implementation is authorized on a linked feature branch.

The approved spec fixes the MVP at one seeded eight-room run, five exact level-1 class templates, deterministic room/combat/event resolution, immediate run-ending death at 0 HP, fixed solo enemy values, bounded XP progression, autosave/resume, and immutable prior-run summaries. Public alpha access uses the already-enabled PocketBase Discord OAuth provider without invitations or pre-provisioned users. Each run starts with a character name and class template; account-owned history persists but no power carries between runs.

Plan mirrored Issue #1 under `.plan/.meta/github.json`. A post-promotion preview still reports `action: create` for the local brainstorm despite that mirror, so do not reapply the brainstorm promotion until Plan reconciles the existing issue identity.

Plan CLI v0.1.28 cannot derive execution slices directly from the GitHub-owned spec and still looks for `.plan/specs/single-player-procedural-st-bozma-roguelike.md`. The linked execution branch contains that file as an explicitly labeled compatibility mirror; Issue #1 remains canonical. Do not run `plan github adopt` for this issue because it reapplies the stale promotion draft.

## Verification

Issue #1 implementation is active on
`codex/single-player-procedural-st-bozma-roguelike`. Current checks pass lint,
Svelte/TypeScript, 25 unit/integration tests, production build, and the
signed-out → test-auth → five-class creation → movement/combat →
refresh/resume → logout Playwright flow. The shared `reference-100756` seed
reaches victory with all five templates while exercising a signature feature.
PocketBase health and Discord provider discovery pass.

The branch contains deterministic eight-room generation, five fixed kits,
selected canonical class features, fixed solo enemies/progression/finale,
sanitized projections, Discord OAuth routes, versioned run APIs, idempotent
repository behavior, locked run collections, and a reversible PocketBase
migration. Production persistence uses a private service token; Discord user
tokens cannot call run collections directly. PR #2 contains the implementation and corrective PocketBase migration. The public alpha is live at `https://five-fold-game.vercel.app`; its Vercel production environment uses the canonical public PocketBase URL and a sensitive long-lived static superuser token. The public PocketBase instance has batch requests enabled, both run migrations applied, locked run collections, and verified backup `pre_fivefold_web_20260729t091243z.zip`. A disposable live user probe verified run creation, reload/resume, persistence, and cascade cleanup.

## Next Product Step

Complete one interactive Discord login through the production callback, then merge PR #2 after final review. The Discord authorization endpoint accepts the production callback and shows no redirect configuration error; completing the account consent exchange requires an interactive Discord session.
