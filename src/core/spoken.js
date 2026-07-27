/**
 * What the robot has already said, for this browser session.
 *
 * Central, because the rule is about the robot's memory and not about any one view. Left
 * to each view, they drifted: landing sections had learned not to repeat themselves while
 * hub introductions and item asides replayed verbatim every single time, so the same
 * character both remembered and forgot depending on which page you were on.
 *
 * Persisted to sessionStorage, not just held in memory. A plain in-memory Set survives
 * clicking around the site fine, but a real reload replaces the whole JS runtime and
 * takes the Set with it — so every F5 played the entire guided tour over again, which
 * reads as the robot forgetting you mid-conversation rather than as a fresh visitor.
 * Session-scoped storage keeps "reload is a fresh visitor" true only for an actual new
 * tab, which is the case that was ever meant to be true.
 */

const STORAGE_KEY = 'spoken.said';

/** @returns {Set<string>} */
function load() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...said]));
  } catch {
    /* Best-effort — losing this only means a line repeats, not that anything breaks. */
  }
}

const said = load();

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
  persist();
  return true;
}

/** Testing and the debug console. */
export function forgetSaid() {
  said.clear();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function saidSoFar() {
  return [...said];
}
