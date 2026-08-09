/**
 * Projects — the STEM lab scene.
 * @type {import('../items.js').Item[]}
 */
export default [
  {
    id: 'minecraft-pathfinding',
    hub: 'projects',
    title: 'Minecraft Pathfinding',
    kicker: 'Python + Java · A* with an air-potential heuristic',
    blurb: 'I gave the agent permission to dig through the world, then had to teach it how to get anywhere anyway.',
    flagship: true,
    scene: { x: 0.24, y: 0.58, scale: 1.15 },
    links: { blog: '/blog/minecraft-pathfinding' },
    robotLine: 'He taught a computer to take shortcuts. I take notes.',
    detail: [
      "I ran `A*` over a world where the terrain isn't fixed: blocks can be mined, so the cost of a path depends on what the agent is willing to destroy to get there. Letting it dig anywhere turned every neighboring block into a possible move, and node expansions *went insane* before the search finished a single path.",
      "The **air-potential heuristic** I added scores the open space ahead of the agent, pricing tunnelling as expensive by default so it only survives where digging is genuinely the shorter route.",
    ],
    interactive: {
      label: 'Solve a minable maze',
      status: 'live',
      blurb:
        'Walking is cheap, mining a wall is expensive. The shortest-looking route through the wall band is not always the cheapest once that cost is counted, the same lesson the real heuristic encodes.',
      robotComment: 'This is roughly what he did, except his A* did it a few million times a second and never complained.',
    },
  },

  {
    id: 'skillseed',
    hub: 'projects',
    title: 'Skillseed',
    kicker: 'Co-founded · 90k+ students · 80+ countries',
    blurb: 'An education platform I built that outgrew the room it started in.',
    scene: { x: 0.46, y: 0.4 },
    links: {},
    robotLine: 'Ninety thousand students. I have met four people.',
    detail: [
      // TODO(copy): my actual day-to-day role, beyond co-founding.
      'I co-founded Skillseed, which went on to reach **90,000+ students** across **80+ countries**.',
      '> The hardest part was never the platform. It was running a company at the same time as being a full-time student, and neither side got to slip.',
    ],
    // TODO(design): "grade a short sentence" reads bland — needs a better hook.
    interactive: { label: 'TBD', status: 'undecided' },
  },

  {
    id: 'lectify',
    hub: 'projects',
    title: 'Lectify',
    kicker: 'AI spaced repetition',
    blurb: "I'm building something that turns what you just heard into something you still know next month.",
    scene: { x: 0.64, y: 0.62 },
    links: {},
    robotLine: 'Spaced repetition. I never forget, but I am told that is unusual.',
    detail: [
      // TODO(copy): the scheduling model, and what separates it from Anki-with-an-LLM.
      "An AI **spaced-repetition** app I'm building.",
    ],
    interactive: {
      label: 'Turn a paragraph into a quiz',
      status: 'live',
      blurb:
        'A scripted preview of the idea: read a passage, get a question generated from it, answer it. The real app automates the generating part.',
      robotComment: "This is the general shape of it. The real app also has to be, you know, correct.",
    },
  },

  {
    id: 'clash-of-nations',
    hub: 'projects',
    title: 'Clash of Nations',
    kicker: 'In progress · multiplayer grand strategy',
    blurb: "A grand-strategy, base-building game I'm building right now.",
    scene: { x: 0.8, y: 0.44 },
    links: {},
    robotLine: 'Still being built. Like me, allegedly.',
    detail: [
      // TODO(copy): scope, current state, the multiplayer model.
      "A multiplayer **grand-strategy** and **base-building** game I'm building. Still in progress.",
    ],
  },

  {
    id: 'warden',
    hub: 'projects',
    title: 'Warden',
    kicker: 'Minecraft mod · shipped on Modrinth',
    blurb: 'A mod I shipped that people actually downloaded, which is the hard part.',
    scene: { x: 0.38, y: 0.76 },
    links: {},
    robotLine: 'Shipped. That word does a lot of heavy lifting.',
    detail: [
      // TODO(copy): what the mod does; download count if it is worth stating.
      'A Minecraft mod I built and shipped on **Modrinth**.',
    ],
  },
];
