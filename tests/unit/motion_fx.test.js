// Motion quality (ENGINE_V3_SPEC 5.5, ADR-029): the spring overshoots and settles, follow-through keeps
// bone lengths and legs, squash and stretch, hair sway, breathing and blur ghosts; and the v3 motion block.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MOTION_DEFAULTS, WINDOW, springTrack, followThrough, squashStretch, axisScale, hairSway, standingStill, breathe, blurGhosts } from "../../engine/motion_fx.js";
import { computeJoints, BODY } from "../../engine/skeleton.js";
import { validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pose = (p, x = 1000, y = 700) => computeJoints(p, { x, y }, 1, 1, BODY);

test("springTrack: still series stay put; a stop overshoots, then settles", () => {
  assert.equal(springTrack([1, 1, 1, 1]).value, 1);
  const ramp = [...Array.from({ length: 6 }, (_, i) => i * 0.2), ...Array(4).fill(1)];
  const mid = springTrack(ramp);
  assert.ok(mid.value > 1, `overshoots: ${mid.value}`);
  const late = springTrack([...ramp, ...Array(60).fill(1)]);
  near(late.value, 1, 0.01);
  near(springTrack([3.1, -3.1, -3.1]).target, 3.1 + (2 * Math.PI - 6.2), 1e-9);
  assert.deepEqual(springTrack([]), { value: 0, target: 0 });
});

test("followThrough: still poses are unchanged; moving arms trail with their lengths kept; legs never move", () => {
  const still = Array(WINDOW).fill(pose({}));
  const out = followThrough(still, 1);
  for (const k of ["lHand", "rHand", "head", "lFoot", "rFoot"]) { near(out[k].x, still[0][k].x, 1e-6); near(out[k].y, still[0][k].y, 1e-6); }
  const swing = Array.from({ length: WINDOW }, (_, i) => pose({ rUA: Math.min(150, i * 25), rFA: 10 }));
  const cur = swing[swing.length - 1];
  const ft = followThrough(swing, 1);
  near(dist(ft.shoulder, ft.rElbow), dist(cur.shoulder, cur.rElbow), 1e-6);
  near(dist(ft.rElbow, ft.rHand), dist(cur.rElbow, cur.rHand), 1e-6);
  assert.ok(dist(ft.rHand, cur.rHand) > 1, "the hand overshoots or trails");
  assert.ok(dist(ft.rHand, cur.rHand) < 2 * BODY.forearm + 2 * BODY.upperArm, "bounded");
  assert.deepEqual([ft.lFoot, ft.rFoot, ft.hip], [cur.lFoot, cur.rFoot, cur.hip]);
  assert.equal(followThrough(swing, 0), cur);
});

test("squash and stretch: a landing squashes about the feet, a hit along the blow, a jump stretches", () => {
  const j = pose({});
  const land = squashStretch([j, j, j], [{ type: "land", videoT: 1 }], 1.09, 880, 1);
  assert.ok(land.m[3] < 1 && land.m[0] > 1, "shorter and wider");
  near(land.m[0] * land.m[3], 1);
  const hit = squashStretch([j, j, j], [{ type: "hit", videoT: 1, dir: 1 }], 1.09, 880, 1);
  assert.ok(hit.m[0] < 1, "squashed along x");
  assert.equal(squashStretch([j, j, j], [{ type: "land", videoT: 1 }], 1.5, 880, 1), null, "over after 0.18 s");
  const up = [pose({}, 1000, 500), pose({}, 1000, 470), pose({}, 1000, 440)];
  const st = squashStretch(up, [], 3, 880, 1);
  assert.ok(st.m[3] > 1 && st.m[0] < 1, "stretched in the air");
  assert.equal(squashStretch(up, [], 3, 880, 0), null);
  const m = axisScale({ x: 0, y: 1 }, 0.8);
  near(m[3], 0.8);
  near(m[0], 1.25);
});

test("hair sway leans against motion and is zero at rest; breathing and stillness; blur ghosts only when fast", () => {
  const still = Array(8).fill(pose({}));
  near(hairSway(still, 1), 0);
  const moving = Array.from({ length: 10 }, (_, i) => pose({}, 1000 + i * 8));
  assert.ok(hairSway(moving, 1) < 0, "moving right, the hair leans back");
  assert.ok(standingStill(still) && !standingStill(moving));
  const b = breathe(still[0], "kai", 0.7, 1, 1);
  assert.ok(b.head.y !== still[0].head.y && b.lFoot === still[0].lFoot && b.hip === still[0].hip);
  assert.equal(breathe(still[0], "kai", 0.7, 1, 0), still[0]);
  assert.notEqual(breathe(still[0], "kai", 0.7, 1, 1).head.y, breathe(still[0], "pip", 0.7, 1, 1).head.y, "each on its own phase");
  assert.deepEqual(blurGhosts(still, 1), []);
  const fast = [pose({ rUA: 0 }), pose({ rUA: 60 }), pose({ rUA: 160 })];
  assert.ok(blurGhosts(fast, 1).length === 2);
  assert.deepEqual(blurGhosts(fast, 0), []);
  assert.equal(MOTION_DEFAULTS.blur, 0);
});

test("the v3 motion block validates; v2 has none", () => {
  const story = (motion) => ({ version: 3, ...(motion ? { motion } : {}), meta: { title: "M", format: "landscape", seed: 1, kind: "clip", audience: "kids" }, cast: [{ id: "a", color: "#3d7bd9" }],
    scenes: [{ id: "s1", location: "city_park", cast: [{ id: "a", x: 1200, facing: 1 }], beats: [{ id: "b1", at: 0, who: "a", do: "wave" }, { id: "b2", at: { after: "b1", delay: 1.5 }, who: "a", do: "wave" }] }] });
  assert.deepEqual(validate(story({ followThrough: 0.5, blur: 1 }), catalog).errors, []);
  assert.ok(validate(story({ wobble: 1 }), catalog).errors.some((e) => e.code === "E_SCHEMA_UNKNOWN_FIELD"));
  assert.ok(validate({ ...story({ blur: 1 }), version: 2 }, catalog).errors.some((e) => e.code === "E_SCHEMA_UNKNOWN_FIELD"));
});
