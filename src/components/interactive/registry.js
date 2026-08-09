/**
 * Maps an item id to its live minigame module, keeping content files pure data (see
 * src/content/items.js: `interactive` there only ever carries `{ label, status }`).
 * Add one entry per future minigame; nothing else needs to change to plug a new one in.
 *
 * @type {Record<string, () => Promise<{ mount(container: HTMLElement): { destroy(): void } }>>}
 */
export const INTERACTIVE_REGISTRY = {
  'minecraft-pathfinding': () => import('./minecraft-maze.js'),
  'ioai-voai': () => import('./regression-tuner.js'),
  ftc: () => import('./ftc-throw.js'),
  'barn-challenge': () => import('./barn-maze.js'),
  'robocup-at-home': () => import('./robocup-cleanup.js'),
  lectify: () => import('./lectify-quiz.js'),
};

/** @param {string} id */
export function getInteractiveLoader(id) {
  return INTERACTIVE_REGISTRY[id];
}
