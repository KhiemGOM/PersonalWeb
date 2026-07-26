/**
 * Client router over the History API.
 *
 * Real paths, not hashes — the URL has to reflect actual content hierarchy
 * (`/projects/minecraft-pathfinding`, not `#/projects`). Vite's dev server does SPA
 * fallback by default; production gets the matching rewrite from vercel.json.
 *
 * The router only ever replaces the contents of its outlet (`#scene-root`). The robot,
 * narrator, and contact button live outside it and survive navigation — which is the
 * whole reason this project has a router instead of using Vite's multi-page mode.
 */

/**
 * @typedef {Object} ViewContext
 * @property {Record<string, string>} params  Values captured from `:name` segments
 * @property {URL} url
 * @property {Record<string, any>} meta  Static data from the route entry — lets the four
 *                                       hubs share one view module without sniffing the URL
 * @property {(path: string, opts?: NavigateOptions) => void} navigate
 *
 * @typedef {Object} View
 * @property {(ctx: ViewContext) => HTMLElement | Promise<HTMLElement>} render
 * @property {string | ((ctx: ViewContext) => string)} [title]
 * @property {() => void} [destroy]  Tear down listeners/timers before the next swap
 *
 * @typedef {Object} Route
 * @property {string} path            e.g. '/projects/:id'
 * @property {() => Promise<View>} load  Dynamic import, so views code-split
 * @property {Record<string, any>} [meta]  Passed through to the view untouched
 *
 * @typedef {Object} NavigateOptions
 * @property {boolean} [replace]  Replace the history entry instead of pushing
 */

/**
 * Turn '/projects/:id' into a matcher. Segment-wise so path separators and regex
 * metacharacters in literal segments are both handled correctly.
 * @param {string} pattern
 */
function compile(pattern) {
  /** @type {string[]} */
  const keys = [];
  const source = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return { rx: new RegExp(`^${source}/?$`), keys };
}

/**
 * @param {Object} config
 * @param {Route[]} config.routes
 * @param {Route} config.notFound        Rendered when nothing matches
 * @param {HTMLElement} config.outlet
 * @param {HTMLElement} [config.announcer]  aria-live region; navigation never reloads,
 *                                          so route changes are otherwise silent to AT
 * @param {(ctx: { from: string|null, to: string, route: Route }) => Promise<void>|void} [config.beforeSwap]
 * @param {(ctx: { to: string, route: Route }) => void} [config.afterSwap]
 */
export function createRouter(config) {
  const { routes, notFound, outlet, announcer, beforeSwap, afterSwap } = config;

  const compiled = routes.map((route) => ({ route, ...compile(route.path) }));

  /** @type {View | null} */
  let activeView = null;
  /** @type {string | null} */
  let activePath = null;

  // Guards against a slow dynamic import resolving after a newer navigation started.
  let navToken = 0;

  /**
   * @param {string} pathname
   * @returns {{ route: Route, params: Record<string, string> }}
   */
  function match(pathname) {
    // Normalize trailing slash so '/projects/' and '/projects' are the same route.
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

    for (const { route, rx, keys } of compiled) {
      const result = rx.exec(path);
      if (!result) continue;

      /** @type {Record<string, string>} */
      const params = {};
      keys.forEach((key, i) => {
        params[key] = decodeURIComponent(result[i + 1]);
      });
      return { route, params };
    }
    return { route: notFound, params: {} };
  }

  /**
   * @param {string} path
   * @param {NavigateOptions} [opts]
   */
  function navigate(path, opts = {}) {
    const url = new URL(path, window.location.origin);
    const same = url.pathname === window.location.pathname && url.search === window.location.search;

    if (!same) {
      history[opts.replace ? 'replaceState' : 'pushState']({}, '', url);
    }
    return render(url);
  }

  /**
   * @param {URL} url
   * @param {{ restoreScroll?: boolean }} [opts]
   */
  async function render(url, opts = {}) {
    const token = ++navToken;
    const { route, params } = match(url.pathname);

    /** @type {ViewContext} */
    const ctx = { params, url, meta: route.meta ?? {}, navigate };

    let view;
    try {
      view = await route.load();
    } catch (error) {
      // A failed chunk load is a broken deploy or a dead connection, not a 404 — a full
      // reload is the honest recovery, since the app's JS is what failed.
      console.error(`[router] failed to load view for ${url.pathname}`, error);
      window.location.assign(url.href);
      return;
    }
    if (token !== navToken) return;

    await beforeSwap?.({ from: activePath, to: url.pathname, route });
    if (token !== navToken) return;

    activeView?.destroy?.();

    const node = await view.render(ctx);
    if (token !== navToken) return;

    outlet.replaceChildren(node);
    activeView = view;
    activePath = url.pathname;

    const title = typeof view.title === 'function' ? view.title(ctx) : view.title;
    if (title) {
      document.title = title;
      if (announcer) announcer.textContent = title;
    }

    if (!opts.restoreScroll) window.scrollTo(0, 0);

    afterSwap?.({ to: url.pathname, route });
  }

  /** @param {MouseEvent} event */
  function onClick(event) {
    // Let the browser handle modified clicks — new tab, download, save link as.
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = /** @type {HTMLElement} */ (event.target)?.closest?.('a');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download') || anchor.hasAttribute('data-native')) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    navigate(url.pathname + url.search);
  }

  function onPopState() {
    // Back/forward: the browser restores scroll itself, so don't fight it.
    render(new URL(window.location.href), { restoreScroll: true });
  }

  function start() {
    // Own scroll position explicitly — the default 'auto' restores the previous page's
    // offset before the new view has rendered, which reads as a jump.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPopState);
    return render(new URL(window.location.href));
  }

  function stop() {
    document.removeEventListener('click', onClick);
    window.removeEventListener('popstate', onPopState);
    activeView?.destroy?.();
    activeView = null;
  }

  return { start, stop, navigate, match, get current() { return activePath; } };
}
