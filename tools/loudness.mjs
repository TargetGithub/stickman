#!/usr/bin/env node
// Loudness check (EBU R128 / BS.1770, S7.6) for a WAV file or a rendered video folder.
// Usage: node tools/loudness.mjs <file.wav | out/demos/<slug>/> [--target -16]
// Prints integrated loudness, the loudest 3 s (short-term), the sample peak, and whether the integrated
// level is within 1 LU of the target (YouTube plays around -14; kids-friendly mixes aim for -16).
// Exit code: 0 within the target, 1 outside it, 2 usage or unreadable input.

import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { decodeAudio } from "./lib/wav.mjs";
import { measureLoudness } from "./lib/loudness.mjs";
import { STORY_LUFS, SR } from "./lib/mixer.mjs";

const args = process.argv.slice(2);
let file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--target");
const target = args.includes("--target") ? Number(args[args.indexOf("--target") + 1]) : STORY_LUFS;
if (file && existsSync(file) && statSync(file).isDirectory()) file = join(file, "audio.wav");
if (!file || !existsSync(file)) {
  console.error("usage: node tools/loudness.mjs <file.wav | out/demos/<slug>/> [--target -16]");
  process.exit(2);
}
const l = measureLoudness(decodeAudio(file, SR));
const ok = Math.abs(l.integrated - target) <= 1;
console.log(`${file}: integrated ${l.integrated.toFixed(1)} LUFS (target ${target}), short-term max ${l.shortTermMax.toFixed(1)} LUFS, peak ${l.peak.toFixed(1)} dBFS: ${ok ? "OK" : "outside the target"}`);
process.exit(ok ? 0 : 1);
