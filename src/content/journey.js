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
  //   intro 0.00–0.06   projects 0.15–0.25   academics 0.34–0.46
  //   competitions 0.54–0.66   misc 0.75–0.85   about 0.95–1.00

  { progress: 0.0, x: 0.87, y: 0.5, stop: 'intro' },
  { progress: 0.06, x: 0.87, y: 0.5 },

  { progress: 0.145, x: 0.2, y: 0.5 },
  { progress: 0.2, x: 0.2, y: 0.5, stop: 'projects' },
  { progress: 0.25, x: 0.2, y: 0.5 },

  { progress: 0.34, x: 0.8, y: 0.5 },
  { progress: 0.4, x: 0.8, y: 0.5, stop: 'academics' },
  { progress: 0.455, x: 0.8, y: 0.5 },

  { progress: 0.535, x: 0.2, y: 0.5 },
  { progress: 0.6, x: 0.2, y: 0.5, stop: 'competitions' },
  { progress: 0.66, x: 0.2, y: 0.5 },

  { progress: 0.745, x: 0.8, y: 0.5 },
  { progress: 0.8, x: 0.8, y: 0.5, stop: 'misc' },
  { progress: 0.85, x: 0.8, y: 0.5 },

  { progress: 0.945, x: 0.87, y: 0.5 },
  { progress: 1.0, x: 0.87, y: 0.5, stop: 'about' },
];
