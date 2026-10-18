#!/usr/bin/env node
// Audition the procedural music (S7): render moods to WAV files for listening.
// Usage:
//   node tools/music.mjs --mood happy [--seconds 30] [--intensity 0.7] [--seed 1] [--out out/music/happy.wav]
//   node tools/music.mjs --all [--seconds 30] [--seed 1]          every mood into out/music/<mood>.wav
//   node tools/music.mjs --ramp --mood battle --seconds 40          intensity rising 0 → 1 over the clip

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { renderMusic } from "./lib/music_gen.mjs";
import { measureLoudness } from "./lib/loudness.mjs";
import { writeWav } from "./lib/wav.mjs";
import { SR } from "./lib/mixer.mjs";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const opt = (name, d) => (args.includes(name) ? args[args.indexOf(name) + 1] : d);
const seconds = Number(opt("--seconds", 30));
const seed = opt("--seed", "1");
const moods = args.includes("--all") ? Object.keys(catalog.musicMoods) : [opt("--mood", "happy")];
for (const mood of moods) {
  if (!catalog.musicMoods[mood]) {
    console.error(`unknown mood '${mood}': ${Object.keys(catalog.musicMoods).join(", ")}`);
    process.exit(2);
  }
  const intensity = args.includes("--ramp") ? [{ t: 0, v: 0 }, { t: seconds, v: 1 }] : opt("--intensity") !== undefined ? Number(opt("--intensity")) : undefined;
  const t0 = Date.now();
  const r = renderMusic({ mood, catalog, seed, seconds, intensity });
  const out = moods.length > 1 ? `out/music/${mood}.wav` : opt("--out", `out/music/${mood}.wav`);
  mkdirSync(dirname(out), { recursive: true });
  writeWav(out, r.samples, SR, 2);
  const l = measureLoudness(r.samples);
  console.log(`${out}: ${r.bars} bars at ${r.tempo.toFixed(1)} bpm, ${r.notes} notes, ${l.integrated.toFixed(1)} LUFS, peak ${l.peak.toFixed(1)} dBFS (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
