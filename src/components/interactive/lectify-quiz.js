/**
 * Turn a prescripted paragraph into a typed-out multiple-choice question, then answer it.
 * Mount target for `lectify`. Scripted, not live AI, see lectify-quiz-logic.js.
 */

import { el } from '../../lib/dom.js';
import { PARAGRAPH, QUESTIONS } from './lectify-quiz-logic.js';
import './lectify-quiz.css';

/** Characters per second while typing, matching the robot's own narration pace. */
const CHARS_PER_SECOND = 42;

function prefersInstant() {
  return (
    document.documentElement.dataset.mode === 'hurry' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** @param {HTMLElement} container */
export function mount(container) {
  let questionIndex = 0;
  let typeTimer = null;
  /** @type {'idle' | 'typing' | 'answering' | 'answered'} */
  let phase = 'idle';

  const paragraphEl = el('p', { className: 'lquiz__paragraph' }, PARAGRAPH);
  const questionEl = el('p', {
    className: 'lquiz__question',
    onclick: () => skipTyping(),
  });
  const optionsEl = el('div', { className: 'lquiz__options' });
  const message = el('p', { className: 'lquiz__message' });
  const actionButton = el('button', {
    type: 'button',
    className: 'lquiz__button',
    onclick: () => onActionClick(),
  }, 'Generate a question');

  function onActionClick() {
    if (phase === 'idle' || phase === 'answered') {
      generate();
    }
  }

  function stopTyping() {
    if (typeTimer != null) {
      clearInterval(typeTimer);
      typeTimer = null;
    }
  }

  function skipTyping() {
    if (phase !== 'typing') return;
    stopTyping();
    questionEl.textContent = QUESTIONS[questionIndex].question;
    revealOptions();
  }

  function generate() {
    stopTyping();
    questionIndex = (questionIndex + 1) % QUESTIONS.length;
    optionsEl.replaceChildren();
    message.textContent = '';
    actionButton.textContent = 'Generate a question';
    questionEl.textContent = '';

    const text = QUESTIONS[questionIndex].question;

    if (prefersInstant()) {
      questionEl.textContent = text;
      revealOptions();
      return;
    }

    phase = 'typing';
    let cursor = 0;
    typeTimer = setInterval(() => {
      cursor += 1;
      questionEl.textContent = text.slice(0, cursor);
      if (cursor >= text.length) {
        stopTyping();
        revealOptions();
      }
    }, 1000 / CHARS_PER_SECOND);
  }

  function revealOptions() {
    phase = 'answering';
    const { options, correctIndex } = QUESTIONS[questionIndex];
    optionsEl.replaceChildren(
      ...options.map((option, index) =>
        el(
          'button',
          {
            type: 'button',
            className: 'lquiz__option',
            onclick: () => answer(index, correctIndex),
          },
          option
        )
      )
    );
  }

  function answer(chosenIndex, correctIndex) {
    if (phase !== 'answering') return;
    phase = 'answered';
    [...optionsEl.children].forEach((button, index) => {
      button.disabled = true;
      if (index === correctIndex) button.dataset.result = 'correct';
      else if (index === chosenIndex) button.dataset.result = 'wrong';
    });
    message.textContent = chosenIndex === correctIndex ? 'Correct.' : 'Not quite, correct answer highlighted.';
    actionButton.textContent = 'Another question';
  }

  container.append(paragraphEl, questionEl, optionsEl, message, actionButton);

  return {
    destroy() {
      stopTyping();
      container.replaceChildren();
    },
  };
}
