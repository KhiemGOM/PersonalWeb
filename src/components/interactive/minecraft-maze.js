/**
 * Minable-maze puzzle. Mount target for `minecraft-pathfinding`'s interactive slot
 * (src/components/interactive/registry.js). Self-contained: mount(container) renders into
 * what it's given and returns only a teardown handle, same shape every future minigame
 * follows.
 */

import { el } from '../../lib/dom.js';
import {
  LEVELS,
  DIRECTIONS,
  MINEABLE,
  isLegalStep,
  stepCost,
  parseGrid,
  computePar,
} from './minecraft-maze-logic.js';
import './minecraft-maze.css';

/** @param {HTMLElement} container */
export function mount(container) {
  let levelIndex = 0;
  let par = 0;
  let budget = 0;

  /** @type {{cells: import('./minecraft-maze-logic.js').CellType[][], start: {x:number,y:number}, goal: {x:number,y:number}}} */
  let board;
  let position = { x: 0, y: 0 };
  let cost = 0;
  /** Only an exact match to the true optimal counts as `won` — reaching the goal any other
   *  way is `suboptimal`, not a win, and needs a reset to try again. */
  /** @type {'playing' | 'won' | 'suboptimal' | 'lost'} */
  let status = 'playing';

  const hud = el('p', { className: 'mmaze__hud' });
  const message = el('p', { className: 'mmaze__message' });
  const boardEl = el('div', { className: 'mmaze__board' });
  const resetButton = el(
    'button',
    { type: 'button', className: 'mmaze__reset', onclick: () => loadLevel(levelIndex) },
    'Reset'
  );
  const nextButton = el(
    'button',
    { type: 'button', className: 'mmaze__reset', onclick: () => loadLevel(levelIndex + 1) },
    'Next level'
  );

  function loadLevel(index) {
    levelIndex = index;
    board = parseGrid(LEVELS[levelIndex]);
    par = computePar(board.cells, board.start, board.goal);
    budget = par * 2;
    position = { ...board.start };
    cost = 0;
    status = 'playing';
    boardEl.style.gridTemplateColumns = `repeat(${board.cells[0].length}, 1fr)`;
    render();
  }

  /** Whether (x,y) is one step away and legal to step onto — orthogonal can mine, diagonal
   *  can only cut through ground that's already open. */
  function isLegalMove(x, y) {
    const dx = x - position.x;
    const dy = y - position.y;
    return DIRECTIONS.some(
      ([ddx, ddy]) => ddx === dx && ddy === dy
    ) && isLegalStep(board.cells[y][x], dx, dy);
  }

  function tryMove(dx, dy) {
    if (status !== 'playing') return;
    const x = position.x + dx;
    const y = position.y + dy;
    if (y < 0 || y >= board.cells.length || x < 0 || x >= board.cells[0].length) return;
    if (!isLegalMove(x, y)) return;

    const type = board.cells[y][x];
    cost += stepCost(type);
    if (MINEABLE.has(type)) board.cells[y][x] = 'open';
    position = { x, y };

    if (position.x === board.goal.x && position.y === board.goal.y) {
      status = cost === par ? 'won' : 'suboptimal';
    } else if (cost > budget) {
      status = 'lost';
    }
    render();
  }

  function onKeyDown(event) {
    const map = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const dir = map[event.key];
    if (!dir) return;
    event.preventDefault();
    tryMove(...dir);
  }

  function render() {
    const isLastLevel = levelIndex === LEVELS.length - 1;
    hud.textContent = `Level ${levelIndex + 1}/${LEVELS.length} · Cost: ${cost} · Par: ${par}`;

    if (status === 'won') {
      message.textContent = isLastLevel
        ? `Solved it. Cost ${cost}, the true optimal. That was the last level.`
        : `Solved it. Cost ${cost}, the true optimal.`;
    } else if (status === 'suboptimal') {
      message.textContent = `Reached the goal, but cost ${cost} isn't the true optimal (${par}). Reset to find it.`;
    } else if (status === 'lost') {
      message.textContent = `Out of budget before reaching the goal. Cost ${cost} · budget ${budget}.`;
    } else {
      message.textContent = '';
    }

    nextButton.hidden = !(status === 'won' && !isLastLevel);

    boardEl.replaceChildren(
      ...board.cells.flatMap((row, y) =>
        row.map((type, x) => {
          const isPlayer = position.x === x && position.y === y;
          const displayType = isPlayer ? 'player' : type;
          const adjacent = status === 'playing' && !isPlayer && isLegalMove(x, y);
          return el('button', {
            type: 'button',
            className: 'mmaze__cell',
            dataset: { type: displayType },
            disabled: !adjacent,
            'aria-label': isPlayer
              ? 'You are here'
              : type === 'wall'
                ? 'Mineable wall'
                : type === 'hardwall'
                  ? 'Hard wall, costs double to mine'
                  : type === 'bedrock'
                    ? 'Bedrock, never mineable'
                    : type === 'goal'
                      ? 'Goal'
                      : 'Open ground',
            onclick: () => tryMove(x - position.x, y - position.y),
          });
        })
      )
    );
  }

  loadLevel(0);
  container.append(
    hud,
    boardEl,
    message,
    el('div', { className: 'mmaze__actions' }, resetButton, nextButton)
  );
  container.addEventListener('keydown', onKeyDown);
  container.tabIndex = 0;

  // Dev-only console hook: window.mmaze.jumpTo(n) loads level n (1-indexed, matching the
  // "Level n/7" HUD text) without having to solve every level before it.
  if (import.meta.env.DEV) {
    window.mmaze = { jumpTo: (n) => loadLevel(n - 1), levelCount: LEVELS.length };
  }

  return {
    destroy() {
      container.removeEventListener('keydown', onKeyDown);
      container.replaceChildren();
      if (import.meta.env.DEV && window.mmaze) delete window.mmaze;
    },
  };
}
