/**
 * Entry point.
 *
 * Phase 1 in progress. Landed: router, visitor-mode store.
 * Still to come: scene renderer, robot, narrator, transitions, content data layer.
 */

import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import './styles/base.css';
import './styles/scaffold.css';
import './styles/robot.css';
import './styles/narrator.css';
import './styles/sound-toggle.css';

import { createRouter } from './core/router.js';
import { createRobot } from './components/robot.js';
import { createNarrator } from './components/narrator.js';
import { setShell } from './core/shell.js';
import { routes, notFound } from './routes.js';
import * as visitor from './core/visitor-mode.js';
import { sound } from './core/sound.js';
import { createSoundToggle } from './components/sound-toggle.js';
import { must } from './lib/dom.js';

sound.init();

// DEBUG: treat every refresh as a first visit, so the opening narration replays and the
// visitor-intent branch is always exercised. Flip to false to test the streak-to-default
// behaviour, which by design needs choices to survive a reload.
const DEBUG_ALWAYS_FIRST_VISIT = true;
if (import.meta.env.DEV && DEBUG_ALWAYS_FIRST_VISIT) visitor.forget();

// Decide the visitor's mode before anything renders. `ask` means they've earned no
// default yet — the landing question that resolves it is Phase 2 work, so until then we
// run guided without persisting, leaving a reload still in the "should ask" state.
const decision = visitor.resolve();
if (decision.ask) {
  visitor.setSessionMode(visitor.MODES.GUIDED, { persist: false });
}

// Created once, outside the router's outlet, so these survive every navigation.
const robot = createRobot({ layer: must('#robot-layer') });
const narrator = createNarrator({
  root: must('#narrator-root'),
  // The robot's optics animate whenever a line is being delivered.
  onSpeakingChange: (speaking) => robot.setSpeaking(speaking),
});

setShell({ robot, narrator });
createSoundToggle();

// The narrator types on its own clock. The robot runs its own rAF loop for motion, but
// driving a second one here would mean two loops competing for the same frames, so the
// narrator is stepped from one shared ticker.
let lastFrame = performance.now();
(function tickNarrator(now) {
  narrator.step(Math.min(now - lastFrame, 64));
  // Keep the speech bubble on the robot's head as it moves.
  const head = robot.headPosition();
  narrator.setAnchor(head.x, head.y);
  lastFrame = now;
  requestAnimationFrame(tickNarrator);
})(lastFrame);

/**
 * Run after each view swap. Kept as a list so dev tooling can subscribe without the
 * router growing knowledge of it.
 * @type {Array<() => void>}
 */
const afterSwapHooks = [];

const router = createRouter({
  routes,
  notFound,
  outlet: must('#scene-root'),
  announcer: must('#route-announcer'),

  afterSwap: () => afterSwapHooks.forEach((hook) => hook()),

  // Full body walks the scroll path on the landing page; everywhere else the head pins
  // to the left edge. Set before the swap so the robot is already moving as the new
  // scene comes up, rather than snapping into place after it lands.
  beforeSwap: ({ to }) => {
    robot.setMode(to === '/' ? 'full' : 'head');
    // One room's narration must never bleed into the next.
    narrator.clear();
  },
});

router.start();

if (import.meta.env.DEV) {
  // Streak behaviour spans sessions, so it can't be exercised by clicking around.
  // Console handle: __visitor.choose('hurry') three times, reload, and the question
  // should stop being asked.
  Object.assign(window, {
    __visitor: {
      ...visitor,
      state: () => ({
        mode: visitor.getMode(),
        decision,
        history: visitor.getHistory(),
        streak: visitor.trailingStreak(),
        preferred: visitor.preferredMode(),
      }),
    },
    __router: router,
    __robot: robot,
    __narrator: narrator,
  });

  // Route inspector: Shift+D, or ?debug=path. Only meaningful on the landing page.
  import('./components/path-debug.js').then(async ({ createPathDebug }) => {
    await import('./styles/path-debug.css');
    const inspector = createPathDebug();
    // Text boxes move when the view does, so the drawing has to be recomputed after
    // each swap rather than once at startup.
    afterSwapHooks.push(() => requestAnimationFrame(inspector.redraw));
    Object.assign(window, { __pathDebug: inspector });
  });

  // Exposed so the robot's rendered position can be checked against the authored curve —
  // the invariant is that it never leaves the path, and that is only testable from
  // outside the component.
  Promise.all([import('./lib/path.js'), import('./content/journey.js')]).then(
    ([path, journey]) => Object.assign(window, { __path: path, __journey: journey.JOURNEY })
  );
}
