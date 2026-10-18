// Quadruped rig (STORY_SPEC 6.2, ADR-020): forward kinematics, the dog_small plan, its drawing and its moves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeJoints, lowestPoint, BODY } from "../../engine/skeleton.js";
import { computeJointsQuad, NECK_REST } from "../../engine/skeleton_quad.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { drawCharacter } from "../../engine/renderer/character.js";
import { JOINT_ORDER } from "../../engine/types.js";
import { createActor, playMove, stepActor } from "../../engine/actor.js";
import { prepareCatalog, resolveMove, rigAccepts, isIdleMove } from "../../engine/moves.js";
import { holdableProps } from "../../engine/objects.js";
import { validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const dog = bodyPlan(catalog, "dog_small");
const D = dog.dims;
const ROOT = { x: 1000, y: 500 };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const J = (pose, facing = 1, scale = 1) => computeJoints(pose, ROOT, facing, scale, D);

const FK = [
  ["rest: the spine runs forward, level", () => {
    const j = J({});
    assert.ok(near(j.shoulder.x - j.hip.x, D.torso) && near(j.shoulder.y, j.hip.y));
  }],
  ["rest: legs hang straight down from the shoulders and the rear hip", () => {
    const j = J({});
    assert.ok(near(j.rHand.x, j.shoulder.x) && near(j.rHand.y - j.shoulder.y, D.upperArm + D.forearm));
    assert.ok(near(j.lFoot.x, j.hip.x) && near(j.lFoot.y - j.hip.y, D.thigh + D.shin));
  }],
  ["rest: the neck rises forward at NECK_REST above the spine", () => {
    const j = J({});
    const a = (Math.atan2(j.shoulder.y - j.neckTop.y, j.neckTop.x - j.shoulder.x) * 180) / Math.PI;
    assert.ok(near(a, NECK_REST, 1e-6), String(a));
  }],
  ["facing -1 mirrors every joint around the root", () => {
    const pose = { lean: 12, head: -20, lUA: 30, lFA: 20, rTH: 15, rSH: 40 };
    const a = J(pose, 1);
    const b = J(pose, -1);
    for (const n of JOINT_ORDER) assert.ok(near(a[n].x - ROOT.x, ROOT.x - b[n].x) && near(a[n].y, b[n].y), n);
  }],
  ["lean 90 stands the spine up (the front above the rear hip)", () => {
    const j = J({ lean: 90 });
    assert.ok(near(j.shoulder.x, j.hip.x) && near(j.hip.y - j.shoulder.y, D.torso));
  }],
  ["positive head lowers the head (sniff), negative raises it (bark)", () => {
    assert.ok(J({ head: 40 }).head.y > J({}).head.y);
    assert.ok(J({ head: -30 }).head.y < J({}).head.y);
  }],
  ["legs turn with the spine: lean 30 with lUA -30 keeps the front leg straight down", () => {
    const j = J({ lean: 30, lUA: -30 });
    assert.ok(near(j.lElbow.x, j.shoulder.x) && near(j.lHand.x, j.shoulder.x));
  }],
  ["positive lower bends move the paw back", () => {
    assert.ok(J({ rFA: 40 }).rHand.x < J({}).rHand.x);
    assert.ok(J({ rSH: 40 }).rFoot.x < J({}).rFoot.x);
  }],
  ["scale multiplies every length", () => {
    const a = J({ lean: 10, lTH: 20 }, 1, 1);
    const b = J({ lean: 10, lTH: 20 }, 1, 2);
    for (const n of JOINT_ORDER) assert.ok(near(b[n].x - ROOT.x, 2 * (a[n].x - ROOT.x)) && near(b[n].y - ROOT.y, 2 * (a[n].y - ROOT.y)), n);
  }],
  ["rot turns the body round the mid spine", () => {
    const a = J({});
    const b = J({ rot: 180 });
    assert.ok(near(b.center.x, a.center.x) && near(b.center.y, a.center.y));
    assert.ok(near(b.shoulder.x - b.center.x, a.center.x - a.shoulder.x));
  }],
  ["dx and dy offset the root", () => {
    const a = J({});
    const b = J({ dx: 10, dy: -5 });
    assert.ok(near(b.hip.x - a.hip.x, 10) && near(b.hip.y - a.hip.y, -5));
  }],
  ["ground contact: the paws are the lowest point at rest", () => {
    const j = J({});
    assert.ok(near(lowestPoint(j, 1, D), j.hip.y + D.thigh + D.shin));
  }],
];
for (const [name, fn] of FK) test(`quadruped FK: ${name}`, fn);

const PLAN = [
  ["computeJoints dispatches on the rig", () => assert.deepEqual(J({ lean: 5 }), computeJointsQuad({ lean: 5 }, ROOT, 1, 1, D))],
  ["humanoid dims never take the quadruped path", () => assert.notEqual(computeJoints({}, ROOT, 1, 1, BODY).shoulder.y, ROOT.y)],
  ["dog_small: rig quadruped, root motion not rescaled", () => {
    assert.equal(D.rig, "quadruped");
    assert.equal(dog.stride, 1);
    assert.equal(dog.plan, "dog_small");
  }],
  ["dog_small: the back sits at about a stickman's knee", () => {
    const back = D.thigh + D.shin + catalog.bodies.dog_small.bodyWidth;
    assert.ok(Math.abs(back - BODY.shin) <= 6, `back at ${back}px, knee at ${BODY.shin}px`);
  }],
  ["the plan's look lists ears, tail and collar", () => {
    const q = catalog.bodies.dog_small.quad;
    assert.ok(q.ears && q.tail && q.collar);
  }],
];
for (const [name, fn] of PLAN) test(`quadruped plan: ${name}`, fn);

/** A canvas stand-in that records whether any drawing call got a non-finite number. */
function probeCtx() {
  const bad = [];
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key === "bad") return bad;
      if (key in target) return target[key];
      return (...args) => { if (args.some((v) => typeof v === "number" && !Number.isFinite(v))) bad.push(String(key)); };
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
  return ctx;
}

test("quadruped drawing: every face, both facings, still and running, without non-finite numbers", () => {
  const plan = catalog.bodies.dog_small;
  for (const faceName of Object.keys(catalog.faces)) {
    for (const facing of [1, -1]) {
      for (const prevDx of [0, 9]) {
        const j = computeJoints({ lean: 8, head: -10, lUA: 20, rTH: -15 }, ROOT, facing, 1.4, D);
        const ctx = probeCtx();
        drawCharacter(ctx, j, {
          color: "#f3e3c3", scale: 1.4, facing, dims: D, draw: plan.draw, quad: plan.quad, look: { eyes: "big" },
          face: catalog.faces[faceName], faceOpts: { t: 1.2, detail: "full" }, faceName, id: "becky", time: 1.2,
          prevHip: { x: j.hip.x - prevDx, y: j.hip.y }, prevHead: { x: j.head.x, y: j.head.y - 2 },
        });
        assert.deepEqual(ctx.bad, [], `${faceName} facing ${facing}`);
      }
    }
  }
});

// ---------- moves for the rig: the move map, rig checks, a dog story (A1.3-A1.4) ----------

const MOVES = prepareCatalog(catalog.moves, catalog.poses, holdableProps(catalog));
const becky = () => Object.assign(createActor({ id: "becky", x: 1000, facing: 1, groundY: 880 }), bodyPlan(catalog, "dog_small"));

const MAP = [
  ["walk", "walk_dog"], ["run", "run_dog"], ["idle", "idle_dog"], ["sit", "sit_dog"], ["wave", "wag"], ["talk", "bark"],
  ["hit_light", "yelp"], ["faint", "faint_dog"], ["bark", "bark"], ["wait", "wait"],
];
for (const [name, want] of MAP) test(`move map: ${name} on a dog plays ${want}`, () => assert.equal(resolveMove(MOVES, becky(), name).name, want));

const RIG = [
  ["humanoid moves stay humanoid", () => assert.equal(MOVES.get("jab").rig, "humanoid")],
  ["dog moves are quadruped", () => assert.equal(MOVES.get("walk_dog").rig, "quadruped")],
  ["wait and face play on every rig", () => assert.ok(rigAccepts(MOVES.get("wait"), "quadruped") && rigAccepts(MOVES.get("face"), "humanoid"))],
  ["a stickman's walk is the humanoid walk", () => assert.equal(resolveMove(MOVES, { moveMap: null }, "walk").name, "walk")],
  ["idle_dog counts as idle (free for the next beat)", () => assert.ok(isIdleMove(MOVES.get("idle_dog")) && isIdleMove(MOVES.get("idle")))],
  ["dog walk and run match the humanoid speeds (120 and 550 px/s)", () => {
    const speed = (n) => MOVES.get(n).params.stride / MOVES.get(n).duration;
    assert.ok(near(speed("walk_dog"), speed("walk"), 1e-9) && near(speed("run_dog"), speed("run"), 1e-9));
  }],
];
for (const [name, fn] of RIG) test(`rig moves: ${name}`, fn);

test("every dog move on dog_small: finite joints, never below the floor, paws down when it settles", () => {
  for (const def of MOVES.values()) {
    if (def.rig !== "quadruped") continue;
    const a = becky();
    playMove(a, def.name, MOVES);
    let j;
    for (let i = 0; i < Math.ceil(def.duration * 60) + 40; i++) {
      j = stepActor(a, 1 / 60, MOVES).joints;
      for (const p of Object.values(j)) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${def.name}: NaN`);
      assert.ok(lowestPoint(j, 1, a.dims) <= 880 + 1.5, `${def.name}: below the floor`);
    }
    if (!def.flags.hold && !def.flags.loop) assert.ok(Math.abs(lowestPoint(j, 1, a.dims) - 880) < 1.5, `${def.name}: paws off the floor after it ends`);
  }
});

test("a dog story with generic moves validates and walks with walk_dog", () => {
  const story = {
    version: 2, meta: { title: "Becky", format: "landscape", seed: 7, kind: "clip", audience: "kids" },
    cast: [{ id: "doopi", color: "#3fb8ff" }, { id: "becky", body: "dog_small", color: "#f3e3c3" }],
    locations: [{ id: "park", theme: "city_park" }],
    scenes: [{ id: "one", location: "park", cast: [{ id: "doopi", x: 1300, facing: 1 }, { id: "becky", x: 1500, facing: -1 }], beats: [
      { id: "b1", at: 0.3, who: "becky", do: "bark", params: { cycles: 2 } },
      { id: "w1", at: { after: "b1" }, who: "becky", do: "walk", to: { x: 1900 } },
      { id: "s1", at: { after: "w1" }, who: "becky", do: "sit" },
      { id: "d1", at: 0.5, who: "doopi", do: "wave" },
    ] }],
  };
  const r = validate(story, catalog);
  assert.deepEqual(r.errors.map((e) => `${e.code} ${e.path}`), []);
});
