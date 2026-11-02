#!/usr/bin/env node
// Build Doopi & Friends season 2 scripts: series/doopi/s2/eps/epNN.mjs → scripts/series/doopi/s2/epNN_v3.json, then
// validate each (errors fail the build; warnings are counted by code).
// Usage: node series/doopi/s2/make.mjs [N ...]   (no numbers: every episode file)

import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { episode } from "./lib.mjs";
import { validate } from "../../../engine/index.js";
import { catalog } from "../../../catalog/index.js";

const EPS = fileURLToPath(new URL("./eps/", import.meta.url));
const OUT = fileURLToPath(new URL("../../../scripts/series/doopi/s2/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const want = process.argv.slice(2).map(Number);
const files = readdirSync(EPS).filter((f) => /^ep\d\d\.mjs$/.test(f)).filter((f) => !want.length || want.includes(Number(f.slice(2, 4)))).sort();
let failed = 0;
let total = 0;
for (const f of files) {
  const def = (await import(new URL(`./eps/${f}`, import.meta.url))).default;
  const script = episode(def);
  const out = `${OUT}${f.replace(".mjs", "_v3.json")}`;
  writeFileSync(out, JSON.stringify(script, null, 2) + "\n");
  const r = validate(script, catalog);
  const codes = {};
  for (const w of r.warnings) codes[w.code] = (codes[w.code] || 0) + 1;
  total += r.durationSec || 0;
  console.log(`${f.replace(".mjs", "")}: ${r.ok ? "ok" : `${r.errors.length} error(s)`}, ${(r.durationSec ?? 0).toFixed(0)} s, ${JSON.stringify(codes)}`);
  for (const e of r.errors.slice(0, 8)) console.log(`  ${e.code} at ${e.path}: ${e.message} ${e.fix ?? ""}`);
  if (!r.ok) failed++;
}
console.log(`${files.length} episode(s), ${(total / 60).toFixed(1)} min (babble timing; --speech tts sets the real length)`);
process.exit(failed ? 1 : 0);
