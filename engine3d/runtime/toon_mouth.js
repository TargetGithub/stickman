// A 3D toon mouth (DumpyDoo), talking the bouncy Minion way: an opening in the face you can see into, with soft
// rolled lips round it. The jaw lowers the bottom lip; while speaking the mouth also squashes and stretches (taller
// means narrower), the top lip lifts, and each vowel shapes it: round "oo" pulls the corners in to an O, wide
// "ee" stretches it flat. Behind the opening a lit cavity gives depth, upper teeth sit under the top lip and a
// rounded tongue rides the jaw. The head is not cut: a mask in the opening's shape marks its pixels in the
// stencil buffer, and the cavity, teeth and tongue draw only there, the cavity overwriting the face's depth so
// the teeth and tongue sort against it; the lips draw last, over the opening's edge.
// Frame: width 1 (scale by the mouth's size), the lip corners at (±0.5, 0) at rest, +z out of the face.
// Geometry depends only on (open, shape, talk): no randomness.

import * as THREE from "three";

/** The mouth's shape: top lip dip, how deep the bottom lip hangs shut and fully open, teeth size, lip thickness. */
export const MOUTH = { dip: 0.11, shut: 0.03, deep: 0.42, teethHalf: 0.22, teethTall: 0.03, lip: 0.024 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * The mouth's outline for a pose: its half width and the top and bottom lip at u (-1 one corner .. 1 the other).
 * open: 0 a thin closed smile .. 1 the full grin; shape: -1 wide "ee" .. 0 "ah" .. 1 round "oo"; talk: 0 at rest
 * .. 1 speaking (adds the squash and stretch and the lifting top lip). At rest (open 1, shape 0, talk 0) it is the
 * plain grin.
 */
export function mouthOutline(open, shape = 0, talk = 0) {
  const o = clamp(open, 0, 1), R = clamp(shape, 0, 1), E = clamp(-shape, 0, 1), k = clamp(talk, 0, 1);
  const half = 0.5 * (1 - 0.34 * R + 0.08 * E) * (1 - 0.1 * o * k);
  const dip = MOUTH.dip * (1 - R) - 0.05 * R; // an O arches its top lip
  const lift = 0.035 * o * k; // the top lip rises a little as the mouth opens to speak
  const deep = (MOUTH.shut + (MOUTH.deep - MOUTH.shut) * o) * (1 + 0.2 * R - 0.3 * E);
  const p = 0.7 - 0.15 * R; // rounder bottom for an O
  const top = (u) => (-dip + lift) * (1 - u * u);
  const bottom = (u) => top(u) - deep * Math.max(0, 1 - u * u) ** p;
  return { half, top, bottom };
}

/** The top lip at x (-0.5..0.5) of the resting grin. */
export const topLip = (x) => mouthOutline(1).top(2 * x);

/** The bottom lip at x of the plain (not speaking, "ah") mouth at openness `open`. */
export const bottomLip = (x, open) => mouthOutline(open).bottom(2 * x);

let stencilRef = 0;

/** A material copy that draws only where this mouth's mask marked the stencil. */
function inside(base, ref, extra = {}) {
  const m = base.clone();
  Object.assign(m, { stencilWrite: true, stencilRef: ref, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp }, extra);
  return m;
}

/** An indexed grid of `a` x `b` points (rows of b), closed round the b direction when `wrap`; no faces join row
 * `cut` to the next (two strips in one geometry). */
function grid(a, b, wrap, cut = -1) {
  const idx = [];
  for (let i = 0; i < a - 1; i++) {
    if (i === cut) continue;
    for (let j = 0; j < (wrap ? b : b - 1); j++) {
      const p = i * b + j, q = i * b + ((j + 1) % b);
      idx.push(p, p + b, q, q, p + b, q + b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(a * b * 3), 3));
  g.setIndex(idx);
  return g;
}

/**
 * The 3D mouth as a group (scaled by size, placed at `at`, tilted `tilt` degrees about x to lie on the face).
 * Its `material` is the mouth colour (for other feelings' mouths). userData.setShape(open, shape, talk) poses it;
 * setOpen(open) is setShape(open, 0, 0).
 * @param {{ at:number[], size:number, tilt?:number, color?:string, tongue?:string, lip?:string, bend?:number }} spec
 *   bend: how fast the face curves away from the mouth's middle (z drop = bend * x², in mouth widths)
 * @param {(color:string, style:string) => THREE.Material} paint
 */
export function createMouth3d(spec, paint) {
  const ref = (stencilRef % 255) + 1;
  stencilRef++;
  const bend = spec.bend ?? 0.3;
  const face = (x) => -bend * x * x;
  const g = new THREE.Group();
  g.position.set(...spec.at);
  g.rotation.x = ((spec.tilt ?? 0) * Math.PI) / 180;
  g.scale.setScalar(spec.size);
  g.material = paint(spec.color ?? "mouth", "matte");

  // The mask: a strip between the lips (columns across, three rows down), well in front: it only marks pixels.
  const cols = 48, rows = 3;
  const maskGeo = grid(cols + 1, rows, false);
  const mask = new THREE.Mesh(maskGeo, new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: ref, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  }));
  mask.renderOrder = 10;

  // The cavity: the inside of a ball behind the opening, drawn over the face (its depth replaces the face's).
  const cavity = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 24), inside(g.material, ref, { side: THREE.BackSide, depthFunc: THREE.AlwaysDepth }));
  cavity.scale.set(1.7, 1.6, 0.9); // wide enough to fill the opening out to its corners from any side
  cavity.position.set(0, -0.15, -0.3);
  cavity.renderOrder = 11;

  // Upper teeth: a soft curved bar under the resting top lip, its top tucked above the lip line (the mask cuts
  // it); it follows the top lip as it lifts and the mouth narrows.
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
  for (let i = 0; i < tp.count; i++) tp.setZ(i, tp.getZ(i) - 0.035 + face(tp.getX(i)));
  teethGeo.computeVertexNormals();
  const teeth = new THREE.Mesh(teethGeo, inside(paint("white", "toy"), ref));
  teeth.renderOrder = 12;

  // The tongue: a rounded mound on the floor of the mouth, riding the jaw.
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 20), inside(paint(spec.tongue ?? "rose", "toy"), ref));
  tongue.scale.set(0.58, 0.36, 0.3);
  tongue.renderOrder = 12;

  // Lips: two soft rolled tubes along the top and bottom edges, thinning to the corners (drawn after the cavity,
  // so they sit over the opening's edge).
  const along = 40, round = 10;
  const lipGeo = grid(2 * (along + 1), round, true, along); // two tubes: not joined corner to corner
  const lips = new THREE.Mesh(lipGeo, paint(spec.lip ?? spec.skin ?? "white", "dough"));
  lips.renderOrder = 13;

  g.add(mask, cavity, teeth, tongue, lips);
  for (const m of [mask, cavity, teeth, tongue, lips]) {
    m.castShadow = m.receiveShadow = false;
    m.frustumCulled = false;
  }

  const restTop = topLip(0);
  const mp = maskGeo.attributes.position, lp = lipGeo.attributes.position;
  /** Pose the mouth: open 0..1, shape -1 "ee" .. 1 "oo", talk 0 rest .. 1 speaking. */
  g.userData.setShape = (open, shape = 0, talk = 0) => {
    const { half, top, bottom } = mouthOutline(open, shape, talk);
    for (let i = 0; i <= cols; i++) {
      const u = -1 + (2 * i) / cols, x = u * half;
      for (let r = 0; r < rows; r++) mp.setXYZ(i * rows + r, x, top(u) + ((bottom(u) - top(u)) * r) / (rows - 1), 0.09 + face(x));
    }
    mp.needsUpdate = true;
    // Each lip: rings of `round` points round its edge, the tube bulging out of the face and away from the hole.
    for (const [edge, side, base] of [[top, 1, 0], [bottom, -1, along + 1]]) {
      for (let i = 0; i <= along; i++) {
        const u = -1 + (2 * i) / along, x = u * half, y = edge(u);
        const du = 1e-3, dy = (edge(u + du) - edge(u - du)) / (2 * du * half);
        const len = Math.hypot(1, dy);
        const nx = (-dy / len) * side, ny = (1 / len) * side; // away from the opening
        const r = MOUTH.lip * (0.3 + 0.7 * Math.sqrt(Math.max(0, 1 - u * u)));
        const cx = x + nx * r * 0.35, cy = y + ny * r * 0.35, cz = face(x) + r * 0.25;
        for (let j = 0; j < round; j++) {
          const a = (j / round) * Math.PI * 2;
          lp.setXYZ((base + i) * round + j, cx + nx * r * Math.cos(a), cy + ny * r * Math.cos(a), cz + r * Math.sin(a));
        }
      }
    }
    lp.needsUpdate = true;
    lipGeo.computeVertexNormals();
    teeth.position.y = top(0) - restTop;
    teeth.scale.x = 2 * half;
    // The tongue sinks as the jaw shuts, so a half-shut mouth shows it only in the lower half.
    tongue.position.set(0, bottom(0) - 0.18 + 0.27 * clamp(open, 0, 1), -0.15);
    Object.assign(g.userData, { open, shape, talk });
  };
  g.userData.setOpen = (open) => g.userData.setShape(open, 0, 0);
  g.userData.setOpen(1);
  return g;
}
