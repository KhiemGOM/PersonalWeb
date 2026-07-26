/**
 * Item registry.
 *
 * One entry per achievement, carrying everything about it: where it sits in its hub
 * scene, its detail copy, the robot's reaction, and any crosslink. Adding an achievement
 * is one entry in the matching ./items/<hub>.js file — never a layout change, and never a
 * second copy of the title somewhere else.
 *
 * Files are discovered by glob, so there is no index to keep in sync.
 */

import { HUBS } from './hubs.js';

/**
 * @typedef {Object} ScenePlacement
 * @property {number} x        0–1 across the stage
 * @property {number} y        0–1 down the stage
 * @property {number} [scale]  Relative size, default 1. Flagships sit slightly larger.
 * @property {string} [art]    Asset path. Absent = procedural placeholder (Phase 3).
 *
 * @typedef {Object} Interactive
 * @property {string} label    What the visitor gets to do
 * @property {'planned' | 'undecided' | 'live'} status
 *
 * @typedef {Object} Item
 * @property {string} id       URL segment; unique within its hub
 * @property {string} hub
 * @property {string} title
 * @property {string} kicker   One dense line of context
 * @property {string} blurb    Shown on hover in the hub scene
 * @property {string[]} detail Dense and skimmable. Never dialogue-styled.
 * @property {ScenePlacement} scene
 * @property {Record<string, string>} links
 * @property {string} [robotLine]  Short reaction, guided mode only
 * @property {boolean} [flagship]
 * @property {Interactive} [interactive]
 */

/** @type {Record<string, { default: Item[] }>} */
const modules = import.meta.glob('./items/*.js', { eager: true });

/** @type {Item[]} */
export const ITEMS = Object.values(modules).flatMap((module) => module.default ?? []);

/** @type {Map<string, Item>} keyed `${hub}/${id}` */
const byPath = new Map(ITEMS.map((item) => [`${item.hub}/${item.id}`, item]));

/**
 * @param {string} hubSlug
 * @returns {Item[]}
 */
export function itemsForHub(hubSlug) {
  return ITEMS.filter((item) => item.hub === hubSlug);
}

/**
 * @param {string} hubSlug
 * @param {string} id
 * @returns {Item | undefined}
 */
export function getItem(hubSlug, id) {
  return byPath.get(`${hubSlug}/${id}`);
}

// Scene coordinates are placed by hand, and a typo there fails silently — the object just
// renders off-stage or on top of another one. These checks run in dev only.
if (import.meta.env.DEV) {
  const seen = new Set();

  for (const item of ITEMS) {
    const where = `${item.hub}/${item.id}`;

    if (!HUBS[item.hub]) {
      console.error(`[content] ${where}: unknown hub "${item.hub}"`);
    }
    if (seen.has(where)) {
      console.error(`[content] duplicate item: ${where}`);
    }
    seen.add(where);

    const { x, y } = item.scene ?? {};
    if (!(x >= 0 && x <= 1) || !(y >= 0 && y <= 1)) {
      console.error(`[content] ${where}: scene coords must be 0–1, got (${x}, ${y})`);
    }
  }

  // Objects closer than this overlap badly enough to be hard to click apart.
  const MIN_SEPARATION = 0.09;
  for (const hub of Object.keys(HUBS)) {
    const placed = itemsForHub(hub);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i].scene;
        const b = placed[j].scene;
        if (Math.hypot(a.x - b.x, a.y - b.y) < MIN_SEPARATION) {
          console.warn(
            `[content] ${hub}: "${placed[i].id}" and "${placed[j].id}" are placed very close together`
          );
        }
      }
    }
  }
}
