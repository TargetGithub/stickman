// FX runtime: presets → analytic particle records (emit log), sustained emitters, trails, flashes.
// Milestone: M4. Spec: section 13. Particles have no per-tick state: position is a closed-form
// function of age on the fx clock (ADR-003), so any frame can be drawn from the log alone.

import { LIMITS } from "./config.js";

export const MAX_LIFE = 3; // seconds; no layer may live longer (keeps the live window bounded)
const DEG = Math.PI / 180;

/**
 * @param {() => number} rng  the "fx" stream
 * @param {object} presets  data/fx.js
 */
export function createFx(rng, presets, budget = LIMITS.particles) {
  return { rng, presets, budget, log: [], trails: [], sustains: [], flashes: [], dropped: 0, liveStart: 0 };
}

const pick = (rng, v) => (Array.isArray(v) ? v[Math.floor(rng() * v.length) % v.length] : v);
const range = (rng, r, dflt = 0) => (Array.isArray(r) ? r[0] + (r[1] - r[0]) * rng() : r ?? dflt);

function liveCount(fx, fxT) {
  const log = fx.log;
  while (fx.liveStart < log.length && log[fx.liveStart].t0 + MAX_LIFE < fxT) fx.liveStart++;
  let n = 0;
  for (let i = fx.liveStart; i < log.length; i++) if (log[i].t0 + log[i].life > fxT) n++;
  return n;
}

function emitLayer(fx, layer, at, opts, fxT) {
  const { rng } = fx;
  const s = opts.scale ?? 1;
  const dir = opts.dir ?? 1;
  let live = liveCount(fx, fxT);
  for (let i = 0; i < (layer.count ?? 1); i++) {
    if (live >= fx.budget) {
      fx.dropped++;
      continue;
    }
    live++;
    const theta = range(rng, layer.angle, 0) * DEG;
    const speed = range(rng, layer.speed, 0) * s;
    const vx = Math.cos(theta) * dir * speed;
    const vy = Math.sin(theta) * speed;
    const spawnA = rng() * Math.PI * 2;
    const spawnR = (layer.offset ?? 0) * s * rng();
    const life = Math.min(MAX_LIFE, range(rng, layer.life, 0.3));
    const [o0, o1] = layer.offsetXY ?? [0, 0];
    const attached = !!layer.attach && !!opts.actorId;
    const base = attached ? { x: o0 * s * dir, y: o1 * s } : { x: at.x, y: at.y };
    fx.log.push({
      t0: fxT,
      x0: base.x + Math.cos(spawnA) * spawnR,
      y0: base.y + Math.sin(spawnA) * spawnR + ((layer.spreadY ?? 0) * s) * (rng() - 0.5),
      vx,
      vy,
      ay: (layer.gravity ?? 0) * s,
      drag: layer.drag ?? 0,
      life,
      size0: layer.size[0] * s,
      size1: layer.size[1] * s,
      width: (layer.width ?? 3) * s,
      rot0: speed > 0 ? Math.atan2(vy, vx) : rng() * Math.PI * 2,
      vrot: range(rng, layer.vrot, 0) * DEG,
      color: opts.color && layer.tintable ? opts.color : pick(rng, layer.color),
      alpha0: layer.alpha?.[0] ?? 1,
      alpha1: layer.alpha?.[1] ?? 0,
      shape: layer.shape,
      glyph: layer.glyph,
      attach: attached ? { actorId: opts.actorId, joint: layer.attach } : null,
      orbit: layer.orbit ? { r: layer.orbit.r * s, w: layer.orbit.w, phase: (i / (layer.count ?? 1)) * Math.PI * 2 } : null,
    });
  }
}

/**
 * Trigger a preset. `at` is the world point for the preset's anchor (the caller resolves head/hip/feet).
 * @param {{ dir?:1|-1, scale?:number, actorId?:string, part?:string, color?:string }} opts
 * @returns {boolean} false for unknown names
 */
export function emitFx(fx, name, at, opts, fxT) {
  const preset = fx.presets[name];
  if (!preset) return false;
  if (preset.trail) fx.trails.push({ kind: preset.trail.kind, actorId: opts.actorId, part: opts.part, t0: fxT, until: fxT + preset.trail.duration });
  if (preset.flash) fx.flashes.push({ t0: fxT, color: preset.flash.color, dur: preset.flash.dur });
  if (preset.glow && opts.actorId) {
    const g = preset.glow;
    emitLayer(fx, { shape: "glow", count: 1, attach: g.attach, life: [g.life, g.life], size: g.size, color: g.color, tintable: true, alpha: g.alpha }, at, opts, fxT);
  }
  if (preset.sustain) {
    fx.sustains.push({ name, opts, until: fxT + preset.sustain.duration, rate: preset.sustain.rate, acc: 0, at });
    return true;
  }
  for (const layer of preset.layers || []) emitLayer(fx, layer, at, opts, fxT);
  return true;
}

/**
 * Advance sustained emitters (aura) on the fx clock.
 * @param {(sustain) => {x,y}} anchorOf  current world position of a sustain's anchor
 */
export function stepFx(fx, fxDt, fxT, anchorOf) {
  for (const s of fx.sustains) {
    if (fxT > s.until) continue;
    s.acc += s.rate * fxDt;
    const at = anchorOf(s) || s.at;
    while (s.acc >= 1) {
      s.acc -= 1;
      for (const layer of fx.presets[s.name].layers) emitLayer(fx, layer, at, s.opts, fxT);
    }
  }
  fx.sustains = fx.sustains.filter((s) => fxT <= s.until);
}

/** Position, size, alpha and rotation of a particle at fx time, or null when not alive. */
export function particleAt(p, fxT) {
  const a = fxT - p.t0;
  if (a < 0 || a >= p.life) return null;
  const u = a / p.life;
  let x;
  let y;
  if (p.drag > 0) {
    const k = p.drag;
    const e = (1 - Math.exp(-k * a)) / k;
    x = p.x0 + p.vx * e;
    y = p.y0 + (p.ay / k) * a + (p.vy - p.ay / k) * e;
  } else {
    x = p.x0 + p.vx * a;
    y = p.y0 + p.vy * a + 0.5 * p.ay * a * a;
  }
  if (p.orbit) {
    const ang = p.orbit.phase + p.orbit.w * a;
    x += Math.cos(ang) * p.orbit.r;
    y += Math.sin(ang) * p.orbit.r * 0.35;
  }
  return {
    x,
    y,
    size: p.size0 + (p.size1 - p.size0) * u,
    alpha: p.alpha0 + (p.alpha1 - p.alpha0) * u * u * (3 - 2 * u),
    rot: p.rot0 + p.vrot * a,
    vx: p.drag > 0 ? p.vx * Math.exp(-p.drag * a) : p.vx,
    vy: p.drag > 0 ? p.vy * Math.exp(-p.drag * a) : p.vy + p.ay * a,
  };
}

/** Records alive at fxT (binary search on emission time, then a bounded scan). */
export function liveParticles(log, fxT) {
  let lo = 0;
  let hi = log.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (log[mid].t0 < fxT - MAX_LIFE) lo = mid + 1;
    else hi = mid;
  }
  const out = [];
  for (let i = lo; i < log.length && log[i].t0 <= fxT; i++) if (fxT - log[i].t0 < log[i].life) out.push(log[i]);
  return out;
}
