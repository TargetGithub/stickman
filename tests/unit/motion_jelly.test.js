// Baaaana task 5: jelly squash and stretch, sprout lean (engine/motion_jelly.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeJoints } from "../../engine/skeleton.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { jellySquash, sproutLean } from "../../engine/motion_jelly.js";
import { catalog } from "../../catalog/index.js";

const dims = bodyPlan(catalog, "baaaana").dims;
const GROUND = 900;
const at = (dy) => computeJoints({}, { x: 500, y: 700 + dy }, 1, 1, dims);
const feetY = Math.max(at(0).lFoot.y, at(0).rFoot.y);
// The floor right under the feet (standing) or 200 px below them (in the air).
const ground = (air) => feetY + (air ? 200 : 0);
const vScale = (sq) => (sq ? sq.m[3] : 1);

test("the Baaaana plans are squishy and other plans are not", () => {
  for (const n of ["baaaana", "baaaana_tall", "baaaana_wide"]) assert.ok(catalog.bodies[n].squishy > 1, n);
  for (const n of ["stickman", "buddy", "dog_small"]) assert.equal(catalog.bodies[n].squishy, undefined, n);
});

test("a landing squashes at once, then wobbles past round and settles", () => {
  const hist = [at(0), at(0), at(0)];
  const ev = [{ type: "land", videoT: 1 }];
  const k = (t) => vScale(jellySquash(hist, ev, t, ground(false), 2, "happy"));
  assert.ok(k(1) < 0.8, `squashed on impact (${k(1)})`);
  const after = Array.from({ length: 30 }, (_, i) => k(1 + i / 60));
  assert.ok(after.some((v) => v > 1.02), "overshoots taller");
  assert.ok(Math.abs(k(1.6) - 1) < 0.01, "settled after the wobble");
  assert.ok(after.every((v) => v >= 0.7 && v <= 1.3), "bounded");
});

const TABLE = [
  // [what, history dy (oldest..now), air, face, expect vertical scale]
  ["rising in the air stretches", [20, 10, 0], true, "happy", ">"],
  ["falling in the air stretches", [-20, -10, 0], true, "happy", ">"],
  ["hip dropping into a step squashes", [-6, -3, 0], false, "happy", "<"],
  ["hip rising out of a step stretches", [6, 3, 0], false, "happy", ">"],
  ["standing still does nothing", [0, 0, 0], false, "happy", "="],
];
for (const [what, dys, air, face, want] of TABLE) {
  test(`jellySquash: ${what}`, () => {
    const hist = dys.map((dy) => at(dy - (air ? 200 : 0)));
    const v = vScale(jellySquash(hist, [], 1, ground(air), 1.8, face));
    if (want === ">") assert.ok(v > 1.005, `${v}`);
    if (want === "<") assert.ok(v < 0.995, `${v}`);
    if (want === "=") assert.equal(v, 1);
  });
}

test("a laugh shakes the body over time; zero amount turns it off", () => {
  const hist = [at(0), at(0), at(0)];
  const vals = Array.from({ length: 10 }, (_, i) => vScale(jellySquash(hist, [], i / 48, ground(false), 2, "laugh")));
  assert.ok(Math.max(...vals) > 1.02 && Math.min(...vals) < 0.98);
  assert.equal(jellySquash(hist, [{ type: "land", videoT: 0 }], 0.05, ground(false), 0, "laugh"), null);
});

const MOODS = [["sad", ">"], ["asleep", ">"], ["tired", ">"], ["happy", "<"], ["surprised", "<"], ["neutral", "~"]];
for (const [face, want] of MOODS) {
  test(`sproutLean: ${face} ${want === ">" ? "droops back" : want === "<" ? "perks forward" : "stays upright"}`, () => {
    const a = sproutLean(face, 0, 0, 0);
    if (want === ">") assert.ok(a > 0.4);
    if (want === "<") assert.ok(a < 0);
    if (want === "~") assert.ok(Math.abs(a) < 0.06);
  });
}

test("sproutLean trails the motion and stays bounded", () => {
  assert.ok(sproutLean("neutral", 0.2, 0) > sproutLean("neutral", -0.2, 0));
  for (const s of [-5, 5]) assert.ok(Math.abs(sproutLean("cry", s, 0)) <= 0.95);
});
