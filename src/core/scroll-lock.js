/**
 * Holding the page still, in whole or in one direction.
 *
 * Locks by cancelling scroll gestures rather than setting `overflow: hidden`. Hiding
 * overflow removes the scrollbar, which reflows the page sideways by its width the moment
 * the lock engages and back again when it lifts — a visible lurch during exactly the
 * moment the lock exists to protect.
 *
 * A lock can be `all` or `forward`. Forward blocks scrolling onward while leaving retreat
 * free, which matters: a hold the visitor cannot back out of is a trap, and going back is
 * almost always deliberate.
 *
 * Locks are keyed by reason, so two things can hold the page at once without either
 * releasing it out from under the other. Every lock carries a deadline — a stuck scroll
 * lock is the most hostile state a page can be in, so if a release is ever dropped the
 * page frees itself rather than stranding the visitor with no idea why.
 */

/** Nothing may hold the page longer than this, whatever it thinks it is doing. */
const MAX_LOCK_MS = 8000;

/** @typedef {'all' | 'forward'} LockDirection */

/** @type {Map<string, { timer: number, direction: LockDirection }>} */
const held = new Map();

const FORWARD_KEYS = new Set([' ', 'Spacebar', 'PageDown', 'ArrowDown', 'End']);
const BACKWARD_KEYS = new Set(['PageUp', 'ArrowUp', 'Home']);

/** Last touch position, so a drag can be classified as forward or backward. */
let lastTouchY = 0;

function strictest() {
  for (const { direction } of held.values()) if (direction === 'all') return 'all';
  return held.size ? 'forward' : null;
}

/** @param {WheelEvent} event */
function onWheel(event) {
  const mode = strictest();
  if (!mode) return;
  // Scrolling onward is deltaY > 0. Back up freely under a forward-only hold.
  if (mode === 'all' || event.deltaY > 0) event.preventDefault();
}

/** @param {TouchEvent} event */
function onTouchStart(event) {
  lastTouchY = event.touches[0]?.clientY ?? 0;
}

/** @param {TouchEvent} event */
function onTouchMove(event) {
  const mode = strictest();
  if (!mode) return;
  const y = event.touches[0]?.clientY ?? 0;
  // Finger travelling up drags the page onward.
  const forward = y < lastTouchY;
  lastTouchY = y;
  if (mode === 'all' || forward) event.preventDefault();
}

/** @param {KeyboardEvent} event */
function onKeyDown(event) {
  const mode = strictest();
  if (!mode) return;

  // Never swallow a key aimed at something the visitor is typing in.
  const target = /** @type {HTMLElement} */ (event.target);
  if (target?.closest?.('input, textarea, select, [contenteditable]')) return;

  if (FORWARD_KEYS.has(event.key)) event.preventDefault();
  else if (mode === 'all' && BACKWARD_KEYS.has(event.key)) event.preventDefault();
}

function engage() {
  // passive: false, or preventDefault is ignored and the page scrolls regardless.
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('keydown', onKeyDown, { passive: false });
}

function release() {
  window.removeEventListener('wheel', onWheel);
  window.removeEventListener('touchstart', onTouchStart);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('keydown', onKeyDown);
}

function reflect() {
  const mode = strictest();
  if (mode) document.documentElement.dataset.scrollLocked = mode;
  else delete document.documentElement.dataset.scrollLocked;
}

/**
 * @param {string} reason
 * @param {{ direction?: LockDirection, maxMs?: number }} [opts]
 */
export function lockScroll(reason, opts = {}) {
  const { direction = 'all', maxMs = MAX_LOCK_MS } = opts;

  const existing = held.get(reason);
  if (existing) window.clearTimeout(existing.timer);
  if (held.size === 0) engage();

  held.set(reason, {
    direction,
    timer: window.setTimeout(() => {
      console.warn(`[scroll-lock] "${reason}" outlived its deadline; releasing`);
      unlockScroll(reason);
    }, maxMs),
  });

  reflect();
}

/** @param {string} reason */
export function unlockScroll(reason) {
  const entry = held.get(reason);
  if (entry) window.clearTimeout(entry.timer);
  held.delete(reason);
  if (held.size === 0) release();
  reflect();
}

export function isScrollLocked() {
  return held.size > 0;
}

export function lockedReasons() {
  return [...held.keys()];
}
