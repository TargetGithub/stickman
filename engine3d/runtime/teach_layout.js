// Teaching kit layout shared by the director (Node and page) and the three.js builders: number line ticks and
// labels, value → position on a line, piece counts and the order pieces are built in. Pure: no three.js, no I/O.

import { PV_COLUMNS } from "./place_value.js";

/** Kinds of the teaching kit (catalog/kinds.json). */
export const TEACH_KINDS = ["number_line", "fraction_bar", "fraction_circle", "array", "grid", "cubes", "pointer", "callout", "angle"];
/** Round 2 of the kit (teach_draw.js, teach_text.js, director_kit2.js): strokes, flows and text pieces. */
export const KIT2_KINDS = ["stroke", "flow", "fraction_text", "place_value_chart", "text_card"];
/** Height of a number line's beam top above its at: objects placed `on` a line stand here. */
export const LINE_TOP = 0.56;
/** Most ticks a number line may have (labels stay readable). */
export const MAX_TICKS = 201;

/** Defaults per kind (what the builders and the director assume when a field is left out). */
export const DEFAULTS = {
  number_line: { from: 0, to: 10, length: 8, step: 1, minor: 1, labels: "numbers", color: "blue" },
  fraction_bar: { parts: 4, shaded: 0, length: 3, height: 0.5, color: "orange", empty: "cream", label: false },
  fraction_circle: { parts: 4, shaded: 0, radius: 1, color: "orange", empty: "cream", label: false },
  array: { rows: 3, cols: 4, item: "dot", gap: 0.2, color: "red", size: 0.4, trays: false },
  grid: { rows: 3, cols: 4, cell: 0.5, color: "sky", upright: false },
  cubes: { l: 3, w: 2, h: 2, cell: 0.4, color: "orange", box: false },
  pointer: { color: "orange", width: 0.1, bend: 0, head: "arrow", tail: "none" },
  callout: { offset: [1.2, 1, 0], color: "ink", bg: "white" },
  angle: { degrees: 45, radius: 1.2, color: "blue", arc: true, label: true },
  stroke: { smooth: false, closed: false, width: 0.08, color: "blue", pen: false },
  flow: { smooth: false, closed: false, count: 12, speed: 0.6, size: 0.14, color: "red", track: false },
  fraction_text: { color: "ink", size: 0.5, depth: 0.2 },
  place_value_chart: { columns: PV_COLUMNS, cell: 0.8, color: "blue", bg: "white", digitColor: "ink", zeroColor: "orange" },
  text_card: { width: 4, size: 0.2, color: "ink", bg: "white" },
};

/** An object's fields with the kind's defaults filled in. */
export const withDefaults = (o) => ({ ...DEFAULTS[o.kind], ...o });

const round = (v) => Math.round(v * 1e9) / 1e9;

/**
 * Every tick of a number line, left to right: { value, major, x } with x along the line from its centre.
 * Labelled (major) ticks every `step`, with `minor` equal parts between them.
 */
export function lineTicks(line) {
  const o = withDefaults(line);
  const n = Math.round((o.to - o.from) / o.step);
  const out = [];
  for (let k = 0; k <= n * o.minor; k++) {
    const value = round(o.from + (k * o.step) / o.minor);
    if (value > o.to + 1e-9) break;
    out.push({ value, major: k % o.minor === 0, x: ((value - o.from) / (o.to - o.from)) * o.length - o.length / 2 });
  }
  return out;
}

/** A number written short: 3, 2.5, 0.25 (at most three decimals). */
export const formatNumber = (v) => String(Math.round(v * 1000) / 1000);

/** "3/4" for 0.75 on a line cut into quarters; whole numbers stay whole ("1", not "4/4"). */
export function fractionText(value, den) {
  const num = Math.round(value * den);
  return num % den === 0 ? String(num / den) : `${num}/${den}`;
}

/** The label under each tick (null: none), per the line's labels mode. */
export function lineLabels(line) {
  const o = withDefaults(line);
  const ticks = lineTicks(o);
  if (o.labels === "none") return ticks.map(() => null);
  if (Array.isArray(o.labels)) {
    if (o.labels.length === ticks.length) return ticks.map((_, i) => String(o.labels[i]));
    let j = 0;
    return ticks.map((t) => (t.major ? (o.labels[j++] != null ? String(o.labels[j - 1]) : null) : null));
  }
  if (o.labels === "fractions") {
    const per = o.minor / o.step; // parts per whole
    const den = Number.isInteger(round(per)) ? round(per) : o.minor;
    return ticks.map((t) => fractionText(t.value, den));
  }
  return ticks.map((t) => (t.major ? formatNumber(t.value) : null));
}

/**
 * The world point for a value on a number line (from its spawn at and turn about y): where an object placed
 * `on` it stands. Values outside from..to carry on along the same line.
 * @param {{ at?: number[], rotation?: number[], from?: number, to?: number, length?: number }} line
 */
export function linePoint(line, value) {
  const o = withDefaults(line);
  const at = Array.isArray(o.at) ? o.at : [0, 0, 0];
  const yaw = ((Array.isArray(o.rotation) ? o.rotation[1] : 0) * Math.PI) / 180;
  const x = ((value - o.from) / (o.to - o.from)) * o.length - o.length / 2;
  return [round(at[0] + Math.cos(yaw) * x), round(at[1] + LINE_TOP), round(at[2] - Math.sin(yaw) * x)];
}

/** Resolve `on: { line, value }` to an at (the line must already be placed). Returns the spec unchanged otherwise. */
export function placeOn(spec, objects) {
  if (!spec?.on) return spec;
  const line = objects.get(spec.on.line);
  if (!line || line.kind !== "number_line") throw new Error(`object "${spec.id}": on.line "${spec.on.line}" is not a number line placed before it`);
  return { ...spec, at: linePoint(line, spec.on.value) };
}

/** How many pieces a teaching object is made of (what build reveals and piece names count). */
export function pieceCount(obj) {
  const o = withDefaults(obj);
  switch (o.kind) {
    case "number_line": return lineTicks(o).length;
    case "fraction_bar":
    case "fraction_circle": return o.parts;
    case "array":
    case "grid": return o.rows * o.cols;
    case "cubes": return o.l * o.w * o.h;
    default: return 0;
  }
}

/** Piece name prefix for "<id>#<prefix><n>" targets (1-based): bar parts p1.., slices s1.., items i1.., cells/cubes c1... */
export const PIECE_PREFIX = { fraction_bar: "p", fraction_circle: "s", array: "i", grid: "c", cubes: "c" };

/** Every piece name of an object ("s1", "s2", ...), or [] for kinds without pieces. */
export function pieceNames(o) {
  const p = PIECE_PREFIX[o.kind];
  return p ? Array.from({ length: pieceCount(o) }, (_, i) => `${p}${i + 1}`) : [];
}

/** Build orders each kind accepts (the first is the default). */
export const BUILD_ORDERS = {
  number_line: ["items"], fraction_bar: ["items"], fraction_circle: ["items"],
  array: ["items", "rows", "cols"], grid: ["items", "rows", "cols"], cubes: ["items", "rows", "layers"],
};

/**
 * Steps a build takes in an order, and the step each piece appears at. Pieces are numbered row by row (array
 * and grid: row 0 first; cubes: bottom layer first, then front to back, then left to right).
 * @returns {{ steps: number, stepOf: (i:number) => number }}
 */
export function buildSteps(obj, order = "items") {
  const o = withDefaults(obj);
  const n = pieceCount(o);
  if (o.kind === "array" || o.kind === "grid") {
    if (order === "rows") return { steps: o.rows, stepOf: (i) => Math.floor(i / o.cols) };
    if (order === "cols") return { steps: o.cols, stepOf: (i) => i % o.cols };
  }
  if (o.kind === "cubes") {
    if (order === "layers") return { steps: o.h, stepOf: (i) => Math.floor(i / (o.l * o.w)) };
    if (order === "rows") return { steps: o.h * o.w, stepOf: (i) => Math.floor(i / o.l) };
  }
  return { steps: n, stepOf: (i) => i };
}

/**
 * The cell numbers (from 1, row by row) of a block of a grid or array: rect [row, col, rows, cols], row and
 * col from 1 (row 1 on top). null when the block does not fit.
 */
export function rectCells(o, rect) {
  if (!Array.isArray(rect) || rect.length !== 4 || !rect.every((v) => Number.isInteger(v) && v >= 1)) return null;
  const [r0, c0, nr, nc] = rect;
  if (r0 + nr - 1 > o.rows || c0 + nc - 1 > o.cols) return null;
  const out = [];
  for (let r = r0; r < r0 + nr; r++) for (let c = c0; c < c0 + nc; c++) out.push((r - 1) * o.cols + c);
  return out;
}

/** Grid cell / array item index → [row, col]; cube index → [x, y, z] units. */
export const rowCol = (o, i) => [Math.floor(i / o.cols), i % o.cols];
export const cubeXYZ = (o, i) => [i % o.l, Math.floor(i / (o.l * o.w)), Math.floor(i / o.l) % o.w];

/** About how tall an object stands (m): a callout with a target points at 0.6 of it. */
export function approxHeight(obj) {
  const o = TEACH_KINDS.includes(obj.kind) || KIT2_KINDS.includes(obj.kind) ? withDefaults(obj) : obj;
  const s = o.size ?? 1;
  const sy = Array.isArray(o.scale) ? o.scale[1] : typeof o.scale === "number" ? o.scale : 1;
  const h = {
    shape: s, number_block: s, letter: 1.41 * s, critter: 1.1 * s, prop: s, character: 1.7, clock: o.size ?? 2,
    number_line: 0.6, fraction_bar: o.height, fraction_circle: 2 * o.radius, array: o.rows * (o.size + o.gap),
    grid: o.upright ? o.rows * o.cell : 0.1, cubes: o.h * o.cell, angle: o.radius * 0.6, pointer: 0.3, callout: 0.5,
    fraction_text: 2.2 * s, place_value_chart: 1.55 * o.cell, text_card: o.kind === "text_card" ? cardHeight(o) : 0,
  }[o.kind] ?? 1;
  return h * sy;
}

/**
 * A text card's height (m) as the director guesses it before the page wraps the text: about 0.5 em per
 * character, 1.4 em per line, 0.7 em of margin top and bottom (the page measures the real one).
 */
export function cardHeight(obj) {
  const o = withDefaults(obj);
  const perLine = Math.max(4, Math.floor((o.width - 1.4 * o.size) / (0.5 * o.size)));
  const lines = String(o.text ?? "").split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0);
  return lines * 1.4 * o.size + 1.4 * o.size;
}
