/**
 * The robot's scroll-driven route across the landing page.
 *
 * Waypoints are viewport-relative (0–1) and keyed to scroll progress, so the path holds
 * its shape at any window size. `stop` names the teaser the robot is standing at, which
 * later drives which hub the narrator introduces.
 *
 * Progress values are fractions of TOTAL page height, not section count — adding a
 * section to the landing page shifts every waypoint after it.
 *
 * @type {import('../lib/path.js').Waypoint[]}
 */
export const JOURNEY = [
  { progress: 0.0, x: 0.5, y: 0.58, stop: 'intro' },
  { progress: 0.14, x: 0.68, y: 0.54 },
  { progress: 0.28, x: 0.3, y: 0.56, stop: 'projects' },
  { progress: 0.46, x: 0.66, y: 0.5, stop: 'academics' },
  { progress: 0.64, x: 0.32, y: 0.54, stop: 'competitions' },
  { progress: 0.82, x: 0.62, y: 0.52, stop: 'misc' },
  { progress: 1.0, x: 0.5, y: 0.5, stop: 'about' },
];
