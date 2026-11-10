// What `shot` frames: an object's box including its teaching-kit labels (number line numbers, fraction labels,
// callout cards, angle labels) and every object riding on it (children through `parent`, recursively: words
// on cards, letters in a train). Look and point keep the plain boxes of bounds.js. Approximate and a little
// generous, from the plan alone (no three.js). Pure.

import { THIN, localBounds, placeBox, unionBounds } from "./bounds.js";
import { withDefaults } from "./teach_layout.js";
import { chain, compose, point } from "./xform.js";

const box = (min, max) => ({ min, max });

/** The local box of a teaching-kit kind the plain boxes do not know (they fall back to 0.6 m), else null. */
export function teachBox(obj) {
  const o = withDefaults(obj);
  switch (o.kind) {
    case "number_line": {
      // Beam plus legs (length + 1.2), its top 0.56 m up; numbers hang under the beam, inside that height.
      const w = (o.length + 1.2) / 2;
      return box([-w, 0, -0.2], [w, 0.62, 0.2]);
    }
    case "fraction_bar": {
      const top = o.label ? o.height + 0.14 + 1.45 * Math.min(0.32, 0.12 + o.length / 18) : o.height;
      return box([-o.length / 2, 0, -0.15], [o.length / 2, top, 0.15]);
    }
    case "fraction_circle": {
      const R = o.radius;
      const top = o.label ? 2 * R + 0.22 + 1.45 * Math.min(0.32, 0.12 + R * 0.16) : 2 * R + 0.06;
      return box([-R, 0, -0.15 * R], [R, top, 0.15 * R]);
    }
    case "array": {
      const pitch = o.size + o.gap;
      const w = (o.cols * pitch) / 2 + (o.trays ? 0.06 : 0);
      return box([-w, 0, -0.7 * o.size], [w, o.rows * (pitch + (o.trays ? 0.06 : 0)), 0.7 * o.size]);
    }
    case "grid": {
      // Board margin 0.08 plus room for trace count numbers outside the edge.
      const [w, h] = [(o.cols * o.cell) / 2 + 0.38, (o.rows * o.cell) / 2 + 0.38];
      return o.upright ? box([-w, 0, -0.1], [w, 2 * h, 0.15]) : box([-w, 0, -h], [w, 0.12, h]);
    }
    case "cubes": return box([(-o.l * o.cell) / 2, 0, (-o.w * o.cell) / 2], [(o.l * o.cell) / 2, o.h * o.cell + 0.05, (o.w * o.cell) / 2]);
    case "pointer": {
      const a = o.from ?? [0, 0, 0];
      const b = o.to ?? [1, 0, 0];
      const mid = [0, 1, 2].map((i) => (a[i] + b[i]) / 2 + (i === 1 ? o.bend ?? 0 : 0));
      const r = o.width * 1.4;
      return box([0, 1, 2].map((i) => Math.min(a[i], b[i], mid[i]) - r), [0, 1, 2].map((i) => Math.max(a[i], b[i], mid[i]) + r));
    }
    case "callout": {
      // The dot at point and the card at point + offset (Andika at 0.2: about 0.16 m a character, 0.36 m margin).
      const P = o.point ?? [0, 0, 0];
      const C = P.map((x, i) => x + (o.offset?.[i] ?? 0));
      const [hw, hh] = [(0.16 * String(o.text ?? "").length + 0.36) / 2, 0.24];
      return box([Math.min(P[0], C[0] - hw), Math.min(P[1], C[1] - hh), Math.min(P[2], C[2]) - 0.1], [Math.max(P[0], C[0] + hw), Math.max(P[1], C[1] + hh), Math.max(P[2], C[2]) + 0.1]);
    }
    case "angle": {
      const R = o.radius * 1.15;
      return box([-R, (o.degrees ?? 45) > 180 ? -R : -0.2, -0.1], [R, R, 0.1]);
    }
    default: return null;
  }
}

/**
 * A local box (in the object's size and spawn scale) through the object's transform at t and its parents'
 * (position, rotation and spawn scale; on a named part, the parent's size), as the hull of its 8 corners: a
 * stood-up sign, a turned number line and a card riding on a turned group get their true boxes. Unturned
 * objects on unscaled parents land exactly where worldBounds puts them.
 */
export function transformedBox(o, b, now, get, t) {
  const rot = (x) => now(x.id, "rotation", t) ?? x.rotation ?? [0, 0, 0];
  const pos = (x) => now(x.id, "position", t) ?? x.at ?? [0, 0, 0];
  const turned = (x) => rot(x).some((v) => v % 360 !== 0);
  let T = compose(pos(o), rot(o), [1, 1, 1]);
  let par = o.parent != null ? get(o.parent) : null;
  if (par && o.part != null) T = chain(compose([0, 0, 0], [0, 0, 0], [par.size ?? 1, par.size ?? 1, par.size ?? 1]), T);
  let plain = !turned(o);
  while (par) {
    const s = Array.isArray(par.scale) ? par.scale : [par.scale ?? 1, par.scale ?? 1, par.scale ?? 1];
    if (turned(par) || s.some((v) => v !== 1)) plain = false;
    T = chain(compose(pos(par), rot(par), s), T);
    par = par.parent != null ? get(par.parent) : null;
  }
  if (plain) return placeBox(o, b, now, get, t); // the same numbers as before for unturned objects
  const pts = [];
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) pts.push(point(T, [x, y, z]));
  return box([0, 1, 2].map((i) => Math.min(...pts.map((q) => q[i]))), [0, 1, 2].map((i) => Math.max(...pts.map((q) => q[i]))));
}

/** Every object riding on `id` (children, their children, ...), in plan order; internal helpers are left out. */
export function descendants(id, objects) {
  const out = [];
  const want = new Set([id]);
  for (const o of objects) {
    if (o.parent != null && want.has(o.parent) && !o.internal) {
      out.push(o);
      want.add(o.id);
    }
  }
  return out;
}

/**
 * The world box `shot` frames for one target at time t: its own box (with teaching-kit labels) and its children.
 * An empty group with children is framed by its children alone. A target with neither keeps its plain box.
 * @param {object[]} objects  every placed object, in the order they were added
 */
export function shotBounds(o, catalog, now, get, t, objects, exact = false) {
  const kids = descendants(o.id, objects);
  // exact (shot fit: "exact"): thin shapes at their real height and every turn applied; else positions only.
  // A turned shape (a card's backing plate stood up, a page's paper) is measured exactly: the loose box ignores
  // turns, so an upright plate would count as a 1 m slab and push the camera far back.
  const turned = (x) => x.kind === "shape" && (x.rotation ?? [0, 0, 0]).some((v) => Math.abs(v) > 1e-6);
  const one = (x) => (exact || turned(x) ? transformedBox(x, ownBox(x, catalog, true), now, get, t) : placeBox(x, ownBox(x, catalog, false), now, get, t));
  if (!kids.length) return one(o);
  return unionBounds([...(o.kind === "group" ? [] : [one(o)]), ...kids.map(one)]);
}

/** An object's own local box: the teaching-kit box (with labels, in its spawn scale) or the plain one. */
function ownBox(o, catalog, exact) {
  const b = teachBox(o);
  if (!b) {
    const lb = localBounds(o, catalog);
    // Thin shapes (a plate 0.04 tall, a coin, a bowl) at their real height, not the 1 m box look uses.
    if (exact && o.kind === "shape" && THIN[o.shape] && o.shape !== "hoop") lb.max[1] = lb.min[1] + (lb.max[1] - lb.min[1]) * THIN[o.shape];
    return lb;
  }
  const sc = Array.isArray(o.scale) ? o.scale : [o.scale ?? 1, o.scale ?? 1, o.scale ?? 1];
  return box(b.min.map((x, i) => x * sc[i]), b.max.map((x, i) => x * sc[i]));
}

/** Grow a box about its centre by pad (0.2: 20% wider, taller and deeper). */
export function padBox(b, pad = 0) {
  if (!pad) return b;
  const c = b.min.map((x, i) => (x + b.max[i]) / 2);
  return box(b.min.map((x, i) => c[i] - (c[i] - x) * (1 + pad)), b.max.map((x, i) => c[i] + (x - c[i]) * (1 + pad)));
}
