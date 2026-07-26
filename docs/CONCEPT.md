# Personal Site — Content Hierarchy & Concept Notes

Source of truth for design intent. Written by Khiem; CLAUDE.md defers to this document
for *what* we're building, and covers *how the code works* separately.

## Core concept

An interactive "dimension," not a static resume. A robot companion guides the visitor
(or doesn't — depends on stated intent) across four themed hubs. Art style is soft,
wiggly-line webtoon / gag-comic. **Not** corporate flat design.

## Site structure

### Always present
- Floating contact button, every page
- Robot companion — full body + scroll-driven movement on the main page; **head only,
  pinned to the left edge**, on hub and detail pages

### Pages
| Route | Role |
|---|---|
| `/` | Dark intro, flicker-on reveal (robot + title), visitor-intent branch, then scroll-driven journey with teasers into the four hubs + About |
| `/about` | The one non-hub, non-trophy page. Personal/hobby-driven (theoretical physics, anime, Minecraft), interactive rather than static bio text |
| `/projects` | Hub — STEM lab scene (shelves, floor space) |
| `/academics` | Hub — library scene (books + objects). Research *and* academic context |
| `/competitions` | Hub — podium/spotlight scene (trophies, medals, pedestals) |
| `/misc` | Hub — whirling pool scene (floating objects; signals chaos/randomness) |
| `/experience` | Not a real page. Deliberate 404 gag: robot trips and falls, page reassembles into "haven't been hired yet, want to be first?" + contact CTA |
| `/blog` | Ongoing log, cross-linked from hub objects. Reverse-chronological; no tags/categories yet |

## Visitor branch

Set on landing, immediately after the intro. Robot asks: *"What's the purpose of your
visit today?"*

- **"I'm here for work, in a hurry"** → no dialogue. Transcripts and descriptions are
  visible immediately. Guided narration skipped entirely.
- **"I'm here to discover this new place, lead me"** → full guided experience with robot
  dialogue.

Persists for the **session** (not permanently), with a way to switch modes later.

## Hub content — trophy-case model

Not a journey or timeline, at least for v1.

### Projects
| Item | Interactive |
|---|---|
| **Minecraft pathfinding** (Python + Java, A* with air-potential heuristic) — flagship, first blog post | Puzzle with minable-maze mechanics |
| **Skillseed** (co-founded, 90k+ students, 80+ countries) | Grade a short sentence? — bland, needs a better idea |
| **Lectify** (AI spaced-repetition app) | TBD |
| **Clash of Nations** (in progress; multiplayer grand strategy / base building) | — |
| **Warden** Minecraft mod (shipped on Modrinth) | — |

### Competitions
| Item | Interactive |
|---|---|
| **IOAI 2024 Bronze** + **VOAI national champion** | Hand-tune a linear regression |
| **FTC** — National Champion + Design Award 2024; technical advisor for World Runner-up + Edison Division Champion 2025 | Happy Wheels–style wacky physics: throw a game object to score |
| **BARN Challenge, ICRA 2026** — 1st dynamic sim, 3rd physical | Drive a robot through a maze with limited vision |
| **RoboCup@Home** — perception pipeline, CVAT annotation, LiDAR | Shuffle operation in a point-cloud cleaning pipeline, with simulated (pre-chosen) accuracy/speed |

### Academics
- Undergraduate research under Prof. Yoonchang Sung (embodied AI, task/motion planning).
  RA work: MimicGen / SkillGen / YODO onboarding, robot-manipulation data augmentation
- Coursework context (NTU Data Science and AI, ASEAN Scholarship) — light touch, not a CV dump

### Misc
- Emergence Loop preprint (philosophy of science, Zenodo) + the Jeremy Butterfield reply
- Anything else that doesn't fit cleanly elsewhere

## Hub interaction model

- Each hub is a background "canvas" — **not** a literal coherent space — with hand-placed
  clickable objects, one per achievement
- Objects are **data-driven** (config entry: asset path, position, link target, hover
  effect, label). Adding content later = adding one entry, never restructuring layout
- Consistent hover/pop affordance across all hubs (scale-up + glow/brightness + pointer
  cursor, maybe idle bob) so the pattern is learned once

## Robot behavior & voice

- **Personality:** humorous, "cringe-lite" dad-joke energy. Warm, self-aware, not trying
  to be genuinely clever — just enough to make someone smile
- **Hub-level dialogue:** robot narrates when introducing a hub/section (guided mode only),
  saved as a visible **transcript** underneath so it stays skimmable without sitting
  through the animation
- **Achievement-level reactions:** *not* the same transcript/dialogue pattern. Most get a
  short low-effort reaction line; some get a proper joke if one actually comes to mind.
  The achievement detail text itself is dense and skimmable, never dialogue-styled
- **Typewriter effects** (if used) must be skippable/completable on click. Never force a wait

## Timing & motion principles

- **Scene transitions** (hub-to-hub, intro reveal): flicker-off, then the new scene's light
  source fades up — podium spotlight, library lamp, lab fluorescent, pool glow. May take a
  beat (~0.5–1s). Rare, mood-setting
- **Object interactions:** near-instant (~150–250ms pop/glow). Frequent — must never feel
  like a wait
- **Robot:** full-body + scroll/mouse tracking on the main page only; head-only, pinned
  left, on hub/detail pages

## Art direction

- Soft, wiggly (hand-drawn, not ruler-clean) linework; muted/soft tones; webtoon/gag-comic
  register. **Not** corporate flat vector
- Reference genre: Vietnamese/Korean/Japanese slice-of-life gag webcomics; chibi-adjacent
  proportions; simple dot/line facial features
- **Pipeline:** AI-generate for composition/reference → hand-redraw/trace in the chosen
  style for the final asset. Keeps consistency, avoids the obviously-AI look
- **Nail the style on one piece first — the robot**, since it carries the main page —
  before replicating the visual language across hub scenes and objects

## Stack

- **Vite + vanilla HTML/CSS/JS.** Not React, not Next. Revisit only if a strong reason emerges
- Hosting: Vercel

### Design tokens
| Token | Value |
|---|---|
| background | `#0d0d0f` |
| accent (cyan) | `#00c4a0` |
| body text | `#e8e6e0` |
| card surface | `#2a2a2e` |
| display font | Space Grotesk |
| body font | Inter |

## Explicitly deferred (not v1)
- Dedicated timeline/journey page — revisit once the site is live and gaps are clearer
- Splitting Academics into its own 5th hub if Competitions gets crowded

## Open questions
- Exact wording of the main-page title ("Khiem's personal dimension" or an alternative)
- Whether Competitions and Academics stay separate long-term or merge
- Visual form of the main-page hub teaser object — miniature diorama vs. single icon vs.
  themed doorway
