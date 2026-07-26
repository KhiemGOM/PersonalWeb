import { createScene } from '../components/scene.js';
import { getHub } from '../content/hubs.js';
import { itemsForHub } from '../content/items.js';
import { getNarrator } from '../core/shell.js';
import { markSaid } from '../core/spoken.js';
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

  // Introduce the room the first time; acknowledge it thereafter. Replaying a full
  // introduction to somewhere the visitor has already been makes the robot look like it
  // has no memory of the last thirty seconds.
  //
  // The narrator still decides whether to perform any of it or merely record it — that is
  // a visitor-mode question, not a view one.
  const firstVisit = markSaid(`hub:${hub.slug}`);
  const lines = firstVisit ? hub.narration : hub.revisit;
  if (lines?.length) getNarrator()?.say(lines);

  return scene.element;
}

export function destroy() {
  active?.destroy();
  active = null;
}
