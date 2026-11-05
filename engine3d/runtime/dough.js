// Dough character shapes (Bao Buddy): an onion-shaped steamed bun whose top gathers in soft twisting pleats to
// a pinched knot, cut at the collar into a head and a belly that overlap (so the head can tilt without a gap), a
// ruched top knot, an upright leaf collar band with a rolled lip, cupped leaf flaps, a thin arched brow and a
// cartoon upper-lid line. All closed-form: no randomness. geometry.js registers them by name (DOUGH_SHAPES).
// Browser and Node (three.js only, no canvas).

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TOON_SHAPES } from "./toon_face.js";

const TAU = Math.PI * 2;

/**
 * Profile of the bun, [radius, height] with height 0 (bottom) .. 1 (top), measured off the reference: a round
 * belly, a tuck at the collar, widest just above it, an onion top drawn in to a pinch under the knot.
 */
export const BAO_PROFILE = [[0, 0], [0.22, 0.015], [0.31, 0.045], [0.36, 0.1], [0.39, 0.18], [0.4, 0.24], [0.42, 0.28], [0.455, 0.33], [0.478, 0.39], [0.488, 0.46], [0.487, 0.52], [0.47, 0.6], [0.44, 0.68], [0.4, 0.745], [0.35, 0.8], [0.28, 0.86], [0.21, 0.91], [0.15, 0.95], [0.105, 0.978], [0.075, 0.995], [0, 1]];
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

/**
 * How far in the bun's surface is pushed (a share of its radius) at angle a, height y: broad gathers twisting
 * into the knot over the top (the face below stays smooth) and soft wide folds round the belly.
 */
export function baoPleat(a, y) {
  const up = Math.max(0, (y - 0.6) / 0.4); // 0 at the eyes, 1 at the top
  const pleats = 0.26 * up ** 1.4 * groove(a + up * 0.9, 11, 0.12);
  const low = Math.max(0, 1 - Math.abs(y - 0.13) / 0.12) ** 1.2;
  const folds = 0.022 * low * groove(a + 0.15, 9, 0.2);
  return pleats + folds;
}

/**
 * A surface of revolution from rings: ringAt(i, a) gives [radius at angle a, y] for ring i, with shared vertices
 * round the seam so the normals stay smooth. Poles (radius 0) are fine.
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
  return indexed(pos, idx);
}

function indexed(pos, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Turn an indexed geometry inside out (faces and normals). */
function flip(g) {
  const ix = g.index.array;
  for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
  g.computeVertexNormals();
  return g;
}

const merge = (list) => {
  const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)).map((x) => {
    if (x.attributes.uv) x.deleteAttribute("uv");
    return x;
  }));
  g.computeBoundingBox();
  return g;
};

/**
 * The bun, or a band of it between heights lo and hi (shares of its height). A cut end is closed by a soft
 * dome reaching `cap` past the cut (drawn in, so it stays inside the tight collar band), so a head and a belly
 * cut at the collar overlap inside it. Not centred:
 * the whole bun spans y -0.5 .. 0.5 at unit scale, so both pieces share one centre and scale.
 */
export function baoBody(lo = 0, hi = 1, cap = 0.08) {
  const rows = 180;
  const list = [];
  const q = (k) => (k / 8) * (Math.PI / 2);
  if (lo > 0) for (let k = 0; k <= 8; k++) list.push({ y: lo, dome: -cap * Math.cos(q(k)), s: Math.sin(q(k)) * (k < 8 ? 0.85 : 1) });
  for (let i = lo > 0 ? 1 : 0; i <= rows; i++) list.push({ y: lo + ((hi - lo) * i) / rows, dome: 0, s: 1 });
  if (hi < 1) for (let k = 7; k >= 0; k--) list.push({ y: hi, dome: cap * Math.cos(q(k)), s: Math.sin(q(k)) * 0.85 });
  const g = revolve(list.length, (i, a) => {
    const { y, dome, s } = list[i];
    return [baoRadius(y) * (1 - baoPleat(a, y) - squeeze(y)) * s, y + dome - 0.5];
  }, 144);
  g.computeBoundingBox();
  return g;
}

/** The top knot: a small ruched ball of dough, seven deep lobes twisting in to a dimple on top, 1 wide. */
export function baoKnot() {
  const rows = 48;
  const g = revolve(rows + 1, (i, a) => {
    const v = i / rows; // 0 bottom .. 1 top
    const th = v * Math.PI;
    const top = Math.min(1, Math.max(0, v - 0.15) / 0.6);
    const r = 0.5 * Math.sin(th) * (1 - 0.2 * top * groove(a + v * 0.7, 7, 0.17));
    const y = -0.5 * Math.cos(th) * 0.86 - 0.07 * Math.max(0, v - 0.88) / 0.12;
    return [r, y];
  }, 112);
  return g.center();
}

/** The collar band's bottom and top edges, as shares of the bun's height. */
export const COLLAR_BAND = { lo: 0.255, hi: 0.35 };

/** How much the tight collar squeezes the dough (a share of its radius) at height y: flat under the band, soft edges. */
export function squeeze(y) {
  const mid = (COLLAR_BAND.lo + COLLAR_BAND.hi) / 2;
  return 0.05 * Math.exp(-(((y - mid) / 0.06) ** 4));
}

/** The bun's radius under the collar, squeeze included (pleats and folds are zero there). */
export const hugged = (y) => baoRadius(y) * (1 - squeeze(y));

/** How far the collar band stands off the dough: clear of the overalls' straps tucked under it (bao_clothes.js). */
const COLLAR_OUT = 0.025;

/**
 * The leaf collar band, in the bun's own frame (give it the bun's centre and scale): a tight glossy band over
 * the squeezed dough from COLLAR_BAND.lo to .hi, bulging a little, dipping in front, with a seam where one end
 * of the leaf overlaps the other (just right of the front, on the wearer's left). Solid from both sides.
 */
export function leafCollar() {
  const segs = 192, rows = 14;
  const { lo, hi } = COLLAR_BAND;
  const front = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // -pi .. pi, 0 in front
  const vee = (a) => Math.max(0, 1 - Math.abs(front(a)) / 0.32) ** 1.5;
  const lap = (a) => THREE.MathUtils.smoothstep(front(a), 0, 0.04) * (1 - THREE.MathUtils.smoothstep(front(a), 0.9, 1.6));
  // t: 0 top .. 1 bottom edge; off: how far out from the dough.
  const at = (t, a, off) => {
    const y = hi - t * (hi - lo + 0.02 * vee(a));
    return [hugged(Math.max(lo, y)) + off + (off > 0 ? 0.005 * Math.sin(Math.PI * t) + 0.007 * lap(a) : 0), y - 0.5];
  };
  // Rows run top to bottom, so the outside is flipped to face out and the inside left facing in.
  const outer = flip(revolve(rows + 1, (i, a) => at(i / rows, a, COLLAR_OUT), segs));
  const inner = revolve(rows + 1, (i, a) => at(i / rows, a, -0.004), segs);
  const hem = revolve(2, (i, a) => at(1, a, i ? -0.004 : COLLAR_OUT), segs);
  return merge([outer, inner, hem, flip(hem.clone())]);
}

/** The collar's rolled lip round the band's top edge, in the bun's frame (paint it a lighter green). */
export function collarLip() {
  const { hi } = COLLAR_BAND;
  const n = 16, r = 0.016;
  const g = revolve(n + 1, (i, a) => {
    const f = (i / n) * TAU;
    return [hugged(hi) + COLLAR_OUT - 0.004 + r * Math.cos(f), hi - 0.5 + r * Math.sin(f)];
  }, 192);
  g.computeBoundingBox();
  return g;
}

/**
 * A cupped leaf flap, 1 long down -y from its stem end at the origin, pointed at the tip, 0.62 wide, its faces
 * toward ±x, the edges and tip curling toward +x. Hang it from a collar with rotation z (out) and y (sweep).
 */
export function leafFlap() {
  const nu = 28, nv = 14;
  const width = (u) => Math.sin(Math.PI * (0.14 + 0.86 * u)) ** 0.85;
  const point = (u, v, off) => {
    const w = width(u);
    const cup = 0.1 * (v * w) ** 2 + 0.14 * u * u - 0.018 * (1 - Math.abs(v)) * w; // a faint midrib groove
    return [cup - off, -u, v * w * 0.31];
  };
  const sheet = (off) => {
    const pos = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) pos.push(...point(i / nu, (j / nv) * 2 - 1, off));
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    return indexed(pos, idx);
  };
  const top = sheet(0);
  // Make the +x face the front one whichever way the triangles came out.
  if (top.attributes.normal.getX(Math.floor(top.attributes.normal.count / 2)) < 0) flip(top);
  const under = sheet(0.022);
  if (under.attributes.normal.getX(Math.floor(under.attributes.normal.count / 2)) > 0) flip(under);
  return merge([top, under]);
}

/** The arm's path: from the shoulder (0, 0, 0) down to the wrist (0, -1, 0), bowing forward (+z) like a soft elbow. */
export const ARM_CURVE = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.3, 0.2), new THREE.Vector3(0, -0.65, 0.18), new THREE.Vector3(0, -1, 0));

/**
 * A curvy arm, 1 long (scale it by the arm's length): a tube along ARM_CURVE, a little thinner at the wrist, with
 * round ends. Not centred: the shoulder is at the origin. The bend is front to back, so a mirrored arm matches.
 */
export function baoArm() {
  const n = 40, radial = 14, r0 = 0.145, r1 = 0.125;
  const tube = new THREE.TubeGeometry(ARM_CURVE, n, 1, radial, false);
  const p = tube.attributes.position;
  for (let i = 0; i <= n; i++) {
    const c = ARM_CURVE.getPointAt(i / n);
    const r = r0 + (r1 - r0) * (i / n);
    for (let j = 0; j <= radial; j++) {
      const v = i * (radial + 1) + j;
      p.setXYZ(v, c.x + (p.getX(v) - c.x) * r, c.y + (p.getY(v) - c.y) * r, c.z + (p.getZ(v) - c.z) * r);
    }
  }
  tube.computeVertexNormals();
  const end = (t, r) => new THREE.SphereGeometry(r, 16, 12).translate(...ARM_CURVE.getPointAt(t).toArray());
  return merge([tube, end(0, r0), end(1, r1)]);
}

/** Shapes this module adds, by catalog name. */
export const DOUGH_SHAPES = {
  bao_drop: () => baoBody(0, 1),
  bao_head: () => baoBody(BAO_COLLAR - 0.02, 1, 0.1),
  bao_belly: () => baoBody(0, BAO_COLLAR + 0.03, 0.12),
  bao_knot: baoKnot,
  leaf_collar: leafCollar,
  collar_lip: collarLip,
  leaf_flap: leafFlap,
  bao_arm: baoArm,
  ...TOON_SHAPES,
};
