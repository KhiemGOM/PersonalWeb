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
 * Records that a reload has already been attempted for a path, so a permanently broken
 * chunk surfaces an error instead of looping. Session-scoped: a later visit gets to try
 * the reload again, since by then the deploy may well be fixed.
 */
const GUARD_KEY = 'router.reloadAttempt';

function readGuard() {
  try {
    return sessionStorage.getItem(GUARD_KEY);
  } catch {
    return null;
  }
}

/** @param {string} path */
function writeGuard(path) {
  try {
    sessionStorage.setItem(GUARD_KEY, path);
  } catch {
    /* Without storage we cannot detect the loop, but one reload is still the right try. */
  }
}

function clearGuard() {
  try {
    sessionStorage.removeItem(GUARD_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Last-resort UI when a view cannot be loaded even after a reload.
 * Deliberately plain: whatever is broken, this must not depend on it.
 * @param {URL} url
 */
function loadFailure(url) {
  const node = document.createElement('section');
  node.style.cssText = 'min-height:100dvh;display:grid;place-content:center;gap:1rem;text-align:center;padding:2rem';
  node.innerHTML =
    '<p style="letter-spacing:.2em;text-transform:uppercase;font-size:.85rem;opacity:.6">Something broke</p>' +
    '<h1>This page would not load.</h1>' +
    `<p style="opacity:.7;max-width:44ch;margin-inline:auto">Reloading did not help, so it is on my end, not yours. ` +
    `<a href="/" style="color:var(--accent, #00c4a0)" data-native>Go back home</a>.</p>`;
  console.error(`[router] giving up on ${url.pathname} after a reload attempt`);
  return node;
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

  /**
   * Where the visitor was on each path they have been.
   *
   * Leaving a page and coming back should land where they left off, not at the top —
   * otherwise going home from a hub reads as starting the site over rather than
   * returning to it, and on a six-section landing page that means scrolling all the way
   * back down to where you already were.
   *
   * Keyed by path and kept for the session, so this covers link clicks as well as
   * browser back. `history.scrollRestoration` is set to manual precisely because the
   * browser's own version cannot help here: it restores before the new view has
   * rendered, when the page is still the wrong height.
   *
   * @type {Map<string, number>}
   */
  const scrollMemory = new Map();

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
      // A failed chunk load usually means a stale deploy: the HTML references hashed
      // filenames that no longer exist. One reload fixes that by fetching fresh HTML.
      //
      // But reloading unconditionally is a trap — if the chunk is genuinely gone, the
      // reload fails identically and the browser loops forever. So the attempt is
      // recorded, and a second failure on the same path surfaces the error instead.
      console.error(`[router] failed to load view for ${url.pathname}`, error);

      if (readGuard() === url.pathname) {
        clearGuard();
        outlet.replaceChildren(loadFailure(url));
        return;
      }

      writeGuard(url.pathname);
      window.location.assign(url.href);
      return;
    }
    clearGuard();
    if (token !== navToken) return;

    // Note where they were before anything replaces it. Captured here rather than on the
    // way out of a link click, so it covers every route away from this page — browser
    // back, a keyboard shortcut, anything.
    if (activePath !== null) scrollMemory.set(activePath, window.scrollY);

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

    restoreScroll(url.pathname);

    afterSwap?.({ to: url.pathname, route });
  }

  /**
   * Put the visitor back where they were on this path, or at the top if they have not
   * been here before.
   *
   * The new view has only just been inserted, so the document is still whatever height
   * the old one was until layout runs — scrolling before that gets clamped to the
   * previous page's maximum, and going home from a hub lands near the top regardless of
   * what was remembered.
   *
   * Reading scrollHeight forces layout synchronously, which is enough. Deferring to the
   * next animation frame also works and was tried first, but it makes the restore depend
   * on the browser actually producing a frame: a throttled or backgrounded tab simply
   * never runs the callback and the position is silently lost.
   *
   * @param {string} path
   */
  function restoreScroll(path) {
    const remembered = scrollMemory.get(path) ?? 0;
    if (remembered === 0) {
      window.scrollTo(0, 0);
      return;
    }

    const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(remembered, limit));
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
