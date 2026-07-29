---
name: fivefold-review
description: Review tested Fivefold slices for rules drift, nondeterminism, state mutation, data leaks, stale-turn races, accessibility regressions, missing tests, and scope creep.
---

# Fivefold Review

Use after testing passes.

## Review Order

1. Canonical rule drift or hidden adaptation.
2. Raw auth, privileged data, hidden content, or secrets reaching the browser.
3. Nondeterministic behavior, input mutation, replay mismatch, or invalid state transition.
4. Missing authorization or expected-version protection in persisted commands.
5. Broken common browser flow, accessibility, or responsive controls.
6. Missing focused tests.
7. Scope creep or speculative architecture.

Inspect `git diff --stat`, `git diff`, acceptance criteria, and verification results. Lead with findings and file/line references. If clean, state no findings, then name test gaps and residual risk.
