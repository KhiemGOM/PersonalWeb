/**
 * The light.
 *
 * A full-viewport canvas of darkness with holes punched through it, sitting above the
 * page content and below the robot. Two sources:
 *
 *   ambient — a pool around the robot, which is what makes the current section readable
 *   cone    — a beam from the camera lenses toward the cursor
 *
 * Canvas rather than CSS gradients. The cone has to be subtracted from the darkness at an
 * arbitrary angle and blended with the ambient pool where they overlap, which is one
 * `destination-out` fill here and a pile of masks and blend modes in CSS.
 *
 * The opening sequence runs on the same clock: black, then the lenses, then the spotlight
 * opens out. It is a timeline rather than a chain of callbacks so it can be stepped
 * deterministically and cannot get stuck half-finished.
 */

import { el } from '../lib/dom.js';
import { applyTint, fitCanvas, punchCone, punchRadial } from '../lib/lighting.js';
import { clamp, lerp } from '../lib/path.js';

/**
 * Opening sequence, in milliseconds from load. Each entry is the moment that phase ends.
 * Deliberately brisk — this plays before anything can be read, so it is a held breath,
 * not a title card.
 */
const CUE = {
  /** Total black. Nothing but the void. */
  black: 400,
  /** The lenses come up, alone. */
  eyes: 1500,
  /** The spotlight opens and the room resolves. */
  spotlight: 2700,
};

/** Resting darkness. 1 would be pitch black; a little leak keeps shapes legible. */
const DARKNESS = 0.9;

/** Ambient pool radius as a fraction of the smaller viewport dimension. */
const AMBIENT_RADIUS = 0.52;

/** Half-angle of the eye cone, radians. */
const CONE_SPREAD = 0.3;

/** @param {number} t 0–1 */
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * @param {Object} config
 * @param {HTMLElement} config.root
 */
export function createLighting(config) {
  const { root } = config;

  const canvas = el('canvas', { className: 'lighting__canvas', 'aria-hidden': 'true' });
  root.appendChild(canvas);

  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

  let width = window.innerWidth;
  let height = window.innerHeight;
  let elapsed = 0;

  // Cursor drives the cone. Centred to start so the beam is not jammed into a corner
  // before the pointer has moved — and on touch, where it never will.
  let mouseX = width / 2;
  let mouseY = height / 2;

  /** Accent the lit area is tinted with. Set per hub. */
  let tint = '#00c4a0';

  function resize() {
    ({ width, height } = fitCanvas(canvas, ctx));
  }

  /** @param {PointerEvent} event */
  function onPointerMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  /**
   * Where the opening sequence has got to. Returned rather than stored so the draw below
   * stays a pure function of elapsed time.
   */
  function stage() {
    if (elapsed < CUE.black) {
      return { darkness: 1, ambient: 0, eyeGlow: 0, cone: 0 };
    }

    if (elapsed < CUE.eyes) {
      // Lenses only. The darkness stays total; what appears is the glow itself.
      const t = easeOut((elapsed - CUE.black) / (CUE.eyes - CUE.black));
      return { darkness: 1, ambient: 0, eyeGlow: t, cone: 0 };
    }

    if (elapsed < CUE.spotlight) {
      // The spotlight opens out from the robot and the room resolves around it.
      const t = easeOut((elapsed - CUE.eyes) / (CUE.spotlight - CUE.eyes));
      return { darkness: lerp(1, DARKNESS, t), ambient: t, eyeGlow: 1, cone: t };
    }

    return { darkness: DARKNESS, ambient: 1, eyeGlow: 1, cone: 1 };
  }

  /**
   * @param {number} dt milliseconds
   * @param {{ x: number, y: number }} source  The robot's camera head, in screen px
   */
  function step(dt, source) {
    elapsed += dt;
    const { darkness, ambient, eyeGlow, cone } = stage();

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = `rgba(13, 13, 15, ${darkness})`;
    ctx.fillRect(0, 0, width, height);

    // Holes. Everything in this block subtracts from the darkness above.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    if (ambient > 0) {
      punchRadial(ctx, {
        x: source.x,
        y: source.y,
        radius: Math.min(width, height) * AMBIENT_RADIUS,
        intensity: ambient,
        softness: 0.42,
      });
    }

    if (cone > 0) {
      punchCone(ctx, {
        x: source.x,
        y: source.y,
        targetX: mouseX,
        targetY: mouseY,
        spread: CONE_SPREAD,
        intensity: cone * 0.85,
      });
    }

    // A small hard clearing at the lenses themselves, so the robot is never swallowed by
    // its own darkness — this is what is visible during the opening, before the ambient
    // pool exists at all.
    if (eyeGlow > 0) {
      punchRadial(ctx, {
        x: source.x,
        y: source.y,
        radius: 74 * eyeGlow,
        intensity: eyeGlow,
        softness: 0.3,
      });
    }

    ctx.restore();

    // Colour wash over the lit area, so each room reads warm or cool.
    if (ambient > 0) {
      applyTint(ctx, width, height, {
        x: source.x,
        y: source.y,
        radius: Math.min(width, height) * 0.4,
        color: tint,
        alpha: 0.1 * ambient,
      });
    }
  }

  return {
    element: canvas,
    step,

    /** @param {string} color */
    setTint(color) {
      if (color) tint = color.trim();
    },

    /** Skip the opening — used when the visitor has already seen it this session. */
    finishIntro() {
      elapsed = Math.max(elapsed, CUE.spotlight);
    },

    isIntroDone: () => elapsed >= CUE.spotlight,

    /** @returns {'black' | 'eyes' | 'spotlight' | 'live'} */
    phase() {
      if (elapsed < CUE.black) return 'black';
      if (elapsed < CUE.eyes) return 'eyes';
      if (elapsed < CUE.spotlight) return 'spotlight';
      return 'live';
    },

    destroy() {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.remove();
    },

    debug: () => ({ elapsed: Math.round(elapsed), ...stage(), tint }),
  };
}
