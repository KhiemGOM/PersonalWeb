/**
 * Drive a robot through a maze with limited vision. Mount target for `barn-challenge`.
 */

import { el } from '../../lib/dom.js';
import { GRID, VISION_RADIUS, parseGrid, computePar } from './barn-maze-logic.js';
import './barn-maze.css';

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** @param {HTMLElement} container */
export function mount(container) {
  const par = (() => {
    const { cells, start, goal } = parseGrid(GRID);
    return computePar(cells, start, goal);
  })();

  let board;
  let position;
  /** @type {boolean[][]} Cells ever within vision, stays revealed once seen. */
  let revealed;
  let moves = 0;
  let bumps = 0;
  /** @type {'playing' | 'won'} */
  let status = 'playing';

  const hud = el('p', { className: 'bmaze__hud' });
  const message = el('p', { className: 'bmaze__message' });
  const boardEl = el('div', { className: 'bmaze__board' });
  const resetButton = el(
    'button',
    { type: 'button', className: 'bmaze__reset', onclick: () => reset() },
    'Reset'
  );

  function reveal(x, y) {
    for (let dy = -VISION_RADIUS; dy <= VISION_RADIUS; dy++) {
      for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny < 0 || ny >= revealed.length || nx < 0 || nx >= revealed[0].length) continue;
        revealed[ny][nx] = true;
      }
    }
  }

  function reset() {
    board = parseGrid(GRID);
    position = { ...board.start };
    revealed = board.cells.map((row) => row.map(() => false));
    reveal(position.x, position.y);
    moves = 0;
    bumps = 0;
    status = 'playing';
    render();
  }

  function tryMove(dx, dy) {
    if (status !== 'playing') return;
    const x = position.x + dx;
    const y = position.y + dy;
    if (y < 0 || y >= board.cells.length || x < 0 || x >= board.cells[0].length) return;

    if (board.cells[y][x] === 'wall') {
      bumps += 1;
      reveal(x, y);
      render();
      return;
    }

    moves += 1;
    position = { x, y };
    reveal(x, y);

    if (position.x === board.goal.x && position.y === board.goal.y) {
      status = 'won';
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
    hud.textContent = `Moves: ${moves} · Bumps: ${bumps} · Par: ${par}`;

    if (status === 'won') {
      message.textContent =
        moves === par
          ? `Reached it in ${moves}, optimal, matched par. ${bumps} bump${bumps === 1 ? '' : 's'} along the way.`
          : `Reached it in ${moves} · par ${par}. ${bumps} bump${bumps === 1 ? '' : 's'} along the way.`;
    } else {
      message.textContent = '';
    }

    boardEl.replaceChildren(
      ...board.cells.flatMap((row, y) =>
        row.map((type, x) => {
          const isPlayer = position.x === x && position.y === y;
          const visible = revealed[y][x];
          const displayType = isPlayer ? 'player' : !visible ? 'fog' : type;
          const adjacent =
            status === 'playing' &&
            DIRS.some(([dx, dy]) => position.x + dx === x && position.y + dy === y);
          return el('button', {
            type: 'button',
            className: 'bmaze__cell',
            dataset: { type: displayType },
            disabled: !adjacent,
            'aria-label': isPlayer
              ? 'You are here'
              : !visible
                ? 'Unexplored'
                : type === 'wall'
                  ? 'Wall'
                  : type === 'goal'
                    ? 'Goal'
                    : 'Open ground',
            onclick: () => tryMove(x - position.x, y - position.y),
          });
        })
      )
    );
  }

  reset();
  container.append(hud, boardEl, message, resetButton);
  container.addEventListener('keydown', onKeyDown);
  container.tabIndex = 0;

  return {
    destroy() {
      container.removeEventListener('keydown', onKeyDown);
      container.replaceChildren();
    },
  };
}
