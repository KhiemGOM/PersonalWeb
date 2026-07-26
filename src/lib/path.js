/**
 * Waypoint interpolation along a normalized path.
 *
 * Salvaged from the previous Next.js build (`lib/scrollPath.ts`) — the math was already
 * pure and framework-free. Used by the main page, where the robot walks a scroll-driven
 * route past the hub teasers.
 *
 * Positions are viewport-relative (0–1) so the path survives any viewport size.
 */

/**
 * @typedef {Object} Waypoint
 * @property {number} progress  Scroll progress 0–1 at which the subject reaches this point
 * @property {number} x         0–1 of viewport width
 * @property {number} y         0–1 of viewport height
 * @property {string} [stop]    Optional named stop (hub teaser, intro mark) reached here
 */

/**
 * Linear interpolation.
 * @param {number} a @param {number} b @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp to a range.
 * @param {number} v @param {number} min @param {number} max
 * @returns {number}
 */
export function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Position along `path` at a given progress.
 *
 * The returned `stop` flips at the midpoint of each segment rather than at its start —
 * that hysteresis is deliberate. It keeps a named stop from strobing while the subject
 * sits near a waypoint boundary, which matters because entering a stop triggers the
 * light dip / relight cycle.
 *
 * @param {number} progress 0–1
 * @param {Waypoint[]} path Waypoints in ascending `progress` order
 * @returns {{ x: number, y: number, stop: string|undefined }}
 */
export function getPositionAtProgress(progress, path) {
  if (!path.length) return { x: 0.5, y: 0.5, stop: undefined };

  const p = clamp(progress);
  let from = path[0];
  let to = path[path.length - 1];

  for (let i = 0; i < path.length - 1; i++) {
    if (p >= path[i].progress && p <= path[i + 1].progress) {
      from = path[i];
      to = path[i + 1];
      break;
    }
  }

  const span = to.progress - from.progress;
  const t = span === 0 ? 0 : (p - from.progress) / span;

  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    stop: t < 0.5 ? from.stop : to.stop,
  };
}

/**
 * Document scroll as 0–1. Guards the zero-height case (short pages, pre-layout).
 * @returns {number}
 */
export function scrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? clamp(window.scrollY / max) : 0;
}

/**
 * Frame-rate-independent damping — the "trails behind" feel.
 *
 * The old build used a raw `lerp(current, target, 0.05)` per frame, which silently ran
 * ~2x faster on a 120Hz display. This normalizes against elapsed time instead.
 *
 * @param {number} current
 * @param {number} target
 * @param {number} smoothing Fraction of remaining distance closed per 16.67ms frame
 * @param {number} dt Milliseconds since last frame
 * @returns {number}
 */
export function damp(current, target, smoothing, dt) {
  const t = 1 - Math.pow(1 - smoothing, dt / 16.67);
  return lerp(current, target, t);
}
