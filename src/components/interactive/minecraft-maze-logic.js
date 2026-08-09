/**
 * Grid, costs, and shortest-path math for the minable-maze puzzle. No DOM here, kept
 * separate so the rules (and the "tunnelling is expensive" lesson they encode) can be read
 * and changed without wading through render code.
 */

export const MOVE_COST = 1;
export const MINE_COST = 5;
/** A hard wall costs twice what a normal wall does to mine through. */
export const HARD_MINE_COST = MINE_COST * 2;

const BAND_CHAR = { wall: '#', hardwall: '%' };

/**
 * A grid of horizontal wall bands, each with a single gap, alternating sides so the cheap
 * route zigzags corner to corner while a straight tunnel through every band costs more,
 * the same tradeoff the real air-potential heuristic prices, repeated at more crossings as
 * the bands stack up. Bands may be normal ('wall', the default) or 'hardwall'. Obstacles
 * are stamped afterward, so they can sit inside a channel between bands (forcing a dodge
 * even where there's no band to cross) or overlap a band's own gap (forcing a different
 * one). 'bedrock' obstacles are never mineable at all, at any angle.
 * @param {number} size
 * @param {{ row: number, gapX: number, thickness?: number, type?: 'wall'|'hardwall' }[]} bands
 * @param {{ x: number, y: number, w: number, h: number, type: 'wall'|'hardwall'|'bedrock' }[]} [obstacles]
 * @returns {string[]}
 */
function buildBandedMaze(size, bands, obstacles = []) {
  const rows = Array.from({ length: size }, () => Array(size).fill('.'));
  for (const { row, gapX, thickness = 1, type = 'wall' } of bands) {
    for (let r = row; r < row + thickness; r++) {
      for (let c = 0; c < size; c++) {
        if (c !== gapX) rows[r][c] = BAND_CHAR[type];
      }
    }
  }
  for (const { x, y, w, h, type } of obstacles) {
    const ch = type === 'bedrock' ? 'X' : BAND_CHAR[type];
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        rows[r][c] = ch;
      }
    }
  }
  rows[0][0] = 'S';
  rows[size - 1][size - 1] = 'G';
  return rows.map((row) => row.join(''));
}

/** Blank size×size grid of open cells, as a mutable 2D char array. */
function blank(size) {
  return Array.from({ length: size }, () => Array(size).fill('.'));
}

/** @param {string[][]} rows @param {number} x @param {number} y0 @param {number} y1 @param {string} ch */
function vLine(rows, x, y0, y1, ch) {
  for (let y = y0; y <= y1; y++) rows[y][x] = ch;
}

/** @param {string[][]} rows @param {number} y @param {number} x0 @param {number} x1 @param {string} ch */
function hLine(rows, y, x0, x1, ch) {
  for (let x = x0; x <= x1; x++) rows[y][x] = ch;
}

/** @param {string[][]} rows */
function stamp(rows, start, goal) {
  rows[start.y][start.x] = 'S';
  rows[goal.y][goal.x] = 'G';
  return rows.map((row) => row.join(''));
}

/**
 * Bedrock dividers form actual walls between vertical lanes, not just a band with a gap:
 * each divider is solid for its whole height except one single-row gap, alternating top and
 * bottom, so crossing lane to lane forces a real trip to that row and back — an unbreakable
 * wall shaping the route, not decoration sitting in an already-open corridor. A handful of
 * dividers also carry one mineable cell elsewhere along their height: an optional paid
 * shortcut straight across, instead of the long walk to that lane's gap.
 * @param {number} size
 * @param {{ x: number, gapAt: 'top'|'bottom', shortcut?: { row: number, type: 'wall'|'hardwall' } }[]} dividers
 * @param {{x:number,y:number}} start
 * @param {{x:number,y:number}} goal
 */
function buildSerpentine(size, dividers, start, goal) {
  const rows = blank(size);
  for (const { x, gapAt, shortcut } of dividers) {
    vLine(rows, x, 0, size - 1, 'X');
    rows[gapAt === 'top' ? 0 : size - 1][x] = '.';
    if (shortcut) rows[shortcut.row][x] = BAND_CHAR[shortcut.type];
  }
  return stamp(rows, start, goal);
}

/**
 * A deterministic pseudo-random door type, from the door's own coordinate — the same door
 * always resolves to the same type, but there's no visible rule to read at a glance the
 * way "every door on this wall is a hard wall" would be. Roughly 40% open, 40% wall, 20%
 * hard wall.
 * @param {number} x @param {number} y
 */
function pseudoDoorType(x, y) {
  const h = (x * 31 + y * 17 + 7) % 5;
  if (h <= 1) return 'open';
  if (h <= 3) return 'wall';
  return 'hardwall';
}

/**
 * A grid of `roomsPerSide` x `roomsPerSide` small square rooms — every room the same size,
 * so none of them reads as "the big open one" that gives away a shortcut just by looking.
 * Every adjacent pair of rooms gets exactly one door, typed by pseudoDoorType, so the whole
 * floor plan is connected (always solvable) but costs vary door to door with no pattern.
 * @param {number} roomsPerSide
 * @param {number} roomSize
 * @param {{x:number,y:number}} start
 * @param {{x:number,y:number}} goal
 */
function buildRoomGrid(roomsPerSide, roomSize, start, goal) {
  const pitch = roomSize + 1;
  const size = roomSize * roomsPerSide + (roomsPerSide - 1);
  const rows = Array.from({ length: size }, () => Array(size).fill('X'));

  for (let r = 0; r < roomsPerSide; r++) {
    for (let c = 0; c < roomsPerSide; c++) {
      const y0 = r * pitch;
      const x0 = c * pitch;
      for (let y = y0; y < y0 + roomSize; y++) {
        for (let x = x0; x < x0 + roomSize; x++) rows[y][x] = '.';
      }
    }
  }

  const mid = Math.floor(roomSize / 2);
  for (let r = 0; r < roomsPerSide; r++) {
    for (let c = 0; c < roomsPerSide - 1; c++) {
      const x = c * pitch + roomSize;
      const y = r * pitch + mid;
      rows[y][x] = BAND_CHAR[pseudoDoorType(x, y)] ?? '.';
    }
  }
  for (let r = 0; r < roomsPerSide - 1; r++) {
    for (let c = 0; c < roomsPerSide; c++) {
      const x = c * pitch + mid;
      const y = r * pitch + roomSize;
      rows[y][x] = BAND_CHAR[pseudoDoorType(x, y)] ?? '.';
    }
  }

  return stamp(rows, start, goal);
}

/**
 * A single bedrock wall, straight down the middle, with start and goal at the same height
 * on opposite sides of it, close enough that any detour is expensive. Exactly three rows
 * break the wall: a hard wall close by, a plain wall further off, and open ground at the
 * far edge — so the choice is genuinely between paying more to mine less far out of the
 * way, paying less to mine further out, or not mining at all and walking the whole detour.
 * `thickness` is how many columns wide the wall (and so every mineable crossing) is — a
 * thin wall makes a short paid detour cheap enough to win; a thick one makes mining every
 * column of it expensive enough that the free gap wins even from further away, the same
 * air-potential-heuristic tradeoff the real project prices by distance instead of a flat
 * per-block cost.
 * @param {number} size
 * @param {number} wallX
 * @param {number} midY
 * @param {{ sx: number, gx: number, hardRow: number, wallRow: number, gapRow: number, thickness?: number }} spec
 */
function buildWallChoice(size, wallX, midY, { sx, gx, hardRow, wallRow, gapRow, thickness = 1 }) {
  const rows = blank(size);
  for (let dx = 0; dx < thickness; dx++) vLine(rows, wallX + dx, 0, size - 1, 'X');
  for (let dx = 0; dx < thickness; dx++) {
    rows[hardRow][wallX + dx] = '%';
    rows[wallRow][wallX + dx] = '#';
    rows[gapRow][wallX + dx] = '.';
  }
  return stamp(rows, { x: sx, y: midY }, { x: gx, y: midY });
}

/** `.` open, `#` wall, `%` hard wall (twice the mining cost), `X` bedrock (never mineable,
 *  at any angle), `S` start, `G` goal. First three are the tutorial run: horizontal wall
 *  bands, corner to corner. The rest are built entirely differently — bedrock shapes the
 *  route itself, goals sit off-corner, and mineable cells are the only optional shortcuts. */
export const LEVELS = [
  buildBandedMaze(11, [
    { row: 3, gapX: 1 },
    { row: 7, gapX: 9 },
  ]),
  buildBandedMaze(13, [
    { row: 3, gapX: 1 },
    { row: 6, gapX: 11, thickness: 2 },
    { row: 9, gapX: 1 },
  ]),
  buildBandedMaze(15, [
    { row: 3, gapX: 1 },
    { row: 6, gapX: 13, thickness: 2 },
    { row: 9, gapX: 1, thickness: 2 },
    { row: 12, gapX: 13 },
  ]),
  // Level 4: same setup as level 5 below (one bedrock wall between start and goal, a hard
  // wall close by, a plain wall further off, open ground at the far edge) but the wall is
  // two columns thick, so every mineable crossing means mining twice. That prices even the
  // nearest, hard-wall crossing at 26 and the plain wall at 24 — both worse than just
  // walking the 19 all the way to the free gap. Same setup, opposite lesson: a thick enough
  // wall isn't worth digging through at all, no matter how short the detour would be.
  buildWallChoice(19, 9, 9, { sx: 8, gx: 13, hardRow: 8, wallRow: 3, gapRow: 0, thickness: 2 }),
  // Level 5: the thin-wall counterpart to level 4 — same shape, but the wall is a single
  // column, so mining costs a single cell instead of two. Walking to the free gap and
  // walking to the plain wall both cost 18; paying double to mine the hard wall one row
  // away costs only 13. Same wall, same three crossings, opposite answer — whether digging
  // is worth it depends on how much there is to dig through, the same distance-priced
  // tradeoff the real air-potential heuristic encodes instead of a flat per-block cost.
  buildWallChoice(19, 9, 9, { sx: 8, gx: 10, hardRow: 8, wallRow: 3, gapRow: 0 }),
  // Level 6: a forced vertical serpentine. Three bedrock dividers split the floor into four
  // lanes; each divider only opens at one row (alternating top/bottom), so the "official"
  // route snakes the full height three times over. Each divider also hides one mineable
  // shortcut at a different row, a straight paid cut across instead of the detour to that
  // lane's gap. Goal sits mid-height in the last lane, not tucked in the far corner.
  buildSerpentine(
    15,
    [
      { x: 3, gapAt: 'bottom', shortcut: { row: 3, type: 'wall' } },
      { x: 7, gapAt: 'top', shortcut: { row: 10, type: 'hardwall' } },
      { x: 11, gapAt: 'bottom', shortcut: { row: 7, type: 'wall' } },
    ],
    { x: 0, y: 0 },
    { x: 13, y: 7 }
  ),
  // Level 7: the capstone. A 5x5 grid of small rooms (25 of them, each just 3x3), start
  // and goal in opposite corners. Every room is the same size, so nothing "looks like" the
  // shortcut the way one oversized open room would — the 40 doors between them are each
  // independently open, wall, or hard wall, with no visible pattern to read off the board.
  // The true optimum runs 27 steps corner to corner through a dozen rooms, mining exactly
  // three plain walls along the way and no hard walls at all — finding it means actually
  // comparing routes, not eyeballing which room looks emptiest.
  buildRoomGrid(5, 3, { x: 1, y: 1 }, { x: 17, y: 17 }),
];

/** @typedef {'open' | 'wall' | 'hardwall' | 'bedrock' | 'start' | 'goal'} CellType */

/**
 * @param {string[]} grid
 * @returns {{ cells: CellType[][], start: {x:number,y:number}, goal: {x:number,y:number} }}
 */
export function parseGrid(grid) {
  /** @type {{x:number,y:number}} */
  let start = { x: 0, y: 0 };
  /** @type {{x:number,y:number}} */
  let goal = { x: 0, y: 0 };

  const CHAR_TYPE = { '#': 'wall', '%': 'hardwall', X: 'bedrock' };

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
      return CHAR_TYPE[ch] ?? 'open';
    })
  );

  return { cells, start, goal };
}

/** All 8 neighbors. Orthogonal moves may mine; diagonal moves may only ever cut through
 *  ground that's already open, never a wall, so a diagonal step never carries a pickaxe. */
export const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export const MINEABLE = new Set(['wall', 'hardwall']);

/**
 * Whether stepping onto a cell of this type is a legal move, given the direction taken to
 * reach it. Bedrock is never passable, at any angle. Diagonal steps are open-ground-only;
 * orthogonal steps can mine a wall or hard wall.
 * @param {CellType} type
 * @param {number} dx
 * @param {number} dy
 */
export function isLegalStep(type, dx, dy) {
  if (type === 'bedrock') return false;
  const diagonal = dx !== 0 && dy !== 0;
  return !diagonal || !MINEABLE.has(type);
}

/** @param {CellType} type */
export function stepCost(type) {
  if (type === 'wall') return MINE_COST + MOVE_COST;
  if (type === 'hardwall') return HARD_MINE_COST + MOVE_COST;
  return MOVE_COST;
}

/**
 * Plain array-based Dijkstra over the static grid, at most a few hundred nodes, no heap
 * needed. Explores all 8 directions, respecting isLegalStep's no-diagonal-mining rule.
 * @param {CellType[][]} cells
 * @param {{x:number,y:number}} start
 * @param {{x:number,y:number}} goal
 * @returns {number} optimal cost from start to goal
 */
export function computePar(cells, start, goal) {
  const height = cells.length;
  const width = cells[0].length;
  const dist = Array.from({ length: height }, () => Array(width).fill(Infinity));
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  dist[start.y][start.x] = 0;

  for (;;) {
    let best = null;
    let bestDist = Infinity;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!visited[y][x] && dist[y][x] < bestDist) {
          bestDist = dist[y][x];
          best = { x, y };
        }
      }
    }
    if (!best) break;
    if (best.x === goal.x && best.y === goal.y) return dist[best.y][best.x];
    visited[best.y][best.x] = true;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = best.x + dx;
      const ny = best.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const targetType = cells[ny][nx];
      if (!isLegalStep(targetType, dx, dy)) continue;
      const next = dist[best.y][best.x] + stepCost(targetType);
      if (next < dist[ny][nx]) dist[ny][nx] = next;
    }
  }

  return dist[goal.y][goal.x];
}
