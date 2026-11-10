// Composite kinds (Toybox 10K): `card`, `page` and `board` are built from existing kinds. A composite object
// becomes a `group` with its own id plus child objects (`<id>_text`, `<id>_l3`, `<id>_s2_1`, ...) parented to
// it, before the director or the validator sees it, so every action that works on shapes, text cards, letters
// and props (move, turn, highlight, emphasize, reparent, mark, pop, wiggle) works on the pieces with no new
// renderer code. Pure (Node and page). Field reference: catalog/kinds.json; guide: engine3d/README.md.
//
// Shapes used here, measured from their at: a `plate` turned [90, 0, 0] is centred on its at and grows toward
// +z by its thickness; a `cylinder` stands on its at; a `hoop` turned [90, 0, 0] is centred on its at.

import { localBounds } from "./bounds.js";
import { cardHeight } from "./teach_layout.js";
import { COMPOSITE2_FIELDS, expandBook, expandChoices, expandSign, expandWordTrain } from "./composite2.js";

export const COMPOSITE_KINDS = ["card", "page", "board", "sign", "word_train", "book", "choices"];
export const isComposite = (o) => COMPOSITE_KINDS.includes(o?.kind);

const COMMON = ["at", "rotation", "hidden", "parent", "part", "pivot", "hud", "inherit", "description", "on"];
export const COMPOSITE_FIELDS = {
  card: ["style", "text", "picture", "pictureColor", "relief", "tag", "width", "height", "color", "bg", "rim", "accent", "size", "scale"],
  page: ["style", "title", "lines", "numbers", "picture", "pictureColor", "relief", "caption", "sidebar", "width", "size", "color", "bg", "accent", "scale"],
  board: ["style", "layout", "labels", "rows", "title", "width", "height", "easel", "color", "accent", "cardWidth", "cardHeight", "scale"],
  ...COMPOSITE2_FIELDS,
};

const CARD = {
  card: { w: 0.9, h: 1.15, t: 0.03, bg: "white", rim: "sky", text: 0.13, align: "center" },
  tile: { h: 0.62, t: 0.16, bg: "wood", text: 0.3, align: "center" },
  word: { h: 0.55, t: 0.04, bg: "cream", text: 0.22, align: "center" },
  strip: { h: 0.5, t: 0.03, bg: "white", text: 0.16, align: "left" },
  quote: { w: 2.4, t: 0.03, bg: "white", text: 0.12, align: "left" },
  name_tag: { w: 0.8, h: 0.4, t: 0.03, bg: "white", rim: "red", text: 0.15, align: "center" },
};
const PAGE = {
  book: { bg: "cream", accent: "orange", numbers: true },
  article: { bg: "white", accent: "blue", numbers: true },
  script: { bg: "white", accent: "purple", numbers: false },
  scroll: { bg: "wall_warm", accent: "brown", numbers: false },
  letter: { bg: "white", accent: "red", numbers: false },
};
const BOARD = { cork: { bg: "cork", ink: "ink", head: "white" }, white: { bg: "white", ink: "ink", head: "sky" }, chalk: { bg: "chalkboard", ink: "white", head: "none" } };
const LAYOUTS = ["pins", "columns", "venn", "timeline"];

const vec3 = (v, d) => (Array.isArray(v) ? v : typeof v === "number" ? [v, v, v] : d);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);

/** A plate standing up, its front face at z = front, centred at (x, y). */
const slab = (x, y, front, w, h, t, color, material = "matte") => ({ kind: "shape", shape: "plate", color, material, at: r3([x, y, front - t]), rotation: [90, 0, 0], scale: r3([w, t / 0.04, h]) });

/** The object that shows a picture: a prop, critter or shape name, fitted into a w × h box standing on (x, y). */
function picture(name, color, catalog, x, y, front, w, h, relief = 0.4) {
  const kind = catalog.props?.[name] ? "prop" : catalog.critters?.[name] ? "critter" : catalog.shapes?.[name] ? "shape" : null;
  if (!kind) return null;
  const spec = kind === "prop" ? { kind, model: name } : kind === "critter" ? { kind, species: name } : { kind, shape: name, color: color ?? "red" };
  if (color && kind !== "shape") spec.color = color;
  const b = localBounds({ ...spec, size: 1 }, catalog);
  const size = Math.min(h / Math.max(0.05, b.max[1] - b.min[1]), w / Math.max(0.05, b.max[0] - b.min[0]));
  // Flattened to 40% depth: a raised picture on the card, not a toy sticking out toward the camera.
  return { ...spec, size: Math.round(size * 1000) / 1000, scale: [1, 1, relief], at: r3([x, y - b.min[1] * size, front - b.min[2] * size * relief + 0.01]) };
}

function expandCard(o, catalog, add, err) {
  const st = CARD[o.style ?? "card"];
  if (!st) return err("E3D_STYLE", "style", `card style must be one of ${Object.keys(CARD).join(", ")}`);
  const text = o.text == null ? "" : String(o.text);
  if (!text && !o.picture) err("E3D_REQUIRED", "text", "a card needs text, a picture or both");
  if (text.length > 160) err("E3D_TEXT", "text", "card text must be at most 160 characters");
  const n = text.length;
  const W = o.width ?? st.w ?? { tile: Math.max(0.62, n * 0.18 + 0.25), word: Math.max(1, n * 0.13 + 0.5), strip: clamp(n * 0.085 + 0.6, 1.6, 7) }[o.style];
  const textH = text ? (o.style === "quote" ? cardHeight({ text, width: W - 0.2, size: st.text }) : (o.picture && (o.style ?? "card") === "card" ? 0.32 : (o.height ?? st.h) - 0.08)) : 0;
  const H = o.height ?? st.h ?? textH + 0.3;
  const front = st.t;
  const bg = o.bg ?? st.bg;
  const rim = o.rim ?? st.rim;
  if (rim) add("rim", slab(0, H / 2, front / 2, W + 0.06, H + 0.06, front / 2, rim));
  add("back", slab(0, H / 2, front, W, H, front, bg, o.style === "tile" ? "toy" : "matte"));
  if (o.picture) {
    const top = text && (o.style ?? "card") === "card" ? textH + 0.08 : 0.08;
    // relief: how far the picture stands out (a share of its depth): 0.4 by default, 0.05 nearly flat for stacks.
    if (o.relief != null && !(typeof o.relief === "number" && o.relief >= 0.02 && o.relief <= 1)) err("E3D_RANGE", "relief", "relief must be 0.02-1");
    const pic = picture(o.picture, o.pictureColor, catalog, 0, top, front, W * 0.78, (H - top - 0.08) * 0.92, o.relief ?? 0.4);
    if (!pic) err("E3D_PICTURE", "picture", `picture "${o.picture}" is not a prop, critter or shape`);
    else add("pic", pic);
  }
  if (text) {
    const y = o.picture && (o.style ?? "card") === "card" ? 0.06 : o.style === "quote" ? 0.12 : 0.04;
    add("text", { kind: "text_card", text, width: W - 0.12, height: textH, size: st.text, align: st.align, bg: "none", pad: 0.15, color: o.color ?? "ink", at: r3([0, y, front + 0.001]) });
  }
  if (o.tag != null) {
    if (String(o.tag).length > 6) err("E3D_TEXT", "tag", "tag must be at most 6 characters");
    add("tag", { kind: "text_card", text: String(o.tag), width: 0.36, height: 0.2, size: 0.09, align: "center", bg: o.accent ?? "yellow", depth: 0.02, at: r3([-W / 2 + 0.24, H - 0.27, front + 0.012]) });
  }
  if (o.style === "quote") add("pin", { kind: "shape", shape: "sphere", color: "red", size: 0.09, at: r3([0, H - 0.12, front]) });
}

function expandPage(o, catalog, add, err) {
  const st = PAGE[o.style ?? "book"];
  if (!st) return err("E3D_STYLE", "style", `page style must be one of ${Object.keys(PAGE).join(", ")}`);
  const lines = o.lines ?? [];
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 12 || lines.some((l) => typeof l !== "string" || !l.trim() || l.length > 240)) err("E3D_LINES", "lines", "lines must be 1-12 strings of 1-240 characters");
  const W = o.width ?? 3.4;
  const S = o.size ?? 0.14;
  if (typeof S !== "number" || S < 0.06 || S > 0.4) err("E3D_RANGE", "size", "a page's size is its font size: 0.06-0.4 m (scale the page with scale)");
  if (typeof W !== "number" || W < 1 || W > 10) err("E3D_RANGE", "width", "width must be 1-10 m");
  const m = 0.2;
  const nums = o.numbers ?? st.numbers;
  const numW = nums ? 0.32 : 0;
  const lineW = W - 2 * m - numW;
  const accent = o.accent ?? st.accent;
  // Heights top-down: title, picture (+ caption), the lines, the sidebar.
  const titleH = o.title ? cardHeight({ text: o.title, width: W - 2 * m, size: S * 1.6 }) : 0;
  const picH = o.picture ? 0.95 : 0;
  const capH = o.picture && o.caption ? cardHeight({ text: o.caption, width: W - 2 * m, size: S * 0.8 }) : 0;
  const lineHs = (Array.isArray(lines) ? lines : []).map((l) => cardHeight({ text: String(l), width: lineW, size: S }));
  const sideH = o.sidebar ? cardHeight({ text: o.sidebar, width: W - 2 * m - 0.2, size: S * 0.9 }) : 0;
  const H = m * 2 + titleH + picH + capH + lineHs.reduce((a, b) => a + b, 0) + (sideH ? sideH + 0.15 : 0) + (o.picture ? 0.1 : 0);
  const bg = o.bg ?? st.bg;
  if (o.style === "book" || o.style == null) add("under", slab(0.05, H / 2 - 0.05, -0.02, W, H, 0.03, "sand"));
  add("paper", slab(0, H / 2, 0, W, H, 0.04, bg));
  if (o.style === "book" || o.style == null) add("spine", { kind: "shape", shape: "box", color: accent, size: 1, at: r3([-W / 2 - 0.03, 0, -0.03]), scale: r3([0.1, H, 0.08]) });
  if (o.style === "scroll") {
    for (const [k, y] of [["roll_top", H], ["roll_bottom", 0]]) add(k, { kind: "shape", shape: "cylinder", color: "wood", at: r3([(W + 0.3) / 2, y, 0]), rotation: [0, 0, 90], scale: r3([0.18, W + 0.3, 0.18]) });
  }
  let y = H - m;
  const z = 0.001;
  if (o.title) {
    y -= titleH;
    add("title", { kind: "text_card", text: o.title, width: W - 2 * m, height: titleH, size: S * 1.6, align: o.style === "article" ? "left" : "center", bg: "none", color: o.color ?? "ink", at: r3([0, y, z]) });
    if (o.style === "article") add("rule", { kind: "shape", shape: "box", color: accent, at: r3([0, y - 0.03, 0.005]), scale: r3([W - 2 * m, 0.025, 0.02]) });
  }
  if (o.picture) {
    y -= picH + 0.1;
    add("frame", slab(0, y + picH / 2, 0.012, picH * 1.5, picH, 0.012, "sky"));
    const pic = picture(o.picture, o.pictureColor, catalog, 0, y + 0.05, 0.012, picH * 1.4, picH - 0.1, o.relief ?? 0.4);
    if (!pic) err("E3D_PICTURE", "picture", `picture "${o.picture}" is not a prop, critter or shape`);
    else add("pic", pic);
    if (capH) {
      y -= capH;
      add("cap", { kind: "text_card", text: o.caption, width: W - 2 * m, height: capH, size: S * 0.8, align: "center", bg: "none", color: "charcoal", at: r3([0, y, z]) });
    }
  }
  lineHs.forEach((h, i) => {
    y -= h;
    add(`l${i + 1}`, { kind: "text_card", text: String(lines[i]), width: lineW, height: h, size: S, bg: "none", color: o.color ?? "ink", at: r3([numW / 2, y, z]) });
    if (nums) add(`n${i + 1}`, { kind: "letter", text: String(i + 1), size: S * 0.8, color: accent, at: r3([-W / 2 + m + 0.12, y + h - 2.2 * S, 0.02]), depth: 0.03 });
  });
  if (sideH) add("side", { kind: "text_card", text: o.sidebar, width: W - 2 * m - 0.2, height: sideH, size: S * 0.9, bg: "sky", depth: 0.02, at: r3([0, m, 0.01]) });
}

function expandBoard(o, catalog, add, err) {
  const st = BOARD[o.style ?? "cork"];
  if (!st) return err("E3D_STYLE", "style", `board style must be one of ${Object.keys(BOARD).join(", ")}`);
  const layout = o.layout ?? "pins";
  if (!LAYOUTS.includes(layout)) return err("E3D_LAYOUT", "layout", `layout must be one of ${LAYOUTS.join(", ")}`);
  const labels = o.labels ?? [];
  const max = layout === "venn" ? 3 : 8;
  if (!Array.isArray(labels) || labels.length < (layout === "venn" ? 2 : 1) || labels.length > max || labels.some((l) => typeof l !== "string" || l.length > 28)) {
    return err("E3D_LABELS", "labels", `labels must be ${layout === "venn" ? "2-3" : "1-8"} strings of at most 28 characters`);
  }
  const rows = o.rows ?? (layout === "columns" ? 3 : 1);
  if (!Number.isInteger(rows) || rows < 1 || rows > 6) err("E3D_RANGE", "rows", "rows must be 1-6");
  const W = o.width ?? 4;
  const H = o.height ?? 2.6;
  const base = o.easel === false ? 0 : 0.55;
  const ink = st.ink;
  const cw = o.cardWidth ?? 0.9;
  const ch = o.cardHeight ?? 1.15;
  if (o.easel !== false) {
    for (const [k, x] of [["leg1", -W * 0.32], ["leg2", W * 0.32]]) add(k, { kind: "shape", shape: "cylinder", color: o.color ?? "wood_dark", at: r3([x, 0, -0.12]), scale: r3([0.08, base + H * 0.7, 0.08]) });
    add("leg3", { kind: "shape", shape: "cylinder", color: o.color ?? "wood_dark", at: [0, 0, -0.6], rotation: [14, 0, 0], scale: r3([0.07, (base + H * 0.5) / Math.cos((14 * Math.PI) / 180), 0.07]) });
  }
  add("frame", slab(0, base + H / 2, -0.01, W + 0.18, H + 0.18, 0.05, o.color ?? "wood_dark", "toy"));
  add("face", slab(0, base + H / 2, 0, W, H, 0.02, st.bg));
  const m = 0.14;
  let top = base + H - m;
  if (o.title) {
    add("title", { kind: "text_card", text: o.title, width: W - 2 * m, height: 0.34, size: 0.17, align: "center", bg: st.head === "none" ? "none" : "yellow", depth: 0.02, color: "ink", at: r3([0, top - 0.34, 0.01]) });
    top -= 0.42;
  }
  const bottom = base + m;
  const head = (k, text, x, y, w) => add(`h${k}`, { kind: "text_card", text, width: w, height: 0.26, size: 0.12, align: "center", bg: st.head, depth: 0.02, color: st.head === "none" ? ink : "ink", at: r3([x, y, 0.012]) });
  // A socket is a group where a card's at goes (its bottom centre); its scale makes a cardWidth x cardHeight
  // card fit the cell. Cards snap on with reparent { parent: "<board>_s2_1", to: [0, 0, 0] }.
  const sockets = (k, x, yTop, w, h) => {
    const cellH = h / rows;
    for (let r = 1; r <= rows; r++) {
      const s = Math.min((w * 0.9) / cw, (cellH * 0.9) / ch);
      add(`s${k}_${r}`, { kind: "group", at: r3([x, yTop - r * cellH + cellH * 0.05, 0.03]), scale: r3([s, s, s]) });
    }
  };
  const n = labels.length;
  if (layout === "pins" || layout === "columns") {
    const cols = layout === "columns" || n <= 3 ? n : Math.ceil(n / 2);
    const prow = Math.ceil(n / cols);
    const w = (W - 2 * m) / cols;
    const h = (top - bottom) / prow;
    labels.forEach((l, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = -W / 2 + m + w * (c + 0.5);
      const yTop = top - r * h;
      head(i + 1, l, x, yTop - 0.28, w * 0.9);
      if (layout === "pins") add(`pin${i + 1}`, { kind: "shape", shape: "sphere", color: "red", size: 0.08, at: r3([x, yTop - 0.4, 0.02]) });
      else if (c > 0) add(`div${c}`, { kind: "shape", shape: "box", color: ink, at: r3([x - w / 2, bottom, 0.01]), scale: r3([0.025, top - bottom, 0.02]) });
      sockets(i + 1, x, yTop - 0.46, w, h - 0.5);
    });
    if (layout === "columns") add("rule", { kind: "shape", shape: "box", color: ink, at: r3([0, top - 0.34, 0.01]), scale: r3([W - 2 * m, 0.025, 0.02]) });
  } else if (layout === "venn") {
    const R = Math.min((top - bottom - 0.35) / 2, (W - 2 * m) / 3.2);
    const cy = bottom + R;
    for (const [k, x, c] of [["ring1", -R * 0.55, o.accent ?? "blue"], ["ring2", R * 0.55, "orange"]]) add(k, { kind: "shape", shape: "hoop", color: c, size: r3([2 * R])[0], at: r3([x, cy, 0.02]), rotation: [90, 0, 0] });
    head(1, labels[0], -R * 0.9, cy + R + 0.04, R * 1.1);
    head(2, labels[1], R * 0.9, cy + R + 0.04, R * 1.1);
    if (labels[2]) head(3, labels[2], 0, cy + R + 0.34, R * 0.9);
    for (const [k, x, w] of [[1, -R * 1.0, R * 0.8], [2, 0, R * 0.55], [3, R * 1.0, R * 0.8]]) sockets(k, x, cy + R * 0.7, w, R * 1.4);
  } else {
    const y = bottom + 0.45;
    add("line", { kind: "shape", shape: "box", color: o.accent ?? "blue", at: r3([0, y - 0.03, 0.02]), scale: r3([W - 2 * m - 0.2, 0.06, 0.04]) });
    add("arrow", { kind: "shape", shape: "cone", color: o.accent ?? "blue", at: r3([W / 2 - m - 0.1, y, 0.04]), rotation: [0, 0, -90], size: 0.18 });
    const w = (W - 2 * m - 0.3) / n;
    labels.forEach((l, i) => {
      const x = -W / 2 + m + w * (i + 0.5);
      add(`t${i + 1}`, { kind: "shape", shape: "sphere", color: "gold", size: 0.14, at: r3([x, y - 0.07, 0.03]) });
      head(i + 1, l, x, bottom, w * 0.92);
      sockets(i + 1, x, top, w, top - y - 0.15);
    });
  }
}

const EXPAND = {
  card: expandCard, page: expandPage, board: expandBoard, sign: expandSign, word_train: expandWordTrain,
  book: (o, catalog, add, err) => expandBook(o, catalog, add, err, picture),
  choices: expandChoices,
};

/**
 * One composite object → [group, ...children]. errors: [{ code, field, message }] (field relative to the object).
 * The group takes the composite's id, at, rotation, hidden, parent, part, pivot, hud; `size` and `scale` scale it.
 */
export function expandComposite(o, catalog) {
  const errors = [];
  const err = (code, field, message) => errors.push({ code, field, message });
  const k = o.kind === "card" ? o.size ?? 1 : 1; // page, sign and book size is a font size; scale those with scale
  const sc = vec3(o.scale, [1, 1, 1]).map((v) => v * k);
  const group = { id: o.id, kind: "group" };
  for (const f of COMMON) if (o[f] !== undefined) group[f] = o[f];
  if (sc.some((v) => v !== 1)) group.scale = r3(sc);
  const out = [group];
  // A piece rides on the composite unless it names its own parent (a word train's rider in its car, a book page on its leaf).
  const add = (suffix, spec) => out.push({ ...spec, id: `${o.id}_${suffix}`, parent: spec.parent ?? o.id, ...(o.hud ? { hud: true } : {}) });
  EXPAND[o.kind](o, catalog, add, err);
  return { objects: out, errors };
}

/**
 * Expand every composite in a list of objects (others pass through). errors carry `path` (objects[i].field).
 * @returns {{ objects: object[], errors: { code, path, message }[] }}
 */
export function expandObjects(list, catalog, prefix = "objects") {
  const objects = [];
  const errors = [];
  (Array.isArray(list) ? list : []).forEach((o, i) => {
    if (!isComposite(o) || typeof o.id !== "string") return objects.push(o);
    const r = expandComposite(o, catalog);
    for (const k of Object.keys(o)) if (![...COMPOSITE_FIELDS[o.kind], ...COMMON, "id", "kind"].includes(k)) errors.push({ code: "W3D_UNKNOWN_FIELD", path: `${prefix}[${i}].${k}`, message: `${o.kind} has no field "${k}"`, warn: true });
    for (const e of r.errors) errors.push({ code: e.code, path: `${prefix}[${i}].${e.field}`, message: e.message });
    // A composite may hold composites (a word train's riders are cards): expand those too, as the director does.
    const inner = r.objects.some(isComposite) ? expandObjects(r.objects, catalog, `${prefix}[${i}]`) : { objects: r.objects, errors: [] };
    errors.push(...inner.errors);
    objects.push(...inner.objects);
  });
  return { objects, errors };
}
