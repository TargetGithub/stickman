import { test } from "node:test";
import assert from "node:assert/strict";
import { createActor, playMove, stepActor } from "../../engine/actor.js";
import { prepareCatalog } from "../../engine/moves.js";
import { lowestPoint } from "../../engine/skeleton.js";
import { catalog } from "../../data/index.js";

const DT = 1 / 60;
const moves = prepareCatalog(catalog.moves, catalog.poses);
const GROUND = 880;

function simulate(name, { scale = 1, facing = 1, frames, params } = {}) {
  const actor = createActor({ x: 1000, facing, scale, groundY: GROUND });
  playMove(actor, name, moves, { params });
  const def = moves.get(name);
  const n = frames ?? Math.ceil(def.duration * 60) + 30;
  const trace = [];
  for (let i = 0; i < n; i++) {
    const r = stepActor(actor, DT, moves);
    trace.push({ low: lowestPoint(r.joints, scale), x: actor.x, rootDy: actor.rootDy, hipY: r.joints.hip.y, events: r.events });
  }
  return { actor, trace };
}

test("grounded moves keep the body on the ground (no sinking, no floating)", () => {
  for (const name of ["idle", "walk", "run", "jab", "cross", "front_kick", "hit_light"]) {
    for (const scale of [0.6, 1, 2.2]) {
      const { trace } = simulate(name, { scale, frames: 150 });
      for (const [i, f] of trace.entries()) {
        assert.ok(f.low <= GROUND + 1e-6, `${name}@${scale} frame ${i}: sinks ${f.low - GROUND}px`);
        if (f.rootDy >= 0 && i > 8) {
          assert.ok(f.low >= GROUND - 12 * scale, `${name}@${scale} frame ${i}: floats ${GROUND - f.low}px`);
        }
      }
    }
  }
});

test("jump leaves the ground, rises by about its height, and lands", () => {
  const { trace } = simulate("jump");
  const highest = Math.min(...trace.map((f) => f.low));
  assert.ok(GROUND - highest > 120, `jump clearance ${GROUND - highest}px`);
  assert.ok(Math.abs(trace[trace.length - 1].low - GROUND) < 1, "back on the ground");
  assert.ok(trace.every((f) => f.low <= GROUND + 1e-6), "never below ground");
});

test("walking left moves left; root travel matches the stride", () => {
  const { actor } = simulate("walk", { facing: -1, params: { distance: 240 }, frames: 240 });
  assert.ok(Math.abs(actor.x - (1000 - 240)) < 1e-6, `x=${actor.x}`);
});

test("after a move ends the actor continues with the queue, then idle", () => {
  const actor = createActor({ x: 0 });
  playMove(actor, "jab", moves);
  playMove(actor, "cross", moves, { queue: true });
  const seen = [];
  for (let i = 0; i < 120; i++) {
    stepActor(actor, DT, moves);
    const name = actor.move?.def.name;
    if (seen[seen.length - 1] !== name) seen.push(name);
  }
  assert.deepEqual(seen, ["jab", "cross", "idle"]);
});

test("stepping is deterministic", () => {
  const a = simulate("front_kick").trace.map((f) => f.hipY);
  const b = simulate("front_kick").trace.map((f) => f.hipY);
  assert.deepEqual(a, b);
});
