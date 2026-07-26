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
 * Tangents for monotone cubic interpolation (Fritsch–Carlson), cached per path.
 *
 * Plain Catmull-Rom would be the obvious smoothing choice, but it overshoots around
 * corners — and on this path an overshoot swings the robot sideways past a waypoint,
 * straight back into the text that waypoint was positioned to avoid. The monotone
 * limiter forbids that: the curve never leaves the range of the values bracketing it.
 *
 * It also flattens the tangent at local extrema, which is exactly right here. Where two
 * consecutive waypoints share an x — the deliberate flat runs alongside a block of text —
 * the interpolated curve stays exactly flat rather than bulging.
 *
 * @type {WeakMap<Waypoint[], { x: number[], y: number[] }>}
 */
const tangentCache = new WeakMap();

/**
 * @param {Waypoint[]} path
 * @param {'x' | 'y'} key
 * @returns {number[]}
 */
function tangentsFor(path, key) {
  const n = path.length;
  const t = path.map((w) => w.progress);
  const v = path.map((w) => w[key]);

  /** Secant slopes between consecutive waypoints. */
  const secant = [];
  for (let i = 0; i < n - 1; i++) {
    const span = t[i + 1] - t[i];
    secant[i] = span === 0 ? 0 : (v[i + 1] - v[i]) / span;
  }

  const m = new Array(n);
  m[0] = secant[0] ?? 0;
  m[n - 1] = secant[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) {
    // Sign change means a local extremum: flatten, so the curve cannot overshoot it.
    m[i] = secant[i - 1] * secant[i] <= 0 ? 0 : (secant[i - 1] + secant[i]) / 2;
  }

  // Fritsch–Carlson limiter: keep each tangent inside the circle of radius 3 around the
  // secant, which is the condition for the segment to stay monotone.
  for (let i = 0; i < n - 1; i++) {
    if (secant[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / secant[i];
    const b = m[i + 1] / secant[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * secant[i];
      m[i + 1] = tau * b * secant[i];
    }
  }
  return m;
}

/** @param {Waypoint[]} path */
function tangents(path) {
  let cached = tangentCache.get(path);
  if (!cached) {
    cached = { x: tangentsFor(path, 'x'), y: tangentsFor(path, 'y') };
    tangentCache.set(path, cached);
  }
  return cached;
}

/**
 * Cubic Hermite basis evaluation on one segment.
 * @param {number} v0 @param {number} v1 @param {number} m0 @param {number} m1
 * @param {number} span @param {number} s normalized 0–1 within the segment
 */
function hermite(v0, v1, m0, m1, span, s) {
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * v0 +
    (s3 - 2 * s2 + s) * span * m0 +
    (-2 * s3 + 3 * s2) * v1 +
    (s3 - s2) * span * m1
  );
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
  let index = 0;
  for (let i = 0; i < path.length - 1; i++) {
    if (p >= path[i].progress && p <= path[i + 1].progress) {
      index = i;
      break;
    }
    if (p > path[i + 1].progress) index = i;
  }

  const from = path[index];
  const to = path[index + 1] ?? from;

  const span = to.progress - from.progress;
  const t = span === 0 ? 0 : (p - from.progress) / span;

  const m = tangents(path);

  return {
    x: hermite(from.x, to.x, m.x[index], m.x[index + 1] ?? m.x[index], span, t),
    y: hermite(from.y, to.y, m.y[index], m.y[index + 1] ?? m.y[index], span, t),
    stop: t < 0.5 ? from.stop : to.stop,
  };
}

/**
 * How fast world position changes per unit of progress, in the units of `scale`.
 *
 * Needed to enforce a speed limit that means anything. Capping progress-per-second caps
 * the wrong quantity: progress is just a parameter, so on a stretch where the path also
 * moves sideways the robot covers noticeably more ground per unit progress than on a
 * straight vertical run. The result is a machine whose top speed depends on the slope of
 * the line it happens to be on.
 *
 * Measured by sampling either side of `p` rather than differentiating the spline, which
 * keeps this correct if the interpolation changes again.
 *
 * @param {number} p
 * @param {Waypoint[]} path
 * @param {{ x: number, y: number }} scale  World size of one unit of x and y
 * @param {number} [dyOverDp]  World y added per unit progress by scrolling itself
 * @returns {number} world units per unit progress
 */
export function speedPerProgress(p, path, scale, dyOverDp = 0) {
  const h = 0.001;
  const a = getPositionAtProgress(clamp(p - h), path);
  const b = getPositionAtProgress(clamp(p + h), path);
  const dp = clamp(p + h) - clamp(p - h) || h;

  const dx = ((b.x - a.x) * scale.x) / dp;
  const dy = ((b.y - a.y) * scale.y) / dp + dyOverDp;

  return Math.hypot(dx, dy);
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
