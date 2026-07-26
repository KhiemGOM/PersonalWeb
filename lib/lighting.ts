// Two-layer lighting system drawn on canvas.
//
// Layer 1 — Ambient pool: large soft radial gradient centered on robot,
//            sized to roughly illuminate the active section.
// Layer 2 — Directional beam: cone/spotlight from robot head toward cursor.
// Outside both lights = near-black (#0a0a0a with ~0.92 opacity overlay).

export interface LightingState {
  /** Robot position in canvas pixels */
  robotX: number;
  robotY: number;
  /** Mouse position in canvas pixels */
  mouseX: number;
  mouseY: number;
  /** Section accent color (hex) */
  accentColor: string;
  /** 0–1, used to fade light in/out on section transitions */
  intensity: number;
}

const VOID_COLOR = "10, 10, 10"; // rgb components of #0a0a0a

/**
 * Draws the full lighting overlay onto the canvas.
 * Call this AFTER drawing the background, BEFORE drawing the robot,
 * so the robot appears "lit" (it's drawn on top of the dark overlay).
 *
 * Actually: draw order is —
 *   1. Fill background void
 *   2. drawLighting (punches light holes into the void)
 *   3. drawRobot
 */
export function drawLighting(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: LightingState
): void {
  const { robotX, robotY, mouseX, mouseY, accentColor, intensity } = state;

  // --- Dark overlay ---
  ctx.fillStyle = `rgba(${VOID_COLOR}, 0.92)`;
  ctx.fillRect(0, 0, width, height);

  // --- Ambient pool (composite: destination-out punches a hole in the overlay) ---
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";

  const ambientRadius = Math.min(width, height) * 0.45;
  const ambientGrad = ctx.createRadialGradient(
    robotX, robotY, 0,
    robotX, robotY, ambientRadius
  );
  ambientGrad.addColorStop(0,   `rgba(255,255,255,${0.88 * intensity})`);
  ambientGrad.addColorStop(0.5, `rgba(255,255,255,${0.45 * intensity})`);
  ambientGrad.addColorStop(1,   "rgba(255,255,255,0)");

  ctx.fillStyle = ambientGrad;
  ctx.beginPath();
  ctx.arc(robotX, robotY, ambientRadius, 0, Math.PI * 2);
  ctx.fill();

  // --- Directional beam toward cursor ---
  const beamAngle = Math.atan2(mouseY - robotY, mouseX - robotX);
  const beamLength = Math.hypot(mouseX - robotX, mouseY - robotY) + 80;
  const beamWidth = 0.28; // radians, half-angle of cone

  ctx.save();
  ctx.translate(robotX, robotY - 52); // from head position (approx)
  ctx.rotate(beamAngle);

  const beamGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, beamLength);
  beamGrad.addColorStop(0,   `rgba(255,255,255,${0.7 * intensity})`);
  beamGrad.addColorStop(0.6, `rgba(255,255,255,${0.3 * intensity})`);
  beamGrad.addColorStop(1,   "rgba(255,255,255,0)");

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, beamLength, -beamWidth, beamWidth);
  ctx.closePath();
  ctx.fillStyle = beamGrad;
  ctx.fill();

  ctx.restore(); // beam transform
  ctx.restore(); // composite operation

  // --- Accent tint overlay (very subtle color wash in lit area) ---
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const r = parseInt(accentColor.slice(1, 3), 16);
  const g = parseInt(accentColor.slice(3, 5), 16);
  const b = parseInt(accentColor.slice(5, 7), 16);

  const tintGrad = ctx.createRadialGradient(
    robotX, robotY, 0,
    robotX, robotY, Math.min(width, height) * 0.35
  );
  tintGrad.addColorStop(0,   `rgba(${r},${g},${b},${0.08 * intensity})`);
  tintGrad.addColorStop(1,   "rgba(0,0,0,0)");

  ctx.fillStyle = tintGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
