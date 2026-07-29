---
name: fivefold-testing
description: Verify Fivefold implementation slices through focused deterministic tests, Svelte checks, lint, build, and Playwright browser flows recorded by Brain.
---

# Fivefold Testing

Use after every implementation slice and before review.

## Test Priorities

- Engine: deterministic replay, no input mutation, command/event outcomes, rule boundaries.
- Backend: authentication, sanitized projections, ownership, stale versions, invalid payloads.
- Frontend: playable path, accessible controls, narration, disabled states, responsive integrity.
- Content: correct source classification and no accidental canonical edits.

## Required Verification

Run through the active Brain session:

```sh
brain session run -- bun run lint
brain session run -- bun run check
brain session run -- bun run test:unit
brain session run -- bun run build
```

For browser-flow changes:

```sh
brain session run -- bun run test:e2e
```

Report commands, results, coverage, and residual risk to `fivefold-review`. Fix failing checks through the owning implementation skill, then rerun the affected checks.
