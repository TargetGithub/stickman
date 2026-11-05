// Toon eye gaze (runtime/gaze.js): idle glances are deterministic, held and darted between, about half straight
// ahead; a gaze prop replaces them; a look leads the eyes its way; everything stays in range. Pure, Node only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GAZE_RANGE, GLANCE, gazeOffset, glance } from "../../runtime/gaze.js";

const near = (a, b, eps, what = "") => assert.ok(Math.abs(a - b) < eps, `${what} ${a} != ${b}`);
const inRange = ([x, y]) => Math.abs(x) <= GAZE_RANGE.x + 1e-12 && Math.abs(y) <= GAZE_RANGE.y + 1e-12;

test("glance: the same id and number give the same target; about half look straight ahead", () => {
  assert.deepEqual(glance("bao", 7), glance("bao", 7));
  let ahead = 0;
  for (let n = 0; n < 400; n++) {
    const [x, y] = glance("bao", n);
    assert.ok(Math.abs(x) <= 0.6 && Math.abs(y) <= 0.5, `glance ${n}`);
    if (x === 0 && y === 0) ahead++;
  }
  assert.ok(ahead > 120 && ahead < 200, `${ahead} of 400 straight ahead`);
  assert.notDeepEqual([0, 1, 2, 3, 4, 5].map((n) => glance("a", n)), [0, 1, 2, 3, 4, 5].map((n) => glance("b", n)), "each critter its own pattern");
});

test("idle gaze: deterministic, in range, moves over time but holds still between darts", () => {
  const seen = new Set();
  for (let t = 0; t < 20; t += 0.05) {
    const g = gazeOffset("bao", t);
    assert.deepEqual(g, gazeOffset("bao", t), `t ${t}`);
    assert.ok(inRange(g), `t ${t}: ${g}`);
    seen.add(g.map((v) => v.toFixed(3)).join());
  }
  assert.ok(seen.size > 5, "the eyes go somewhere");
  // Late in a hold (past the dart) two nearby times agree.
  let still = 0;
  for (let t = 0; t < 20; t += 0.37) {
    const a = gazeOffset("bao", t), b = gazeOffset("bao", t + 0.01);
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9) still++;
  }
  assert.ok(still > 30, `${still} of ~54 samples were held`);
  assert.ok(GLANCE.dart < GLANCE.hold / 5, "darts are quick next to holds");
});

test("a gaze prop replaces the glances, scaled to the range and clamped", () => {
  for (const [g, want] of [[[1, 0], [GAZE_RANGE.x, 0]], [[-1, 1], [-GAZE_RANGE.x, GAZE_RANGE.y]], [[0, 0], [0, 0]], [[3, -3], [GAZE_RANGE.x, -GAZE_RANGE.y]], [[0.5, -0.5], [GAZE_RANGE.x / 2, -GAZE_RANGE.y / 2]]]) {
    const [x, y] = gazeOffset("bao", 4.2, { gaze: g });
    near(x, want[0], 1e-12, `${g} x`);
    near(y, want[1], 1e-12, `${g} y`);
  }
});

test("a look leads the eyes: yaw + to the critter's left, pitch + down", () => {
  for (const [look, sx, sy] of [[[30, 0], 1, 0], [[-30, 0], -1, 0], [[0, 15], 0, -1], [[0, -15], 0, 1]]) {
    const [x, y] = gazeOffset("bao", 1, { gaze: [0, 0], look });
    if (sx) assert.equal(Math.sign(x), sx, `look ${look} x`);
    else near(x, 0, 1e-12);
    if (sy) assert.equal(Math.sign(y), sy, `look ${look} y`);
    else near(y, 0, 1e-12);
  }
  assert.ok(inRange(gazeOffset("bao", 1, { look: [90, -40] })), "clamped");
});
