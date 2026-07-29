# Canonical Rules Provenance

`docs/game-rules/` was regenerated on 2026-07-29 from one pinned Google Docs
markdown export. The import command verifies the complete source before writing
any canonical section.

Source metadata, preserved in `docs/game-rules/source-manifest.json`:

- Title: `Fivefold (v0.8.5 Beta)`
- Google Doc ID: `1JTO4JWvfuGg8itgcIA0ffoL_5BAZpKo93J2hgp-Oe3I`
- Tab: `t.0` (`Fivefold`)
- Source modified: `2026-06-30T05:45:19.904Z`
- Export byte count: `217152`
- Export SHA-256:
  `0a2b64f9ad9e83b3916152e6e4928ec6824c594e63987371ec970ee7ea77cadd`
- Imported and split: `2026-07-29T17:45:00.000Z`
- Split strategy: `ordered-byte-boundaries`

The 17 generated section files concatenate to the exact source export. Their
individual byte ranges and hashes are in the manifest. Run
`bun run rules:verify -- <export.md>` to verify the corpus without writing it.
Do not normalize, rewrite, reformat, or silently reinterpret those files.

Dungeon-crawler adaptations belong under `docs/adaptations/` or an approved Plan spec. An adaptation must name the canonical source, distinguish a product decision from rule text, and preserve unresolved ambiguity when no decision is approved.
