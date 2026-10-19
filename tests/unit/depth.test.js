// The depth lane (ENGINE_V3_SPEC 5.1, ADR-023): projection, layer presets, depth over time, depth walks,
// the scene graph order, the v3 schema and its snapshot, and the depth checks of the validator.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEPTH, LAYER_Z, depthOf, zOf, projectScale, depthTransform, projectPoint, projectJoints, depthAt, planDepthWalk, sameDepth, depthOrder, DEPTH_TOUCH } from "../../engine/depth.js";
import { sceneNodes, characterDepths } from "../../engine/scene.js";
import { jsonSchemaV3, schemaV3For, withDepth } from "../../engine/validator/schema_v3.js";
import { jsonSchemaV2 } from "../../engine/validator/schema_v2.js";
import { depthIssues } from "../../engine/validator/depth.js";
import { normalize } from "../../engine/story/normalize.js";
import { checkValue, exportSchema } from "../../engine/validator/schema.js";
import { validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const cam = { x: 1600 };
const G = 880;

test("projection: the stage line is scale 1, far is smaller, near is bigger, and the layer presets match the legacy layer scales", () => {
  assert.equal(projectScale(0), 1);
  near(projectScale(-2400), 0.5);
  near(projectScale(1200), 2);
  near(projectScale(LAYER_Z.back), 0.75);
  near(projectScale(LAYER_Z.front), 1.15);
  assert.equal(projectScale(2400), 2400, "the focal plane never divides by zero");
  near(projectScale(-600, 1800), 0.75);
});

test("depthTransform scales about the camera x and lifts far feet toward the horizon", () => {
  const t0 = depthTransform(0, 1000, cam, G);
  assert.deepEqual(t0, { s: 1, tx: 0, ty: 0 });
  const far = depthTransform(-2400, 2600, cam, G);
  near(far.s, 0.5);
  const feet = projectPoint({ x: 2600, y: G }, -2400, 2600, cam, G);
  near(feet.x, 1600 + 1000 * 0.5, 1e-6);
  near(feet.y, G - 0.5 * DEPTH.horizon, 1e-6);
  const head = projectPoint({ x: 2600, y: G - 200 }, -2400, 2600, cam, G);
  near(head.y, feet.y - 100, 1e-6);
  const nearFeet = projectPoint({ x: 1000, y: G }, 1200, 1000, cam, G);
  near(nearFeet.x, 1600 - 600 * 2, 1e-6);
  assert.ok(nearFeet.y > G, "near things stand lower on screen");
  const j = { hip: { x: 2600, y: G - 100 }, propTip: null };
  assert.equal(projectJoints(j, 0, 2600, cam, G), j, "z 0 returns the same object");
  near(projectJoints(j, -2400, 2600, cam, G).hip.y, feet.y - 50, 1e-6);
});

test("depthOf fills defaults; zOf reads z, then the layer preset, clamped to the range", () => {
  assert.deepEqual(depthOf({}), { ...DEPTH });
  assert.deepEqual(depthOf({ depth: { far: -900, horizon: 100 } }), { focal: 2400, near: 600, far: -900, horizon: 100 });
  assert.equal(zOf({ z: -300 }), -300);
  assert.equal(zOf({ layer: "back" }), LAYER_Z.back);
  assert.equal(zOf({ layer: "front" }), LAYER_Z.front);
  assert.equal(zOf({}), 0);
  assert.equal(zOf({ z: -5000 }), DEPTH.far);
  assert.equal(zOf({ z: 900 }, depthOf({ depth: { near: 300 } })), 300);
});

test("depthAt lerps over walks and jumps on layer beats", () => {
  const ev = [{ storyT: 1, z0: 0, z1: -800, dur: 2 }, { storyT: 5, z0: -800, z1: 200, dur: 0 }];
  for (const [t, want] of [[0, 0], [1, 0], [2, -400], [3, -800], [4.9, -800], [5, 200], [9, 200]]) near(depthAt(ev, 0, t), want);
  assert.equal(depthAt([], -300, 7), -300);
});

test("planDepthWalk keeps a diagonal and sizes the walk by ground speed", () => {
  const stage = { lo: 60, hi: 3140 };
  const depth = depthOf({});
  const a = { x: 1000, z: -800, facing: 1 };
  const straight = planDepthWalk(a, { z: 0 }, depth, 200, stage);
  assert.deepEqual(straight, { x: 1400, z1: 0, dur: 2 });
  const withX = planDepthWalk(a, { x: 2000, z: 0 }, depth, 200, stage);
  assert.deepEqual(withX, { x: 2000, z1: 0, dur: 5 });
  const shortX = planDepthWalk(a, { x: 1100, z: 0 }, depth, 400, stage);
  assert.deepEqual(shortX, { x: 1400, z1: 0, dur: 1 });
  const edge = planDepthWalk({ x: 3100, z: 0, facing: 1 }, { z: -400 }, depth, 200, stage);
  assert.equal(edge.x, 2900, "no room to the right: drift left instead");
  assert.equal(planDepthWalk(a, { z: -9000 }, depth, 200, stage).z1, depth.far, "clamped to the range");
  assert.ok(planDepthWalk(a, { z: -800 }, depth, 200, stage).dur >= 0.2);
});

test("sameDepth and depthOrder", () => {
  assert.ok(sameDepth({ z: 0 }, {}) && sameDepth({ z: 30 }, { z: -30 }) && !sameDepth({ z: 0 }, { z: DEPTH_TOUCH + 1 }));
  const order = depthOrder([{ id: "a", z: 0 }, { id: "b", z: 250 }, { id: "c", z: -800 }, { id: "d", z: 0.2 }, { id: "e", z: -0.3 }]);
  assert.deepEqual(order.map((n) => n.id), ["c", "a", "d", "e", "b"], "far to near, the stage line kept in input order");
});

test("sceneNodes: far to near, pieces before extras before characters (largest first) before the stage group at one z", () => {
  const chars = [{ id: "k", scale: 1 }, { id: "p", scale: 1.3 }, { id: "g", scale: 2 }];
  const nodes = sceneNodes({
    chars, pieces: [{ id: "t1", object: "tree_big", x: 100, z: -600 }, { id: "b1", object: "bench", x: 200 }, { id: "f1", object: "sign", x: 300, layer: "front" }],
    extras: [{ layer: "back" }, { layer: "back" }], depthEvents: new Map([["g", [{ storyT: 0, z0: 0, z1: 400, dur: 2 }]]]), placementZ: new Map([["k", -600], ["p", 0]]), storyT: 1, depth: depthOf({}),
  });
  assert.deepEqual(nodes.map((n) => `${n.kind}:${n.ref?.id ?? n.ref ?? ""}@${Math.round(n.z)}`), ["extras:back@-800", "piece:t1@-600", "character:k@-600", "piece:b1@0", "character:p@0", "stage:@0", "character:g@200", "piece:f1@313"]);
  assert.deepEqual([...characterDepths(nodes).entries()].map(([k, z]) => [k, Math.round(z)]), [["k", -600], ["p", 0], ["g", 200]]);
  const stageOnly = sceneNodes({ chars: [{ id: "a", scale: 1 }, { id: "b", scale: 2 }], pieces: [], extras: [], depthEvents: new Map(), placementZ: new Map(), storyT: 0, depth: depthOf({}) });
  assert.deepEqual(stageOnly.map((n) => n.ref?.id ?? n.kind), ["b", "a", "stage"], "largest first on the stage line, as the v2 renderer draws");
});

test("the v3 schema is the v2 schema plus depth fields, and its snapshot is current", () => {
  assert.deepEqual(read("../../docs/schema/script-v3.schema.json"), exportSchema(jsonSchemaV3), "run: node tools/validate.mjs --schema-v3 > docs/schema/script-v3.schema.json");
  assert.equal(schemaV3For(catalog), jsonSchemaV3);
  assert.deepEqual(jsonSchemaV2.properties.version, { const: 2 }, "v2 is untouched");
  const v3 = withDepth(jsonSchemaV2);
  const scene = v3.properties.scenes.items.oneOf[0];
  assert.ok(scene.properties.depth && scene.properties.cast.items.properties.z && scene.properties.set.items.properties.z && v3.properties.locations.items.properties.set.items.properties.z);
  const to = scene.properties.beats.items.oneOf[0].properties.to;
  assert.equal(to.oneOf.length, 4);
  assert.deepEqual(checkValue({ z: -300, x: 1200 }, to), []);
  assert.deepEqual(checkValue({ z: -300 }, to), []);
  assert.equal(checkValue({ z: -300, near: "kai" }, to).length > 0, true);
  const good = read("../../scripts/samples/v3_2_depth.json");
  assert.deepEqual(checkValue(good, jsonSchemaV3), []);
  assert.equal(checkValue({ ...good, version: 2 }, jsonSchemaV2).length > 0, true, "v2 rejects z");
});

test("depthIssues: z outside the range, far above near, z with layer", () => {
  const story = (patch) => normalize({ version: 3, meta: {}, cast: [], scenes: [{ id: "s1", location: "x", cast: [{ id: "a", x: 1, ...patch.cast }], set: patch.set || [], beats: patch.beats || [], ...(patch.depth ? { depth: patch.depth } : {}) }] });
  const codes = (s) => depthIssues(s).map((i) => `${i.code} ${i.path}`);
  assert.deepEqual(codes(story({ cast: { z: -1999 } })), []);
  assert.deepEqual(codes(story({ cast: { z: -2001 } })), ["E_DEPTH_RANGE scenes[0].cast[0].z"]);
  assert.deepEqual(codes(story({ cast: { z: 100, layer: "front" } })), ["E_DEPTH_LAYER scenes[0].cast[0]"]);
  assert.deepEqual(codes(story({ depth: { far: -100, near: 50 }, set: [{ id: "t", object: "tree_big", x: 1, z: 80 }] })), ["E_DEPTH_RANGE scenes[0].set[0].z"]);
  assert.deepEqual(codes(story({ depth: { far: -100, near: -200 } })), ["E_DEPTH_RANGE scenes[0].depth"]);
  assert.deepEqual(codes(story({ beats: [{ id: "b", at: 0, who: "a", do: "walk", to: { z: 700 }, layer: "back" }] })), ["E_DEPTH_RANGE scenes[0].beats[0].to.z", "E_DEPTH_LAYER scenes[0].beats[0]"]);
  assert.deepEqual(depthIssues(normalize({ version: 2, meta: {}, cast: [], scenes: [{ id: "s1", cast: [{ id: "a", x: 1, z: 9999 }] }] })), [], "v2 stories are not checked (the schema rejects z)");
});

test("version 3 validates end to end, and a v2 script with z is a schema error", () => {
  const good = read("../../scripts/samples/v3_2_depth.json");
  const r = validate(good, catalog);
  assert.deepEqual(r.errors, [], JSON.stringify(r.errors));
  const v2 = validate({ ...good, version: 2 }, catalog);
  assert.equal(v2.stage, "schema");
  assert.ok(v2.errors.some((e) => e.code === "E_SCHEMA_UNKNOWN_FIELD"));
  const bad = validate({ ...good, version: 4 }, catalog);
  assert.equal(bad.errors[0].code, "E_VERSION");
});
