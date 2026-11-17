import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Channel, evaluateCast, expand, frameShot } from "../expand.js";
import { nearestAngle } from "../moves.js";
import { validate } from "../validate.js";

const catalog = JSON.parse(readFileSync(new URL("../catalog/kids.json", import.meta.url), "utf8"));
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const near = (a, b, eps = 1e-6) => a.forEach((x, i) => close(x, b[i], eps));

/** One member doing one block, sampled at a few times. */
function run(member, blocks, extra = {}) {
  const doc = {
    format: "lottie3d", version: "0.2", duration: 10, fps: 30, stage: "garden",
    cast: [member, { id: "other", kind: "critter", name: "dog", at: [3, 0] }],
    timeline: blocks.map((b) => ({ who: member.id, ...b })),
    ...extra,
  };
  const v = validate(doc, { catalog });
  assert.deepEqual(v.errors, [], "test document must be valid");
  const r = expand(doc, catalog);
  return { r, at: (t) => evaluateCast(r, t, catalog).cast[0] };
}

const duck = { id: "d", kind: "critter", name: "duck", at: [0, 0] };
const kid = { id: "k", kind: "rig", name: "stick", at: [0, 0] };
const robo = { id: "r", kind: "character", name: "robot", at: [0, 0] };

const cases = [
  ["hop rises to its height mid-hop and lands", duck, [{ at: 1, do: "hop", dur: 1, with: { height: 0.8 } }], (at) => {
    close(at(1.5).position[1], 0.8);
    close(at(2).position[1], 0);
  }],
  ["two hops peak twice", duck, [{ at: 0, do: "hop", dur: 2, with: { times: 2 } }], (at) => {
    close(at(0.5).position[1], 0.5);
    close(at(1).position[1], 0);
    close(at(1.5).position[1], 0.5);
  }],
  ["spin turns a whole turn", duck, [{ at: 0, do: "spin", dur: 1 }], (at) => {
    close(at(0.5).rotation[1], 180);
    close(at(1).rotation[1], 360);
  }],
  ["wiggle settles back", duck, [{ at: 0, do: "wiggle", dur: 1 }], (at) => {
    assert.ok(Math.abs(at(1 / 6).rotation[2]) > 5);
    close(at(1).rotation[2], 0);
  }],
  ["nod comes back up", duck, [{ at: 0, do: "nod", dur: 1, with: { times: 1, amount: 20 } }], (at) => {
    close(at(0.5).rotation[0], 20);
    close(at(1).rotation[0], 0);
  }],
  ["show as the first move starts hidden", duck, [{ at: 1, do: "show", dur: 0.5 }], (at) => {
    near(at(0.5).scale, [0, 0, 0]);
    near(at(1.5).scale, [1, 1, 1]);
  }],
  ["hide shrinks to nothing and stays hidden", duck, [{ at: 0, do: "hide", dur: 0.4 }], (at) => {
    near(at(3).scale, [0, 0, 0]);
  }],
  ["grow keeps its new size", duck, [{ at: 0, do: "grow", dur: 0.5, with: { to: 2 } }], (at) => {
    near(at(4).scale, [2, 2, 2]);
  }],
  ["walk_to turns toward the goal and arrives", duck, [{ at: 0, do: "walk_to", dur: 2, with: { to: [2, 0] } }], (at) => {
    close(at(1).rotation[1], 90);
    near(at(2).position, [2, 0, 0]);
    near(at(5).position, [2, 0, 0]);
  }],
  ["leap arcs to the goal", duck, [{ at: 0, do: "leap", dur: 1, with: { to: [0, 2], height: 1 } }], (at) => {
    assert.ok(at(0.6).position[1] > 0.8);
    near(at(1).position, [0, 0, 2]);
  }],
  ["roll moves forward and turns whole turns", { ...duck, name: "ball", kind: "prop" }, [{ at: 0, do: "roll", dur: 1, with: { distance: 2 } }], (at) => {
    near(at(1).position, [0, 0, 2]);
    close(at(1).rotation[0] % 360, 0);
    assert.ok(at(1).rotation[0] >= 360);
  }],
  ["turn takes the short way", { ...duck, facing: 170 }, [{ at: 0, do: "turn", dur: 1, with: { to: -170 } }], (at) => {
    close(at(1).rotation[1], 190);
  }],
  ["look_at faces another member", duck, [{ at: 0, do: "look_at", dur: 0.5, with: { target: "other" } }], (at) => {
    close(at(1).rotation[1], 90);
  }],
  ["sleep shuts the eyes, wake opens them", duck, [{ at: 0, do: "sleep", dur: 1 }, { at: 2, do: "wake", dur: 0.6 }], (at) => {
    close(at(1.5).eyes, 0);
    close(at(3).eyes, 1);
    close(at(3).rotation[0], 0);
  }],
  ["wave on a rig raises the right arm and lowers it", kid, [{ at: 0, do: "wave", dur: 2 }], (at) => {
    close(at(1).joints.shoulderR[2], -155);
    near(at(2.5).joints.shoulderR, [0, 0, 0]);
  }],
  ["pose holds the saved joints", kid, [{ at: 0, do: "pose", dur: 2, with: { name: "star" } }], (at) => {
    near(at(1).joints.shoulderL, [0, 0, 150]);
    near(at(3).joints.shoulderL, [0, 0, 0]);
  }, { poses: { star: { joints: { shoulderL: [0, 0, 150] } } } }],
  ["wave on a glTF character plays its Wave clip", robo, [{ at: 1, do: "wave", dur: 2 }], (at) => {
    assert.equal(at(2).clip.name, "Wave");
    close(at(2).clip.time, 1);
    assert.equal(at(4).clip.name, "Idle");
  }],
  ["walk_to on a glTF character plays Walking", robo, [{ at: 0, do: "walk_to", dur: 2, with: { to: [0, 2] } }], (at) => {
    assert.equal(at(1).clip.name, "Walking");
  }],
];

for (const [name, member, blocks, check, extra] of cases) {
  test(`move: ${name}`, () => check(run(member, blocks, extra).at));
}

test("say and sound become timed events", () => {
  const { r } = run(duck, [{ at: 1, do: "say", dur: 2, with: { words: ["hello", "friend"] } }, { at: 4, do: "sound", dur: 1 }]);
  assert.deepEqual(r.events.map((e) => [e.t, e.type, e.text]), [[1, "say", "hello friend"], [4, "sound", "Quack quack!"]]);
  assert.equal(evaluateCast(r, 2, catalog).events.length, 1);
  assert.equal(evaluateCast(r, 3.5, catalog).events.length, 0);
});

test("a block's state carries into the next block", () => {
  const { at } = run(duck, [{ at: 0, do: "walk_to", dur: 1, with: { to: [1, 0] } }, { at: 2, do: "hop", dur: 1 }]);
  near(at(2.5).position, [1, 0.5, 0]);
});

test("camera cuts at a block start and holds between blocks", () => {
  const { r } = run(duck, [], { timeline: [{ who: "camera", at: 2, do: "close", dur: 2, with: { target: "d" } }] });
  const p0 = evaluateCast(r, 1.9, catalog).camera.position;
  const p1 = evaluateCast(r, 2.01, catalog).camera.position;
  assert.ok(Math.hypot(p0[0] - p1[0], p0[2] - p1[2]) > 1, "a cut, not a glide");
  near(evaluateCast(r, 5, catalog).camera.position, p1);
});

test("expand is deterministic and the examples expand", () => {
  for (const f of ["garden_friends", "playroom_party", "snow_walk"]) {
    const doc = JSON.parse(readFileSync(new URL(`../examples/${f}.json`, import.meta.url), "utf8"));
    assert.deepEqual(validate(doc, { catalog }).errors, [], f);
    assert.deepEqual(expand(doc, catalog), expand(doc, catalog));
  }
});

test("Channel replaces a key at the same time and refuses to go back", () => {
  const c = new Channel(0);
  c.set(1, 5);
  c.set(1, 6, "quadIn");
  assert.deepEqual(c.keys, [{ t: 0, v: 0 }, { t: 1, v: 6, ease: "quadIn" }]);
  assert.throws(() => c.set(0.5, 1));
});

test("nearestAngle picks the short way round", () => {
  close(nearestAngle(170, -170), 190);
  close(nearestAngle(0, 270), -90);
  close(nearestAngle(720, 10), 730);
});

test("frameShot puts everything in front of the camera", () => {
  const s = frameShot([{ p: [-2, 0, 0], h: 1 }, { p: [2, 0, 0], h: 1 }]);
  close(s.target[0], 0);
  assert.ok(s.position[2] > 4);
});
