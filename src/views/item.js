import { createDetail, createDetailNotFound } from '../components/detail.js';
import { getInteractiveLoader } from '../components/interactive/registry.js';
import { getHub } from '../content/hubs.js';
import { getItem } from '../content/items.js';
import { getNarrator } from '../core/shell.js';
import { markSaid } from '../core/spoken.js';
import '../styles/detail.css';

/** @param {import('../core/router.js').ViewContext} ctx */
export const title = (ctx) => {
  const item = getItem(ctx.meta.hub, ctx.params.id);
  return `${item?.title ?? 'Not found'} · Khiem`;
};

/** @type {{ destroy(): void } | null} */
let activeInteractive = null;
// Bumped on every render/destroy so a chunk that resolves after the visitor has already
// navigated away never mounts into a detached node, same guard shape as the router's own
// navToken in src/core/router.js.
let mountToken = 0;

/** @param {import('../core/router.js').ViewContext} ctx */
export function render(ctx) {
  const hub = getHub(ctx.meta.hub);
  const item = getItem(ctx.meta.hub, ctx.params.id);

  activeInteractive = null;
  const token = ++mountToken;

  if (!item) return createDetailNotFound(ctx.params.id, hub);

  // The robot's line goes to the narrator as an aside — never into the page body. The
  // narrator decides whether to perform it; in hurry mode it is dropped entirely, which
  // is correct, because the description below already carries the substance.
  //
  // Once per item. A throwaway remark delivered again word for word every time the page
  // is reopened stops reading as an aside and starts reading as a stuck record.
  if (item.robotLine && markSaid(`item:${item.hub}/${item.id}`)) {
    getNarrator()?.react(item.robotLine);
  }

  const article = createDetail(item, hub);

  const load = item.interactive?.status === 'live' && getInteractiveLoader(item.id);
  const mountEl = load && article.querySelector('.detail__interactive-mount');
  if (load && mountEl) {
    load()
      .then((mod) => {
        if (token !== mountToken) return;
        activeInteractive = mod.mount(mountEl);
      })
      .catch((error) => console.error(`[item] failed to load interactive for ${item.id}`, error));

    // The robot's take on the widget, not the achievement itself — how the toy relates (or
    // doesn't) to the real thing. Fires on the first real interaction, not on scrolling past
    // it, and only once per item per session, same convention as robotLine above.
    const comment = item.interactive.robotComment;
    if (comment) {
      const onFirstInteraction = () => {
        mountEl.removeEventListener('pointerdown', onFirstInteraction);
        mountEl.removeEventListener('keydown', onFirstInteraction);
        if (markSaid(`interactive:${item.hub}/${item.id}`)) {
          getNarrator()?.react(comment);
        }
      };
      mountEl.addEventListener('pointerdown', onFirstInteraction, { once: true });
      mountEl.addEventListener('keydown', onFirstInteraction, { once: true });
    }
  }

  return article;
}

export function destroy() {
  mountToken++;
  activeInteractive?.destroy();
  activeInteractive = null;
}
