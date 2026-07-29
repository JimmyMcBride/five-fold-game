# Fivefold Game Rules

This folder contains the canonical imported markdown copy of the Fivefold v0.8.5
Beta rulebook, split into major sections for easier agent and human lookup.

## Source

- Google Doc: [Fivefold (v0.8.5 Beta)](https://docs.google.com/document/d/1JTO4JWvfuGg8itgcIA0ffoL_5BAZpKo93J2hgp-Oe3I/edit?tab=t.0)
- Document ID: `1JTO4JWvfuGg8itgcIA0ffoL_5BAZpKo93J2hgp-Oe3I`
- Tab: `t.0` / `Fivefold`
- Source modified: `2026-06-30T05:45:19.904Z`
- Imported: `2026-07-29T17:45:00.000Z`
- Export bytes: `217152`
- Export SHA-256:
  `0a2b64f9ad9e83b3916152e6e4928ec6824c594e63987371ec970ee7ea77cadd`
- Split strategy: ordered byte boundaries at the 17 major section headings

## Table Of Contents

1. [Changelog](./sections/00-changelog.md)
2. [Basic Rules](./sections/01-basic-rules.md)
3. [Combat Rules](./sections/02-combat-rules.md)
4. [Conditions](./sections/03-conditions.md)
5. [Survival](./sections/04-survival.md)
6. [Hexes & Travel](./sections/05-hexes-and-travel.md)
7. [Character Creation](./sections/06-character-creation.md)
8. [Species](./sections/07-species.md)
9. [Vices & Sin](./sections/08-vices-and-sin.md)
10. [Background & Calling](./sections/09-background-and-calling.md)
11. [Classes, Perks & Advancement](./sections/10-classes-perks-and-advancement.md)
12. [Perks](./sections/11-perks.md)
13. [Triumphs & Fame](./sections/12-triumphs-and-fame.md)
14. [Items, Gold, & Gear](./sections/13-items-gold-and-gear.md)
15. [The World](./sections/14-the-world.md)
16. [Bestiary](./sections/15-bestiary.md)
17. [St Bozma’s Tomb](./sections/16-st-bozmas-tomb.md)

## Files

- [sections/](./sections/): source-canonical rulebook sections.
- [source-manifest.json](./source-manifest.json): import metadata and source-to-section mapping.
- [v0.8-to-v0.8.5-diff.md](./v0.8-to-v0.8.5-diff.md): classified
  source and runtime reconciliation.

## Reproduce Or Verify

Download the Google Docs markdown export, then run:

```sh
bun run rules:import -- /path/to/fivefold-v0.8.5.md
bun run rules:verify -- /path/to/fivefold-v0.8.5.md
```

Both commands stop if the byte count, full-export hash, section order, or any
required boundary differs from the pinned source. Verification also compares
every generated section and the manifest without writing files.

## Notes

- Treat files in `sections/` as source-canonical game rules.
- The 17 section files concatenate to the exact pinned export bytes.
- The section files intentionally preserve Google Docs markdown export formatting, including backticks, bold markers, escaped punctuation, and table formatting.
- Do not rewrite or normalize the imported rule text unless a future task explicitly asks for a derivative reference format.
