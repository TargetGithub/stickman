// Approximate sizes of objects, from the catalog alone (no three.js): what `shot` frames and what `look` aims
// at. Boxes are axis-aligned, in metres, around the object's origin (its base). They are a little generous
// on purpose: a shot that leaves a margin is better than one that crops an ear. Pure.

import { pvLayout } from "./place_value.js";
import { cardHeight } from "./teach_layout.js";

const vec = (v, d = 1) => (Array.isArray(v) ? v : [v ?? d, v ?? d, v ?? d]);

/** Flat 2D shapes are thin in z; solids are about one unit in each direction. */
const FLAT = new Set(["circle", "square", "triangle", "rectangle", "oval", "diamond", "crescent", "pentagon", "hexagon", "octagon", "half_circle",
  "quarter_circle", "arrow", "cross", "snowflake", "drop", "leaf", "ring", "star", "heart"]);

/** Heights of shapes lower than their 1 m box (geometry.js): a plate, a coin, a hoop, a bowl, a dome. */
export const THIN = { plate: 0.04, disc: 0.12, hoop: 0.03, bowl: 0.5, dome: 0.5 };

/** Box of a part-built model (critter or prop) in its own units: every part's centre ± half its scale. */
function modelBox(m) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const head = m.head?.at ?? [0, 0, 0];
  for (const p of m.parts ?? []) {
    const at = p.at ?? [0, 0, 0];
    const s = vec(p.s, 0.2);
    const r = Math.max(...s) * 0.55; // parts may be turned: use the longest side all round
    const c = p.on === "head" ? at.map((x, i) => x + head[i]) : at;
    const xs = p.mirror ? [c[0], -c[0]] : [c[0]];
    for (const x of xs) {
      const cc = [x, c[1], c[2]];
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], cc[i] - (i === 1 ? s[1] / 2 : r));
        max[i] = Math.max(max[i], cc[i] + (i === 1 ? s[1] / 2 : r));
      }
    }
  }
  if (!Number.isFinite(min[0])) return { min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] };
  min[1] = Math.max(0, Math.min(min[1], 0));
  return { min, max };
}

/**
 * The local box of one object (before its position, including its size and scale).
 * @returns {{ min:number[], max:number[] }}
 */
export function localBounds(o, catalog) {
  const size = o.size ?? 1;
  const sc = vec(o.scale, 1);
  let min;
  let max;
  switch (o.kind) {
    case "shape": {
      const flat = FLAT.has(o.shape);
      min = [-0.5, 0, flat ? -0.08 : -0.5];
      max = [0.5, o.shape === "hoop" ? THIN.hoop : 1, flat ? 0.08 : 0.5]; // shot uses THIN for every thin shape
      break;
    }
    case "number_block": min = [-0.5, 0, -0.5]; max = [0.5, 1, 0.5]; break;
    case "letter": {
      // Andika: about 0.8 × size per character, caps 1.41 × size tall, descenders 0.47 below.
      const w = 0.4 * (o.text?.length ?? 1);
      // lift: "descender" raises the text so its lowest point (at most 0.47 below the baseline) is on at.
      const up = o.lift === "descender" ? 0.47 : 0;
      min = [-w, -0.47 + up, -0.25];
      max = [w, 1.45 + up, 0.25];
      break;
    }
    case "critter":
    case "prop": {
      const m = o.kind === "critter" ? catalog.critters?.[o.species] : catalog.props?.[o.model];
      ({ min, max } = m ? modelBox(m) : { min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] });
      break;
    }
    case "character": {
      // Robo is 1.6 m tall in his idle pose and about 1.1 m across with his arms out.
      const h = catalog.characters?.[o.character]?.height ?? 1.6;
      return scaleBox({ min: [-0.36 * h, 0, -0.3 * h], max: [0.36 * h, h * 1.04, 0.3 * h] }, sc);
    }
    case "clock": min = [-0.55, 0, -0.1]; max = [0.55, 1.1, 0.1]; break;
    case "fraction_text": {
      // Measured with Andika: 0.72 × size per figure of the longer number plus 0.36, a whole number before it.
      const s = o.size ?? 0.5;
      const len = (v) => String(v ?? "").length;
      const w = (0.72 * Math.max(len(o.numerator), len(o.denominator), 1) + 0.36 + (o.whole != null ? 0.72 * len(o.whole) + 0.3 : 0)) / 2;
      return scaleBox({ min: [-w * s, -0.5 * s, -0.15 * s], max: [w * s, 1.95 * s, 0.15 * s] }, sc);
    }
    case "place_value_chart": {
      const L = pvLayout({ columns: o.columns, cell: o.cell });
      return scaleBox({ min: [-L.width / 2 - 0.07, 0, -0.1], max: [L.width / 2 + 0.07, 1.6 * L.cell, 0.2] }, sc);
    }
    case "text_card": return scaleBox({ min: [-(o.width ?? 4) / 2, 0, -0.05], max: [(o.width ?? 4) / 2, cardHeight(o), 0.05] }, sc);
    case "stroke":
    case "flow": {
      const pts = Array.isArray(o.points) && o.points.length ? o.points : [[0, 0, 0]];
      const r = o.kind === "stroke" ? (o.width ?? 0.08) / 2 : (o.size ?? 0.14) / 2;
      return scaleBox({ min: [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i])) - r), max: [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i])) + r) }, sc);
    }
    default: min = [-0.3, 0, -0.3]; max = [0.3, 0.6, 0.3];
  }
  return scaleBox({ min: min.map((x) => x * size), max: max.map((x) => x * size) }, sc);
}

const scaleBox = (b, s) => ({ min: b.min.map((x, i) => x * s[i]), max: b.max.map((x, i) => x * s[i]) });

/**
 * World box of an object at time t: its local box moved to where it is then. Children of a parent ride on
 * it (the parent's position is added; turns are ignored, which the generous boxes cover).
 * @param {(id:string, prop:string, t:number) => any} now  timeline value lookup
 * @param {(id:string) => object} get  object by id
 */
export function worldBounds(o, catalog, now, get, t) {
  return placeBox(o, localBounds(o, catalog), now, get, t);
}

/** A local box (already in the object's size and scale) moved to where the object is at t, riding on its parents. */
export function placeBox(o, b, now, get, t) {
  let p = now(o.id, "position", t) ?? o.at ?? [0, 0, 0];
  let par = o.parent != null ? get(o.parent) : null;
  let k = par && o.part != null ? par.size ?? 1 : 1;
  const off = [p[0] * k, p[1] * k, p[2] * k];
  const sz = k;
  while (par) {
    const pp = now(par.id, "position", t) ?? par.at ?? [0, 0, 0];
    for (let i = 0; i < 3; i++) off[i] += pp[i];
    par = par.parent != null ? get(par.parent) : null;
  }
  p = off;
  return { min: b.min.map((x, i) => x * sz + p[i]), max: b.max.map((x, i) => x * sz + p[i]) };
}

/** Union of boxes. */
export function unionBounds(boxes) {
  return {
    min: [0, 1, 2].map((i) => Math.min(...boxes.map((b) => b.min[i]))),
    max: [0, 1, 2].map((i) => Math.max(...boxes.map((b) => b.max[i]))),
  };
}

/** Where a face looks from or at: a critter's head centre, Robo's head, else the middle of the box. */
export function focusPoint(o, catalog, now, get, t) {
  const p = now(o.id, "position", t) ?? o.at;
  const size = o.size ?? 1;
  if (o.kind === "critter" && catalog.critters?.[o.species]?.head?.at && o.parent == null) {
    const h = catalog.critters[o.species].head.at;
    return [p[0] + h[0] * size, p[1] + h[1] * size, p[2] + h[2] * size];
  }
  if (o.kind === "character" && o.parent == null) {
    const h = catalog.characters?.[o.character]?.height ?? 1.6;
    return [p[0], p[1] + 0.82 * h * (vec(o.scale)[1] ?? 1), p[2]];
  }
  const b = worldBounds(o, catalog, now, get, t);
  return b.min.map((x, i) => (x + b.max[i]) / 2);
}
