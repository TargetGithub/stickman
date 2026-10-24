// Faces (STORY_SPEC 7.1). Milestone: S2. Draws a catalog face on a round head in profile:
// two eyes on the forward side, brows above them, a mouth below, plus extras (tears, vein, sweat,
// hearts, blush). Pure: everything comes from the face data and the frame's time.

import { hash32 } from "../math.js";
import { drawViseme } from "./mouth_shapes.js";
import { livelyEye, livelyMouth } from "./lively.js";

const INK = "#111111";
const TEAR = "#2f6fe8"; // darker than most character colors, so tears read on cyan heads too
const PINK = "rgba(255, 120, 150, 0.55)";
const RED = "#ff3b5c";

/**
 * Eyes closed for a blink? Blinks come every 2.6-5 s per character, 0.12 s long, deterministic.
 * @param {number} t  video seconds
 */
export function blinkAt(seed, id, t) {
  const h = hash32(`blink:${seed}:${id}`);
  const period = 2.6 + (h % 1000) / 420;
  const phase = ((h >>> 10) % 1000) / 1000 * period;
  return (t + phase) % period < 0.12;
}

function line(ctx, a, b, w) {
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function curve(ctx, a, c, b, w) {
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
  ctx.stroke();
}

function disc(ctx, p, rad, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(0.5, rad), 0, Math.PI * 2);
  ctx.fill();
}

function heart(ctx, p, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + s * 0.9);
  ctx.bezierCurveTo(p.x - s * 1.4, p.y - s * 0.1, p.x - s * 0.6, p.y - s * 1.1, p.x, p.y - s * 0.35);
  ctx.bezierCurveTo(p.x + s * 0.6, p.y - s * 1.1, p.x + s * 1.4, p.y - s * 0.1, p.x, p.y + s * 0.9);
  ctx.fill();
}

function eye(ctx, kind, p, r, at, side, o) {
  const w = r * 0.09;
  const e = (df, du) => at.off(p, df, du);
  if (o.eyeStyle === "lively" && livelyEye(ctx, kind, p, r, at, o)) return null;
  // The character's own eye style (appearance) replaces the plain dot of neutral-type faces.
  if (kind === "dot" && o.eyeStyle === "big") kind = "big";
  else if (kind === "dot" && o.eyeStyle === "oval") kind = "oval";
  else if (kind === "dot" && o.eyeStyle === "sleepy") kind = "half";
  if (o.blink && (kind === "dot" || kind === "wide" || kind === "half")) return line(ctx, e(-0.12, 0), e(0.12, 0), w);
  switch (kind) {
    case "big": {
      if (o.blink) return curve(ctx, e(-0.15, 0.02), e(0, -0.06), e(0.15, 0.02), w);
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 0.15, r * 0.2, Math.atan2(at.u.y, at.u.x) + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
      return disc(ctx, e(0.05 + o.gaze.f * 0.03, 0.08 + o.gaze.u * 0.03), r * 0.06, "#ffffff");
    }
    case "oval":
      if (o.blink) return line(ctx, e(-0.1, 0), e(0.1, 0), w);
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(e(o.gaze.f * 0.03, 0).x, e(o.gaze.f * 0.03, 0).y, r * 0.08, r * 0.15, Math.atan2(at.u.y, at.u.x) + Math.PI / 2, 0, Math.PI * 2);
      return ctx.fill();
    case "wide":
      disc(ctx, p, r * 0.2, "#ffffff");
      ctx.strokeStyle = INK;
      ctx.lineWidth = w * 0.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      return disc(ctx, e(0.07 + o.gaze.f * 0.05, o.gaze.u * 0.06), r * 0.09, INK);
    case "happy":
      return curve(ctx, e(-0.13, -0.02), e(0, 0.16), e(0.13, -0.02), w);
    case "closed":
      return curve(ctx, e(-0.13, 0.04), e(0, -0.1), e(0.13, 0.04), w);
    case "squeeze": {
      // ">" on the back eye and "<" on the front eye, pointing at each other.
      const k = side === "front" ? -1 : 1;
      line(ctx, e(-0.12 * k, 0.1), e(0.1 * k, 0), w);
      return line(ctx, e(0.1 * k, 0), e(-0.12 * k, -0.1), w);
    }
    case "half": {
      disc(ctx, e(o.gaze.f * 0.04, -0.03), r * 0.11, INK);
      ctx.strokeStyle = INK;
      return line(ctx, e(-0.15, 0.05), e(0.15, 0.05), w * 1.2);
    }
    case "spiral": {
      ctx.lineWidth = w * 0.7;
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const a = k * 0.6 + (o.t * 8);
        const rad = r * 0.012 * k * 0.6;
        const q = e(Math.cos(a) * rad / r, Math.sin(a) * rad / r);
        if (k === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      return ctx.stroke();
    }
    case "heart":
      return heart(ctx, p, r * 0.13, RED);
    default:
      return disc(ctx, e(o.gaze.f * 0.04, o.gaze.u * 0.04), r * 0.12, INK);
  }
}

function mouth(ctx, kind, at, r, k = 1) {
  const w = r * 0.09 * Math.sqrt(k);
  const m = (df, du) => at.pt(0.4 + df * k, -0.4 + du * k);
  switch (kind) {
    case "line": return line(ctx, m(-0.14, 0), m(0.14, 0), w);
    case "smile": return curve(ctx, m(-0.2, 0.06), m(0, -0.14), m(0.2, 0.06), w);
    case "frown": return curve(ctx, m(-0.17, -0.06), m(0, 0.1), m(0.17, -0.06), w);
    case "smirk": return curve(ctx, m(-0.16, 0), m(0.06, -0.04), m(0.2, 0.1), w);
    case "o":
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(m(0, 0).x, m(0, 0).y, r * 0.09 * k, 0, Math.PI * 2);
      return ctx.stroke();
    case "open": return disc(ctx, m(0, -0.02), r * 0.13 * k, INK);
    case "wavy": {
      ctx.lineWidth = w * 0.8;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const q = m(-0.18 + k * 0.06, k % 2 ? 0.04 : -0.03);
        if (k === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      return ctx.stroke();
    }
    case "grin":
    case "teeth": {
      const a = m(-0.22, 0.06);
      const b = m(0.22, 0.06);
      const c = m(0, -0.3);
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
      ctx.closePath();
      ctx.fill();
      if (kind === "teeth") {
        ctx.strokeStyle = "#ffffff";
        line(ctx, m(-0.16, 0.02), m(0.16, 0.02), w * 0.8);
        ctx.strokeStyle = INK;
      }
      return null;
    }
    default: return null;
  }
}

function extras(ctx, list, at, r, t, color) {
  for (const x of list || []) {
    if (x === "blush" || x === "cheeks") {
      ctx.save();
      ctx.fillStyle = x === "cheeks" ? color : PINK;
      if (x === "cheeks") ctx.globalAlpha *= 0.55;
      for (const p of [at.pt(0.55, -0.22), at.pt(0.08, -0.22)]) {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r * 0.14, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (x === "tears") {
      // Two streams falling from the eyes, looping every 0.6 s.
      for (const [fa, ph] of [[0.5, 0], [0.12, 0.3]]) {
        const u = ((t + ph) % 0.6) / 0.6;
        // A wet streak under the eye plus a falling drop.
        ctx.strokeStyle = TEAR;
        line(ctx, at.pt(fa, 0.0), at.pt(fa, -0.35), r * 0.08);
        const p = at.pt(fa, -0.05 - u * 0.8);
        ctx.fillStyle = TEAR;
        ctx.strokeStyle = INK;
        ctx.lineWidth = r * 0.03;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r * 0.08, r * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.strokeStyle = INK;
    } else if (x === "sweat") {
      // A big drop on the back of the head (u is up, so "below" is -u).
      const p = at.pt(-0.55, 0.35);
      const s = r * 0.32;
      const up = at.pt(-0.55, 0.35 + 0.32);
      ctx.fillStyle = TEAR;
      ctx.strokeStyle = INK;
      ctx.lineWidth = r * 0.04;
      ctx.beginPath();
      ctx.moveTo(up.x, up.y);
      ctx.quadraticCurveTo(p.x + s * 0.55, p.y, p.x, p.y - (up.y - p.y) * 0.25);
      ctx.quadraticCurveTo(p.x - s * 0.55, p.y, up.x, up.y);
      ctx.fill();
      ctx.stroke();
    } else if (x === "vein") {
      ctx.strokeStyle = RED;
      const c = at.pt(-0.45, 0.62);
      const s = r * 0.13 * (1 + 0.15 * Math.sin(t * 12));
      ctx.lineWidth = r * 0.07;
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        ctx.beginPath();
        ctx.moveTo(c.x + dx * s * 0.3, c.y + dy * s * 1.1);
        ctx.quadraticCurveTo(c.x + dx * s * 0.3, c.y + dy * s * 0.3, c.x + dx * s * 1.1, c.y + dy * s * 0.3);
        ctx.stroke();
      }
    } else if (x === "hearts") {
      for (const [ph, df] of [[0, 0.2], [0.5, -0.4]]) {
        const u = ((t * 0.8 + ph) % 1);
        ctx.save();
        ctx.globalAlpha *= 1 - u;
        heart(ctx, at.pt(df, 1.2 + u * 0.9), r * 0.16, RED);
        ctx.restore();
      }
    }
  }
}

/**
 * Draw a face on a head.
 * @param {{ x, y }} c  head center; r: head radius (world px)
 * @param {{ u:{x,y}, f:{x,y} }} axes  u: up for the face, f: forward
 * @param {object} face  catalog face data
 * @param {{ blink?:boolean, talking?:boolean, gaze?:{f,u}, detail?:"full"|"simple", t?:number, neutral?:boolean,
 *           lip?:{ v:string, k:number, shape:object, jaw:boolean } }} o
 *   lip: the lip-sync shape while a line is spoken (face_state.js); without it, talking flaps face.talk
 *   detail "simple" with the neutral face draws only the two dots (the classic far-away look)
 */
export function drawFace(ctx, c, r, axes, face, o = {}) {
  const { u, f } = axes;
  const pt = (fa, ua) => ({ x: c.x + f.x * fa * r + u.x * ua * r, y: c.y + f.y * fa * r + u.y * ua * r });
  const off = (p, fa, ua) => ({ x: p.x + f.x * fa * r + u.x * ua * r, y: p.y + f.y * fa * r + u.y * ua * r });
  const at = { pt, off, u, f };
  const look = o.look || {};
  const lively = look.eyes === "lively";
  const opts = { blink: !!o.blink || (lively && !!o.blink2), gaze: o.gaze || { f: 0, u: 0 }, t: o.t ?? 0, eyeStyle: look.eyes, idle: o.idle, skin: o.skin };
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = "round";
  const simple = o.detail === "simple" && o.neutral && !o.talking;
  if (look.cheeks) extras(ctx, ["cheeks"], at, r, opts.t, look.cheeks);
  if (look.eyes === "visor") {
    // A visor replaces the eyes: a glowing band across them.
    const a = pt(-0.05, 0.12);
    const b = pt(0.75, 0.12);
    ctx.strokeStyle = INK;
    line(ctx, a, b, r * 0.34);
    ctx.strokeStyle = "#7ff3ff";
    line(ctx, a, b, r * 0.2);
    ctx.strokeStyle = INK;
  } else {
    eye(ctx, face.eyes, pt(0.5, 0.12), r, at, "front", opts);
    eye(ctx, face.eyes, pt(0.12, 0.12), r, at, "back", opts);
  }
  if (look.eyes === "glasses") {
    ctx.lineWidth = r * 0.06;
    for (const fa of [0.5, 0.12]) {
      const p = pt(fa, 0.12);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.19, 0, Math.PI * 2);
      ctx.stroke();
    }
    line(ctx, pt(-0.07, 0.14), pt(-0.62, 0.22), r * 0.06); // the arm toward the ear
  }
  if (!simple) {
    if (face.brows && look.brows !== "none") {
      const tilt = (face.brows.tilt * Math.PI) / 180;
      const lift = 0.36 + face.brows.lift;
      for (const [fa, inner] of [[0.5, -1], [0.12, 1]]) {
        // Inner ends sit between the eyes; positive tilt raises them.
        const d = 0.13;
        const a = pt(fa + inner * d, lift + Math.sin(tilt) * 0.12);
        const b = pt(fa - inner * d, lift - Math.sin(tilt) * 0.12);
        line(ctx, a, b, r * (look.brows === "thick" ? 0.13 : 0.08));
      }
    }
    const styled = look.mouthStyle === "big_grin" || look.mouthStyle === "toothy";
    const scale = look.mouthStyle === "cartoon" || styled ? 1.35 : 1;
    // Lip-sync (ADR-032): a viseme while a line is spoken; "rest" keeps the face's own mouth.
    const lip = o.lip && o.lip.v !== "rest" ? o.lip : null;
    if (lip) drawViseme(ctx, at, r, lip.shape, { k: lip.k, scale, cartoon: look.mouthStyle === "cartoon" || styled, jaw: lip.jaw, mouth: face.mouth, teeth: face.talk === "teeth" });
    else {
      const kind = o.talking && !o.lip ? face.talk || "open" : face.mouth;
      if (!styled || !livelyMouth(ctx, kind, at, r, look.mouthStyle, scale)) mouth(ctx, kind, at, r, scale);
    }
    extras(ctx, face.extras, at, r, opts.t);
  }
  ctx.restore();
}
