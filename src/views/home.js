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
import '../styles/landing.css';

export const title = "Khiem's personal dimension";

/** @type {(() => void) | null} */
let unsubscribe = null;

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
      const section = SECTIONS.find((s) => s.id === stop);
      if (section?.narration) narrator?.say(section.narration);
    }) ?? null;

  // Say the opening line straight away; nothing has arrived anywhere yet.
  const intro = SECTIONS.find((s) => s.id === 'intro');
  if (intro?.narration) narrator?.say(intro.narration);

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
}
