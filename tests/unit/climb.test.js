// Baaaana task 10b: platforms, climbing up and down, jumping down (engine/story/climb.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../../engine/sim.js";
import { validate } from "../../engine/validator/index.js";
import { frameView } from "../../engine/framestore.js";
import { unpackJoints, lowestPoint } from "../../engine/skeleton.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { catalog } from "../../catalog/index.js";
import { STAGE, FPS } from "../../engine/config.js";

function run(beats, { set = [{ id: "wall", object: "garden_wall", x: 1300 }, { id: "tower", object: "lookout_tower", x: 2100 }, { id: "bench1", object: "bench", x: 600 }] } = {}) {
  const script = {
    version: 2, meta: { title: "a", format: "landscape", seed: 3, kind: "clip", audience: "kids" },
    cast: [{ id: "bn", body: "baaaana", color: "#7fe8c4" }],
    locations: [{ id: "park", theme: "city_park", stageWidth: 3200, set }],
    scenes: [{ id: "s", location: "park", cast: [{ id: "bn", x: 900 }], beats }],
  };
  const sim = simulate(script, catalog, { dryRun: false });
  const checked = validate(script, catalog);
  const dims = bodyPlan(catalog, "baaaana").dims;
  // Height of the feet above the floor and the hip x, at a beat's end anchor (or the last frame).
  const at = (beatId) => {
    const a = sim.anchors.find((x) => x.beatId === beatId && x.anchor === "end");
    const n = Math.min(sim.store.length - 1, Math.round((a ? a.t : sim.durationSec) * FPS) + 2);
    const c = frameView(sim.store, n, FPS).chars[0];
    const j = unpackJoints(c.joints);
    return { lift: STAGE.groundY - lowestPoint(j, 1, dims), x: j.hip.x };
  };
  return { sim, at, checked, errors: sim.issues.filter((i) => !i.code.startsWith("W_")) };
}

const TOP = (o) => catalog.objects[o].top;

test("the platform objects are in the catalog with a top and a way up", () => {
  for (const o of ["garden_wall", "lookout_tower"]) assert.ok(catalog.objects[o].behavior === "platform" && TOP(o) > 0 && typeof catalog.objects[o].climbAt === "number", o);
});

const TABLE = [
  // [what, beats, beat to check, expected lift (fn of tops), x check]
  ["climbing the wall ends standing on its top", [{ id: "c", at: 0.3, who: "bn", do: "climb_up", object: "wall" }], "c", () => TOP("garden_wall")],
  ["climbing the tower ends on its deck", [{ id: "c", at: 0.3, who: "bn", do: "climb_up", object: "tower" }], "c", () => TOP("lookout_tower")],
  ["climbing down brings it back to the floor", [{ id: "c", at: 0.3, who: "bn", do: "climb_up", object: "tower" }, { id: "d", at: { after: "c" }, who: "bn", do: "climb_down", object: "tower" }], "d", () => 0],
  ["jumping down lands on the floor", [{ id: "c", at: 0.3, who: "bn", do: "climb_up", object: "wall" }, { id: "j", at: { after: "c" }, who: "bn", do: "jump_down" }], "j", () => 0],
  ["a jump down on the floor stays on the floor", [{ id: "j", at: 0.3, who: "bn", do: "jump_down" }], "j", () => 0],
];
for (const [what, beats, id, lift] of TABLE) {
  test(what, () => {
    const r = run(beats);
    assert.deepEqual(r.errors, [], JSON.stringify(r.errors));
    const got = r.at(id).lift;
    assert.ok(Math.abs(got - lift()) < 12, `feet ${got.toFixed(1)} px up, want ${lift()}`);
  });
}

test("walking on a wall stays on its deck", () => {
  const r = run([{ id: "c", at: 0.3, who: "bn", do: "climb_up", object: "wall" }, { id: "w", at: { after: "c" }, who: "bn", do: "walk", to: { x: 2400 } }]);
  const s = r.at("w");
  const deck = catalog.objects.garden_wall.deck;
  assert.ok(s.x <= 1300 + deck[1] + 1, `hip at ${s.x}`);
  assert.ok(Math.abs(s.lift - TOP("garden_wall")) < 12);
});

test("jumping down from a height lands with a land event", () => {
  const r = run([{ id: "c", at: 0.3, who: "bn", do: "climb_up", object: "wall" }, { id: "j", at: { after: "c" }, who: "bn", do: "jump_down" }]);
  assert.ok(r.sim.events.some((e) => e.type === "land" && e.actor === "bn"));
});

test("climbing something that is not a platform is E_OBJECT_STATE", () => {
  const r = run([{ id: "c", at: 0.3, who: "bn", do: "climb_up", object: "bench1" }]);
  assert.deepEqual(r.checked.errors.map((e) => e.code), ["E_OBJECT_STATE"]);
});
