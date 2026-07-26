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
import { applyTint, fitCanvas, glowCone, punchCone, punchRadial } from '../lib/lighting.js';
import { damp, lerp } from '../lib/path.js';

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

/**
 * The robot's own lamp, in px.
 *
 * The robot sits under the darkness like everything else, so this is the only thing
 * keeping it legible when it is nowhere near the spotlight. Sized to cover the rig
 * (150x143) with falloff to spare, so it reads as a machine carrying a light rather than
 * a machine with a hole cut around it.
 */
const SOURCE_GLOW = 168;

/**
 * The lamp during the opening, before the room exists. Tight enough to be two lenses in
 * the void rather than a circle of visible floor.
 */
const SOURCE_GLOW_INTRO = 70;

/** How quickly the spotlight slides when the subject changes. Fraction per 60Hz frame. */
const FOCUS_SMOOTHING = 0.06;

/** Half-angle of the eye cone, radians. */
const CONE_SPREAD = 0.3;

/**
 * How far the beam throws, in px. FIXED — the cursor sets its direction and nothing else.
 *
 * It used to reach to wherever the cursor was, which meant a pointer on the far side of
 * the page produced a beam over a thousand pixels long. Its falloff had barely started by
 * the screen edge, so it filled a third of the view as a flat slab, and it grew and shrank
 * as the mouse moved — a torch whose throw depends on what you are pointing it at.
 */
const BEAM_LENGTH = 430;

/** Gradient start, so the beam has no hot spot sitting on the robot's own face. */
const BEAM_INNER = 30;

/**
 * Colour of the beam itself.
 *
 * Warm, and deliberately not white. Everything else in the scene is cool — a cyan accent,
 * a near-white type colour, cool dots — so a white torch had nothing to distinguish it and
 * read as a wash rather than a light with a source. Warm against that cool field also
 * reads as a lamp being carried, which is what it is.
 *
 * It sits opposite the cyan floor specks on the colour wheel, so they hold their own under
 * it instead of dissolving the way white-on-white did.
 *
 * Not the room tint: a torch belongs to the machine carrying it and stays the same
 * wherever it stands. Tinting it per hub would make it a property of the room.
 */
const BEAM_COLOR = '#ffd79a';

/**
 * How hard the beam adds light on top of what it has already uncovered.
 *
 * Kept low. Two earlier attempts were too strong: stacking five wedges under `lighter`
 * saturated the core to 243 of 255, and even the single-wedge version at 0.52 read as
 * glare rather than illumination. A torch bright enough to blow out what it is pointed at
 * defeats itself — the whole job is revealing the texture underneath, not replacing it.
 */
const BEAM_GLOW = 0.26;

/** Blur radius on the beam, in px. What keeps the wedge from reading as a polygon. */
const BEAM_FEATHER = 46;

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

  // Where the spotlight actually is, damped toward wherever it has been asked to point.
  // Sliding rather than cutting: the subject changes as you scroll, and a pool that
  // teleported between paragraphs would read as a fault rather than a light being aimed.
  let focusX = width / 2;
  let focusY = height / 2;
  let focusRadius = Math.min(width, height) * 0.4;
  let focusInitialised = false;

  function resize() {
    ({ width, height } = fitCanvas(canvas, ctx));
  }

  /**
   * The beam, as pure geometry. Both passes take it from here so they cannot describe
   * different cones — the direction is the only thing the cursor contributes.
   *
   * @param {{ x: number, y: number }} source
   */
  function beamGeometry(source) {
    return {
      x: source.x,
      y: source.y,
      angle: Math.atan2(mouseY - source.y, mouseX - source.x),
      length: BEAM_LENGTH,
      spread: CONE_SPREAD,
      inner: BEAM_INNER,
      feather: BEAM_FEATHER,
    };
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
   * @param {{ head: { x: number, y: number }, centre: { x: number, y: number } }} robot
   *   The cone is cast from the lenses; the lamp hangs off the machine as a whole. Using
   *   the head for both leaves the chassis below it unlit.
   * @param {{ x: number, y: number, radius: number } | null} target
   *   What the spotlight is aimed at — the copy being read, not the robot. The robot is
   *   deliberately kept away from the text by the path, so a pool centred on it lights
   *   empty margin and leaves the words dim. It carries the light; the light falls on
   *   what matters.
   */
  function step(dt, robot, target) {
    const source = robot.head;
    const centre = robot.centre ?? robot.head;

    // The lamp hangs midway between the lenses and the chassis centre. Either end alone
    // leaves the other in the dark: on the head the wheels vanish and it reads as a
    // floating face; on the chassis the lenses go dim, which is worse, since they are
    // both the face and ostensibly the source of the light.
    const lamp = { x: (source.x + centre.x) / 2, y: (source.y + centre.y) / 2 };
    elapsed += dt;
    const { darkness, ambient, eyeGlow, cone } = stage();

    if (target) {
      if (!focusInitialised) {
        // Do not glide in from the middle of nowhere on the first frame.
        focusX = target.x;
        focusY = target.y;
        focusRadius = target.radius;
        focusInitialised = true;
      } else {
        focusX = damp(focusX, target.x, FOCUS_SMOOTHING, dt);
        focusY = damp(focusY, target.y, FOCUS_SMOOTHING, dt);
        focusRadius = damp(focusRadius, target.radius, FOCUS_SMOOTHING, dt);
      }
    }

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = `rgba(13, 13, 15, ${darkness})`;
    ctx.fillRect(0, 0, width, height);

    // Holes. Everything in this block subtracts from the darkness above.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    // The spotlight, on the subject.
    if (ambient > 0) {
      punchRadial(ctx, {
        x: focusX,
        y: focusY,
        radius: focusRadius,
        intensity: ambient,
        softness: 0.5,
      });
    }

    if (cone > 0) {
      punchCone(ctx, { ...beamGeometry(source), intensity: cone });
    }

    // The robot's own lamp. This is the whole of what is visible during the opening, and
    // afterwards it is what keeps the robot readable when it wanders away from the
    // spotlight — it is under the darkness like everything else, so without this it would
    // simply disappear into it.
    //
    // Widens as the room resolves: a tight circle during the opening keeps it to two
    // lenses in the void rather than a disc of lit floor.
    if (eyeGlow > 0) {
      // Centred on the lenses during the opening, when there is no chassis to light, and
      // sliding down onto the machine as it resolves.
      punchRadial(ctx, {
        x: lerp(source.x, lamp.x, ambient),
        y: lerp(source.y, lamp.y, ambient),
        radius: lerp(SOURCE_GLOW_INTRO, SOURCE_GLOW, ambient) * eyeGlow,
        intensity: eyeGlow,
        softness: 0.5,
      });
    }

    ctx.restore();

    // The beam, added on top of what it uncovered. Subtracting darkness can only reach
    // "not dark" — the page underneath is the ceiling, so on its own the torch reads as a
    // slightly-less-dim patch. This puts light onto the scene, which is what makes it
    // look like a beam rather than a hole.
    if (cone > 0) {
      glowCone(ctx, {
        ...beamGeometry(source),
        color: BEAM_COLOR,
        alpha: BEAM_GLOW,
        intensity: cone,
      });
    }

    // Colour wash over the lit area, so each room reads warm or cool.
    if (ambient > 0) {
      applyTint(ctx, width, height, {
        x: focusX,
        y: focusY,
        radius: focusRadius * 0.9,
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

    debug: () => ({
      elapsed: Math.round(elapsed),
      ...stage(),
      tint,
      focus: { x: Math.round(focusX), y: Math.round(focusY), radius: Math.round(focusRadius) },
    }),
  };
}
