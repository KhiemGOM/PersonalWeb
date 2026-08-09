/**
 * Projectile math for the FTC throw game. No DOM here.
 */

/** Pixels per second squared, tuned so trajectories fit the SVG stage nicely. */
export const GRAVITY = 520;
/** Launch point, in stage pixels. */
export const LAUNCH = { x: 20, y: 190 };
/** Zone width stays fixed; its position moves each attempt (see randomZone below). */
export const ZONE_WIDTH = 50;
/** Left-edge range the zone can land in, kept well inside max range so it's always
 *  reachable, and never so close to the launcher that it's trivial. */
export const ZONE_LEFT_RANGE = { min: 150, max: 260 };
/** Speed scale: slider power 0-100 maps to this many px/s at full power. Max range
 *  (v_max^2 / g at a 45-degree launch) lands at x ≈ 320, past the far edge of where the
 *  zone can ever appear (260 + 50 = 310), so every zone position stays reachable. */
export const MAX_SPEED = 395;

/** A fresh zone position for the next attempt. */
export function randomZone() {
  const left = ZONE_LEFT_RANGE.min + Math.random() * (ZONE_LEFT_RANGE.max - ZONE_LEFT_RANGE.min);
  return { min: left, max: left + ZONE_WIDTH };
}

/** Stage size, in the same px units the trajectory math uses. */
export const STAGE = { width: 340, height: 220 };

/**
 * @param {number} angleDeg
 * @param {number} power 0-100
 * @returns {{ points: {x:number,y:number}[], landingX: number }}
 */
export function computeTrajectory(angleDeg, power) {
  const angle = (angleDeg * Math.PI) / 180;
  const speed = (power / 100) * MAX_SPEED;
  const vx = speed * Math.cos(angle);
  const vy = -speed * Math.sin(angle);

  // Time of flight back to launch height: y(t) = LAUNCH.y + vy*t + 0.5*g*t^2 = LAUNCH.y
  const flightTime = (-2 * vy) / GRAVITY;

  const steps = 40;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = (flightTime * i) / steps;
    const x = LAUNCH.x + vx * t;
    const y = LAUNCH.y + vy * t + 0.5 * GRAVITY * t * t;
    points.push({ x, y });
  }

  const landingX = LAUNCH.x + vx * flightTime;
  return { points, landingX };
}

/**
 * @param {number} landingX
 * @param {{min:number,max:number}} zone
 */
export function isScore(landingX, zone) {
  return landingX >= zone.min && landingX <= zone.max;
}

/**
 * Initial velocity vector, as a short direction+magnitude indicator from the launch point.
 * Not to physical scale — just long enough to read as "this way, this hard."
 * @param {number} angleDeg
 * @param {number} power 0-100
 */
export function computeAimVector(angleDeg, power) {
  const angle = (angleDeg * Math.PI) / 180;
  const length = 24 + (power / 100) * 56;
  return {
    x: LAUNCH.x + length * Math.cos(angle),
    y: LAUNCH.y - length * Math.sin(angle),
  };
}
