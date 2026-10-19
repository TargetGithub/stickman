// Village and market object shapes (STORY_SPEC 8), batch A5: haystack, cart, market stall, basket,
// kite (a floater) and apple (a ball). Same contract as object_shapes.js: drawn at the current origin,
// the object's bottom center (balls and floaters: their center), as (ctx, colors, piece, def).

import { kiteShape, basketShape } from "./props_more.js";

const OUTLINE = "#2a1d14";

function blob(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Short straw strokes in a band (fixed pattern: no randomness). */
function straws(ctx, color, pts) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const [x, y, dx, dy] of pts) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
  }
  ctx.stroke();
}

const STRAW = Array.from({ length: 26 }, (_, k) => {
  const a = Math.PI * (0.08 + (0.84 * k) / 25);
  const r = 70 + ((k * 37) % 30);
  return [-Math.cos(a) * r * 1.35, -Math.sin(a) * r * 1.05 - 10, ((k % 3) - 1) * 8, 18];
});

function wheel(ctx, x, y, r, turn, rim, hub) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = turn + (k * Math.PI) / 4;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();
  blob(ctx, x, y, r * 0.18, hub);
}

/** A sign with a picture of a jalebi (no text). */
function pictureSign(ctx, x, y, c) {
  ctx.fillStyle = c.sign;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - 34, y - 26, 68, 52, 8);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#ff9a1f";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let k = 0; k <= 30; k++) {
    const a = k * 0.45;
    const r = (15 * k) / 30;
    if (k) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

export const MARKET_SHAPES = {
  haystack(ctx, c) {
    ctx.fillStyle = c.straw;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-112, 0);
    ctx.bezierCurveTo(-118, -120, -60, -172, 0, -172);
    ctx.bezierCurveTo(60, -172, 118, -120, 112, 0);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    straws(ctx, c.dark, STRAW);
    straws(ctx, c.light, STRAW.map(([x, y, dx, dy]) => [x * 0.7 + 6, y * 0.75 + 10, -dx, dy]));
    ctx.restore();
    ctx.stroke();
    ctx.fillStyle = c.dark;
    ctx.fillRect(-112, -8, 224, 8);
  },
  cart(ctx, c, piece) {
    const wr = 40;
    // Handles reach back (left, facing right) to where someone pushes.
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-90, -wr - 40);
    ctx.lineTo(-175, -wr - 18);
    ctx.stroke();
    ctx.strokeStyle = c.wood;
    ctx.lineWidth = 7;
    ctx.stroke();
    // Vegetables piled in the bed.
    for (const [x, y, r, col] of [[-60, -wr - 78, 20, c.cabbage], [-22, -wr - 84, 18, c.tomato], [14, -wr - 80, 21, c.cabbage], [52, -wr - 76, 17, c.tomato], [-38, -wr - 96, 15, c.tomato], [30, -wr - 98, 16, c.cabbage]]) {
      blob(ctx, x, y, r + 2, OUTLINE);
      blob(ctx, x, y, r, col);
    }
    ctx.fillStyle = c.carrot;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    for (const x of [-6, 66]) {
      ctx.beginPath();
      ctx.moveTo(x - 8, -wr - 88); ctx.lineTo(x + 8, -wr - 90); ctx.lineTo(x + 2, -wr - 58); ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // The bed: planks with a darker rail.
    ctx.fillStyle = c.wood;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-100, -wr - 66);
    ctx.lineTo(100, -wr - 66);
    ctx.lineTo(88, -wr - 6);
    ctx.lineTo(-88, -wr - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const y of [-wr - 46, -wr - 26]) { ctx.moveTo(-95, y); ctx.lineTo(95, y); }
    ctx.stroke();
    // A prop leg at the back, the wheel at the middle.
    ctx.fillStyle = c.dark;
    ctx.fillRect(-82, -wr - 6, 9, wr + 6);
    wheel(ctx, 20, -wr, wr, piece.wheel || 0, c.wood, c.dark);
  },
  market_stall(ctx, c) {
    // Posts.
    ctx.fillStyle = c.post;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    for (const x of [-180, 168]) {
      ctx.fillRect(x, -300, 12, 300);
      ctx.strokeRect(x, -300, 12, 300);
    }
    // The striped awning with a scalloped edge.
    const stripes = 8;
    const left = -200;
    const sw = 400 / stripes;
    for (let k = 0; k < stripes; k++) {
      ctx.fillStyle = k % 2 ? c.stripe2 : c.stripe1;
      ctx.beginPath();
      ctx.moveTo(left + k * sw + 12, -340);
      ctx.lineTo(left + (k + 1) * sw - 12 + (k === stripes - 1 ? 12 : 0), -340);
      ctx.lineTo(left + (k + 1) * sw, -280);
      ctx.lineTo(left + k * sw, -280);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(left + k * sw + sw / 2, -280, sw / 2, 0, Math.PI);
      ctx.fill();
    }
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-188, -340);
    ctx.lineTo(188, -340);
    ctx.lineTo(200, -280);
    for (let k = stripes - 1; k >= 0; k--) ctx.arc(left + k * sw + sw / 2, -280, sw / 2, 0, Math.PI);
    ctx.closePath();
    ctx.stroke();
    // The picture sign hangs under the awning.
    ctx.beginPath();
    ctx.moveTo(-14, -252); ctx.lineTo(-14, -232); ctx.moveTo(14, -252); ctx.lineTo(14, -232);
    ctx.stroke();
    pictureSign(ctx, 0, -206, c);
    // Baskets of sweets and fruit on the table.
    basketShape(ctx, -110, -112, 74, c.basket, c.weave, OUTLINE);
    basketShape(ctx, 110, -112, 74, c.basket, c.weave, OUTLINE);
    for (const [x, col] of [[-128, c.sweet], [-108, c.sweet2], [-90, c.sweet]]) blob(ctx, x, -164, 10, col);
    for (const [x, col] of [[92, c.fruit], [112, c.fruit2], [130, c.fruit]]) blob(ctx, x, -164, 11, col);
    // A heap of jalebis in the middle.
    ctx.strokeStyle = "#ff9a1f";
    ctx.lineWidth = 6;
    for (const [x, y] of [[-24, -124], [6, -124], [-9, -142]]) {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 1.7);
      ctx.stroke();
    }
    // The table: a top and a cloth front panel.
    ctx.fillStyle = c.wood;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.fillRect(-196, -112, 392, 18);
    ctx.strokeRect(-196, -112, 392, 18);
    ctx.fillStyle = c.cloth;
    ctx.fillRect(-186, -94, 372, 94);
    ctx.strokeRect(-186, -94, 372, 94);
    ctx.fillStyle = c.stripe1;
    ctx.fillRect(-186, -94, 372, 12);
  },
  basket(ctx, c) {
    basketShape(ctx, 0, 0, 70, c.basket, c.weave, OUTLINE);
  },
  kite(ctx, c, piece, def) {
    kiteShape(ctx, { x: 0, y: 0 }, def.r, c.fill, c.trim, "#111111", piece.angle || 0);
    ctx.strokeStyle = "#555555"; // the loose string trails below
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, def.r * 0.2);
    ctx.quadraticCurveTo(def.r * 1.4, def.r * 2.5, def.r * 0.6, def.r * 4.2);
    ctx.stroke();
  },
  apple(ctx, c, piece, def) {
    const r = def.r;
    ctx.rotate(piece.angle || 0);
    blob(ctx, 0, 0, r + 1.5, "#111111");
    blob(ctx, 0, 0, r, c.fill);
    ctx.strokeStyle = "#6b4a2f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.8);
    ctx.lineTo(r * 0.15, -r * 1.3);
    ctx.stroke();
    ctx.fillStyle = c.leaf;
    ctx.beginPath();
    ctx.ellipse(r * 0.5, -r * 1.15, r * 0.42, r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    blob(ctx, -r * 0.4, -r * 0.35, r * 0.22, "rgba(255,255,255,0.55)");
  },
};
