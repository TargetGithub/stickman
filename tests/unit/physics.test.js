import { test } from "node:test";
import assert from "node:assert/strict";
import { stepBody, launch, separate, stepProjectiles } from "../../engine/physics.js";
import { createActor } from "../../engine/actor.js";
import { PHYSICS } from "../../engine/config.js";

const DT = 1 / 60;

test("a launched body flies, spins and lands with a land event", () => {
  const a = createActor({ id: "a", x: 1000 });
  launch(a, 300, -900, -540);
  let land = null;
  let peak = 0;
  for (let i = 0; i < 300 && !land; i++) {
    for (const e of stepBody(a, DT)) if (e.type === "land") land = e;
    peak = Math.min(peak, a.airY);
  }
  assert.ok(land, "landed");
  assert.ok(land.launched);
  const expectedPeak = (900 * 900) / (2 * PHYSICS.gravity);
  assert.ok(Math.abs(-peak - expectedPeak) < 15, `peak ${-peak} vs ${expectedPeak}`);
  assert.ok(a.x > 1000, "moved forward");
  assert.ok(a.spinRot < -300, "spun backward");
  assert.equal(a.airborne, false);
  assert.equal(a.airY, 0);
});

test("ground friction stops a sliding body after a short, frame-rate independent distance", () => {
  const run = (dt) => {
    const a = createActor({ x: 1000 });
    a.vx = 300;
    for (let t = 0; t < 2; t += dt) stepBody(a, dt);
    return a.x - 1000;
  };
  const d60 = run(1 / 60);
  const d120 = run(1 / 120);
  assert.ok(d60 > 20 && d60 < 50, `slid ${d60}`);
  assert.ok(Math.abs(d60 - d120) < 3, `60fps ${d60} vs 120fps ${d120}`);
});

test("zero dt changes nothing (hitstop)", () => {
  const a = createActor({ x: 1000 });
  launch(a, 300, -900, 100);
  const before = JSON.stringify(a);
  stepBody(a, 0);
  assert.equal(JSON.stringify(a), before);
});

test("stage bounds clamp; launched bodies bounce off walls", () => {
  const a = createActor({ x: 100 });
  a.vx = -500;
  stepBody(a, DT, { stageWidth: 3200, margin: 60 });
  for (let i = 0; i < 10; i++) stepBody(a, DT, { stageWidth: 3200, margin: 60 });
  assert.equal(a.x, 60);
  const b = createActor({ x: 70 });
  launch(b, -600, -400, 0);
  const events = [];
  for (let i = 0; i < 5; i++) events.push(...stepBody(b, DT, { stageWidth: 3200, margin: 60 }));
  assert.ok(events.some((e) => e.type === "wall"), "wall event");
  assert.ok(b.vx > 0 && b.vx <= 600 * PHYSICS.wallRestitution + 1e-9, `vx after bounce ${b.vx}`);
});

test("separation pushes grounded actors apart symmetrically, scaled by the bigger body", () => {
  const a = createActor({ id: "a", x: 1000, scale: 1 });
  const b = createActor({ id: "b", x: 1030, scale: 2 });
  separate([a, b]);
  assert.ok(Math.abs(b.x - a.x - PHYSICS.minGap * 2) < 1e-9);
  assert.ok(Math.abs(a.x + b.x - 2030) < 1e-9, "symmetric");
  const c = createActor({ x: 1000 });
  const d = createActor({ x: 1010 });
  separate([c, d], () => true);
  assert.equal(d.x - c.x, 10, "skipped pair untouched");
});

test("projectiles move ballistically and expire", () => {
  const list = [{ x: 0, y: 0, vx: 600, vy: 0, gravity: 0, radius: 10, life: 0.5 }];
  let expired = 0;
  for (let i = 0; i < 40; i++) expired += stepProjectiles(list, DT).length;
  assert.equal(expired, 1);
  assert.equal(list.length, 0);
});
