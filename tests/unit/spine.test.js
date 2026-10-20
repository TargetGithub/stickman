// Bendable spine (ADR-036): a draw-time curve between hip and shoulders; the joints never move.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spineBend, spineControl, spineLine, leanOf, curveAt, MAX_BEND } from "../../engine/spine.js";
import { computeJoints } from "../../engine/skeleton.js";
import { spineAmount } from "../../engine/renderer/motion_draw.js";
import { drawCharacter } from "../../engine/renderer/character.js";

const pose = (lean, facing = 1) => computeJoints({ lean }, { x: 500, y: 600 }, facing, 1);

test("leanOf reads the forward lean from hip to shoulder, either facing", () => {
  for (const [lean, facing] of [[0, 1], [30, 1], [-20, 1], [30, -1], [-45, -1]]) assert.ok(Math.abs(leanOf(pose(lean, facing), facing) - lean) < 1e-6, `${lean} ${facing}`);
});

test("posture: leaning forward hunches (+), leaning back arches (-), upright is straight", () => {
  for (const [lean, sign] of [[0, 0], [40, 1], [-30, -1]]) {
    const b = spineBend([pose(lean)], [], 0, 1, 1);
    assert.equal(Math.sign(Math.round(b * 1e6)), sign, `lean ${lean}: ${b}`);
  }
  assert.equal(spineBend([pose(40)], [], 0, 1, 0), 0, "amount 0 is straight");
});

test("follow-through: the middle trails a forward swing, then settles; bounded by MAX_BEND", () => {
  const swing = [...Array(6).fill(0), 10, 20, 30, 40].map((l) => pose(l));
  const still = Array(14).fill(0).map(() => pose(40));
  assert.ok(spineBend(swing, [], 0, 1, 1) > spineBend(still, [], 0, 1, 1), "a swing adds to the hunch");
  for (const h of [swing, still]) assert.ok(Math.abs(spineBend(h, [{ type: "land", videoT: 0 }], 0.11, 1, 1.35)) <= MAX_BEND + 1e-9);
});

test("events: a landing hunches, a blow from the front hunches and from behind arches", () => {
  const j = [pose(0)];
  const cases = [
    [{ type: "land", videoT: 0 }, 1],
    [{ type: "hit", videoT: 0, dir: -1 }, 1], // facing +1, pushed back toward -x: from the front
    [{ type: "hit", videoT: 0, dir: 1 }, -1],
  ];
  for (const [e, sign] of cases) assert.equal(Math.sign(spineBend(j, [e], 0.11, 1, 1)), sign, JSON.stringify(e));
  assert.equal(spineBend(j, [{ type: "land", videoT: 0 }], 0.5, 1, 1), 0, "over after 0.22 s");
});

test("spineControl puts the curve's middle on the back side by bend x length", () => {
  const a = { x: 0, y: 100 };
  const b = { x: 0, y: 0 };
  for (const [facing, bend, x] of [[1, 0.1, -10], [-1, 0.1, 10], [1, -0.1, 10]]) {
    const mid = curveAt(a, spineControl(a, b, facing, bend), b, 0.5).p;
    assert.ok(Math.abs(mid.x - x) < 1e-9 && Math.abs(mid.y - 50) < 1e-9, `${facing} ${bend}`);
  }
  const quadUp = curveAt({ x: 0, y: 0 }, spineControl({ x: 0, y: 0 }, { x: 100, y: 0 }, 1, 0.1, true), { x: 100, y: 0 }, 0.5).p;
  assert.ok(quadUp.y < 0, "a quadruped's positive bend arches up");
});

test("spineLine: straight is the v2 chain; bent keeps the hip, shoulder and neck", () => {
  const j = pose(0);
  assert.deepEqual(spineLine(j, 1, 0), [j.hip, j.shoulder, j.neckTop]);
  const l = spineLine(j, 1, 0.1);
  assert.deepEqual([l[0], l[l.length - 2], l[l.length - 1]], [j.hip, j.shoulder, j.neckTop]);
});

test("spineAmount: on with bendy and rubber limbs, off with straight, the script's motion.spine wins", () => {
  for (const [cfg, style, want] of [[{}, "straight", 0], [{}, "bendy", 1], [{}, "rubber", 1.35], [{ spine: 0.5 }, "straight", 0.5], [{ spine: 0 }, "rubber", 0]]) assert.equal(spineAmount(cfg, style), want, `${style} ${JSON.stringify(cfg)}`);
});

test("every body draws with a bent spine (stick, capsule, trapezoid, outfits)", () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => (calls.push(k), String(k).startsWith("create") ? { addColorStop() {} } : undefined)), set: (t, k, v) => ((t[k] = v), true) });
  const j = pose(30);
  for (const draw of [undefined, "capsule", "trapezoid"]) {
    drawCharacter(ctx, j, { color: "#5ec8ff", scale: 1, facing: 1, draw, torsoWidth: 24, spineBend: 0.15, look: { outfit: "coat", accessories: {} }, light: { base: "#5ec8ff", lit: "#9fe0ff", dark: "#3a8cc0", rim: "#ffffff", rimAlpha: 0.5, dir: { x: 0.6, y: -0.8 } } });
  }
  assert.ok(calls.includes("stroke") && calls.includes("fill"));
});
