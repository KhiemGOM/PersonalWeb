/**
 * Route table.
 *
 * URLs mirror content hierarchy: /projects → /projects/minecraft-pathfinding. The four
 * hubs share one view module and are distinguished by `meta.hub`, so adding a hub means
 * adding a HUBS entry and one line here.
 */

import { HUB_ORDER } from './content/hubs.js';

/** @type {import('./core/router.js').Route[]} */
export const routes = [
  {
    path: '/',
    load: () => import('./views/home.js'),
  },

  {
    path: '/about',
    load: () => import('./views/about.js'),
  },

  // Hubs and their detail pages, generated from the hub config.
  ...HUB_ORDER.flatMap((hub) => [
    {
      path: `/${hub.slug}`,
      load: () => import('./views/hub.js'),
      meta: { hub: hub.slug },
    },
    {
      path: `/${hub.slug}/:id`,
      load: () => import('./views/item.js'),
      meta: { hub: hub.slug },
    },
  ]),

  {
    path: '/blog',
    load: () => import('./views/blog.js'),
  },
  {
    path: '/blog/:id',
    load: () => import('./views/post.js'),
  },

  // Not a real page. A deliberate 404 gag where a job history would go — the robot trips
  // and the page reassembles into a pitch. See docs/CONCEPT.md.
  {
    path: '/experience',
    load: () => import('./views/experience.js'),
  },
];

/**
 * Anything unmatched. Kept distinct from /experience: the hire-me gag is a punchline about
 * employment specifically, and firing it at someone who simply mistyped a URL is confusing
 * rather than funny.
 * @type {import('./core/router.js').Route}
 */
export const notFound = {
  path: '*',
  load: () => import('./views/not-found.js'),
};
