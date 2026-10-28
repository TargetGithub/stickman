#!/usr/bin/env node
// Shape review sheet (WORKBOOK_SPEC 8.1, milestone W2): every catalog shape with its facts, then every shape
// picture as line art beside a coloured version (each shape name gets one crayon colour), so the drawings and
// the facts can be checked by eye.
// Usage: node tools/shape_sheet.mjs [out.pdf] [--png DIR]   (default out/demos/w2_shape_sheet.pdf)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadBackend } from "./lib/canvas.mjs";
import { workbookCatalogSync } from "../catalog/index.js";
import { drawShape } from "../engine/renderer/shapes_draw.js";

const args = process.argv.slice(2);
const pngDir = args.includes("--png") ? args[args.indexOf("--png") + 1] : null;
const out = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--png") || "out/demos/w2_shape_sheet.pdf";
const { education } = workbookCatalogSync();
const W = 612;
const H = 792;
const M = 30;

const text = (ctx, s, x, y, size, weight = "", align = "left") => {
  ctx.fillStyle = "#000000";
  ctx.font = `${weight} ${size}px Andika`.trim();
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
};

function shapesPage(ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  text(ctx, "Shapes in the education catalog (W2 review)", M, M + 6, 14, "bold");
  const cols = 4;
  const cw = (W - 2 * M) / cols;
  const ch = (H - 2 * M - 20) / 6;
  Object.entries(education.shapes).forEach(([name, d], i) => {
    const x = M + (i % cols) * cw;
    const y = M + 20 + Math.floor(i / cols) * ch;
    drawShape(ctx, d, { x: x + cw / 2, y: y + ch * 0.4, size: Math.min(cw, ch) * 0.5, width: 2 });
    text(ctx, `${d.label} · ${d.grade}`, x + cw / 2, y + ch * 0.8, 10, "bold", "center");
    const facts = `${d.sides} sides, ${d.corners} corners${d.rightAngles ? `, ${d.rightAngles} square` : ""}, sym ${d.symmetry < 0 ? "∞" : d.symmetry}`;
    text(ctx, facts, x + cw / 2, y + ch * 0.8 + 12, 8, "", "center");
  });
}

function picturesPage(ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  text(ctx, "Shape pictures (W2 review): line art and coloured", M, M + 6, 14, "bold");
  const colours = Object.values(education.colours).map((c) => c.hex);
  const names = Object.keys(education.shapes);
  const rowH = (H - 2 * M - 20) / Object.keys(education.pictures).length;
  Object.entries(education.pictures).forEach(([name, p], i) => {
    const y = M + 20 + i * rowH;
    const s = rowH - 22;
    text(ctx, `${name} · ${p.grade}: ${p.parts.map((q) => q.shape).join(", ")}`, M, y + 12, 9, "bold");
    for (const [k, coloured] of [[0, false], [1, true]]) {
      const x0 = M + 40 + k * (s + 80);
      ctx.strokeStyle = "#dddddd";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x0, y + 18, s, s);
      for (const q of p.parts) {
        const fill = coloured ? colours[names.indexOf(q.shape) % colours.length] : "#ffffff";
        drawShape(ctx, education.shapes[q.shape], { x: x0 + q.x * s, y: y + 18 + q.y * s, size: q.size * s, rotate: q.rotate, fill, width: 1.6 });
      }
    }
  });
}

const backend = await loadBackend("napi");
const pdf = backend.createPdf({ title: "StickMan shapes review (W2)" });
for (const page of [shapesPage, picturesPage]) {
  page(pdf.page(W, H));
  pdf.end();
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, pdf.close());
if (pngDir) {
  mkdirSync(pngDir, { recursive: true });
  for (const [i, page] of [shapesPage, picturesPage].entries()) {
    const canvas = backend.createCanvas(W * 2, H * 2);
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    page(ctx);
    await backend.savePng(canvas, join(pngDir, `shape_sheet_${i + 1}.png`));
  }
}
console.log(`${out}: ${Object.keys(education.shapes).length} shapes, ${Object.keys(education.pictures).length} pictures`);
