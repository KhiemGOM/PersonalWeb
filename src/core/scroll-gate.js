/**
 * A pause at each new section, on the first pass.
 *
 * Arriving somewhere for the first time holds onward scrolling until the visitor has
 * actually stopped for a moment. A continuous flick cannot carry them through five
 * sections without any of them registering — and crucially, the countdown is an IDLE
 * timer, not a fixed sentence: attempts to keep scrolling reset it. The only way through
 * is to genuinely stop, which is the entire point. Sitting on the wheel gets you nowhere.
 *
 * That is why blocked gestures still count as activity. They are cancelled, so the page
 * does not move and no scroll event fires, but the visitor is plainly still trying to
 * leave — treating that as stillness would let anyone hold the wheel down and coast
 * straight through the pause the moment it lapsed.
 *
 * What this is NOT: scroll snapping. Two earlier attempts at that were removed. CSS
 * `proximity` fought the gesture and hauled deliberate nudges back; a settle-on-idle
 * moved the page after the visitor had stopped, which is its own kind of rude. This never
 * moves the page — it declines to advance it for a moment, which is a smaller imposition
 * and far easier to understand while it is happening.
 *
 * Three properties keep it from becoming an obstacle:
 *
 *   forward only  — retreat is always free, so it can never be a trap
 *   first pass    — a section pauses once. Coming back is unrestricted
 *   self-expiring — nothing to find and click; stopping is the whole interaction
 *
 * Paused sections announce themselves through `data-dwell`, because a page that silently
 * ignores scrolling is indistinguishable from one that has crashed.
 */

import { lockScroll, unlockScroll } from './scroll-lock.js';

/** How long the visitor must be still before a new section lets them past. */
const DWELL_MS = 3000;

const REASON = 'dwell';

/**
 * @param {{ dwellMs?: number }} [options]
 */
export function createScrollGate(options = {}) {
  const dwellMs = options.dwellMs ?? DWELL_MS;

  /** @type {HTMLElement[]} */
  let sections = [];

  /** Furthest section already released. Section 0 is where everyone starts. */
  let highWater = 0;

  let gatedIndex = -1;
  let timer = 0;
  let enabled = true;
  let resets = 0;

  document.documentElement.style.setProperty('--dwell-ms', `${dwellMs}ms`);

  /**
   * Restart any progress indicator a view has volunteered. Views opt in by marking an
   * element, the same way they declare what the spotlight should light — so this has no
   * idea what the landing page's hint bar is, and a new view can show the countdown
   * however it likes without anything being added here.
   */
  function restartIndicators() {
    for (const node of document.querySelectorAll('[data-dwell-progress]')) {
      for (const animation of node.getAnimations()) {
        animation.cancel();
        animation.play();
      }
    }
  }

  /** @param {number} index */
  function open(index) {
    window.clearTimeout(timer);
    highWater = Math.max(highWater, index);
    gatedIndex = -1;
    delete document.documentElement.dataset.dwell;
    unlockScroll(REASON);
  }

  /** Start, or restart, the stillness countdown. */
  function armCountdown() {
    window.clearTimeout(timer);
    resets++;

    // Re-arming the lock also refreshes its safety deadline, so the backstop stays a
    // fixed margin past the countdown however long the visitor keeps at it.
    lockScroll(REASON, { direction: 'forward', maxMs: dwellMs + 2000 });

    restartIndicators();
    timer = window.setTimeout(() => open(gatedIndex), dwellMs);
  }

  /** @param {number} index */
  function hold(index) {
    gatedIndex = index;
    document.documentElement.dataset.dwell = 'true';
    armCountdown();
  }

  /** Any sign the visitor is still trying to move on. */
  function onAttempt() {
    if (gatedIndex >= 0) armCountdown();
  }

  function onScroll() {
    if (gatedIndex >= 0) {
      armCountdown();
      return;
    }
    if (!enabled || sections.length === 0) return;

    // Whichever section now fills most of the view.
    const index = Math.round(window.scrollY / window.innerHeight);
    if (index > highWater && index < sections.length) hold(index);
  }

  // Observation only — the lock does the actual blocking. Passive, so these never
  // interfere with the page's own scrolling when no gate is up.
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', onAttempt, { passive: true });
  window.addEventListener('touchmove', onAttempt, { passive: true });
  window.addEventListener('keydown', onAttempt, { passive: true });

  return {
    refresh() {
      sections = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('.landing__section')]);
      // Anything already scrolled past on arrival counts as seen — a deep link into the
      // middle of the page should not pause its way back up to where it started.
      if (sections.length) {
        highWater = Math.max(highWater, Math.round(window.scrollY / window.innerHeight));
      }
      if (gatedIndex >= 0) open(gatedIndex);
    },

    /** Someone in a hurry did not ask to be slowed down. */
    disable() {
      enabled = false;
      if (gatedIndex >= 0) open(gatedIndex);
    },

    enable() {
      enabled = true;
    },

    destroy() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onAttempt);
      window.removeEventListener('touchmove', onAttempt);
      window.removeEventListener('keydown', onAttempt);
      if (gatedIndex >= 0) open(gatedIndex);
    },

    debug: () => ({ enabled, highWater, gatedIndex, sections: sections.length, dwellMs, resets }),
  };
}
