/**
 * Misc — the whirling pool scene.
 * Sparse on purpose: this hub is for what genuinely fits nowhere else, so it grows only
 * when something actually arrives. Do not pad it.
 * @type {import('../items.js').Item[]}
 */
export default [
  {
    id: 'emergence-loop',
    hub: 'misc',
    title: 'Emergence Loop',
    kicker: 'Preprint · philosophy of science · Zenodo',
    blurb: 'A preprint, and a reply from someone whose books he had been reading.',
    flagship: true,
    scene: { x: 0.5, y: 0.5, scale: 1.1 },
    links: {},
    robotLine: 'He wrote about emergence and a real philosopher wrote back. I would have fainted.',
    detail: [
      // TODO(copy): the actual argument, in two or three dense sentences.
      'A preprint in the philosophy of science, published on Zenodo.',
      'Jeremy Butterfield replied.',
    ],
    interactive: { label: 'Zoom from Planck scale to the cosmic web', status: 'planned' },
  },
];
