// The 3D toon mouth (runtime/toon_mouth.js): the lips meet at the corners and the jaw only moves the bottom lip;
// the opening (stencil mask) follows the jaw while the teeth stay under the top lip and the tongue rides the jaw
// at full size; the inside draws only through this mouth's opening, the cavity over the face's depth.
// Node only (geometry and materials, no canvas).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MOUTH, bottomLip, createMouth3d, mouthOutline, topLip } from "../../runtime/toon_mouth.js";

const near = (a, b, eps, what = "") => assert.ok(Math.abs(a - b) < eps, `${what} ${a} != ${b}`);
const paint = (c) => new THREE.MeshStandardMaterial({ name: c });
const make = () => createMouth3d({ at: [0, 1, 0.4], size: 0.3, tilt: -8, color: "mouth", tongue: "pink" }, paint);
const parts = (m) => {
  const [mask, cavity, teeth, tongue, lips] = m.children;
  return { mask, cavity, teeth, tongue, lips };
};

test("lips: they meet at the corners; the top lip dips in the middle; the bottom lip hangs lower as it opens", () => {
  for (const x of [-0.5, 0.5]) {
    near(topLip(x), 0, 1e-12, `top at ${x}`);
    for (const open of [0, 0.5, 1]) near(bottomLip(x, open), 0, 1e-12, `bottom at ${x}, open ${open}`);
  }
  near(topLip(0), -MOUTH.dip, 1e-12);
  for (const [open, depth] of [[0, MOUTH.shut], [1, MOUTH.deep], [2, MOUTH.deep], [-1, MOUTH.shut]]) near(topLip(0) - bottomLip(0, open), depth, 1e-12, `open ${open}`);
  for (let x = -0.45; x < 0.5; x += 0.05) assert.ok(bottomLip(x, 0.3) < topLip(x), `bottom below top at ${x}`);
});

test("mouthOutline: rest is the plain grin; speaking squashes and stretches; vowels shape it", () => {
  const rest = mouthOutline(1, 0, 0);
  near(rest.half, 0.5, 1e-12);
  for (const u of [-1, -0.5, 0, 0.5, 1]) near(rest.top(u), topLip(u / 2), 1e-12, `rest top at ${u}`);
  const deep = (o) => o.top(0) - o.bottom(0);
  // Speaking and opening: narrower (taller means narrower) and the top lip lifts.
  const talkOpen = mouthOutline(1, 0, 1);
  assert.ok(talkOpen.half < rest.half && talkOpen.top(0) > rest.top(0));
  // "oo" pulls the corners in and arches the top lip; "ee" stretches it wider and flatter.
  const oo = mouthOutline(0.7, 1, 1), ah = mouthOutline(0.7, 0, 1), ee = mouthOutline(0.7, -1, 1);
  assert.ok(oo.half < ah.half && ah.half < ee.half, "width: oo < ah < ee");
  assert.ok(oo.top(0) > ah.top(0), "an O arches its top lip");
  assert.ok(deep(ee) < deep(ah) && deep(ah) < deep(oo), "depth: ee < ah < oo");
  // Lips always meet at the corners and the bottom stays under the top.
  for (const o of [rest, talkOpen, oo, ah, ee, mouthOutline(0, 0.5, 1)]) {
    for (const u of [-1, 1]) near(o.top(u), o.bottom(u), 1e-9, "corners meet");
    for (let u = -0.9; u < 1; u += 0.1) assert.ok(o.bottom(u) < o.top(u), `bottom under top at ${u}`);
  }
});

test("the mouth group: placed, tilted, sized; a mask, a cavity, teeth, a tongue and lips", () => {
  const m = make();
  assert.deepEqual(m.position.toArray(), [0, 1, 0.4]);
  near(m.rotation.x, (-8 * Math.PI) / 180, 1e-12);
  assert.ok(m.scale.equals(new THREE.Vector3(0.3, 0.3, 0.3)));
  assert.ok(m.material, "a mouth colour for other feelings' mouths");
  assert.equal(m.children.length, 5);
  assert.equal(m.userData.open, 1, "rests wide open");
});

test("stencil: the mask marks this mouth's pixels unseen; the inside draws only there, the cavity over the face", () => {
  const a = make(), b = make();
  const { mask, cavity, teeth, tongue } = parts(a);
  assert.equal(mask.material.colorWrite, false);
  assert.equal(mask.material.depthWrite, false);
  assert.equal(mask.material.stencilZPass, THREE.ReplaceStencilOp);
  const ref = mask.material.stencilRef;
  assert.notEqual(parts(b).mask.material.stencilRef, ref, "each mouth its own mark");
  for (const x of [cavity, teeth, tongue]) {
    assert.equal(x.material.stencilWrite, true);
    assert.equal(x.material.stencilFunc, THREE.EqualStencilFunc);
    assert.equal(x.material.stencilRef, ref);
    assert.ok(x.renderOrder > mask.renderOrder, "drawn after the mask");
    assert.equal(x.castShadow, false);
  }
  assert.equal(cavity.material.depthFunc, THREE.AlwaysDepth, "the cavity replaces the face's depth in the opening");
  assert.equal(cavity.material.side, THREE.BackSide, "its inside shows");
  assert.ok(cavity.renderOrder < teeth.renderOrder && cavity.renderOrder < tongue.renderOrder);
  const { lips } = parts(a);
  assert.equal(lips.material.stencilWrite, false, "the lips draw everywhere, over the opening's edge");
  assert.ok(lips.renderOrder > cavity.renderOrder, "after the cavity");
});

test("lips: two rolled tubes along the edges, never joined across the mouth, following its shape", () => {
  const m = make();
  const { lips } = parts(m);
  m.userData.setShape(0.8, 1, 1);
  const o = mouthOutline(0.8, 1, 1);
  const p = lips.geometry.attributes.position;
  // Every lip point sits within a lip's thickness of the top or bottom edge.
  const edge = [];
  for (let k = 0; k <= 400; k++) {
    const u = -1 + k / 200;
    edge.push([u * o.half, o.top(u)], [u * o.half, o.bottom(u)]);
  }
  for (let i = 0; i < p.count; i += 3) {
    const x = p.getX(i), y = p.getY(i);
    const d = Math.min(...edge.map(([ex, ey]) => Math.hypot(x - ex, y - ey)));
    assert.ok(d < MOUTH.lip * 1.5, `lip point ${i} is ${d} from an edge`);
  }
  // No face spans from one corner to the other (the two tubes are apart).
  const ix = lips.geometry.index.array;
  for (let i = 0; i < ix.length; i += 3) {
    const xs = [0, 1, 2].map((k) => p.getX(ix[i + k]));
    assert.ok(Math.max(...xs) - Math.min(...xs) < 0.2, `face ${i / 3} spans ${Math.max(...xs) - Math.min(...xs)}`);
  }
  assert.deepEqual([m.userData.open, m.userData.shape, m.userData.talk], [0.8, 1, 1]);
});

test("the jaw: the opening follows it, the teeth stay, the tongue rides it at full size", () => {
  const m = make();
  const { mask, teeth, tongue } = parts(m);
  const box = () => (mask.geometry.computeBoundingBox(), mask.geometry.boundingBox.clone());
  const teethAt = Array.from(teeth.geometry.attributes.position.array);
  const tongueScale = tongue.scale.clone();
  const rows = [];
  for (const open of [1, 0.6, 0.2, 0]) {
    m.userData.setOpen(open);
    const b = box();
    near(b.max.y, 0, 1e-6, "the corners stay at the top");
    near(b.min.y, bottomLip(0, open), 1e-6, `opening reaches the bottom lip at ${open}`);
    rows.push([b.min.y, tongue.position.y]);
    assert.deepEqual(Array.from(teeth.geometry.attributes.position.array), teethAt, "teeth never move");
    assert.ok(tongue.scale.equals(tongueScale), "the tongue never shrinks");
  }
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i][0] > rows[i - 1][0], "shutting raises the bottom lip");
    assert.ok(rows[i][1] > rows[i - 1][1], "and the tongue with it");
  }
  // The teeth hang just under the top lip, about MOUTH.teethHalf either side of the middle.
  teeth.geometry.computeBoundingBox();
  const t = teeth.geometry.boundingBox;
  near(t.max.x, MOUTH.teethHalf, 0.02);
  assert.ok(t.max.y > topLip(0) && t.min.y < topLip(0), "straddling the lip line (the opening cuts the top off)");
});
