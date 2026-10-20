// Turnaround views (ENGINE_V3_SPEC 5.4, ADR-027): the catalog's views, fallbacks, yaw over time with turns,
// the face shift, turned joints, the humanoid and quadruped helpers, and the validator's view checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { VIEWS, VIEW_YAW, TURN_TIME, viewsOf, resolveView, yawAt, faceShiftOf, faceShows, turnJoints } from "../../engine/turnaround.js";
import { turnedHumanoid, quadBlend } from "../../engine/renderer/turnaround_draw.js";
import { computeJoints, BODY } from "../../engine/skeleton.js";
import { catalog } from "../../catalog/index.js";
import { validate } from "../../engine/index.js";
import { movesFor } from "../../engine/sim.js";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("the base bodies carry their views: four for humanoids, side and front for the dog; moves carry hints", () => {
  for (const [name, b] of Object.entries(catalog.bodies)) {
    assert.deepEqual(viewsOf(b), b.rig === "quadruped" ? ["side", "front"] : VIEWS, name);
    assert.ok(b.turn && b.turn.shoulder > 0, name);
  }
  const moves = movesFor(catalog);
  assert.equal(moves.get("wave").view, "three_quarter");
  assert.equal(moves.get("cheer").view, "front");
  assert.equal(moves.get("walk").view, null);
  assert.deepEqual(viewsOf({ rig: "quadruped" }), ["side", "front"]);
});

test("resolveView falls back to the nearest view the plan has", () => {
  const dog = catalog.bodies.dog_small;
  for (const [want, got] of [["front", "front"], ["three_quarter", "front"], ["back", "side"], [undefined, "side"]]) assert.equal(resolveView(dog, want), got, String(want));
  assert.equal(resolveView(catalog.bodies.kid, "back"), "back");
});

test("yawAt: base, set views, move hints over sets, and a smooth turn", () => {
  const track = { base: "side", sets: [{ storyT: 1, view: "front" }], hints: [{ t0: 3, t1: 4, view: "three_quarter" }] };
  assert.equal(yawAt(track, 0.5), 90);
  near(yawAt(track, 1 + TURN_TIME / 2), 45);
  assert.equal(yawAt(track, 2), 0);
  assert.equal(yawAt(track, 3.5), VIEW_YAW.three_quarter);
  assert.equal(yawAt(track, 5), 0, "after the hint, back to the set view");
  near(yawAt(track, 4 + TURN_TIME / 2), VIEW_YAW.three_quarter / 2);
});

test("face shift and visibility by yaw", () => {
  near(faceShiftOf(90), 0);
  near(faceShiftOf(0), 0.31);
  near(faceShiftOf(180), 0);
  assert.ok(faceShows(50) && !faceShows(180));
});

test("turnJoints: side is unchanged; front spreads the sides and keeps heights; back mirrors", () => {
  const pose = { lUA: 20, rUA: -20, lTH: 15, rTH: -15 };
  const j = computeJoints(pose, { x: 1000, y: 700 }, 1, 1, BODY);
  assert.equal(turnJoints(j, 1, 90, null, 1), j);
  const front = turnJoints(j, 1, 0, { shoulder: 13, hip: 8 }, 1);
  near(front.lShoulder.x - front.rShoulder.x, 26);
  near(front.hip.x, 1000);
  near(front.shoulder.y, j.shoulder.y + (j.shoulder.x - 1000) * 0.3);
  assert.ok(front.lFoot.x > front.rFoot.x, "the far leg goes to the other side");
  const back = turnJoints(j, 1, 180, { shoulder: 13, hip: 8 }, 1);
  near(back.lShoulder.x - back.rShoulder.x, -26);
  const mirror = turnJoints(j, -1, 0, { shoulder: 13, hip: 8 }, 1);
  near(mirror.lShoulder.x - mirror.rShoulder.x, -26, 1e-6);
});

test("turnedHumanoid swaps sides from behind and brightens the far side from the front; quadBlend cross-fades", () => {
  const j = computeJoints({}, { x: 1000, y: 700 }, 1, 1, BODY);
  const c = { j, facing: 1, scale: 1 };
  assert.equal(turnedHumanoid(c, 90, catalog.bodies.stickman), null);
  const front = turnedHumanoid(c, 0, catalog.bodies.stickman);
  assert.deepEqual([front.hideFace, front.farBrightness], [false, 1]);
  const back = turnedHumanoid(c, 180, catalog.bodies.stickman);
  assert.equal(back.hideFace, true);
  assert.deepEqual(back.j.lShoulder, turnJoints(j, 1, 180, catalog.bodies.stickman.turn, 1).rShoulder);
  assert.deepEqual(quadBlend(90), { front: 0, squash: 1 });
  near(quadBlend(45).front, 0.5);
  near(quadBlend(45).squash, 0.82);
  assert.deepEqual(quadBlend(0), { front: 1, squash: 1 - 0.18 * Math.sin(Math.PI) });
});

test("the validator: views in the v3 schema, and only views the body plan has", () => {
  const story = (view, body = "kid") => ({
    version: 3, meta: { title: "V", format: "landscape", seed: 1, kind: "clip", audience: "kids" },
    cast: [{ id: "a", body, color: "#3d7bd9", view: "side" }],
    scenes: [{ id: "s1", location: "city_park", cast: [{ id: "a", x: 1200, facing: 1 }], beats: [{ id: "b1", at: 0, who: "a", do: "wave", view }, { id: "b2", at: { after: "b1", delay: 1.5 }, who: "a", do: "wave" }] }],
  });
  const codes = (s) => validate(s, catalog).errors.map((e) => e.code);
  assert.deepEqual(codes(story("front")), []);
  assert.deepEqual(codes(story("back")), []);
  assert.deepEqual(codes(story("three_quarter", "dog_small")), ["E_VIEW_BODY"]);
  assert.deepEqual(codes(story("front", "dog_small")), []);
  assert.ok(codes(story("top")).includes("E_SCHEMA_ENUM"));
  assert.ok(validate({ ...story("front"), version: 2 }, catalog).errors.some((e) => e.code === "E_SCHEMA_UNKNOWN_FIELD"));
});

test("automatic turns go a share of the way (the look strength); set views go all the way", () => {
  const track = { base: "side", sets: [], hints: [{ t0: 1, t1: 3, view: "front", amount: 0.2 }] };
  near(yawAt(track, 2), 90 - 90 * 0.2);
  const set = { base: "side", sets: [{ storyT: 0, view: "front" }], hints: [{ t0: 1, t1: 3, view: "three_quarter", amount: 0.5 }] };
  near(yawAt(set, 2), 0 + (50 - 0) * 0.5);
  assert.equal(yawAt(set, 4), 0);
});
