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

test("limitYaw: turns toward the camera stop at maxTurn from profile (default 60); turns away are free", async () => {
  const { limitYaw, walkYaw } = await import("../../engine/turnaround.js");
  for (const [yaw, max, want] of [[0, undefined, 30], [180, undefined, 180], [50, undefined, 50], [0, 90, 0], [0, 0, 90], [150, 0, 150]]) assert.equal(limitYaw(yaw, max), want, `${yaw} at ${max}`);
  for (const [dx, dz, want] of [[100, 0, 90], [100, 100, 45], [-100, 100, 45], [100, -100, 135], [0, 50, 0]]) near(walkYaw(dx, dz), want, 1e-9);
});

test("a walk in depth turns the walker along its path: toward the camera, then away", async () => {
  const { simulate } = await import("../../engine/sim.js");
  const { sceneViews } = await import("../../engine/renderer/scene_views.js");
  const { catalog } = await import("../../catalog/index.js");
  const { yawAt, limitYaw } = await import("../../engine/turnaround.js");
  const script = { version: 3, meta: { title: "walk", format: "landscape", seed: 3, kind: "clip", audience: "kids" }, cast: [{ id: "a", name: "A", body: "kid", color: "#3fd8ff" }],
    locations: [{ id: "p", theme: "city_park" }],
    scenes: [{ id: "s", location: "p", cast: [{ id: "a", x: 1400, z: -600 }], beats: [{ id: "come", at: 0.5, who: "a", do: "walk", to: { z: 200 } }, { id: "go", at: { after: "come", delay: 0.5 }, who: "a", do: "walk", to: { z: -600 } }] }] };
  const sim = simulate(script, catalog);
  const sv = sceneViews(sim, catalog)[0];
  const tr = sv.viewTracks.get("a");
  assert.equal(tr.hints.length, 2);
  const [come, go] = tr.hints;
  assert.ok(come.yaw < 30 && go.yaw > 150, `toward ${come.yaw}, away ${go.yaw}`);
  assert.equal(sv.maxTurn, 60);
  const mid = (h) => (h.t0 + h.t1) / 2;
  assert.equal(limitYaw(yawAt(tr, mid(come)), sv.maxTurn), 30, "toward the camera: a near-front three-quarter");
  assert.ok(Math.abs(yawAt(tr, mid(go)) - go.yaw) < 1e-6, "away: not capped");
  assert.equal(yawAt(tr, 0.2), 90, "standing: profile");
});

test("bodyYaw: maxTurn caps humanoids; a four-legged character turns fully to its own front drawing", async () => {
  const { bodyYaw } = await import("../../engine/turnaround.js");
  const cases = [
    // [yaw, quad, maxTurn, drawn]
    [0, false, undefined, 30],
    [0, true, undefined, 0],
    [0, true, 60, 0],
    [45, false, 30, 60],
    [45, true, 30, 45],
    [180, false, undefined, 180],
    [90, true, undefined, 90],
  ];
  for (const [yaw, quad, max, want] of cases) assert.equal(bodyYaw(yaw, quad, max), want, `${yaw} quad=${quad} max=${max}`);
});
