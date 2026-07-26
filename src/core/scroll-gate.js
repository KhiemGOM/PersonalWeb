/**
 * A frontier that advances when the visitor stops.
 *
 * On a first pass through the landing page you cannot scroll further than one section
 * past the furthest you have settled on. Reaching that edge, standing still for a few
 * seconds moves it on by one. Backward is never restricted.
 *
 * THE WHOLE STATE IS ONE NUMBER — `unlocked`, the furthest section index reachable
 * freely. Everything else is derived from it. The previous attempt was a small state
 * machine (gated index, engage, release, high-water mark) and it misbehaved in ways that
 * were hard even to describe, for reasons worth recording so they are not rebuilt:
 *
 *   - It decided which section you had reached with `round(scrollY / viewport)` sampled
 *     inside scroll events. A fast flick fires those at intermediate positions, so it
 *     could conclude you had arrived at section 3, mark it seen, and sections 1 and 2
 *     would then never gate at all. Whether a section stopped you depended on how hard
 *     you flicked.
 *   - Scrolling backwards, which is allowed, fired scroll events that reset the
 *     countdown, so retreating quietly prevented the thing you were retreating from from
 *     ever expiring.
 *   - Any keystroke counted as an attempt, so dismissing the robot's dialogue with Enter
 *     silently restarted the wait.
 *
 * A frontier has none of those failure modes because there is no arrival to detect: the
 * limit exists whether or not any event fires, and scroll events only ever ask "are we at
 * the edge, yes or no".
 */

/**
 * How long the visitor must be still at the frontier before it moves on.
 *
 * Long enough to break a continuous flick, short enough not to feel like a punishment.
 * Three seconds was the first attempt and it was far too long — five sections of it is
 * fifteen seconds of a first visit spent being refused.
 */
const DWELL_MS = 800;

/** Slack, in px, for counting as "at the edge". */
const EDGE_EPSILON = 3;

/** Keys that move the page. Anything else is none of this module's business. */
const SCROLL_KEYS = new Set([
  ' ', 'Spacebar', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End',
]);

/**
 * @param {{ dwellMs?: number }} [options]
 */
export function createScrollGate(options = {}) {
  const dwellMs = options.dwellMs ?? DWELL_MS;

  /** Furthest section index reachable without waiting. The entire state. */
  let unlocked = 0;

  let sectionCount = 0;
  let enabled = false;
  let timer = 0;
  let waiting = false;
  let clamping = false;
  let lastTouchY = 0;

  document.documentElement.style.setProperty('--dwell-ms', `${dwellMs}ms`);

  /** How far down the page the visitor may currently go. */
  function limit() {
    const viewport = window.innerHeight;
    const reachable = Math.min(unlocked + 1, Math.max(0, sectionCount - 1));
    const pageMax = Math.max(0, document.documentElement.scrollHeight - viewport);
    return Math.min(reachable * viewport, pageMax);
  }

  function fullyOpen() {
    return !enabled || sectionCount === 0 || unlocked >= sectionCount - 1;
  }

  function atFrontier() {
    return !fullyOpen() && window.scrollY >= limit() - EDGE_EPSILON;
  }

  /** @param {boolean} value */
  function setWaiting(value) {
    if (waiting === value) return;
    waiting = value;
    if (value) document.documentElement.dataset.dwell = 'true';
    else delete document.documentElement.dataset.dwell;
  }

  /**
   * Restart whatever countdown indicator a view has volunteered. Views opt in by marking
   * an element, the same way they declare what the spotlight should light — so this has
   * no idea what the landing page renders, and a new view can show the wait however it
   * likes without anything being added here.
   */
  function restartIndicator() {
    for (const node of document.querySelectorAll('[data-dwell-progress]')) {
      for (const animation of node.getAnimations()) {
        animation.cancel();
        animation.play();
      }
    }
  }

  function startWaiting() {
    window.clearTimeout(timer);
    setWaiting(true);
    restartIndicator();
    timer = window.setTimeout(() => {
      unlocked = Math.min(unlocked + 1, Math.max(0, sectionCount - 1));
      setWaiting(false);
      // The frontier has moved; the visitor is no longer at it.
      window.clearTimeout(timer);
    }, dwellMs);
  }

  function stopWaiting() {
    window.clearTimeout(timer);
    setWaiting(false);
  }

  /**
   * Single source of truth, run after anything that could change the answer. Either the
   * visitor is at the frontier and a countdown should be running, or they are not and it
   * should not be. No transitions to get wrong.
   */
  function sync() {
    if (atFrontier()) {
      if (!waiting) startWaiting();
    } else if (waiting) {
      stopWaiting();
    }
  }

  /** Backstop for anything that moves the page without a gesture we can cancel. */
  function enforce() {
    if (fullyOpen() || clamping) return;
    const max = limit();
    if (window.scrollY > max + 1) {
      clamping = true;
      window.scrollTo(0, max);
      requestAnimationFrame(() => {
        clamping = false;
      });
    }
  }

  function onScroll() {
    enforce();
    sync();
  }

  /** @param {WheelEvent} event */
  function onWheel(event) {
    if (fullyOpen() || event.deltaY <= 0) return;
    if (window.scrollY < limit() - EDGE_EPSILON) return;
    // At the edge and still pushing: refuse, and restart the wait. Pressing on is not
    // standing still, and without this anyone could lean on the wheel and coast through
    // the moment the countdown lapsed.
    event.preventDefault();
    startWaiting();
  }

  /** @param {TouchEvent} event */
  function onTouchStart(event) {
    lastTouchY = event.touches[0]?.clientY ?? 0;
  }

  /** @param {TouchEvent} event */
  function onTouchMove(event) {
    if (fullyOpen()) return;
    const y = event.touches[0]?.clientY ?? 0;
    const forward = y < lastTouchY; // finger up drags the page onward
    lastTouchY = y;
    if (!forward || window.scrollY < limit() - EDGE_EPSILON) return;
    event.preventDefault();
    startWaiting();
  }

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    if (fullyOpen() || !SCROLL_KEYS.has(event.key)) return;
    const target = /** @type {HTMLElement} */ (event.target);
    if (target?.closest?.('input, textarea, select, [contenteditable]')) return;

    const forward = event.key !== 'PageUp' && event.key !== 'ArrowUp' && event.key !== 'Home';
    if (!forward || window.scrollY < limit() - EDGE_EPSILON) return;
    event.preventDefault();
    startWaiting();
  }

  function onResize() {
    enforce();
    sync();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('resize', onResize);

  return {
    /** Called after every view swap. Off unless the landing page is on screen. */
    refresh() {
      const sections = document.querySelectorAll('.landing__section');
      sectionCount = sections.length;
      enabled = sectionCount > 1;

      // Arriving deep in the page — a reload part-way down, or a deep link — should not
      // then refuse to let you continue from where the browser already put you.
      if (enabled) {
        unlocked = Math.max(unlocked, Math.floor(window.scrollY / window.innerHeight));
      }
      sync();
    },

    /** Someone in a hurry did not ask to be slowed down. */
    disable() {
      enabled = false;
      stopWaiting();
    },

    destroy() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      stopWaiting();
    },

    debug: () => ({
      enabled,
      unlocked,
      sectionCount,
      waiting,
      limit: Math.round(limit()),
      scrollY: Math.round(window.scrollY),
      atFrontier: atFrontier(),
      fullyOpen: fullyOpen(),
    }),
  };
}
