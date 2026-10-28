// Page layout (WORKBOOK_SPEC 4.3): the page frame, header band (name line, title, instructions), footer,
// cover, and the layout's slot boxes. Pure numbers in points; text is placed in boxes and never measured.

import { PAGE_SIZES, GRADE_RULES, LAYOUTS, GUTTER, INK } from "./grades.js";

/** Page size, margin and the grade's rules. */
export function pageFrame(script) {
  const p = script.page || {};
  const [w, h] = PAGE_SIZES[p.size || "letter"];
  const land = p.orientation === "landscape";
  return { width: land ? h : w, height: land ? w : h, margin: p.margin ?? 36, rules: GRADE_RULES[script.grade] };
}

/**
 * The header band of a content page and the area left for the layout.
 * @param {{ title?:string, instructions?:string, nameLine:boolean, answerTag?:string, artW?:number }} head
 *   artW: room kept free at the right of the title and instructions for header art
 */
export function headerItems(frame, head) {
  const { width: W, margin: m, rules: r } = frame;
  const tw = W - 2 * m - (head.artW || 0);
  const items = [];
  let y = m;
  if (head.answerTag) {
    items.push({ type: "text", x: m, y, w: W - 2 * m, h: r.small * 1.5, text: head.answerTag, size: r.small, align: "right", weight: "bold", colour: INK.answer, answer: true });
    y += r.small * 1.8;
  } else if (head.nameLine) {
    items.push({ type: "text", x: W / 2, y, w: W / 2 - m, h: r.small * 1.5, text: "Name: ____________________", size: r.small, align: "right", nameLine: true });
    y += r.small * 1.8;
  }
  const artTop = y;
  if (head.title) {
    items.push({ type: "text", x: m, y, w: tw, h: r.title * 1.25, text: head.title, size: r.title, weight: "bold", align: "left", lines: 1 });
    y += r.title * 1.3;
  }
  if (head.instructions) {
    items.push({ type: "text", x: m, y, w: tw, h: r.body * 1.3 * 2, text: head.instructions, size: r.body, align: "left", lines: 2 });
    y += r.body * 1.3 * 2;
  }
  return { items, top: Math.max(y, head.artW ? artTop + 64 : 0) + 12, artTop };
}

/** The page number at the bottom centre, and the y the content must stay above. */
export function footer(frame, label) {
  const { width: W, height: H, margin: m, rules: r } = frame;
  const h = r.small * 1.5;
  const items = label ? [{ type: "text", x: m, y: H - m - h, w: W - 2 * m, h, text: label, size: r.small, align: "center" }] : [];
  return { items, bottom: H - m - h - 10 };
}

/** The content area between the header and the footer. */
export const contentArea = (frame, top, bottom) => ({ x: frame.margin, y: top, w: frame.width - 2 * frame.margin, h: bottom - top });

/** Grid cell of each slot. */
export const slotCells = (layout) => LAYOUTS[layout || "full"].slots;

/**
 * The box of a slot or a span [a, b] (the bounding rectangle of both slots' cells).
 * @returns {{ x, y, w, h, cells: number[] }}  cells: every slot index the box covers
 */
export function slotBox(layout, area, slot) {
  const L = LAYOUTS[layout || "full"];
  const [gc, gr] = L.grid;
  const [a, b] = Array.isArray(slot) ? slot : [slot ?? 0, slot ?? 0];
  const ca = L.slots[a];
  const cb = L.slots[b];
  const c0 = Math.min(ca[0], cb[0]);
  const c1 = Math.max(ca[0], cb[0]);
  const r0 = Math.min(ca[1], cb[1]);
  const r1 = Math.max(ca[1], cb[1]);
  const cw = (area.w - GUTTER * (gc - 1)) / gc;
  const rh = (area.h - GUTTER * (gr - 1)) / gr;
  const cells = L.slots.map((c, i) => (c[0] >= c0 && c[0] <= c1 && c[1] >= r0 && c[1] <= r1 ? i : -1)).filter((i) => i >= 0);
  return { x: area.x + c0 * (cw + GUTTER), y: area.y + r0 * (rh + GUTTER), w: cw * (c1 - c0 + 1) + GUTTER * (c1 - c0), h: rh * (r1 - r0 + 1) + GUTTER * (r1 - r0), cells };
}

/** A cover page: title, subtitle, a row of art, and "This book belongs to" (student covers). */
export function coverItems(frame, { title, subtitle, art, owner }) {
  const { width: W, height: H, margin: m, rules: r } = frame;
  const items = [{ type: "text", x: m, y: H * 0.12, w: W - 2 * m, h: r.title * 2.6, text: title, size: r.title * 1.6, weight: "bold", align: "center", lines: 2 }];
  if (subtitle) items.push({ type: "text", x: m, y: H * 0.12 + r.title * 2.8, w: W - 2 * m, h: r.body * 1.6, text: subtitle, size: r.body * 1.2, align: "center", lines: 1 });
  if (art?.length) {
    const top = H * 0.36;
    const h = H * 0.36;
    const w = (W - 2 * m) / art.length;
    art.forEach((ref, i) => items.push({ type: "art", ref, x: m + w * i + w * 0.05, y: top, w: w * 0.9, h, align: "bottom" }));
    items.push({ type: "line", points: [[m, top + h], [W - m, top + h]], width: r.weight });
  }
  if (owner) items.push({ type: "text", x: m, y: H * 0.82, w: W - 2 * m, h: r.body * 1.6, text: "This book belongs to: ______________________", size: r.body, align: "center", lines: 1 });
  items.push({ type: "rect", x: m / 2, y: m / 2, w: W - m, h: H - m, width: r.weight, radius: 18 });
  return items;
}

/** Room kept at the right of the header for page.art. */
export const HEADER_ART_W = 80;

/** A character beside the page title (page.art), from below the name line down to the content area. */
export function headerArt(frame, art, artTop, top) {
  return { type: "art", ref: art, x: frame.width - frame.margin - HEADER_ART_W + 8, y: artTop, w: HEADER_ART_W - 8, h: top - 8 - artTop, align: "bottom" };
}
