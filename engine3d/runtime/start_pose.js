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
    if (v?.scale && o.kind === "letter") tl.base(key, "scale", typeof v.scale === "number" ? [v.scale, v.scale, v.scale] : v.scale);
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
          const ok = k === "scale" ? o.kind === "letter" && (vec(v[k]) || (Number.isFinite(v[k]) && v[k] > 0)) : ["rotation", "position"].includes(k) && vec(v[k]);
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

export const START_POSE_FIELDS = ["pose"];
export const LETTER_START_FIELDS = ["split", "splitGap"];
