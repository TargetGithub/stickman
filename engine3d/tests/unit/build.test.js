// The three.js builders run in Node (no canvas: geometry, materials and transforms only): letters stand on the
// baseline, see-through meshes cast no shadow, recolor rebuilds part colours, the clock's numbers keep apart,
// part children ride on the part in the parent's units, and plate stays solid when thin.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { Font } from "three/addons/loaders/FontLoader.js";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { buildObject, createMaterials } from "../../runtime/objects.js";
import { buildModel } from "../../runtime/models.js";
import { shapeGeometry } from "../../runtime/geometry.js";

const catalog = loadCatalog3d();
const material = createMaterials(catalog);
const ttf = readFileSync(new URL("../../../assets/fonts/Andika-Bold.ttf", import.meta.url));
const font = new Font(new TTFLoader().parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.length)));
const assets = { fonts: new Map([["andika_bold", font]]), characters: new Map() };
const build = (o) => buildObject({ at: [0, 0, 0], ...o }, { catalog, assets, material, seed: 1 });
const box = (obj) => new THREE.Box3().setFromObject(obj);
const meshes = (obj) => {
  const out = [];
  obj.traverse((m) => m.isMesh && out.push(m));
  return out;
};
const near = (a, b, eps, what = "") => assert.ok(Math.abs(a - b) < eps, `${what} ${a} != ${b}`);

test("letters stand on the baseline: descenders hang below it, cap height is 1.41 x size", () => {
  const size = 0.5;
  for (const [text, low] of [["AH", 0], ["Ag", -0.47], ["py", -0.47], ["H", 0]]) {
    const b = box(build({ id: "w", kind: "letter", text, size }).group);
    near(b.min.y / size, low, 0.03, text);
  }
  near(box(build({ id: "w", kind: "letter", text: "H", size }).group).max.y / size, 1.41 + 0.025, 0.03, "cap");
  // Same height and baseline for a word with and without descenders.
  near(box(build({ id: "a", kind: "letter", text: "Ay", size }).group).max.y, box(build({ id: "b", kind: "letter", text: "AH", size }).group).max.y, 0.01);
});

test("see-through meshes cast no shadow; water, ice and solids do", () => {
  const cast = (o) => meshes(build(o).group).map((m) => m.castShadow);
  assert.deepEqual(cast({ id: "g", kind: "shape", shape: "cup", material: "glass" }), [false]);
  assert.deepEqual(cast({ id: "w", kind: "shape", shape: "cylinder", material: "water" }), [true]);
  assert.deepEqual(cast({ id: "i", kind: "shape", shape: "cube", material: "ice" }), [true]);
  assert.deepEqual(cast({ id: "l", kind: "letter", text: "A", material: "glass" }), [false]);
  assert.deepEqual(cast({ id: "s", kind: "shape", shape: "cube" }), [true]);
  // A model's glass parts (goggle lenses) cast none, its frame does.
  const gog = meshes(build({ id: "gog", kind: "prop", model: "goggles" }).group);
  for (const m of gog) assert.equal(m.castShadow, !(m.material.transparent && m.material.opacity < 0.5));
  assert.ok(gog.some((m) => !m.castShadow) && gog.some((m) => m.castShadow));
});

test("recolor rebuilds the parts drawn in one colour in another", () => {
  const hexes = (o) => new Set(meshes(build(o).group).map((m) => m.material.color.getHexString()));
  const hex = (c) => new THREE.Color(catalog.colors[c].hex).getHexString();
  const plain = hexes({ id: "p", kind: "prop", model: "plant" });
  assert.ok(plain.has(hex("leaf")));
  const wilted = hexes({ id: "p", kind: "prop", model: "plant", recolor: { leaf: "brown" } });
  assert.ok(!wilted.has(hex("leaf")) && wilted.has(hex("brown")));
  // Critters too, including the main colour.
  const duck = hexes({ id: "d", kind: "critter", species: "duck", recolor: { yellow: "blue" } });
  assert.ok(!duck.has(hex("yellow")) && duck.has(hex("blue")));
});

test("clock numbers keep apart and inside the ticks", () => {
  const D = 2;
  const g = build({ id: "c", kind: "clock", size: D }).group;
  g.updateMatrixWorld(true);
  const nums = meshes(g).filter((m) => m.geometry.type === "TextGeometry").map((m) => box(m));
  assert.equal(nums.length, 12);
  const c = new THREE.Vector3(0, D / 2 * 1.07, 0);
  const gap = (a, b) => Math.max(a.min.x - b.max.x, b.min.x - a.max.x, a.min.y - b.max.y, b.min.y - a.max.y);
  for (let i = 0; i < 12; i++) {
    // Every corner inside 0.73 R (the long ticks start at 0.79 R).
    for (const x of [nums[i].min.x, nums[i].max.x]) for (const y of [nums[i].min.y, nums[i].max.y]) assert.ok(Math.hypot(x - c.x, y - c.y) < 0.73 * D / 2, `number ${i + 1} reaches the ticks`);
    // Neighbours (12 and 1 too) at least 4% of the radius apart.
    assert.ok(gap(nums[i], nums[(i + 1) % 12]) > 0.04 * D / 2, `${i + 1} and ${((i + 1) % 12) + 1} crowd`);
  }
});

test("plate is a thin solid slab at its true thickness", () => {
  const b = shapeGeometry("plate").boundingBox;
  near(b.max.y - b.min.y, 0.04, 1e-6);
  near(b.max.x - b.min.x, 1, 1e-6);
  const g = build({ id: "p", kind: "shape", shape: "plate" }).group;
  near(box(g).min.y, 0, 1e-6, "stands on the floor");
});

test("a child on a critter's head rides on the head pivot, in the critter's units", () => {
  for (const [species, size] of [["cat", 0.9], ["duck", 0.75], ["dog", 1.2]]) {
    const m = catalog.critters[species];
    const built = buildModel({ id: species, size }, m, material);
    const critter = new THREE.Group(); // the object's group, as the stage places it
    critter.position.set(2, 0, 1);
    critter.add(built.group);
    const hat = new THREE.Group();
    hat.position.set(0, 0.28, 0);
    built.named.get("head").add(hat);
    built.update(0, { eyes: 1, feeling: "happy", feelingFrom: "happy", feelAt: -1 }, {});
    critter.updateMatrixWorld(true);
    const p = hat.getWorldPosition(new THREE.Vector3());
    const head = m.head.at;
    near(p.x, 2 + size * head[0], 0.03, `${species} x`);
    near(p.y, size * (head[1] + 0.28), 0.03 * size + 0.01, `${species} y`);
    near(p.z, 1 + size * head[2], 0.03, `${species} z`);
    near(hat.getWorldScale(new THREE.Vector3()).x, size, 1e-6, `${species} scale`);
  }
});
