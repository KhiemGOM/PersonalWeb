/**
 * Dataset and error math for the linear-regression tuner. No DOM here.
 */

/** Roughly y = 2.3x + 5 with hand-placed noise. */
export const POINTS = [
  { x: 0, y: 4 },
  { x: 1, y: 8 },
  { x: 2, y: 7 },
  { x: 3, y: 13 },
  { x: 4, y: 12 },
  { x: 5, y: 17 },
  { x: 6, y: 16 },
  { x: 7, y: 21 },
  { x: 8, y: 22 },
  { x: 9, y: 24 },
  { x: 10, y: 27 },
];

/**
 * Closed-form least-squares fit.
 * @param {{x:number,y:number}[]} points
 * @returns {{ slope: number, intercept: number }}
 */
export function leastSquares(points) {
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * @param {{x:number,y:number}[]} points
 * @param {number} slope
 * @param {number} intercept
 */
export function sumSquaredError(points, slope, intercept) {
  return points.reduce((total, p) => {
    const predicted = slope * p.x + intercept;
    return total + (p.y - predicted) ** 2;
  }, 0);
}
