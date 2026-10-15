import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BODY, computeJoints, solveIK2, bendSignOf, lowestPoint, packJoints, unpackJoints,
} from "../../engine/skeleton.js";
import { JOINT_ORDER } from "../../engine/types.js";
import { poses } from "../../data/poses.js";

const EPS = 1e-6;
const near = (p, q, msg) =>
  assert.ok(Math.abs(p.x - q.x) < EPS && Math.abs(p.y - q.y) < EPS, `${msg}: (${p.x}, ${p.y}) ≉ (${q.x}, ${q.y})`);
const origin = { x: 0, y: 0 };

test("zero pose: straight vertical figure", () => {
  const j = computeJoints({}, origin, 1, 1);
  const table = {
    hip: [0, 0], shoulder: [0, -78], neckTop: [0, -86], head: [0, -108], center: [0, -39],
    lElbow: [0, -40], lHand: [0, -4], rElbow: [0, -40], rHand: [0, -4],
    lKnee: [0, 48], lFoot: [0, 94], rKnee: [0, 48], rFoot: [0, 94],
  };
  for (const [name, [x, y]] of Object.entries(table)) near(j[name], { x, y }, name);
});

test("channel directions (facing right)", () => {
  const cases = [
    // [pose, joint, expected point, meaning]
    [{ lean: 90 }, "shoulder", { x: 78, y: 0 }, "lean + is forward"],
    [{ head: 90 }, "head", { x: 22, y: -86 }, "head + tilts forward (v1.1 sign fix)"],
    [{ rUA: 90 }, "rElbow", { x: 38, y: -78 }, "upper arm + swings forward"],
    [{ rUA: 90, rFA: 90 }, "rHand", { x: 38, y: -114 }, "forearm + flexes forward/up"],
    [{ rTH: 90 }, "rKnee", { x: 48, y: 0 }, "thigh + swings forward"],
    [{ rSH: 90 }, "rFoot", { x: -46, y: 48 }, "shin + flexes backward"],
    [{ dx: 10, dy: 5 }, "hip", { x: 10, y: 5 }, "root offset forward/down"],
  ];
  for (const [pose, joint, want, meaning] of cases) near(computeJoints(pose, origin, 1, 1)[joint], want, meaning);
});

test("rot rotates the whole body forward around the body center", () => {
  const j = computeJoints({ rot: 90 }, origin, 1, 1);
  near(j.center, { x: 0, y: -39 }, "center fixed");
  near(j.shoulder, { x: 39, y: -39 }, "top goes forward");
  near(j.hip, { x: -39, y: -39 }, "hip goes back");
  const back = computeJoints({ rot: 90 }, origin, -1, 1);
  near(back.shoulder, { x: -39, y: -39 }, "mirrored when facing left");
});

test("facing -1 mirrors every joint for every named pose", () => {
  for (const [name, pose] of Object.entries(poses)) {
    const r = computeJoints(pose, origin, 1, 1.3);
    const l = computeJoints(pose, origin, -1, 1.3);
    for (const k of JOINT_ORDER) near(l[k], { x: -r[k].x, y: r[k].y }, `${name}.${k}`);
  }
});

test("scale multiplies lengths", () => {
  const j = computeJoints({}, { x: 5, y: 7 }, 1, 2);
  near(j.rFoot, { x: 5, y: 7 + 2 * (BODY.thigh + BODY.shin) }, "foot");
  near(j.head, { x: 5, y: 7 - 2 * (BODY.torso + BODY.neck + BODY.headR) }, "head");
});

test("solveIK2 reaches reachable targets with correct bone lengths", () => {
  const a = { x: 0, y: 0 };
  for (const target of [{ x: 50, y: 20 }, { x: -30, y: 40 }, { x: 10, y: -60 }]) {
    for (const bend of [1, -1]) {
      const { mid, end, reached } = solveIK2(a, 38, 36, target, bend);
      assert.ok(reached);
      near(end, target, "end at target");
      assert.ok(Math.abs(Math.hypot(mid.x, mid.y) - 38) < EPS, "upper length");
      assert.ok(Math.abs(Math.hypot(end.x - mid.x, end.y - mid.y) - 36) < EPS, "lower length");
      assert.equal(bendSignOf(a, mid, end), bend, "bend side preserved");
    }
  }
});

test("solveIK2 clamps unreachable targets to 98% reach", () => {
  const { end, reached } = solveIK2({ x: 0, y: 0 }, 38, 36, { x: 500, y: 0 }, 1);
  assert.equal(reached, false);
  near(end, { x: 0.98 * 74, y: 0 }, "clamped along direction");
});

test("lowestPoint uses any joint, including the head", () => {
  const standing = computeJoints(poses.stand, origin, 1, 1);
  assert.ok(Math.abs(lowestPoint(standing, 1) - standing.rFoot.y) < 1, "standing: feet are lowest");
  const upsideDown = computeJoints({ rot: 180 }, origin, 1, 1);
  near({ x: 0, y: lowestPoint(upsideDown, 1) }, { x: 0, y: upsideDown.head.y + BODY.headR }, "head lowest when inverted");
});

test("down pose lies flat: body height stays small", () => {
  const j = computeJoints(poses.down, origin, 1, 1);
  const ys = JOINT_ORDER.filter((k) => k !== "center").map((k) => j[k].y);
  const height = lowestPoint(j, 1) - Math.min(...ys, j.head.y - BODY.headR);
  assert.ok(height < 60, `lying body is ${height.toFixed(1)} px tall`);
});

test("pack/unpack round trip", () => {
  const j = computeJoints(poses.guard, { x: 100, y: 880 }, -1, 1.5);
  const buf = packJoints(j, new Float32Array(26 + 4), 4);
  const back = unpackJoints(buf, 4);
  for (const k of JOINT_ORDER) {
    assert.ok(Math.abs(back[k].x - j[k].x) < 1e-3 && Math.abs(back[k].y - j[k].y) < 1e-3, k);
  }
});
