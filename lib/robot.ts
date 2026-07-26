// Draws the geometric robot on a 2D canvas context.
// Aesthetic: Google-style bold flat polygons, hard shadows, minimal detail.

export interface RobotState {
  /** Canvas pixel position of robot center (feet) */
  x: number;
  y: number;
  /** Head rotation in radians (tracks mouse) */
  headAngle: number;
  /** Overall scale factor */
  scale: number;
}

const COLORS = {
  body:        "#ddd5c8",
  bodyShade:   "#a89f94",
  torsoLight:  "#f0e8dc",
  torsoShade:  "#c4b8aa",
  head:        "#e8ddd0",
  headShade:   "#b0a598",
  eye:         "#1a1a2e",
  eyeGlow:     "#4a9eff",
  joint:       "#2a2420",
  legLight:    "#d4ccc0",
  legShade:    "#8a8078",
  armLight:    "#ccc4b8",
  armShade:    "#7a7268",
  antenna:     "#f5c842",
};

/**
 * Draws the full robot centered at (x, y).
 * headAngle = 0 faces right; robot faces right by default.
 */
export function drawRobot(
  ctx: CanvasRenderingContext2D,
  state: RobotState
): void {
  const { x, y, headAngle, scale: s } = state;

  ctx.save();
  ctx.translate(x, y);

  // --- Legs ---
  drawLeg(ctx, s, -14, 0,  true);
  drawLeg(ctx, s,  14, 0, false);

  // --- Torso ---
  drawTorso(ctx, s);

  // --- Arms ---
  drawArm(ctx, s, -1); // left
  drawArm(ctx, s,  1); // right

  // --- Head (rotates with headAngle) ---
  ctx.save();
  ctx.translate(0, -s * 52);
  ctx.rotate(headAngle * 0.25); // subtle tilt, not full rotate
  drawHead(ctx, s);
  ctx.restore();

  ctx.restore();
}

function drawTorso(ctx: CanvasRenderingContext2D, s: number) {
  // Trapezoid torso — wider at top
  ctx.beginPath();
  ctx.moveTo(-s * 20, -s * 48);
  ctx.lineTo( s * 20, -s * 48);
  ctx.lineTo( s * 16, -s * 10);
  ctx.lineTo(-s * 16, -s * 10);
  ctx.closePath();
  ctx.fillStyle = COLORS.torsoLight;
  ctx.fill();

  // Shadow face (right side shading)
  ctx.beginPath();
  ctx.moveTo(s * 4, -s * 48);
  ctx.lineTo(s * 20, -s * 48);
  ctx.lineTo(s * 16, -s * 10);
  ctx.lineTo(s * 4,  -s * 10);
  ctx.closePath();
  ctx.fillStyle = COLORS.torsoShade;
  ctx.fill();

  // Chest detail — small rectangle
  ctx.fillStyle = COLORS.joint;
  ctx.fillRect(-s * 6, -s * 36, s * 12, s * 8);
  ctx.fillStyle = COLORS.eyeGlow;
  ctx.fillRect(-s * 4, -s * 34, s * 8, s * 4);
}

function drawHead(ctx: CanvasRenderingContext2D, s: number) {
  // Rounded rectangle approximated as polygon
  ctx.beginPath();
  ctx.moveTo(-s * 18, -s * 28);
  ctx.lineTo( s * 18, -s * 28);
  ctx.lineTo( s * 18,  s * 0);
  ctx.lineTo(-s * 18,  s * 0);
  ctx.closePath();
  ctx.fillStyle = COLORS.head;
  ctx.fill();

  // Shade
  ctx.beginPath();
  ctx.moveTo(s * 4,  -s * 28);
  ctx.lineTo(s * 18, -s * 28);
  ctx.lineTo(s * 18,  s * 0);
  ctx.lineTo(s * 4,   s * 0);
  ctx.closePath();
  ctx.fillStyle = COLORS.headShade;
  ctx.fill();

  // Eyes
  ctx.fillStyle = COLORS.eye;
  ctx.fillRect(-s * 12, -s * 20, s * 8, s * 8);
  ctx.fillRect(  s * 4, -s * 20, s * 8, s * 8);

  // Eye glow
  ctx.fillStyle = COLORS.eyeGlow;
  ctx.fillRect(-s * 10, -s * 18, s * 4, s * 4);
  ctx.fillRect(   s * 6, -s * 18, s * 4, s * 4);

  // Antenna
  ctx.strokeStyle = COLORS.joint;
  ctx.lineWidth = s * 2;
  ctx.beginPath();
  ctx.moveTo(0, -s * 28);
  ctx.lineTo(0, -s * 40);
  ctx.stroke();
  ctx.fillStyle = COLORS.antenna;
  ctx.beginPath();
  ctx.arc(0, -s * 42, s * 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  s: number,
  offsetX: number,
  _offsetY: number,
  isLeft: boolean
) {
  ctx.save();
  ctx.translate(s * offsetX, 0);

  // Upper leg
  ctx.beginPath();
  ctx.moveTo(-s * 6, -s * 8);
  ctx.lineTo( s * 6, -s * 8);
  ctx.lineTo( s * 5,  s * 14);
  ctx.lineTo(-s * 5,  s * 14);
  ctx.closePath();
  ctx.fillStyle = isLeft ? COLORS.legLight : COLORS.legShade;
  ctx.fill();

  // Knee joint
  ctx.fillStyle = COLORS.joint;
  ctx.beginPath();
  ctx.arc(0, s * 14, s * 5, 0, Math.PI * 2);
  ctx.fill();

  // Lower leg
  ctx.beginPath();
  ctx.moveTo(-s * 5, s * 14);
  ctx.lineTo( s * 5, s * 14);
  ctx.lineTo( s * 4, s * 30);
  ctx.lineTo(-s * 4, s * 30);
  ctx.closePath();
  ctx.fillStyle = isLeft ? COLORS.legLight : COLORS.legShade;
  ctx.fill();

  // Foot
  ctx.beginPath();
  ctx.moveTo(-s * 8, s * 30);
  ctx.lineTo( s * 10, s * 30);
  ctx.lineTo( s * 10, s * 36);
  ctx.lineTo(-s * 8,  s * 36);
  ctx.closePath();
  ctx.fillStyle = COLORS.joint;
  ctx.fill();

  ctx.restore();
}

function drawArm(ctx: CanvasRenderingContext2D, s: number, side: -1 | 1) {
  ctx.save();
  ctx.translate(side * s * 22, -s * 40);

  // Upper arm
  ctx.beginPath();
  ctx.moveTo(-s * 4,  0);
  ctx.lineTo( s * 4,  0);
  ctx.lineTo( s * 3,  s * 20);
  ctx.lineTo(-s * 3,  s * 20);
  ctx.closePath();
  ctx.fillStyle = side === -1 ? COLORS.armLight : COLORS.armShade;
  ctx.fill();

  // Elbow
  ctx.fillStyle = COLORS.joint;
  ctx.beginPath();
  ctx.arc(0, s * 20, s * 4, 0, Math.PI * 2);
  ctx.fill();

  // Lower arm
  ctx.beginPath();
  ctx.moveTo(-s * 3, s * 20);
  ctx.lineTo( s * 3, s * 20);
  ctx.lineTo( s * 2, s * 36);
  ctx.lineTo(-s * 2, s * 36);
  ctx.closePath();
  ctx.fillStyle = side === -1 ? COLORS.armLight : COLORS.armShade;
  ctx.fill();

  ctx.restore();
}
