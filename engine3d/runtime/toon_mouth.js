// A 3D toon mouth (Bao Buddy): an opening in the face you can see into. The top lip stays put; the jaw lowers the
// bottom lip as the mouth opens. Behind the opening a lit cavity gives it depth, a row of upper teeth sits just
// under the top lip, and a rounded tongue rides on the jaw (it moves, it never shrinks). The head is not cut:
// a mask in the opening's shape marks its pixels in the stencil buffer, and the cavity, teeth and tongue draw
// only there, the cavity overwriting the face's depth so the teeth and tongue sort against it.
// Frame: width 1 (scale by the mouth's size), the lip corners at (±0.5, 0), +z out of the face.
// Geometry only depends on `open` (0 a thin closed smile .. 1 the full grin): no randomness.

import * as THREE from "three";

/** The mouth's shape: top lip dip, how deep the bottom lip hangs when shut and when fully open, teeth size. */
export const MOUTH = { dip: 0.11, shut: 0.03, deep: 0.42, teethHalf: 0.22, teethTall: 0.03 };

/** The top lip at x (-0.5..0.5): a curve dipping MOUTH.dip in the middle, up at the corners. */
export const topLip = (x) => -4 * MOUTH.dip * (0.25 - x * x);

/** The bottom lip at x for openness `open` (0..1): a round U hanging under the top lip, meeting it at the corners. */
export function bottomLip(x, open) {
  const d = MOUTH.shut + (MOUTH.deep - MOUTH.shut) * Math.min(1, Math.max(0, open));
  return topLip(x) - d * Math.max(0, 1 - 4 * x * x) ** 0.7;
}

let stencilRef = 0;

/** A material copy that draws only where this mouth's mask marked the stencil. */
function inside(base, ref, extra = {}) {
  const m = base.clone();
  Object.assign(m, { stencilWrite: true, stencilRef: ref, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp }, extra);
  return m;
}

/**
 * The 3D mouth as a group (scaled by size, placed at `at`, tilted `tilt` degrees about x to lie on the face).
 * Its `material` is the mouth colour (for other feelings' mouths); userData.setOpen(open) moves the jaw.
 * @param {{ at:number[], size:number, tilt?:number, color?:string, tongue?:string, bend?:number }} spec
 *   bend: how fast the face curves away from the mouth's middle (z drop = bend * x², in mouth widths)
 * @param {(color:string, style:string) => THREE.Material} paint
 */
export function createMouth3d(spec, paint) {
  const ref = (stencilRef % 255) + 1;
  stencilRef++;
  const bend = spec.bend ?? 0.3;
  const g = new THREE.Group();
  g.position.set(...spec.at);
  g.rotation.x = ((spec.tilt ?? 0) * Math.PI) / 180;
  g.scale.setScalar(spec.size);
  g.material = paint(spec.color ?? "mouth", "matte");

  // The mask: a strip between the lips (columns across, three rows down), on the face just in front of it.
  const cols = 48, rows = 3;
  const pos = new Float32Array((cols + 1) * rows * 3);
  const idx = [];
  for (let i = 0; i < cols; i++) {
    for (let r = 0; r < rows - 1; r++) {
      const a = i * rows + r, b = (i + 1) * rows + r;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const maskGeo = new THREE.BufferGeometry();
  maskGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  maskGeo.setIndex(idx);
  const mask = new THREE.Mesh(maskGeo, new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: ref, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  }));
  mask.renderOrder = 10;
  mask.frustumCulled = false;

  // The cavity: the inside of a ball behind the opening, drawn over the face (its depth replaces the face's).
  const cavity = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 24), inside(g.material, ref, { side: THREE.BackSide, depthFunc: THREE.AlwaysDepth }));
  cavity.scale.set(1.6, 1.15, 0.7); // wide enough to fill the opening out to its corners from any side
  cavity.position.set(0, -0.22, -0.25);
  cavity.renderOrder = 11;

  // Upper teeth: a soft curved bar following the top lip, its top tucked above the lip line (the mask cuts it).
  const teethShape = new THREE.Shape();
  const n = 24, h = MOUTH.teethHalf;
  for (let i = 0; i <= n; i++) {
    const x = -h + (2 * h * i) / n;
    i ? teethShape.lineTo(x, topLip(x) + 0.03) : teethShape.moveTo(x, topLip(x) + 0.03);
  }
  for (let i = n; i >= 0; i--) {
    const x = -h + (2 * h * i) / n;
    teethShape.lineTo(x, topLip(x) + 0.03 - (MOUTH.teethTall + 0.03) * (0.2 + 0.8 * Math.cos((Math.PI * x) / (2 * h)) ** 0.45)); // tapering to rounded ends
  }
  const teethGeo = new THREE.ExtrudeGeometry(teethShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 4 });
  const tp = teethGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setZ(i, tp.getZ(i) - 0.035 - bend * tp.getX(i) ** 2);
  teethGeo.computeVertexNormals();
  const teeth = new THREE.Mesh(teethGeo, inside(paint("white", "toy"), ref));
  teeth.renderOrder = 12;

  // The tongue: a rounded mound on the floor of the mouth, riding down with the jaw.
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 20), inside(paint(spec.tongue ?? "rose", "toy"), ref));
  tongue.scale.set(0.58, 0.36, 0.3);
  tongue.renderOrder = 12;

  g.add(mask, cavity, teeth, tongue);
  for (const m of [mask, cavity, teeth, tongue]) m.castShadow = m.receiveShadow = false;

  /** Move the jaw: 0 a thin closed smile .. 1 the full grin. */
  g.userData.setOpen = (open) => {
    for (let i = 0; i <= cols; i++) {
      const x = -0.5 + i / cols;
      const top = topLip(x), bottom = bottomLip(x, open);
      for (let r = 0; r < rows; r++) {
        const y = top + ((bottom - top) * r) / (rows - 1);
        pos.set([x, y, 0.09 - bend * x * x], (i * rows + r) * 3); // well in front: it only marks pixels
      }
    }
    maskGeo.attributes.position.needsUpdate = true;
    const floor = bottomLip(0, open);
    // Sinks as the jaw shuts, so a half-shut mouth shows it only in the lower half.
    tongue.position.set(0, floor - 0.18 + 0.27 * Math.min(1, Math.max(0, open)), -0.15);
    g.userData.open = open;
  };
  g.userData.setOpen(1);
  return g;
}
