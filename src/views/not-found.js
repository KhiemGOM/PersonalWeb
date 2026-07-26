import { scaffold } from './shared.js';

export const title = 'Lost — Khiem';

/** @param {import('../core/router.js').ViewContext} ctx */
export function render(ctx) {
  return scaffold({
    label: '404',
    title: 'Nothing here.',
    body: 'This corner of the dimension does not exist. The robot checked twice.',
    debug: { requested: ctx.url.pathname },
    links: [{ href: '/', text: '← Home' }],
  });
}
