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
    blurb: 'National champion, then bronze on the international stage.',
    flagship: true,
    scene: { x: 0.28, y: 0.5, scale: 1.1 },
    links: {},
    robotLine: 'Bronze internationally, gold nationally. I would have panicked at both.',
    detail: [
      // TODO(copy): what the rounds actually tested.
      'Bronze medal at the International Olympiad in Artificial Intelligence, 2024.',
      'National champion at the Vietnamese Olympiad in Artificial Intelligence.',
    ],
    interactive: { label: 'Hand-tune a linear regression', status: 'planned' },
  },

  {
    id: 'ftc',
    hub: 'competitions',
    title: 'FIRST Tech Challenge',
    kicker: 'National Champion + Design Award 2024 · advisor to the 2025 World Runner-up',
    blurb: 'Won it, then went back to help someone else win it.',
    scene: { x: 0.5, y: 0.66 },
    links: {},
    robotLine: 'He built robots competitively. I am trying not to take that personally.',
    detail: [
      'National Champion and Design Award winner, 2024.',
      'Technical advisor to the 2025 team that finished World Runner-up and won the Edison Division.',
    ],
    interactive: { label: 'Throw something at the scoring zone', status: 'planned' },
  },

  {
    id: 'barn-challenge',
    hub: 'competitions',
    title: 'BARN Challenge',
    kicker: 'ICRA 2026 · 1st dynamic simulation · 3rd physical',
    blurb: 'Autonomous navigation through gaps a robot has no business fitting through.',
    scene: { x: 0.7, y: 0.46 },
    links: {},
    robotLine: 'First in simulation, third in reality. Reality is a harder judge.',
    detail: [
      // TODO(copy): the planner, and what made the dynamic track different.
      'First place in the dynamic simulation track and third in the physical track at the BARN Challenge, ICRA 2026.',
    ],
    interactive: { label: 'Drive a robot through a maze, blind', status: 'planned' },
  },

  {
    id: 'robocup-at-home',
    hub: 'competitions',
    title: 'RoboCup@Home',
    kicker: 'Perception pipeline · CVAT annotation · LiDAR',
    blurb: 'Teaching a robot to recognise a household it has never seen.',
    scene: { x: 0.86, y: 0.68 },
    links: {},
    robotLine: 'Perception work. Someone had to teach us what a mug looks like.',
    detail: [
      // TODO(copy): pipeline structure, and where the accuracy/speed tradeoff bit.
      'Built the perception pipeline: CVAT annotation workflow and LiDAR processing.',
    ],
    interactive: { label: 'Shuffle a point-cloud cleaning pipeline', status: 'planned' },
  },
];
