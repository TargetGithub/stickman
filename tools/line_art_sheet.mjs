#!/usr/bin/env node
// Line-art review sheet (WORKBOOK_SPEC 8.3, milestone W1): every character preset in three poses, every prop and
// every drawable object, each as its colour drawing (small) beside its line-art version (large), so Sridhar can
// mark what is print-approved in catalog/education/line_art.json.
// Usage: node tools/line_art_sheet.mjs [out.pdf] [--png DIR]   (default out/demos/w1_line_art.pdf)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadBackend } from "./lib/canvas.mjs";
import { workbookCatalogSync } from "../catalog/index.js";
import { drawArt, lineArtContext, validate } from "../engine/index.js";

const args = process.argv.slice(2);
const pngDir = args.includes("--png") ? args[args.indexOf("--png") + 1] : null;
const out = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--png") || "out/demos/w1_line_art.pdf";
const catalog = workbookCatalogSync();
const W = 612;
const H = 792;
const M = 30;
const COLS = 3;
const ROWS = 4;
const CW = (W - 2 * M) / COLS;
const CH = (H - 2 * M - 30) / ROWS;

const STICK_POSES = ["stand", "waveA", "victory"];
const DOG_POSES = ["dog_stand", "dog_sit", "dog_beg"];
// Objects a workbook could draw: the same test the validator uses (an unknown-art check on each name).
const drawable = (name) => validate({ kind: "workbook", version: 1, title: "t", seed: 1, grade: "k", documents: [{ id: "d", pages: [{ id: "p", blocks: [{ activity: "colour_page", art: [{ object: name }] }] }] }] }, catalog).ok;

const cells = [];
for (const [id, p] of Object.entries(catalog.presets).sort(([a], [b]) => a.localeCompare(b))) {
  const quad = catalog.bodies[p.cast.body || "stickman"]?.quad;
  for (const pose of quad ? DOG_POSES : STICK_POSES) cells.push({ label: `${id} · ${pose}`, group: "Characters", ref: { preset: id, pose } });
}
for (const id of Object.keys(catalog.props)) cells.push({ label: id, group: "Props", ref: { prop: id } });
for (const id of Object.keys(catalog.objects).filter(drawable)) cells.push({ label: id, group: "Objects", ref: { object: id } });

function drawCell(ctx, cell, x, y) {
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 0.75;
  ctx.strokeRect(x + 3, y + 3, CW - 6, CH - 6);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 10px Andika";
  ctx.textAlign = "left";
  ctx.fillText(cell.label, x + 9, y + 16);
  drawArt(ctx, catalog, cell.ref, { x: x + 8, y: y + 26, w: CW * 0.28, h: CH * 0.35, align: "bottom" });
  drawArt(ctx, catalog, cell.ref, { x: x + CW * 0.3, y: y + 24, w: CW * 0.66, h: CH - 34, align: "bottom" }, (c) => lineArtContext(c, { outline: 1.2 }));
}

function drawSheet(ctx, list, page, pages) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 13px Andika";
  ctx.fillText(`Line art for workbooks (W1 review): ${list[0].group}`, M, M + 4);
  ctx.font = "10px Andika";
  ctx.textAlign = "right";
  ctx.fillText(`page ${page} of ${pages} · colour (small) and line art (large)`, W - M, M + 4);
  ctx.textAlign = "left";
  list.forEach((cell, i) => drawCell(ctx, cell, M + (i % COLS) * CW, M + 20 + Math.floor(i / COLS) * CH));
}

// Pages per group, so a page never mixes characters, props and objects.
const pages = [];
for (const group of ["Characters", "Props", "Objects"]) {
  const list = cells.filter((c) => c.group === group);
  for (let i = 0; i < list.length; i += COLS * ROWS) pages.push(list.slice(i, i + COLS * ROWS));
}
const backend = await loadBackend("napi");
const pdf = backend.createPdf({ title: "StickMan line art review (W1)" });
pages.forEach((list, i) => {
  drawSheet(pdf.page(W, H), list, i + 1, pages.length);
  pdf.end();
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, pdf.close());
if (pngDir) {
  mkdirSync(pngDir, { recursive: true });
  for (const [i, list] of pages.entries()) {
    const canvas = backend.createCanvas(W * 2, H * 2);
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    drawSheet(ctx, list, i + 1, pages.length);
    await backend.savePng(canvas, join(pngDir, `line_art_${String(i + 1).padStart(2, "0")}.png`));
  }
}
console.log(`${out}: ${cells.length} drawings on ${pages.length} pages`);
