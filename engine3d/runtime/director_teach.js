// Teaching kit moves for the director: build, shade, leap, draw, open, mark, highlight and trace. Like the
// rest of the director they only record timeline data (props on the teaching objects, plus small internal
// helper objects for marks, glows and leap arcs). Pure: no three.js, no I/O, no clocks.

import { rgb } from "./director_extras.js";
import { BUILD_ORDERS, PIECE_PREFIX, approxHeight, buildSteps, linePoint, pieceCount, pieceNames, withDefaults } from "./teach_layout.js";

/** Actions this module adds (compile.js dispatches them as d[action](target, params)). */
export const TEACH_ACTIONS = ["build", "shade", "leap", "draw", "open", "mark", "highlight", "trace"];

const SHADE_DEFAULT = { grid: "orange", array: "yellow" };
// Pieces that `move`, `turn`, `wiggle` and `spin` can take (offsets from the rest pose, like a lid).
const MOVABLE = new Set(["fraction_bar", "fraction_circle"]);

/**
 * Timeline bases for a teaching object (called from director.add) and its piece names as sub-targets.
 * @param {object} o  the placed object
 * @param {{ tl, parts: Set<string>, catalog, objects: Map }} k
 */
export function teachBases(o, { tl, parts, catalog, objects }) {
  const f = withDefaults(o);
  if (f.kind === "callout" && f.target != null) {
    // A callout names an object: its leader points at 0.6 of that object's height.
    const t = objects.get(f.target);
    if (!t) throw new Error(`callout "${o.id}": target "${f.target}" must be placed first`);
    // Relative to the callout's at; the page refines it from the target's real shape (the front, 0.6 up).
    const rel = (v, i) => Math.round((v - o.at[i]) * 1e9) / 1e9;
    o.point = [rel(t.at[0], 0), rel(t.at[1] + approxHeight(t) * 0.6, 1), rel(t.at[2], 2)];
    o.targetAt = t.at.map(rel);
    o.targetScale = t.scale;
  }
  if (pieceCount(f) > 0) {
    tl.base(o.id, "built", 1);
    tl.base(o.id, "buildOrder", "items");
  }
  if (["fraction_bar", "fraction_circle", "grid", "array"].includes(f.kind)) {
    tl.base(o.id, "shaded", f.shaded ?? 0);
    const c = f.kind === "grid" || f.kind === "array" ? SHADE_DEFAULT[f.kind] : f.color;
    tl.base(o.id, "shadeColor", rgb(catalog.colors[c].hex));
  }
  if (["pointer", "number_line", "callout"].includes(f.kind)) tl.base(o.id, "drawn", 1);
  if (f.kind === "angle") tl.base(o.id, "degrees", f.degrees);
  if (f.kind === "grid") tl.base(o.id, "trace", 0);
  for (const n of pieceNames(f)) {
    parts.add(`${o.id}#${n}`);
    if (MOVABLE.has(f.kind)) {
      tl.base(`${o.id}#${n}`, "position", [0, 0, 0]);
      tl.base(`${o.id}#${n}`, "rotation", [0, 0, 0]);
    }
  }
}

/** A world point in a number line's own space (undo its at and turn about y), lifted a little off the bar. */
function toLine(line, p) {
  const yaw = ((line.rotation?.[1] ?? 0) * Math.PI) / 180;
  const [dx, dy, dz] = [p[0] - line.at[0], p[1] - line.at[1], p[2] - line.at[2]];
  const r = (v) => Math.round(v * 1e9) / 1e9;
  return [r(Math.cos(yaw) * dx - Math.sin(yaw) * dz), r(dy + 0.02), r(Math.sin(yaw) * dx + Math.cos(yaw) * dz)];
}

/**
 * Add the teaching moves to a director.
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, now, sound, objects: Map, V }} k  director internals
 */
export function installTeach(d, { catalog, tl, obj, now, sound, objects }) {
  let helpers = 0;
  const kindOf = (id, kinds, what) => {
    const o = obj(id);
    if (!kinds.includes(o.kind)) throw new Error(`${what} needs a ${kinds.join(" or ")}, "${id}" is a ${o.kind}`);
    return o;
  };
  const appear = (id, o, t) => {
    tl.set(id, "visible", true, t);
    tl.set(id, "scale", o.scale, t);
  };
  const pan = (o) => Math.max(-1, Math.min(1, (o.at?.[0] ?? 0) / 6));
  // "pie#s2" → parent pie, part s2; a helper (a mark, a glow) rides on that piece.
  const split = (target) => {
    const [base, part] = String(target).split("#");
    const o = obj(target);
    return { base, part: part ?? null, o };
  };
  const helper = (owner, spec) => {
    const id = `${owner}~${spec.kind.replace(/^_/, "")}${++helpers}`;
    d.add({ ...spec, id, hidden: true, internal: true });
    return id;
  };
  const cellSets = new Map(); // object id → piece numbers shaded with cells
  const once = new Set();
  const baseOnce = (target, prop, value) => !once.has(`${target}|${prop}`) && (once.add(`${target}|${prop}`), tl.base(target, prop, value));
  const shadeColor = (id, t, color, len) => {
    if (color == null) return;
    if (!catalog.colors[color]) throw new Error(`unknown color "${color}"`);
    tl.tween(id, "shadeColor", { start: t, dur: Math.min(0.4, len), to: rgb(catalog.colors[color].hex), ease: "sineInOut" });
  };
  /** shade with cells: per-piece "shade" props (0-1) on "<id>#<piece>", one piece after another. */
  function shadeCells(id, o, n, { t, cells, color, dur, s }) {
    if (!Array.isArray(cells) || cells.some((c) => !(Number.isInteger(c) && c >= 1 && c <= n)) || new Set(cells).size !== cells.length) throw new Error(`shade "${id}": cells must be different piece numbers 1-${n}`);
    const prev = cellSets.get(id) ?? new Set();
    const fresh = cells.filter((c) => !prev.has(c));
    const len = dur ?? 0.2 + 0.3 * Math.max(1, fresh.length);
    shadeColor(id, t, color, len);
    const piece = (c) => `${id}#${PIECE_PREFIX[o.kind]}${c}`;
    const step = len / Math.max(1, fresh.length);
    fresh.forEach((c, i) => {
      baseOnce(piece(c), "shade", 0);
      tl.tween(piece(c), "shade", { start: t + i * step, dur: Math.min(step, 0.3), from: 0, to: 1, ease: "linear" });
      if (s) sound(s, t + i * step, { volume: 0.6, pan: pan(o) });
    });
    for (const c of prev) if (!cells.includes(c)) tl.tween(piece(c), "shade", { start: t, dur: 0.3, to: 0, ease: "linear" });
    cellSets.set(id, new Set(cells));
    return d;
  }

  Object.assign(d, {
    /** The world point for a value on a number line (where `on: { line, value }` puts things). */
    lineAt(line, value) {
      return linePoint(kindOf(line, ["number_line"], "lineAt"), value);
    },

    /** Reveal the pieces one by one (count along): items, rows, cols or layers. */
    build(id, { at: t = 0, order = "items", dur, sound: s = "pop" } = {}) {
      const o = kindOf(id, Object.keys(BUILD_ORDERS), "build");
      if (!BUILD_ORDERS[o.kind].includes(order)) throw new Error(`build "${id}": order must be ${BUILD_ORDERS[o.kind].join(", ")}`);
      const { steps } = buildSteps(o, order);
      const len = dur ?? Math.min(8, 0.3 + steps * (steps > 12 ? 0.18 : 0.4));
      appear(id, o, t);
      tl.set(id, "buildOrder", order, t);
      tl.tween(id, "built", { start: t, dur: len, from: 0, to: 1, ease: "linear" });
      // One sound per step (every few steps for long builds), as each piece pops in.
      const every = Math.ceil(steps / 30);
      if (s) for (let i = 0; i < steps; i += every) sound(s, t + (len * i) / steps, { volume: 0.6, pan: pan(o) });
      return d;
    },

    /**
     * Shade parts in order up to `to` (fewer shades parts back out); color changes the shade colour. cells
     * (piece numbers from 1) shades exactly those pieces instead, one after another; cells shaded by an
     * earlier `cells` and not listed again unshade ([] clears them).
     */
    shade(id, { at: t = 0, to, cells, color, dur, sound: s } = {}) {
      const o = kindOf(id, ["fraction_bar", "fraction_circle", "grid", "array"], "shade");
      const from = now(id, "shaded", t);
      const n = pieceCount(o);
      if (cells != null) return shadeCells(id, o, n, { t, cells, color, dur, s });
      if (!(Number.isInteger(to) && to >= 0 && to <= n)) throw new Error(`shade "${id}": to must be a whole number 0-${n}`);
      const len = dur ?? 0.2 + 0.3 * Math.abs(to - from);
      if (color != null) {
        if (!catalog.colors[color]) throw new Error(`unknown color "${color}"`);
        tl.tween(id, "shadeColor", { start: t, dur: Math.min(0.4, len), to: rgb(catalog.colors[color].hex), ease: "sineInOut" });
      }
      tl.tween(id, "shaded", { start: t, dur: len, from, to, ease: "linear" });
      const k = Math.abs(to - from);
      if (s) for (let i = 0; i < k; i++) sound(s, t + (len * i) / k, { volume: 0.6, pan: pan(o) });
      return d;
    },

    /** Arc from value to value along a number line (skip counting, adding on), drawing each jump's arc. */
    leap(id, { at: t = 0, line, values = [], dur = 0.7, height = 0.8, sound: s = "boing", arcs = true, color = "orange" } = {}) {
      const o = obj(id);
      const ln = kindOf(line, ["number_line"], "leap line");
      let p = now(id, "position", t);
      values.forEach((v, i) => {
        const start = t + i * dur;
        const q = linePoint(ln, v);
        tl.tween(id, "position", { start, dur, from: p, to: q, ease: "sineInOut" });
        tl.tween(id, "hop", { start, dur, from: 0, to: height, ease: "hop" });
        sound(s, start, { volume: 0.5, pan: Math.max(-1, Math.min(1, q[0] / 6)) });
        if (arcs && Math.hypot(q[0] - p[0], q[2] - p[2]) > 1e-6) {
          // The arc rides on the line (in its own space), so hiding the line hides its arcs.
          const arc = helper(line, { kind: "pointer", parent: line, from: toLine(ln, p), to: toLine(ln, q), bend: height, width: 0.05, color });
          appear(arc, objects.get(arc), start);
          tl.tween(arc, "drawn", { start, dur, from: 0, to: 1, ease: "sineInOut" });
        }
        p = q;
      });
      return d;
    },

    /** Draw a pointer, number line, callout or stroke from its start to its end. */
    draw(id, { at: t = 0, dur = 1.2, sound: s } = {}) {
      const o = kindOf(id, ["pointer", "number_line", "callout", "stroke"], "draw");
      appear(id, o, t);
      tl.tween(id, "drawn", { start: t, dur, from: 0, to: 1, ease: "sineInOut" });
      sound(s, t, { pan: pan(o) });
      return d;
    },

    /** Open (or close) an angle to `to` degrees. */
    open(id, { at: t = 0, to, dur = 1.2, sound: s } = {}) {
      kindOf(id, ["angle"], "open");
      if (!(typeof to === "number" && to >= 0 && to <= 360)) throw new Error(`open "${id}": to must be 0-360 degrees`);
      tl.tween(id, "degrees", { start: t, dur, to, ease: "quadInOut" });
      sound(s, t);
      return d;
    },

    /** A green tick (correct) or a soft red cross (incorrect) badge with a ring, over the target (or one piece). */
    mark(target, { at: t = 0, result = "correct", dur = 1.8, sound: s } = {}) {
      if (result !== "correct" && result !== "incorrect") throw new Error(`mark: result must be correct or incorrect, got "${result}"`);
      const { base, part } = split(target);
      const id = helper(base, { kind: "_mark", parent: base, ...(part ? { part } : {}), result });
      tl.set(id, "visible", true, t);
      tl.tween(id, "scale", { start: t, dur: 0.5, from: [0, 0, 0], to: [1, 1, 1], ease: "elasticOut" });
      tl.base(id, "ping", -1);
      tl.set(id, "ping", t, t);
      tl.tween(id, "scale", { start: t + Math.max(0.6, dur - 0.3), dur: 0.3, to: [0, 0, 0], ease: "backIn" });
      tl.set(id, "visible", false, t + Math.max(0.9, dur));
      sound(s === undefined ? (result === "correct" ? "ding" : "boing") : s, t, { volume: result === "correct" ? 0.9 : 0.5 });
      return d;
    },

    /** A soft glowing ring that pulses around the target (or one piece) for dur seconds: look here. */
    highlight(target, { at: t = 0, color = "gold", dur = 2, sound: s } = {}) {
      if (!catalog.colors[color]) throw new Error(`unknown color "${color}"`);
      const { base, part } = split(target);
      const id = helper(base, { kind: "_glow", parent: base, ...(part ? { part } : {}), color });
      tl.set(id, "visible", true, t);
      tl.tween(id, "scale", { start: t, dur: 0.35, from: [0, 0, 0], to: [1, 1, 1], ease: "backOut" });
      tl.base(id, "since", -1);
      tl.set(id, "since", t, t);
      tl.tween(id, "scale", { start: t + Math.max(0.4, dur - 0.3), dur: 0.3, to: [0, 0, 0], ease: "backIn" });
      tl.set(id, "visible", false, t + Math.max(0.7, dur));
      sound(s, t);
      return d;
    },

    /** A glowing dot runs round a grid's edge, lighting one unit at a time (perimeter), with a count sound per unit. */
    trace(id, { at: t = 0, dur, sound: s = "pop", count } = {}) {
      const o = withDefaults(kindOf(id, ["grid"], "trace"));
      const units = 2 * (o.rows + o.cols);
      const len = dur ?? Math.min(10, 0.45 * units);
      // count: true pops 1, 2, 3... beside each unit edge as the dot passes it.
      if (count != null || once.has(`${id}|traceCount`)) {
        baseOnce(id, "traceCount", 0);
        tl.set(id, "traceCount", count ? 1 : 0, t);
      }
      tl.tween(id, "trace", { start: t, dur: len, from: 0, to: 1, ease: "linear" });
      if (s) for (let i = 1; i <= units; i++) sound(s, t + (len * i) / units, { volume: 0.5, pan: pan(o) });
      return d;
    },
  });
}
