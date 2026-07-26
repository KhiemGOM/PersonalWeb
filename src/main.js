/**
 * Entry point.
 *
 * Phase 0 scope: boot the shell, load fonts and tokens, prove the dev server runs.
 * Phase 1 replaces the placeholder below with the router, visitor-mode store, scene
 * renderer, robot, and narrator.
 */

import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import './styles/base.css';

const sceneRoot = /** @type {HTMLElement} */ (document.getElementById('scene-root'));

sceneRoot.innerHTML = `
  <section style="
    min-height: 100dvh;
    display: grid;
    place-content: center;
    gap: var(--space-m);
    text-align: center;
    padding: var(--space-l);
  ">
    <p class="label">Phase 0 · shell online</p>
    <h1 style="font-size: var(--step-3)">Khiem's personal dimension</h1>
    <p style="color: var(--text-muted); max-width: 42ch; margin-inline: auto">
      Placeholder. The router, scene renderer, robot, and narrator land in Phase 1.
    </p>
  </section>
`;
