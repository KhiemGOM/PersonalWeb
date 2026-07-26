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

/** Characters per second while typing. Fast enough to read along with. */
const CHARS_PER_SECOND = 42;

/** How long a reaction bubble lingers once fully typed, in ms. */
const REACTION_HOLD = 2600;

/** @typedef {ReturnType<typeof createNarrator>} Narrator */

/**
 * @param {Object} config
 * @param {HTMLElement} config.root  #narrator-root
 */
export function createNarrator(config) {
  const { root } = config;

  const line = el('p', { className: 'narrator__line' });
  // aria-hidden: the partially-typed text is an animation frame, not content. Screen
  // readers get whole lines from the transcript instead of a stream of fragments.
  const bubble = el('div', { className: 'narrator__bubble', 'aria-hidden': 'true' }, line);

  const transcript = el('ol', {
    className: 'narrator__transcript',
    'aria-live': 'polite',
    'aria-label': 'Robot transcript',
  });

  const element = el('div', { className: 'narrator', dataset: { state: 'idle' } }, transcript, bubble);
  root.appendChild(element);

  /** @type {string[]} */
  let queue = [];
  /** @type {string | null} */
  let typing = null;
  let cursor = 0;
  let holdRemaining = 0;
  /** @type {'idle' | 'narrate' | 'react'} */
  let state = 'idle';

  /** @param {'idle' | 'narrate' | 'react'} next */
  function setState(next) {
    state = next;
    element.dataset.state = next;
  }

  /** @param {string} text */
  function commitToTranscript(text) {
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
    line.textContent = '';
  }

  /** Finish the line being typed right now, without discarding the rest of the queue. */
  function completeCurrentLine() {
    if (typing === null) return false;

    line.textContent = typing;
    cursor = typing.length;

    if (state === 'narrate') {
      commitToTranscript(typing);
      advance();
    } else {
      // Release `typing` so the hold can actually count down. Leaving it set means the
      // next step re-enters the typing branch, finds the cursor already past the end,
      // completes again, and resets the hold — a reaction bubble that never clears.
      typing = null;
      holdRemaining = REACTION_HOLD;
    }
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

    cursor += (CHARS_PER_SECOND * dt) / 1000;

    if (cursor >= typing.length) {
      completeCurrentLine();
      return;
    }
    line.textContent = typing.slice(0, Math.floor(cursor));
  }

  /**
   * Introduce a hub or section. Guided mode only — in hurry mode the lines are still
   * recorded, just not performed.
   * @param {string[]} lines
   */
  function say(lines) {
    clear();
    if (!lines?.length) return;

    if (!isGuided()) {
      lines.forEach(commitToTranscript);
      setState('idle');
      return;
    }

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
    holdRemaining = 0;
    line.textContent = '';
  }

  /** Wipe everything — used on navigation, so one room's narration never bleeds into the next. */
  function clear() {
    queue = [];
    typing = null;
    cursor = 0;
    holdRemaining = 0;
    line.textContent = '';
    transcript.replaceChildren();
    setState('idle');
  }

  /** @param {MouseEvent} event */
  function onClick(event) {
    // Never steal a click meant for something interactive.
    if (/** @type {HTMLElement} */ (event.target)?.closest?.('a, button, input, select, textarea')) return;
    completeCurrentLine();
  }

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    // Escape abandons the whole queue, but keeps what has already been said — the
    // visitor wanted out of the animation, not to lose the content.
    if (typing !== null && state === 'narrate') commitToTranscript(typing);
    queue.forEach(commitToTranscript);
    queue = [];
    typing = null;
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
    skip: completeCurrentLine,

    destroy() {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      element.remove();
    },

    debug: () => ({
      state,
      typing,
      visible: line.textContent,
      progress: typing ? +(cursor / typing.length).toFixed(2) : null,
      queued: queue.length,
      transcript: [...transcript.children].map((node) => node.textContent),
      holdRemaining: Math.round(holdRemaining),
    }),
  };
}
