// Validation for round 2 of the teaching kit: the stroke, flow, fraction_text, place_value_chart and
// text_card kinds, the new options on older kinds (pointer ends, fraction sizes, grid labels, letter
// colours) and the actions shift, set, emphasize, reparent and point (plus spin/turn axis). validate.js calls
// these. Pure.

import { CARD_MAX_CHARS, CARD_MAX_LINES, findWords } from "./card_words.js";
import { POINT, digitsOk, parseDigits, pvLayout, shiftDigits } from "./place_value.js";
import { pointPart } from "./director_kit2.js";
import { cardHeight, withDefaults } from "./teach_layout.js";

export const KIT2_FIELDS = {
  stroke: ["points", "smooth", "closed", "width", "color", "pen"],
  flow: ["points", "smooth", "closed", "count", "speed", "size", "color", "changes", "track"],
  fraction_text: ["numerator", "denominator", "whole", "color", "size", "depth"],
  place_value_chart: ["columns", "digits", "cell", "color", "bg", "digitColor", "zeroColor"],
  text_card: ["text", "width", "size", "color", "bg", "align", "height", "depth", "pad"],
};
const ENDS = { head: ["arrow", "none", "dot"], tail: ["none", "arrow", "dot"] };
const PENS = [true, false, "pencil", "dot"];
const AXES = ["x", "y", "z"];
const HANDLED = new Set(["shift", "set", "emphasize", "reparent", "point"]);

const isVec = (v) => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === "number" && Number.isFinite(x));
const isNum = (v, lo = -Infinity, hi = Infinity) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const short = (v) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 9999) || (typeof v === "string" && v.length >= 1 && v.length <= 4 && !/\s/.test(v));

/**
 * Object checks (new kinds and new fields on older ones).
 * @param {{ err, warn, ids: Map, catalog, name }} k
 */
export function checkKit2Object(o, p, { err, ids, catalog, name }) {
  const range = (key, ok, msg, code = "E3D_RANGE") => o[key] != null && !ok(o[key]) && err(code, `${p}.${key}`, msg);
  const bool = (key) => o[key] != null && typeof o[key] !== "boolean" && err("E3D_TYPE", `${p}.${key}`, `${key} must be true or false`);
  if (o.kind === "letter" && o.colors != null) {
    if (!Array.isArray(o.colors) || o.colors.length > Array.from(String(o.text ?? "")).length) err("E3D_COLOR", `${p}.colors`, "colors must be a list of colour names, one per character at most");
    else o.colors.forEach((c, i) => c != null && name(catalog.colors, c, "E3D_COLOR", `${p}.colors[${i}]`, "color"));
  }
  if ((o.kind === "fraction_bar" || o.kind === "fraction_circle") && o.sizes != null) {
    const n = withDefaults(o).parts;
    const ok = Array.isArray(o.sizes) && o.sizes.length === n && o.sizes.every((x) => isNum(x, 0.01, 1)) && Math.abs(o.sizes.reduce((a, b) => a + b, 0) - 1) < 0.011;
    if (!ok) err("E3D_SIZES", `${p}.sizes`, `sizes must be ${n} shares (one per part, each 0.01-1) adding up to 1`);
  }
  if (o.kind === "grid" && o.labels != null && o.labels !== "numbers") err("E3D_LABELS", `${p}.labels`, 'grid labels must be "numbers"');
  if (o.kind === "pointer") {
    for (const k of ["head", "tail"]) range(k, (v) => ENDS[k].includes(v), `${k} must be ${ENDS[k].join(", ")}`, "E3D_ENDS");
    for (const k of ["fromTarget", "toTarget"]) {
      if (o[k] == null) continue;
      if (!ids.has(o[k]) || o[k] === o.id) err("E3D_TARGET", `${p}.${k}`, `${k} must name an object placed before "${o.id}"`);
    }
  }
  if (!KIT2_FIELDS[o.kind]) return;
  for (const k of ["color", "bg", "digitColor", "zeroColor"]) if (!(k === "bg" && o.kind === "text_card" && o[k] === "none")) name(catalog.colors, o[k], "E3D_COLOR", `${p}.${k}`, "color");
  for (const k of ["smooth", "closed", "track"]) bool(k);
  if (o.kind === "stroke" || o.kind === "flow") {
    if (!(Array.isArray(o.points) && o.points.length >= 2 && o.points.length <= 400 && o.points.every(isVec))) err("E3D_POINTS", `${p}.points`, "points must be a list of 2-400 [x, y, z]");
  }
  if (o.kind === "stroke") {
    range("width", (v) => isNum(v, 0.01, 1), "width must be 0.01-1 m");
    range("pen", (v) => PENS.includes(v), 'pen must be true, false, "pencil" or "dot"', "E3D_PEN");
  }
  if (o.kind === "flow") {
    range("count", (v) => isInt(v, 1, 200), "count must be a whole number 1-200");
    range("speed", (v) => isNum(v, 0, 20), "speed must be 0-20 m/s");
    range("size", (v) => isNum(v, 0.02, 1), "size must be 0.02-1 m");
    if (o.changes != null) {
      if (!Array.isArray(o.changes)) err("E3D_CHANGES", `${p}.changes`, "changes must be a list of { at, color }");
      else o.changes.forEach((c, i) => {
        if (!isNum(c?.at, 0, 1)) err("E3D_CHANGES", `${p}.changes[${i}].at`, "at must be 0-1 (the share of the path)");
        if (!catalog.colors[c?.color]) err("E3D_COLOR", `${p}.changes[${i}].color`, `unknown color "${c?.color}"`);
      });
    }
  }
  if (o.kind === "fraction_text") {
    for (const k of ["numerator", "denominator"]) if (!short(o[k])) err(o[k] == null ? "E3D_REQUIRED" : "E3D_FRACTION", `${p}.${k}`, `${k} must be a whole number 0-9999 (or up to 4 characters)`);
    if (o.whole != null && !short(o.whole)) err("E3D_FRACTION", `${p}.whole`, "whole must be a whole number 0-9999 (or up to 4 characters)");
    range("depth", (v) => isNum(v, 0.02, 1), "depth must be 0.02-1 (times size)");
  }
  if (o.kind === "place_value_chart") {
    const cols = o.columns;
    if (cols != null && !(Array.isArray(cols) && cols.length >= 1 && cols.length <= 12 && cols.every((c) => typeof c === "string" && c.length <= 14) && cols.filter((c) => c === POINT).length <= 1 && cols.some((c) => c !== POINT))) {
      err("E3D_COLUMNS", `${p}.columns`, 'columns must be 1-12 header strings (up to 14 characters each), with at most one "." for the decimal point');
    }
    range("cell", (v) => isNum(v, 0.2, 3), "cell must be 0.2-3 m");
    if (o.digits != null && o.digits !== "") {
      if (!digitsOk(o.digits)) err("E3D_PV_DIGITS", `${p}.digits`, 'digits must be a string of digits with at most one point, like "35.2"');
      else if (!fits(o, parseDigits(o.digits))) err("E3D_PV_RANGE", `${p}.digits`, `"${o.digits}" does not fit the chart's columns`);
    }
  }
  if (o.kind === "text_card") {
    if (typeof o.text !== "string" || !o.text.trim() || o.text.length > CARD_MAX_CHARS) err(o.text == null ? "E3D_REQUIRED" : "E3D_TEXT", `${p}.text`, `text must be 1-${CARD_MAX_CHARS} characters`);
    else if (o.height == null && cardHeight(o) / (1.4 * withDefaults(o).size) - 1 > CARD_MAX_LINES + 0.01) err("E3D_TEXT", `${p}.text`, `text needs more than ${CARD_MAX_LINES} lines at this width and size: shorten it, widen the card or use a smaller size`);
    range("width", (v) => isNum(v, 0.2, 12), "width must be 0.2-12 m");
    range("size", (v) => isNum(v, 0.03, 0.6), "size must be 0.03-0.6 m");
    range("height", (v) => isNum(v, 0.1, 8), "height must be 0.1-8 m (a fixed card height; the text shrinks to fit)");
    range("depth", (v) => isNum(v, 0.01, 0.5), "depth must be 0.01-0.5 m");
    range("pad", (v) => isNum(v, 0, 1.5), "pad must be 0-1.5 (a share of the font size)");
    if (o.align != null && !["left", "center"].includes(o.align)) err("E3D_ALIGN", `${p}.align`, 'align must be "left" or "center"');
  }
}

const fits = (o, entries) => {
  const L = pvLayout(withDefaults(o));
  return entries.every((e) => e.place <= L.max && e.place >= L.min);
};

/**
 * Action checks. One checker per script: it follows each place value chart's digits through shift and set
 * (in script order) to catch digits pushed off the chart. check() returns true when it fully handled the
 * action (validate.js then skips its own checks).
 * @param {{ err, ids: Map, catalog, partNames: (o:object) => string[] }} k
 */
export function createKit2Checker({ err, ids, catalog, partNames, texts }) {
  const charts = new Map();
  const digitsOf = (o) => {
    if (!charts.has(o.id)) charts.set(o.id, o.digits && digitsOk(o.digits) ? parseDigits(o.digits) : []);
    return charts.get(o.id);
  };
  const target = (a, p, kinds, what) => {
    const o = ids.get(a.target);
    if (!o) return err("E3D_TARGET", `${p}.target`, `no object "${a.target}"`), null;
    if (kinds && !kinds.includes(o.kind)) return err("E3D_TARGET_KIND", `${p}.target`, `${what} needs a ${kinds.join(" or ")}, "${a.target}" is a ${o.kind}`), null;
    return o;
  };
  return function check(a, p) {
    if (HANDLED.has(a.do) && a.sound != null && a.sound !== false && !catalog.sounds[a.sound]) err("E3D_SOUND", `${p}.sound`, `unknown sound "${a.sound}"`);
    if ((a.do === "spin" || a.do === "turn") && a.axis != null && !AXES.includes(a.axis)) err("E3D_AXIS", `${p}.axis`, "axis must be x, y or z");
    if (a.do === "turn" && a.by != null && !isNum(a.by, -3600, 3600)) err("E3D_RANGE", `${p}.by`, "by must be degrees (-3600 to 3600)");
    if (a.do === "turn" && a.to == null && a.by == null) err("E3D_REQUIRED", `${p}.to`, "turn needs to: [x, y, z] or by: degrees");
    if (a.do === "shade" && a.cells != null) {
      const o = ids.get(a.target);
      const n = o ? pieceTotal(o) : 0;
      if (!Array.isArray(a.cells) || a.cells.some((c) => !isInt(c, 1, n)) || new Set(a.cells).size !== a.cells.length) err("E3D_CELLS", `${p}.cells`, `cells must be different piece numbers 1-${n}`);
      if (a.to != null) err("E3D_CELLS", `${p}.to`, "shade takes to or cells, not both");
    }
    if (a.do === "shift") {
      const o = target(a, p, ["place_value_chart"], "shift");
      if (!isInt(a.places, -8, 8) || a.places === 0) return err("E3D_RANGE", `${p}.places`, "places must be a whole number -8 to 8, not 0 (+ moves digits left: × 10)"), true;
      if (!o) return true;
      const { kept, added } = shiftDigits(digitsOf(o), a.places);
      const next = [...kept, ...added];
      if (!fits(o, next)) err("E3D_PV_RANGE", `${p}.places`, `shifting "${a.target}" by ${a.places} pushes a digit off the chart`);
      charts.set(o.id, next.map(({ ch, place }) => ({ ch, place })));
      return true;
    }
    if (a.do === "set") {
      const o = target(a, p, ["place_value_chart"], "set");
      if (!digitsOk(a.digits)) return err("E3D_PV_DIGITS", `${p}.digits`, 'set needs digits: a string like "35.2"'), true;
      if (o && !fits(o, parseDigits(a.digits))) err("E3D_PV_RANGE", `${p}.digits`, `"${a.digits}" does not fit "${a.target}"`);
      if (o) charts.set(o.id, parseDigits(a.digits));
      return true;
    }
    if (a.do === "emphasize") {
      const o = target(a, p, ["text_card"], "emphasize");
      if (a.color != null && !catalog.colors[a.color]) err("E3D_COLOR", `${p}.color`, `unknown color "${a.color}"`);
      if (a.words == null && !a.clear) err("E3D_REQUIRED", `${p}.words`, 'emphasize needs words: "a phrase" or [start, end] (or clear: true)');
      else if (o && a.words != null && ![o.text, ...(texts?.get(o.id) ?? [])].some((tx) => findWords(tx, a.words))) err("E3D_EMPHASIZE", `${p}.words`, `"${a.target}" has no words ${JSON.stringify(a.words)}`);
      return true;
    }
    if (a.do === "reparent") {
      const o = target(a, p);
      if (a.parent != null) {
        const par = ids.get(a.parent);
        if (!par) err("E3D_REPARENT", `${p}.parent`, `no object "${a.parent}" (null puts it back in the world)`);
        else if (a.parent === a.target) err("E3D_REPARENT", `${p}.parent`, "an object cannot ride on itself");
        else if (a.part != null && !(["critter", "prop", "letter"].includes(par.kind) && partNames(par).includes(a.part))) err("E3D_PART", `${p}.part`, `"${a.parent}" has no named part "${a.part}"`);
      } else if (a.part != null) err("E3D_PART", `${p}.part`, "part needs a parent");
      if (o && String(a.target).includes("#")) err("E3D_REPARENT", `${p}.target`, "reparent moves whole objects, not parts");
      if (a.to != null && !isVec(a.to)) err("E3D_VEC", `${p}.to`, "must be [x, y, z] (in the new parent)");
      if (a.rotation != null && !isVec(a.rotation)) err("E3D_VEC", `${p}.rotation`, "must be [x, y, z] degrees");
      return true;
    }
    if (a.do === "point") {
      const o = target(a, p, ["character", "critter", "prop"], "point");
      if (o && o.kind !== "character" && !pointPart(o, catalog, a.part)) err("E3D_POINT", `${p}.${a.part != null ? "part" : "target"}`, `"${a.target}" has no ${a.part ?? "arm or wing"} part to point with`);
      if (a.to == null) err("E3D_REQUIRED", `${p}.to`, "point needs to: an object id or [x, y, z]");
      else if (typeof a.to === "string" ? !ids.has(a.to) || a.to === a.target : !isVec(a.to)) err("E3D_POINT", `${p}.to`, "to must be another object's id or [x, y, z]");
      if (a.arm != null && a.arm !== "left" && a.arm !== "right") err("E3D_POINT", `${p}.arm`, 'arm must be "left" or "right"');
      if (a.hold != null && !isNum(a.hold, 0, 60)) err("E3D_RANGE", `${p}.hold`, "hold must be 0-60 s");
      return true;
    }
    return false;
  };
}

const pieceTotal = (o) => {
  const f = withDefaults(o);
  return f.kind === "grid" || f.kind === "array" ? f.rows * f.cols : f.parts ?? 0;
};
