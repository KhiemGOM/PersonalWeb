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
import { clamp, damp, getPositionAtProgress, lerp, scrollProgress } from '../lib/path.js';
import { JOURNEY } from '../content/journey.js';

/** @typedef {'full' | 'head'} RobotMode */

/** How far the head shifts toward the cursor, in px, at full deflection. */
const LOOK_SHIFT = 7;

/** Maximum head tilt in degrees. Heads lean; they do not spin. */
const MAX_TILT = 12;

/** Cursor distance at which looking is fully deflected. */
const LOOK_RANGE = 420;

/**
 * Fraction of remaining distance closed per 60Hz frame. Lower = more trailing lag.
 *
 * PATH_SMOOTHING damps progress ALONG the route, not position in space — see step().
 */
const PATH_SMOOTHING = 0.02;
const HEAD_SMOOTHING = 0.07;

/**
 * Top speed, in path-progress per second.
 *
 * Damping alone can never be outrun: it always closes the same FRACTION of the remaining
 * gap per frame, so a huge scroll jump just produces a huge initial velocity and the
 * robot keeps pace with anything. A real vehicle has a maximum speed instead — so this
 * caps how fast progress can change, and scrolling faster than the robot can drive
 * genuinely leaves it behind, to catch up in its own time.
 *
 * 0.2 means a full traverse of the route takes ~5s flat out.
 */
const MAX_PROGRESS_PER_SECOND = 0.2;

/**
 * Furthest the robot may fall behind, in viewport heights.
 *
 * At top speed a slam to the bottom of the page leaves it roughly 4.5 viewports back and
 * off-screen for about four seconds, which stops reading as "left behind" and starts
 * reading as "gone". This caps the gap.
 *
 * It does mean that when the robot is very far back it closes the distance faster than
 * its own top speed — but that only ever happens while it is off-screen, so the cheat is
 * unobservable. Everything visible still obeys the speed limit.
 */
const MAX_LAG_VIEWPORTS = 1.5;

/** How quickly the robot leaves the path to take up its pinned post, and returns. */
const PIN_SMOOTHING = 0.05;

/** Where the head sits in 'head' mode, pinned against the left edge. */
const PINNED_X = 78;
const PINNED_Y_RATIO = 0.5;

/** Below this delta, skip the DOM write — avoids thrashing style on sub-pixel jitter. */
const EPSILON = 0.01;

/** Rolling circumference in CSS px (r=15 in a 150-unit viewBox rendered at 150px). */
const WHEEL_CIRCUMFERENCE = 2 * Math.PI * 15;

/**
 * Horizontal speed (px/frame) required to commit to a direction change. Without this the
 * chassis flips back and forth while the robot is essentially parked, since damping
 * leaves a tiny residual drift that keeps crossing zero.
 */
const FACING_THRESHOLD = 0.35;

/** One wheel: tyre, hub, and spokes. Spokes are what make rotation legible. */
function wheel(cx) {
  return `
    <g class="robot__wheel" style="--wheel-cx: ${cx}px">
      <circle cx="${cx}" cy="72" r="15" class="robot__tyre" />
      <circle cx="${cx}" cy="72" r="5" class="robot__detail" />
      <path d="M${cx} 59 V85 M${cx - 13} 72 H${cx + 13}" class="robot__spoke" />
    </g>`;
}

/**
 * Rover chassis on a four-wheel drivetrain, side view.
 * Wheels rotate with distance travelled; the whole body flips to face direction of travel.
 */
function bodyArt() {
  return el('div', {
    className: 'robot__body',
    'aria-hidden': 'true',
    innerHTML: `
      <svg viewBox="0 0 150 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 68 H128" class="robot__axle" />
        ${[30, 62, 94, 122].map(wheel).join('')}

        <rect x="20" y="24" width="112" height="38" rx="7" class="robot__shape" />
        <rect x="34" y="34" width="52" height="16" rx="3" class="robot__detail" />
        <rect x="96" y="34" width="22" height="16" rx="3" class="robot__panel" />

        <path d="M76 24 V6" class="robot__mast" />
      </svg>`,
  });
}

/**
 * Perception camera — twin lens housings on a yoke. This is the part that tracks the
 * cursor, so the lenses carry a highlight that reads as a direction of gaze.
 */
function headArt() {
  return el('div', {
    className: 'robot__head',
    'aria-hidden': 'true',
    innerHTML: `
      <svg viewBox="0 0 130 76" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 52 H90" class="robot__yoke" />

        <g class="robot__lens-unit">
          <circle cx="42" cy="36" r="22" class="robot__shape" />
          <circle cx="42" cy="36" r="12" class="robot__lens" />
          <circle cx="47" cy="31" r="4" class="robot__glint" />
        </g>
        <g class="robot__lens-unit">
          <circle cx="88" cy="36" r="22" class="robot__shape" />
          <circle cx="88" cy="36" r="12" class="robot__lens" />
          <circle cx="93" cy="31" r="4" class="robot__glint" />
        </g>
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

  // Mirrored onto the layer so stacking can follow mode. #robot-layer is a positioned
  // ancestor with its own z-index, so a z-index on .robot itself could never lift it
  // above #scene-root — the decision has to be made on the layer.
  layer.dataset.mode = 'full';

  /** @type {RobotMode} */
  let mode = 'full';

  let width = window.innerWidth;
  let height = window.innerHeight;

  // Cursor starts centred rather than at (0,0), so the robot isn't staring into the
  // top-left corner before the pointer has ever moved.
  let mouseX = width / 2;
  let mouseY = height / 2;

  // How far along the route the robot has actually got. This — not the position — is
  // what damping acts on, which is what keeps the robot on the path.
  let pathProgress = 0;

  /** 0 = following the path, 1 = parked at the pinned post. */
  let pinBlend = 0;

  /** @type {string | undefined} */
  let currentStop = JOURNEY[0]?.stop;

  // Derived from pathProgress each frame; seeded so the first frame has sane values.
  let x = (JOURNEY[0]?.x ?? 0.5) * width;
  let y = (JOURNEY[0]?.y ?? 0.5) * height;
  let lookX = 0;
  let lookY = 0;

  // Infinity, not NaN: every comparison against NaN is false, so a NaN seed would make
  // the dirty-checks below never fire and the CSS variables never get written at all —
  // the internal state would advance while the robot sat frozen on screen.
  let lastX = Infinity;
  let lastY = Infinity;
  let lastLookX = Infinity;
  let lastLookY = Infinity;

  // Drivetrain state. Wheels turn with distance actually travelled, so the robot never
  // looks like it is skating — and the chassis faces the way it is going.
  let wheelAngle = 0;
  let facing = 1;
  let lastWheelAngle = Infinity;

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
    const previousX = x;

    // The lag lives in how far ALONG the route the robot has got, not in where it is in
    // space. Damping the position directly (the obvious approach) lets the robot cut
    // straight across the interior of the path toward a moving target — it drifts
    // through whatever happens to be between two waypoints. Damping progress instead
    // means the position is always read back off the path itself, so the robot is
    // bounded by the route at every instant while still accelerating into it.
    // Damping gives the ease in and out; the speed cap gives it a top gear it cannot
    // exceed. Together: gentle scrolls are followed smoothly, fast ones outrun it.
    const scrolled = scrollProgress();
    const eased = damp(pathProgress, scrolled, PATH_SMOOTHING, dt);
    const maxStep = MAX_PROGRESS_PER_SECOND * (dt / 1000);
    pathProgress += clamp(eased - pathProgress, -maxStep, maxStep);

    // Leash, applied after the speed cap so it only ever bites off-screen.
    const scrollableHeight = Math.max(1, document.documentElement.scrollHeight - height);
    const maxLag = (MAX_LAG_VIEWPORTS * height) / scrollableHeight;
    pathProgress = clamp(pathProgress, scrolled - maxLag, scrolled + maxLag);

    const point = getPositionAtProgress(pathProgress, JOURNEY);
    currentStop = point.stop;

    // WORLD SPACE, not screen space.
    //
    // The robot occupies a position in the DOCUMENT, and its on-screen position is that
    // world position minus the current scroll. When it is keeping up, worldY - scrollY
    // reduces to point.y * height and it sits in its floor lane exactly as before.
    //
    // When it falls behind, the difference is real: the page has moved on without it, so
    // it drifts up and off the top of the viewport — genuinely left behind, rather than
    // sliding around inside a viewport it can never exit. Anchoring y to the viewport
    // instead (the previous behaviour) made the robot impossible to outrun no matter how
    // fast you scrolled.
    //
    // x needs no such treatment: the document does not scroll horizontally, so world and
    // screen x are the same thing.
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - height);
    const worldY = pathProgress * maxScroll + point.y * height;
    const pathScreenY = worldY - window.scrollY;

    // Leaving the path for the pinned post is the one sanctioned excursion, and it is
    // blended rather than snapped so the robot drives off rather than teleporting.
    pinBlend = damp(pinBlend, mode === 'head' ? 1 : 0, PIN_SMOOTHING, dt);

    // The pinned post is screen space by definition — it stays put while pages scroll.
    x = lerp(point.x * width, PINNED_X, pinBlend);
    y = lerp(pathScreenY, height * PINNED_Y_RATIO, pinBlend);

    // Drivetrain: wheels roll the distance actually covered, chassis turns to face it.
    const travelled = x - previousX;
    wheelAngle = (wheelAngle + (travelled / WHEEL_CIRCUMFERENCE) * 360) % 360;

    const speed = Math.abs(travelled) / (dt / 16.67);
    if (speed > FACING_THRESHOLD) facing = Math.sign(travelled);

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
      element.style.setProperty('--facing', String(facing));
      lastX = x;
      lastY = y;
    }

    if (Math.abs(wheelAngle - lastWheelAngle) > EPSILON) {
      element.style.setProperty('--wheel-angle', `${wheelAngle.toFixed(1)}deg`);
      lastWheelAngle = wheelAngle;
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
      layer.dataset.mode = next;
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
      wheelAngle: +wheelAngle.toFixed(1),
      facing,
      scrollProgress: +scrollProgress().toFixed(3),
      // Where the robot actually is along the route, which trails the scroll position.
      pathProgress: +pathProgress.toFixed(3),
      pinBlend: +pinBlend.toFixed(3),
      stop: currentStop,
      // Negative = scrolled off the top, i.e. the visitor has left it behind.
      onScreen: y > -160 && y < height + 160,
      lagInViewports: +(
        ((scrollProgress() - pathProgress) *
          Math.max(0, document.documentElement.scrollHeight - height)) /
        height
      ).toFixed(2),
    }),
  };
}
