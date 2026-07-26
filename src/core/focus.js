/**
 * What the spotlight is pointed at.
 *
 * Views mark their subject with `data-lit` — a section's copy, a detail column, a hub's
 * stage — and this picks whichever is most central to the viewport right now. Scrolling
 * therefore hands the light from one block to the next without anything having to track
 * scroll positions or section indices.
 *
 * Declaring the subject in the view is the point: the lighting has no business knowing
 * that `.landing__text` exists, and a new kind of page should not need a case added here.
 */

/** Below this fraction visible, a block is not worth aiming at yet. */
const MIN_VISIBILITY = 0.25;

/** Bounds on the pool, so a huge block does not light the whole page and a tiny one is still generous. */
const MIN_RADIUS = 230;
const MAX_RADIUS_FRACTION = 0.72;

/** @type {HTMLElement[]} */
let candidates = [];

/** Re-read after each view swap; the elements themselves do not change between them. */
export function refreshFocusTargets() {
  candidates = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('[data-lit]')]);
}

/**
 * @returns {{ x: number, y: number, radius: number } | null}
 */
export function resolveFocus() {
  if (!candidates.length) return null;

  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const centre = viewportH / 2;

  let best = null;
  let bestScore = Infinity;

  for (const node of candidates) {
    const rect = node.getBoundingClientRect();
    if (rect.height === 0) continue;

    // How much of it is actually on screen.
    const visible = Math.max(0, Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0));
    if (visible / rect.height < MIN_VISIBILITY) continue;

    // Prefer whatever sits nearest the middle of the view.
    const distance = Math.abs(rect.top + rect.height / 2 - centre);
    if (distance < bestScore) {
      bestScore = distance;
      best = rect;
    }
  }

  if (!best) return null;

  const radius = Math.min(
    Math.max(MIN_RADIUS, (Math.hypot(best.width, best.height) / 2) * 1.3 + 70),
    Math.min(viewportW, viewportH) * MAX_RADIUS_FRACTION
  );

  return { x: best.left + best.width / 2, y: best.top + best.height / 2, radius };
}
