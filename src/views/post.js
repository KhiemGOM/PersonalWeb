import { scaffold } from './shared.js';

/** @param {import('../core/router.js').ViewContext} ctx */
export const title = (ctx) => `${ctx.params.id} — Khiem`;

/** @param {import('../core/router.js').ViewContext} ctx */
export function render(ctx) {
  return scaffold({
    label: 'Blog',
    title: ctx.params.id,
    body: 'Markdown pipeline lands in Phase 2.',
    debug: { 'params.id': ctx.params.id },
    links: [{ href: '/blog', text: '← Blog' }],
  });
}
