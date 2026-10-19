// Body plan torsos (STORY_SPEC 6.1). Milestone: S3.
// stick: the v1 line torso (drawn by character.js); capsule: a filled round torso (the buddy);
// trapezoid: a filled broad chest narrowing to the hips (bulky). Shapes follow the spine from hip to
// neck top, so every pose, lean and flip works unchanged.

import { drawBoxTorso } from "./robot.js";

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
  ctx.lineWidth = o.outline ? o.lw * 0.45 : 0;
  torsoPath(ctx, j, o);
  ctx.fill();
  if (o.outline) ctx.stroke();
  return true;
}

/** Begin the path of a capsule or trapezoid torso (shared by drawTorso and the shading clip, V3.3). */
export function torsoPath(ctx, j, o) {
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
function band(j, from, to, wBottom, wTop) {
  const { up, across, len } = spine(j);
  // Above the hip the garment follows the spine; below it, it hangs straight down (a skirt, coat tails).
  const at = (u, w, side) => (u >= 0
    ? { x: j.hip.x + up.x * len * u + across.x * w * side, y: j.hip.y + up.y * len * u + across.y * w * side }
    : { x: j.hip.x + w * side, y: j.hip.y - len * u });
  const pts = [at(from, wBottom, 1)];
  if (from < 0) pts.push(at(0, (wBottom + wTop) / 2, 1));
  pts.push(at(to, wTop, 1), at(to, wTop, -1));
  if (from < 0) pts.push(at(0, (wBottom + wTop) / 2, -1));
  pts.push(at(from, wBottom, -1));
  return pts;
}

/**
 * Outfits over the torso: shirt, coat, armor, robe, and the belly patch (looks.js turns a look's
 * `belly` into the "belly" outfit when nothing else is worn).
 * @param {{ outfit, color, outlineColor, lw, scale, torsoWidth }} o
 */
export function drawOutfit(ctx, j, o) {
  if (!o.outfit || o.outfit === "none") return;
  const w = Math.max(o.lw * 0.95, (o.torsoWidth ?? 0) * o.scale * 1.06);
  const shapes = {
    shirt: [band(j, 0.02, 0.98, w, w * 1.05)],
    coat: [band(j, -0.45, 0.98, w * 1.35, w * 1.08)],
    robe: [band(j, -0.95, 0.98, w * 2.1, w * 1.05)],
    armor: [band(j, 0.42, 0.97, w * 0.82, w * 1.04)], // follows a trapezoid chest; a breastplate on stick bodies
  }[o.outfit];
  if (o.outfit === "belly") return drawBelly(ctx, j, o, w);
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
    const p = band(j, 0.72, 0.72, w * 0.8, w * 0.8);
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
function drawBelly(ctx, j, o, w) {
  const { up, len } = spine(j);
  const c = { x: j.hip.x + up.x * len * 0.3, y: j.hip.y + up.y * len * 0.3 };
  ctx.save();
  ctx.fillStyle = o.color;
  ctx.strokeStyle = o.outlineColor;
  ctx.globalAlpha *= 0.95;
  ctx.lineWidth = o.lw * 0.22;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, Math.max(w * 0.62, len * 0.36), w * 0.62, Math.atan2(up.y, up.x), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
