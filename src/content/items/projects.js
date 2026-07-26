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
    blurb: 'Navigating a world the agent is allowed to dig through.',
    flagship: true,
    scene: { x: 0.24, y: 0.58, scale: 1.15 },
    links: { blog: '/blog/minecraft-pathfinding' },
    robotLine: 'He taught a computer to take shortcuts. I take notes.',
    detail: [
      // TODO(copy): expand — why naive A* breaks once terrain is mutable.
      'A* over a world where terrain is not fixed: blocks can be mined, so the cost of a path depends on what the agent is willing to destroy along the way.',
      'The air-potential heuristic scores open space ahead of the agent, which stops it tunnelling when a cheaper surface route exists.',
    ],
    interactive: { label: 'Solve a minable maze', status: 'planned' },
  },

  {
    id: 'skillseed',
    hub: 'projects',
    title: 'Skillseed',
    kicker: 'Co-founded · 90k+ students · 80+ countries',
    blurb: 'An education platform that outgrew the room it was built in.',
    scene: { x: 0.46, y: 0.4 },
    links: {},
    robotLine: 'Ninety thousand students. I have met four people.',
    detail: [
      // TODO(copy): what it does, the founder role, and what was actually hard.
      'Co-founded. Reached 90,000+ students across 80+ countries.',
    ],
    // TODO(design): "grade a short sentence" reads bland — needs a better hook.
    interactive: { label: 'TBD', status: 'undecided' },
  },

  {
    id: 'lectify',
    hub: 'projects',
    title: 'Lectify',
    kicker: 'AI spaced repetition',
    blurb: 'Turning what you just heard into something you still know next month.',
    scene: { x: 0.64, y: 0.62 },
    links: {},
    robotLine: 'Spaced repetition. I never forget, but I am told that is unusual.',
    detail: [
      // TODO(copy): the scheduling model, and what separates it from Anki-with-an-LLM.
      'An AI spaced-repetition app.',
    ],
    interactive: { label: 'TBD', status: 'undecided' },
  },

  {
    id: 'clash-of-nations',
    hub: 'projects',
    title: 'Clash of Nations',
    kicker: 'In progress · multiplayer grand strategy',
    blurb: 'Grand strategy and base building, currently under construction.',
    scene: { x: 0.8, y: 0.44 },
    links: {},
    robotLine: 'Still being built. Like me, allegedly.',
    detail: [
      // TODO(copy): scope, current state, the multiplayer model.
      'A multiplayer grand strategy and base-building game. In progress.',
    ],
  },

  {
    id: 'warden',
    hub: 'projects',
    title: 'Warden',
    kicker: 'Minecraft mod · shipped on Modrinth',
    blurb: 'A mod people actually downloaded, which is the hard part.',
    scene: { x: 0.38, y: 0.76 },
    links: {},
    robotLine: 'Shipped. That word does a lot of heavy lifting.',
    detail: [
      // TODO(copy): what the mod does; download count if it is worth stating.
      'A Minecraft mod, shipped on Modrinth.',
    ],
  },
];
