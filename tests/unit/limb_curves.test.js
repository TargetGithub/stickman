// Rubber-hose limbs (ADR-034): curve shapes per style, the bounded stretch channel, where a character's limb
// style comes from, the v3 schema fields, and that drawing straight limbs is exactly the v2 drawing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIMB_STYLES, limbStyleOf, limbControl, limbLine, bowedLeg } from "../../engine/renderer/limb_curves.js";
import { MAX_STRETCH, limbStretch, applyStretch, MOTION_DEFAULTS } from "../../engine/motion_fx.js";
import { limbStyles } from "../../engine/renderer/scene_views.js";
import { drawCharacter } from "../../engine/renderer/character.js";
import { computeJoints, BODY } from "../../engine/skeleton.js";
import { validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pose = (p, x = 1000, y = 700) => computeJoints(p, { x, y }, 1, 1, BODY);
/** Distance from p to the chord a-c, signed by side. */
const across = (a, c, p) => ((c.x - a.x) * (p.y - a.y) - (c.y - a.y) * (p.x - a.x)) / dist(a, c);

const A = { x: 0, y: 0 };
const B = { x: 40, y: 20 }; // a bent elbow
const C = { x: 80, y: 0 };
const STRAIGHT = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 80, y: 0 }];

test("limbStyleOf: the three styles, anything else is straight", () => {
  assert.deepEqual(LIMB_STYLES, ["straight", "bendy", "rubber"]);
  for (const [v, want] of [["bendy", "bendy"], ["rubber", "rubber"], ["straight", "straight"], [undefined, "straight"], ["noodle", "straight"]]) assert.equal(limbStyleOf(v), want);
});

test("limbLine: straight returns the chain itself; curves start and end on the root and the end joint", () => {
  const pts = [A, B, C];
  assert.equal(limbLine(pts, "straight"), pts);
  assert.equal(limbLine(pts, undefined), pts);
  assert.equal(limbLine([A, C], "bendy").length, 2, "not a three-point chain: unchanged");
  for (const style of ["bendy", "rubber"]) {
    const line = limbLine(pts, style);
    assert.ok(line.length > 8, `${style}: sampled`);
    assert.deepEqual(line[0], A);
    near(line[line.length - 1].x, C.x);
    near(line[line.length - 1].y, C.y);
  }
});

test("bendy passes through the elbow; rubber bows past it on the same side", () => {
  const bendy = limbLine([A, B, C], "bendy");
  const mid = bendy[bendy.length >> 1];
  near(mid.x, B.x);
  near(mid.y, B.y);
  const rubber = limbLine([A, B, C], "rubber");
  const peak = Math.max(...rubber.map((p) => across(A, C, p)));
  near(peak, across(A, C, B) * 1.45, 1e-6);
  assert.equal(limbControl(A, B, C, "straight"), null);
});

const BENDS = [
  // [label, chain, style, expected bend across the chord at the middle (fraction of chord length)]
  ["a straight limb stays straight (bendy)", STRAIGHT, "bendy", 0],
  ["a straight limb stays straight (rubber: no side to bow to)", STRAIGHT, "rubber", 0],
  ["a slight bend is lifted to the rubber minimum", [A, { x: 40, y: 1 }, C], "rubber", 0.07],
  ["a slight bend the other way bows the other way", [A, { x: 40, y: -1 }, C], "rubber", -0.07],
  ["a deep bend keeps its depth (bendy)", [A, B, C], "bendy", 0.25],
];
for (const [label, chain, style, want] of BENDS) {
  test(`limb bend: ${label}`, () => {
    const line = limbLine(chain, style);
    const [a, , c] = chain;
    const mid = line[line.length >> 1];
    near(across(a, c, mid) / dist(a, c), want, 1e-6);
  });
}

test("bowedLeg: rubber front legs bow outward; other styles stay two points", () => {
  const top = { x: 0, y: 0 };
  const bottom = { x: 0, y: 100 };
  assert.deepEqual(bowedLeg(top, bottom, "bendy", 1), [top, bottom]);
  assert.deepEqual(bowedLeg(top, bottom, undefined, -1), [top, bottom]);
  for (const side of [-1, 1]) {
    const line = bowedLeg(top, bottom, "rubber", side);
    assert.ok(Math.sign(line[line.length >> 1].x) === side, `side ${side}`);
  }
});

// A punch: the right arm unfolds from bent to straight in a few frames.
const punch = Array.from({ length: 8 }, (_, i) => pose({ rUA: 80 - Math.min(1, i / 2) * 80, rFA: -120 + Math.min(1, i / 2) * 120 }));

test("limbStretch: still poses never stretch; a fast reach stretches that arm only, within MAX_STRETCH", () => {
  assert.equal(limbStretch(Array(6).fill(pose({})), [], 0, 880, 1, 1), null);
  assert.equal(limbStretch(punch.slice(0, 3), [], 0, 880, 1, 0), null, "amount 0: off");
  const s = limbStretch(punch.slice(0, 3), [], 0, 880, 1, 1);
  assert.ok(s?.rArm > 1.02, `the punching arm stretches: ${JSON.stringify(s)}`);
  assert.ok(s.rArm <= 1 + MAX_STRETCH);
  assert.equal(s.lArm, undefined);
  assert.equal(s.lLeg, undefined, "legs on the floor never stretch");
});

test("limbStretch: a landed blow pulses the limb nearest the hit, peaking mid-impact and bounded", () => {
  const still = Array(6).fill(pose({ rUA: -70, rFA: 0 })); // the right arm straight out, not moving
  const hits = [{ videoT: 1, point: { x: still[0].rHand.x + 5, y: still[0].rHand.y } }];
  assert.equal(limbStretch(still, hits, 0.99, 880, 1, 1), null, "before the hit");
  const peak = limbStretch(still, hits, 1.075, 880, 1, 1);
  assert.ok(peak.rArm > 1.1 && peak.rArm <= 1 + MAX_STRETCH, JSON.stringify(peak));
  assert.equal(peak.lArm, undefined);
  const late = limbStretch(still, hits, 1.2, 880, 1, 1);
  assert.equal(late, null, "after the impact window");
});

test("limbStretch: an airborne kicking leg may stretch; the grounded one never does", () => {
  const kick = Array.from({ length: 6 }, (_, i) => pose({ rTH: 90 * Math.min(1, i / 3), rSH: 90 - 90 * Math.min(1, i / 3) }, 1000, 700));
  const groundY = Math.max(kick[0].lFoot.y, kick[0].rFoot.y);
  const s = limbStretch(kick.slice(0, 4), [], 0, groundY, 1, 1);
  assert.ok(s?.rLeg > 1, JSON.stringify(s));
  assert.equal(s.lLeg, undefined);
});

test("applyStretch: roots stay, the chain grows by its factor, other joints untouched", () => {
  const j = pose({ rUA: 30, rFA: 20 });
  assert.equal(applyStretch(j, null), j);
  const out = applyStretch(j, { rArm: 1.2 });
  assert.deepEqual(out.shoulder, j.shoulder);
  near(dist(out.shoulder, out.rElbow), dist(j.shoulder, j.rElbow) * 1.2);
  near(dist(out.rElbow, out.rHand), dist(j.rElbow, j.rHand) * 1.2);
  for (const k of ["lHand", "lElbow", "lFoot", "rFoot", "head", "hip"]) assert.deepEqual(out[k], j[k]);
  assert.equal(MOTION_DEFAULTS.stretch, 1);
});

test("limbStyles: placement over scene over cast entry over body plan; straight is left out", () => {
  const story = {
    cast: [{ id: "a", limbStyle: "rubber" }, { id: "b" }, { id: "c", limbStyle: "bendy" }, { id: "d" }],
    scenes: [{ limbStyle: "bendy", cast: [{ id: "a" }, { id: "b", limbStyle: "rubber" }, { id: "c" }, { id: "d", limbStyle: "straight" }] }, { cast: [{ id: "a" }, { id: "b" }, { id: "c" }] }],
  };
  const sc = (index) => ({ index, characters: story.scenes[index].cast.map((p) => ({ id: p.id, body: "stickman" })) });
  assert.deepEqual([...limbStyles(story, sc(0), catalog)], [["a", "bendy"], ["b", "rubber"], ["c", "bendy"]]);
  assert.deepEqual([...limbStyles(story, sc(1), catalog)], [["a", "rubber"], ["c", "bendy"]]);
  const cat = { bodies: { stickman: { limbStyle: "rubber" } } };
  assert.deepEqual([...limbStyles({ cast: [{ id: "x" }], scenes: [{ cast: [{ id: "x" }] }] }, { index: 0, characters: [{ id: "x" }] }, cat)], [["x", "rubber"]]);
});

const v3 = (extra = {}, sceneExtra = {}, castExtra = {}) => ({
  version: 3,
  meta: { title: "Limbs", format: "landscape", seed: 1, kind: "clip", audience: "kids" },
  cast: [{ id: "kai", color: "#3fd8ff", ...castExtra }],
  scenes: [{ id: "s1", location: "city_park", cast: [{ id: "kai", x: 1300, facing: 1 }], beats: [{ id: "b1", at: 0.5, who: "kai", do: "wave" }, { id: "end", at: { after: "b1", delay: 2 }, who: "world", do: "fade", params: { to: "black", dur: 0.5 } }], ...sceneExtra }],
  ...extra,
});
const SCHEMA = [
  ["cast entry", v3({}, {}, { limbStyle: "rubber" }), true],
  ["scene", v3({}, { limbStyle: "bendy" }), true],
  ["motion.stretch", v3({ motion: { stretch: 0.5 } }, { limbStyle: "rubber" }), true],
  ["unknown style", v3({}, { limbStyle: "noodle" }), false],
  ["stretch out of range", v3({ motion: { stretch: 2 } }), false],
  ["v2 has no limbStyle", { ...v3({}, {}, { limbStyle: "rubber" }), version: 2 }, false],
];
for (const [label, script, ok] of SCHEMA) {
  test(`schema: ${label}`, () => {
    const res = validate(script, catalog);
    assert.equal(res.ok, ok, JSON.stringify(res.errors?.slice(0, 2)));
  });
}

/** A canvas stand-in that records path calls (unit tests have no canvas backend). */
function recorder() {
  const calls = [];
  const rec = (name) => (...a) => calls.push([name, ...a.map((v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v))]);
  const ctx = new Proxy({ calls }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === "createRadialGradient" || k === "createLinearGradient") return () => ({ addColorStop() {} });
      if (k === "measureText") return () => ({ width: 10 });
      return rec(k);
    },
    set(t, k, v) { calls.push(["set", k, v]); return true; },
  });
  return ctx;
}
const draw = (style) => {
  const ctx = recorder();
  drawCharacter(ctx, pose({ rUA: 40, rFA: 50, lTH: 20, lSH: 40 }), { color: "#3366cc", scale: 1, facing: 1, ...style });
  return ctx.calls;
};

test("drawCharacter: straight (or no) limb style draws exactly what v2 draws; curves add points, not passes", () => {
  const v2 = draw({});
  assert.deepEqual(draw({ limbStyle: "straight" }), v2);
  for (const style of ["bendy", "rubber"]) {
    const calls = draw({ limbStyle: style });
    const count = (cs, k) => cs.filter((c) => c[0] === k).length;
    assert.equal(count(calls, "stroke"), count(v2, "stroke"), `${style}: same stroke passes`);
    assert.ok(count(calls, "lineTo") > count(v2, "lineTo") * 2, `${style}: curved limbs`);
  }
  // Under a light rig the shading bands are strokes too: they follow the curve.
  const light = { base: "#3366cc", lit: "#5588ee", dark: "#224488", rim: "#ffffff", rimAlpha: 0.5, rimWidth: 0.3, dir: { x: 0.6, y: -0.8 } };
  const lit = draw({ limbStyle: "rubber", light });
  const flat = draw({ limbStyle: "rubber" });
  assert.ok(lit.filter((c) => c[0] === "lineTo").length > flat.filter((c) => c[0] === "lineTo").length * 2);
});
