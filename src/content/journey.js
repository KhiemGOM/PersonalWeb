/**
 * The robot's scroll-driven route across the landing page.
 *
 * Waypoints are viewport-relative (0–1) and keyed to scroll progress, so the path holds
 * its shape at any window size.
 *
 * Progress is a fraction of TOTAL scrollable height, not section count. With N
 * full-viewport sections the scrollable range is (N-1) viewports, so section k is
 * centred in view at progress k/(N-1). The named stops below sit exactly on those
 * values — six sections, so 0, 0.2, 0.4, 0.6, 0.8, 1.0.
 *
 * Adding or removing a landing section changes that divisor and shifts every waypoint.
 * The dev check in ./landing.js catches the mismatch.
 *
 * The x values deliberately alternate sides, and each section's text is aligned opposite
 * its waypoint, so the robot never sits on top of what you are reading.
 *
 * @type {import('../lib/path.js').Waypoint[]}
 */
export const JOURNEY = [
  { progress: 0.0, x: 0.5, y: 0.68, stop: 'intro' },

  { progress: 0.1, x: 0.72, y: 0.6 },
  { progress: 0.2, x: 0.28, y: 0.66, stop: 'projects' },

  { progress: 0.3, x: 0.5, y: 0.58 },
  { progress: 0.4, x: 0.74, y: 0.64, stop: 'academics' },

  { progress: 0.5, x: 0.48, y: 0.56 },
  { progress: 0.6, x: 0.26, y: 0.66, stop: 'competitions' },

  { progress: 0.7, x: 0.52, y: 0.58 },
  { progress: 0.8, x: 0.73, y: 0.64, stop: 'misc' },

  { progress: 0.9, x: 0.44, y: 0.6 },
  { progress: 1.0, x: 0.5, y: 0.66, stop: 'about' },
];
