// Travel and camp object shapes (STORY_SPEC 8), Doopi & Friends batch B: the village bus (a vehicle)
// and a campfire (static; its flames flicker with the scene time). Same contract as object_shapes.js:
// drawn at the object's bottom center as (ctx, colors, piece, def); piece.t is the fx time when known.

const OUTLINE = "#1f2a30";

function busWheel(ctx, x, y, r, turn) {
  ctx.fillStyle = "#26282c";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9ccd2";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7d8088";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = turn + (k * Math.PI * 2) / 3;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45);
  }
  ctx.stroke();
}

export const TRAVEL_SHAPES = {
  lantern_string(ctx, c, piece) {
    // Paper lanterns on a sagging string between two poles; they glow softly and sway with time.
    const t = piece.t ?? 0;
    const w = 620;
    const y0 = -330;
    ctx.fillStyle = c.pole;
    for (const x of [-w / 2, w / 2]) ctx.fillRect(x - 6, y0 - 10, 12, -y0 + 10);
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let u = 0; u <= 1.001; u += 0.05) ctx.lineTo(-w / 2 + u * w, y0 + 60 * 4 * u * (1 - u));
    ctx.stroke();
    const cols = c.lanterns || ["#e63946", "#ffd23f", "#2bb39a", "#2f7de1", "#ff7eb6"];
    for (let k = 1; k < 8; k++) {
      const u = k / 8;
      const x = -w / 2 + u * w + Math.sin(t * 1.4 + k) * 4;
      const y = y0 + 60 * 4 * u * (1 - u) + 26;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255,200,120,0.18)";
      ctx.beginPath();
      ctx.arc(x, y, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = cols[k % cols.length];
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 20, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  },
  ribbon(ctx, c) {
    // A pink ribbon bow lying on the ground.
    ctx.fillStyle = c.ribbon;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(side * 26, -24);
      ctx.lineTo(side * 26, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(side * 4, -10);
      ctx.lineTo(side * 18, 4);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, -12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  },
  bus(ctx, c, piece) {
    const wr = 42;
    const top = -wr - 250;
    // Luggage on the roof rack.
    for (const [x, w, h, col] of [[-170, 90, 46, c.bag1], [-60, 70, 36, c.bag2], [30, 110, 52, c.bag1], [160, 60, 30, c.bag2]]) {
      ctx.fillStyle = col;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, top - h, w, h, 8);
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-230, top - 4); ctx.lineTo(230, top - 4);
    ctx.stroke();
    // Body.
    ctx.fillStyle = c.body;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(-260, top, 520, 250 - 4, [40, 70, 18, 18]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.lower;
    ctx.fillRect(-257, -wr - 95, 514, 80);
    ctx.fillStyle = c.stripe;
    ctx.fillRect(-257, -wr - 110, 514, 16);
    // Windows and a door at the front.
    ctx.fillStyle = c.window;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.roundRect(-235 + k * 105, top + 26, 88, 80, 12);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.roundRect(196, top + 26, 46, 80, [12, 40, 12, 12]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.door;
    ctx.fillRect(150, top + 120, 36, 120 - wr);
    // Headlight and bumper.
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(248, -wr - 50, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#555a60";
    ctx.fillRect(-266, -wr - 18, 532, 14);
    for (const x of [-160, 160]) busWheel(ctx, x, -wr, wr, piece.wheel || 0);
  },
  campfire(ctx, c, piece) {
    // A ring of stones and crossed logs; the flames flicker unless the state is "out".
    for (let k = 0; k < 7; k++) {
      const x = -70 + k * 23;
      ctx.fillStyle = k % 2 ? c.stone : c.stone2;
      ctx.beginPath();
      ctx.ellipse(x, -10, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = c.log;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-50, -10); ctx.lineTo(40, -38);
    ctx.moveTo(50, -10); ctx.lineTo(-40, -38);
    ctx.stroke();
    if (piece.state === "out") {
      ctx.fillStyle = "rgba(120,120,120,0.5)";
      ctx.beginPath();
      ctx.ellipse(0, -60, 18, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const t = piece.t ?? 0;
    const flame = (h, w, col, ph) => {
      const f = 1 + 0.12 * Math.sin(t * 11 + ph) + 0.06 * Math.sin(t * 23 + ph * 2);
      const lean = 6 * Math.sin(t * 7 + ph);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-w, -30);
      ctx.quadraticCurveTo(-w * 0.9, -30 - h * 0.6 * f, lean, -30 - h * f);
      ctx.quadraticCurveTo(w * 0.9, -30 - h * 0.6 * f, w, -30);
      ctx.closePath();
      ctx.fill();
    };
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,160,60,0.18)";
    ctx.beginPath();
    ctx.arc(0, -60, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    flame(110, 46, c.flame, 0);
    flame(80, 32, c.flame2, 1.7);
    flame(46, 18, c.core, 3.1);
  },
};
