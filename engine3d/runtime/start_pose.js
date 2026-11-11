// Starting poses (#66): an object can begin with its parts already moved, instead of a script spending a 0.01 s
// action at t = 0 on it. `pose: { lid: { rotation: [-110, 0, 0] } }` turns a named part (a curtain open, a straw
// bent, a critter's head tilted); on a letter word the parts are its characters c1..cN and may also take scale.
// `split: [2]` on a letter word starts it split after those characters, as the split action leaves it. Pure.

import { letterLayout } from "./letter_layout.js";

/** How far each character of a letter word slides when split after `after` (character numbers): n -> dx. */
export function splitOffsets(o, metrics, after, gap) {
  const L = letterLayout(o, metrics);
  const g = gap ?? 0.35 * (o.size ?? 1);
  const cuts = [...new Set(after)].sort((a, b) => a - b);
  for (const c of cuts) if (!Number.isInteger(c) || c < 1 || c >= L.length) throw new Error(`split "${o.id}": after must be character numbers 1-${L.length - 1}`);
  return { L, g, cuts, dx: new Map(L.map((ch) => [ch.n, Math.round(cuts.filter((c) => ch.n > c).length * g * 1e4) / 1e4])) };
}

/** Set the bases of an object's parts from its pose and split fields (director add, after the part bases). */
export function applyStartPose(o, { tl, parts, catalog }) {
  // Every letter piece has a scale track from the start (grow tweens it from here).
  if (o.kind === "letter") for (const n of Array.from(String(o.text ?? ""), (_, i) => i + 1)) tl.base(`${o.id}#c${n}`, "scale", [1, 1, 1]);
  if (o.kind === "letter" && Array.isArray(o.split)) {
    for (const [n, dx] of splitOffsets(o, catalog.fontMetrics, o.split, o.splitGap).dx) tl.base(`${o.id}#c${n}`, "position", [dx, 0, 0]);
  }
  for (const [n, v] of Object.entries(o.pose ?? {})) {
    const key = `${o.id}#${n}`;
    if (!parts.has(key)) throw new Error(`object "${o.id}": pose names no part "${n}"`);
    for (const k of ["rotation", "position"]) if (v?.[k]) tl.base(key, k, v[k]);
    // scale 0: the letter starts hidden (#114).
    if (v?.scale != null && o.kind === "letter") tl.base(key, "scale", typeof v.scale === "number" ? [v.scale, v.scale, v.scale] : v.scale);
  }
}

/** Validator: pose names known parts with [x, y, z] values; split is character numbers inside the word. */
export function checkStartPose(o, p, { err, partNames }) {
  if (o.pose != null) {
    if (!["critter", "prop", "letter"].includes(o.kind)) err("E3D_POSE", `${p}.pose`, "pose is for a critter's, prop's or letter word's parts");
    else if (typeof o.pose !== "object" || Array.isArray(o.pose)) err("E3D_POSE", `${p}.pose`, "pose maps part names to { rotation, position }");
    else {
      const known = partNames(o);
      const vec = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
      for (const [n, v] of Object.entries(o.pose)) {
        if (!known.includes(n)) err("E3D_PART", `${p}.pose.${n}`, `"${o.id}" has no named part "${n}" (known: ${known.join(", ") || "none"})`);
        for (const k of Object.keys(v ?? {})) {
          const ok = k === "scale" ? o.kind === "letter" && (vec(v[k]) || (Number.isFinite(v[k]) && v[k] >= 0)) : ["rotation", "position"].includes(k) && vec(v[k]);
          if (!ok) err("E3D_POSE", `${p}.pose.${n}.${k}`, o.kind === "letter" ? "a letter piece takes rotation, position or scale: [x, y, z] (scale may be one number)" : "a part takes rotation or position: [x, y, z]");
        }
      }
    }
  }
  if (o.split != null) {
    const n = Array.from(String(o.text ?? "")).length;
    if (o.kind !== "letter") err("E3D_POSE", `${p}.split`, "split is for letter words");
    else if (!Array.isArray(o.split) || o.split.some((c) => !Number.isInteger(c) || c < 1 || c >= n)) err("E3D_POSE", `${p}.split`, `split lists character numbers 1-${n - 1} to split after`);
  }
  if (o.splitGap != null && !(Number.isFinite(o.splitGap) && o.splitGap >= 0 && o.splitGap <= 5)) err("E3D_RANGE", `${p}.splitGap`, "splitGap must be 0-5 m");
}

export const LETTER_START_FIELDS = ["split", "splitGap"];

/** Exact boxes of shapes in their own frame (geometry.js, lifted to stand on y = 0), where they differ from 1 m. */
const SHAPE_BOX = {
  plate: [[-0.5, 0, -0.5], [0.5, 0.04, 0.5]], disc: [[-0.5, 0, -0.5], [0.5, 0.12, 0.5]], hoop: [[-0.5, 0, -0.5], [0.5, 0.03, 0.5]],
  bowl: [[-0.5, 0, -0.5], [0.5, 0.5, 0.5]], dome: [[-0.5, 0, -0.5], [0.5, 0.5, 0.5]], torus: [[-0.5, 0, -0.15], [0.5, 1, 0.15]],
};
const FLAT_SHAPES = new Set(["circle", "square", "triangle", "rectangle", "oval", "diamond", "crescent", "pentagon", "hexagon", "octagon", "half_circle",
  "quarter_circle", "arrow", "cross", "snowflake", "drop", "leaf", "ring", "star", "heart"]);

/**
 * base: true (#95): where to put a turned shape so it sits like a prop: turned about its middle, then lowered or
 * raised so its lowest point is on at, its middle over at. Without a rotation a shape already stands on at.
 * @returns {number[]} the at to use instead
 */
export function baseAt(o) {
  const [lo, hi] = SHAPE_BOX[o.shape] ?? (FLAT_SHAPES.has(o.shape) ? [[-0.5, 0, -0.08], [0.5, 1, 0.08]] : [[-0.5, 0, -0.5], [0.5, 1, 0.5]]);
  const size = o.size ?? 1;
  const sc = Array.isArray(o.scale) ? o.scale : [1, 1, 1].map(() => (typeof o.scale === "number" ? o.scale : 1));
  const [rx, ry, rz] = (o.rotation ?? [0, 0, 0]).map((d) => (d * Math.PI) / 180);
  // Three's XYZ Euler: v' = Rx · Ry · Rz · v.
  const rot = ([x, y, z]) => {
    [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
    [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
    [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    return [x, y, z];
  };
  const pt = (v) => rot(v.map((c, i) => c * size * sc[i]));
  const corners = [];
  for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) corners.push(pt([x, y, z]));
  const mid = pt(lo.map((v, i) => (v + hi[i]) / 2));
  const minY = Math.min(...corners.map((c) => c[1]));
  const at = o.at ?? [0, 0, 0];
  const r4 = (v) => Math.round(v * 1e4) / 1e4;
  return [r4(at[0] - mid[0]), r4(at[1] - minY), r4(at[2] - mid[2])];
}
