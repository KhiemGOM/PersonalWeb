import { scaffold } from './shared.js';
import { getHub } from '../content/hubs.js';
import { getItem } from '../content/items.js';

/** @param {import('../core/router.js').ViewContext} ctx */
export const title = (ctx) => {
  const item = getItem(ctx.meta.hub, ctx.params.id);
  return `${item?.title ?? 'Not found'} — Khiem`;
};

/**
 * Still a placeholder, but reading real content now. The proper detail template — dense
 * body, links, interactive slot — is Phase 2.
 * @param {import('../core/router.js').ViewContext} ctx
 */
export function render(ctx) {
  const hub = getHub(ctx.meta.hub);
  const item = getItem(ctx.meta.hub, ctx.params.id);

  if (!item) {
    return scaffold({
      label: '404',
      title: 'No such thing.',
      body: `Nothing in ${hub?.title ?? 'this hub'} is called "${ctx.params.id}".`,
      links: [{ href: `/${ctx.meta.hub}`, text: `← ${hub?.title ?? 'Back'}` }],
    });
  }

  return scaffold({
    label: item.kicker,
    title: item.title,
    body: item.detail.join(' '),
    debug: {
      ...(item.interactive
        ? { interactive: `${item.interactive.label} (${item.interactive.status})` }
        : {}),
      ...(item.robotLine ? { 'robot line': item.robotLine } : {}),
    },
    links: [
      ...Object.entries(item.links).map(([name, href]) => ({ href, text: `${name} →` })),
      { href: `/${item.hub}`, text: `← ${hub?.title ?? 'Back'}` },
    ],
  });
}
