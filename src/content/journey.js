/**
 * The robot's scroll-driven route across the landing page.
 *
 * Waypoints are viewport-relative (0–1) and keyed to scroll progress.
 *
 * Progress is a fraction of TOTAL scrollable height, not section count. With N
 * full-viewport sections the scrollable range is (N-1) viewports, so section k is centred
 * in view at progress k/(N-1). The named stops sit exactly on those values — six
 * sections, so 0, 0.2, 0.4, 0.6, 0.8, 1.0. The dev check in ./landing.js enforces it.
 *
 * ---------------------------------------------------------------------------
 * WHY THE X VALUES LOOK REPETITIVE — read before editing
 *
 * The robot is anchored in the document, so its world position descends steadily as you
 * scroll. Over the length of the page it therefore passes DOWN THROUGH every section's
 * text at some point; there is no y value that avoids them. Vertical clearance is not
 * available, so the path has to solve the problem horizontally:
 *
 *     while descending past a block of text, be on that block's free side;
 *     change sides only in the gaps between blocks.
 *
 * The previous version placed a waypoint halfway between each pair of stops with an x
 * near the centre. That put the sideways crossing at exactly the document height where
 * the next section's text sits, and the path ploughed through all five of them.
 *
 * So each x below is held flat across a text block and only moves during a gap. The
 * measured windows, at the current type sizes, are:
 *
 *     projects       p 0.07–0.17   text right  -> robot left
 *     academics      p 0.26–0.38   text left   -> robot right
 *     competitions   p 0.46–0.58   text right  -> robot left
 *     misc           p 0.67–0.77   text left   -> robot right
 *     about          p 0.87–0.97   text centre -> robot far right
 *
 * The gaps between those windows are the only safe places to cross, which is why the
 * transitions sit at 0.05, 0.25, 0.44, 0.64 and 0.84.
 *
 * These windows shift if section copy gets longer or the type scale changes. The
 * collision check in ./landing.js recomputes them from the live DOM and will say so.
 * ---------------------------------------------------------------------------
 *
 * The y values stay flat, in the floor lane (see --robot-lane in tokens.css). Varying
 * them makes the world position advance unevenly against scroll, which reads as the robot
 * lurching — slow, then hurrying to catch up.
 *
 * @type {import('../lib/path.js').Waypoint[]}
 */
export const JOURNEY = [
  { progress: 0.0, x: 0.5, y: 0.82, stop: 'intro' },

  // Cross left before entering the projects text band at 0.07.
  { progress: 0.05, x: 0.2, y: 0.81 },
  { progress: 0.2, x: 0.2, y: 0.82, stop: 'projects' },

  // Gap at 0.17–0.26: cross right for academics.
  { progress: 0.25, x: 0.8, y: 0.81 },
  { progress: 0.4, x: 0.8, y: 0.82, stop: 'academics' },

  // Gap at 0.38–0.46: cross left for competitions.
  { progress: 0.44, x: 0.2, y: 0.81 },
  { progress: 0.6, x: 0.2, y: 0.82, stop: 'competitions' },

  // Gap at 0.58–0.67: cross right for misc.
  { progress: 0.64, x: 0.8, y: 0.81 },
  { progress: 0.8, x: 0.8, y: 0.82, stop: 'misc' },

  // Gap at 0.77–0.87: shift further right — About is centred, so it needs more
  // clearance than a side-aligned section does.
  { progress: 0.84, x: 0.87, y: 0.81 },
  { progress: 1.0, x: 0.87, y: 0.82, stop: 'about' },
];
