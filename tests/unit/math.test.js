import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lerp, clamp, easings, mulberry32, hash32, deriveRng, valueNoise1D, rotate, norm, dist,
} from "../../engine/math.js";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test("lerp and clamp", () => {
  for (const [a, b, u, want] of [[0, 10, 0, 0], [0, 10, 1, 10], [0, 10, 0.25, 2.5], [-4, 4, 0.5, 0]]) {
    close(lerp(a, b, u), want);
  }
  for (const [v, want] of [[-1, 0], [0.5, 0.5], [2, 1]]) assert.equal(clamp(v, 0, 1), want);
});

test("every easing maps 0→0 and 1→1", () => {
  for (const [name, f] of Object.entries(easings)) {
    close(f(0), 0, 1e-9);
    close(f(1), 1, 1e-9);
    assert.ok(Number.isFinite(f(0.5)), name);
  }
});

test("snap easings hold then jump", () => {
  assert.equal(easings.snap(0.49), 0);
  assert.equal(easings.snap(0.5), 1);
  assert.equal(easings.holdThenSnap(0.84), 0);
  assert.equal(easings.holdThenSnap(0.85), 1);
});

test("mulberry32 is repeatable and in [0, 1)", () => {
  const a = mulberry32(1234);
  const b = mulberry32(1234);
  for (let i = 0; i < 1000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test("hash32 is stable FNV-1a", () => {
  assert.equal(hash32(""), 0x811c9dc5);
  assert.equal(hash32("a"), 0xe40c292c);
  assert.notEqual(hash32("fx"), hash32("physics"));
});

test("derived streams are independent of each other", () => {
  const fx = deriveRng(7, "fx");
  const physics = deriveRng(7, "physics");
  assert.notEqual(fx(), physics());
  assert.equal(deriveRng(7, "fx")(), deriveRng(7, "fx")());
});

test("value noise is smooth, bounded and deterministic", () => {
  const n1 = valueNoise1D(mulberry32(5));
  const n2 = valueNoise1D(mulberry32(5));
  let prev = n1(0);
  for (let t = 0; t < 100; t += 0.01) {
    const v = n1(t);
    assert.equal(v, n2(t));
    assert.ok(v >= -1 && v <= 1);
    assert.ok(Math.abs(v - prev) < 0.05, `jump at t=${t}`);
    prev = v;
  }
});

test("vector helpers", () => {
  const r = rotate({ x: 0, y: -1 }, Math.PI / 2); // up rotated clockwise → right
  close(r.x, 1);
  close(r.y, 0);
  close(dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.deepEqual(norm({ x: 0, y: 0 }), { x: 0, y: 0 });
});
