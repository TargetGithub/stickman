// Plush fur and Fluffy (catalog/models/fluffy.json): fur shells sit at an even depth off a squashed part and
// carry their strand inputs; the plush shapes are sound; a joyful face shuts the eyes into arcs; Fluffy and its
// looks build with fur that casts no shadow, named parts that move, and a grin. Node only (no canvas).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { createMaterials } from "../../runtime/objects.js";
import { buildModel } from "../../runtime/models.js";
import { shapeGeometry } from "../../runtime/geometry.js";
import { FUR, addFur, furSpec, shellGeometry } from "../../runtime/fur.js";
import { FEELINGS } from "../../runtime/director_extras.js";
import { validateScript } from "../../runtime/validate.js";

const catalog = loadCatalog3d();
const material = createMaterials(catalog);
const near = (a, b, eps, what = "") => assert.ok(Math.abs(a - b) < eps, `${what} ${a} != ${b}`);
const rest = { eyes: 1, feeling: "happy", feelingFrom: "happy", feelAt: -1 };
const LOOKS = ["fluffy", "yogurt_man", "dumpling_buddy", "fluffy_smart", "fluffy_magic", "fluffy_sporty", "fluffy_super"];

test("furSpec: true takes the defaults, objects override, shells stay in 2..32", () => {
  assert.equal(furSpec(false), null);
  assert.deepEqual(furSpec(true), { ...FUR });
  for (const [f, want] of [[{ length: 0.05 }, { ...FUR, length: 0.05 }], [{ shells: 1 }, { ...FUR, shells: 2 }], [{ shells: 99 }, { ...FUR, shells: 32 }], [{ shells: 7.6 }, { ...FUR, shells: 8 }]]) {
    assert.deepEqual(furSpec(f), want, JSON.stringify(f));
  }
});

test("a fur shell sits the same depth off a squashed ball all round, with its root and height", () => {
  const scale = [0.9, 1.0, 0.6];
  const len = 0.04;
  const g = shellGeometry(shapeGeometry("sphere"), scale, len, 0.5);
  const pos = g.attributes.position;
  const root = g.attributes.furRoot;
  assert.equal(root.count, pos.count);
  assert.ok(g.attributes.furK.array.every((k) => k === 0.5));
  for (let i = 0; i < pos.count; i += 97) {
    // In model units the shell point is `len` from its root, and the root lies on the scaled ball.
    const p = new THREE.Vector3(pos.getX(i) * scale[0], pos.getY(i) * scale[1], pos.getZ(i) * scale[2]);
    const r = new THREE.Vector3().fromBufferAttribute(root, i);
    near(p.distanceTo(r), len, 1e-4, `vertex ${i} depth`);
    near((r.x / (scale[0] / 2)) ** 2 + (r.y / (scale[1] / 2)) ** 2 + (r.z / (scale[2] / 2)) ** 2, 1, 1e-3, `vertex ${i} root`);
  }
  // Same inputs, same (cached) geometry: nothing random.
  assert.equal(shellGeometry(shapeGeometry("sphere"), scale, len, 0.5), g);
});

test("addFur stacks shells inside the mesh, rising to the full length; they cast no shadow", () => {
  const mesh = new THREE.Mesh(shapeGeometry("sphere"), material("plush", "plush"));
  mesh.scale.set(0.5, 0.5, 0.5);
  const shells = addFur(mesh, { shells: 6, length: 0.05 });
  assert.equal(shells.length, 6);
  assert.equal(mesh.children.length, 6);
  assert.ok(shells.every((s) => !s.castShadow && s.receiveShadow && s.userData.furShell));
  assert.equal(new Set(shells.map((s) => s.material)).size, 1, "one shell material per part material");
  const radius = (s) => (s.geometry.boundingSphere.radius * 0.5);
  near(radius(shells[5]) - 0.25, 0.05, 1e-3, "top shell");
  near(radius(shells[2]) - 0.25, 0.025, 1e-3, "middle shell");
  assert.deepEqual(addFur(mesh, false), []);
});

test("plush shapes build and fit their documented boxes", () => {
  const size = (n) => {
    const b = shapeGeometry(n).boundingBox;
    return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
  };
  for (const [n, w, h] of [["egg", 1, 1], ["gumdrop", 1, 1], ["bao", 1, 0.98], ["grin", 1.06, 0.46], ["brow", 1.2, 0.34], ["cape", 0.92, 1]]) {
    const [x, y] = size(n);
    near(x, w, 0.05, `${n} width`);
    near(y, h, 0.05, `${n} height`);
  }
  // The brim points +z and is thin; the seat and shirt sit where the egg does (not centred).
  const [, by, bz] = size("brim");
  assert.ok(by < 0.15 && bz > 0.6);
  near(shapeGeometry("egg_seat").boundingBox.min.y, -0.5, 0.01, "seat bottom");
  near(shapeGeometry("egg_seat").boundingBox.max.y, -0.27, 0.01, "seat top");
  assert.ok(shapeGeometry("egg_shirt").boundingBox.max.y < -0.1, "the shirt stays under the face");
  for (const n of ["egg", "egg_seat", "egg_shirt", "gumdrop", "bao", "grin", "brow", "brim", "cape", "mask"]) assert.ok(catalog.shapes[n]?.description, `${n} in shapes.json`);
});

test("joyful is a feeling; it shuts the eyes into arcs and opens them again", () => {
  assert.ok(FEELINGS.includes("joyful"));
  const m = buildModel({ id: "f" }, catalog.critters.fluffy, material);
  const head = m.named.get("head");
  const eyes = head.children.filter((c) => c.isGroup && c.children.length === 5);
  assert.equal(eyes.length, 2, "two cartoon eyes (white, iris, pupil, two shines)");
  const arcs = () => head.children.filter((c) => c.isMesh && c.visible && c.geometry.type === "TorusGeometry" && c.scale.y < 0.25);
  m.update(10, { ...rest, feeling: "joyful", feelingFrom: "happy", feelAt: 9 }, {});
  assert.ok(eyes.every((e) => !e.visible));
  assert.equal(arcs().length, 2);
  m.update(10, { ...rest, feeling: "happy", feelingFrom: "joyful", feelAt: 9 }, {});
  assert.ok(eyes.every((e) => e.visible));
  assert.equal(arcs().length, 0);
});

test("Fluffy and its looks build with fur, brows, a grin and the named parts scripts move", () => {
  for (const s of LOOKS) {
    const def = catalog.critters[s];
    assert.ok(def.description && def.tags?.includes("fluffy"), `${s} description and tags`);
    const m = buildModel({ id: s }, def, material);
    m.update(1, rest, {});
    for (const n of ["head", "arm", "leg_left", "leg_right", "shorts"]) assert.ok(m.named.has(n), `${s} has ${n}`);
    const meshes = [];
    m.group.traverse((o) => o.isMesh && meshes.push(o));
    const shells = meshes.filter((o) => o.userData.furShell);
    if (s.startsWith("fluffy")) assert.ok(shells.length >= 16, `${s} is furry`);
    else assert.equal(shells.length, 0, `${s} is smooth`);
    assert.ok(shells.every((o) => !o.castShadow));
    // Everything stands on the floor and the whole body is about 1.3-1.9 tall (cap or hat on).
    const box = new THREE.Box3().setFromObject(m.group);
    assert.ok(box.min.y > -0.02 && box.min.y < 0.03, `${s} stands on the floor (${box.min.y})`);
    assert.ok(box.max.y > 1.2 && box.max.y < 2.0, `${s} height ${box.max.y}`);
  }
});

test("named legs swing apart; a lift turns one arm only", () => {
  const def = catalog.critters.fluffy;
  const m = buildModel({ id: "f" }, def, material);
  m.update(1, rest, { "f#leg_left": { rotation: [-30, 0, 0] }, "f#leg_right": { rotation: [30, 0, 0] }, "f#arm": { lift: [0, 0, -90], liftSide: -1 } });
  const DEG = Math.PI / 180;
  near(m.named.get("leg_left").rotation.x, -30 * DEG, 1e-6);
  near(m.named.get("leg_right").rotation.x, 30 * DEG, 1e-6);
  const arms = [];
  m.group.traverse((o) => o.userData?.idle && o.parent && o.userData.rest && arms.push(o));
  const lifted = arms.filter((o) => o.userData.mirrored && Math.abs(o.rotation.z - (o.userData.rest.z - 90 * DEG)) < 0.2);
  const still = arms.filter((o) => !o.userData.mirrored && Math.abs(o.rotation.z - o.userData.rest.z) < 0.2);
  assert.ok(lifted.length >= 3 && still.length >= 3, `${lifted.length} lifted, ${still.length} still`);
});

test("scripts can use the Fluffy critters and the joyful feeling", () => {
  const script = {
    kind: "video3d", version: 1, meta: { title: "Fluffy", seed: 1 }, stage: { preset: "studio" },
    objects: LOOKS.map((s, i) => ({ id: `c${i}`, kind: "critter", species: s, at: [i - 3, 0, 0], feeling: "joyful" })),
    scenes: [{ id: "s", beats: [{ dur: 1, do: [{ do: "feel", target: "c0", feeling: "surprised" }, { do: "turn", target: "c0#leg_left", to: [-30, 0, 0] }] }] }],
  };
  const v = validateScript(script, catalog);
  assert.deepEqual(v.errors, []);
});
