/**
 * Competitions — the podium scene.
 * @type {import('../items.js').Item[]}
 */
export default [
  {
    id: 'ioai-voai',
    hub: 'competitions',
    title: 'IOAI & VOAI',
    kicker: 'IOAI 2024 Bronze · VOAI national champion',
    blurb: 'I went national champion, then took bronze on the international stage.',
    flagship: true,
    scene: { x: 0.28, y: 0.5, scale: 1.1 },
    links: {},
    robotLine: 'Bronze internationally, gold nationally. I would have panicked at both.',
    detail: [
      // TODO(copy): what the rounds actually tested.
      'I won **bronze** at the International Olympiad in Artificial Intelligence, 2024.',
      'I was also **national champion** at the Vietnamese Olympiad in Artificial Intelligence.',
    ],
    interactive: { label: 'Hand-tune a linear regression', status: 'planned' },
  },

  {
    id: 'ftc',
    hub: 'competitions',
    title: 'FIRST Tech Challenge',
    kicker: 'National Champion + Design Award 2024 · advisor to the 2025 World Runner-up',
    blurb: 'I won it, then went back the next year to help someone else win it too.',
    scene: { x: 0.5, y: 0.66 },
    links: {},
    robotLine: 'He built robots competitively. I am trying not to take that personally.',
    detail: [
      'I was **National Champion** and **Design Award winner** in 2024.',
      'In 2025 I came back as technical advisor to the team that finished **World Runner-up** and won the **Edison Division**.',
    ],
    interactive: { label: 'Throw something at the scoring zone', status: 'planned' },
  },

  {
    id: 'barn-challenge',
    hub: 'competitions',
    title: 'BARN Challenge',
    kicker: 'ICRA 2026 · 1st dynamic simulation · 3rd physical',
    blurb: 'I built autonomous navigation that threads gaps a robot has no business fitting through.',
    scene: { x: 0.7, y: 0.46 },
    links: {},
    robotLine: 'First in simulation, third in reality. Reality is a harder judge.',
    detail: [
      // TODO(copy): the planner, and what made the dynamic track different.
      'I placed **first** in the dynamic simulation track and **third** in the physical track at the BARN Challenge, ICRA 2026.',
    ],
    interactive: { label: 'Drive a robot through a maze, blind', status: 'planned' },
  },

  {
    id: 'robocup-at-home',
    hub: 'competitions',
    title: 'RoboCup@Home',
    kicker: 'Perception pipeline · CVAT annotation · LiDAR',
    blurb: 'I taught a robot to recognise a household it had never seen.',
    scene: { x: 0.86, y: 0.68 },
    links: {},
    robotLine: 'Perception work. Someone had to teach us what a mug looks like.',
    detail: [
      // TODO(copy): pipeline structure, and where the accuracy/speed tradeoff bit.
      'I built the perception pipeline: the `CVAT` annotation workflow and the **LiDAR** processing behind it.',
    ],
    interactive: { label: 'Shuffle a point-cloud cleaning pipeline', status: 'planned' },
  },
];
