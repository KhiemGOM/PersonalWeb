/**
 * What the robot has already said, for this page session.
 *
 * Central, because the rule is about the robot's memory and not about any one view. Left
 * to each view, they drifted: landing sections had learned not to repeat themselves while
 * hub introductions and item asides replayed verbatim every single time, so the same
 * character both remembered and forgot depending on which page you were on.
 *
 * Session-scoped and in memory. A reload is a fresh visitor as far as the robot is
 * concerned, which is also what makes the opening testable.
 */

/** @type {Set<string>} */
const said = new Set();

/** @param {string} key */
export function hasSaid(key) {
  return said.has(key);
}

/**
 * Mark something as said. Returns true the FIRST time only, so callers can write
 * `if (markSaid(key)) …` and get first-visit behaviour without a second lookup.
 * @param {string} key
 */
export function markSaid(key) {
  if (said.has(key)) return false;
  said.add(key);
  return true;
}

/** Testing and the debug console. */
export function forgetSaid() {
  said.clear();
}

export function saidSoFar() {
  return [...said];
}
