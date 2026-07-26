import { scaffold } from './shared.js';
import { getHub } from '../content/hubs.js';

/** @param {import('../core/router.js').ViewContext} ctx */
export const title = (ctx) => `${ctx.params.id} — Khiem`;

/** @param {import('../core/router.js').ViewContext} ctx */
export function render(ctx) {
  const hub = getHub(ctx.meta.hub);

  return scaffold({
    label: hub?.title ?? 'Item',
    title: ctx.params.id,
    body: 'One detail template will render every item from its content entry.',
    debug: { hub: ctx.meta.hub, 'params.id': ctx.params.id, path: ctx.url.pathname },
    links: [{ href: `/${ctx.meta.hub}`, text: `← ${hub?.title ?? 'Back'}` }],
  });
}
