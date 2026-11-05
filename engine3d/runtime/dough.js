// Dough character shapes (Bao Buddy): a teardrop steamed bun whose pleats twist up into a pinched top, cut at
// the collar into a head and a belly that overlap (so the head can tilt without a gap), a ruched top knot, a
// leaf collar with side flaps, a thin arched brow and a cartoon upper-lid line. All closed-form: no randomness.
// geometry.js registers them by name. Browser and Node (three.js only, no canvas).

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;

/** Teardrop profile of the bun, [radius, height] with height 0 (bottom) .. 1 (top); widest just above the collar. */
export const BAO_PROFILE = [[0, 0], [0.2, 0.02], [0.33, 0.06], [0.385, 0.12], [0.4, 0.2], [0.405, 0.26], [0.44, 0.31], [0.472, 0.38], [0.482, 0.47], [0.475, 0.54], [0.455, 0.62], [0.42, 0.71], [0.37, 0.79], [0.3, 0.87], [0.21, 0.93], [0.12, 0.97], [0.06, 0.99], [0, 1]];
/** Where the collar sits, as a share of the bun's height. */
export const BAO_COLLAR = 0.3;

const curve = new THREE.SplineCurve(BAO_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)));
const samples = curve.getSpacedPoints(400);

/** The bun's radius at height y (0..1), before pleats. */
export function baoRadius(y) {
  if (y <= 0 || y >= 1) return 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) return a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
  }
  return 0;
}

/** A groove profile: 1 in the middle of each of n grooves round the circle, falling to 0 between them. */
export function groove(a, n, width = 0.12) {
  const f = (a / TAU) * n;
  const d = Math.abs(f - Math.round(f)); // 0 .. 0.5
  return Math.exp(-((d / width) ** 2));
}

/** How far in the bun's surface is pushed at angle a, height y: twisting pleats up top, soft folds low down. */
export function baoPleat(a, y) {
  const up = Math.max(0, (y - 0.42) / 0.58); // 0 just above the collar, 1 at the top
  const pleats = 0.14 * up ** 1.3 * groove(a + up * 1.1, 14, 0.09);
  const low = Math.max(0, 1 - Math.abs(y - 0.13) / 0.11);
  const folds = 0.03 * low * groove(a + 0.2, 11, 0.16);
  return pleats + folds;
}

/**
 * A surface of revolution from rings: ring(i) gives [radius at angle a, y] for each ring, shared vertices round
 * the seam so the normals stay smooth. Poles (radius 0) are fine.
 */
function revolve(rings, ringAt, segments) {
  const pos = [];
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = (j / segments) * TAU;
      const [r, y] = ringAt(i, a);
      pos.push(r * Math.sin(a), y, r * Math.cos(a));
    }
  }
  const idx = [];
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * segments + j, b = i * segments + ((j + 1) % segments);
      const c = a + segments, d = b + segments;
      idx.push(a, b, d, a, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * The bun, or a band of it between heights lo and hi (shares of its height). A cut end is closed by a soft
 * dome reaching `cap` past the cut, so a head and a belly cut at the collar overlap inside it. Not centred:
 * the whole bun spans y -0.5 .. 0.5 at unit scale, so both pieces share one centre and scale.
 */
export function baoBody(lo = 0, hi = 1, cap = 0.08) {
  const rows = 160;
  const list = [];
  if (lo > 0) for (let k = 0; k <= 8; k++) list.push({ y: lo, dome: -cap * Math.cos((k / 8) * (Math.PI / 2)), s: Math.sin((k / 8) * (Math.PI / 2)) });
  for (let i = lo > 0 ? 1 : 0; i <= rows; i++) list.push({ y: lo + ((hi - lo) * i) / rows, dome: 0, s: 1 });
  if (hi < 1) for (let k = 7; k >= 0; k--) list.push({ y: hi, dome: cap * Math.cos((k / 8) * (Math.PI / 2)), s: Math.sin((k / 8) * (Math.PI / 2)) });
  const g = revolve(list.length, (i, a) => {
    const { y, dome, s } = list[i];
    const r = baoRadius(y) * (1 - baoPleat(a, y)) * s;
    return [r, y + dome - 0.5];
  }, 128);
  g.computeBoundingBox();
  return g;
}

/** The top knot: a small ruched ball of dough, seven soft lobes twisting in to a dimple on top, 1 wide. */
export function baoKnot() {
  const rows = 48;
  const g = revolve(rows + 1, (i, a) => {
    const v = i / rows; // 0 bottom .. 1 top
    const th = v * Math.PI;
    const top = Math.max(0, v - 0.35) / 0.65;
    const r = 0.5 * Math.sin(th) * (1 - 0.13 * top * groove(a + top * 0.6, 7, 0.16));
    const y = -0.5 * Math.cos(th) * 0.92 - 0.06 * Math.max(0, v - 0.9) / 0.1;
    return [r, y];
  }, 96);
  return g.center();
}

/**
 * A leaf collar: a band hugging a round body (top radius 0.5, at y = 0), flaring a little, with a leaf flap
 * sticking out at each side (pointed tips), a soft scalloped hem, a V where the leaves meet in front and a rolled
 * lip round the top. Solid from both sides. Not centred: y = 0 is the top edge.
 */
export function leafCollar() {
  const segs = 160, rows = 14;
  const flapAt = 1.4; // radians from the front
  const flap = (a) => {
    let f = 0;
    for (const s of [1, -1]) {
      const d = Math.abs(Math.atan2(Math.sin(a - s * flapAt), Math.cos(a - s * flapAt)));
      f += Math.max(0, 1 - d / 0.95) ** 1.5;
    }
    return f;
  };
  const vee = (a) => Math.max(0, 1 - Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) / 0.35);
  const hem = (a) => 0.11 + 0.012 * Math.cos(a * 9) + 0.035 * vee(a) + 0.06 * flap(a);
  const band = revolve(rows + 1, (i, a) => {
    const t = i / rows;
    const out = flap(a);
    return [0.5 + t * (0.035 + 0.13 * out * t), -t * hem(a) - 0.02 * out * t * t];
  }, segs);
  // twoSided needs it in geometry.js; build the inside here the same way, an inset copy facing in.
  const inner = revolve(rows + 1, (i, a) => {
    const t = i / rows;
    const out = flap(a);
    return [0.488 + t * (0.035 + 0.13 * out * t), -t * hem(a) - 0.02 * out * t * t - 0.01];
  }, segs);
  flip(inner);
  const lip = new THREE.TorusGeometry(0.497, 0.016, 10, segs).rotateX(Math.PI / 2);
  const g = mergeGeometries([band, inner, lip].map((x) => (x.index ? x.toNonIndexed() : x)).map((x) => {
    x.deleteAttribute("uv");
    return x;
  }));
  g.computeBoundingBox();
  return g;
}

/** Turn an indexed geometry inside out (faces and normals). */
function flip(g) {
  const ix = g.index.array;
  for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
  g.computeVertexNormals();
}

/** A thin arched eyebrow tapering to points, width 1 (Bao Buddy's brows). */
export function browThin() {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.5, -0.12, 0), new THREE.Vector3(0, 0.26, 0), new THREE.Vector3(0.5, -0.12, 0));
  const tube = new THREE.TubeGeometry(curve, 40, 0.07, 10, false);
  // Taper: pull each ring toward the curve near the ends.
  const p = tube.attributes.position;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const k = 0.25 + 0.75 * Math.sin(Math.PI * t) ** 0.6;
    const c = curve.getPoint(t);
    for (let j = 0; j <= 10; j++) {
      const v = i * 11 + j;
      p.setXYZ(v, c.x + (p.getX(v) - c.x) * k, c.y + (p.getY(v) - c.y) * k, c.z + (p.getZ(v) - c.z) * k);
    }
  }
  tube.computeVertexNormals();
  return tube.center();
}

/**
 * A cartoon upper lid: a thick dark line over the top of an eye (unit eye: 1 wide, 1.12 tall, front at z ~0.31),
 * thickest toward the outer corner (+x), ending in a little flick, hugging the eye's front. Mirror it with a
 * negative x scale for the other eye. With lower: a thin line under the outer half too.
 */
export function eyelid(lower = true) {
  const rx = 0.5, ry = 0.56;
  const shape = new THREE.Shape();
  const n = 40;
  const a0 = Math.PI * 0.86, a1 = -0.1; // inner end .. outer end (angles on the eye outline)
  const outer = [], inner = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + (a1 - a0) * t;
    const w = 0.03 + 0.11 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.7 * (0.55 + 0.45 * t);
    inner.push([(rx - 0.02) * Math.cos(a), (ry - 0.02) * Math.sin(a)]);
    outer.push([(rx + w) * Math.cos(a), (ry + w) * Math.sin(a)]);
  }
  shape.moveTo(...inner[0]);
  for (const q of inner.slice(1)) shape.lineTo(...q);
  shape.lineTo(rx + 0.16, -0.02); // the flick
  for (const q of outer.reverse()) shape.lineTo(...q);
  shape.closePath();
  const parts = [new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2, curveSegments: 8 })];
  if (lower) {
    const s = new THREE.Shape();
    const m = 16, b0 = -0.35, b1 = -1.25;
    const lo = [], hi = [];
    for (let i = 0; i <= m; i++) {
      const a = b0 + (b1 - b0) * (i / m);
      const w = 0.035 * Math.sin(Math.PI * (i / m));
      hi.push([(rx - 0.01) * Math.cos(a), (ry - 0.01) * Math.sin(a)]);
      lo.push([(rx + w) * Math.cos(a), (ry + w) * Math.sin(a)]);
    }
    s.moveTo(...hi[0]);
    for (const q of hi.slice(1)) s.lineTo(...q);
    for (const q of lo.reverse()) s.lineTo(...q);
    s.closePath();
    parts.push(new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: false }));
  }
  const g = mergeGeometries(parts.map((x) => (x.index ? x.toNonIndexed() : x)));
  // Wrap onto the front of the eye: lift each point to the eye's surface there (the eye is 0.31 deep).
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const e = Math.max(0, 1 - (x / 0.56) ** 2 - (y / 0.62) ** 2);
    p.setZ(i, p.getZ(i) + 0.31 * Math.sqrt(e) + 0.02);
  }
  g.computeVertexNormals();
  return g;
}

/** Shapes this module adds, by catalog name. */
export const DOUGH_SHAPES = {
  bao_drop: () => baoBody(0, 1),
  bao_head: () => baoBody(BAO_COLLAR - 0.02, 1, 0.1),
  bao_belly: () => baoBody(0, BAO_COLLAR + 0.03, 0.12),
  bao_knot: baoKnot,
  leaf_collar: leafCollar,
  brow_thin: browThin,
  eyelid: () => eyelid(true),
};
