// DumpyDoo's overalls, Minion style, in the bun's own frame (give each the bun's centre and scale): pants up to
// a waist, a bib in front and a panel behind, and straps running up from them under the collar, so the sides
// stay open and the arms come straight out of the dough. The denim has a twill pattern in its surface (fine
// diagonal ridges that catch the light), gold dashed stitching along its seams and a pocket on the bib.
// All closed-form: no randomness. geometry.js registers them by name (CLOTHES_SHAPES).

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { COLLAR_BAND, hugged } from "./dough.js";

const TAU = Math.PI * 2;

/**
 * The overalls' layout, as shares of the bun's height (y) and angles from the front (radians): the waist, the
 * bib (top, half width), the back panel, the straps (centre angle front and back, half width, how high they go
 * under the collar), the pocket on the bib, how far the denim stands off the dough, and the twill.
 */
export const OVERALLS = {
  waist: 0.12, off: 0.012,
  bibTop: 0.205, bibHalf: 0.6,
  backTop: 0.215, backHalf: 0.85,
  strapFront: 0.45, strapBack: 0.62, strapHalf: 0.085, strapTop: COLLAR_BAND.lo + 0.025,
  pocket: { lo: 0.13, hi: 0.185, half: 0.26 },
  twill: { depth: 0.0018, period: 0.028 },
};

/** The twill: fine diagonal ridges (0 .. 1) at angle a, height y, so the denim is patterned rather than flat. */
export function twill(a, y) {
  const s = (a * 0.45 + y) / OVERALLS.twill.period;
  return 0.5 + 0.5 * Math.cos(TAU * s);
}

/** A point on the denim: on the dough at (a, y), `off` out, plus the twill ridge. */
function onDenim(a, y, off, ridge = true) {
  const r = hugged(Math.max(0, y)) + off + (ridge ? OVERALLS.twill.depth * twill(a, y) : 0);
  return [r * Math.sin(a), y - 0.5, r * Math.cos(a)];
}

/**
 * A slab of cloth over the bun between angles a0..a1 and heights y0..y1 (y1 may depend on the angle): an outer
 * patterned face, a plain inner face a little in, and walls round its edges, so it reads solid from any side.
 */
function slab(a0, a1, y0, y1, off, { cols = 96, rows = 40, thick = 0.006 } = {}) {
  const top = typeof y1 === "function" ? y1 : () => y1;
  const at = (i, j, o, ridge) => {
    const a = a0 + ((a1 - a0) * i) / cols;
    return onDenim(a, y0 + ((top(a) - y0) * j) / rows, o, ridge);
  };
  const sheet = (o, ridge, flipIt) => {
    const pos = [], idx = [];
    for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) pos.push(...at(i, j, o, ridge));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const p = i * (rows + 1) + j, q = p + rows + 1;
        flipIt ? idx.push(p, p + 1, q, q, p + 1, q + 1) : idx.push(p, q, p + 1, q, q + 1, p + 1);
      }
    }
    return indexed(pos, idx);
  };
  // A wall along one edge: (i, j) runs over the edge, joining the outer and inner faces.
  const wall = (list) => {
    const pos = [], idx = [];
    list.forEach(([i, j], k) => {
      pos.push(...at(i, j, off, true), ...at(i, j, off - thick, false));
      if (k) idx.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k, 2 * k - 1, 2 * k + 1);
    });
    const g = indexed(pos, idx);
    return [g, flipped(g)];
  };
  const range = (n, f) => Array.from({ length: n + 1 }, (_, k) => f(k));
  return merge([
    sheet(off, true, false), sheet(off - thick, false, true),
    ...wall(range(cols, (i) => [i, rows])), ...wall(range(cols, (i) => [i, 0])),
    ...wall(range(rows, (j) => [0, j])), ...wall(range(rows, (j) => [cols, j])),
  ]);
}

function indexed(pos, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function flipped(g) {
  const c = g.clone();
  const ix = c.index.array;
  for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
  c.computeVertexNormals();
  return c;
}

function merge(list) {
  const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)));
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

const O = OVERALLS;

/** The pants: all round the belly from the bottom to the waist. */
export const baoPants = () => slab(0, TAU, 0, O.waist + 0.01, O.off, { cols: 260, rows: 36 });

/** The bib: the front panel from the waist up, its top edge dipping a little at the sides. */
export const baoBib = () => slab(-O.bibHalf, O.bibHalf, O.waist - 0.005, (a) => O.bibTop - 0.012 * (a / O.bibHalf) ** 2, O.off + 0.002, { cols: 120 });

/** The back panel: the same behind, a little wider. */
export const baoBack = () => slab(Math.PI - O.backHalf, Math.PI + O.backHalf, O.waist - 0.005, O.backTop, O.off + 0.002, { cols: 140 });

/** The four straps: up from the bib and the back panel to under the collar band, over the cloth. */
export function baoStraps() {
  const one = (c, y0) => slab(c - O.strapHalf, c + O.strapHalf, y0, O.strapTop, O.off + 0.006, { cols: 16, rows: 30 });
  return merge([one(O.strapFront, O.bibTop - 0.03), one(-O.strapFront, O.bibTop - 0.03), one(Math.PI - O.strapBack, O.backTop - 0.03), one(Math.PI + O.strapBack, O.backTop - 0.03)]);
}

/** The bib pocket: a smaller patch standing on the bib. */
export const baoPocket = () => slab(-O.pocket.half, O.pocket.half, O.pocket.lo, O.pocket.hi, O.off + 0.008, { cols: 48, rows: 16, thick: 0.004 });

/**
 * Gold dashed stitching along the seams: round the waist, down the bib's sides and along its top, round the
 * pocket, the back panel's edges and both sides of every strap. Each dash is a tiny box laid along the seam.
 */
export function baoStitches() {
  const dashes = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  const lay = (a, y, off, ta, ty) => {
    const p = new THREE.Vector3(...onDenim(a, y, off, false));
    const q = new THREE.Vector3(...onDenim(a + ta, y + ty, off, false));
    const along = q.clone().sub(p);
    const len = along.length();
    if (len < 1e-6) return;
    const out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), along, out);
    const g = box.clone().scale(0.003, 0.0035, Math.min(0.011, len)).applyMatrix4(m).translate(...p.clone().add(q).multiplyScalar(0.5).toArray());
    dashes.push(g);
  };
  // A dashed line from (a0, y0) to (a1, y1), `off` out: dashes of about 0.011 with 0.007 gaps.
  const line = (a0, y0, a1, y1, off) => {
    const p0 = new THREE.Vector3(...onDenim(a0, y0, off, false)), p1 = new THREE.Vector3(...onDenim(a1, y1, off, false));
    const n = Math.max(1, Math.round(p0.distanceTo(p1) / 0.018));
    for (let k = 0; k < n; k++) {
      const u = (k + 0.2) / n, du = 0.6 / n;
      lay(a0 + (a1 - a0) * u, y0 + (y1 - y0) * u, off, (a1 - a0) * du, (y1 - y0) * du);
    }
  };
  const s = O.off + 0.0045;
  for (let k = 0; k < 40; k++) line((k / 40) * TAU, O.waist - 0.012, ((k + 1) / 40) * TAU, O.waist - 0.012, O.off + 0.0035); // the waist
  for (const side of [-1, 1]) {
    line(side * (O.bibHalf - 0.04), O.waist, side * (O.bibHalf - 0.04), O.bibTop - 0.022, s); // bib sides
    line(Math.PI + side * (O.backHalf - 0.04), O.waist, Math.PI + side * (O.backHalf - 0.04), O.backTop - 0.012, s); // back edges
    for (const c of [O.strapFront, Math.PI - O.strapBack]) {
      for (const e of [-1, 1]) line(side * c + e * (O.strapHalf - 0.025), O.bibTop - 0.02, side * c + e * (O.strapHalf - 0.025), O.strapTop - 0.04, O.off + 0.0105);
    }
  }
  for (let k = 0; k < 10; k++) line(-O.bibHalf + 0.06 + (k / 10) * (2 * O.bibHalf - 0.12), O.bibTop - 0.02, -O.bibHalf + 0.06 + ((k + 1) / 10) * (2 * O.bibHalf - 0.12), O.bibTop - 0.02, s); // bib top
  const pk = O.pocket, ps = O.off + 0.0125;
  line(-pk.half + 0.03, pk.lo + 0.008, pk.half - 0.03, pk.lo + 0.008, ps);
  line(-pk.half + 0.03, pk.hi - 0.008, pk.half - 0.03, pk.hi - 0.008, ps);
  for (const e of [-1, 1]) line(e * (pk.half - 0.03), pk.lo + 0.008, e * (pk.half - 0.03), pk.hi - 0.008, ps);
  return merge(dashes);
}

/** Shapes this module adds, by catalog name. */
export const CLOTHES_SHAPES = {
  bao_pants: baoPants,
  bao_bib: baoBib,
  bao_back: baoBack,
  bao_straps: baoStraps,
  bao_pocket: baoPocket,
  bao_stitches: baoStitches,
};
