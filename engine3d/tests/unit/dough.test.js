// Dough shapes and Bao Buddy (runtime/dough.js, catalog/models/bao_buddy.json): the bun profile and pleats are
// closed-form and sound, the head and belly overlap at the collar, the collar flaps out at the sides, the lid
// blinks with the eye, and Bao Buddy builds with named parts and every feeling. Node only (no canvas).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { createMaterials } from "../../runtime/objects.js";
import { buildModel } from "../../runtime/models.js";
import { shapeGeometry } from "../../runtime/geometry.js";
import { BAO_COLLAR, COLLAR_BAND, DOUGH_SHAPES, baoPleat, baoRadius, groove, squeeze } from "../../runtime/dough.js";
import { FEELINGS } from "../../runtime/director_extras.js";

const catalog = loadCatalog3d();
const material = createMaterials(catalog);
const near = (a, b, eps, what = "") => assert.ok(Math.abs(a - b) < eps, `${what} ${a} != ${b}`);
const box = (n) => shapeGeometry(n).boundingBox;

test("baoRadius: zero at the ends, widest a little below the middle, the collar narrower", () => {
  for (const [y, want] of [[0, 0], [1, 0], [-0.1, 0], [1.2, 0]]) assert.equal(baoRadius(y), want, `y ${y}`);
  let best = [0, 0];
  for (let y = 0; y <= 1; y += 0.01) if (baoRadius(y) > best[1]) best = [y, baoRadius(y)];
  assert.ok(best[0] > 0.38 && best[0] < 0.55, `widest at ${best[0]}`);
  near(best[1], 0.49, 0.01, "max radius");
  assert.ok(baoRadius(BAO_COLLAR) < best[1] - 0.02, "the collar sits where the bun tucks in");
  assert.ok(baoRadius(0.9) < baoRadius(0.7) && baoRadius(0.7) < baoRadius(0.5), "tapers to the top");
});

test("squeeze: the tight collar pinches the dough under the band only", () => {
  const mid = (COLLAR_BAND.lo + COLLAR_BAND.hi) / 2;
  for (const [y, lo, hi] of [[mid, 0.045, 0.051], [COLLAR_BAND.lo, 0.01, 0.05], [COLLAR_BAND.hi, 0.01, 0.05], [0.1, 0, 1e-4], [0.6, 0, 1e-4]]) {
    assert.ok(squeeze(y) >= lo && squeeze(y) <= hi, `squeeze(${y}) = ${squeeze(y)}`);
  }
});

test("groove and pleats: periodic, in range, strongest toward the top", () => {
  for (const [a, n, want] of [[0, 14, 1], [Math.PI / 14, 14, 0], [(2 * Math.PI) / 7, 7, 1]]) near(groove(a, n), want, 1e-3, `groove ${a} ${n}`);
  for (let a = 0; a < 6.3; a += 0.37) {
    near(baoPleat(a, 0.8), baoPleat(a + 2 * Math.PI, 0.8), 1e-9, "periodic");
    for (const y of [0.05, 0.3, 0.6, 0.95]) assert.ok(baoPleat(a, y) >= 0 && baoPleat(a, y) < 0.3);
  }
  const peak = (y) => Math.max(...Array.from({ length: 360 }, (_, i) => baoPleat((i * Math.PI) / 180, y)));
  assert.equal(peak(0.35), 0, "smooth at the collar");
  assert.equal(peak(0.58), 0, "smooth across the face");
  assert.ok(peak(0.95) > peak(0.7) && peak(0.7) > 0, "pleats deepen upward");
  assert.ok(peak(0.13) > 0, "soft folds low down");
});

test("dough shapes build, fit their boxes, and the head and belly overlap at the collar", () => {
  for (const n of Object.keys(DOUGH_SHAPES)) {
    assert.ok(shapeGeometry(n).attributes.position.count > 20, n);
    assert.ok(catalog.shapes[n]?.description, `${n} in shapes.json`);
  }
  const drop = box("bao_drop");
  near(drop.min.y, -0.5, 1e-3); near(drop.max.y, 0.5, 1e-3); near(drop.max.x, 0.49, 0.01);
  const cut = BAO_COLLAR - 0.5;
  assert.ok(box("bao_head").min.y < cut - 0.05 && box("bao_head").max.y > 0.49, "head reaches under the cut");
  assert.ok(box("bao_belly").max.y > cut + 0.05 && box("bao_belly").min.y < -0.49, "belly reaches over the cut");
  // The collar band hugs the squeezed dough in the bun's own frame, from COLLAR_BAND.lo to .hi (dipping a
  // little lower in front), just outside it; the lip rings its top. A leaf flap hangs 1 down -y, cupping to +x.
  const c = box("leaf_collar");
  near(c.max.y, COLLAR_BAND.hi - 0.5, 0.003, "band top");
  assert.ok(c.min.y < COLLAR_BAND.lo - 0.5 && c.min.y > COLLAR_BAND.lo - 0.53, `band bottom ${c.min.y}`);
  const hug = baoRadius(COLLAR_BAND.hi) * (1 - squeeze(COLLAR_BAND.hi));
  assert.ok(c.max.x > hug && c.max.x < hug + 0.04, `band sits on the dough: ${c.max.x} vs ${hug}`);
  near(box("collar_lip").min.y + 0.016, COLLAR_BAND.hi - 0.5, 0.003, "lip on the band's top");
  const f = box("leaf_flap");
  near(f.min.y, -1, 1e-3); near(f.max.y, 0, 1e-3);
  assert.ok(f.max.z < 0.32 && f.max.x > 0.1, "a narrow leaf whose tip curls toward +x");
  // Nothing random: the same geometry from a fresh build.
  const again = DOUGH_SHAPES.bao_head();
  assert.deepEqual(Array.from(again.attributes.position.array.slice(0, 300)), Array.from(shapeGeometry("bao_head").attributes.position.array.slice(0, 300)));
});

test("the dough material has a warm sheen colour of its own", () => {
  const m = material("bao_dough", "dough");
  assert.ok(m.sheen > 0 && m.roughness >= 0.5);
  assert.equal(m.sheenColor.getHexString(), new THREE.Color(catalog.materials.dough.sheenColor).getHexString());
});

test("Bao Buddy builds: named parts move, the collar comes off, the lids blink, every feeling works", () => {
  const model = catalog.critters.bao_buddy;
  assert.ok(model?.description && model.tags.length);
  const o = { id: "bao", kind: "critter", species: "bao_buddy" };
  const m = buildModel(o, model, material);
  for (const n of ["head", "arm", "leg_left", "leg_right", "collar", "knot", "nose", "cheeks"]) assert.ok(m.named.get(n), n);
  const nodes = [];
  m.group.traverse((x) => x.isMesh && nodes.push(x));
  const lids = nodes.filter((x) => x.geometry === shapeGeometry("eyelid"));
  assert.equal(lids.length, 2);
  assert.ok(lids[0].scale.x * lids[1].scale.x < 0, "the lids mirror");
  // Blink: the lid's eye group closes with the eye.
  const eye = lids[0].parent;
  let t0 = 0;
  for (let t = 0; t < 3.6; t += 0.02) {
    m.update(t, { eyes: 1, feeling: "happy", feelingFrom: "happy", feelAt: -1 }, {});
    if (eye.scale.y < 0.5) { t0 = t; break; }
  }
  assert.ok(t0 > 0 || eye.scale.y < 0.5, "it blinks within one beat");
  // Every feeling sets a face without throwing; joyful hides the eyes (and lids) behind arcs.
  for (const f of FEELINGS) {
    m.update(2, { eyes: 1, feeling: f, feelingFrom: "happy", feelAt: 0, feelDur: 0.3 }, {});
    if (f === "joyful") assert.equal(eye.visible, false);
    else assert.equal(eye.visible, true, f);
  }
  // Feelings tip the bun only gently (head.tilt), and the joyful arcs take the lid colour.
  m.update(3, { eyes: 1, feeling: "sad", feelingFrom: "sad", feelAt: -1 }, {});
  const head0 = m.named.get("head");
  assert.ok(head0.rotation.x > 0 && head0.rotation.x < 14 * 0.5 * Math.PI / 180, `sad tilt ${head0.rotation.x}`);
  const arcs = nodes.filter((x) => x.material === material(model.eyes.lid, "matte") && x.geometry !== shapeGeometry("eyelid"));
  assert.ok(arcs.length >= 2, "joyful arcs in the lid colour");
  // The toon eyes move: a gaze prop slides each iris (the white stays), and both go the same way on screen.
  const irisOf = (eyeGroup) => eyeGroup.children.find((c) => c.material === material("bao_iris", "toy"));
  const centreX = (mesh) => {
    mesh.geometry.computeBoundingBox();
    return mesh.localToWorld(mesh.geometry.boundingBox.getCenter(new THREE.Vector3())).x;
  };
  const eyesNow = m.group.children[0].children[0].children[0].children.filter((c) => c.userData.gaze);
  assert.equal(eyesNow.length, 2, "two toon eyes with a gaze");
  m.group.updateMatrixWorld(true);
  const at = (g) => {
    m.update(4, { eyes: 1, feeling: "happy", feelingFrom: "happy", feelAt: -1, gaze: g }, {});
    m.group.updateMatrixWorld(true);
    return eyesNow.map((e) => centreX(irisOf(e)));
  };
  const L = at([1, 0]), R = at([-1, 0]);
  for (let i = 0; i < 2; i++) assert.ok(L[i] > R[i] + 0.02, `eye ${i}: gaze left (+x) moves its iris that way`);
  // The long arms end in a hand with three fingers and a thumb.
  const armParts = model.parts.filter((p) => p.name === "arm");
  assert.ok(armParts.length >= 6, "arm, palm, three fingers, thumb");
  assert.ok(Math.min(...armParts.map((p) => p.hang[1])) < -0.3, "a long arm");
  // Sub-targets: an arm lifts both copies, the head tilts the face and the top of the bun together.
  m.update(1, { eyes: 1 }, { "bao#arm": { rotation: [0, 0, 40] }, "bao#head": { rotation: [10, 0, 0] } });
  const arm = m.named.get("arm");
  const armRest = model.parts.find((p) => p.name === "arm").r;
  assert.ok(Math.abs(arm.rotation.z - (armRest[2] + 40) * Math.PI / 180) < 0.1);
  const head = m.named.get("head");
  assert.ok(head.children.some((c) => c.children[0]?.geometry === shapeGeometry("bao_head")), "bun top rides on the head");
  // The collar is its own part: dropping it from the model still builds.
  const bare = { ...model, parts: model.parts.filter((p) => p.name !== "collar") };
  assert.equal(buildModel(o, bare, material).named.get("collar"), undefined);
});
