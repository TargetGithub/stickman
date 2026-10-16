// Character accessories (spec 14.2): headband, scarf, cape, hat. Milestone: M7.
// Trailing parts are stateless: each tail point follows where its anchor was a few frames ago
// (from the frame store), plus a backward offset and droop, so ribbons stream behind a runner and
// hang when still. Pure functions of (history, style).

import { BODY } from "../skeleton.js";

/** Back-of-head, neck and shoulder anchors for a joint set. */
function anchors(j, facing, scale) {
  const ux = j.head.x - j.neckTop.x;
  const uy = j.head.y - j.neckTop.y;
  const l = Math.hypot(ux, uy) || 1;
  const up = { x: ux / l, y: uy / l };
  const fwd = facing === 1 ? { x: -up.y, y: up.x } : { x: up.y, y: -up.x };
  const r = BODY.headR * scale;
  return {
    up,
    fwd,
    head: { x: j.head.x - fwd.x * r * 0.85 + up.x * r * 0.15, y: j.head.y - fwd.y * r * 0.85 + up.y * r * 0.15 },
    neck: { x: j.neckTop.x - fwd.x * 6 * scale, y: j.neckTop.y - fwd.y * 6 * scale },
    shoulder: { x: j.shoulder.x - fwd.x * 8 * scale, y: j.shoulder.y - fwd.y * 8 * scale },
  };
}

/**
 * Tail polyline from an anchor through its recent history.
 * @param {(k:number) => object|null} past  joints k frames ago (null when unavailable)
 */
function tail(c, past, which, segments, seg, droop) {
  const s = c.scale;
  const now = anchors(c.j, c.facing, s);
  const back = { x: -c.facing, y: 0 };
  const pts = [now[which]];
  for (let k = 1; k <= segments; k++) {
    const old = past(k * 2);
    const a = old ? anchors(old, c.facing, s)[which] : now[which];
    pts.push({ x: a.x + back.x * seg * s * k * 0.65, y: a.y + droop * s * k * k });
  }
  return pts;
}

function strokeCurve(ctx, pts, width, color, outline) {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = width + 3;
    path();
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  path();
  ctx.stroke();
}

/** Accessories drawn behind the body (cape). */
export function drawBehind(ctx, c, past, style) {
  if (!style.cape) return;
  const s = c.scale;
  const pts = tail(c, past, "shoulder", 4, 26, 3.5);
  ctx.save();
  ctx.globalAlpha = c.alpha;
  ctx.fillStyle = style.cape;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2.5 * s;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y - 4 * s);
  pts.forEach((p, i) => ctx.lineTo(p.x, p.y - (6 + i * 7) * s));
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + (6 + i * 9) * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Accessories drawn over the body (headband, scarf, hat). */
export function drawFront(ctx, c, past, style) {
  const s = c.scale;
  const r = BODY.headR * s;
  const a = anchors(c.j, c.facing, s);
  ctx.save();
  ctx.globalAlpha = c.alpha;
  if (style.headband) {
    // Band across the forehead, two ribbon tails from the back of the head.
    const mid = { x: c.j.head.x + a.up.x * r * 0.25, y: c.j.head.y + a.up.y * r * 0.25 };
    const half = { x: a.fwd.x * r * 0.98, y: a.fwd.y * r * 0.98 };
    strokeCurve(ctx, [{ x: mid.x - half.x, y: mid.y - half.y }, { x: mid.x + half.x, y: mid.y + half.y }], 6 * s, style.headband, "#111111");
    const t1 = tail(c, past, "head", 4, 20, 2.2);
    const t2 = t1.map((p, i) => ({ x: p.x, y: p.y + i * 5 * s }));
    strokeCurve(ctx, t2, 4 * s, style.headband, "#111111");
    strokeCurve(ctx, t1, 4 * s, style.headband, "#111111");
  }
  if (style.scarf) {
    strokeCurve(ctx, [{ x: c.j.neckTop.x - a.fwd.x * 9 * s, y: c.j.neckTop.y - a.fwd.y * 9 * s }, { x: c.j.neckTop.x + a.fwd.x * 9 * s, y: c.j.neckTop.y + a.fwd.y * 9 * s }], 8 * s, style.scarf, "#111111");
    strokeCurve(ctx, tail(c, past, "neck", 4, 22, 2.8), 7 * s, style.scarf, "#111111");
  }
  if (style.hat) {
    // A small top hat on the head's up axis.
    const top = { x: c.j.head.x + a.up.x * r * 0.8, y: c.j.head.y + a.up.y * r * 0.8 };
    const brim = { x: a.fwd.x * r * 1.25, y: a.fwd.y * r * 1.25 };
    strokeCurve(ctx, [{ x: top.x - brim.x, y: top.y - brim.y }, { x: top.x + brim.x, y: top.y + brim.y }], 5 * s, style.hat, "#111111");
    const crown = { x: top.x + a.up.x * r * 0.9, y: top.y + a.up.y * r * 0.9 };
    strokeCurve(ctx, [top, crown], r * 1.2, style.hat, "#111111");
  }
  ctx.restore();
}

/** Squash factor (≤ 1) for a character at video time t: brief flattening after landings and hits. */
export function squashAt(events, id, t) {
  let k = 1;
  for (const e of events) {
    if (e.videoT > t || t - e.videoT > 0.14) continue;
    if ((e.type === "land" && e.actor === id) || (e.type === "hit" && e.target === id)) {
      const u = (t - e.videoT) / 0.14;
      k = Math.min(k, 1 - 0.08 * Math.sin(Math.PI * u));
    }
  }
  return k;
}
