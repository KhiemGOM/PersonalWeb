/**
 * Dev-only toggle: force every reload to look like a first-time visitor, or let it
 * behave like a returning one.
 *
 * Replaces what used to be a hardcoded `const DEBUG_ALWAYS_FIRST_VISIT = true` in
 * main.js — useful while building the visitor-intent question, but it meant testing the
 * OTHER path (does a reload actually remember you, now that spoken.js and the router's
 * scroll memory persist) required editing source and restarting the dev server. This is
 * the same choice, flippable at runtime with Shift+F.
 *
 * Stored in localStorage rather than sessionStorage: it's a developer preference about
 * how THIS machine's dev server behaves, not visitor state — it should survive closing
 * the tab, unlike the visitor.mode / spoken.said keys it forces a reset of.
 */

const FLAG_KEY = 'debug.forceFirstVisit';

export function isForced() {
  try {
    return localStorage.getItem(FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

/** @returns {boolean} the new state */
export function toggle() {
  const next = !isForced();
  try {
    localStorage.setItem(FLAG_KEY, String(next));
  } catch {
    /* Best-effort — the toggle just won't survive a reload without storage. */
  }
  return next;
}

/**
 * Small on-screen readout so the current mode is visible without opening devtools —
 * otherwise "did that keypress actually do anything" is answered by trial and error.
 */
function renderBadge() {
  const badge = document.createElement('div');
  badge.style.cssText =
    'position:fixed;left:0.5rem;top:0.5rem;z-index:2147483647;' +
    'font:11px/1.4 monospace;letter-spacing:.02em;padding:2px 6px;border-radius:3px;' +
    'background:rgba(0,0,0,.7);color:#fff;pointer-events:none;';
  const paint = () => {
    const forced = isForced();
    badge.textContent = `first-visit: ${forced ? 'FORCED (Shift+F)' : 'off (Shift+F)'}`;
    badge.style.color = forced ? '#ffcf6b' : '#8f9aa8';
  };
  paint();
  document.body.appendChild(badge);
  return paint;
}

/**
 * Wire the keybind and badge. Call once, in DEV only.
 * @param {() => void} onToggle  Run right before the reload — e.g. to log what changed.
 */
export function initDebugFirstVisit(onToggle) {
  const repaint = renderBadge();

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'f' || !event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = /** @type {HTMLElement} */ (event.target);
    if (target?.closest?.('input, textarea, select, [contenteditable]')) return;

    const next = toggle();
    onToggle?.(next);
    repaint();
    // A clean reload, not a live reset: half the point is testing what an ACTUAL reload
    // does under each setting, and this file's own module state (this closure included)
    // would otherwise survive a toggle in a way a real navigation never does.
    location.reload();
  });
}
