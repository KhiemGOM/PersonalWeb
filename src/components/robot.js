/**
 * The robot companion.
 *
 * A single persistent instance mounted into #robot-layer and never re-created — it lives
 * outside the region the router swaps, so it survives navigation. Creating a second one
 * is always a bug.
 *
 * Two moving parts, because that is all there are: a body and a head. The head is a
 * separate layer so it can be shown alone, which is what hub pages need.
 *
 * Two modes:
 *   'full' — whole robot, walking a scroll-driven path. Landing page only.
 *   'head' — head only, pinned to the left edge. Every other page.
 *
 * DEBUG RIG: the shapes below are placeholders standing in for hand-drawn art. Only the
 * two <svg> blocks are throwaway — the motion, damping, and mode logic outlive them.
 */

import { el } from '../lib/dom.js';
import { clamp, damp, getPositionAtProgress, scrollProgress } from '../lib/path.js';
import { JOURNEY } from '../content/journey.js';

/** @typedef {'full' | 'head'} RobotMode */

/** How far the head shifts toward the cursor, in px, at full deflection. */
const LOOK_SHIFT = 7;

/** Maximum head tilt in degrees. Heads lean; they do not spin. */
const MAX_TILT = 12;

/** Cursor distance at which looking is fully deflected. */
const LOOK_RANGE = 420;

/** Fraction of remaining distance closed per 60Hz frame. Lower = more trailing lag. */
const BODY_SMOOTHING = 0.055;
const HEAD_SMOOTHING = 0.11;

/** Where the head sits in 'head' mode, pinned against the left edge. */
const PINNED_X = 78;

/** Below this delta, skip the DOM write — avoids thrashing style on sub-pixel jitter. */
const EPSILON = 0.01;

function bodyArt() {
  return el('div', {
    className: 'robot__body',
    'aria-hidden': 'true',
    innerHTML: `
      <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 34 H88 L94 104 H26 Z" class="robot__shape" />
        <rect x="48" y="56" width="24" height="16" rx="4" class="robot__detail" />
        <path d="M26 104 L30 142" class="robot__limb" />
        <path d="M94 104 L90 142" class="robot__limb" />
        <path d="M32 46 L10 88" class="robot__limb" />
        <path d="M88 46 L110 88" class="robot__limb" />
      </svg>`,
  });
}

function headArt() {
  return el('div', {
    className: 'robot__head',
    'aria-hidden': 'true',
    innerHTML: `
      <svg viewBox="0 0 100 92" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="16" width="76" height="64" rx="20" class="robot__shape" />
        <circle cx="38" cy="48" r="6" class="robot__eye" />
        <circle cx="64" cy="48" r="6" class="robot__eye" />
        <path d="M50 16 V4" class="robot__limb" />
        <circle cx="50" cy="4" r="4" class="robot__detail" />
      </svg>`,
  });
}

/**
 * @param {Object} config
 * @param {HTMLElement} config.layer  #robot-layer
 * @returns {{
 *   element: HTMLElement,
 *   setMode: (mode: RobotMode) => void,
 *   getMode: () => RobotMode,
 *   destroy: () => void,
 *   debug: () => object
 * }}
 */
export function createRobot(config) {
  const { layer } = config;

  const head = headArt();
  const body = bodyArt();
  const rig = el('div', { className: 'robot__rig' }, body, head);
  const element = el('div', { className: 'robot', dataset: { mode: 'full' } }, rig);

  layer.appendChild(element);

  /** @type {RobotMode} */
  let mode = 'full';

  let width = window.innerWidth;
  let height = window.innerHeight;

  // Cursor starts centred rather than at (0,0), so the robot isn't staring into the
  // top-left corner before the pointer has ever moved.
  let mouseX = width / 2;
  let mouseY = height / 2;

  // Current (damped) values; targets are recomputed each frame.
  let x = width / 2;
  let y = height * 0.58;
  let lookX = 0;
  let lookY = 0;

  // Infinity, not NaN: every comparison against NaN is false, so a NaN seed would make
  // the dirty-checks below never fire and the CSS variables never get written at all —
  // the internal state would advance while the robot sat frozen on screen.
  let lastX = Infinity;
  let lastY = Infinity;
  let lastLookX = Infinity;
  let lastLookY = Infinity;

  let frame = 0;
  let lastTime = performance.now();

  function onResize() {
    width = window.innerWidth;
    height = window.innerHeight;
  }

  /** @param {PointerEvent} event */
  function onPointerMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
  }

  /** Where the rig wants to be, in viewport pixels. */
  function target() {
    if (mode === 'head') {
      return { x: PINNED_X, y: height * 0.5 };
    }
    const point = getPositionAtProgress(scrollProgress(), JOURNEY);
    return { x: point.x * width, y: point.y * height };
  }

  /**
   * Advance one frame.
   *
   * Split out from the rAF callback so motion can be driven deterministically — with a
   * fixed dt — instead of depending on the browser actually producing frames. A hidden or
   * throttled tab issues no rAF callbacks at all, which otherwise makes this untestable.
   *
   * @param {number} dt Milliseconds since the previous step
   */
  function step(dt) {
    const goal = target();
    x = damp(x, goal.x, BODY_SMOOTHING, dt);
    y = damp(y, goal.y, BODY_SMOOTHING, dt);

    // The head looks from where the head actually is, not from the rig origin.
    const headX = x;
    const headY = y - (mode === 'head' ? 0 : 96);

    const goalLookX = clamp((mouseX - headX) / LOOK_RANGE, -1, 1);
    const goalLookY = clamp((mouseY - headY) / LOOK_RANGE, -1, 1);

    lookX = damp(lookX, goalLookX, HEAD_SMOOTHING, dt);
    lookY = damp(lookY, goalLookY, HEAD_SMOOTHING, dt);

    if (Math.abs(x - lastX) > EPSILON || Math.abs(y - lastY) > EPSILON) {
      element.style.setProperty('--robot-x', `${x.toFixed(2)}px`);
      element.style.setProperty('--robot-y', `${y.toFixed(2)}px`);
      lastX = x;
      lastY = y;
    }

    if (Math.abs(lookX - lastLookX) > EPSILON || Math.abs(lookY - lastLookY) > EPSILON) {
      element.style.setProperty('--look-x', `${(lookX * LOOK_SHIFT).toFixed(2)}px`);
      element.style.setProperty('--look-y', `${(lookY * LOOK_SHIFT).toFixed(2)}px`);
      element.style.setProperty('--tilt', `${(lookX * MAX_TILT).toFixed(2)}deg`);
      lastLookX = lookX;
      lastLookY = lookY;
    }
  }

  /** @param {number} now */
  function tick(now) {
    // Clamp: a backgrounded tab hands back a huge delta on return, which would otherwise
    // teleport the robot instead of letting it walk.
    step(Math.min(now - lastTime, 64));
    lastTime = now;
    frame = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  frame = requestAnimationFrame(tick);

  return {
    element,

    /** @param {RobotMode} next */
    setMode(next) {
      if (next === mode) return;
      mode = next;
      element.dataset.mode = next;
      // Position is not snapped: the damping carries the robot across to its new spot,
      // so switching modes reads as the robot walking off rather than teleporting.
    },

    getMode: () => mode,

    /** Deterministic frame advance. Used by tests and by tooling that has no rAF. */
    step,

    destroy() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      element.remove();
    },

    debug: () => ({
      mode,
      position: { x: Math.round(x), y: Math.round(y) },
      look: { x: +lookX.toFixed(3), y: +lookY.toFixed(3) },
      tilt: +(lookX * MAX_TILT).toFixed(2),
      scrollProgress: +scrollProgress().toFixed(3),
      stop: getPositionAtProgress(scrollProgress(), JOURNEY).stop,
    }),
  };
}
