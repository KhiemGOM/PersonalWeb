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

import { createRouter } from './core/router.js';
import { routes, notFound } from './routes.js';
import * as visitor from './core/visitor-mode.js';
import { must } from './lib/dom.js';

// Decide the visitor's mode before anything renders. `ask` means they've earned no
// default yet — the landing question that resolves it is Phase 2 work, so until then we
// run guided without persisting, leaving a reload still in the "should ask" state.
const decision = visitor.resolve();
if (decision.ask) {
  visitor.setSessionMode(visitor.MODES.GUIDED, { persist: false });
}

const router = createRouter({
  routes,
  notFound,
  outlet: must('#scene-root'),
  announcer: must('#route-announcer'),
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
  });
}
