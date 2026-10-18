// A dog in a story (package A1, ADR-020): fetch, mouth grip, paired moves with people, macros and camera.
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../../engine/sim.js";
import { validate } from "../../engine/index.js";
import { propTransform } from "../../engine/props.js";
import { computeJoints } from "../../engine/skeleton.js";
import { mouthOf } from "../../engine/skeleton_quad.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { storyFraming } from "../../engine/camera_story.js";
import { bounds, fitZoom } from "../../engine/camera.js";
import { collectAudioEvents } from "../../engine/audio_events.js";
import { catalog } from "../../catalog/index.js";

const CAST = {
  doopi: { id: "doopi", color: "#5ec8ff" },
  becky: { id: "becky", body: "dog_small", color: "#f3e3c3", voice: { pitch: 1.4, timbre: "bark" } },
  tony: { id: "tony", body: "kid", scale: 0.8, color: "#5b3fa8" },
};

function story(beats, placed = [["doopi", 1200, 1], ["becky", 1450, -1]]) {
  return {
    version: 2, meta: { title: "dog", format: "landscape", seed: 21, kind: "clip", audience: "kids" },
    cast: placed.map(([id]) => CAST[id]),
    locations: [{ id: "park", theme: "city_park", stageWidth: 3600 }],
    scenes: [{ id: "s", location: "park", cast: placed.map(([id, x, facing, hidden]) => ({ id, x, facing, ...(hidden ? { hidden } : {}) })), beats }],
  };
}
function run(beats, placed) {
  const sim = simulate(story(beats, placed), catalog, { dryRun: true });
  return { sim, ev: (type, what) => sim.events.filter((e) => e.type === type && (!what || e.what === what)), errors: sim.issues.filter((i) => !i.code.startsWith("W_")) };
}
const codes = (s) => validate(s, catalog).errors.map((e) => e.code);

test("fetch: each throw launches the ball, the dog catches it and brings it back, then it ends", () => {
  const r = run([{ id: "act", at: 0.3, who: "world", do: "activity", params: { name: "fetch", with: ["doopi", "becky"], reps: 3 } }]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ev("object", "launch").length, 3);
  assert.equal(r.ev("object", "catch").length, 3);
  const end = r.sim.anchors.find((a) => a.beatId === "act" && a.anchor === "end");
  assert.ok(end && end.t < 40, `ended at ${end?.t}`);
});

test("fetch: the dog plays its own moves through the move map", () => {
  const r = run([{ id: "act", at: 0.3, who: "world", do: "activity", params: { name: "fetch", with: ["doopi", "becky"], reps: 1 } }]);
  const played = new Set(r.sim.events.filter((e) => (e.type === "moveEnd" || e.type === "moveEvent") && e.actor === "becky").map((e) => e.move));
  for (const m of ["catch_mouth", "drop_ball"]) assert.ok(played.has(m), `${m} in ${[...played]}`);
  assert.ok(played.has("run_dog") || played.has("walk_dog"), `travel in ${[...played]}`);
  assert.ok(![...played].some((m) => ["run", "walk", "catch_ball"].includes(m)), `a humanoid move in ${[...played]}`);
});

const PAIRS = [
  ["pet_dog", "doopi", "becky"], ["hug_dog", "doopi", "becky"], ["lick", "becky", "doopi"], ["carry", "doopi", "becky"],
];
for (const [move, who, partner] of PAIRS) {
  test(`paired with a dog: ${move} runs without errors`, () => {
    const r = run([{ id: "p", at: 0.3, who, do: move, partner }]);
    assert.deepEqual(r.errors.map((e) => e.code), []);
  });
}

const RULES = [
  ["pat_head with a dog partner points to pet_dog", [{ id: "p", at: 0.3, who: "doopi", do: "pat_head", partner: "becky" }], ["E_MOVE_RIG"]],
  ["a person can't be the partner of pet_dog", [{ id: "p", at: 0.3, who: "doopi", do: "pet_dog", partner: "becky" }], []],
  ["@chase with a dog chaser catches without an attack", [{ id: "c", at: 0.3, macro: "chase", params: { runner: "tony", chasers: ["becky"], dur: 4, caught: true } }], []],
  ["@walk_together with a dog walks side by side", [{ id: "w", at: 0.3, macro: "walk_together", params: { who: ["doopi", "becky"], to: { x: 1900 } } }], []],
  ["@dialogue lines for a dog bark", [{ id: "d", at: 0.3, macro: "dialogue", params: { lines: [["doopi", "Ready?"], ["becky", "Woof!"]] } }], []],
];
for (const [name, beats, want] of RULES) {
  test(`dog rules: ${name}`, () => {
    const placed = [["doopi", 1200, 1], ["becky", 1450, -1], ["tony", 1900, -1]];
    assert.deepEqual(codes(story(beats, placed)), want);
  });
}

test("the dog's dialogue plays bark syllables", () => {
  const sim = simulate(story([{ id: "d", at: 0.3, macro: "dialogue", params: { lines: [["becky", "Woof woof!"]] } }]), catalog);
  const barks = collectAudioEvents(sim).filter((a) => a.sfx.startsWith("voice:bark:"));
  assert.ok(barks.length >= 2, `${barks.length} bark syllables`);
});

test("mouth grip: a held prop sits at the snout, along it", () => {
  const plan = bodyPlan(catalog, "dog_small");
  const j = computeJoints({}, { x: 1000, y: 800 }, 1, 1, plan.dims);
  const m = mouthOf(j, 1, 1, plan.grip);
  assert.ok(m.point.x > j.head.x, "the mouth is in front of the head");
  const t = propTransform(j, { grip: "rHand", len: 40, gripAt: 0.5 }, 0, 1, 1, plan.grip);
  assert.deepEqual(t.grip, m.point);
});

test("camera: a dog's close-up frames the whole animal, centred on it", () => {
  const plan = bodyPlan(catalog, "dog_small");
  const j = computeJoints({}, { x: 1000, y: 800 }, 1, 1, plan.dims);
  const dog = { id: "becky", x: 1000, scale: 1, joints: j, dims: plan.dims };
  const f = storyFraming({ W: 1920, H: 1080, stageWidth: 3600 }, [dog], { mode: "close_up", target: "becky" }, { bounds, fitZoom });
  assert.ok(f.y > j.head.y && f.y < Math.max(j.lFoot.y, j.rFoot.y), "centre between the head and the paws");
  assert.ok(f.x > j.hip.x && f.x < j.head.x, "centre along the body");
});
