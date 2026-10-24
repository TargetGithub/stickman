// Lively looks (series/baaaana/PLAN.md, task 4): the "lively" eye style (big white eyes with pupils that dart
// between idle glances, sometimes at the camera, and a double blink now and then), the "big_grin" and "toothy"
// mouth styles, and the belly jiggle of body plans with a `jiggle` amount (on laughs and while walking).
// Everything is a pure function of the seed, the character id and video time.

import { hash32 } from "../math.js";

const INK = "#111111";
const MOUTH = "#5a1a2a";
const TONGUE = "#ff7a8a";

// ---- Timing -----------------------------------------------------------------------------------

/** Idle glances: forward most of the time, then up, down, back, or at the camera, (no turn of the head). */
const GLANCES = [{ f: 0, u: 0 }, { f: 0, u: 0 }, { f: 0.2, u: 0.6 }, { f: 0.3, u: -0.6 }, { f: -1, u: 0.1 }, { f: -0.55, u: 0, cam: true }, { f: -0.55, u: 0, cam: true }, { f: 1, u: 0.3 }];

/** Where the pupils look when nobody is talking: a glance per 1.6 s slot (repeats make longer holds), O(1) in t. */
export function idleGazeAt(seed, id, t) {
  const phase = (hash32(`gaze:${seed}:${id}`) % 1000) / 1000 * 1.6;
  const slot = Math.floor((t + phase) / 1.6);
  return GLANCES[hash32(`gaze:${seed}:${id}:${slot}`) % GLANCES.length];
}

/** A quick double blink every 7-11 s (two 0.1 s blinks, 0.12 s apart). */
export function doubleBlinkAt(seed, id, t) {
  const h = hash32(`blink2:${seed}:${id}`);
  const period = 7 + (h % 1000) / 250;
  const u = (t + ((h >>> 10) % 1000) / 1000 * period) % period;
  return u < 0.1 || (u >= 0.22 && u < 0.32);
}

// ---- Eyes -------------------------------------------------------------------------------------

function ring(ctx, p, rx, ry, rot, fill, lw) {
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/**
 * A lively eye for the open-eye kinds (dot, wide, half); returns false for the others (happy, closed, squeeze,
 * spiral, heart), which face.js draws as usual. o.gaze is the look toward a talker; o.idle the idle glance.
 */
export function livelyEye(ctx, kind, p, r, at, o) {
  if (kind !== "dot" && kind !== "wide" && kind !== "half") return false;
  const rot = Math.atan2(at.u.y, at.u.x) + Math.PI / 2;
  const e = (df, du) => at.off(p, df, du);
  const w = r * 0.07;
  if (o.blink) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    const a = e(-0.15, -0.02);
    const c = e(0, -0.1);
    const b = e(0.15, -0.02);
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.stroke();
    return true;
  }
  const big = kind === "wide" ? 1.18 : 1;
  ring(ctx, p, r * 0.17 * big, r * 0.23 * big, rot, "#ffffff", w);
  const talk = o.gaze && (o.gaze.f || o.gaze.u);
  const g = talk ? o.gaze : o.idle || { f: 0, u: 0 };
  const pr = r * (kind === "wide" ? 0.075 : 0.105);
  const q = e(0.05 + g.f * 0.05, -0.02 + g.u * 0.08);
  ring(ctx, q, pr, pr * 1.15, rot, INK, 0);
  ring(ctx, e(0.08 + g.f * 0.05, 0.03 + g.u * 0.08), pr * 0.38, pr * 0.38, 0, "#ffffff", 0);
  if (kind === "half") {
    // Tired: a lid over the top half, in the skin tone (set by face.js as o.skin).
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 0.17, r * 0.23, rot, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = o.skin || "#7fe8c4";
    const lid = [e(-0.25, 0.3), e(0.25, 0.3), e(0.25, 0.02), e(-0.25, 0.02)];
    ctx.beginPath();
    ctx.moveTo(lid[0].x, lid[0].y);
    for (const v of lid.slice(1)) ctx.lineTo(v.x, v.y);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = w * 1.3;
    ctx.beginPath();
    ctx.moveTo(e(-0.17, 0.02).x, e(-0.17, 0.02).y);
    ctx.lineTo(e(0.17, 0.02).x, e(0.17, 0.02).y);
    ctx.stroke();
  }
  return true;
}

// ---- Mouths -----------------------------------------------------------------------------------

/** The D-shaped open grin: a dark mouth, a pink tongue at the bottom, a band of top teeth. */
function dGrin(ctx, m, r, k, { teeth = true, wide = 1, deep = 1 } = {}) {
  const a = m(-0.3 * wide, 0.08);
  const b = m(0.3 * wide, 0.08);
  const c = m(0, -0.5 * deep);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = MOUTH;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  const tg = m(0, -0.24 * deep);
  ctx.fillStyle = TONGUE;
  ctx.beginPath();
  ctx.ellipse(tg.x, tg.y, r * 0.16 * k * wide, r * 0.1 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  if (teeth) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = r * 0.1 * k;
    ctx.beginPath();
    ctx.moveTo(m(-0.3 * wide, 0.06).x, m(-0.3 * wide, 0.06).y);
    ctx.lineTo(m(0.3 * wide, 0.06).x, m(0.3 * wide, 0.06).y);
    ctx.stroke();
  }
  ctx.restore();
  path();
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.06 * Math.sqrt(k);
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** Two big front teeth hanging from the middle of the mouth line. */
function buckTeeth(ctx, m, r, k, du) {
  for (const s of [-1, 1]) {
    const tl = m(s === -1 ? -0.075 : 0.005, du);
    const br = m(s === -1 ? -0.005 : 0.075, du - 0.13);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.035 * k;
    ctx.beginPath();
    ctx.rect(Math.min(tl.x, br.x), Math.min(tl.y, br.y), Math.abs(br.x - tl.x), Math.abs(br.y - tl.y));
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Mouths for the big_grin and toothy styles; returns false for the kinds they leave to face.js
 * (line, frown, o, wavy, smirk).
 */
export function livelyMouth(ctx, kind, at, r, style, k) {
  const m = (df, du) => at.pt(0.4 + df * k, -0.4 + du * k);
  const smile = kind === "smile";
  if (!smile && kind !== "grin" && kind !== "teeth" && kind !== "open") return false;
  if (style === "big_grin") {
    if (kind === "open") dGrin(ctx, m, r, k, { teeth: false, wide: 0.75, deep: 1.25 });
    else dGrin(ctx, m, r, k, { wide: smile ? 0.85 : 1.05, deep: smile ? 0.8 : 1.1 });
    return true;
  }
  if (style === "toothy") {
    if (smile) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = r * 0.09 * Math.sqrt(k);
      ctx.lineCap = "round";
      ctx.beginPath();
      const a = m(-0.22, 0.06);
      const c = m(0, -0.16);
      const b = m(0.22, 0.06);
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
      ctx.stroke();
      buckTeeth(ctx, m, r, k, -0.06);
    } else {
      dGrin(ctx, m, r, k, { teeth: false, wide: kind === "open" ? 0.75 : 1, deep: kind === "open" ? 1.2 : 1 });
      buckTeeth(ctx, m, r, k, 0.07);
    }
    return true;
  }
  return false;
}

// ---- Belly jiggle -----------------------------------------------------------------------------

const LAUGHS = new Set(["laugh", "love"]);

/**
 * Belly jiggle amount in [-1, 1] times the plan's `jiggle`: a fast wobble while laughing, and a bounce that
 * follows the hip moving up and down (walking, hopping). 0 when the plan has no jiggle.
 * @param {{ jiggle?:number, time?:number, faceName?:string, hipDy?:number, scale?:number }} s
 */
export function jiggleAt(s) {
  if (!s.jiggle) return 0;
  const t = s.time ?? 0;
  const laugh = LAUGHS.has(s.faceName) ? Math.sin(t * Math.PI * 2 * 6) : 0;
  const bob = Math.max(-1, Math.min(1, (s.hipDy ?? 0) / (2.5 * (s.scale || 1))));
  return s.jiggle * Math.max(-1, Math.min(1, laugh + bob));
}
