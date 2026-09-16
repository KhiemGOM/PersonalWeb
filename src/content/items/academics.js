/**
 * Academics — the library scene.
 * Deliberately light touch, not a CV dump (docs/CONCEPT.md).
 * @type {import('../items.js').Item[]}
 */
export default [
  {
    id: 'undergraduate-research',
    hub: 'academics',
    title: 'Undergraduate Research',
    kicker: 'Embodied AI · task and motion planning · under Prof. Yoonchang Sung',
    blurb: "I work on robot-manipulation data augmentation as a research assistant.",
    flagship: true,
    scene: { x: 0.35, y: 0.52, scale: 1.1 },
    links: {},
    robotLine: 'Task and motion planning: the part where I work out how to pick things up.',
    detail: [
      // TODO(copy): what the RA work actually produced, and what stayed unsolved.
      "I'm a research assistant under **Prof. Yoonchang Sung**, working on embodied AI and task and motion planning.",
      'My work spans `MimicGen`, `SkillGen`, and `YODO`, focused on robot-manipulation data augmentation.',
    ],
  },

  {
    id: 'coursework',
    hub: 'academics',
    title: 'Coursework',
    kicker: 'NTU Data Science and AI · ASEAN Scholarship',
    blurb: 'Context on my studies, not a transcript.',
    scene: { x: 0.62, y: 0.6, scale: 0.85 },
    links: {},
    robotLine: 'He insisted this stay short. I respect that.',
    detail: ["I'm studying Data Science and Artificial Intelligence at **NTU**, on an **ASEAN Scholarship**."],
  },
];
