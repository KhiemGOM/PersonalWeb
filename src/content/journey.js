/**
 * The robot's scroll-driven route across the landing page.
 *
 * Waypoints are viewport-relative (0–1) and keyed to scroll progress. Named stops sit at
 * k/(N-1) for N landing sections, which is where section k is centred in view; the dev
 * check in ./landing.js enforces it.
 *
 * ---------------------------------------------------------------------------
 * WHY Y IS FLAT AT MID-HEIGHT
 *
 * The robot rides at 0.5, level with the copy, so it has equal room above and below.
 * An earlier version parked it low, in a reserved floor lane at 0.82. That left ~615px
 * of viewport above it and only ~125px below, and the consequence was not cosmetic:
 * trailing while scrolling down stayed comfortably on screen, while the identical trail
 * scrolling up dropped it off the bottom edge in under half a second. Reversing was not
 * slower — measured, it was the same speed to within 0.2px/s — it was simply invisible,
 * and it needed asymmetric acceleration and leash constants to paper over. Centring
 * removes the cause, so those constants are gone.
 *
 * WHY THE X VALUES LOOK REPETITIVE
 *
 * The robot is anchored in the document, so it descends past every section's text at
 * some point. No y avoids them — clearance has to be horizontal:
 *
 *     while descending past a block of text, be on that block's free side;
 *     change sides only in the gaps between blocks.
 *
 * So each x is held flat alongside a text block and moves only during a gap. Crossing at
 * the midpoint between stops — the obvious choice — puts the sideways move at exactly the
 * document height where the next section's text sits, and the path ploughs through all
 * five of them.
 *
 * Intro and About are centred copy, so they have no free side in the usual sense; the
 * robot has to sit right out at the margin to clear them.
 *
 * Verify with the inspector (Shift+D, or ?debug=path) after any change here or to
 * section copy — the safe windows move with the layout.
 * ---------------------------------------------------------------------------
 *
 * @type {import('../lib/path.js').Waypoint[]}
 */
export const JOURNEY = [
  // Measured windows during which the robot is level with each block of text, and so
  // must already be clear of it. Crossings happen only in the gaps between them.
  //   intro 0.00–0.05      projects 0.12–0.21   academics 0.28–0.38
  //   competitions 0.45–0.55   misc 0.62–0.71   experience 0.79–0.88
  //   about 0.96–1.00
  //
  // Seven stops now, not six — adding 'experience' pushed every existing stop's progress
  // down by 5/6 (k/5 on a 6-stop page becomes k/6 on a 7-stop one; see ./landing.js's dev
  // check). Everything through 'misc' is otherwise untouched: appending sections after it
  // doesn't move where any earlier stop sits in the document, so the geometry already
  // verified collision-free there still is — only the labels changed.
  //
  // 'experience' is right-aligned copy (continuing the hubs' alternation rather than
  // dropping out of it), so unlike 'about' it needs the opposite-side treatment: x=0.2,
  // crossed to from misc's x=0.8 in the gap after misc's window, then crossed back out to
  // 0.87 — 'about' is centred, same margin as 'intro' — in the gap before about's.

  { progress: 0.0, x: 0.87, y: 0.5, stop: 'intro' },
  { progress: 0.05, x: 0.87, y: 0.5 },

  { progress: 0.121, x: 0.2, y: 0.5 },
  { progress: 0.167, x: 0.2, y: 0.5, stop: 'projects' },
  { progress: 0.208, x: 0.2, y: 0.5 },

  { progress: 0.283, x: 0.8, y: 0.5 },
  { progress: 0.333, x: 0.8, y: 0.5, stop: 'academics' },
  { progress: 0.379, x: 0.8, y: 0.5 },

  { progress: 0.446, x: 0.2, y: 0.5 },
  { progress: 0.5, x: 0.2, y: 0.5, stop: 'competitions' },
  { progress: 0.55, x: 0.2, y: 0.5 },

  { progress: 0.621, x: 0.8, y: 0.5 },
  { progress: 0.667, x: 0.8, y: 0.5, stop: 'misc' },
  { progress: 0.708, x: 0.8, y: 0.5 },

  { progress: 0.787, x: 0.2, y: 0.5 },
  { progress: 0.833, x: 0.2, y: 0.5, stop: 'experience' },
  { progress: 0.875, x: 0.2, y: 0.5 },

  { progress: 0.955, x: 0.87, y: 0.5 },
  { progress: 1.0, x: 0.87, y: 0.5, stop: 'about' },
];
