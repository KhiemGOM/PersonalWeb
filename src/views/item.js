import { createDetail, createDetailNotFound } from '../components/detail.js';
import { getHub } from '../content/hubs.js';
import { getItem } from '../content/items.js';
import { getNarrator } from '../core/shell.js';
import '../styles/detail.css';

/** @param {import('../core/router.js').ViewContext} ctx */
export const title = (ctx) => {
  const item = getItem(ctx.meta.hub, ctx.params.id);
  return `${item?.title ?? 'Not found'} — Khiem`;
};

/** @param {import('../core/router.js').ViewContext} ctx */
export function render(ctx) {
  const hub = getHub(ctx.meta.hub);
  const item = getItem(ctx.meta.hub, ctx.params.id);

  if (!item) return createDetailNotFound(ctx.params.id, hub);

  // The robot's line goes to the narrator as an aside — never into the page body. The
  // narrator decides whether to perform it; in hurry mode it is dropped entirely, which
  // is correct, because the description below already carries the substance.
  if (item.robotLine) getNarrator()?.react(item.robotLine);

  return createDetail(item, hub);
}
