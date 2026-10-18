import { test } from "node:test";
import assert from "node:assert/strict";
import { createFx, emitFx, stepFx, particleAt, liveParticles, MAX_LIFE } from "../../engine/fx.js";
import { mulberry32 } from "../../engine/math.js";
import { catalog } from "../../catalog/index.js";

const { fxPresets, fxNames: FX_NAMES } = catalog;

const at = { x: 1000, y: 700 };

test("every preset emits, stays within MAX_LIFE, and uses known shapes", () => {
  const shapes = new Set(["line", "dot", "ring", "ellipse", "star", "puff", "glow", "glyph"]);
  for (const name of FX_NAMES) {
    const fx = createFx(mulberry32(1), fxPresets);
    assert.ok(emitFx(fx, name, at, { dir: 1, scale: 1, actorId: "a" }, 0), name);
    stepFx(fx, 1, 1, () => at);
    for (const p of fx.log) {
      assert.ok(p.life > 0 && p.life <= MAX_LIFE, `${name} life`);
      assert.ok(shapes.has(p.shape), `${name} shape ${p.shape}`);
    }
    const p = fxPresets[name];
    assert.ok(fx.log.length > 0 || p.trail, `${name} produced particles or a trail`);
  }
});

test("unknown effects are reported, not thrown", () => {
  assert.equal(emitFx(createFx(mulberry32(1), fxPresets), "nope", at, {}, 0), false);
});

test("emission is deterministic for a seed and differs across seeds", () => {
  const run = (seed) => {
    const fx = createFx(mulberry32(seed), fxPresets);
    emitFx(fx, "impact_big", at, { dir: -1, scale: 2 }, 0.5);
    return JSON.stringify(fx.log);
  };
  assert.equal(run(3), run(3));
  assert.notEqual(run(3), run(4));
});

test("closed-form motion matches numeric integration (gravity + drag)", () => {
  const p = { t0: 0, x0: 0, y0: 0, vx: 300, vy: -400, ay: 1200, drag: 2.5, life: 1, size0: 1, size1: 1, alpha0: 1, alpha1: 0, rot0: 0, vrot: 0 };
  let x = 0;
  let y = 0;
  let vx = p.vx;
  let vy = p.vy;
  const dt = 1 / 20000;
  for (let t = 0; t < 0.6; t += dt) {
    vx += -p.drag * vx * dt;
    vy += (p.ay - p.drag * vy) * dt;
    x += vx * dt;
    y += vy * dt;
  }
  const s = particleAt(p, 0.6);
  assert.ok(Math.abs(s.x - x) < 0.5 && Math.abs(s.y - y) < 0.5, `${s.x},${s.y} vs ${x},${y}`);
});

test("liveParticles returns exactly the records alive at a time", () => {
  const fx = createFx(mulberry32(9), fxPresets);
  for (let i = 0; i < 40; i++) emitFx(fx, "impact_small", at, { dir: 1 }, i * 0.05);
  for (const t of [0, 0.3, 1.0, 2.5, 6]) {
    const brute = fx.log.filter((p) => t >= p.t0 && t - p.t0 < p.life);
    assert.deepEqual(liveParticles(fx.log, t), brute, `t=${t}`);
  }
});

test("the particle budget drops extra emissions deterministically", () => {
  const fx = createFx(mulberry32(1), fxPresets, 50);
  for (let i = 0; i < 20; i++) emitFx(fx, "impact_big", at, { dir: 1 }, 0);
  assert.ok(fx.dropped > 0);
  assert.equal(liveParticles(fx.log, 0).length, 50);
});

test("sustained aura emits at its rate for its duration, following the anchor", () => {
  const fx = createFx(mulberry32(1), fxPresets);
  emitFx(fx, "aura", at, { dir: 1, actorId: "hero" }, 0);
  let x = 1000;
  for (let t = 1 / 60; t <= 3; t += 1 / 60) {
    x += 2;
    stepFx(fx, 1 / 60, t, () => ({ x, y: 700 }));
  }
  const puffs = fx.log.filter((p) => p.shape === "puff");
  const { duration, rate } = fxPresets.aura.sustain;
  assert.ok(Math.abs(puffs.length - duration * rate) <= 2, `${puffs.length} puffs`);
  assert.ok(puffs[puffs.length - 1].x0 > puffs[0].x0 + 100, "followed the actor");
  assert.equal(fx.log.filter((p) => p.shape === "glow").length, 1);
});

test("trails and flashes are recorded for renderer use", () => {
  const fx = createFx(mulberry32(1), fxPresets);
  emitFx(fx, "afterimage", at, { actorId: "hero" }, 1);
  emitFx(fx, "explosion", at, {}, 2);
  assert.equal(fx.trails[0].kind, "afterimage");
  assert.ok(fx.trails[0].until > 1);
  assert.equal(fx.flashes.length, 1);
});
