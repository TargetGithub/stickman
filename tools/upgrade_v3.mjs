#!/usr/bin/env node
// Upgrade version 2 story scripts to version 3 with a series profile (tools/lib/upgrade_v3.mjs), then validate.
// Usage: node tools/upgrade_v3.mjs <profile.json> <in.json> [<in.json> ...] [--suffix _v3] [--check]
//   writes <in>_v3.json next to each input (the version 2 file is kept); --check validates without writing.

import { readFileSync, writeFileSync } from "node:fs";
import { upgradeToV3 } from "./lib/upgrade_v3.mjs";
import { validate } from "../engine/index.js";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const files = args.filter((a, i) => !a.startsWith("--") && !(args[i - 1] || "").match(/^--(suffix)$/));
if (files.length < 2) {
  console.error("usage: node tools/upgrade_v3.mjs <profile.json> <in.json>... [--suffix _v3] [--check]");
  process.exit(2);
}
const [profileFile, ...inputs] = files;
const profile = JSON.parse(readFileSync(profileFile, "utf8"));
const voices = profile.voices ? JSON.parse(readFileSync(profile.voices, "utf8")).cast : {};
const suffix = opt("--suffix", "_v3");
let failed = 0;
for (const file of inputs) {
  const { script, notes } = upgradeToV3(JSON.parse(readFileSync(file, "utf8")), profile, voices);
  const r = validate(script, catalog);
  const codes = {};
  for (const w of r.warnings) codes[w.code] = (codes[w.code] || 0) + 1;
  const out = file.replace(/\.json$/, `${suffix}.json`);
  if (!args.includes("--check")) writeFileSync(out, JSON.stringify(script, null, 2) + "\n");
  console.log(`${out}: ${r.ok ? "ok" : `${r.errors.length} error(s)`}, ${r.durationSec?.toFixed(0) ?? "?"} s, warnings ${JSON.stringify(codes)}`);
  for (const e of r.errors.slice(0, 5)) console.log(`  ${e.code} at ${e.path}: ${e.message}`);
  for (const n of notes) console.log(`  note: ${n}`);
  if (!r.ok) failed++;
}
process.exit(failed ? 1 : 0);
