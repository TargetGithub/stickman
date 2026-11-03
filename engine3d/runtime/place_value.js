// Place value charts (kind place_value_chart): column layout, digits placed right-aligned at the decimal point,
// and what a shift by powers of ten does to them (digits move, the point stays, zeros hold empty places).
// Shared by the director, the validator and the three.js builder. Pure: no three.js, no I/O.

/** The decimal point column in a chart's columns. */
export const POINT = ".";
/** Default columns: hundreds to hundredths, with the point. */
export const PV_COLUMNS = ["hundreds", "tens", "ones", POINT, "tenths", "hundredths"];
/** Width of the point column, as a share of a digit column. */
export const POINT_W = 0.4;

const DIGITS = /^(\d*)(?:\.(\d*))?$/;

/** True for a digit string a chart can show: "35", "35.2", "0.07", ".5" (at least one digit). */
export const digitsOk = (s) => typeof s === "string" && DIGITS.test(s) && /\d/.test(s) && s.length <= 16;

/**
 * Column layout: each column's x centre and width (metres, centred on the chart's at), its place (0 = ones,
 * 1 = tens, -1 = tenths; null for the point column) and the range of places the chart holds.
 * @param {{ columns?: string[], cell?: number }} o
 */
export function pvLayout(o) {
  const cols = o.columns ?? PV_COLUMNS;
  const c = o.cell ?? 0.8;
  const p = cols.indexOf(POINT);
  const P = p < 0 ? cols.length : p;
  const widths = cols.map((h) => (h === POINT ? c * POINT_W : c));
  const W = widths.reduce((a, b) => a + b, 0);
  let x = -W / 2;
  const out = cols.map((header, j) => {
    const col = { header, x: x + widths[j] / 2, w: widths[j], place: j === p ? null : j < P ? P - 1 - j : -(j - P) };
    x += widths[j];
    return col;
  });
  const places = out.filter((k) => k.place != null).map((k) => k.place);
  return { cols: out, width: W, point: p, pointX: p < 0 ? null : out[p].x, max: Math.max(...places), min: Math.min(...places), cell: c };
}

/** x of a (possibly fractional, mid-slide) place: column centres, straight lines between them and beyond. */
export function placeX(layout, place) {
  const at = new Map(layout.cols.filter((k) => k.place != null).map((k) => [k.place, k.x]));
  const x = (q) => {
    if (at.has(q)) return at.get(q);
    // Off the chart: carry on at one cell per place.
    return q > layout.max ? at.get(layout.max) - (q - layout.max) * layout.cell : at.get(layout.min) + (layout.min - q) * layout.cell;
  };
  const lo = Math.floor(place);
  const k = place - lo;
  return k < 1e-9 ? x(lo) : x(lo) + (x(lo + 1) - x(lo)) * k;
}

/** "35.2" → [{ ch: "3", place: 1 }, { ch: "5", place: 0 }, { ch: "2", place: -1 }]. */
export function parseDigits(s) {
  const m = DIGITS.exec(String(s));
  if (!m || !digitsOk(String(s))) throw new Error(`digits "${s}" must be digits with at most one point, like "35.2"`);
  const [int, frac = ""] = [m[1], m[2]];
  return [...[...int].map((ch, i) => ({ ch, place: int.length - 1 - i })), ...[...frac].map((ch, i) => ({ ch, place: -(i + 1) }))];
}

/**
 * Digits after multiplying by 10^places (+ moves them left, − right). Each entry keeps its index (`from`) so
 * the director can slide it; leading zeros and zeros left trailing after the point drop out (`gone`), and empty
 * places between the digits and the ones place fill with placeholder zeros (`added`). A number written in
 * standard form.
 * @param {Array<{ ch:string, place:number }>} entries
 * @returns {{ kept: Array<{ from:number, ch:string, place:number }>, gone: number[], added: Array<{ ch:"0", place:number }> }}
 */
export function shiftDigits(entries, places) {
  const moved = entries.map((e, i) => ({ from: i, ch: e.ch, place: e.place + places }));
  const nonzero = moved.filter((e) => e.ch !== "0").map((e) => e.place);
  const hi = Math.max(0, ...nonzero);
  const lo = Math.min(0, ...(nonzero.length ? nonzero : [0]));
  const keep = (e) => e.place <= hi && e.place >= lo;
  const kept = moved.filter(keep);
  const gone = moved.filter((e) => !keep(e)).map((e) => e.from);
  const have = new Set(kept.map((e) => e.place));
  const added = [];
  for (let q = hi; q >= lo; q--) if (!have.has(q)) added.push({ ch: "0", place: q });
  return { kept, gone, added };
}

/** The digits as written: entries → "350", "0.035". */
export function digitsText(entries) {
  if (!entries.length) return "";
  const by = new Map(entries.map((e) => [e.place, e.ch]));
  const hi = Math.max(0, ...by.keys());
  const lo = Math.min(0, ...by.keys());
  let s = "";
  for (let q = hi; q >= lo; q--) s += (q === -1 ? "." : "") + (by.get(q) ?? "0");
  return s;
}
