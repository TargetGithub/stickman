#!/usr/bin/env node
// Validate, simulate and render a script to MP4 with the engine renderer (no audio yet).
// Usage: node tools/play_script.mjs <script.json> [--out out/<name>.mp4] [--preview] [--frames a,b,c]
//   --preview  use the old M3 interim renderer; --frames  also save those frame numbers as PNGs.
// M6 replaces this with tools/record.mjs (audio, thumbnail, metadata).

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { loadBackend } from "./lib/canvas.mjs";
import { startEncoder } from "./lib/encode.mjs";
import { createPreview } from "./lib/preview.mjs";
import { createRenderer, renderFrame } from "../engine/renderer/index.js";
import { validate, formatIssues } from "../engine/validator/index.js";
import { simulate } from "../engine/sim.js";
import { catalogForScript } from "../catalog/index.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: node tools/play_script.mjs <script.json> [--out file.mp4]");
  process.exit(2);
}
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : `out/demos/${basename(file, ".json")}.mp4`;
const script = JSON.parse(readFileSync(file, "utf8"));
const catalog = catalogForScript(script); // plus the bundles the script declares (V3.1)
const check = validate(script, catalog);
if (check.warnings.length) console.log(formatIssues(check.warnings));
if (!check.ok) {
  console.error(formatIssues(check.errors));
  process.exit(1);
}

const sim = simulate(script, catalog);
const { width: W, height: H } = sim.format;
const backend = await loadBackend();
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
const renderer = createRenderer(catalog, sim);
const draw = args.includes("--preview") ? createPreview(sim, { width: W, height: H, seed: script.meta.seed }) : (c, n) => renderFrame(renderer, c, n);
const stills = new Set(args.includes("--frames") ? args[args.indexOf("--frames") + 1].split(",").map(Number) : []);
const enc = startEncoder(out, W, H);
const t0 = process.hrtime.bigint();
for (let n = 0; n < sim.totalFrames; n++) {
  draw(ctx, n);
  await enc.write(backend.readRGBA(canvas));
  if (stills.has(n)) await backend.savePng(canvas, out.replace(/\.mp4$/, `_f${n}.png`));
}
await enc.close();
const sec = Number(process.hrtime.bigint() - t0) / 1e9;
console.log(`wrote ${out}: ${sim.totalFrames} frames (${sim.durationSec.toFixed(1)}s video) in ${sec.toFixed(1)}s`);
