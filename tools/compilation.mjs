#!/usr/bin/env node
// Join rendered episodes into one long video with chapters (tools/lib/compilation.mjs).
// Usage:
//   node tools/compilation.mjs <episode dir>... --out <dir> [--title "Doopi & Friends: Episodes 1-4"]
//       each episode dir is a tools/record.mjs output (final.mp4 + meta.json); they play in the order given.
//       Writes <dir>/final.mp4 (no re-encode: the episodes must share size and frame rate), chapters inside the
//       file, description.txt (the YouTube chapter list), meta.json, and thumb.png (the first episode's).
//   node tools/compilation.mjs <episode dir>... --plan
//       which episodes to put together for 20-30 minute compilations.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { chapters, ffmetadata, description, mismatch, plan, timestamp } from "./lib/compilation.mjs";

const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const dirs = args.filter((a, i) => !a.startsWith("--") && !["--out", "--title"].includes(args[i - 1]));
if (!dirs.length || !(args.includes("--plan") || opt("--out"))) {
  console.error('usage: node tools/compilation.mjs <episode dir>... (--out <dir> [--title "..."] | --plan)');
  process.exit(2);
}

/** The video's own length (s), which is where the next episode starts. */
function probe(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  const d = Number(r.stdout.trim());
  if (r.status !== 0 || !Number.isFinite(d)) throw new Error(`cannot read ${file}: ${r.stderr.trim() || "no duration"}`);
  return d;
}

let eps;
try {
  eps = dirs.map((d) => {
    const video = join(d, "final.mp4");
    if (!existsSync(video)) throw new Error(`${d} has no final.mp4 (render it with tools/record.mjs first)`);
    const meta = JSON.parse(readFileSync(join(d, "meta.json"), "utf8"));
    return { dir: d, video, meta, dur: probe(video) };
  });
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

if (args.includes("--plan")) {
  for (const g of plan(eps.map((e) => e.dur))) {
    const len = g.reduce((a, i) => a + eps[i].dur, 0);
    console.log(`${timestamp(len).padStart(5)}  ${g.map((i) => eps[i].dir).join(" ")}`);
  }
  process.exit(0);
}

const bad = mismatch(eps.map((e) => e.meta));
if (bad) {
  console.error(bad);
  process.exit(1);
}
const out = opt("--out");
mkdirSync(out, { recursive: true });
const title = opt("--title", `${eps[0].meta.title.replace(/\s*\d+\s*:.*$/, "")}: ${eps.length} episodes`);
const list = chapters(eps.map((e) => ({ title: e.meta.title, dur: e.dur })));
const listFile = join(out, "concat.txt");
const metaFile = join(out, "chapters.txt");
writeFileSync(listFile, eps.map((e) => `file '${resolve(e.video).replace(/'/g, "'\\''")}'`).join("\n") + "\n");
writeFileSync(metaFile, ffmetadata(title, list));
const ff = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listFile, "-i", metaFile, "-map", "0", "-map_metadata", "1", "-map_chapters", "1", "-c", "copy", "-movflags", "+faststart", join(out, "final.mp4")], { stdio: "inherit" });
rmSync(listFile);
rmSync(metaFile);
if (ff.status !== 0) {
  console.error("ffmpeg could not join the episodes");
  process.exit(1);
}
writeFileSync(join(out, "description.txt"), description(title, list));
const thumb = join(eps[0].dir, "thumb.png");
if (existsSync(thumb)) copyFileSync(thumb, join(out, "thumb.png"));
const total = probe(join(out, "final.mp4"));
const { resolution, fps } = eps[0].meta;
writeFileSync(join(out, "meta.json"), `${JSON.stringify({ title, kind: "compilation", durationSec: total, fps, resolution, chapters: list.map((c, i) => ({ ...c, source: eps[i].dir })) }, null, 2)}\n`);
console.log(`wrote ${out}/ (${timestamp(total)}, ${eps.length} episodes)`);
console.log(description(title, list));
