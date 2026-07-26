/**
 * Holding the page still.
 *
 * Locks by cancelling scroll gestures rather than setting `overflow: hidden`. Hiding
 * overflow removes the scrollbar, which reflows the whole page sideways by its width the
 * moment the lock engages and back again when it lifts — a visible lurch, during exactly
 * the cinematic moment the lock exists to protect.
 *
 * Locks are keyed by reason and counted, so two things can hold the page at once and
 * neither releases it out from under the other.
 *
 * Every lock carries a deadline. A scroll lock is the single most hostile state a page
 * can be stuck in — if some future bug drops the release, the page frees itself rather
 * than trapping the visitor with no way to know why.
 */

/** Nothing may hold the page longer than this, whatever it thinks it is doing. */
const MAX_LOCK_MS = 8000;

/** @type {Map<string, number>} reason -> timeout id */
const held = new Map();

/** Keys that scroll, and so have to be swallowed while locked. */
const SCROLL_KEYS = new Set([
  ' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Spacebar',
]);

/** @param {Event} event */
function swallow(event) {
  event.preventDefault();
}

/** @param {KeyboardEvent} event */
function swallowKeys(event) {
  // Never swallow a key aimed at something the visitor is typing in.
  const target = /** @type {HTMLElement} */ (event.target);
  if (target?.closest?.('input, textarea, select, [contenteditable]')) return;
  if (SCROLL_KEYS.has(event.key)) event.preventDefault();
}

function engage() {
  // passive: false, or preventDefault is ignored and the page scrolls anyway.
  window.addEventListener('wheel', swallow, { passive: false });
  window.addEventListener('touchmove', swallow, { passive: false });
  window.addEventListener('keydown', swallowKeys, { passive: false });
  document.documentElement.dataset.scrollLocked = 'true';
}

function release() {
  window.removeEventListener('wheel', swallow);
  window.removeEventListener('touchmove', swallow);
  window.removeEventListener('keydown', swallowKeys);
  delete document.documentElement.dataset.scrollLocked;
}

/**
 * @param {string} reason
 * @param {number} [maxMs]
 */
export function lockScroll(reason, maxMs = MAX_LOCK_MS) {
  if (held.has(reason)) window.clearTimeout(held.get(reason));
  if (held.size === 0) engage();

  held.set(
    reason,
    window.setTimeout(() => {
      console.warn(`[scroll-lock] "${reason}" outlived its deadline; releasing`);
      unlockScroll(reason);
    }, maxMs)
  );
}

/** @param {string} reason */
export function unlockScroll(reason) {
  const timer = held.get(reason);
  if (timer !== undefined) window.clearTimeout(timer);
  held.delete(reason);
  if (held.size === 0) release();
}

export function isScrollLocked() {
  return held.size > 0;
}

export function lockedReasons() {
  return [...held.keys()];
}
