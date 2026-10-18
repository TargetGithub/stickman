#!/usr/bin/env node
// Media for the showcase page (CATALOG_SPEC 8): one short clip per music mood (procedural music is
// tools-only, so the page plays pre-rendered clips). Written to out/catalog_media/ (not committed).
// Usage: node tools/catalog_media.mjs [--seconds 12] [--seed 1]   (npm run catalog:media)

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { renderMusic } from "./lib/music_gen.mjs";
import { writeWav } from "./lib/wav.mjs";
import { SR } from "./lib/mixer.mjs";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const opt = (name, d) => (args.includes(name) ? args[args.indexOf(name) + 1] : d);
const seconds = Number(opt("--seconds", 12));
const seed = opt("--seed", "1");
const dir = join("out", "catalog_media", "moods");
mkdirSync(dir, { recursive: true });
for (const mood of Object.keys(catalog.musicMoods)) {
  const r = renderMusic({ mood, catalog, seed, seconds });
  const out = join(dir, `${mood}.wav`);
  writeWav(out, r.samples, SR, 2);
  console.log(`${out}: ${r.bars} bars at ${r.tempo.toFixed(0)} bpm`);
}
console.log("Open the showcase (npm run serve, /web/showcase.html#music) to play them.");
