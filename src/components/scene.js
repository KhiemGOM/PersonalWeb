/**
 * Hub scene renderer.
 *
 * One implementation, four hubs. Takes a hub config plus its items and produces a
 * backdrop, a light source, and hand-placed clickable objects.
 *
 * Three decisions worth knowing:
 *
 * 1. Objects are real <a> elements, not canvas draws. Keyboard focus, screen-reader
 *    labels, middle-click-to-new-tab, and the router's link interception all come free.
 *    A canvas scene would need every one of those rebuilt by hand.
 *
 * 2. Positions are normalized 0–1 against an aspect-locked stage. The stage is
 *    letterboxed to fit, so an object placed at (0.24, 0.58) sits in the same spot
 *    relative to the art at every viewport size.
 *
 * 3. The hover affordance is defined once in scene.css and applied to every object, so
 *    the interaction is learned once and holds across all four hubs.
 */

import { el } from '../lib/dom.js';

/** Stage aspect ratio. Scene art is composed against this. */
export const STAGE_RATIO = 16 / 9;

/**
 * Deterministic small integer from a string — same input, same output across reloads.
 * Used to vary placeholder shapes and idle-bob phase per item, so objects don't pulse in
 * unison like a row of blinking lights.
 * @param {string} value
 */
function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Placeholder art: a wobbly blob, deterministic per item.
 *
 * Stands in for hand-drawn assets until Phase 3. Asymmetric border-radius reads closer to
 * the wiggly webtoon register than a circle would, and keeps the eventual real art from
 * looking like a surprise.
 * @param {import('../content/items.js').Item} item
 */
function placeholderArt(item) {
  const h = hash(item.id);
  const radii = [0, 1, 2, 3].map((i) => 38 + ((h >> (i * 3)) % 34));

  return el('span', {
    className: 'scene__blob',
    'aria-hidden': 'true',
    style: {
      borderRadius: `${radii[0]}% ${radii[1]}% ${radii[2]}% ${radii[3]}% / ${radii[2]}% ${radii[3]}% ${radii[0]}% ${radii[1]}%`,
    },
  });
}

/**
 * @param {import('../content/items.js').Item} item
 */
function sceneObject(item) {
  const { x, y, scale = 1, art } = item.scene;
  const phase = hash(item.id) % 4000;

  return el(
    'a',
    {
      className: 'scene__object',
      href: `/${item.hub}/${item.id}`,
      dataset: { id: item.id, flagship: item.flagship ? 'true' : 'false' },
      style: {
        '--x': String(x),
        '--y': String(y),
        '--scale': String(scale),
        // Offsetting each object's idle bob keeps the scene from breathing in unison.
        '--bob-delay': `-${phase}ms`,
      },
    },
    art
      ? el('img', { className: 'scene__art', src: art, alt: '', loading: 'lazy', decoding: 'async' })
      : placeholderArt(item),

    el(
      'span',
      { className: 'scene__caption' },
      el('span', { className: 'scene__name' }, item.title),
      el('span', { className: 'scene__blurb' }, item.blurb)
    )
  );
}

/**
 * @param {Object} config
 * @param {import('../content/hubs.js').Hub} config.hub
 * @param {import('../content/items.js').Item[]} config.items
 * @returns {{ element: HTMLElement, destroy: () => void }}
 */
export function createScene(config) {
  const { hub, items } = config;

  const stage = el(
    'div',
    { className: 'scene__stage', role: 'list', 'data-lit': '' },
    items.map((item) => {
      const object = sceneObject(item);
      object.setAttribute('role', 'listitem');
      return object;
    })
  );

  const element = el(
    'div',
    {
      className: 'scene',
      dataset: { hub: hub.slug, lightShape: hub.lightShape },
      style: { '--scene-light': `var(${hub.light})` },
    },

    el('div', { className: 'scene__backdrop', 'aria-hidden': 'true' }),
    el('div', { className: 'scene__light', 'aria-hidden': 'true' }),

    el(
      'header',
      { className: 'scene__header' },
      el('a', { className: 'scene__back', href: '/' }, '← Home'),
      el('p', { className: 'label' }, hub.title),
      el('h1', { className: 'scene__title' }, hub.kicker)
    ),

    stage,

    items.length === 0 &&
      el('p', { className: 'scene__empty' }, 'Nothing in this room yet.')
  );

  return {
    element,
    destroy() {
      // Nothing to unbind: navigation is delegated at the document level by the router,
      // and the idle bob is pure CSS. Kept so the view contract stays uniform.
    },
  };
}
