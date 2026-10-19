// Set pieces for the Doopi & Friends places (batch A4): crystal_socket, throne, crystal_ball.
// Same contract as object_shapes.js: (ctx, colors, piece, def), drawn at the object's bottom center.

const GEM = [[0, -1], [0.62, -0.55], [0.62, 0.45], [0, 1], [-0.62, 0.45], [-0.62, -0.55]];

function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function poly(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

/** A six-sided gem centered at (x, y), half height h, two shades and a highlight. */
function gem(ctx, x, y, h, color, shade) {
  const pts = GEM.map(([gx, gy]) => [x + gx * h, y + gy * h]);
  poly(ctx, pts, color);
  poly(ctx, [pts[0], pts[1], pts[2], pts[3], [x, y]], shade);
  poly(ctx, [[x - h * 0.4, y - h * 0.5], [x - h * 0.1, y - h * 0.75], [x - h * 0.05, y - h * 0.3]], "rgba(255,255,255,0.85)");
}

/** A curly horn: a tapered arc from (x, y) curling outward (dir ±1). */
function horn(ctx, x, y, dir, size, color) {
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 1.6;
    const a1 = ((i + 1) / steps) * Math.PI * 1.6;
    const r0 = size * (1 - (i / steps) * 0.55);
    const r1 = size * (1 - ((i + 1) / steps) * 0.55);
    ctx.lineWidth = size * 0.42 * (1 - i / steps) + 3;
    ctx.beginPath();
    ctx.moveTo(x + dir * (size - r0 * Math.cos(a0)), y - r0 * Math.sin(a0));
    ctx.lineTo(x + dir * (size - r1 * Math.cos(a1)), y - r1 * Math.sin(a1));
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

export const PLACE_SHAPES = {
  crystal_socket(ctx, c, piece) {
    const state = piece.state || "empty";
    const lit = state !== "empty" && c[state];
    if (lit) glow(ctx, 0, -46, 80, c[state], 0.55);
    // A root knot cradle: a rounded wooden cup with two little root curls.
    ctx.fillStyle = c.wood;
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.quadraticCurveTo(-46, -30, -30, -40);
    ctx.lineTo(30, -40);
    ctx.quadraticCurveTo(46, -30, 40, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c.wood;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-38, -6); ctx.quadraticCurveTo(-60, -4, -64, 4);
    ctx.moveTo(38, -6); ctx.quadraticCurveTo(60, -2, 66, 4);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = c.rim;
    ctx.beginPath();
    ctx.ellipse(0, -40, 32, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.hollow;
    ctx.beginPath();
    ctx.ellipse(0, -40, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (lit) gem(ctx, 0, -62, 24, c[state], "rgba(0,0,0,0.22)");
  },
  throne(ctx, c) {
    // Horns behind the back, then the tall back, seat, arms and legs.
    horn(ctx, -88, -400, -1, 62, c.horn);
    horn(ctx, 88, -400, 1, 62, c.horn);
    ctx.fillStyle = c.frame;
    ctx.beginPath();
    ctx.moveTo(-100, -100);
    ctx.lineTo(-100, -380);
    ctx.quadraticCurveTo(-100, -440, 0, -450);
    ctx.quadraticCurveTo(100, -440, 100, -380);
    ctx.lineTo(100, -100);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.cushion;
    ctx.beginPath();
    ctx.moveTo(-70, -110);
    ctx.lineTo(-70, -370);
    ctx.quadraticCurveTo(-70, -410, 0, -418);
    ctx.quadraticCurveTo(70, -410, 70, -370);
    ctx.lineTo(70, -110);
    ctx.closePath();
    ctx.fill();
    gem(ctx, 0, -395, 16, c.gem, "rgba(0,0,0,0.25)");
    ctx.fillStyle = c.frame;
    ctx.fillRect(-120, -112, 240, 26); // seat
    ctx.fillRect(-128, -200, 34, 200); // arms and front legs
    ctx.fillRect(94, -200, 34, 200);
    ctx.fillStyle = c.horn;
    ctx.fillRect(-136, -212, 50, 16);
    ctx.fillRect(86, -212, 50, 16);
    ctx.fillRect(-120, -92, 240, 8);
    ctx.fillStyle = c.cushion;
    ctx.fillRect(-94, -134, 188, 24);
  },
  crystal_ball(ctx, c) {
    // A carved stand with a glowing ball on top.
    ctx.fillStyle = c.stand;
    ctx.fillRect(-50, -18, 100, 18);
    ctx.beginPath();
    ctx.moveTo(-20, -18); ctx.lineTo(-12, -130); ctx.lineTo(12, -130); ctx.lineTo(20, -18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-40, -130); ctx.lineTo(40, -130); ctx.lineTo(28, -152); ctx.lineTo(-28, -152);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.trim;
    ctx.fillRect(-44, -134, 88, 8);
    ctx.fillRect(-54, -22, 108, 6);
    glow(ctx, 0, -196, 110, c.glow, 0.6);
    ctx.fillStyle = c.ball;
    ctx.beginPath();
    ctx.arc(0, -196, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.swirl;
    ctx.beginPath();
    ctx.arc(-6, -190, 24, 0.4, Math.PI * 1.6);
    ctx.arc(4, -200, 12, Math.PI * 1.6, 0.4, true);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.ellipse(-18, -216, 10, 6, -0.6, 0, Math.PI * 2);
    ctx.fill();
  },
};
