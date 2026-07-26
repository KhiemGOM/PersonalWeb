import { scaffold } from './shared.js';
import { getHub } from '../content/hubs.js';

/** @param {import('../core/router.js').ViewContext} ctx */
export const title = (ctx) => `${getHub(ctx.meta.hub)?.title ?? 'Hub'} — Khiem`;

/** @param {import('../core/router.js').ViewContext} ctx */
export function render(ctx) {
  const hub = getHub(ctx.meta.hub);
  if (!hub) throw new Error(`route declared unknown hub: ${ctx.meta.hub}`);

  return scaffold({
    label: hub.title,
    title: hub.kicker,
    body: 'The scene renderer replaces this: a background with hand-placed clickable objects.',
    debug: { hub: hub.slug, light: hub.light, shape: hub.lightShape },
    links: [
      { href: `/${hub.slug}/sample-item`, text: 'Open a sample item →' },
      { href: '/', text: '← Home' },
    ],
  });
}
