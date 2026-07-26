# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**[docs/CONCEPT.md](docs/CONCEPT.md) is the source of truth for design intent** — what the
site is, how the robot behaves, art direction, content hierarchy. Read it before proposing
structural or visual work. This file covers how the code works, not what we're building.

## Commands

```bash
npm run dev
```

```bash
npm run build
```

`npm run preview` serves the production build. There are no tests and no linter yet.

## Status: Phase 0 complete

The site is a **ground-up rebuild**. An earlier Next.js App Router implementation was
cleared out in Phase 0 — it is preserved on the `main` branch (commit "Snapshot: Next.js
build before vanilla Vite rebuild") and is reference material, not code to extend. Its art
direction (bold geometric polygons, near-black `#0a0a0a`, five per-section accents) was
superseded by hand-drawn webtoon art on a single cyan accent. Work happens on
`rebuild-vanilla`.

What exists today: the shell, design tokens, fonts, build pipeline, and two salvaged
canvas helpers. `src/main.js` renders a placeholder.

**Phase 1 (next) builds the flexible core, in this dependency order:** router →
visitor-mode store → scene renderer → robot → narrator → transitions → content data layer.
Do not build a hub, a detail page, or a minigame before the primitive it sits on exists.

## Stack

Vite + vanilla HTML/CSS/JS. **No framework** — not React, not Next. Per
[docs/CONCEPT.md](docs/CONCEPT.md): "revisit only if a strong reason emerges." Plain JS with
JSDoc types (`jsconfig.json` has `checkJs`), no TypeScript build step. Hosting: Vercel.

## Architecture

### The shell persists; only the scene swaps
[index.html](index.html) defines four fixed layers. The router replaces the contents of
`#scene-root` and **nothing else**:

```
#robot-layer      persists — robot never re-mounts across navigation
#scene-root       swapped by the router
#narrator-root    persists — dialogue + transcript
#route-announcer  aria-live, since navigation never reloads the page
```

This is the entire reason the project uses a client router instead of Vite's multi-page
mode. If a change would force the robot to re-mount, it's the wrong change.

### Routing
History API with real paths (`/projects/minecraft-pathfinding`), not hashes — URLs must
reflect actual content hierarchy. Vite's dev server does SPA fallback by default;
production needs the matching rewrite in [vercel.json](vercel.json). The negative-lookahead
in that rewrite exempts `assets/`, `favicon`, and `icons` so real files aren't swallowed by
the fallback — extend it when adding top-level static paths.

### Content is data, never markup
Every achievement is **one entry** carrying hub placement, detail copy, robot reaction, and
blog crosslink together. Adding one is a new data file; it must never require touching
layout code. Hubs render from config: object position, asset, label, hover, link.

This is a direct correction of the previous build, where each project's copy was duplicated
across three files and drifted. If you find yourself writing the same title twice, stop.

### Design tokens
[src/styles/tokens.css](src/styles/tokens.css) is the only place a color, font, duration, or
z-index is defined. **Never hardcode a hex or a ms value in a component.** The old build
scattered accents across a JS constant, a Tailwind token, and inline classes; changing a
color meant grepping for it.

Two motion speeds, deliberately far apart, and they must not blur together:
- `--tempo-pop` / `--tempo-hover` (~180–240ms) — object interactions. Frequent, must feel instant
- `--tempo-flicker` / `--tempo-lightup` (~520–900ms) — scene transitions. Rare, mood-setting

`:root[data-mode='hurry']` collapses the slow tempos to near-zero, and the reduced-motion
query zeroes all four.

### Visitor mode
Set on landing, session-scoped, switchable. Guided mode narrates; hurry mode shows
everything immediately with no dialogue. Components read `data-mode` off `<html>` and let
CSS do the branching, rather than testing the mode at every call site. Anything narrated
needs a skip path — typewriter effects must complete on click.

### Inspecting the robot's route
**Shift+D**, or load `/?debug=path`, to draw the route over the real page: the path in
document space, the text blocks it must avoid, the robot's footprint at each waypoint, and
any collisions in red.

Use it before touching [journey.js](src/content/journey.js). Because the robot is anchored
in the document, its route is one line running the entire length of the page, and whether
it clears the copy is a question about the whole page at once — it cannot be judged from
any single screenful. The first version of the path ran through all five text blocks and
looked perfectly fine at every individual scroll position.

### Salvaged canvas helpers
[src/lib/path.js](src/lib/path.js) — waypoint interpolation for the scroll-driven robot
journey on `/`. `damp()` is frame-rate-independent; use it instead of a raw per-frame lerp,
which runs ~2× faster on a 120Hz display.

[src/lib/lighting.js](src/lib/lighting.js) — `destination-out` light compositing (dark
everywhere, holes punched where light falls). **Candidate for replacement** by CSS radial
gradients over hand-drawn art; decide during Phase 1 transitions. `fitCanvas()` handles
`devicePixelRatio` — the old build didn't, hence blurry HiDPI rendering.

## Art assets

Hand-drawn webtoon style, per [docs/CONCEPT.md](docs/CONCEPT.md) — soft wiggly linework, not
corporate flat vector. Until real art lands, every asset is a crude but correctly-shaped
placeholder behind a stable path, so swapping in finals touches no code.

The robot's **head is a separate asset from its body** — that's what makes head-only pinned
mode possible on hub pages. Don't merge them into one sprite.

## Conventions
- `@/` aliases `src/`
- Hub scene coordinates are normalized 0–1 against an aspect-locked stage, so placement
  survives any viewport
- Achievement detail text is dense and skimmable. Only the robot speaks in dialogue register
