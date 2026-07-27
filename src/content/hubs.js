/**
 * The four hubs.
 *
 * Each is a background scene with hand-placed clickable objects. This file describes the
 * *scene* — its identity, its light source, its narration. The objects placed inside it
 * come from the item entries in ./items/, each of which declares which hub it belongs to.
 *
 * Adding a hub is one entry here plus a route in ../routes.js. Nothing else.
 */

/**
 * @typedef {Object} Hub
 * @property {string} slug
 * @property {string} title
 * @property {string} kicker        Short line under the title
 * @property {string} light         CSS token name for the scene's light source
 * @property {string} lightShape    How the light reads: 'spot' | 'wash' | 'pool'
 * @property {string} [background]  Scene art; placeholder until Phase 3
 * @property {string[]} narration   Robot hub intro, guided mode only. Said on first arrival.
 * @property {string[]} [revisit]   Said instead on later arrivals. Coming back to a room is
 *                                  worth acknowledging, but being introduced to it a second
 *                                  time is not — the robot should remember you were here.
 */

/** @type {Record<string, Hub>} */
export const HUBS = {
  projects: {
    slug: 'projects',
    title: 'Projects',
    kicker: 'Things I built on purpose.',
    light: '--light-lab',
    lightShape: 'wash',
    narration: [
      'The lab. Mind the cables.',
      'Everything on these shelves started as a problem he could not stop thinking about.',
    ],
    revisit: ['Back in the lab. Nothing has moved.'],
  },

  academics: {
    slug: 'academics',
    title: 'Academics',
    kicker: 'Research, coursework, and the reading that caused it.',
    light: '--light-library',
    lightShape: 'pool',
    narration: [
      'The library. Quieter in here.',
      'Fair warning: some of these books are about robots. I find that flattering.',
    ],
    revisit: ['The library again. Still quiet.'],
  },

  competitions: {
    slug: 'competitions',
    title: 'Competitions',
    kicker: 'Things I built under a deadline, with a scoreboard watching.',
    light: '--light-podium',
    lightShape: 'spot',
    narration: [
      'The podium. Spotlight is a bit much, I know.',
      'He kept the medals. I keep the memories of the practice rounds. Guess which is heavier.',
    ],
    revisit: ['Back on the podium. The spotlight missed you.'],
  },

  misc: {
    slug: 'misc',
    title: 'Misc',
    kicker: "The odd corners that didn't fit anywhere else.",
    light: '--light-pool',
    lightShape: 'pool',
    narration: [
      'Careful, this one swirls.',
      "Nothing here fit the other three rooms, so it all ended up floating. Very emergent of it.",
    ],
    revisit: ['The pool again. Something new may have drifted in. Probably not.'],
  },
};

/** @type {Hub[]} Stable order — drives hub teasers on the landing page. */
export const HUB_ORDER = [HUBS.projects, HUBS.academics, HUBS.competitions, HUBS.misc];

/**
 * @param {string} slug
 * @returns {Hub | undefined}
 */
export function getHub(slug) {
  return HUBS[slug];
}
