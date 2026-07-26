/**
 * Small synthesised sound effects.
 *
 * Synthesised rather than sampled: the whole palette is a few oscillators, so it costs
 * nothing to download and can be tuned by changing numbers.
 *
 * Two constraints shape everything here:
 *
 * 1. Browsers refuse to start audio before a user gesture, so the context is created
 *    lazily on the first real interaction and every call before that is a no-op. Nothing
 *    queues up to blare later.
 * 2. A portfolio that makes noise at you unprompted is obnoxious. Sound is off until the
 *    visitor turns it on, and the choice persists.
 */

const STORAGE_KEY = 'sound.enabled';

/** @type {AudioContext | null} */
let ctx = null;
/** @type {GainNode | null} */
let master = null;

let enabled = false;
let unlocked = false;

/** @type {Set<(on: boolean) => void>} */
const listeners = new Set();

function readPreference() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** @param {boolean} on */
function writePreference(on) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(on));
  } catch {
    /* preference is best-effort */
  }
}

/** Create the audio graph. Safe to call repeatedly. */
function ensureContext() {
  if (ctx) return ctx;

  const Ctor = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
  if (!Ctor) return null;

  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.06; // deliberately quiet; these are punctuation, not music
  master.connect(ctx.destination);
  return ctx;
}

/**
 * Called from the first user gesture. Until this runs, every play() is dropped —
 * an AudioContext created earlier would sit suspended and fire everything at once
 * when it finally resumed.
 */
function unlock() {
  if (unlocked) return;
  unlocked = true;
  const context = ensureContext();
  if (context?.state === 'suspended') context.resume();
}

/**
 * One short tone.
 * @param {Object} opts
 * @param {number} opts.frequency Hz
 * @param {number} [opts.duration] seconds
 * @param {OscillatorType} [opts.type]
 * @param {number} [opts.gain] 0–1, relative to master
 */
function play({ frequency, duration = 0.06, type = 'square', gain = 1 }) {
  if (!enabled || !unlocked) return;
  const context = ensureContext();
  if (!context || !master) return;

  const now = context.currentTime;
  const osc = context.createOscillator();
  const env = context.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  // Short attack and exponential decay. A raw start/stop clicks audibly.
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gain, now + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(env);
  env.connect(master);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

let blipCount = 0;

export const sound = {
  /**
   * A speech blip. Called per typed character, so it throttles itself and wanders in
   * pitch — a fixed tone at full rate is a dental drill.
   */
  blip() {
    blipCount++;
    if (blipCount % 3 !== 0) return;
    const wobble = ((blipCount * 37) % 11) - 5; // deterministic, avoids Math.random
    play({ frequency: 620 + wobble * 18, duration: 0.045, type: 'square', gain: 0.7 });
  },

  /** Punctuates the end of a spoken line. */
  lineDone() {
    play({ frequency: 880, duration: 0.09, type: 'triangle', gain: 0.5 });
  },

  /** Hovering something interactive. */
  hover() {
    play({ frequency: 1180, duration: 0.03, type: 'sine', gain: 0.35 });
  },

  /** Committing to something — an object, a link. */
  select() {
    play({ frequency: 520, duration: 0.07, type: 'triangle', gain: 0.6 });
    play({ frequency: 780, duration: 0.1, type: 'triangle', gain: 0.4 });
  },

  /** @returns {boolean} */
  isEnabled() {
    return enabled;
  },

  /** @param {boolean} on */
  setEnabled(on) {
    enabled = on;
    writePreference(on);
    if (on) unlock();
    for (const listener of listeners) listener(on);
    // Confirm audibly, so the toggle proves itself.
    if (on) sound.select();
  },

  toggle() {
    sound.setEnabled(!enabled);
    return enabled;
  },

  /** @param {(on: boolean) => void} listener */
  subscribe(listener) {
    listeners.add(listener);
    listener(enabled);
    return () => listeners.delete(listener);
  },

  /** Wire the gesture listeners. Call once at startup. */
  init() {
    enabled = readPreference();
    const onGesture = () => unlock();
    document.addEventListener('pointerdown', onGesture, { once: true });
    document.addEventListener('keydown', onGesture, { once: true });
  },
};
