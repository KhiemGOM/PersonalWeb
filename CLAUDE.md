# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state — the build is broken

`npm run build` fails today. `package.json` and `package-lock.json` disagree, and several declared deps are not installed:

| | `package.json` declares | actually installed / locked |
|---|---|---|
| next | `14.2.21` | `16.2.9` |
| react / react-dom | `^18.3.1` | `19.2.7` |
| framer-motion | `^11.11.9` | **missing** |
| tailwindcss / postcss / autoprefixer | declared | **missing** |

Failures you will hit: `Module not found: Can't resolve 'framer-motion'` (imported by [FloatingContact.tsx](components/FloatingContact.tsx:3) and [experience/page.tsx](app/experience/page.tsx:7)), and a postcss error because [postcss.config.js](postcss.config.js) loads `tailwindcss`.

Resolve this before debugging anything else. Two coherent paths — pick one and reconcile both files:

- **Stay on Next 16 + React 19** (matches the lockfile): update `package.json` deps, install `framer-motion tailwindcss postcss autoprefixer`, and fix the Next 15+ breaking change noted under *Dynamic routes* below.
- **Pin back to Next 14 + React 18** (matches `package.json`): delete `node_modules` and `package-lock.json`, reinstall.

## Commands

```bash
npm run dev
```

```bash
npm run build
```

`npm run lint` is broken: it runs `next lint`, removed in Next 16 (`Invalid project directory provided, no such directory: .../lint`). There is no working lint setup — the root [eslint.config.js](eslint.config.js) is leftover Vite scaffolding (flat config for `.js/.jsx`, referencing `@eslint/js` and `eslint-plugin-react-refresh`, none of which are installed). Either wire up `eslint` + `eslint-config-next` properly or drop the script; don't read anything into its output.

There are no tests and no test runner.

## Dead scaffolding — do not edit

The repo still contains the `create-vite` template it was scaffolded from. None of it is reachable from the Next app:

`src/` (App.jsx, main.jsx, App.css, index.css, assets/) · `index.html` · `vite.config.js` · `eslint.config.js` · `README.md` (still the stock "React + Vite" readme)

`public/favicon.svg` and `public/icons.svg` are live (Next serves `public/`). Everything else above is safe to delete and is not a source of truth.

## Stack

- **Next.js App Router**, TypeScript strict, `@/*` → repo root
- **Canvas 2D API** — all robot rendering and lighting; no Three.js, no WebGL
- **Tailwind CSS** — UI/text layers only, never the canvas
- **Framer Motion** — floating contact button, experience page (currently uninstalled, see above)

## Architecture

### Canvas system (`components/RobotCanvas.tsx`)
One `<canvas>` fixed to the viewport, z-index 0, `pointer-events: none`. **Mounted only by [app/page.tsx](app/page.tsx) — every subpage is plain dark HTML with no robot and no lighting.** A `requestAnimationFrame` loop owns all state in closure variables (position, mouse, headAngle, intensity); nothing lives in React state, so the whole system is one `useEffect` with an empty dep array.

Per-frame draw order is a contract — `drawLighting` punches holes in a dark overlay via `destination-out`, so it must run between the background fill and the robot:

1. `clearRect` + fill void `#0a0a0a`
2. `drawLighting()`
3. `drawRobot()` — drawn *on top* of the overlay, which is what makes it read as lit

Known gaps: the canvas is sized in CSS pixels with no `devicePixelRatio` scaling (blurry on HiDPI), and its fixed positioning is duplicated between the inline `style` prop and the `#world-canvas` rule in [globals.css](app/globals.css:43) — change both or neither.

### Lighting (`lib/lighting.ts`)
`rgba(10,10,10,0.92)` overlay, then two `destination-out` gradients: an ambient radial pool centered on the robot, and a cone beam originating at `robotY - 52` (hardcoded to match the robot's head offset) aimed at the cursor. Finally a `source-over` accent tint at 8% alpha. The accent hex is parsed with `slice()` — it must be 6-digit `#rrggbb`.

### Robot (`lib/robot.ts`)
Pure canvas 2D, stateless. Bold flat polygons with hard left/right face shading (two fills per limb: light face + shade face) — no gradients on the robot itself. Every coordinate is multiplied by `scale`, so the whole robot resizes from one parameter. `headAngle` is damped to `* 0.25` inside `drawRobot` — a subtle tilt, not a full rotation.

### Scroll path (`lib/scrollPath.ts`)
`MAIN_PATH` is an array of `{ progress, xRatio, yRatio, section }` waypoints in scroll order. `getRobotPositionAtProgress()` finds the bracketing pair and lerps. Two behaviors to know:

- The returned `section` flips at the segment midpoint (`t < 0.5 ? from : to`), and a section change in `RobotCanvas` drops `lightIntensity` to `0.2` before it ramps back to 1 — that's the "fade and relight" effect.
- Actual robot position lerps toward the target at `t=0.05` per frame. That lag *is* the physical trail feel; raising it makes the robot feel weightless.

Scroll progress is `scrollY / (document.body.scrollHeight - innerHeight)`, so waypoint `progress` values are relative to total page height, not section count. Adding or removing a section shifts every waypoint.

### Page structure
```
app/
  page.tsx                  — main scrollable page, 5 sections + RobotCanvas
  about/page.tsx            — hobbies
  projects/page.tsx         — hub          projects/[slug]/page.tsx      — deep page
  competitions/page.tsx     — hub          competitions/[slug]/page.tsx  — deep page
  misc/page.tsx             — hub          misc/[slug]/page.tsx          — deep page
  experience/page.tsx       — intentional 404
```
Main-page sections (`components/sections/`) are transparent over the canvas — never give them background colors.

### Content is hardcoded per-file, and duplicated
There is no CMS, no data directory, no fetching. Each page declares its content as a module-level `const` at the top of its own file. Deep pages key that const by slug and feed `generateStaticParams()` from `Object.keys()`.

**The same content lives in two or three places per section** — e.g. Lectify appears in [ProjectsSection.tsx](components/sections/ProjectsSection.tsx:3) (name only), [projects/page.tsx](app/projects/page.tsx:3) (hub card), and `app/projects/[slug]/page.tsx:13` (full record). Adding or renaming an entry means editing all of them; the slug in the hub list must match the key in the deep-page record or the link falls into the "not found" branch.

### Dynamic routes and Next 16
All three `[slug]` pages type `params` as `{ slug: string }` and read `params.slug` synchronously. Next 15+ makes `params` a Promise — if the repo lands on Next 16, these components must become `async` and `await params`.

### Section accent colors
| Section | Color |
|---|---|
| hero | `#f5c842` |
| about | `#4a9eff` |
| projects | `#ff6b4a` |
| competitions | `#7c4aff` |
| misc | `#4aff9e` |

These hexes are defined in **three** places: `SECTION_ACCENTS` in [RobotCanvas.tsx](components/RobotCanvas.tsx:13), the `accent-*` tokens in [tailwind.config.ts](tailwind.config.ts:11), and arbitrary-value classes (`text-[#ff6b4a]`) throughout every section and page. The Tailwind tokens are currently unused — pages use raw hex. Changing an accent means grepping the hex, not editing one constant.

Note also that `tailwind.config.ts` maps `font-sans` to `var(--font-geist-sans)`, which is never defined — no `next/font` is set up in [layout.tsx](app/layout.tsx), so text falls through to `system-ui`.

### Floating contact button
Rendered in root [layout.tsx](app/layout.tsx:19) via `<FloatingContact />` — present on every page, fixed bottom-right, z-50.

## Aesthetic rules
- Geometric robot: bold flat polygons, hard shading (light face / dark face), no gradients on the robot
- Palette: near-black void, section accent, off-white `#e8e0d4` body, muted `#a89f94` for secondary text
- Text: sparse; uppercase `tracking-[0.3em]` labels, large bold headings
- Everything outside the light radius is near-black — do not add background colors to sections
- Deep pages follow a fixed rhythm: `← Back` link, uppercase tag, huge title, tagline, two-column body, accent-bordered demo box

## Known placeholders
- `mailto:khiem@example.com` in [FloatingContact.tsx](components/FloatingContact.tsx:8) and [experience/page.tsx](app/experience/page.tsx:27) — the real address is `khiem07062007@gmail.com`
- Competition `result` fields read `"[fill in]"`
- Every deep page's interactive demo is a bordered "Coming soon." box; `demoLabel` describes the intent
- The experience page's robot-fall animation is a TODO — only the text reassembly exists

## Deep pages — planned interactives
- `projects/[slug]` — a minigame/demo per project showing why the problem was hard
- `competitions/ioai` — tune a linear regression
- `competitions/ftc` — drive a robot (Nav2-style)
- `misc/emergence-loop` — scale-of-the-universe minigame
- `experience` — robot falls over, page reassembles into the hire-me message
