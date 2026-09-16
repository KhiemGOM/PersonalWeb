/**
 * Landing page.
 *
 * One full-viewport section per stop on the robot's journey. Sections are transparent and
 * the robot lives in a fixed layer behind them, so scrolling moves the content past a
 * robot that walks its path in place.
 */

import { el } from '../lib/dom.js';
import { SECTIONS, resolveSection } from '../content/landing.js';
import { getNarrator, getRobot } from '../core/shell.js';
import { lockScroll, unlockScroll } from '../core/scroll-lock.js';
import { markSaid } from '../core/spoken.js';
import * as visitor from '../core/visitor-mode.js';
import '../styles/landing.css';

export const title = "Khiem's personal dimension";

/** @type {(() => void) | null} */
let unsubscribe = null;

const INTRO_HOLD = 'intro-dialogue';

/** @param {import('../content/landing.js').LandingSection} section */
function renderSection(section) {
  const { label, heading, blurb, href, cta, names } = resolveSection(section);

  return el(
    'section',
    {
      className: 'landing__section',
      id: section.id,
      dataset: { align: section.align, kind: section.kind },
    },
    el(
      'div',
      { className: 'landing__text', 'data-lit': '' },
      label && el('p', { className: 'label' }, label),
      el(section.kind === 'intro' ? 'h1' : 'h2', { className: 'landing__heading' }, heading),
      blurb && el('p', { className: 'landing__blurb' }, blurb),

      names.length > 0 &&
        el(
          'ul',
          { className: 'landing__names' },
          names.map((name) => el('li', null, name))
        ),

      href && cta && el('a', { className: 'landing__enter', href }, `${cta} →`)
    )
  );
}

export function render() {
  const narrator = getNarrator();
  const robot = getRobot();

  // The robot comments as it arrives at each section, rather than only on entry to a
  // page. Driven off the robot's own arrival rather than the scroll position, so what it
  // says matches where it actually is — it trails the scroll, and announcing a section it
  // has not reached yet would give the game away.
  unsubscribe?.();
  unsubscribe =
    robot?.onStopChange((stop) => {
      if (!stop) return;
      const section = SECTIONS.find((s) => s.id === stop);
      if (!section?.narration) return;
      if (!markSaid(`landing:${stop}`)) return;
      narrator?.say(section.narration);
    }) ?? null;

  // The opening, once. Scrolling is held until the robot has finished saying it, and —
  // for a first-time visitor — until they've answered the visitor-intent question that
  // follows it (docs/CONCEPT.md, "Visitor branch"). Released on completion, which in
  // hurry mode is immediately, since nothing is performed at all.
  const intro = SECTIONS.find((s) => s.id === 'intro');
  if (intro?.narration && markSaid(`landing:${intro.id}`)) {
    lockScroll(INTRO_HOLD, { direction: 'forward', maxMs: 60000 });
    narrator?.say(intro.narration, {
      onComplete: () => {
        if (!visitor.needsAsk()) {
          unlockScroll(INTRO_HOLD);
          return;
        }

        // The scroll lock only stops scroll gestures — a hub link sitting further down
        // the page is still reachable by Tab and, once focused, Enter navigates straight
        // through it, which would ship the visitor off before the question is answered.
        // Inert takes the whole scene out of the tab order and off pointer events until
        // there is a choice to hand back to it.
        const scene = document.getElementById('scene-root');
        scene?.setAttribute('inert', '');

        narrator.ask(
          "What's the purpose of your visit today?",
          [
            // Guided is the intended default experience, so it reads as the obvious
            // press — hurry is there for anyone who really wants it, not offered evenly.
            // Each reply plays before the mode actually takes effect, so the choice gets
            // acknowledged rather than the bubble just vanishing into the next thing.
            {
              // Short enough to sit on one line in the bubble — "lead me" carries the
              // same intent as the fuller CONCEPT.md phrasing without the wrap.
              label: 'Show me around',
              value: visitor.MODES.GUIDED,
              variant: 'primary',
              reply: "Good. Scroll whenever you like. I'll keep up. Mostly.",
            },
            {
              label: "I'm in a hurry",
              value: visitor.MODES.HURRY,
              variant: 'secondary',
              reply: "Noted. We could've taken our time, but hurry it is.",
            },
          ],
          {
            onChoose: (mode) => visitor.choose(mode),
            onComplete: () => {
              scene?.removeAttribute('inert');
              unlockScroll(INTRO_HOLD);
            },
          }
        );
      },
    });
  }

  return el(
    'div',
    { className: 'landing' },
    SECTIONS.map(renderSection),
    el(
      'p',
      { className: 'landing__hint', 'aria-hidden': 'true' },
      el('span', { className: 'landing__hint-label' }, 'Scroll'),
      // Fills while a new section is holding the visitor, so the pause is legibly a
      // pause rather than the page having stopped working.
      el('span', { className: 'landing__hint-bar', 'data-dwell-progress': '' })
    )
  );
}

export function destroy() {
  unsubscribe?.();
  unsubscribe = null;
  // Leaving mid-introduction must not carry the hold to the next page. #scene-root is the
  // router's outlet, not this view's own element — an inert left set here would silently
  // disable every view that swaps in after it.
  unlockScroll(INTRO_HOLD);
  document.getElementById('scene-root')?.removeAttribute('inert');
}
