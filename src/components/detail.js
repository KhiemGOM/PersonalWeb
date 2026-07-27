/**
 * Detail page — one template, every achievement.
 *
 * The dividing line this file exists to hold (docs/CONCEPT.md):
 *
 *   Description is what is written here. Dense, skimmable, never dialogue-styled, and
 *   always present regardless of visitor mode — someone in a hurry came for exactly this.
 *
 *   Dialogue is the robot's, and it lives in the narrator. The item's `robotLine` is an
 *   aside delivered there, deliberately NOT rendered into this page. Mixing them turns
 *   dense copy into a performance and makes the whole thing slower to read.
 *
 * Everything below is driven by one content entry, so adding an achievement never means
 * touching layout.
 */

import { el } from '../lib/dom.js';
import { parseParagraph, richText } from '../lib/richtext.js';

/**
 * @param {import('../content/items.js').Item} item
 * @param {import('../content/hubs.js').Hub | undefined} hub
 */
export function createDetail(item, hub) {
  const links = Object.entries(item.links ?? {});

  return el(
    'article',
    { className: 'detail', 'data-lit': '', dataset: { hub: item.hub } },

    el(
      'a',
      { className: 'detail__back', href: `/${item.hub}` },
      `← ${hub?.title ?? 'Back'}`
    ),

    el(
      'header',
      { className: 'detail__header' },
      el('p', { className: 'label detail__kicker' }, item.kicker),
      el('h1', { className: 'detail__title' }, item.title),
      item.blurb && el('p', { className: 'detail__blurb' }, item.blurb)
    ),

    // The dense part. Paragraphs, not dialogue. A "> " prefix pulls a line out of the
    // flow instead of leaving every sentence at the same visual weight.
    el(
      'div',
      { className: 'detail__body' },
      item.detail.map((paragraph) => {
        const { pull, text } = parseParagraph(paragraph);
        return el('p', { className: pull ? 'detail__pull' : undefined }, ...richText(text));
      })
    ),

    links.length > 0 &&
      el(
        'nav',
        { className: 'detail__links', 'aria-label': 'Related' },
        links.map(([name, href]) =>
          el('a', { className: 'detail__link', href }, `${name} →`)
        )
      ),

    // Interactive slot. Named honestly rather than promised vaguely: the label says what
    // the visitor would get to do, and the status says whether it exists yet.
    item.interactive &&
      el(
        'section',
        { className: 'detail__interactive', dataset: { status: item.interactive.status } },
        el('p', { className: 'label' }, 'Interactive'),
        el('p', { className: 'detail__interactive-label' }, item.interactive.label),
        el(
          'p',
          { className: 'detail__interactive-status' },
          item.interactive.status === 'live'
            ? ''
            : item.interactive.status === 'planned'
              ? 'Not built yet.'
              : 'Still deciding what this should be.'
        )
      )
  );
}

/**
 * Shown when a slug does not resolve. Kept in this file so the not-found case stays
 * visually part of the hub it was reached from.
 *
 * @param {string} slug
 * @param {import('../content/hubs.js').Hub | undefined} hub
 */
export function createDetailNotFound(slug, hub) {
  return el(
    'article',
    { className: 'detail' },
    el('a', { className: 'detail__back', href: hub ? `/${hub.slug}` : '/' }, `← ${hub?.title ?? 'Home'}`),
    el(
      'header',
      { className: 'detail__header' },
      el('p', { className: 'label detail__kicker' }, '404'),
      el('h1', { className: 'detail__title' }, 'No such thing.'),
      el(
        'p',
        { className: 'detail__blurb' },
        `Nothing in ${hub?.title ?? 'this room'} is called “${slug}”.`
      )
    )
  );
}
