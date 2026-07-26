// Defines the robot's journey path across the main page.
// Each waypoint maps to a scroll progress [0..1] and a viewport-relative position.

export interface PathWaypoint {
  /** Scroll progress 0–1 at which robot reaches this point */
  progress: number;
  /** 0–1 of viewport width */
  xRatio: number;
  /** 0–1 of viewport height (robot is fixed on screen, section drives which waypoint) */
  yRatio: number;
  /** Which section this waypoint belongs to */
  section: "hero" | "about" | "projects" | "competitions" | "misc";
}

/** Waypoints in scroll order. Interpolate between adjacent ones. */
export const MAIN_PATH: PathWaypoint[] = [
  { progress: 0.0, xRatio: 0.5,  yRatio: 0.55, section: "hero" },
  { progress: 0.15, xRatio: 0.72, yRatio: 0.50, section: "hero" },
  { progress: 0.25, xRatio: 0.25, yRatio: 0.55, section: "about" },
  { progress: 0.45, xRatio: 0.65, yRatio: 0.45, section: "projects" },
  { progress: 0.65, xRatio: 0.30, yRatio: 0.50, section: "competitions" },
  { progress: 0.85, xRatio: 0.60, yRatio: 0.55, section: "misc" },
  { progress: 1.0,  xRatio: 0.50, yRatio: 0.50, section: "misc" },
];

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Given a scroll progress [0..1], return the interpolated robot position
 * in viewport-relative coords [0..1].
 */
export function getRobotPositionAtProgress(
  progress: number,
  path: PathWaypoint[] = MAIN_PATH
): { x: number; y: number; section: PathWaypoint["section"] } {
  // Clamp
  const p = Math.max(0, Math.min(1, progress));

  // Find surrounding waypoints
  let from = path[0];
  let to = path[path.length - 1];

  for (let i = 0; i < path.length - 1; i++) {
    if (p >= path[i].progress && p <= path[i + 1].progress) {
      from = path[i];
      to = path[i + 1];
      break;
    }
  }

  const segmentLength = to.progress - from.progress;
  const t = segmentLength === 0 ? 0 : (p - from.progress) / segmentLength;

  return {
    x: lerp(from.xRatio, to.xRatio, t),
    y: lerp(from.yRatio, to.yRatio, t),
    section: t < 0.5 ? from.section : to.section,
  };
}
