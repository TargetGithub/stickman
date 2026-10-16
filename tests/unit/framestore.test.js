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
  assert.ok(store.capacity >= 100);
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
