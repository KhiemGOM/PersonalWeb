/**
 * Landing page.
 *
 * One full-viewport section per stop on the robot's journey. Sections are transparent and
 * the robot lives in a fixed layer behind them, so scrolling moves the content past a
 * robot that walks its path in place.
 */

import { el } from '../lib/dom.js';
import { SECTIONS, resolveSection } from '../content/landing.js';
import '../styles/landing.css';

export const title = "Khiem's personal dimension";

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
      { className: 'landing__text' },
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
  return el(
    'div',
    { className: 'landing' },
    SECTIONS.map(renderSection),
    el('p', { className: 'landing__hint', 'aria-hidden': 'true' }, 'Scroll')
  );
}
