// Baaaana task 10a: travelling in depth (engine/road.js), the lens travel channel and travel-relative pieces.
import { test } from "node:test";
import assert from "node:assert/strict";
import { relativeZ, roadsidePieces, roadShapes, roadOf, groundPoint, PASS, ROADSIDE } from "../../engine/road.js";
import { sceneNodes } from "../../engine/scene.js";
import { lensAt, lensChanges, LENS_CHANNELS } from "../../engine/camera3.js";
import { depthOf } from "../../engine/depth.js";
import { jsonSchemaV3 } from "../../engine/validator/schema_v3.js";

const depth = depthOf({ depth: { far: -16000, horizon: 200 } });
const cam = { x: 1600 };
const GROUND = 880;
const road = roadOf({ road: {} }, 3200);

const REL = [
  // [world z, travel, relative z or null]
  [0, 0, 0],
  [-3000, 2000, -5000],
  [-3000, -3500, 500],
  [0, -depth.focal, null], // passed the camera
  [-15000, 2000, null], // beyond the far end
];
for (const [z, travel, want] of REL) {
  test(`relativeZ(${z}, travel ${travel}) is ${want}`, () => assert.equal(relativeZ(z, travel, depth), want));
}

test("roadside pieces: same slots and objects for the same seed, on both sides, inside the drawn depth", () => {
  const spec = { objects: ["tree_big", "lamppost", "bush"], every: 700 };
  const a = roadsidePieces(spec, road, 1200, depth, 5, 1600);
  assert.deepEqual(a, roadsidePieces(spec, road, 1200, depth, 5, 1600));
  assert.ok(a.some((p) => p.x < road.x) && a.some((p) => p.x > road.x));
  for (const p of a) {
    const rz = p.z - 1200;
    assert.ok(rz <= depth.focal * PASS + 700 && rz >= -ROADSIDE.reach - 700, `${p.id} at relative ${rz}`);
    assert.ok(spec.objects.includes(p.object) && p.generated);
  }
  // A slot keeps its object and place as the travel changes.
  const b = roadsidePieces(spec, road, 1500, depth, 5, 1600);
  const shared = a.filter((p) => b.some((q) => q.id === p.id));
  assert.ok(shared.length > 5);
  for (const p of shared) assert.deepEqual(b.find((q) => q.id === p.id), p);
  assert.notDeepEqual(roadsidePieces(spec, road, 1200, depth, 6, 1600).map((p) => p.object), a.map((p) => p.object));
});

test("the road narrows toward the horizon and its dashes stream with travel", () => {
  const s0 = roadShapes(road, 0, cam, GROUND, depth);
  const far = Math.abs(s0.quad[1].x - s0.quad[0].x);
  const near = Math.abs(s0.quad[2].x - s0.quad[3].x);
  assert.ok(near > far * 5, "narrow far away, wide near the camera");
  assert.ok(s0.quad[0].y < GROUND && s0.quad[2].y > GROUND);
  assert.ok(Math.abs(s0.horizonY - (GROUND - depth.horizon)) < 1e-9);
  const s1 = roadShapes(road, 150, cam, GROUND, depth);
  assert.notDeepEqual(s0.dashes[3], s1.dashes[3], "dashes move");
  assert.deepEqual(roadShapes(road, 400, cam, GROUND, depth).dashes.length > 3, true);
  assert.equal(roadShapes({ ...road, line: null }, 0, cam, GROUND, depth).dashes.length, 0);
  const p = groundPoint(road.x, 0, cam, GROUND, depth);
  assert.ok(Math.abs(p.y - GROUND) < 1e-9 && Math.abs(p.x - road.x) < 1e-9, "the stage line is at the ground");
});

test("scene nodes: pieces draw at their z less the travel, and passed pieces drop out", () => {
  const pieces = [{ id: "a", object: "tree_big", x: 1000, z: -2000 }, { id: "b", object: "bush", x: 1200, z: 500 }];
  const nodes = (travel) => sceneNodes({ chars: [], pieces, extras: [], depthEvents: new Map(), placementZ: new Map(), storyT: 0, depth, travel });
  const z = (travel, id) => nodes(travel).find((n) => n.ref?.id === id)?.z;
  assert.equal(z(0, "a"), -2000);
  assert.equal(z(1000, "a"), -3000);
  assert.equal(z(-2500, "a"), 500);
  assert.equal(z(-2000, "b"), undefined, "b has passed the camera");
});

test("travel is a lens channel that blends over dur, and the v3 schema takes road, roadside and travel", () => {
  assert.ok(LENS_CHANNELS.includes("travel"));
  const ch = lensChanges([{ type: "world", do: "set_camera", videoT: 1, params: { travel: 4000, dur: 4, ease: "linear" } }]);
  assert.equal(lensAt(ch, 0).travel, 0);
  assert.equal(lensAt(ch, 3).travel, 2000);
  assert.equal(lensAt(ch, 9).travel, 4000);
  const scene = jsonSchemaV3.properties.scenes.items.oneOf[0].properties;
  assert.ok(scene.road && scene.roadside && scene.lens.properties.travel);
});
