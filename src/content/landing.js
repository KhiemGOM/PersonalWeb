/**
 * Landing page sections.
 *
 * One full-viewport section per stop on the robot's journey. Each hub section is a teaser
 * that hands off to the hub itself — the landing page introduces, it does not duplicate.
 *
 * `align` puts the text on the side opposite the robot's waypoint, so the two never
 * collide. Check ./journey.js when changing one.
 */

import { HUBS } from './hubs.js';
import { JOURNEY } from './journey.js';
import { itemsForHub } from './items.js';

/**
 * @typedef {Object} LandingSection
 * @property {string} id            Must match a `stop` in JOURNEY
 * @property {'intro' | 'hub' | 'page'} kind
 * @property {'left' | 'right' | 'center'} align
 * @property {string} [hub]         For kind 'hub'
 * @property {string} [label]
 * @property {string} [heading]
 * @property {string} [blurb]
 * @property {string} [href]
 * @property {string} [cta]
 * @property {string[]} [narration]  Spoken when the robot arrives here, guided mode only
 */

/** @type {LandingSection[]} */
export const SECTIONS = [
  {
    id: 'intro',
    kind: 'intro',
    align: 'center',
    label: 'Khiem Nguyen Dang',
    // TODO(copy): title wording still open — "Khiem's personal dimension" or an alternative.
    heading: "Khiem's personal dimension",
    blurb: 'Four rooms, one robot, and a job page that does not exist yet. Scroll.',
    // TODO(copy): this is also where the visitor-intent question goes in Phase 2.
    narration: [
      'Oh — hello. Give me a second, I was not expecting anyone.',
      'Right. I show people around this place. Four rooms, one of them a lie.',
      'Scroll whenever you like. I will keep up. Mostly.',
    ],
  },

  {
    id: 'projects',
    kind: 'hub',
    hub: 'projects',
    align: 'right',
    cta: 'Enter the lab',
    narration: ['The lab. Everything in here started as a problem he could not put down.'],
  },

  {
    id: 'academics',
    kind: 'hub',
    hub: 'academics',
    align: 'left',
    cta: 'Enter the library',
    narration: ['The library. Quieter. He reads more than he admits.'],
  },

  {
    id: 'competitions',
    kind: 'hub',
    hub: 'competitions',
    align: 'right',
    cta: 'Step onto the podium',
    narration: ['The podium. Mind the spotlight, it is a bit much.'],
  },

  {
    id: 'misc',
    kind: 'hub',
    hub: 'misc',
    align: 'left',
    cta: 'Into the pool',
    narration: ['And the pool, where everything that fit nowhere else ended up floating.'],
  },

  {
    id: 'about',
    kind: 'page',
    align: 'center',
    label: 'About',
    heading: 'And the person operating all this.',
    blurb: 'Theoretical physics, anime, Minecraft, and a redstone CPU that is going slowly.',
    href: '/about',
    cta: 'Meet him',
    narration: ['That is the tour. The person responsible is through here, if you want a word.'],
  },
];

/**
 * Resolve a section into what the view actually renders. Hub sections pull their copy
 * from the hub config and name a few of their own items, so nothing is written twice.
 *
 * @param {LandingSection} section
 */
export function resolveSection(section) {
  if (section.kind !== 'hub') {
    return {
      label: section.label ?? '',
      heading: section.heading ?? '',
      blurb: section.blurb ?? '',
      href: section.href,
      cta: section.cta,
      names: [],
    };
  }

  const hub = HUBS[section.hub ?? ''];
  const items = itemsForHub(section.hub ?? '');

  return {
    label: hub.title,
    heading: hub.kicker,
    blurb: '',
    href: `/${hub.slug}`,
    cta: section.cta,
    // Flagship first, then whatever else fits — a taste, not the full list.
    names: [...items].sort((a, b) => Number(b.flagship ?? 0) - Number(a.flagship ?? 0)).slice(0, 3).map((i) => i.title),
  };
}

// The robot's waypoints and the sections have to stay in lockstep: the path's progress
// values assume this exact section count, and each named stop assumes a section to stand
// at. Both fail silently — the robot simply walks to the wrong place.
if (import.meta.env.DEV) {
  const stops = JOURNEY.filter((w) => w.stop).map((w) => w.stop);
  const ids = SECTIONS.map((s) => s.id);

  const missing = ids.filter((id) => !stops.includes(id));
  const orphaned = stops.filter((stop) => !ids.includes(/** @type {string} */ (stop)));

  if (missing.length) console.error(`[landing] sections with no journey stop: ${missing.join(', ')}`);
  if (orphaned.length) console.error(`[landing] journey stops with no section: ${orphaned.join(', ')}`);

  for (const [i, id] of ids.entries()) {
    const expected = ids.length > 1 ? i / (ids.length - 1) : 0;
    const waypoint = JOURNEY.find((w) => w.stop === id);
    if (waypoint && Math.abs(waypoint.progress - expected) > 0.001) {
      console.error(
        `[landing] "${id}" is section ${i} of ${ids.length}, so its waypoint should sit at ` +
          `progress ${expected.toFixed(3)}, not ${waypoint.progress}`
      );
    }
  }
}
