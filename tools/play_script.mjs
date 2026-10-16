#!/usr/bin/env node
// Validate, simulate and render a script to MP4 with the interim preview renderer (M3).
// Usage: node tools/play_script.mjs <script.json> [--out out/<name>.mp4]
// M6 replaces this with tools/record.mjs (real renderer, audio, thumbnail).

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { loadBackend } from "./lib/canvas.mjs";
import { startEncoder } from "./lib/encode.mjs";
import { createPreview } from "./lib/preview.mjs";
import { validate, formatIssues } from "../engine/validator/index.js";
import { simulate } from "../engine/sim.js";
import { catalog } from "../data/index.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: node tools/play_script.mjs <script.json> [--out file.mp4]");
  process.exit(2);
}
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : `out/demos/${basename(file, ".json")}.mp4`;
const script = JSON.parse(readFileSync(file, "utf8"));
const check = validate(script, catalog);
if (check.warnings.length) console.log(formatIssues(check.warnings));
if (!check.ok) {
  console.error(formatIssues(check.errors));
  process.exit(1);
}

const sim = simulate(script, catalog);
const W = script.meta.format === "portrait" ? 1080 : 1920;
const H = script.meta.format === "portrait" ? 1920 : 1080;
const backend = await loadBackend();
const canvas = backend.createCanvas(W, H);
const ctx = canvas.getContext("2d");
const draw = createPreview(sim, { width: W, height: H, seed: script.meta.seed });
const enc = startEncoder(out, W, H);
const t0 = process.hrtime.bigint();
for (let n = 0; n < sim.frames.length; n++) {
  draw(ctx, n);
  await enc.write(backend.readRGBA(canvas));
}
await enc.close();
const sec = Number(process.hrtime.bigint() - t0) / 1e9;
console.log(`wrote ${out}: ${sim.frames.length} frames (${sim.durationSec.toFixed(1)}s video) in ${sec.toFixed(1)}s`);
