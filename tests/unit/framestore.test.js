import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore, writeFrame, frameView, jointsAt, storeBytes, MOUTHS } from "../../engine/framestore.js";
import { createActor, poseActor } from "../../engine/actor.js";
import { fillPose } from "../../engine/pose.js";
import { unpackJoints } from "../../engine/skeleton.js";
import { catalog } from "../../data/index.js";

function actors() {
  return [createActor({ id: "a", x: 900, color: "#22aaff" }), createActor({ id: "b", x: 1300, facing: -1, scale: 2.2, color: "#ff3b3b", hp: 200 })].map((a) => {
    a.pose = fillPose(catalog.poses.guard, catalog.poses.stand);
    poseActor(a, 0);
    return a;
  });
}

test("writes and reads frames back exactly, growing past the initial capacity", () => {
  const list = actors();
  const store = createStore(list, 16);
  const clock = { storyT: 0, fxT: 0 };
  for (let n = 0; n < 100; n++) {
    clock.storyT = n * 0.01;
    clock.fxT = n * 0.02;
    list[0].x = 900 + n;
    poseActor(list[0], 0);
    list[1].mouth = MOUTHS[n % 3];
    list[1].hp = 200 - n;
    writeFrame(store, list, clock, { x: n, y: 2 * n, zoom: 1 + n / 100, shakeX: 0.5, shakeY: -0.5 });
  }
  assert.equal(store.length, 100);
  assert.ok(store.segments[0].capacity >= 100);
  const f = frameView(store, 73);
  assert.equal(f.storyT, 0.73);
  assert.equal(f.fxT, 1.46);
  assert.ok(Math.abs(f.videoT - 73 / 60) < 1e-12);
  assert.deepEqual([f.cam.x, f.cam.y], [73, 146]);
  assert.ok(Math.abs(unpackJoints(f.chars[0].joints).hip.x - 973) < 1e-3);
  assert.equal(f.chars[1].mouth, MOUTHS[73 % 3]);
  assert.equal(f.chars[1].hp, 127);
  assert.equal(f.chars[1].scale, 2.2);
  assert.equal(f.chars[1].facing, -1);
  assert.equal(jointsAt(store, 73, 0)[0], f.chars[0].joints[0]);
  assert.throws(() => frameView(store, 100), RangeError);
});

test("a 180 s two-character video fits in a few MB", () => {
  const store = createStore(actors(), 10800);
  store.length = 10800;
  assert.ok(storeBytes(store) < 4 * 1024 * 1024, `${storeBytes(store)} bytes`);
});

test("segments: scene, hold, scene; hold frames point at their neighbours", async () => {
  const { startScene, addHold, segmentIndexAt, storyTimeAt } = await import("../../engine/framestore.js");
  const list = actors();
  const store = createStore(null, 0, []);
  const clock = { storyT: 0, fxT: 0 };
  const cam = { x: 0, y: 0, zoom: 1, shakeX: 0, shakeY: 0 };
  startScene(store, list, { scene: 0 }, 4);
  for (let n = 0; n < 10; n++) { clock.storyT = n / 60; writeFrame(store, list, clock, cam); }
  addHold(store, 6, { type: "fade", scene: 1, storyT: clock.storyT, fxT: clock.fxT });
  startScene(store, [list[1]], { scene: 1 }, 4);
  for (let n = 0; n < 5; n++) { clock.storyT += 1 / 60; writeFrame(store, [list[1]], clock, cam); }
  assert.equal(store.length, 21);
  assert.deepEqual([0, 9, 10, 15, 16, 20].map((n) => segmentIndexAt(store, n)), [0, 0, 1, 1, 2, 2]);
  const h = frameView(store, 12);
  assert.equal(h.hold.type, "fade");
  assert.equal(h.prevFrame, 9);
  assert.equal(h.nextFrame, 16);
  assert.ok(h.u > 0 && h.u < 1);
  assert.deepEqual(h.chars, []);
  const f = frameView(store, 16);
  assert.equal(f.scene, 1);
  assert.equal(f.chars.length, 1);
  assert.equal(f.chars[0].id, "b");
  assert.equal(jointsAt(store, 16, 0)[0], f.chars[0].joints[0]);
  assert.equal(storyTimeAt(store, 16), f.storyT);
  assert.throws(() => jointsAt(store, 12, 0), RangeError);
  // Hold frames cost nothing; scene frames are counted per segment.
  assert.equal(storeBytes(store), 10 * (16 + 20 + 2 * 33 * 4) + 5 * (16 + 20 + 33 * 4));
});
