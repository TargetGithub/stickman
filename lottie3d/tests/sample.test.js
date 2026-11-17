import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cubicBezier, docTime, EASES, evaluate, sampleTrack } from "../sample.js";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const track = [{ t: 0, v: [0, 10, 0] }, { t: 1, v: [10, 20, 0], ease: "step" }, { t: 2, v: [20, 0, 0] }];

const rows = [
  ["before the first key holds it", -1, [0, 10, 0]],
  ["at a key", 1, [10, 20, 0]],
  ["linear midpoint", 0.5, [5, 15, 0]],
  ["step holds until the next key", 1.99, [10, 20, 0]],
  ["after the last key holds it", 5, [20, 0, 0]],
];
for (const [name, t, want] of rows) {
  test(`sampleTrack: ${name}`, () => {
    sampleTrack(track, t).forEach((x, i) => close(x, want[i]));
  });
}

test("sampleTrack: numbers and named eases", () => {
  const tr = [{ t: 0, v: 0, ease: "quadIn" }, { t: 2, v: 100 }];
  close(sampleTrack(tr, 1), 25);
});

test("sampleTrack: repeat cycles with the last key's period", () => {
  const tr = { repeat: true, keys: [{ t: 0, v: 0 }, { t: 1, v: 10 }] };
  close(sampleTrack(tr, 2.25), 2.5);
  close(sampleTrack(tr, 0.25), 2.5);
});

test("sampleTrack returns copies, not the stored arrays", () => {
  const v = sampleTrack(track, -1);
  v[0] = 99;
  assert.equal(track[0].v[0], 0);
});

test("eases start at 0 and end at 1", () => {
  for (const [name, f] of Object.entries(EASES)) {
    close(f(0), 0, 1e-9);
    close(f(1), 1, 1e-9);
    assert.ok(Number.isFinite(f(0.37)), name);
  }
});

test("cubicBezier matches known curves", () => {
  const lin = cubicBezier(0, 0, 1, 1);
  close(lin(0.3), 0.3, 1e-5);
  const ease = cubicBezier(0.42, 0, 0.58, 1); // CSS ease-in-out, symmetric
  close(ease(0.5), 0.5, 1e-5);
  assert.ok(ease(0.25) < 0.25);
});

test("docTime snaps to frames and loops", () => {
  const doc = { duration: 2, fps: 10 };
  close(docTime(doc, 0.36), 0.3);
  close(docTime(doc, 2.36), 0.3);
  close(docTime({ ...doc, loop: false }, 9), 2);
});

test("evaluate is deterministic and applies tracks", () => {
  const doc = JSON.parse(readFileSync(new URL("../examples/walk.json", import.meta.url), "utf8"));
  const a = evaluate(doc, 1.5);
  const b = evaluate(doc, 1.5);
  assert.deepEqual(a, b);
  const walker = a.characters.find((c) => c.id === "walker");
  close(walker.position[0], -1.5);
  close(a.camera.position[0], -1);
  assert.equal(walker.yaw, 90);
  assert.ok(Array.isArray(walker.joints.hipL));
});
