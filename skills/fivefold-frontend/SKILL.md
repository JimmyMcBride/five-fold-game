---
name: fivefold-frontend
description: Implement or review Svelte 5 and SvelteKit dungeon UI, narration logs, character state, room navigation, combat controls, accessibility, responsive behavior, and Obsidian + Bone alignment.
---

# Fivefold Frontend

Use for player-facing Svelte work.

## Required Context

Read `AGENTS.md`, `DESIGN.md`, `.impeccable.md`, relevant routes, and any approved spec. Use `fivefold-game-rules` for rules-sensitive UI.

## Principles

- Build the playable tool surface, not a marketing page.
- Render sanitized route data and domain events; do not duplicate engine rules in components.
- Preserve Obsidian + Bone: charcoal, bone, tallow, clot, verdigris, manuscript display type, mono logs/stats.
- No gradients, parchment, ornate MMO chrome, glassmorphism, or nested card stacks.
- Provide visible focus, semantic controls, readable contrast, minimum hit targets, and reduced-motion behavior.
- Adapt layout on mobile without removing critical actions.
- Make pending, disabled, stale, empty, success, and error states explicit when persistence arrives.

After implementation, use `fivefold-testing`, then `fivefold-review`.
