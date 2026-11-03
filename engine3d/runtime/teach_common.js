// Small helpers shared by the teaching kit builders (teach.js, teach_more.js, teach_marks.js): piece pop-in,
// colour blends and cached text labels. Browser and Node (no canvas needed).

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EASES } from "./ease.js";
import { rgb } from "./director_extras.js";
import { PIECE_PREFIX, buildSteps } from "./teach_layout.js";

export const clamp01 = (k) => Math.max(0, Math.min(1, k));

/** How shaded piece i is (0-1): shaded in order (shade to) or on its own (shade cells: "<id>#<piece>".shade). */
export function pieceShade(o, s, state, i) {
  return Math.max((s.shaded ?? 0) - i, state?.[`${o.id}#${PIECE_PREFIX[o.kind]}${i + 1}`]?.shade ?? 0);
}

/** Show a piece at build progress k (0 hidden, 1 full size), popping in with a small overshoot. */
export function setPiece(node, k, base = 1) {
  node.visible = k > 0.001;
  node.scale.setScalar(base * Math.max(1e-4, k >= 1 ? 1 : EASES.backOut(clamp01(k))));
}

/**
 * Build progress of each piece from the object's "built" (0-1) and "buildOrder" props.
 * @returns {(i:number) => number}  piece index → 0..1
 */
export function builder(o, s) {
  const { steps, stepOf } = buildSteps(o, s.buildOrder ?? "items");
  const b = s.built ?? 1;
  return (i) => (b >= 1 ? 1 : clamp01(b * steps - stepOf(i)));
}

/** A material of its own (so one piece can change colour) in a catalog colour and style. */
export const ownMaterial = (material, color, style = "toy") => material(color, style).clone();

/** Blend a material's colour between two [r, g, b] sRGB triples. */
export function blendColor(mat, a, b, k) {
  const u = clamp01(k);
  mat.color.setRGB(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, THREE.SRGBColorSpace);
}

export const colorRGB = (catalog, name) => rgb(catalog.colors[name].hex);

const boxes = new Map();
/** A shared rounded box geometry (w × h × d, corner radius r). */
export function roundedBox(w, h, d, r) {
  const key = [w, h, d, r].map((x) => x.toFixed(4)).join("|");
  if (!boxes.has(key)) boxes.set(key, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)));
  return boxes.get(key);
}

/** A mesh that casts and receives shadows. */
export function solid(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/**
 * Text labels built on demand and kept (a fraction label that changes as parts are shaded, degrees as an angle
 * opens). Labels are centred on x and stand on y = 0, facing +z.
 */
export function labelMaker(textGeometry, font, size, depth = size * 0.22) {
  const cache = new Map();
  return (text) => {
    if (!cache.has(text)) cache.set(text, textGeometry(text, font, size, depth));
    return cache.get(text);
  };
}

/** A tube along a curve whose drawn share can be set (the index runs along the curve, segment by segment). */
export function drawableTube(curve, radius, segments = 64, radial = 10) {
  const geo = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  const per = radial * 6;
  return { geo, show: (k) => geo.setDrawRange(0, Math.round(clamp01(k) * segments) * per) };
}
