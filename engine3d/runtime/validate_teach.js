// Validation for the teaching kit (kinds and actions in catalog/kinds.json and actions.json): fields, ranges,
// number line placement (on) and leap values, and which actions take which kinds. validate.js calls these.

import { BUILD_ORDERS, MAX_TICKS, pieceCount, pieceNames, withDefaults } from "./teach_layout.js";

export const TEACH_FIELDS = {
  number_line: ["from", "to", "length", "step", "minor", "labels", "color"],
  fraction_bar: ["parts", "shaded", "length", "height", "color", "empty", "label", "sizes"],
  fraction_circle: ["parts", "shaded", "radius", "color", "empty", "label", "sizes"],
  array: ["rows", "cols", "item", "gap", "color", "size", "trays"],
  grid: ["rows", "cols", "cell", "color", "upright", "labels"],
  cubes: ["l", "w", "h", "cell", "color", "box"],
  pointer: ["from", "to", "color", "width", "bend", "head", "tail", "fromTarget", "toTarget"],
  callout: ["text", "point", "target", "offset", "color", "bg"],
  angle: ["degrees", "radius", "color", "arc", "label"],
};

export const TEACH_TARGETS = {
  build: Object.keys(BUILD_ORDERS), shade: ["fraction_bar", "fraction_circle", "grid", "array"], draw: ["pointer", "number_line", "callout", "stroke"],
  open: ["angle", "prop"], trace: ["grid"], clear: ["number_line"],
};
/** Actions that may target any piece ("pie#s2", "grid#c5") as well as whole objects. */
export const PIECE_ACTIONS = new Set(["mark", "highlight"]);
/** Kinds whose pieces also take move, turn, wiggle and spin. */
export const MOVABLE_PIECES = new Set(["fraction_bar", "fraction_circle"]);
/** Actions whose `to` is a number, not [x, y, z]. */
export const NUMBER_TO = new Set(["shade", "open"]);

const isVec = (v) => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === "number" && Number.isFinite(x));
const isNum = (v, lo = -Infinity, hi = Infinity) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

/** Piece names an object has for <id>#<piece> targets. */
export const teachPieces = (o) => pieceNames(withDefaults(o));

/**
 * @param {object} o  the object
 * @param {string} p  its path
 * @param {{ err, warn, ids: Map, catalog, name }} k
 */
export function checkTeachObject(o, p, { err, warn, ids, catalog, name }) {
  if (o.on != null) checkOn(o, p, { err, warn, ids });
  if (!TEACH_FIELDS[o.kind]) return;
  const f = withDefaults(o);
  const range = (key, ok, msg) => o[key] != null && !ok(o[key]) && err("E3D_RANGE", `${p}.${key}`, msg);
  for (const k of ["color", "empty", "bg"]) name(catalog.colors, o[k], "E3D_COLOR", `${p}.${k}`, "color");
  for (const k of ["label", "trays", "upright", "box", "arc"]) if (o[k] != null && typeof o[k] !== "boolean") err("E3D_TYPE", `${p}.${k}`, `${k} must be true or false`);
  if (o.kind === "number_line") {
    for (const k of ["from", "to"]) range(k, (v) => isNum(v, -1000, 1000), `${k} must be a number`);
    range("length", (v) => isNum(v, 0.5, 30), "length must be 0.5-30 m");
    range("step", (v) => isNum(v, 1e-6), "step must be more than 0");
    range("minor", (v) => isInt(v, 1, 12), "minor must be a whole number 1-12");
    if (!(f.to > f.from)) err("E3D_RANGE", `${p}.to`, "to must be more than from");
    else if (Math.abs((f.to - f.from) / f.step - Math.round((f.to - f.from) / f.step)) > 1e-6) err("E3D_RANGE", `${p}.step`, "from-to must be a whole number of steps");
    else if (pieceCount(f) > MAX_TICKS) err("E3D_RANGE", `${p}.minor`, `too many ticks (${pieceCount(f)}; at most ${MAX_TICKS})`);
    const l = o.labels;
    if (l != null && !["numbers", "fractions", "none"].includes(l) && !(Array.isArray(l) && l.every((x) => typeof x === "string" || typeof x === "number"))) err("E3D_LABELS", `${p}.labels`, 'labels must be "numbers", "fractions", "none" or a list of strings');
  }
  if (o.kind === "fraction_bar" || o.kind === "fraction_circle") {
    if (o.parts != null && !isInt(o.parts, 1, 24)) err("E3D_PARTS", `${p}.parts`, "parts must be a whole number 1-24");
    else if (o.shaded != null && !isInt(o.shaded, 0, f.parts)) err("E3D_SHADED", `${p}.shaded`, `shaded must be a whole number 0-${f.parts} (the parts)`);
    for (const k of ["length", "height", "radius"]) range(k, (v) => isNum(v, 0.1, 20), `${k} must be 0.1-20 m`);
  }
  if (["array", "grid"].includes(o.kind)) for (const k of ["rows", "cols"]) range(k, (v) => isInt(v, 1, 20), `${k} must be a whole number 1-20`);
  if (o.kind === "array") {
    if (o.item != null && o.item !== "dot" && !catalog.shapes[o.item] && !catalog.props[o.item]) err("E3D_ITEM", `${p}.item`, `item must be dot, a shape or a prop model, got "${o.item}"`);
    range("gap", (v) => isNum(v, 0, 5), "gap must be 0-5 m");
  }
  if (o.kind === "grid" || o.kind === "cubes") range("cell", (v) => isNum(v, 0.1, 3), "cell must be 0.1-3 m");
  if (o.kind === "cubes") {
    for (const k of ["l", "w", "h"]) range(k, (v) => isInt(v, 1, 10), `${k} must be a whole number 1-10`);
  }
  if (o.kind === "pointer") {
    // With fromTarget / toTarget the end follows an object, and from / to are optional offsets from it.
    for (const k of ["from", "to"]) {
      const follows = o[`${k}Target`] != null;
      if (follows ? o[k] != null && !isVec(o[k]) : !isVec(o[k])) err(o[k] == null ? "E3D_REQUIRED" : "E3D_VEC", `${p}.${k}`, `pointer needs ${k}: [x, y, z]${follows ? "" : ` (or ${k}Target)`}`);
    }
    range("width", (v) => isNum(v, 0.01, 1), "width must be 0.01-1 m");
    range("bend", (v) => isNum(v, -10, 10), "bend must be -10 to 10 m");
  }
  if (o.kind === "callout") {
    if (typeof o.text !== "string" || !o.text.trim() || o.text.length > 40) err("E3D_TEXT", `${p}.text`, "callout text must be 1-40 characters");
    if (o.point != null && !isVec(o.point)) err("E3D_VEC", `${p}.point`, "must be [x, y, z]");
    if (o.offset != null && !isVec(o.offset)) err("E3D_VEC", `${p}.offset`, "must be [x, y, z]");
    if (o.point == null && o.target == null) err("E3D_REQUIRED", `${p}.point`, "callout needs point or target");
    if (o.target != null && !ids.has(o.target)) err("E3D_TARGET", `${p}.target`, `no object "${o.target}" placed before "${o.id}"`);
  }
  if (o.kind === "angle") {
    range("degrees", (v) => isNum(v, 0, 360), "degrees must be 0-360");
    range("radius", (v) => isNum(v, 0.2, 10), "radius must be 0.2-10 m");
  }
}

/** on: { line, value } — the line must be a number line placed before, and the value on it. */
function checkOn(o, p, { err, warn, ids }) {
  const line = ids.get(o.on?.line);
  if (!line || line.kind !== "number_line") return err("E3D_ON_LINE", `${p}.on.line`, `on.line must name a number_line placed before "${o.id}", got "${o.on?.line}"`);
  if (o.parent != null) err("E3D_ON_LINE", `${p}.on`, "on cannot be used with parent");
  const f = withDefaults(line);
  if (!isNum(o.on.value, f.from, f.to)) err("E3D_ON_VALUE", `${p}.on.value`, `value must be a number ${f.from}-${f.to} (the line's range)`);
  if (o.at != null) warn("W3D_ON_AT", `${p}.at`, "on places the object: at is ignored");
}

/**
 * @param {object} a  the action
 * @param {string} p  its path
 * @param {object} o  the target object
 * @param {{ err, ids: Map, catalog }} k
 */
export function checkTeachAction(a, p, o, { err, ids, catalog }) {
  const kinds = TEACH_TARGETS[a.do];
  if (kinds && !kinds.includes(o.kind)) return err("E3D_TARGET_KIND", `${p}.target`, `${a.do} needs a ${kinds.join(" or ")}, "${a.target}" is a ${o.kind}`);
  if (a.color != null && ["shade", "leap", "highlight"].includes(a.do) && !catalog.colors[a.color]) err("E3D_COLOR", `${p}.color`, `unknown color "${a.color}"`);
  if (a.do === "build" && a.order != null && !BUILD_ORDERS[o.kind].includes(a.order)) err("E3D_ORDER", `${p}.order`, `a ${o.kind} builds in order ${BUILD_ORDERS[o.kind].join(", ")}`);
  if (a.do === "shade" && a.cells == null && a.rect == null) {
    const n = pieceCount(withDefaults(o));
    if (!isInt(a.to, 0, n)) err("E3D_SHADED", `${p}.to`, `shade to must be a whole number 0-${n} (the parts of "${a.target}")`);
  }
  if (a.do === "open" && o?.kind === "angle" && !isNum(a.to, 0, 360)) err("E3D_RANGE", `${p}.to`, "open needs to: 0-360 degrees");
  if (a.do === "mark" && a.result != null && a.result !== "correct" && a.result !== "incorrect") err("E3D_RESULT", `${p}.result`, 'result must be "correct" or "incorrect"');
  if (a.do === "leap") {
    const line = ids.get(a.line);
    if (!line || line.kind !== "number_line") return err("E3D_ON_LINE", `${p}.line`, `leap needs line: a number_line id, got "${a.line}"`);
    if (a.line === a.target) err("E3D_TARGET_KIND", `${p}.target`, "a number line cannot leap along itself");
    const f = withDefaults(line);
    if (!Array.isArray(a.values) || !a.values.length) return err("E3D_REQUIRED", `${p}.values`, "leap needs values: a list of numbers");
    a.values.forEach((v, i) => !isNum(v, f.from, f.to) && err("E3D_LEAP_VALUE", `${p}.values[${i}]`, `${v} is not on "${a.line}" (${f.from}-${f.to})`));
    if (a.height != null && !isNum(a.height, 0, 10)) err("E3D_RANGE", `${p}.height`, "height must be 0-10 m");
  }
}
