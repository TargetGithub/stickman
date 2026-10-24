// Body plan torsos (STORY_SPEC 6.1). Milestone: S3.
// stick: the v1 line torso (drawn by character.js); capsule: a filled round torso (the buddy);
// trapezoid: a filled broad chest narrowing to the hips (bulky). Shapes follow the spine from hip to
// neck top, so every pose, lean and flip works unchanged.

import { drawBoxTorso } from "./robot.js";
import { spineControl, curveAt } from "../spine.js";

/** Unit vectors along the spine (up) and across it. */
function spine(j) {
  const dx = j.neckTop.x - j.hip.x;
  const dy = j.neckTop.y - j.hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const up = { x: dx / len, y: dy / len };
  return { up, across: { x: -up.y, y: up.x }, len };
}

/**
 * Draw a filled torso. Returns true when drawn (false for "stick", which character.js strokes).
 * @param {{ draw, torsoWidth, color, outline, outlineColor, lw, scale }} o
 */
export function drawTorso(ctx, j, o) {
  if (o.draw === "box") return drawBoxTorso(ctx, j, o); // the robot (batch C)
  if (o.draw !== "capsule" && o.draw !== "trapezoid") return false;
  ctx.fillStyle = o.color;
  ctx.strokeStyle = o.outlineColor;
  ctx.lineWidth = o.outline ? o.lw * 0.45 * (o.outlineScale ?? 1) : 0;
  torsoPath(ctx, j, o);
  ctx.fill();
  if (o.outline) ctx.stroke();
  return true;
}

/**
 * The bent spine from the hip to the neck top (ADR-036), or null when straight: pos(u) gives the point, the unit up
 * tangent and the across vector at u (0 hip, 1 neck top), like the straight spine's frame.
 * o.spineBend: the bend as a share of the hip-to-shoulder bone; o.facing.
 */
export function bentSpine(j, o) {
  if (!o?.spineBend) return null;
  const len = Math.hypot(j.neckTop.x - j.hip.x, j.neckTop.y - j.hip.y) || 1;
  const bone = Math.hypot(j.shoulder.x - j.hip.x, j.shoulder.y - j.hip.y);
  // The same mid offset in px over the longer hip-to-neck-top chord.
  const P = spineControl(j.hip, j.neckTop, o.facing ?? 1, (o.spineBend * bone) / len);
  return {
    len,
    pos(u) {
      const { p, t } = curveAt(j.hip, P, j.neckTop, u);
      return { p, up: t, across: { x: -t.y, y: t.x } };
    },
  };
}

/** The centre line of a torso to offset the shading bands from: hip to neck top, along the bend when bent. */
export function torsoLine(j, o) {
  const b = bentSpine(j, o);
  if (!b) return [j.hip, j.neckTop];
  return Array.from({ length: 11 }, (_, i) => b.pos(i / 10).p);
}

/** A bent capsule or trapezoid (ADR-036): the straight shapes' outlines laid along the curved spine. */
function bentTorsoPath(ctx, b, o, w) {
  const off = (u, d, side) => {
    const f = b.pos(u);
    return { x: f.p.x + f.across.x * d * side, y: f.p.y + f.across.y * d * side };
  };
  const N = 12;
  ctx.beginPath();
  if (o.draw === "capsule") {
    const ua = Math.min(0.45, (w * 0.35) / b.len);
    const ub = Math.max(0.55, 1 - (w * 0.15) / b.len);
    const top = b.pos(ub);
    const bot = b.pos(ua);
    const angT = Math.atan2(top.up.y, top.up.x);
    const angB = Math.atan2(bot.up.y, bot.up.x);
    const r = (u) => w * (1.08 + (1 - 1.08) * ((u - ua) / (ub - ua)));
    ctx.arc(top.p.x, top.p.y, w, angT - Math.PI / 2, angT + Math.PI / 2, false);
    for (let i = N - 1; i >= 1; i--) {
      const u = ua + ((ub - ua) * i) / N;
      const q = off(u, r(u), 1);
      ctx.lineTo(q.x, q.y);
    }
    ctx.arc(bot.p.x, bot.p.y, w * 1.08, angB + Math.PI / 2, angB - Math.PI / 2, false);
    for (let i = 1; i < N; i++) {
      const u = ua + ((ub - ua) * i) / N;
      const q = off(u, r(u), -1);
      ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
    return;
  }
  const hipW = w * 0.62;
  const width = (u) => hipW + (w - hipW) * (u / 0.92);
  const sh = b.pos(0.92);
  const pts = [];
  for (let i = 0; i <= N; i++) pts.push(off((0.92 * i) / N, width((0.92 * i) / N), 1));
  pts.push({ x: sh.p.x + sh.up.x * w * 0.3 + sh.across.x * w * 0.6, y: sh.p.y + sh.up.y * w * 0.3 + sh.across.y * w * 0.6 });
  pts.push({ x: sh.p.x + sh.up.x * w * 0.3 - sh.across.x * w * 0.6, y: sh.p.y + sh.up.y * w * 0.3 - sh.across.y * w * 0.6 });
  for (let i = N; i >= 0; i--) pts.push(off((0.92 * i) / N, width((0.92 * i) / N), -1));
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
}

/** Begin the path of a capsule or trapezoid torso (shared by drawTorso and the shading clip, V3.3). */
export function torsoPath(ctx, j, o) {
  const bent = bentSpine(j, o);
  if (bent) return bentTorsoPath(ctx, bent, o, (o.torsoWidth ?? 20) * o.scale);
  const { up, across, len } = spine(j);
  const w = (o.torsoWidth ?? 20) * o.scale;
  ctx.beginPath();
  if (o.draw === "capsule") {
    // A rounded bean: semicircle ends at the hip and the neck, sides along the spine.
    const a = { x: j.hip.x + up.x * w * 0.35, y: j.hip.y + up.y * w * 0.35 };
    const b = { x: j.neckTop.x - up.x * w * 0.15, y: j.neckTop.y - up.y * w * 0.15 };
    const ang = Math.atan2(up.y, up.x);
    ctx.arc(b.x, b.y, w, ang - Math.PI / 2, ang + Math.PI / 2, false); // top cap, through the "up" side
    ctx.arc(a.x, a.y, w * 1.08, ang + Math.PI / 2, ang - Math.PI / 2, false); // bottom cap
    ctx.closePath();
  } else {
    // Broad shoulders, narrower hips, a slight belly line.
    const hipW = w * 0.62;
    const sh = { x: j.hip.x + up.x * len * 0.92, y: j.hip.y + up.y * len * 0.92 };
    const pts = [
      { x: j.hip.x + across.x * hipW, y: j.hip.y + across.y * hipW },
      { x: sh.x + across.x * w, y: sh.y + across.y * w },
      { x: sh.x + up.x * w * 0.3 + across.x * w * 0.6, y: sh.y + up.y * w * 0.3 + across.y * w * 0.6 },
      { x: sh.x + up.x * w * 0.3 - across.x * w * 0.6, y: sh.y + up.y * w * 0.3 - across.y * w * 0.6 },
      { x: sh.x - across.x * w, y: sh.y - across.y * w },
      { x: j.hip.x - across.x * hipW, y: j.hip.y - across.y * hipW },
    ];
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
  }
}

/** Outline points of a garment along the spine: from `from` to `to` (fractions of hip→neck; negative is below the hip). */
function band(j, from, to, wBottom, wTop, bent = null) {
  const { up, across, len } = spine(j);
  // Above the hip the garment follows the spine (bent or not); below it, it hangs straight down (a skirt, coat tails).
  const along = (u, w, side) => {
    const f = bent.pos(u);
    return { x: f.p.x + f.across.x * w * side, y: f.p.y + f.across.y * w * side };
  };
  const at = (u, w, side) => (u >= 0
    ? (bent ? along(u, w, side) : { x: j.hip.x + up.x * len * u + across.x * w * side, y: j.hip.y + up.y * len * u + across.y * w * side })
    : { x: j.hip.x + w * side, y: j.hip.y - len * u });
  const pts = [at(from, wBottom, 1)];
  if (from < 0) pts.push(at(0, (wBottom + wTop) / 2, 1));
  if (bent) for (let i = 1; i < 8; i++) pts.push(at(Math.max(0, from) + ((to - Math.max(0, from)) * i) / 8, wBottom + ((wTop - wBottom) * i) / 8, 1));
  pts.push(at(to, wTop, 1), at(to, wTop, -1));
  if (bent) for (let i = 7; i >= 1; i--) pts.push(at(Math.max(0, from) + ((to - Math.max(0, from)) * i) / 8, wBottom + ((wTop - wBottom) * i) / 8, -1));
  if (from < 0) pts.push(at(0, (wBottom + wTop) / 2, -1));
  pts.push(at(from, wBottom, -1));
  return pts;
}

/**
 * Outfits over the torso: shirt, coat, armor, robe, and the belly patch (looks.js turns a look's
 * `belly` into the "belly" outfit when nothing else is worn).
 * @param {{ outfit, color, outlineColor, lw, scale, torsoWidth, spineBend?, facing? }} o  spineBend: garments follow a bent back
 */
export function drawOutfit(ctx, j, o) {
  if (!o.outfit || o.outfit === "none") return;
  const w = Math.max(o.lw * 0.95, (o.torsoWidth ?? 0) * o.scale * 1.06);
  const bent = bentSpine(j, o);
  const shapes = {
    shirt: [band(j, 0.02, 0.98, w, w * 1.05, bent)],
    coat: [band(j, -0.45, 0.98, w * 1.35, w * 1.08, bent)],
    robe: [band(j, -0.95, 0.98, w * 2.1, w * 1.05, bent)],
    armor: [band(j, 0.42, 0.97, w * 0.82, w * 1.04, bent)], // follows a trapezoid chest; a breastplate on stick bodies
  }[o.outfit];
  if (o.outfit === "belly") return drawBelly(ctx, j, o, w, bent);
  if (!shapes) return;
  ctx.save();
  ctx.fillStyle = o.color;
  ctx.strokeStyle = o.outlineColor;
  ctx.lineWidth = o.lw * 0.4;
  ctx.lineJoin = "round";
  for (const pts of shapes) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (o.outfit === "armor") {
    // A shine line across the plate.
    const p = band(j, 0.72, 0.72, w * 0.8, w * 0.8, bent);
    const a = p[0];
    const b = p[p.length - 1];
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = o.lw * 0.3;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x - (b.x - a.x) * 0.4, b.y - (b.y - a.y) * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

/** A soft oval patch on the lower front of a filled torso. */
function drawBelly(ctx, j, o, w, bent = null) {
  const { len } = spine(j);
  let { up } = spine(j);
  let c = { x: j.hip.x + up.x * len * 0.3, y: j.hip.y + up.y * len * 0.3 };
  if (bent) ({ p: c, up } = bent.pos(0.3));
  ctx.save();
  ctx.fillStyle = o.color;
  ctx.strokeStyle = o.outlineColor;
  ctx.globalAlpha *= 0.95;
  ctx.lineWidth = o.lw * 0.22;
  ctx.beginPath();
  // Jiggle (lively.js): the patch squashes and stretches and dips a little, keeping its area about the same.
  const k = o.jiggle || 0;
  if (k) c = { x: c.x - up.x * len * 0.08 * k, y: c.y - up.y * len * 0.08 * k };
  ctx.ellipse(c.x, c.y, Math.max(w * 0.62, len * 0.36) * (1 - k), w * 0.62 * (1 + k), Math.atan2(up.y, up.x), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
