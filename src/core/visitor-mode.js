/**
 * Visitor mode — "in a hurry" vs "lead me".
 *
 * Chosen on landing (docs/CONCEPT.md, "Visitor branch"). Guided mode narrates; hurry mode
 * skips the performance and shows transcripts and descriptions immediately.
 *
 * Persistence rules:
 *  - The active mode is SESSION-scoped. A returning visitor gets asked again.
 *  - Every EXPLICIT choice is appended to a cross-session history.
 *  - Once the last 3 explicit choices are the same, that becomes the default and the
 *    question stops being asked.
 *
 * Only explicit choices are recorded. If auto-applied defaults were also appended, the
 * streak would feed itself and the question could never come back. Because switching mode
 * mid-session is itself an explicit choice, it appends and breaks the streak — so changing
 * your mind is always enough to start being asked again.
 */

/** @typedef {'guided' | 'hurry'} Mode */

export const MODES = /** @type {const} */ ({ GUIDED: 'guided', HURRY: 'hurry' });

const HISTORY_KEY = 'visitor.history';
const SESSION_KEY = 'visitor.mode';

/** Consecutive identical choices before we stop asking. */
export const STREAK_TO_DEFAULT = 3;

/** Cap the stored history; only the tail matters, and this keeps localStorage tidy. */
const HISTORY_CAP = 12;

/**
 * Storage access that can't throw. Safari in private mode and hardened browser configs
 * both make Storage writes fail, and losing a preference must never break navigation.
 * @param {'localStorage' | 'sessionStorage'} kind
 */
function safeStorage(kind) {
  return {
    /** @param {string} key */
    get(key) {
      try {
        return window[kind].getItem(key);
      } catch {
        return null;
      }
    },
    /** @param {string} key @param {string} value */
    set(key, value) {
      try {
        window[kind].setItem(key, value);
      } catch {
        /* preference is best-effort; in-memory state still works for this session */
      }
    },
    /** @param {string} key */
    remove(key) {
      try {
        window[kind].removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

const local = safeStorage('localStorage');
const session = safeStorage('sessionStorage');

/** @param {unknown} value @returns {value is Mode} */
function isMode(value) {
  return value === MODES.GUIDED || value === MODES.HURRY;
}

/**
 * Explicit choices, oldest first.
 * @returns {Mode[]}
 */
export function getHistory() {
  const raw = local.get(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isMode) : [];
  } catch {
    return [];
  }
}

/**
 * Length and mode of the run of identical choices at the end of the history.
 * @returns {{ mode: Mode | null, count: number }}
 */
export function trailingStreak() {
  const history = getHistory();
  if (!history.length) return { mode: null, count: 0 };

  const mode = history[history.length - 1];
  let count = 0;
  for (let i = history.length - 1; i >= 0 && history[i] === mode; i--) count++;

  return { mode, count };
}

/**
 * The mode that has earned default status, or null if the visitor should still be asked.
 * @returns {Mode | null}
 */
export function preferredMode() {
  const { mode, count } = trailingStreak();
  return count >= STREAK_TO_DEFAULT ? mode : null;
}

/** @type {Set<(mode: Mode) => void>} */
const listeners = new Set();

/** @type {Mode | null} */
let current = null;

/**
 * Reflect the mode on <html> so CSS can branch on it. Components read `data-mode` rather
 * than testing the mode at every call site — hiding transcripts in hurry mode is then a
 * stylesheet concern, not a conditional scattered through every component.
 * @param {Mode} mode
 * @param {boolean} [persist=true]  When false, the mode applies to the DOM but isn't
 *                                  written to session storage — so a reload still lands
 *                                  in the "should ask" state.
 */
function apply(mode, persist = true) {
  current = mode;
  document.documentElement.dataset.mode = mode;
  if (persist) session.set(SESSION_KEY, mode);
  for (const listener of listeners) listener(mode);
}

/**
 * Decide what to do on load, before the intro runs.
 *
 * @returns {{ mode: Mode | null, ask: boolean, reason: 'session' | 'streak' | 'unasked' }}
 */
export function resolve() {
  const active = session.get(SESSION_KEY);
  if (isMode(active)) {
    apply(active);
    return { mode: active, ask: false, reason: 'session' };
  }

  const preferred = preferredMode();
  if (preferred) {
    apply(preferred);
    return { mode: preferred, ask: false, reason: 'streak' };
  }

  return { mode: null, ask: true, reason: 'unasked' };
}

/**
 * Record a deliberate choice — the landing question, or the switch control.
 * This is the ONLY path that writes history.
 * @param {Mode} mode
 */
export function choose(mode) {
  if (!isMode(mode)) throw new TypeError(`unknown visitor mode: ${String(mode)}`);

  const history = [...getHistory(), mode].slice(-HISTORY_CAP);
  local.set(HISTORY_KEY, JSON.stringify(history));
  apply(mode);
  return mode;
}

/**
 * Set the mode without recording it in history — for auto-applied defaults and for
 * anything that shouldn't count as the visitor expressing a preference.
 * @param {Mode} mode
 * @param {{ persist?: boolean }} [opts]  `persist: false` also skips session storage,
 *                                        leaving the visitor still-unasked on reload
 */
export function setSessionMode(mode, opts = {}) {
  if (!isMode(mode)) throw new TypeError(`unknown visitor mode: ${String(mode)}`);
  apply(mode, opts.persist ?? true);
}

/** @returns {Mode | null} */
export function getMode() {
  return current;
}

/** @returns {boolean} */
export function isGuided() {
  return current === MODES.GUIDED;
}

/**
 * @param {(mode: Mode) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribe(listener) {
  listeners.add(listener);
  if (current) listener(current);
  return () => listeners.delete(listener);
}

/** Wipe the learned default and this session's mode — the "ask me again" escape hatch. */
export function forget() {
  local.remove(HISTORY_KEY);
  session.remove(SESSION_KEY);
  current = null;
  delete document.documentElement.dataset.mode;
}
