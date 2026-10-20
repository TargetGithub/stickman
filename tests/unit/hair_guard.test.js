// Hair kept off the face in turned views (hair_guard.js, ENGINE_V3_SPEC 5.4 V3.9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { faceBox, hairlineAt, guardOutline, BROW, FACE_HALF, TEMPLE_SLOPE } from "../../engine/renderer/hair_guard.js";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("faceBox: none at the side view or from behind; the face centre slides to the middle as the head turns", () => {
  for (const [ax, mid] of [[{ wrap: 0 }, null], [{ wrap: 0.04 }, null], [{ wrap: 1, back: true }, null], [{ wrap: 1 }, 0], [{ wrap: 0.5 }, 0.155]]) {
    const box = faceBox(ax);
    if (mid === null) assert.equal(box, null, JSON.stringify(ax));
    else near(box.mid, mid);
  }
});

test("hairlineAt: flat at the brow across the face, sloping down at the temples", () => {
  const box = faceBox({ wrap: 1 });
  for (const [fr, want] of [[0, BROW], [FACE_HALF, BROW], [-FACE_HALF, BROW], [FACE_HALF + 0.2, BROW - 0.2 * TEMPLE_SLOPE], [-FACE_HALF - 0.4, BROW - 0.4 * TEMPLE_SLOPE]]) near(hairlineAt(box, fr), want);
});

test("guardOutline: untouched without a box; with one, nothing below the hairline, points above kept", () => {
  const tri = [[-0.7, -0.3], [0.3, 0.7], [0.9, 0.9]];
  assert.equal(guardOutline(tri, 1, null), tri);
  const box = faceBox({ wrap: 1 });
  for (const s of [1, -1, -0.5]) {
    const out = guardOutline(tri, s, box);
    assert.ok(out.length > tri.length, "long edges are split");
    for (const [fa, ua] of out) assert.ok(ua >= hairlineAt(box, fa * s) - 1e-12, `${fa},${ua} at s ${s}`);
    assert.deepEqual(out.find(([fa]) => fa === 0.9), [0.9, 0.9]);
  }
});
