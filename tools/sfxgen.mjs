#!/usr/bin/env node
// Generate every required SFX key procedurally (spec 17.3, ADR-007) as 48 kHz mono 16-bit WAV.
// Usage: node tools/sfxgen.mjs [--out assets/sfx/generated] [--force]
// Files dropped directly into assets/sfx/ (e.g. punch_heavy.wav, punch_heavy_2.mp3) override these.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { synthesize, SAMPLE_RATE } from "./lib/synth.mjs";
import { writeWav } from "./lib/wav.mjs";
import { catalog } from "../catalog/index.js";

export const GENERATED_DIR = new URL("../assets/sfx/generated/", import.meta.url).pathname;

/** Write any missing generated SFX (all of them with force). Returns the number written. */
export function ensureGeneratedSfx({ out = GENERATED_DIR, force = false } = {}) {
  let written = 0;
  for (const key of catalog.sfxKeys) {
    const path = join(out, `${key}.wav`);
    if (!force && existsSync(path)) continue;
    writeWav(path, synthesize(key), SAMPLE_RATE, 1);
    written++;
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : GENERATED_DIR;
  const n = ensureGeneratedSfx({ out, force: args.includes("--force") });
  console.log(`wrote ${n} SFX file(s) to ${out}`);
}
