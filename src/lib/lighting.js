/**
 * Canvas light compositing — dark everywhere, holes punched where light falls.
 *
 * Salvaged from the previous Next.js build (`lib/lighting.ts`). The technique survives the
 * art-direction change even though the palette does not: fill a dark overlay, then use
 * `destination-out` gradients to erase it wherever a light source reaches.
 *
 * CANDIDATE FOR REPLACEMENT — hub scenes may end up lit with CSS radial gradients over
 * hand-drawn art instead, which would be cheaper and easier to art-direct. Decide during
 * Phase 1 step 7 (transitions). Kept because the main page's robot light pool still wants
 * real compositing, and rewriting this from scratch would be wasted effort.
 */

import { clamp } from './path.js';

/**
 * @typedef {Object} LightSource
 * @property {number} x        Canvas pixels
 * @property {number} y        Canvas pixels
 * @property {number} radius   Canvas pixels
 * @property {number} [intensity]  0–1, default 1
 * @property {number} [softness]   0–1 midpoint falloff, default 0.5
 */

/**
 * Fill the frame with void, then erase where each light lands.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w @param {number} h
 * @param {LightSource[]} lights
 * @param {Object} [opts]
 * @param {string} [opts.void='13, 13, 15']  rgb components of the background token
 * @param {number} [opts.darkness=0.92]      overlay alpha; 1 = pitch black outside light
 */
export function drawLightMask(ctx, w, h, lights, opts = {}) {
  const { void: voidRgb = '13, 13, 15', darkness = 0.92 } = opts;

  ctx.fillStyle = `rgba(${voidRgb}, ${darkness})`;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (const light of lights) punchRadial(ctx, light);
  ctx.restore();
}

/**
 * Erase a soft circular hole in whatever is already drawn.
 * Caller owns the composite mode.
 * @param {CanvasRenderingContext2D} ctx
 * @param {LightSource} light
 */
export function punchRadial(ctx, light) {
  const { x, y, radius, intensity = 1, softness = 0.5 } = light;
  if (radius <= 0 || intensity <= 0) return;

  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(255,255,255,${0.88 * intensity})`);
  g.addColorStop(clamp(softness, 0.01, 0.99), `rgba(255,255,255,${0.45 * intensity})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Erase a cone — a beam from an origin toward a target.
 * Caller owns the composite mode.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} beam
 * @param {number} beam.x @param {number} beam.y   Origin, canvas pixels
 * @param {number} beam.targetX @param {number} beam.targetY
 * @param {number} [beam.spread=0.28]   Half-angle in radians
 * @param {number} [beam.overshoot=80]  Pixels past the target
 * @param {number} [beam.intensity=1]
 */
export function punchCone(ctx, beam) {
  const { intensity = 1 } = beam;
  if (intensity <= 0) return;

  withConePath(ctx, beam, (length) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, length);
    // Clears the darkness outright near the lens rather than merely thinning it — a
    // flashlight whose brightest point is still half-dark does not read as a beam.
    g.addColorStop(0, `rgba(255,255,255,${1 * intensity})`);
    g.addColorStop(0.4, `rgba(255,255,255,${0.82 * intensity})`);
    g.addColorStop(0.78, `rgba(255,255,255,${0.34 * intensity})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fill();
  });
}

/**
 * Add light in the shape of the beam, rather than subtracting darkness.
 *
 * Punching alone can only ever reach "not dark" — the page underneath is the ceiling. A
 * beam you are meant to notice has to put light ON the scene, so this draws the same cone
 * again in `lighter`, which is what turns a clearing into something that visibly glows.
 *
 * Draw AFTER the mask; it is a source-over-family operation and would be erased by any
 * subsequent destination-out.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} beam  Same geometry as punchCone
 * @param {string} beam.color
 * @param {number} [beam.alpha]
 */
export function glowCone(ctx, beam) {
  const { color, alpha = 0.3, intensity = 1 } = beam;
  if (intensity <= 0 || alpha <= 0) return;

  withConePath(ctx, beam, (length) => {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * intensity;

    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, length);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fill();
  });
}

/**
 * Set up the cone's transform and path, run `draw`, and clean up. Shared so the punch and
 * the glow cannot drift apart — they have to describe the same beam or the lit area and
 * the glowing area stop lining up.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {any} beam
 * @param {(length: number) => void} draw
 */
function withConePath(ctx, beam, draw) {
  const { x, y, targetX, targetY, spread = 0.28, overshoot = 80 } = beam;

  const angle = Math.atan2(targetY - y, targetX - x);
  const length = Math.hypot(targetX - x, targetY - y) + overshoot;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, length, -spread, spread);
  ctx.closePath();
  draw(length);
  ctx.restore();
}

/**
 * Wash the lit area in a scene's accent. Draw after the mask, in `source-over`.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w @param {number} h
 * @param {Object} tint
 * @param {number} tint.x @param {number} tint.y @param {number} tint.radius
 * @param {string} tint.color      Any CSS color the canvas can parse
 * @param {number} [tint.alpha=0.08]
 */
export function applyTint(ctx, w, h, tint) {
  const { x, y, radius, color, alpha = 0.08 } = tint;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = alpha;

  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Size a canvas for the current viewport at device pixel ratio.
 * The old build skipped this, which is why it was blurry on HiDPI screens.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @returns {{ width: number, height: number }} CSS-pixel dimensions
 */
export function fitCanvas(canvas, ctx) {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { width, height };
}
