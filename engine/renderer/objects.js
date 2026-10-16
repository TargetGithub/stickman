// Set pieces (STORY_SPEC 5.1, 8). Milestone: S1 (static drawing only; S4 adds behaviors).
// Each object's `draw` key names a procedural shape. World coordinates: x is the object's center,
// y its height above the floor. Layers: back (smaller, darker, behind characters), mid, front.

import { STAGE } from "../config.js";

const SHAPES = {
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
};

// Back-layer pieces are smaller and a little transparent, so they sink into the background (STORY_SPEC 14).
const LAYER_LOOK = { back: { scale: 0.75, alpha: 0.8 }, mid: { scale: 1, alpha: 1 }, front: { scale: 1.15, alpha: 0.95 } };

/**
 * Draw the set pieces of one layer in world space (the world transform is set by the caller).
 * @param {object} catalog  needs catalog.objects (no-op without it)
 * @param {Array<{ id, object, x, y?, layer?, facing?, state? }>} set
 */
export function drawSetPieces(ctx, catalog, set, layer) {
  if (!set || !set.length || !catalog.objects) return;
  for (const piece of set) {
    if ((piece.layer || "mid") !== layer) continue;
    const def = catalog.objects[piece.object];
    const shape = def && SHAPES[def.draw];
    if (!shape) continue;
    const look = LAYER_LOOK[layer];
    ctx.save();
    ctx.translate(piece.x, STAGE.groundY - (piece.y ?? 0));
    ctx.scale(look.scale * (piece.facing === -1 ? -1 : 1), look.scale);
    ctx.globalAlpha = look.alpha;
    shape(ctx, def.colors, piece);
    ctx.restore();
  }
}
