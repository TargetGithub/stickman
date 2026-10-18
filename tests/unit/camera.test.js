import { test } from "node:test";
import assert from "node:assert/strict";
import { createCamera, setCameraKey, stepCamera, addShake, addZoomPunch, cutCamera, toScreen } from "../../engine/camera.js";
import { createActor, poseActor } from "../../engine/actor.js";
import { mulberry32 } from "../../engine/math.js";
import { fillPose } from "../../engine/pose.js";
import { catalog } from "../../catalog/index.js";

const DT = 1 / 60;
const cam = (format = "landscape") =>
  createCamera({
    width: format === "landscape" ? 1920 : 1080,
    height: format === "landscape" ? 1080 : 1920,
    groundScreenRatio: format === "landscape" ? 0.82 : 0.7,
    stageWidth: 3200,
    groundY: 880,
    rng: mulberry32(5),
  });
function actor(id, x, scale = 1) {
  const a = createActor({ id, x, scale });
  a.pose = fillPose(catalog.poses.stand, catalog.poses.stand);
  poseActor(a, 0);
  return a;
}
const settle = (c, actors, seconds = 3, start = 0) => {
  let s;
  for (let t = start; t < start + seconds; t += DT) s = stepCamera(c, DT, actors, t, t);
  return s;
};

test("follow centres on the group, keeps the ground at its screen line and everyone in frame", () => {
  for (const format of ["landscape", "portrait"]) {
    const c = cam(format);
    const actors = [actor("a", 1200), actor("b", 1800, 2.2)];
    const s = settle(c, actors);
    const W = c.W;
    const H = c.H;
    assert.ok(Math.abs(s.x - (actors[0].joints.lHand.x + actors[1].joints.rHand.x) / 2) < 60, `${format} centred`);
    assert.ok(Math.abs(toScreen(s, W, H, { x: s.x, y: 880 }).y - H * c.gsr) < 1, `${format} ground line`);
    for (const a of actors) {
      const head = toScreen(s, W, H, { x: a.joints.head.x, y: a.joints.head.y - 22 * a.scale });
      assert.ok(head.y > 0 && head.x > 0 && head.x < W, `${format} ${a.id} head in frame`);
    }
  }
});

test("focus zooms on one character; fixed holds a position; first frame snaps", () => {
  const c = cam();
  const actors = [actor("a", 1000), actor("b", 2000)];
  const first = stepCamera(c, DT, actors, 0, 0);
  assert.ok(Math.abs(first.x - 1500) < 80, "snapped on the first frame");
  setCameraKey(c, { mode: "focus", target: "b", zoom: 1.6 }, 0);
  const s = settle(c, actors);
  assert.ok(Math.abs(s.x - 2000) < 30 && Math.abs(s.zoom - 1.6) < 0.01);
  setCameraKey(c, { mode: "fixed", x: 1400, zoom: 1 }, 3);
  cutCamera(c);
  const f = stepCamera(c, DT, actors, 3, 3);
  assert.equal(f.x, 1400);
});

test("pan eases to x over dur; the view is clamped to the stage", () => {
  const c = cam();
  const actors = [actor("a", 1000)];
  settle(c, actors);
  setCameraKey(c, { mode: "pan", x: 3100, dur: 1, zoom: 1 }, 3);
  const mid = settle(c, actors, 0.5, 3);
  const end = settle(c, actors, 1, 3.5);
  assert.ok(mid.x < end.x);
  assert.equal(end.x, 3200 - 1920 / 2, "clamped to the stage edge");
});

test("shake is deterministic, bounded and decays to zero; zoom punch peaks mid-way", () => {
  const run = () => {
    const c = cam();
    const actors = [actor("a", 1500)];
    settle(c, actors, 1);
    addShake(c, "big", 1);
    const xs = [];
    for (let t = 1; t < 1.6; t += DT) xs.push(stepCamera(c, DT, actors, t, t).shakeX);
    return xs;
  };
  const a = run();
  assert.deepEqual(a, run());
  assert.ok(Math.max(...a.map(Math.abs)) > 3 && Math.max(...a.map(Math.abs)) <= 28 + 1e-9);
  assert.equal(a[a.length - 1], 0);
  const c = cam();
  const actors = [actor("a", 1500)];
  const base = settle(c, actors, 2).zoom;
  addZoomPunch(c, 0.15, 0.2, 2);
  const zs = [];
  for (let t = 2; t < 2.25; t += DT) zs.push(stepCamera(c, DT, actors, t, t).zoom);
  assert.ok(Math.max(...zs) > base * 1.12, "punch reaches about +15%");
  assert.ok(Math.abs(zs[zs.length - 1] - base) < 0.01, "and returns");
});
