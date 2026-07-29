---
updated: '2026-07-29T21:21:52Z'
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

Plan created [GitHub Issue #4](https://github.com/JimmyMcBride/five-fold-game/issues/4), `Update canonical game rules and runtime to Fivefold v0.8.5`, as a ready spec. Its implementation branch imports and byte-verifies the pinned v0.8.5 Google Doc, makes `st-bozma-v0.8.5-v2` the default for new runs, and retains explicit `st-bozma-mvp-v1` snapshot resolution. V2 adds two AP with duplicate-action lockout, Block/Dodge bands, Deathblows, Shove, free rank closing, seeded health growth, the 85 stat cap, and selected enemy/class corrections without a PocketBase schema change.

The approved spec fixes the MVP at one seeded eight-room run, five exact level-1 class templates, deterministic room/combat/event resolution, immediate run-ending death at 0 HP, fixed solo enemy values, bounded XP progression, autosave/resume, and immutable prior-run summaries. Public alpha access uses the already-enabled PocketBase Discord OAuth provider without invitations or pre-provisioned users. Each run starts with a character name and class template; account-owned history persists but no power carries between runs.

Plan mirrored Issue #1 under `.plan/.meta/github.json`. A post-promotion preview still reports `action: create` for the local brainstorm despite that mirror, so do not reapply the brainstorm promotion until Plan reconciles the existing issue identity.

Plan CLI v0.1.28 cannot derive execution slices directly from the GitHub-owned spec and still looks for `.plan/specs/single-player-procedural-st-bozma-roguelike.md`. The linked execution branch contains that file as an explicitly labeled compatibility mirror; Issue #1 remains canonical. Do not run `plan github adopt` for this issue because it reapplies the stale promotion draft.

Plan created [GitHub Issue #6](https://github.com/JimmyMcBride/five-fold-game/issues/6), `Combat readability and target selection`, as a ready spec. It covers pinned Tomb Record scrolling, accessible enemy HP bars, LegalCommand-backed radio targeting, selected-target command integration, responsive/reduced-motion behavior, and multi-enemy Playwright coverage. The owner approved the brief on 2026-07-29; implementation is authorized, while production deployment remains out of scope.

## Verification

Issue #6 implementation is complete on
`codex/combat-readability-and-target-selection`. It adds pinned Tomb Record
scrolling with unread jump control, semantic enemy HP bars, Near-first persistent
radio targeting, selected-target command filtering, and responsive/reduced-motion
coverage without moving legality into Svelte. Lint, Svelte/TypeScript, 57 unit
tests, production build, and two Playwright flows pass; desktop/mobile manual QA
is clean. PR #7 review feedback is resolved: unavailable reasons stay neutral without server metadata, pending target rows are visibly disabled, and HP progress bars expose exact accessible value text.

Issue #1 implementation is active on
`codex/single-player-procedural-st-bozma-roguelike`. Current checks pass lint,
Svelte/TypeScript, 25 unit/integration tests, production build, and the
signed-out → test-auth → five-class creation → movement/combat →
refresh/resume → logout Playwright flow. The shared `reference-100756` seed
reaches victory with all five templates while exercising a signature feature.
PocketBase health and Discord provider discovery pass.

Spec #4 implementation is complete on
`codex/update-canonical-game-rules-and-runtime-to-fivefold-v0-8-5`. The pinned
217152-byte rules export and all 17 sections verify against SHA-256
`0a2b64f9ad9e83b3916152e6e4928ec6824c594e63987371ec970ee7ea77cadd`;
re-import is idempotent. Lint, Svelte/TypeScript checks, 50 unit/integration
tests, production build, and the AP/Block-Dodge/resume Playwright flow pass.
Fivefold review found no remaining correctness, data-exposure, determinism,
authorization, accessibility, or scope findings. Canonical source whitespace
remains intentionally byte-preserved.

The branch contains deterministic eight-room generation, five fixed kits,
selected canonical class features, fixed solo enemies/progression/finale,
sanitized projections, Discord OAuth routes, versioned run APIs, idempotent
repository behavior, locked run collections, and a reversible PocketBase
migration. Production persistence uses a private service token; Discord user
tokens cannot call run collections directly. PR #2 merged the implementation; follow-up PR #3 contains the migration-safety fixes, corrective PocketBase migrations, and deployment runbook updates. The public alpha is live at `https://five-fold-game.vercel.app`; its Vercel production environment uses the canonical public PocketBase URL and a sensitive long-lived static superuser token. The public PocketBase instance has batch requests enabled, the initial and zero-value migrations applied, locked run collections, and verified backup `pre_fivefold_web_20260729t091243z.zip`. A disposable live user probe verified Discord sign-in, run creation, reload/resume, persistence, and cascade cleanup. The run-history composite-index migration is pending final review and public application.

## Next Product Step

Verify and apply the run-history composite-index migration, then merge follow-up PR #3. After that, tune the playable public-alpha experience from tester feedback.
