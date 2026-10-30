#!/usr/bin/env node
// Join finished episodes into one longer video (no re-encode: every episode comes out of the same encoder at
// the same size and rate), with YouTube chapters at each episode.
//   node engine3d/tools/compile3d.mjs --name prek_mix_1 --title "..." pk01_count_to_ten pk02_shapes ...
// Reads out/series3d/toybox/<id>/final_4k60.mp4 (or --file review_1080p30.mp4); writes
// out/series3d/toybox/compilations/<name>/{final_4k60.mp4, youtube.txt}.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { REPO } from "./lib/server.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const name = opt("name", "mix");
const file = opt("file", "final_4k60.mp4");
const ids = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
const base = join(REPO, "out/series3d/toybox");
const out = join(base, "compilations", name);
mkdirSync(out, { recursive: true });

const probe = (f) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout);
const stamp = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
let t = 0;
const chapters = [];
const list = [];
for (const id of ids) {
  const f = join(base, id, file);
  if (!existsSync(f)) throw new Error(`missing ${f}: render the episode first (episode3d.mjs --final)`);
  const script = JSON.parse(readFileSync(join(REPO, "engine3d/scripts/series/toybox", `${id}.json`), "utf8"));
  chapters.push(`${stamp(t)} ${script.meta.title}`);
  list.push(`file '${f}'`);
  t += probe(f);
}
writeFileSync(join(out, "list.txt"), list.join("\n") + "\n");
const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", join(out, "list.txt"), "-c", "copy", "-movflags", "+faststart", join(out, file)]);
if (r.status !== 0) throw new Error(String(r.stderr));
writeFileSync(join(out, "youtube.txt"), [`TITLE: ${opt("title", name)}`, "", "DESCRIPTION:", opt("description", ""), "", ...chapters, "", `AUDIENCE: Made for kids. Length ${stamp(t)}.`, ""].join("\n"));
console.log(`${name}: ${ids.length} episodes, ${stamp(t)} -> ${join(out, file)}`);
