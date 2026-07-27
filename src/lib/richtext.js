/**
 * Minimal inline markup for body copy: item detail paragraphs, blog posts.
 *
 * `**bold**`, `*italic*`, `` `code` `` — parsed into real DOM nodes, never innerHTML, so
 * there is no injection risk from running it over content-as-data strings. A dedicated
 * markdown parser would be overkill for three inline forms; this is a couple of lines of
 * regex on purpose.
 */

import { el } from './dom.js';

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

/**
 * @param {string} text
 * @returns {(Node | string)[]}
 */
export function richText(text) {
  /** @type {(Node | string)[]} */
  const nodes = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE)) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const [, code, bold, italic] = match;
    if (code !== undefined) nodes.push(el('code', null, code));
    else if (bold !== undefined) nodes.push(el('strong', null, bold));
    else if (italic !== undefined) nodes.push(el('em', null, italic));

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * A paragraph prefixed with "> " renders as a pulled-out line instead of body text — a
 * beat worth landing on its own, not just another sentence in the paragraph flow.
 * @param {string} paragraph
 * @returns {{ pull: boolean, text: string }}
 */
export function parseParagraph(paragraph) {
  if (paragraph.startsWith('> ')) return { pull: true, text: paragraph.slice(2) };
  return { pull: false, text: paragraph };
}
