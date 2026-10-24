// Baaaana task 4: lively eyes, big_grin / toothy mouths, belly jiggle (engine/renderer/lively.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { drawFace } from "../../engine/renderer/face.js";
import { idleGazeAt, doubleBlinkAt, jiggleAt } from "../../engine/renderer/lively.js";
import { V2_ENUMS } from "../../engine/validator/v2_names.js";

function fakeCtx() {
  const calls = [];
  return new Proxy({ calls }, {
    get(t, k) {
      if (k in t) return t[k];
      return (...args) => {
        for (const v of args) if (typeof v === "number") assert.ok(Number.isFinite(v), `${String(k)} got ${v}`);
        calls.push(k);
      };
    },
    set() { return true; },
  });
}
const AXES = { u: { x: 0, y: -1 }, f: { x: 1, y: 0 } };
const draw = (face, look, o = {}) => {
  const ctx = fakeCtx();
  drawFace(ctx, { x: 100, y: 100 }, 30, AXES, catalog.faces[face], { look, t: 1, ...o });
  return ctx.calls;
};

test("the new names are in the validator and the catalog", () => {
  assert.ok(V2_ENUMS.eyes.includes("lively"));
  for (const m of ["big_grin", "toothy"]) assert.ok(V2_ENUMS.mouthStyle.includes(m) && catalog.appearance.mouthStyle.includes(m), m);
  assert.ok(catalog.appearance.eyes.includes("lively"));
});

test("idle glances are deterministic, hold for a while and sometimes look at the camera", () => {
  const seq = Array.from({ length: 400 }, (_, i) => idleGazeAt(7, "bn_mooka", i * 0.1));
  assert.deepEqual(seq, Array.from({ length: 400 }, (_, i) => idleGazeAt(7, "bn_mooka", i * 0.1)));
  assert.ok(seq.some((g) => g.cam), "a camera glance in 40 s");
  let changes = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) changes++;
  assert.ok(changes > 5 && changes < 40, `${changes} glance changes in 40 s`);
  assert.notDeepEqual(seq, Array.from({ length: 400 }, (_, i) => idleGazeAt(7, "tutu", i * 0.1)), "each character glances on its own");
});

test("a double blink is two short closings within a third of a second", () => {
  let t = 0;
  while (!doubleBlinkAt(3, "tutu", t)) t += 0.01;
  const shut = Array.from({ length: 40 }, (_, i) => doubleBlinkAt(3, "tutu", t + i * 0.01));
  const runs = shut.reduce((n, s, i) => n + (s && !shut[i - 1] ? 1 : 0), 0);
  assert.equal(runs, 2);
});

const MOUTH_TABLE = [
  // [face, mouthStyle, draws differently from cartoon]
  ["happy", "big_grin", true], ["laugh", "big_grin", true], ["happy", "toothy", true], ["laugh", "toothy", true],
  ["sad", "big_grin", false], ["sad", "toothy", false], ["surprised", "big_grin", false],
];
for (const [face, style, differs] of MOUTH_TABLE) {
  test(`${style} on ${face} ${differs ? "draws its own mouth" : "keeps the cartoon mouth"}`, () => {
    const a = draw(face, { eyes: "big", mouthStyle: style });
    const b = draw(face, { eyes: "big", mouthStyle: "cartoon" });
    assert.equal(a.join() !== b.join(), differs);
  });
}

test("lively eyes draw whites and pupils, and close for a double blink", () => {
  const open = draw("neutral", { eyes: "lively" }, { idle: { f: 0, u: 0 } });
  const big = draw("neutral", { eyes: "big" });
  assert.ok(open.length > big.length);
  const shut = draw("neutral", { eyes: "lively" }, { blink2: true });
  assert.ok(shut.length < open.length);
  assert.deepEqual(draw("neutral", { eyes: "big" }, { blink2: true }), big, "other eye styles ignore the double blink");
});

const JIGGLE = [
  // [inputs, expected sign or zero]
  [{ jiggle: 0.2, faceName: "happy" }, 0],
  [{ faceName: "laugh", time: 1 / 24 }, 0],
  [{ jiggle: 0.2, faceName: "laugh", time: 1 / 24 }, 1],
  [{ jiggle: 0.2, faceName: "happy", hipDy: 6, scale: 1 }, 1],
  [{ jiggle: 0.2, faceName: "happy", hipDy: -6, scale: 1 }, -1],
];
for (const [s, sign] of JIGGLE) {
  test(`jiggleAt(${JSON.stringify(s)}) has sign ${sign}`, () => {
    const k = jiggleAt(s);
    assert.equal(Math.sign(k), sign);
    assert.ok(Math.abs(k) <= (s.jiggle || 0) + 1e-9);
  });
}
