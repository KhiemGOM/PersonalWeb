/**
 * Temporary scaffolding for Phase 1.
 *
 * Every view below is a stand-in that proves routing, params, and hierarchy work. Each
 * gets replaced by its real implementation as the primitives land — the scene renderer
 * takes over the hubs, the detail template takes over items, and so on.
 *
 * DELETE THIS FILE once no view imports it.
 */

import { el } from '../lib/dom.js';

/** @typedef {{ href: string, text: string } | { text: string, onClick: () => void }} SpecLink */

/**
 * @param {SpecLink[]} links
 */
function renderLinks(links) {
  return el(
    'nav',
    { className: 'scaffold__links' },
    links.map(({ href, text, onClick }) =>
      onClick
        ? el('button', { type: 'button', className: 'scaffold__link', onclick: onClick }, text)
        : el('a', { href, className: 'scaffold__link' }, text)
    )
  );
}

/**
 * @param {Object} spec
 * @param {{ href: string, text: string }} [spec.back]
 *   Pinned top-left, same convention as .detail__back / .scene__back — a page's own way
 *   back should never be just another item in a list of links at the bottom.
 * @param {string} spec.label      Uppercase kicker
 * @param {string} spec.title
 * @param {string} [spec.body]
 * @param {SpecLink[]} [spec.links]
 *   One undifferentiated list of links. A link with onClick instead of href renders as a
 *   button styled the same way — for actions that aren't navigation, like opening the
 *   contact panel. Use `sections` instead when the links are more than one kind of thing.
 * @param {{ label: string, links: SpecLink[] }[]} [spec.sections]
 *   Grouped links, each under its own small kicker — for a page with more than one kind of
 *   link (reading material vs. ways to get in touch, say), where lumping them into one
 *   list would blur a distinction that matters. Takes over from `links` when given.
 * @param {Record<string, string>} [spec.debug]  Route facts worth seeing while building
 */
export function scaffold(spec) {
  const { back, label, title, body, links = [], sections, debug } = spec;

  return el(
    'section',
    { className: 'scaffold', 'data-lit': '' },

    back && el('a', { className: 'scaffold__back', href: back.href }, back.text),

    el('p', { className: 'label' }, label),
    el('h1', { className: 'scaffold__title' }, title),
    body && el('p', { className: 'scaffold__body' }, body),

    debug &&
      el(
        'dl',
        { className: 'scaffold__debug' },
        Object.entries(debug).flatMap(([key, value]) => [
          el('dt', null, key),
          el('dd', null, value),
        ])
      ),

    sections
      ? el(
          'div',
          { className: 'scaffold__sections' },
          sections.map((section) =>
            el(
              'div',
              { className: 'scaffold__section' },
              el('p', { className: 'label' }, section.label),
              renderLinks(section.links)
            )
          )
        )
      : links.length > 0 && renderLinks(links)
  );
}
