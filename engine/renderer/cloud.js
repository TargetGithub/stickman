// Feeling clouds (Doopi season 2, STORY_SPEC 5.2): `set_cloud` puts a little grey rain cloud over one character's
// head. It grows and shrinks over `dur`, rains on them, and the character's colours dim while it sits there; with
// `pop` it bursts into puffs and a glowing music note that floats up. Pure functions of the event log and the frame
// time (like the Heart Glow in colour.js), so a cloud carries over between scenes.

import { hash32 } from "../math.js";

const POP = 1.8; // s: puffs fly out over the first third, the note floats up and fades over the whole
const NOTE_GOLD = "#ffd23f";
const GAP = 18; // px above the head (scale 1)

const progress = (t, t0, dur) => (dur > 0 ? Math.min(1, Math.max(0, (t - t0) / dur)) : 1);
const frac = (x) => x - Math.floor(x);

/**
 * A character's cloud at video time t, or null when there is none.
 * @param {object[]} changes  set_cloud world events for this character, in order
 * @returns {{ size:number, rain:boolean, pop:{ u:number, size:number, note:string, t0:number }|null }|null}
 *   size 0-1 of the cloud itself; pop while a burst plays (u 0-1 over POP seconds)
 */
export function cloudAt(changes, t) {
  let size = 0;
  let rain = true;
  let pop = null;
  for (const e of changes) {
    if (e.videoT > t) break;
    const p = e.params;
    if (p.rain !== undefined) rain = p.rain;
    if (p.pop) {
      pop = { t0: e.videoT, size: Math.max(size, 0.25), note: p.note || NOTE_GOLD };
      size = 0;
      continue;
    }
    size += (p.size - size) * progress(t, e.videoT, p.dur ?? 0);
    if (size > 0.005) pop = null; // a new cloud ends an old burst
  }
  const u = pop ? (t - pop.t0) / POP : 1;
  const burst = pop && u < 1 ? { u, size: pop.size, note: pop.note, t0: pop.t0 } : null;
  if (size <= 0.005 && !burst) return null;
  return { size: size > 0.005 ? size : 0, rain, pop: burst };
}

/** The canvas filter that dims a character under a cloud of this size (0: none). */
export function dimFilter(size) {
  if (size <= 0.01) return null;
  return `saturate(${(1 - 0.6 * size).toFixed(3)}) brightness(${(1 - 0.14 * size).toFixed(3)})`;
}

/** The puffs that make up a cloud: deterministic offsets per character (unit cloud, centre 0,0). */
export function cloudPuffs(id) {
  const h = hash32(id);
  const jit = (k) => ((h >>> (k * 3)) & 7) / 7 - 0.5;
  return [
    { x: -0.62, y: 0.12, r: 0.3 + 0.04 * jit(0) },
    { x: -0.3, y: -0.12, r: 0.4 + 0.05 * jit(1) },
    { x: 0.08, y: -0.24, r: 0.46 + 0.05 * jit(2) },
    { x: 0.44, y: -0.06, r: 0.38 + 0.05 * jit(3) },
    { x: 0.7, y: 0.14, r: 0.28 + 0.04 * jit(4) },
    { x: 0.05, y: 0.16, r: 0.42 },
  ];
}

/** Where a cloud sits: above the head, with a slow bob; w is its full width in world px. */
export function cloudFrame(c, size, t) {
  const r = (c.dims?.headR ?? 22) * c.scale;
  const w = (70 + 150 * size) * Math.max(0.6, c.scale);
  const bob = Math.sin(t * 1.7 + (hash32(c.id) % 100) / 16) * 5 * c.scale;
  return { x: c.j.head.x, y: c.j.head.y - r - GAP * c.scale - w * 0.32 + bob, w };
}

function puffPath(ctx, puffs, x, y, w, grow = 1) {
  ctx.beginPath();
  for (const p of puffs) {
    ctx.moveTo(x + (p.x * w) / 2 + (p.r * w * grow) / 2, y + (p.y * w) / 2);
    ctx.arc(x + (p.x * w) / 2, y + (p.y * w) / 2, (p.r * w * grow) / 2, 0, Math.PI * 2);
  }
}

/** Rain from the cloud's underside down past the head: short slanted streaks, a fixed set per cloud. */
function drawRain(ctx, c, f, size, t, alpha) {
  const n = Math.round(5 + 11 * size);
  const fall = f.w * 0.55 + 60 * c.scale;
  const top = f.y + f.w * 0.14;
  const seed = hash32(c.id);
  ctx.strokeStyle = "#8fb4d8";
  ctx.lineWidth = Math.max(2, 3 * c.scale);
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const h = hash32(`${seed}:${i}`);
    const x0 = f.x + ((h % 1000) / 1000 - 0.5) * f.w * 0.75;
    const u = frac(t * (1.6 + ((h >>> 10) % 7) / 10) + ((h >>> 4) % 97) / 97);
    const y = top + u * fall;
    const len = (10 + 8 * size) * c.scale;
    ctx.globalAlpha = alpha * 0.75 * Math.min(1, (1 - u) * 4);
    ctx.beginPath();
    ctx.moveTo(x0 - u * 4, y);
    ctx.lineTo(x0 - u * 4 - 3 * c.scale, y + len);
    ctx.stroke();
  }
}

/** A music note (eighth note) centred at x, y, height h. */
export function notePath(ctx, x, y, h) {
  const r = h * 0.2;
  const hx = x - h * 0.12;
  const hy = y + h * 0.32;
  ctx.beginPath();
  ctx.ellipse(hx, hy, r * 1.25, r * 0.95, -0.4, 0, Math.PI * 2);
  ctx.moveTo(hx + r * 1.05, hy - r * 0.2);
  ctx.lineTo(hx + r * 1.05 + h * 0.06, hy - r * 0.2);
  ctx.lineTo(hx + r * 1.05 + h * 0.06, y - h * 0.5);
  ctx.lineTo(hx + r * 1.05, y - h * 0.5);
  ctx.closePath();
  ctx.moveTo(hx + r * 1.05 + h * 0.06, y - h * 0.5);
  ctx.quadraticCurveTo(x + h * 0.5, y - h * 0.3, x + h * 0.38, y - h * 0.02);
  ctx.quadraticCurveTo(x + h * 0.36, y - h * 0.24, hx + r * 1.05 + h * 0.06, y - h * 0.28);
  ctx.closePath();
}

function drawNote(ctx, c, burst, f, alpha) {
  const u = burst.u;
  const h = (40 + 26 * burst.size) * Math.max(0.7, c.scale) * Math.min(1, 0.35 + u * 2.2);
  const x = f.x + Math.sin(u * 6) * 10 * c.scale;
  const y = f.y - u * 150 * c.scale;
  const a = alpha * Math.min(1, u * 6) * (u > 0.6 ? (1 - u) / 0.4 : 1);
  ctx.save();
  ctx.globalAlpha = a * 0.5;
  const halo = ctx.createRadialGradient(x, y, 0, x, y, h * 1.1);
  halo.addColorStop(0, burst.note);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, h * 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = a;
  ctx.fillStyle = burst.note;
  ctx.strokeStyle = "#6b4a10";
  ctx.lineWidth = Math.max(2, 3 * c.scale);
  notePath(ctx, x, y, h);
  ctx.fill("nonzero");
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a character's cloud (world space, after the character): rain, the cloud, and a popping burst with its note.
 * @param {{ id, j, scale, dims?, alpha? }} c  a frame character
 */
export function drawCloud(ctx, c, cloud, t) {
  const alpha = c.alpha ?? 1;
  const puffs = cloudPuffs(c.id);
  ctx.save();
  if (cloud.size > 0) {
    const f = cloudFrame(c, cloud.size, t);
    if (cloud.rain) drawRain(ctx, c, f, cloud.size, t, alpha);
    ctx.globalAlpha = alpha * Math.min(1, cloud.size * 6);
    const g = ctx.createLinearGradient(0, f.y - f.w * 0.36, 0, f.y + f.w * 0.3);
    const dark = Math.round(150 - 50 * cloud.size);
    g.addColorStop(0, "#d4d7e0");
    g.addColorStop(1, `rgb(${dark}, ${dark + 4}, ${dark + 16})`);
    ctx.fillStyle = g;
    ctx.strokeStyle = "#5d6070";
    ctx.lineWidth = Math.max(2.5, 4 * c.scale);
    puffPath(ctx, puffs, f.x, f.y, f.w);
    ctx.stroke();
    ctx.fill();
  }
  if (cloud.pop) {
    const f = cloudFrame(c, cloud.pop.size, cloud.pop.t0);
    const u = Math.min(1, cloud.pop.u * 3);
    if (u < 1) {
      ctx.globalAlpha = alpha * (1 - u) * 0.85;
      ctx.fillStyle = "#e4e6ee";
      for (const [i, p] of puffs.entries()) {
        const ang = Math.atan2(p.y || 0.01, p.x || 0.01) + i * 0.3;
        const d = (u * f.w) / 1.4;
        ctx.beginPath();
        ctx.arc(f.x + (p.x * f.w) / 2 + Math.cos(ang) * d, f.y + (p.y * f.w) / 2 + Math.sin(ang) * d, (p.r * f.w * (1 - 0.6 * u)) / 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawNote(ctx, c, cloud.pop, f, alpha);
  }
  ctx.restore();
}
