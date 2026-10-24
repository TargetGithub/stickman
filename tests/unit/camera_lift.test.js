// Baaaana task 10c: the camera rises with characters standing up high, and background layers drop by their
// parallax factor (engine/camera.js liftOf, renderer/layer_util.js layerTransform).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCamera, stepCamera } from "../../engine/camera.js";
import { createActor, poseActor } from "../../engine/actor.js";
import { mulberry32 } from "../../engine/math.js";
import { fillPose } from "../../engine/pose.js";
import { layerTransform } from "../../engine/renderer/layer_util.js";
import { catalog } from "../../catalog/index.js";

const DT = 1 / 60;
const cam = () => createCamera({ width: 1920, height: 1080, groundScreenRatio: 0.82, stageWidth: 3200, groundY: 880, rng: mulberry32(5) });
/** A standing actor whose own ground line is `up` px above the floor. */
function actor(id, x, up = 0) {
  const a = createActor({ id, x, groundY: 880 - up });
  a.pose = fillPose(catalog.poses.stand, catalog.poses.stand);
  poseActor(a, 0);
  return a;
}
const settle = (c, actors, seconds = 4) => {
  let s;
  for (let t = 0; t < seconds; t += DT) s = stepCamera(c, DT, actors, t, t);
  return s;
};

const TABLE = [
  // [what, actors, expected lift]
  ["everyone on the floor", () => [actor("a", 1500), actor("b", 1700)], 0],
  ["one up, one on the floor (zoom fits them instead)", () => [actor("a", 1500, 300), actor("b", 1700)], 0],
  ["everyone up 300 px", () => [actor("a", 1500, 300), actor("b", 1700, 300)], 300],
  ["a lone climber 160 px up", () => [actor("a", 1500, 160)], 160],
];
for (const [what, make, lift] of TABLE) {
  test(`camera lift: ${what}`, () => {
    const base = settle(cam(), [actor("a", 1500), actor("b", 1700)]);
    const c = cam();
    const s = settle(c, make());
    assert.equal(c.lift, lift);
    if (lift) assert.ok(Math.abs(base.y - s.y - lift) < 25, `frame rose ${(base.y - s.y).toFixed(1)} px, want about ${lift}`);
    else assert.ok(Math.abs(base.y - s.y) < 1e-6 || s.zoom < base.zoom, "no lift");
  });
}

test("the frame keeps its zoom when everyone rises together", () => {
  const a = settle(cam(), [actor("a", 1500)]);
  const b = settle(cam(), [actor("a", 1500, 300)]);
  assert.ok(Math.abs(a.zoom - b.zoom) < 0.02, `${a.zoom} vs ${b.zoom}`);
});

test("vertical parallax: with a lift, near layers drop by the lift and far layers by less", () => {
  const calls = [];
  const ctx = { setTransform: (...m) => calls.push(m) };
  const view = (lift) => ({ cam: { x: 1600, y: 600, zoom: 1, shakeX: 0, shakeY: 0 }, W: 1920, H: 1080, lift });
  const ty = (lift, factor) => {
    calls.length = 0;
    layerTransform(ctx, view(lift), factor);
    return calls[0][5];
  };
  assert.equal(ty(200, 1), ty(0, 1), "the floor moves with the camera");
  assert.ok(Math.abs(ty(0, 0.2) - ty(200, 0.2) - 160) < 1e-6, "a far layer (factor 0.2) moves 80% less");
  assert.ok(ty(200, 0.5) < ty(200, 0.8));
});
