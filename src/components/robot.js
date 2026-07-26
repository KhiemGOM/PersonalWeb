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
import {
  clamp,
  damp,
  getPositionAtProgress,
  lerp,
  scrollProgress,
  speedPerProgress,
} from '../lib/path.js';
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
 * Reversing gets its own, brisker acceleration.
 *
 * Not because backing up should be quicker — the top speed is identical in both
 * directions — but because the robot sits low in the viewport, in its floor lane. That
 * leaves ~615px of room above it and only ~125px below. Scrolling down, it can trail a
 * long way and still be on screen; scrolling up, the same trail puts it off the bottom
 * edge in under half a second, before it has even finished accelerating, and it stays
 * gone. Identical physics, wildly different experience.
 *
 * Getting up to speed faster in reverse keeps it visible, which is the thing that
 * actually reads as effort. It still trails; you can just see it trailing.
 */
const REVERSE_SMOOTHING = 0.055;

/**
 * Top speed, in world pixels per second.
 *
 * Damping alone can never be outrun: it always closes the same FRACTION of the remaining
 * gap per frame, so a huge scroll jump just produces a huge initial velocity and the
 * robot keeps pace with anything. A real vehicle has a maximum speed instead.
 *
 * Measured in PIXELS, not progress. Progress is only a parameter along the curve, so
 * capping it caps the wrong thing — on a stretch where the path also swings sideways the
 * robot covers more ground per unit progress than on a straight vertical run, and its
 * apparent top speed ends up a function of the slope of the line it is on. Converting
 * through the local derivative gives one speed limit that holds everywhere.
 */
const MAX_SPEED_PX_PER_SECOND = 780;

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

/**
 * The same leash for reversing, and much tighter for the same reason as
 * REVERSE_SMOOTHING: there are only ~125px of viewport below the robot, so a gap the
 * forward direction wears comfortably puts it far past the bottom edge and out of sight
 * for seconds at a time.
 */
const MAX_LAG_VIEWPORTS_REVERSE = 0.35;

/**
 * Ceiling on how far the leash may exceed the speed limit, as a multiple of it.
 *
 * The forward leash only ever engages while the robot is off the top of the screen, so
 * how fast it hauls itself back is unobservable. The reverse leash is different: it
 * engages while the robot is still visible near the bottom edge, and an unbounded clamp
 * yanks it backwards at over five times its top speed — measured at 4198px/s against a
 * 780 limit, which looks like a glitch rather than a machine hurrying.
 */
const LEASH_MAX_BOOST = 2;

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
    const scrollableHeight = Math.max(1, document.documentElement.scrollHeight - height);

    // Convert the pixel speed limit into a progress limit for wherever the robot
    // currently is on the curve. Scrolling contributes `scrollableHeight` of world y per
    // unit progress on its own, on top of whatever the waypoints add.
    const scale = { x: width, y: height };
    const budget = (MAX_SPEED_PX_PER_SECOND * dt) / 1000;
    const direction = Math.sign(scrolled - pathProgress) || 1;

    // Sampled at both ends of the step, not just the start. Through a sideways crossing
    // the speed-per-progress climbs steeply within a single frame, so a start-of-step
    // reading understates it and the robot overshoots the limit by ~17%. Taking the
    // larger of the two keeps the cap conservative: slightly slow through a bend, never
    // fast.
    const perStart = speedPerProgress(pathProgress, JOURNEY, scale, scrollableHeight);
    const tentative = pathProgress + (direction * budget) / Math.max(1, perStart);
    const perEnd = speedPerProgress(clamp(tentative), JOURNEY, scale, scrollableHeight);
    const maxStep = budget / Math.max(1, perStart, perEnd);

    const start = pathProgress;
    const reversing = scrolled < start;

    const eased = damp(start, scrolled, reversing ? REVERSE_SMOOTHING : PATH_SMOOTHING, dt);
    const capped = start + clamp(eased - start, -maxStep, maxStep);

    // Leash, applied after the speed cap. Asymmetric because the room either side of the
    // robot is asymmetric — see MAX_LAG_VIEWPORTS_REVERSE.
    const lagAhead = (MAX_LAG_VIEWPORTS * height) / scrollableHeight;
    const lagBehind = (MAX_LAG_VIEWPORTS_REVERSE * height) / scrollableHeight;
    const leashed = clamp(capped, scrolled - lagAhead, scrolled + lagBehind);

    // Bound the frame's TOTAL displacement, measured from where it started. Applying the
    // leash as a further increment on top of an already-capped step lets the two stack,
    // which produced 3x the speed limit rather than the intended 2x.
    const leashStep = maxStep * LEASH_MAX_BOOST;
    pathProgress = start + clamp(leashed - start, -leashStep, leashStep);

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
      // Rounded fields below are for reading. Anything measuring motion must use these
      // exact ones: rounding pathProgress to 3dp quantizes world position to several
      // pixels, which at 60fps reads as hundreds of px/s of speed that is not there.
      exact: { pathProgress, x, y, pinBlend },
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
