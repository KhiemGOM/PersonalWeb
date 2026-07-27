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

/**
 * @param {Object} spec
 * @param {{ href: string, text: string }} [spec.back]
 *   Pinned top-left, same convention as .detail__back / .scene__back — a page's own way
 *   back should never be just another item in a list of links at the bottom.
 * @param {string} spec.label      Uppercase kicker
 * @param {string} spec.title
 * @param {string} [spec.body]
 * @param {Array<{ href: string, text: string } | { text: string, onClick: () => void }>} [spec.links]
 *   A link with onClick instead of href renders as a button styled the same way — for
 *   actions that aren't navigation, like opening the contact panel.
 * @param {Record<string, string>} [spec.debug]  Route facts worth seeing while building
 */
export function scaffold(spec) {
  const { back, label, title, body, links = [], debug } = spec;

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

    links.length > 0 &&
      el(
        'nav',
        { className: 'scaffold__links' },
        links.map(({ href, text, onClick }) =>
          onClick
            ? el('button', { type: 'button', className: 'scaffold__link', onclick: onClick }, text)
            : el('a', { href, className: 'scaffold__link' }, text)
        )
      )
  );
}
