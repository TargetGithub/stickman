// Procedural object shapes (STORY_SPEC 8). Milestone: S1 (set pieces), S4 (balls, floaters, vehicles).
// Each shape draws at the current origin: the object's bottom center (balls and floaters: their center).
// Signature: (ctx, colors, piece, def), where piece carries state, wheel turn and angle.
// Batch A5 village shapes live in object_shapes_market.js and join this table.

import { MARKET_SHAPES } from "./object_shapes_market.js";

export const SHAPES = {
  bench(ctx, c) {
    ctx.fillStyle = c.metal;
    ctx.fillRect(-110, -55, 12, 55);
    ctx.fillRect(98, -55, 12, 55);
    ctx.fillStyle = c.wood;
    ctx.fillRect(-130, -62, 260, 16);
    ctx.fillRect(-130, -110, 260, 14);
    ctx.fillRect(-130, -88, 260, 14);
  },
  chair(ctx, c) {
    ctx.fillStyle = c.wood;
    ctx.fillRect(-40, -80, 80, 12);
    ctx.fillRect(-40, -80, 10, 80);
    ctx.fillRect(30, -80, 10, 80);
    ctx.fillRect(30, -170, 10, 90);
    ctx.fillRect(-40, -170, 10, 90);
    ctx.fillRect(-40, -170, 80, 12);
  },
  table(ctx, c) {
    ctx.fillStyle = c.wood;
    ctx.fillRect(-110, -120, 220, 16);
    ctx.fillRect(-95, -104, 14, 104);
    ctx.fillRect(81, -104, 14, 104);
  },
  tree(ctx, c) {
    ctx.fillStyle = c.trunk;
    ctx.beginPath();
    ctx.moveTo(-34, 0); ctx.lineTo(-22, -300); ctx.lineTo(22, -300); ctx.lineTo(34, 0);
    ctx.closePath();
    ctx.fill();
    const blob = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    blob(-110, -360, 120, c.leaves);
    blob(110, -370, 115, c.leaves);
    blob(0, -470, 140, c.leaves);
    blob(-60, -420, 90, c.leaves2);
    blob(70, -500, 70, c.leaves2);
  },
  bush(ctx, c) {
    const blob = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.fill(); };
    blob(-60, 0, 70, c.leaves);
    blob(60, 0, 65, c.leaves);
    blob(0, 0, 100, c.leaves2);
  },
  lamppost(ctx, c) {
    const g = ctx.createRadialGradient(0, -490, 8, 0, -490, 130);
    g.addColorStop(0, "rgba(255, 231, 163, 0.45)");
    g.addColorStop(1, "rgba(255, 231, 163, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(-130, -620, 260, 260);
    ctx.fillStyle = c.metal;
    ctx.fillRect(-9, -480, 18, 480);
    ctx.fillRect(-26, -20, 52, 20);
    ctx.fillRect(-30, -520, 60, 16);
    ctx.fillStyle = c.light;
    ctx.beginPath();
    ctx.moveTo(-24, -504); ctx.lineTo(24, -504); ctx.lineTo(16, -470); ctx.lineTo(-16, -470);
    ctx.closePath();
    ctx.fill();
  },
  net(ctx, c) {
    ctx.fillStyle = c.post;
    ctx.fillRect(-6, -150, 12, 150);
    ctx.strokeStyle = c.net;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = -140; y <= -20; y += 20) { ctx.moveTo(-5, y); ctx.lineTo(5, y); }
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-8, -152, 16, 8);
  },
  sign(ctx, c) {
    ctx.fillStyle = c.post;
    ctx.fillRect(-8, -240, 16, 240);
    ctx.fillStyle = c.board;
    ctx.fillRect(-70, -240, 140, 80);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-70, -240, 140, 80);
  },
  crate(ctx, c) {
    ctx.fillStyle = c.wood;
    ctx.fillRect(-55, -110, 110, 110);
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 8;
    ctx.strokeRect(-51, -106, 102, 102);
    ctx.beginPath(); ctx.moveTo(-51, -4); ctx.lineTo(51, -106); ctx.stroke();
  },
  fountain(ctx, c) {
    ctx.fillStyle = c.stone;
    ctx.fillRect(-180, -70, 360, 70);
    ctx.fillRect(-24, -200, 48, 130);
    ctx.fillRect(-90, -210, 180, 20);
    ctx.fillStyle = c.water;
    ctx.fillRect(-170, -64, 340, 16);
    ctx.globalAlpha *= 0.7;
    ctx.beginPath();
    ctx.ellipse(0, -235, 40, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  cage(ctx, c, piece) {
    ctx.fillStyle = c.base;
    ctx.fillRect(-85, -16, 170, 16);
    ctx.fillRect(-85, -230, 170, 14);
    ctx.strokeStyle = c.bar;
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let x = -75; x <= 75; x += 25) {
      if (piece.state === "open" && x > 0) continue; // the door half swings away
      ctx.moveTo(x, -16);
      ctx.lineTo(x, -216);
    }
    ctx.stroke();
  },
  box(ctx, c) {
    ctx.fillStyle = c.card;
    ctx.fillRect(-45, -70, 90, 70);
    ctx.fillStyle = c.tape;
    ctx.fillRect(-45, -70, 90, 10);
    ctx.fillRect(-6, -70, 12, 70);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-45, -70, 90, 70);
  },
  car(ctx, c, piece) {
    const wr = 26;
    ctx.fillStyle = c.body;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-160, -wr - 54, 320, 60, 18);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-90, -wr - 52);
    ctx.lineTo(-60, -wr - 112);
    ctx.lineTo(60, -wr - 112);
    ctx.lineTo(100, -wr - 52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.window;
    ctx.fillRect(-58, -wr - 104, 52, 46);
    ctx.fillRect(4, -wr - 104, 52, 46);
    for (const x of [-100, 100]) wheel(ctx, x, -wr, wr, piece.wheel || 0, c.wheel);
    ctx.fillStyle = "#ffe08a";
    ctx.fillRect(150, -wr - 44, 10, 14);
  },
  bike(ctx, c, piece) {
    const wr = 34;
    for (const x of [-58, 58]) wheel(ctx, x, -wr, wr, piece.wheel || 0, c.wheel, true);
    ctx.strokeStyle = c.frame;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-58, -wr);
    ctx.lineTo(-8, -wr - 40);
    ctx.lineTo(40, -wr - 40);
    ctx.lineTo(58, -wr);
    ctx.moveTo(-8, -wr - 40);
    ctx.lineTo(0, -wr);
    ctx.lineTo(-58, -wr);
    ctx.moveTo(40, -wr - 40);
    ctx.lineTo(46, -wr - 62);
    ctx.stroke();
    ctx.fillStyle = "#222222";
    ctx.fillRect(-22, -wr - 50, 30, 8);
  },
  ball(ctx, c, piece, def) {
    const r = def.r;
    ctx.fillStyle = c.fill;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(piece.angle || 0);
    ctx.strokeStyle = c.seam;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-r * 1.2, 0, r * 0.9, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 1.2, 0, r * 0.9, Math.PI - 0.9, Math.PI + 0.9);
    ctx.stroke();
  },
  football(ctx, c, piece, def) {
    const r = def.r;
    ctx.fillStyle = c.fill;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(piece.angle || 0);
    ctx.fillStyle = c.patch;
    for (let k = 0; k < 5; k++) {
      const a = (k * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  },
  bubble(ctx, c, piece, def) {
    const r = def.r;
    ctx.strokeStyle = c.rim;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = "rgba(200, 235, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 170, 230, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0.4, 1.6);
    ctx.stroke();
    ctx.fillStyle = c.shine;
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, -r * 0.4, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
    ctx.fill();
  },
  balloon(ctx, c, piece, def) {
    const r = def.r;
    ctx.strokeStyle = "#444444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, r * 1.15);
    ctx.quadraticCurveTo(8, r * 2, -4, r * 3);
    ctx.stroke();
    ctx.fillStyle = c.fill;
    ctx.strokeStyle = "#111111";
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.4, r * 0.18, r * 0.3, -0.4, 0, Math.PI * 2);
    ctx.fill();
  },
  door(ctx, c, piece) {
    ctx.fillStyle = c.frame;
    ctx.fillRect(-65, -260, 130, 260);
    ctx.fillStyle = piece.state === "open" ? "#1b1512" : c.door;
    ctx.fillRect(-55, -250, 110, 250);
    if (piece.state !== "open") {
      ctx.fillStyle = "#e0c060";
      ctx.beginPath(); ctx.arc(35, -125, 7, 0, Math.PI * 2); ctx.fill();
    }
  },
  ...MARKET_SHAPES,
};

function wheel(ctx, x, y, r, turn, color, spokes = false) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (spokes) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.stroke();
  } else ctx.fill();
  ctx.strokeStyle = spokes ? color : "#bbbbbb";
  ctx.lineWidth = spokes ? 2 : 4;
  ctx.beginPath();
  for (let k = 0; k < (spokes ? 6 : 3); k++) {
    const a = turn + (k * Math.PI * 2) / (spokes ? 6 : 3);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * (spokes ? 0.95 : 0.55), y + Math.sin(a) * r * (spokes ? 0.95 : 0.55));
  }
  ctx.stroke();
}
