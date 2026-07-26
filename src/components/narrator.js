/**
 * The robot's voice.
 *
 * Two distinct registers, deliberately not the same mechanism (docs/CONCEPT.md):
 *
 *   say(lines)  — hub introductions. Typed out one line at a time, and each completed
 *                 line is kept in a visible transcript so the content stays skimmable
 *                 without sitting through the animation.
 *   react(line) — achievement-level asides. A brief bubble that fades on its own and is
 *                 NOT recorded. These are throwaway remarks; a transcript of them would
 *                 imply they mattered.
 *
 * Hurry mode never types. Lines land in the transcript immediately and the bubble never
 * appears — the visitor said they were in a hurry, so the performance is skipped rather
 * than merely accelerated.
 *
 * Typing is always skippable: a click completes the current line, Escape abandons the
 * whole queue. Nothing here can make someone wait.
 */

import { el } from '../lib/dom.js';
import { isGuided } from '../core/visitor-mode.js';
import { sound } from '../core/sound.js';

/** Characters per second while typing. Fast enough to read along with. */
const CHARS_PER_SECOND = 42;

/**
 * TRANSCRIPT: PARKED, NOT REMOVED.
 *
 * The running log read as clutter, so it is switched off while the presentation is
 * worked out. Everything that builds it is still here and still correct — flip this back
 * to true to restore it.
 *
 * One consequence to keep in mind while it is off: hurry mode has no transcript to drop
 * its lines into, so hub narration simply does not appear for those visitors. That is
 * survivable because narration is flavour and the substance lives in the page copy, but
 * it does mean hurry mode currently loses content rather than merely losing the
 * animation.
 */
const TRANSCRIPT_ENABLED = false;

/** How long a reaction bubble lingers once fully typed, in ms. */
const REACTION_HOLD = 2600;

/** @typedef {ReturnType<typeof createNarrator>} Narrator */

/**
 * @param {Object} config
 * @param {HTMLElement} config.root  #narrator-root
 */
export function createNarrator(config) {
  const { root, onSpeakingChange } = config;

  const line = el('p', { className: 'narrator__line' });
  // aria-hidden: the partially-typed text is an animation frame, not content. Screen
  // readers get whole lines from the transcript instead of a stream of fragments.
  // Shown once a line is fully typed and the robot is waiting to be told to carry on.
  const continueHint = el('span', { className: 'narrator__continue', 'aria-hidden': 'true' });
  const bubble = el('div', { className: 'narrator__bubble', 'aria-hidden': 'true' }, line, continueHint);

  const transcript = el('ol', {
    className: 'narrator__transcript',
    'aria-live': 'polite',
    'aria-label': 'Robot transcript',
  });

  const element = el('div', { className: 'narrator', dataset: { state: 'idle', awaiting: 'false' } }, bubble);
  // Parked, not removed — see TRANSCRIPT_ENABLED.
  if (TRANSCRIPT_ENABLED) element.prepend(transcript);
  root.appendChild(element);

  /** @type {string[]} */
  let queue = [];
  /** @type {string | null} */
  let typing = null;
  let cursor = 0;
  /** Characters already revealed, so blips fire once per character rather than per frame. */
  let lastRevealed = 0;

  /** @type {'performed' | 'recorded-only' | null} Which branch the last say() took. */
  let lastSayBranch = null;
  let holdRemaining = 0;
  /** True when a line is fully typed and waiting for the visitor to continue. */
  let awaiting = false;
  /** @type {'idle' | 'narrate' | 'react'} */
  let state = 'idle';

  /** @param {'idle' | 'narrate' | 'react'} next */
  function setState(next) {
    const wasSpeaking = state !== 'idle';
    state = next;
    element.dataset.state = next;

    // The robot animates while it is talking — without that, a bubble appearing near it
    // is only circumstantial evidence that it is the one speaking.
    const speaking = next !== 'idle';
    if (speaking !== wasSpeaking) onSpeakingChange?.(speaking);
  }

  /** @param {string} text */
  function commitToTranscript(text) {
    if (!TRANSCRIPT_ENABLED) return;
    transcript.appendChild(el('li', { className: 'narrator__entry' }, text));
  }

  /** Begin typing the next queued line, or fall idle. */
  function advance() {
    const next = queue.shift();
    if (next === undefined) {
      typing = null;
      line.textContent = '';
      setState('idle');
      return;
    }
    typing = next;
    cursor = 0;
    lastRevealed = 0;
    setAwaiting(false);
    line.textContent = '';
  }

  /** @param {boolean} value */
  function setAwaiting(value) {
    awaiting = value;
    element.dataset.awaiting = String(value);
  }

  /**
   * Reveal the rest of the line immediately, then stop.
   *
   * Narration WAITS here rather than rolling straight into the next line. Auto-advancing
   * meant the whole queue played out at typing speed and was gone before it could be
   * read — the pacing was decided for the visitor, and decided badly.
   */
  function finishTyping() {
    if (typing === null) return false;

    line.textContent = typing;
    cursor = typing.length;
    sound.lineDone();

    if (state === 'narrate') {
      setAwaiting(true);
    } else {
      // Asides are not paced by the visitor; they say their piece and go. Release
      // `typing` so the hold can count down — leaving it set means the next step
      // re-enters the typing branch, completes again, and resets the hold forever.
      typing = null;
      holdRemaining = REACTION_HOLD;
    }
    return true;
  }

  /**
   * What a click does, which depends on where the line is:
   *   mid-type  — show the rest of it now
   *   finished  — move on to the next line
   * So one gesture both skips and advances, and never skips something unread.
   */
  function nudge() {
    if (typing === null) return false;

    if (!awaiting) return finishTyping();

    commitToTranscript(typing);
    setAwaiting(false);
    advance();
    return true;
  }

  /**
   * Advance typing. Split from the rAF loop so it can be driven deterministically —
   * a hidden or throttled tab issues no frames at all.
   * @param {number} dt milliseconds
   */
  function step(dt) {
    if (typing === null) {
      if (holdRemaining > 0) {
        holdRemaining -= dt;
        if (holdRemaining <= 0) clear();
      }
      return;
    }

    // Fully typed and waiting to be told to continue — nothing to advance.
    if (awaiting) return;

    cursor += (CHARS_PER_SECOND * dt) / 1000;

    if (cursor >= typing.length) {
      finishTyping();
      return;
    }

    const revealed = Math.floor(cursor);
    if (revealed > lastRevealed) {
      lastRevealed = revealed;
      sound.blip();
    }
    line.textContent = typing.slice(0, revealed);
  }

  /**
   * Introduce a hub or section. Guided mode only — in hurry mode the lines are still
   * recorded, just not performed.
   * @param {string[]} lines
   */
  function say(lines) {
    if (!lines?.length) return;

    // Resets what is queued, but keeps the transcript. Successive narration within one
    // page accumulates into a single readable record — the robot commenting on the third
    // section should not erase what it said about the first. Only navigation, which calls
    // clear(), wipes it.
    queue = [];
    typing = null;
    holdRemaining = 0;
    setAwaiting(false);
    line.textContent = '';

    if (!isGuided()) {
      lastSayBranch = 'recorded-only';
      lines.forEach(commitToTranscript);
      setState('idle');
      return;
    }

    lastSayBranch = 'performed';
    setState('narrate');
    queue = [...lines];
    advance();
  }

  /**
   * A short aside about one thing. Not recorded, and it clears itself.
   * @param {string} text
   */
  function react(text) {
    if (!text || !isGuided()) return;
    clear();
    setState('react');
    queue = [];
    typing = text;
    cursor = 0;
    lastRevealed = 0;
    holdRemaining = 0;
    setAwaiting(false);
    line.textContent = '';
  }

  /** Wipe everything — used on navigation, so one room's narration never bleeds into the next. */
  function clear() {
    queue = [];
    typing = null;
    cursor = 0;
    holdRemaining = 0;
    setAwaiting(false);
    line.textContent = '';
    transcript.replaceChildren();
    setState('idle');
  }

  /** @param {MouseEvent} event */
  function onClick(event) {
    // Never steal a click meant for something interactive.
    if (/** @type {HTMLElement} */ (event.target)?.closest?.('a, button, input, select, textarea')) return;
    nudge();
  }

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    // Enter and Space do what a click does, so the dialogue is not mouse-only.
    if (event.key === 'Enter' || event.key === ' ') {
      // Only swallow the key while there is actually a line waiting, or Space stops
      // scrolling the page for everyone.
      if (typing !== null) {
        event.preventDefault();
        nudge();
      }
      return;
    }

    if (event.key !== 'Escape') return;

    // Escape abandons the rest of the queue. The lines are handed to the transcript, so
    // that nothing is lost — though while TRANSCRIPT_ENABLED is false that is a no-op and
    // Escape genuinely discards them. Acceptable for flavour narration; revisit if
    // anything load-bearing is ever spoken.
    if (typing !== null && state === 'narrate') commitToTranscript(typing);
    queue.forEach(commitToTranscript);
    queue = [];
    typing = null;
    setAwaiting(false);
    line.textContent = '';
    setState('idle');
  }

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);

  return {
    element,
    say,
    react,
    clear,
    step,
    /** Skip the typing, or advance to the next line — whichever the state calls for. */
    nudge,

    /**
     * Point the speech bubble at a screen position — the robot's camera head.
     *
     * Clamped to the viewport so a robot near an edge, or off it entirely, does not drag
     * its own dialogue out of view with it.
     *
     * @param {number} screenX @param {number} screenY
     */
    setAnchor(screenX, screenY) {
      const margin = 16;
      const halfWidth = bubble.offsetWidth / 2 || 140;
      const x = Math.max(halfWidth + margin, Math.min(window.innerWidth - halfWidth - margin, screenX));
      const y = Math.max(bubble.offsetHeight + margin + 24, Math.min(window.innerHeight - margin, screenY));

      element.style.setProperty('--anchor-x', `${x.toFixed(1)}px`);
      element.style.setProperty('--anchor-y', `${y.toFixed(1)}px`);
    },

    destroy() {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      element.remove();
    },

    debug: () => ({
      state,
      awaiting,
      lastSayBranch,
      transcriptEnabled: TRANSCRIPT_ENABLED,
      typing,
      visible: line.textContent,
      progress: typing ? +(cursor / typing.length).toFixed(2) : null,
      queued: queue.length,
      transcript: [...transcript.children].map((node) => node.textContent),
      holdRemaining: Math.round(holdRemaining),
    }),
  };
}
