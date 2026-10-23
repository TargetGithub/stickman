#!/usr/bin/env node
// YouTube Shorts (9:16) from a story script's scenes (tools/lib/shorts.mjs).
// Usage:
//   node tools/shorts.mjs <episode.json> --list               scenes with their length and lines (voice timings), and
//                                                            the best Short candidates (15-60 s, at least two lines)
//   node tools/shorts.mjs <episode.json> --auto [N]           write the N best candidates (default 3)
//   node tools/shorts.mjs <episode.json> --scenes a,b         write a Short of those scenes (in that order)
// Options: --out-dir scripts/shorts (where the Short scripts go), --end "text" (the end card; --no-end: none),
//   --render (render each Short with tools/record.mjs --speech tts into out/shorts/: the final, 4K at 60 fps;
//   --review renders 720p at 30 fps instead; --res and --fps override)
// Lengths come from the voices (--speech tts, the default when the script speaks with TTS) or babble timing.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createEngine, formatIssues, validate } from "../engine/index.js";
import { catalog } from "../catalog/index.js";
import { prepareSpeech } from "./lib/tts/index.mjs";
import { createPiperBackend } from "./lib/tts/piper.mjs";
import { shortScript, sceneSpans, shortCandidates } from "./lib/shorts.mjs";

const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const flag = (name) => args.includes(name);
const file = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").match(/^--(scenes|auto|out-dir|end|res|fps|speech)$/));
if (!file || !(flag("--list") || flag("--auto") || flag("--scenes"))) {
  console.error("usage: node tools/shorts.mjs <episode.json> (--list | --auto [N] | --scenes a,b) [--out-dir dir] [--end text | --no-end] [--render [--review] [--res 4k] [--fps 60]]");
  process.exit(2);
}
const script = JSON.parse(readFileSync(file, "utf8"));
const slug = basename(file, ".json");

function spans() {
  const tts = opt("--speech", script.meta?.speech ?? "babble") === "tts";
  const loadable = tts ? prepareSpeech(script, { catalog, backend: createPiperBackend(), overrides: {}, log: () => {} }).script : script;
  const engine = createEngine({ catalog });
  const r = engine.load(loadable);
  if (!r.ok) {
    console.error(formatIssues(r.errors));
    process.exit(1);
  }
  return sceneSpans(script, engine.getScenes(), engine.getEvents());
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
let picks;
if (flag("--scenes")) picks = [{ ids: opt("--scenes", "").split(",").filter(Boolean) }];
else {
  const sp = spans();
  const cands = shortCandidates(sp);
  if (flag("--list")) {
    for (const s of sp) console.log(`${s.id.padEnd(16)} ${fmt(s.start)}  ${s.dur.toFixed(1).padStart(5)} s  ${String(s.lines).padStart(2)} lines${s.template ? "  (title card)" : ""}`);
    console.log("\nShort candidates, best first:");
    for (const c of cands) console.log(`  --scenes ${c.ids.join(",")}  (${c.dur.toFixed(1)} s, ${c.lines} lines)`);
    process.exit(0);
  }
  const n = Number(opt("--auto", 3)) || 3;
  picks = cands.slice(0, n);
}

const outDir = opt("--out-dir", "scripts/shorts");
mkdirSync(outDir, { recursive: true });
const end = flag("--no-end") ? null : opt("--end", undefined);
let failed = false;
for (const p of picks) {
  let short;
  try {
    short = shortScript(script, p.ids, { end });
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  const v = validate(short, catalog);
  if (!v.ok) {
    console.error(`Short of ${p.ids.join(",")} is invalid:\n${formatIssues(v.errors)}`);
    failed = true;
    continue;
  }
  const name = `${slug}_${p.ids.join("_")}`;
  const path = join(outDir, `${name}.json`);
  writeFileSync(path, `${JSON.stringify(short, null, 2)}\n`);
  console.log(`wrote ${path}${p.dur ? ` (about ${p.dur.toFixed(0)} s + end card)` : ""}`);
  if (flag("--render")) {
    const review = flag("--review");
    const res = opt("--res", review ? "720p" : "4k");
    const fps = opt("--fps", review ? "30" : "60");
    const rec = ["tools/record.mjs", path, "--speech", "tts", "--fps", fps, "--res", res, "--out-dir", "out/shorts", "--slug", review ? `${name}_review` : name];
    const r = spawnSync(process.execPath, rec, { stdio: ["ignore", "ignore", "inherit"] });
    if (r.status !== 0) failed = true;
    else console.log(`  rendered out/shorts/${name}/final.mp4`);
  }
}
process.exit(failed ? 1 : 0);
