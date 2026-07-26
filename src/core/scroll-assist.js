/**
 * Settling the page onto a section.
 *
 * CSS scroll-snap was tried for this and removed: even at `proximity` it acts DURING the
 * gesture, so a deliberate nudge gets hauled back to where it started and the page reads
 * as broken. This waits until scrolling has actually stopped, then settles. Nothing is
 * ever taken out of the visitor's hands mid-motion.
 *
 * Three conditions, all required:
 *
 *   downward only — being pulled forward while scrolling back up is disorienting, and
 *                   going back is usually deliberate
 *   first time    — each section settles once, on the way past it. Re-reading is free
 *                   scrolling, because by then the visitor knows what is there
 *   not aligned   — already sitting on a boundary means nothing to do
 */

import { isScrollLocked } from './scroll-lock.js';

/** How long the page must be still before it counts as stopped. */
const IDLE_MS = 140;

/** Closer than this to a boundary and it is already settled. */
const ALIGNED_PX = 10;

/** Ignore drift smaller than this when working out which way we went. */
const DIRECTION_EPSILON = 4;

export function createScrollAssist() {
  /** @type {HTMLElement[]} */
  let sections = [];

  /**
   * Furthest section already settled onto. Sections at or below it are free — this is
   * what makes it a first-pass behaviour rather than a permanent snap.
   */
  let highWater = 0;

  let lastY = window.scrollY;
  let direction = 0;
  let idleTimer = 0;
  let settling = false;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  function refresh() {
    sections = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('.landing__section')]);
    lastY = window.scrollY;
    // Anything already scrolled past on arrival counts as seen.
    if (sections.length) {
      highWater = Math.max(highWater, Math.round(window.scrollY / window.innerHeight));
    }
  }

  function settle() {
    if (settling || isScrollLocked() || sections.length < 2) return;
    if (direction <= 0) return; // upward or stationary: leave it alone

    const viewport = window.innerHeight;
    const maxScroll = document.documentElement.scrollHeight - viewport;
    const index = Math.round(window.scrollY / viewport);

    // Already seen this one — from here on, scrolling is entirely the visitor's.
    if (index <= highWater) return;
    if (index >= sections.length) return;

    const target = Math.min(index * viewport, maxScroll);
    if (Math.abs(target - window.scrollY) < ALIGNED_PX) {
      highWater = index;
      return;
    }

    settling = true;
    highWater = index;
    window.scrollTo({
      top: target,
      behavior: reducedMotion?.matches ? 'auto' : 'smooth',
    });

    // Native smooth scrolling gives no completion event that is safe to rely on across
    // browsers, so the guard simply expires. Erring long would swallow the visitor's next
    // gesture, which is the exact failure this whole module exists to avoid.
    window.setTimeout(() => {
      settling = false;
      lastY = window.scrollY;
    }, 420);
  }

  function onScroll() {
    const y = window.scrollY;
    const delta = y - lastY;

    if (Math.abs(delta) > DIRECTION_EPSILON && !settling) direction = Math.sign(delta);
    lastY = y;

    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(settle, IDLE_MS);
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  return {
    refresh,

    /** Treat every section as already seen — used when the visitor is in a hurry. */
    disable() {
      highWater = Number.MAX_SAFE_INTEGER;
    },

    destroy() {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(idleTimer);
    },

    debug: () => ({ highWater, direction, settling, sections: sections.length }),
  };
}
