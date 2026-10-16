#!/usr/bin/env node
// SVG file → object catalog entry (STORY_SPEC 5.5, S4.9). The engine never reads files: this runs at
// build time and writes a draft entry for data/objects.js, plus a review image.
// Usage:
//   node tools/svg_import.mjs <file.svg> --name castle [--behavior static] [--height 300]
//        [--palette theme|none] [--source "author, license, URL"] [--out out/drafts]
// Colors snap to a small palette (the stick-figure look) unless --palette none; every shape gets the
// standard dark outline. With --source, the license line is appended to assets/art/SOURCES.md.

import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { parseSvg, toCatalogPaths } from "./lib/svg.mjs";
import { loadBackend } from "./lib/canvas.mjs";
import { drawPaths } from "../engine/renderer/paths.js";

export const PALETTE = ["#111111", "#ffffff", "#e8e8e8", "#9aa7b4", "#5a5f6a", "#3b3b44", "#6b4a2f", "#a0703f", "#d2a96b", "#e9d9a8",
  "#3f9a4a", "#86c56a", "#2f7fd9", "#7fc8ef", "#8a2be2", "#e04f4f", "#ff7a3d", "#ffcc33", "#ff6fa8", "#2fd3c0"];

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const file = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").startsWith("--"));
if (!file) {
  console.error("usage: node tools/svg_import.mjs <file.svg> --name <kind> [--behavior static] [--height 300] [--palette theme|none] [--source \"...\"] [--out out/drafts]");
  process.exit(2);
}
const name = opt("--name", basename(file, ".svg").toLowerCase().replace(/[^a-z0-9_]/g, "_"));
const shapes = parseSvg(readFileSync(file, "utf8"));
const { paths, w, h } = toCatalogPaths(shapes, { height: Number(opt("--height", 240)), palette: opt("--palette", "theme") === "none" ? null : PALETTE });
const entry = { behavior: opt("--behavior", "static"), draw: "paths", w, h, paths, colors: {} };
const outDir = opt("--out", "out/drafts");
mkdirSync(outDir, { recursive: true });
const json = join(outDir, `${name}.object.json`);
writeFileSync(json, JSON.stringify({ name, entry }, null, 2) + "\n");

// Review image: the object at its size on a light floor.
const backend = await loadBackend();
const canvas = backend.createCanvas(Math.max(400, w + 120), h + 120);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#f4f3ef";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.strokeStyle = "#cccccc";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(10, h + 60);
ctx.lineTo(canvas.width - 10, h + 60);
ctx.stroke();
ctx.save();
ctx.translate(canvas.width / 2, h + 60);
drawPaths(ctx, paths, {});
ctx.restore();
await backend.savePng(canvas, join(outDir, `${name}.object.png`));

const source = opt("--source", null);
if (source) {
  const sources = new URL("../assets/art/SOURCES.md", import.meta.url).pathname;
  if (!existsSync(sources)) writeFileSync(sources, "# Imported art sources\n\n| Object | File | Source and license |\n|---|---|---|\n");
  appendFileSync(sources, `| ${name} | ${basename(file)} | ${source} |\n`);
}
console.log(`wrote ${json} (${paths.length} paths, ${w}×${h} px) and ${name}.object.png
Review the image, then add the entry to data/objects.js as "${name}" (keep "draw": "paths").${source ? "" : "\nRecord where the art came from with --source."}`);
