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
 * @param {string} spec.label      Uppercase kicker
 * @param {string} spec.title
 * @param {string} [spec.body]
 * @param {Array<{ href: string, text: string }>} [spec.links]
 * @param {Record<string, string>} [spec.debug]  Route facts worth seeing while building
 */
export function scaffold(spec) {
  const { label, title, body, links = [], debug } = spec;

  return el(
    'section',
    { className: 'scaffold' },
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

    links.length &&
      el(
        'nav',
        { className: 'scaffold__links' },
        links.map(({ href, text }) => el('a', { href, className: 'scaffold__link' }, text))
      )
  );
}
