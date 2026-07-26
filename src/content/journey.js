/**
 * The robot's scroll-driven route across the landing page.
 *
 * Waypoints are viewport-relative (0–1) and keyed to scroll progress, so the path holds
 * its shape at any window size.
 *
 * Progress is a fraction of TOTAL scrollable height, not section count. With N
 * full-viewport sections the scrollable range is (N-1) viewports, so section k is centred
 * in view at progress k/(N-1). The named stops below sit exactly on those values — six
 * sections, so 0, 0.2, 0.4, 0.6, 0.8, 1.0.
 *
 * Adding or removing a landing section changes that divisor and shifts every waypoint.
 * The dev check in ./landing.js catches the mismatch.
 *
 * TWO INVARIANTS, both load-bearing:
 *
 * 1. Every y sits inside the robot's floor lane (see --robot-lane in tokens.css). It is
 *    a wheeled vehicle: it drives along the ground rather than floating between blocks
 *    of text. Landing sections reserve that band as bottom padding, which is what keeps
 *    the robot from ever colliding with copy — including on centred sections, where
 *    there is no left/right side to dodge to.
 *
 * 2. The x values alternate sides, and each section's text is aligned opposite its
 *    waypoint, so on wide viewports the robot is not even near the reading column.
 *
 * @type {import('../lib/path.js').Waypoint[]}
 */
export const JOURNEY = [
  { progress: 0.0, x: 0.5, y: 0.83, stop: 'intro' },

  { progress: 0.1, x: 0.72, y: 0.8 },
  { progress: 0.2, x: 0.28, y: 0.82, stop: 'projects' },

  { progress: 0.3, x: 0.5, y: 0.79 },
  { progress: 0.4, x: 0.74, y: 0.82, stop: 'academics' },

  { progress: 0.5, x: 0.48, y: 0.79 },
  { progress: 0.6, x: 0.26, y: 0.82, stop: 'competitions' },

  { progress: 0.7, x: 0.52, y: 0.79 },
  { progress: 0.8, x: 0.73, y: 0.82, stop: 'misc' },

  { progress: 0.9, x: 0.44, y: 0.8 },
  { progress: 1.0, x: 0.5, y: 0.83, stop: 'about' },
];
