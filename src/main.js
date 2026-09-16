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
import './styles/contact.css';

import { createRouter, forgetScrollMemory } from './core/router.js';
import { createRobot } from './components/robot.js';
import { createNarrator } from './components/narrator.js';
import { createLighting } from './components/lighting.js';
import { setShell } from './core/shell.js';
import { refreshFocusTargets, resolveFocus } from './core/focus.js';
import { createScrollGate } from './core/scroll-gate.js';
import { lockScroll, unlockScroll } from './core/scroll-lock.js';
import { routes, notFound } from './routes.js';
import * as visitor from './core/visitor-mode.js';
import { sound } from './core/sound.js';
import { createSoundToggle } from './components/sound-toggle.js';
import { createContact } from './components/contact.js';
import { forgetSaid } from './core/spoken.js';
import { isForced as isFirstVisitForced, initDebugFirstVisit } from './core/debug-first-visit.js';
import { must } from './lib/dom.js';

sound.init();

/**
 * The blog is a deliberate style break from the rest of the site: a plain, sanitized
 * reading page, not another room in the dimension. No robot, no lighting/flicker, no
 * cinematic — checked by path since neither the route table nor router state is
 * available this early (module init, before router.start()).
 * @param {string} path
 */
function isPlainRoute(path) {
  return path === '/blog' || path.startsWith('/blog/');
}

// DEBUG: forces every reload to look like a first visit, so the opening narration
// replays and the visitor-intent branch is always exercised. Flippable at runtime with
// Shift+F rather than a hardcoded boolean, since testing the OTHER path (does a reload
// actually remember you) is just as important now that spoken.js and the router's
// scroll memory persist across one. forgetSaid() and forgetScrollMemory() alongside
// visitor.forget() keep this internally consistent: forgetting the visitor's choice
// without also forgetting what's been said and where they scrolled to would ask the
// question again while skipping the intro meant to precede it, mid-page.
if (import.meta.env.DEV && isFirstVisitForced()) {
  visitor.forget();
  forgetSaid();
  forgetScrollMemory();
}

// Decide the visitor's mode before anything renders. `ask` means they've earned no
// default yet — the landing page asks once the opening line finishes (src/views/home.js).
// Until answered, run guided without persisting: the intro plays as a performance for
// everyone, and a reload before answering still lands in the "should ask" state.
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

const lighting = createLighting({ root: must('#light-layer') });

const contact = createContact();
setShell({ robot, narrator, contact });
createSoundToggle();

const scrollGate = createScrollGate();

// Choosing hurry mid-session — the landing question, or any future switch control — must
// disable the gate immediately. Every other visitor-mode reaction to the choice is
// stylesheet-driven off data-mode; this one is scroll-gate JS, and it isn't reached by
// the afterSwap hook below since no navigation happens when the landing question answers.
visitor.subscribe((mode) => {
  if (mode === visitor.MODES.HURRY) scrollGate.disable();
});

// A visitor whose very first hit is a direct link into the blog never sees the cinematic
// at all — the light show has nothing to show on a page with no lighting layer, and
// holding their scroll for it would just be a few seconds of a plain page refusing to
// move for no visible reason.
const initialPlain = isPlainRoute(window.location.pathname);
document.documentElement.dataset.plain = String(initialPlain);
if (initialPlain) {
  lighting.finishIntro();
} else {
  // Hold the page still through the opening. The light show is two and a half seconds and
  // plays exactly once; scrolling during it means the spotlight opens onto a section the
  // visitor has already left. Released the moment the room resolves.
  //
  // NOT held while the robot is merely talking. Narration waits for a click, so locking
  // during it would mean a page that refuses to move until the visitor works out that they
  // have to dismiss something first — the sort of thing that reads as a broken site rather
  // than a considered one.
  lockScroll('intro', { maxMs: 6000 });
  if (!lighting.isIntroDone()) window.scrollTo(0, 0);
}

// The narrator types on its own clock. The robot runs its own rAF loop for motion, but
// driving a second one here would mean two loops competing for the same frames, so the
// narrator is stepped from one shared ticker.
let introHolding = true;
let lastFrame = performance.now();
(function tickShell(now) {
  const dt = Math.min(now - lastFrame, 64);
  lastFrame = now;

  // Everything here hangs off where the camera head is, so it is read once.
  const head = robot.headPosition();

  narrator.step(dt);
  narrator.setAnchor(head.x, head.y);

  // The spotlight goes on whatever is being read, not on the robot. Resolved every frame
  // because it moves with the scroll, not only when the view changes.
  lighting.step(dt, { head, centre: robot.centrePosition() }, resolveFocus());
  // The robot is revealed BY the light rather than on a timer of its own, so the chassis
  // cannot resolve before there is anything to see it by.
  const phase = lighting.phase();
  robot.setReveal(phase === 'black' ? 'hidden' : phase === 'eyes' ? 'eyes' : 'full');

  if (phase === 'live' && introHolding) {
    introHolding = false;
    unlockScroll('intro');
  }

  requestAnimationFrame(tickShell);
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

  afterSwap: () => {
    // Each room tints its own light — a library lamp is not a lab fluorescent. Read off
    // the rendered scene rather than the route table, so a scene that changes its mind
    // about its own lighting does not need a second registration here.
    const scene = document.querySelector('.scene');
    const styles = getComputedStyle(scene ?? document.documentElement);
    lighting.setTint(
      styles.getPropertyValue('--scene-light') || styles.getPropertyValue('--accent')
    );

    // New room, new light. Raised after the tint is set, so it comes up in the right
    // colour rather than fading in wrong and correcting itself.
    lighting.bringUp();

    // A new view brings new things worth lighting, and new sections to settle onto.
    refreshFocusTargets();
    scrollGate.refresh();
    // Someone in a hurry did not ask to be slowed down.
    if (!visitor.isGuided()) scrollGate.disable();

    afterSwapHooks.forEach((hook) => hook());
  },

  // Full body walks the scroll path on the landing page; everywhere else the head pins
  // to the right edge. Set before the swap so the robot is already moving as the new
  // scene comes up, rather than snapping into place after it lands.
  beforeSwap: async ({ from, to }) => {
    // Set first, before the blackout below — the blog has no lighting layer at all, so
    // there is nothing to fade there, just a clean cut in or out of the dimension.
    document.documentElement.dataset.plain = String(isPlainRoute(to));

    robot.setMode(to === '/' ? 'full' : 'head');
    // One room's narration must never bleed into the next.
    narrator.clear();

    // Cut the lights and swap the room behind the blackout. Awaited, so the new scene
    // never appears mid-fade — the point of a blackout is that the change happens where
    // it cannot be seen. Skipped on first load, which has its own opening sequence.
    if (from !== null) await lighting.blackOut();
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
    __lighting: lighting,
    __scrollGate: scrollGate,
  });

  // First-visit toggle: Shift+F. See core/debug-first-visit.js.
  initDebugFirstVisit((forced) => {
    console.info(
      forced
        ? '[debug] force-first-visit ON — reloading; every reload will look like a first visit'
        : '[debug] force-first-visit OFF — reloading; a reload should now remember you'
    );
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
