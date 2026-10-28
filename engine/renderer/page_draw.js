// drawPage (WORKBOOK_SPEC 9): draws one workbook page's display list on any 2D context (a PDF page, a PNG
// canvas, a browser canvas). Art goes through the line-art context. Text is wrapped and shrunk to its box
// here, the only place that measures text (renderer-only, like subtitles).

import { drawArt } from "./art_draw.js";
import { lineArtContext } from "./line_art.js";
import { drawShape } from "./shapes_draw.js";
import { drawGlyph } from "./letters_draw.js";

const FONT = "Andika";

/** Words wrapped into lines no wider than w at the context's current font. */
function wrap(ctx, text, w) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > w) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawText(ctx, it) {
  const max = it.lines ?? 1;
  let size = it.size;
  let lines;
  for (;;) {
    ctx.font = `${it.weight === "bold" ? "bold " : ""}${size}px ${FONT}`;
    lines = max === 1 ? [it.text] : wrap(ctx, it.text, it.w);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if ((lines.length <= max && widest <= it.w && lines.length * size * 1.2 <= it.h + size * 0.3) || size <= 6) break;
    size *= 0.92;
  }
  ctx.fillStyle = it.colour || "#000000";
  ctx.textAlign = it.align === "center" ? "center" : it.align === "right" ? "right" : "left";
  ctx.textBaseline = "alphabetic";
  const x = it.align === "center" ? it.x + it.w / 2 : it.align === "right" ? it.x + it.w : it.x;
  const lh = size * 1.2;
  const top = it.valign === "middle" ? it.y + (it.h - lines.length * lh) / 2 : it.y;
  lines.forEach((l, i) => ctx.fillText(l, x, top + lh * i + size * 0.95));
}

function strokeStyle(ctx, it) {
  ctx.lineWidth = it.width ?? 2;
  ctx.strokeStyle = it.colour || "#000000";
  ctx.setLineDash(it.dash || []);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function drawItem(ctx, it, catalog, opts) {
  if (it.answer && !opts.answers) return;
  switch (it.type) {
    case "group":
      for (const child of it.items) drawItem(ctx, child, catalog, opts);
      return;
    case "text":
      return drawText(ctx, it);
    case "line":
    case "poly":
      strokeStyle(ctx, it);
      ctx.beginPath();
      it.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (it.closed) ctx.closePath();
      if (it.fill) (ctx.fillStyle = it.fill), ctx.fill();
      ctx.stroke();
      return;
    case "rect":
      strokeStyle(ctx, it);
      ctx.beginPath();
      if (it.radius) ctx.roundRect(it.x, it.y, it.w, it.h, it.radius);
      else ctx.rect(it.x, it.y, it.w, it.h);
      if (it.fill) (ctx.fillStyle = it.fill), ctx.fill();
      ctx.stroke();
      return;
    case "circle":
      strokeStyle(ctx, it);
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
      if (it.fill) (ctx.fillStyle = it.fill), ctx.fill();
      if (it.width !== 0) ctx.stroke();
      return;
    case "shape":
      return drawShape(ctx, catalog.education.shapes[it.name], it);
    case "glyph":
      return drawGlyph(ctx, catalog.education.letters.glyphs[it.char], it);
    case "art":
      return drawArt(ctx, catalog, it.ref, it, (c) => lineArtContext(c, { outline: opts.outline }));
  }
}

/**
 * Draw one page (from buildWorkbook) at its size in points; scale the context first for other resolutions.
 * @param {{ answers?: boolean, outline?: number }} [opts]  answers: draw answer items (answer-key pages set
 *   page.answerKey); outline: line-art outline width in points (default 1.4)
 */
export function drawPage(ctx, page, catalog, opts = {}) {
  const o = { answers: opts.answers ?? !!page.answerKey, outline: opts.outline ?? 1.4 };
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, page.width, page.height);
  for (const it of page.items) {
    ctx.save();
    drawItem(ctx, it, catalog, o);
    ctx.restore();
  }
  ctx.restore();
}
