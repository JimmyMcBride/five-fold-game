# Fivefold Design System

Fivefold uses the **Obsidian + Bone** theme: a grim, player-facing tomb-ledger console for long text-first dungeon runs. The interface should feel like a dangerous instrument for play: severe, readable, ritualistic, and built for dense tactical state.

## Design Intent

- **Audience**: Players exploring browser-based, turn-based Fivefold dungeons.
- **Use cases**: Read unfolding fiction, move between rooms, track character and combat state, issue commands, collect loot, and make tactical choices without visual fatigue.
- **Tone**: Grim, focused, oppressive, premium, and severe.
- **Anti-reference**: No parchment panels, gold trim, ornate MMO chrome, generic fantasy UI, muddy brown ledgers, glassmorphism, gradient text, or decorative side-stripe cards.

## Color Tokens

Use OKLCH as the source of truth. Hex approximations are included only for interoperability with tools that need hex values.

| Token               | OKLCH                  | Hex Approx. | Usage                                               |
| ------------------- | ---------------------- | ----------- | --------------------------------------------------- |
| `--color-grave`     | `oklch(10% 0.008 258)` | `#08090c`   | App shell, page background, dead space              |
| `--color-docket`    | `oklch(17% 0.011 258)` | `#16171b`   | Primary surfaces, tool wells, live scene background |
| `--color-ledger`    | `oklch(24% 0.014 258)` | `#282a2f`   | Raised panes, controls, command rows                |
| `--color-bone`      | `oklch(91% 0.018 78)`  | `#e9e2d0`   | Primary text, strong labels                         |
| `--color-ash`       | `oklch(68% 0.017 78)`  | `#a49e91`   | Secondary text, metadata, muted chat                |
| `--color-tallow`    | `oklch(78% 0.095 69)`  | `#e2a956`   | Primary action, focus, holy/command state           |
| `--color-clot`      | `oklch(55% 0.155 28)`  | `#bb443d`   | Danger, wounds, failed rolls                        |
| `--color-verdigris` | `oklch(68% 0.08 154)`  | `#77ad86`   | Success, recovery, safe state                       |
| `--color-border`    | `oklch(38% 0.014 258)` | `#4b4d52`   | Borders, dividers, SVG grid lines                   |

## Typography

- **Display**: `Texturina`, Georgia fallback. Use for H1/H2/H3 and dramatic specimen text.
- **Body**: `Chivo`, Verdana fallback. Use for long copy, labels, panel text, and controls.
- **Mono**: `Azeret Mono`, monospace fallback. Use for logs, command strings, stats, timestamps, rolls, and token names.

Rules:

- Preserve readability over atmosphere.
- Use large display type only for page and section hierarchy, not dense panels.
- Use uppercase only for short labels and system metadata.
- Keep long text near 60-75 characters per line.
- Use tabular numerals for stats, timestamps, roll results, and resource counters.

## Spacing

Use a 4-point spacing scale:

| Token         | Value     | Usage                   |
| ------------- | --------- | ----------------------- |
| `--space-2xs` | `0.25rem` | Tight internal nudge    |
| `--space-xs`  | `0.5rem`  | Compact gaps            |
| `--space-sm`  | `0.75rem` | Form and row padding    |
| `--space-md`  | `1rem`    | Default component gap   |
| `--space-lg`  | `1.5rem`  | Panel padding           |
| `--space-xl`  | `2rem`    | Section internal rhythm |
| `--space-2xl` | `3rem`    | Major page separation   |
| `--space-3xl` | `4rem`    | Large specimen spacing  |

Use `gap` for sibling spacing. Avoid arbitrary margins unless they define page rhythm.

## Layout

- Build dense but organized tactical surfaces.
- Prefer full-width bands and constrained inner content over nested card stacks.
- Main content max width: `94rem`.
- Responsive panels collapse to one column below roughly `980px`.
- Fixed-format UI such as stat strips, trackers, logs, and command rows must use stable dimensions and avoid layout shift.

## Components

### Buttons

- Primary buttons use `--color-tallow` background and `--color-grave` text.
- Secondary buttons use a subtle tallow/ledger mix.
- Ghost buttons are transparent with a `1px` border.
- Minimum hit target: `2.75rem` high.
- Hover may lift by `translateY(-1px)` and shift border to `--color-tallow`.

### Inputs

- Inputs use `--color-grave` background, `--color-border` border, and `--color-bone` text.
- Focus rings use `2px solid --color-tallow` with `3px` offset.

### Panels

- Primary panels use `--color-docket`.
- Raised controls and rows use `--color-ledger`.
- Borders are always `1px solid --color-border`.
- Avoid rounded-card styling unless a future production component system explicitly introduces radius.

### Live Dungeon Scene

- Scene background must remain flat: `background: var(--color-docket)`.
- Grid texture is allowed only as non-gradient line art, currently an inline SVG pattern layer.
- Do not use CSS gradient backgrounds for the live scene grid.
- Keep narration logs, character state, action controls, and any ASCII map above the grid layer.

### Logs And Stats

- Use mono type with tabular numerals.
- Logs should preserve scan rhythm with timestamp, type, and message columns on desktop.
- Mobile logs may collapse to one column.
- Success text uses `--color-verdigris`; danger uses `--color-clot`; pressure and command state use `--color-tallow`.

## Motion

- Motion should be scarce and functional.
- Use short ease-out transitions for hover and focus feedback.
- Respect reduced motion by disabling long transitions and animations.

## Accessibility

- Text contrast must remain high on all major surfaces.
- Keep body and log text readable during long sessions.
- Use visible keyboard focus on links, buttons, and inputs.
- Do not rely on color alone for game state; pair color with labels such as `Danger`, `Success`, `Pressure`, `Sin`, or `Recovery`.

## Design Guardrails

- Do not use gradient text.
- Do not use `border-left` or `border-right` wider than `1px` as an accent stripe.
- Do not use parchment, tan/brown fantasy paper, gold trim, or ornate MMO frames.
- Do not put cards inside cards.
- Do not let decorative texture reduce legibility.
- Do not add alternate themes unless the project explicitly reopens theme exploration.

## Current Specimen

The bootstrap specimen is `/`, implemented at `src/routes/+page.svelte`.
