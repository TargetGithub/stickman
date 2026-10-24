// Baaaana pieces (series/baaaana/PLAN.md, task 2): sprout kinds on top of the head (leaf_sprout, curly_vine,
// flower_bud, flower_bloom), the party_hat, a whistle on a cord, and a clipboard in the near hand.
// Head pieces are drawn in face axes like accessories_more.js (angle 0 forward, 90° up, 180° back) and slide
// toward the middle of a turned head (slideAt). Swap flower_bud for flower_bloom with an appearance change.

import { dimsOf } from "../skeleton.js";

const INK = "#111111";
const DEG = Math.PI / 180;

const at = (c, r, ax, fa, ua) => ({ x: c.x + r * (fa * ax.f.x + ua * ax.u.x), y: c.y + r * (fa * ax.f.y + ua * ax.u.y) });
const polar = (c, r, ax, phi, k = 1) => at(c, r, ax, Math.cos(phi * DEG) * k, Math.sin(phi * DEG) * k);

/** Multiply a #rrggbb color by k. */
function tint(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

function disc(ctx, p, rad, color, lw) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (lw) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** An inked stem through points (a quadratic per pair after the first), green core over a dark outline. */
function stem(ctx, pts, r, color) {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i + 1 < pts.length; i += 2) ctx.quadraticCurveTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.17;
  path();
  ctx.stroke();
  ctx.strokeStyle = tint(color, 0.8);
  ctx.lineWidth = r * 0.09;
  path();
  ctx.stroke();
}

/** A pointed leaf (two arcs) from base p along angle ang, len long, with a midrib. */
function leaf(ctx, p, ang, len, wid, color, lw) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
  ctx.quadraticCurveTo(len * 0.45, wid, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.strokeStyle = tint(color, 0.7);
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(len * 0.12, 0);
  ctx.lineTo(len * 0.78, 0);
  ctx.stroke();
  ctx.restore();
}

/** Angle on screen of a direction (fa, ua) in face axes. */
const dirAng = (ax, fa, ua) => Math.atan2(fa * ax.f.y + ua * ax.u.y, fa * ax.f.x + ua * ax.u.x);

/** Mooka's single big leaf on a short stem, leaning forward. */
function leafSprout(ctx, c, r, ax, color) {
  const tip = polar(c, r, ax, 88, 1.45);
  stem(ctx, [polar(c, r, ax, 96, 0.96), polar(c, r, ax, 102, 1.25), tip], r, color);
  leaf(ctx, tip, dirAng(ax, 0.75, 0.66), r * 0.95, r * 0.36, color, r * 0.07);
}

/** A stem that rises and rolls into a spiral curl toward the back, with one small leaf. */
function curlyVine(ctx, c, r, ax, color) {
  const base = polar(c, r, ax, 92, 0.96);
  const top = polar(c, r, ax, 96, 1.6);
  leaf(ctx, polar(c, r, ax, 92, 1.22), dirAng(ax, 0.8, 0.4), r * 0.5, r * 0.2, color, r * 0.06);
  stem(ctx, [base, polar(c, r, ax, 84, 1.3), top], r, color);
  // The curl: a shrinking circle around a centre behind the top of the stem.
  const ctr = at(c, r, ax, -0.18, 1.62);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const th = (90 + 400 * (i / 24)) * DEG; // from the top, back and down, round and in
    const k = 0.24 * (1 - 0.7 * (i / 24));
    pts.push(at(ctr, r, ax, Math.cos(th) * k, Math.sin(th) * k));
  }
  pts[0] = top;
  for (const [w, col] of [[0.17, INK], [0.09, tint(color, 0.8)]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = r * w;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
}

/** A closed pink bud with two green sepals on a stem. */
function flowerBud(ctx, c, r, ax, color) {
  const tip = polar(c, r, ax, 92, 1.4);
  stem(ctx, [polar(c, r, ax, 96, 0.96), polar(c, r, ax, 100, 1.2), tip], r, "#3fae5a");
  const up = dirAng(ax, 0.1, 1);
  leaf(ctx, polar(c, r, ax, 92, 1.38), up, r * 0.62, r * 0.3, color, r * 0.07);
  for (const s of [1, -1]) leaf(ctx, tip, dirAng(ax, 0.75 * s, 0.6), r * 0.34, r * 0.14, "#3fae5a", r * 0.06);
}

/** The bud in bloom: five round petals around a yellow middle, facing the camera. */
function flowerBloom(ctx, c, r, ax, color) {
  const tip = polar(c, r, ax, 92, 1.45);
  stem(ctx, [polar(c, r, ax, 96, 0.96), polar(c, r, ax, 100, 1.2), tip], r, "#3fae5a");
  const ctr = polar(c, r, ax, 92, 1.75);
  const pr = r * 0.22;
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 + 90) * DEG;
    disc(ctx, { x: ctr.x + Math.cos(a) * pr * 1.15, y: ctr.y - Math.sin(a) * pr * 1.15 }, pr, color, r * 0.06);
  }
  disc(ctx, ctr, pr * 0.72, "#ffd60a", r * 0.06);
}

/** A striped cone party hat with a pompom, tipped a little back. */
function partyHat(ctx, c, r, ax, color) {
  const a = polar(c, r, ax, 52, 0.94);
  const b = polar(c, r, ax, 128, 0.94);
  const tip = polar(c, r, ax, 98, 2.35);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.lineTo(b.x, b.y);
  ctx.quadraticCurveTo(polar(c, r, ax, 90, 1.12).x, polar(c, r, ax, 90, 1.12).y, a.x, a.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = r * 0.16;
  for (const t of [0.3, 0.58, 0.82]) {
    // Bands across the cone, parallel to its base.
    const p = { x: a.x + (tip.x - a.x) * t, y: a.y + (tip.y - a.y) * t };
    const q = { x: b.x + (tip.x - b.x) * t, y: b.y + (tip.y - b.y) * t };
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.08;
  ctx.lineJoin = "round";
  ctx.stroke();
  disc(ctx, tip, r * 0.2, "#ffd60a", r * 0.07);
}

const HEAD = [["leaf_sprout", 96, leafSprout], ["curly_vine", 92, curlyVine], ["flower_bud", 96, flowerBud], ["flower_bloom", 96, flowerBloom], ["party_hat", 90, partyHat]];

/**
 * Baaaana head pieces, after the face and the hair. `slide(c, r, ax, phi, dist)` is accessories_more.js's slideAt
 * (passed in so the two modules don't import each other).
 */
export function drawHeadBaaaana(ctx, c, r, ax0, acc, slide) {
  for (const [name, phi, draw] of HEAD) {
    if (!acc[name]) continue;
    const p = slide(c, r, ax0, phi, 0.96);
    draw(ctx, p.c, r, p.ax, acc[name]);
  }
}

/** Torso axes: up from the hip to the neck, forward toward facing. */
function torsoAxes(j, facing) {
  const dx = j.neckTop.x - j.hip.x;
  const dy = j.neckTop.y - j.hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const up = { x: dx / len, y: dy / len };
  return { up, fwd: facing === 1 ? { x: -up.y, y: up.x } : { x: up.y, y: -up.x }, len };
}

/** A silver whistle on a cord round the neck, hanging on the chest (drawn after the torso, like the bowtie). */
export function drawWhistle(ctx, j, r, color, facing) {
  const { up, fwd, len } = torsoAxes(j, facing);
  const n = j.neckTop;
  const hang = { x: j.hip.x + up.x * len * 0.62 + fwd.x * r * 0.5, y: j.hip.y + up.y * len * 0.62 + fwd.y * r * 0.5 };
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.moveTo(n.x - fwd.x * r * 0.3, n.y - fwd.y * r * 0.3);
  ctx.lineTo(hang.x, hang.y);
  ctx.lineTo(n.x + fwd.x * r * 0.42, n.y + fwd.y * r * 0.42);
  ctx.stroke();
  // The whistle: a rounded barrel pointing forward with a round chamber below the mouthpiece.
  ctx.translate(hang.x, hang.y);
  ctx.rotate(Math.atan2(fwd.y, fwd.x));
  // Local y points down the chest for either facing (the frame is rotated by pi when facing left).
  const down = facing === 1 ? 1 : -1;
  const k = r * 1.6; // big enough to read in a medium shot
  disc(ctx, { x: k * 0.04, y: k * 0.1 * down }, k * 0.16, "#d9dde3", k * 0.05);
  ctx.fillStyle = "#d9dde3";
  ctx.strokeStyle = INK;
  ctx.lineWidth = k * 0.05;
  ctx.beginPath();
  ctx.roundRect(-k * 0.05, -k * 0.1, k * 0.42, k * 0.2, k * 0.06);
  ctx.fill();
  ctx.stroke();
  disc(ctx, { x: k * 0.06, y: k * 0.12 * down }, k * 0.045, INK);
  ctx.restore();
}

/** An upright clipboard held in the near hand: a board, a sheet with lines and a metal clip (drawn before the mitten). */
function clipboard(ctx, c, color) {
  const r = dimsOf(c).headR * c.scale;
  const h = c.j.rHand;
  ctx.save();
  ctx.translate(h.x, h.y);
  const w = r * 1.05;
  const ht = r * 1.4;
  const x0 = (c.facing || 1) === 1 ? -w * 0.25 : -w * 0.75;
  const y0 = -ht * 0.62;
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, ht, r * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.rect(x0 + w * 0.12, y0 + ht * 0.14, w * 0.76, ht * 0.78);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#8a93a6";
  for (let i = 0; i < 4; i++) {
    const y = y0 + ht * (0.32 + i * 0.15);
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.22, y);
    ctx.lineTo(x0 + w * (i === 3 ? 0.55 : 0.78), y);
    ctx.stroke();
  }
  ctx.fillStyle = "#b8bec8";
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.roundRect(x0 + w * 0.3, y0 - ht * 0.04, w * 0.4, ht * 0.12, r * 0.04);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Baaaana hand pieces in front of the character (before the near mitten). */
export function drawHandBaaaana(ctx, c, acc) {
  if (acc.clipboard) clipboard(ctx, c, acc.clipboard);
}
