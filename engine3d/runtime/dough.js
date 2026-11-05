// Dough character shapes (Bao Buddy): an onion-shaped steamed bun whose top gathers in soft twisting pleats to
// a pinched knot, cut at the collar into a head and a belly that overlap (so the head can tilt without a gap), a
// ruched top knot, an upright leaf collar band with a rolled lip, cupped leaf flaps, a thin arched brow and a
// cartoon upper-lid line. All closed-form: no randomness. geometry.js registers them by name (DOUGH_SHAPES).
// Browser and Node (three.js only, no canvas).

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;

/**
 * Profile of the bun, [radius, height] with height 0 (bottom) .. 1 (top), measured off the reference: a round
 * belly, a tuck at the collar, widest just above it, an onion top drawn in to a pinch under the knot.
 */
export const BAO_PROFILE = [[0, 0], [0.22, 0.015], [0.31, 0.045], [0.36, 0.1], [0.39, 0.18], [0.4, 0.24], [0.42, 0.28], [0.455, 0.33], [0.478, 0.39], [0.488, 0.46], [0.49, 0.53], [0.48, 0.6], [0.46, 0.68], [0.425, 0.75], [0.35, 0.82], [0.27, 0.88], [0.19, 0.93], [0.115, 0.965], [0.065, 0.99], [0, 1]];
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
 * dome reaching `cap` past the cut, so a head and a belly cut at the collar overlap inside it. Not centred:
 * the whole bun spans y -0.5 .. 0.5 at unit scale, so both pieces share one centre and scale.
 */
export function baoBody(lo = 0, hi = 1, cap = 0.08) {
  const rows = 180;
  const list = [];
  const q = (k) => (k / 8) * (Math.PI / 2);
  if (lo > 0) for (let k = 0; k <= 8; k++) list.push({ y: lo, dome: -cap * Math.cos(q(k)), s: Math.sin(q(k)) });
  for (let i = lo > 0 ? 1 : 0; i <= rows; i++) list.push({ y: lo + ((hi - lo) * i) / rows, dome: 0, s: 1 });
  if (hi < 1) for (let k = 7; k >= 0; k--) list.push({ y: hi, dome: cap * Math.cos(q(k)), s: Math.sin(q(k)) });
  const g = revolve(list.length, (i, a) => {
    const { y, dome, s } = list[i];
    return [baoRadius(y) * (1 - baoPleat(a, y)) * s, y + dome - 0.5];
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

/**
 * The leaf collar band: an upright glossy band hugging a round body (top radius 0.5 at y = 0, 0.1 deep), bulging
 * a little, dipping in front, with a seam where one end of the leaf overlaps the other (just right of the front,
 * on the wearer's left). Solid from both sides. Not centred: y = 0 is the top edge.
 */
export function leafCollar() {
  const segs = 192, rows = 12;
  const front = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // -pi .. pi, 0 in front
  const vee = (a) => Math.max(0, 1 - Math.abs(front(a)) / 0.32) ** 1.5;
  const lap = (a) => THREE.MathUtils.smoothstep(front(a), 0, 0.04) * (1 - THREE.MathUtils.smoothstep(front(a), 0.9, 1.6));
  const at = (t, a, inset) => [0.5 - inset + 0.014 * Math.sin(Math.PI * t) + 0.008 * t + 0.007 * lap(a), -t * (0.1 + 0.02 * vee(a))];
  const outer = revolve(rows + 1, (i, a) => at(i / rows, a, 0), segs);
  const inner = flip(revolve(rows + 1, (i, a) => at(i / rows, a, 0.014), segs));
  // The hem: a strip joining the outer and inner bottom edges.
  const hem = revolve(2, (i, a) => at(1, a, i ? 0.014 : 0), segs);
  return merge([outer, inner, hem]);
}

/** The collar's rolled lip: a thin ring of radius 0.5 lying flat at y = 0 (paint it a lighter green). */
export function collarLip() {
  const g = new THREE.TorusGeometry(0.5, 0.018, 12, 192).rotateX(Math.PI / 2);
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

/** A thin arched eyebrow tapering to points, width 1. */
export function browThin() {
  const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.5, -0.12, 0), new THREE.Vector3(0, 0.26, 0), new THREE.Vector3(0.5, -0.12, 0));
  const tube = new THREE.TubeGeometry(c, 40, 0.075, 10, false);
  const p = tube.attributes.position;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const k = 0.22 + 0.78 * Math.sin(Math.PI * t) ** 0.6;
    const o = c.getPoint(t);
    for (let j = 0; j <= 10; j++) {
      const v = i * 11 + j;
      p.setXYZ(v, o.x + (p.getX(v) - o.x) * k, o.y + (p.getY(v) - o.y) * k, o.z + (p.getZ(v) - o.z) * k);
    }
  }
  tube.computeVertexNormals();
  return tube.center();
}

/** The cartoon eye the lid fits (models.js eyes.lid): the white's half sizes, as shares of the eye's width. */
export const LID_EYE = { rx: 0.5, ry: 0.46, rz: 0.25 };

/**
 * A cartoon upper lid for a LID_EYE eye of width 1: a thick dark line over the top, thickest toward the outer
 * corner (+x), ending in a little flick, plus a thin lower line under the outer half; both hug the eye's front.
 * Mirror it with a negative x scale for the other eye.
 */
export function eyelid() {
  const { rx, ry, rz } = LID_EYE;
  const band = (a0, a1, n, w, lift = 0) => {
    const inner = [], outer = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = a0 + (a1 - a0) * t;
      const k = w(t);
      inner.push([(rx - 0.015) * Math.cos(a), (ry - 0.015) * Math.sin(a) + lift]);
      outer.push([(rx + k) * Math.cos(a), (ry + k) * Math.sin(a) + lift]);
    }
    return [inner, outer];
  };
  const shape = (inner, outer, tip) => {
    const s = new THREE.Shape();
    s.moveTo(...inner[0]);
    for (const q of inner.slice(1)) s.lineTo(...q);
    if (tip) s.lineTo(...tip);
    for (const q of [...outer].reverse()) s.lineTo(...q);
    s.closePath();
    return s;
  };
  const [ui, uo] = band(Math.PI * 0.93, -0.12, 44, (t) => 0.02 + 0.06 * Math.sin(Math.PI * Math.min(1, 0.1 + t)) ** 0.5 * (0.6 + 0.4 * t));
  const [li, lo] = band(-0.3, -1.35, 18, (t) => 0.03 * Math.sin(Math.PI * t));
  const ext = (s, d) => new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 8 });
  const g = mergeGeometries([ext(shape(ui, uo, [rx + 0.15, -0.05]), 0.03), ext(shape(li, lo), 0.015)].map((x) => (x.index ? x.toNonIndexed() : x)));
  // Wrap onto the front of the eye: lift each point to the eye's surface there.
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const e = Math.max(0, 1 - (x / (rx + 0.04)) ** 2 - (y / (ry + 0.04)) ** 2);
    p.setZ(i, p.getZ(i) + rz * Math.sqrt(e) + 0.01);
  }
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

/** A big open grin, width 1: a lip line curving up at the corners, a deep round bottom; puffy, facing +z. */
export function grinWide() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0.1);
  s.quadraticCurveTo(0, -0.12, 0.5, 0.1);
  s.bezierCurveTo(0.6, -0.58, -0.6, -0.58, -0.5, 0.1);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.03, bevelSegments: 6, curveSegments: 32 });
  return g.center();
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
  brow_thin: browThin,
  eyelid,
  grin_wide: grinWide,
};
