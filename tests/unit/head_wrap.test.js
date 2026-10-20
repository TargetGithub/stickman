// Hair and hats in turned views (V3.9, ADR-032): masses get a mirrored copy scaled by wrap, single pieces slide
// toward the middle of the head by sin(yaw), and nothing changes at the side view.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mirrorAxes, slideAt } from "../../engine/renderer/accessories_more.js";
import { turnedHumanoid } from "../../engine/renderer/turnaround_draw.js";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const AX = { u: { x: 0, y: -1 }, f: { x: 1, y: 0 } };
const C = { x: 100, y: 50 };

test("mirrorAxes: one pass at the side view, a mirrored copy scaled by wrap first otherwise", () => {
  for (const [wrap, passes, mirrorF] of [[0, 1, null], [0.04, 1, null], [0.5, 2, -0.5], [1, 2, -1]]) {
    const out = mirrorAxes({ ...AX, wrap });
    assert.equal(out.length, passes, `wrap ${wrap}`);
    assert.deepEqual(out.at(-1), { u: AX.u, f: AX.f });
    if (mirrorF !== null) near(out[0].f.x, mirrorF);
  }
});

test("slideAt: a piece's forward offset shrinks by sin(yaw); none at the side view", () => {
  // Anchor at 180° (straight back), 1 radius: offset -r at the side, 0 from the front.
  for (const [wrap, dx] of [[0, 0], [1, 10], [Math.SQRT1_2, 10 * (1 - Math.SQRT1_2)]]) {
    const { c, ax } = slideAt(C, 10, { ...AX, wrap }, 180, 1);
    near(c.x, C.x + dx, 1e-6);
    near(c.y, C.y);
    assert.deepEqual(ax, { u: AX.u, f: AX.f });
  }
  near(slideAt(C, 10, { ...AX, wrap: 1 }, 90, 1).c.x, C.x, 1e-6); // a piece on top stays put
});

test("turnedHumanoid: wrap is |cos yaw| (0 side, 1 front and back)", () => {
  const j = Object.fromEntries(["head", "neckTop", "shoulder", "hip", "lElbow", "rElbow", "lHand", "rHand", "lKnee", "rKnee", "lFoot", "rFoot"].map((k, i) => [k, { x: i, y: i * 2 }]));
  const c = { j, facing: 1, scale: 1 };
  assert.equal(turnedHumanoid(c, 90, null), null);
  for (const [yaw, wrap] of [[0, 1], [45, Math.SQRT1_2], [135, Math.SQRT1_2], [180, 1]]) near(turnedHumanoid(c, yaw, null).wrap, wrap, 1e-9);
});
