// Baaaana task 7: crowd behaviours for extras (engine/renderer/crowd_moves.js) and their validation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { computeJoints, lowestPoint } from "../../engine/skeleton.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { crowdState, copyJoints, CROWD_BEHAVIORS } from "../../engine/renderer/crowd_moves.js";
import { EXTRA_MOVES, planExtras } from "../../engine/story/extras.js";
import { V2_ENUMS } from "../../engine/validator/v2_names.js";
import { STAGE } from "../../engine/config.js";

const member = (over = {}) => ({ id: "extra1", plan: "baaaana", scale: 0.8, x: 1000, dir: 1, phase: 0.3, rank: 0, lo: 600, hi: 1800, ...over });
const R = { sim: { store: { segments: [{ start: 0 }], length: 0, last: 0 } }, frameN: 0 };
const F = { segment: 0 };
const NO_HITS = { hits: [], defeats: [], first: null, center: 1200 };
const state = (e, t, reactions = NO_HITS) => crowdState(e, t, R, F, reactions);

test("crowd behaviours are validator names, and every move they use is prepared for extras", () => {
  for (const b of CROWD_BEHAVIORS) assert.ok(V2_ENUMS.extrasBehavior.includes(b), b);
  for (const m of ["dance_a", "dance_b", "jump_joy", "laugh", "lie_down", "run", "idle"]) assert.ok(EXTRA_MOVES.includes(m), m);
  assert.equal(crowdState(member({ behavior: "cheer" }), 1, R, F, NO_HITS), undefined, "S6 behaviours are left to extras.js");
});

const TABLE = [
  // [behaviour, extra fields, time, check]
  ["sync_dance", {}, 0.5, (s) => s.move === "dance_a" && s.facing === 1],
  ["sync_dance", {}, 2.5, (s) => s.move === "dance_b" && s.facing === -1],
  ["sync_dance", { at: 5 }, 1, (s) => s.move === "idle"],
  ["wave", { x: 600 }, 0.3, (s) => s.move === "jump_joy"],
  ["wave", { x: 1700 }, 0.3, (s) => s.move === "idle"],
  ["wave", { x: 1700 }, 1.4, (s) => s.move === "jump_joy"],
  ["pile_on", { at: 1, x: 700 }, 0.5, (s) => s.move === "idle"],
  ["pile_on", { at: 1, x: 700 }, 1.6, (s) => s.move === "run" && s.facing === 1],
  ["pile_on", { at: 1, x: 700 }, 5, (s) => s.move === "lie_down" && !s.lift],
  ["pile_on", { at: 1, x: 700, rank: 5 }, 5, (s) => s.move === "lie_down" && s.lift > 0],
  ["scatter_giggle", { at: 2 }, 1, (s) => s.move === "idle"],
  ["scatter_giggle", { at: 2 }, 2.4, (s) => s.move === "run" && s.facing === -1],
  ["scatter_giggle", { at: 2 }, 4, (s) => s.move === "laugh" && s.facing === 1 && s.x < 1000],
];
for (const [behavior, over, t, check] of TABLE) {
  test(`${behavior} ${JSON.stringify(over)} at ${t} s`, () => {
    const s = state(member({ behavior, ...over }), t);
    assert.ok(check(s), JSON.stringify(s));
  });
}

test("scatter_giggle without `at` waits for the first hit", () => {
  const e = member({ behavior: "scatter_giggle" });
  assert.equal(state(e, 3).move, "idle");
  assert.equal(state(e, 3, { ...NO_HITS, first: 2.8 }).move, "run");
});

test("copy_leader without leader frames stands idle", () => {
  assert.equal(state(member({ behavior: "copy_leader", leader: "kai" }), 2).move, "idle");
});

test("copyJoints moves a leader's pose onto a member: its x, its size, the leader's hop, mirrored on request", () => {
  const ld = bodyPlan(catalog, "baaaana_tall").dims;
  const md = bodyPlan(catalog, "baaaana").dims;
  const lead = { j: computeJoints({ rUA: 120 }, { x: 500, y: STAGE.groundY - 300 }, 1, 1, ld), scale: 1, dims: ld };
  lead.j = computeJoints({ rUA: 120 }, { x: 500, y: lead.j.hip.y + (STAGE.groundY - lowestPoint(lead.j, 1, ld)) - 40 }, 1, 1, ld); // 40 px up
  const e = member({ scale: 0.7 });
  const j = copyJoints(lead, e, md, { x: 1000, mirror: false });
  assert.ok(Math.abs(j.hip.x - 1000) < 1e-6);
  const lift = STAGE.groundY - lowestPoint(j, e.scale, md);
  assert.ok(lift > 10 && lift < 40, `hop copied smaller (${lift})`);
  assert.ok(j.rHand.x > j.hip.x);
  const m = copyJoints(lead, e, md, { x: 1000, mirror: true });
  assert.ok(m.rHand.x < m.hip.x, "mirrored");
});

test("planExtras gives each member its rank and carries leader, at and bpm", () => {
  const xs = planExtras({ id: "s", extras: [{ count: 5, behavior: "conga", leader: "kai", at: 2, bpm: 100, crowd: "baaaana_crowd" }] }, null, catalog, 1);
  assert.deepEqual(xs.map((e) => e.rank), [0, 1, 2, 3, 4]);
  assert.ok(xs.every((e) => e.leader === "kai" && e.at === 2 && e.bpm === 100));
});
