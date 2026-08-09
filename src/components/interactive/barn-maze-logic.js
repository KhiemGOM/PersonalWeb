/**
 * Grid and shortest-path math for the limited-vision maze. No DOM here.
 */

/** `.` open, `#` impassable wall, `S` start, `G` goal. A few dead-end branches so bumping
 *  into walls while blind is a real risk, not just a straight corridor. */
export const GRID = [
  'S..#.....',
  '.#.#.###.',
  '.#...#...',
  '.#.###.#.',
  '##.....#.',
  '.#####.#.',
  '.......#.',
  '.#######.',
  '.......G.',
];

/** Chebyshev radius around the robot that's ever visible. */
export const VISION_RADIUS = 1;

/** @typedef {'open' | 'wall' | 'start' | 'goal'} CellType */

/**
 * @param {string[]} grid
 * @returns {{ cells: CellType[][], start: {x:number,y:number}, goal: {x:number,y:number} }}
 */
export function parseGrid(grid) {
  let start = { x: 0, y: 0 };
  let goal = { x: 0, y: 0 };

  const cells = grid.map((row, y) =>
    row.split('').map((ch, x) => {
      if (ch === 'S') {
        start = { x, y };
        return 'start';
      }
      if (ch === 'G') {
        goal = { x, y };
        return 'goal';
      }
      return ch === '#' ? 'wall' : 'open';
    })
  );

  return { cells, start, goal };
}

/**
 * Shortest walkable-step count from start to goal, ignoring vision: the par a visitor
 * with full sight could achieve. Plain BFS, unweighted, grid is small (≤81 cells).
 * @param {CellType[][]} cells
 * @param {{x:number,y:number}} start
 * @param {{x:number,y:number}} goal
 */
export function computePar(cells, start, goal) {
  const height = cells.length;
  const width = cells[0].length;
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  let frontier = [{ ...start, dist: 0 }];
  visited[start.y][start.x] = true;

  while (frontier.length > 0) {
    const next = [];
    for (const node of frontier) {
      if (node.x === goal.x && node.y === goal.y) return node.dist;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (visited[ny][nx] || cells[ny][nx] === 'wall') continue;
        visited[ny][nx] = true;
        next.push({ x: nx, y: ny, dist: node.dist + 1 });
      }
    }
    frontier = next;
  }

  return Infinity;
}
