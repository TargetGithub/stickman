// Spice fort object shapes (STORY_SPEC 8), Doopi & Friends batch B: a giant cooking pot over a fire
// (steam rises with the scene time), a lever (up/down), a trapdoor (closed/open) and a rope bridge
// (whole/broken). Same contract as object_shapes.js: drawn at the object's bottom center as
// (ctx, colors, piece, def); piece.t is the fx time for animated pieces.

const OUTLINE = "#2a1d14";

function outlined(ctx, fill, lw = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.stroke();
}

export const FORT_SHAPES = {
  giant_pot(ctx, c, piece) {
    const t = piece.t ?? 0;
    // Fire under the pot.
    for (const [dx, h, col] of [[-70, 70, c.flame], [0, 95, c.flame], [70, 70, c.flame], [-30, 55, c.flame2], [35, 60, c.flame2]]) {
      const f = 1 + 0.15 * Math.sin(t * 10 + dx);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(dx - 26, 0);
      ctx.quadraticCurveTo(dx, -h * f * 1.3, dx + 26, 0);
      ctx.fill();
    }
    // The pot: a wide round body with a rim and two handles.
    ctx.beginPath();
    ctx.moveTo(-200, -330);
    ctx.bezierCurveTo(-240, -120, -150, -40, 0, -40);
    ctx.bezierCurveTo(150, -40, 240, -120, 200, -330);
    ctx.closePath();
    outlined(ctx, c.pot, 6);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * 225, -250, 26, 34, 0, 0, Math.PI * 2);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 10;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, -330, 214, 34, 0, 0, Math.PI * 2);
    outlined(ctx, c.rim, 6);
    ctx.beginPath();
    ctx.ellipse(0, -330, 190, 24, 0, 0, Math.PI * 2);
    outlined(ctx, c.curry, 3);
    // Bubbles and steam.
    ctx.fillStyle = c.bubble;
    for (let k = 0; k < 5; k++) {
      const ph = (t * 1.3 + k * 0.37) % 1;
      ctx.beginPath();
      ctx.arc(-140 + k * 70, -332, 8 + 10 * ph, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let k = 0; k < 6; k++) {
      const u = (t * 0.35 + k / 6) % 1;
      ctx.fillStyle = `rgba(255,255,255,${(0.45 * (1 - u)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(-120 + k * 48 + Math.sin(t * 2 + k) * 20, -370 - u * 260, 26 + u * 40, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  lever(ctx, c, piece) {
    const up = piece.state !== "down";
    ctx.beginPath();
    ctx.roundRect(-50, -40, 100, 40, 8);
    outlined(ctx, c.base);
    ctx.save();
    ctx.translate(0, -30);
    ctx.rotate(up ? -0.5 : 0.5);
    ctx.lineCap = "round";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -120);
    ctx.stroke();
    ctx.strokeStyle = c.handle;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -126, 16, 0, Math.PI * 2);
    outlined(ctx, c.knob);
    ctx.restore();
  },
  trapdoor(ctx, c, piece) {
    // A square of planks in the floor; open shows the dark hole and the flap hanging down.
    if (piece.state === "open") {
      ctx.fillStyle = c.hole;
      ctx.fillRect(-110, -2, 220, 30);
      ctx.beginPath();
      ctx.rect(-110, 0, 18, 70);
      outlined(ctx, c.wood, 3);
      return;
    }
    ctx.beginPath();
    ctx.rect(-110, -6, 220, 12);
    outlined(ctx, c.wood, 3);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const x of [-55, 0, 55]) { ctx.moveTo(x, -6); ctx.lineTo(x, 6); }
    ctx.stroke();
    ctx.fillStyle = c.metal;
    ctx.fillRect(70, -10, 26, 6);
  },
  rope_bridge(ctx, c, piece) {
    const w = 560;
    const sag = (u) => 50 * 4 * u * (1 - u);
    // Posts at both ends.
    for (const x of [-w / 2, w / 2]) {
      ctx.beginPath();
      ctx.rect(x - 12, -150, 24, 150);
      outlined(ctx, c.post, 3);
    }
    if (piece.state === "broken") {
      // Two loose halves hanging from the posts, a few planks.
      ctx.strokeStyle = c.rope;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -120); ctx.quadraticCurveTo(-w / 2 + 30, -40, -w / 2 + 20, 60);
      ctx.moveTo(w / 2, -120); ctx.quadraticCurveTo(w / 2 - 30, -40, w / 2 - 20, 60);
      ctx.stroke();
      for (const [x, y, a] of [[-w / 2 + 22, 10, 1.3], [-w / 2 + 18, 45, 1.5], [w / 2 - 20, 20, -1.4]]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.rect(-26, -7, 52, 14);
        outlined(ctx, c.plank, 2);
        ctx.restore();
      }
      return;
    }
    for (let k = 0; k < 14; k++) {
      const u = (k + 0.5) / 14;
      ctx.beginPath();
      ctx.rect(-w / 2 + u * w - 18, -12 + sag(u) * 0.4, 36, 12);
      outlined(ctx, c.plank, 2);
    }
    ctx.strokeStyle = c.rope;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (const y0 of [-110, -12]) {
      ctx.moveTo(-w / 2, y0);
      for (let u = 0; u <= 1.001; u += 0.05) ctx.lineTo(-w / 2 + u * w, y0 + sag(u) * (y0 < -50 ? 1 : 0.4));
    }
    for (let k = 1; k < 8; k++) {
      const u = k / 8;
      ctx.moveTo(-w / 2 + u * w, -110 + sag(u));
      ctx.lineTo(-w / 2 + u * w, -12 + sag(u) * 0.4);
    }
    ctx.stroke();
  },
};
