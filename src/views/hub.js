import { createScene } from '../components/scene.js';
import { getHub } from '../content/hubs.js';
import { itemsForHub } from '../content/items.js';
import '../styles/scene.css';

/** @param {import('../core/router.js').ViewContext} ctx */
export const title = (ctx) => `${getHub(ctx.meta.hub)?.title ?? 'Hub'} — Khiem`;

/** @type {{ destroy: () => void } | null} */
let active = null;

/** @param {import('../core/router.js').ViewContext} ctx */
export function render(ctx) {
  const hub = getHub(ctx.meta.hub);
  if (!hub) throw new Error(`route declared unknown hub: ${ctx.meta.hub}`);

  const scene = createScene({ hub, items: itemsForHub(hub.slug) });
  active = scene;
  return scene.element;
}

export function destroy() {
  active?.destroy();
  active = null;
}
