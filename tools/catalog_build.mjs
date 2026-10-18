#!/usr/bin/env node
// Check catalog/ and write the generated files (CATALOG_SPEC 6): catalog/generated/ (engine vocabulary,
// the full catalog as one file, the AI context pack) and catalog/manifest.json.
// Usage:
//   node tools/catalog_build.mjs            check, then write (npm run catalog:build)
//   node tools/catalog_build.mjs --check    check and compare only; exit 1 when a generated file is stale
//   node tools/catalog_build.mjs --zip      also write out/context_pack.zip (npm run catalog:pack)

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readCatalogDir, engineCodes, CATALOG_DIR } from "./lib/catalog_files.mjs";
import { buildCatalog } from "./lib/catalog_build.mjs";
import { PACK_FILES } from "./lib/context_pack.mjs";
import { zip } from "./lib/zip.mjs";

const args = process.argv.slice(2);
const res = buildCatalog(readCatalogDir(), { codes: engineCodes() });
if (!res.ok) {
  console.error(`catalog has ${res.issues.length} problem(s):`);
  for (const i of res.issues) console.error(`- ${i.file}${i.path ? ` ${i.path}` : ""}: ${i.message}`);
  process.exit(1);
}

const stale = Object.entries(res.files).filter(([rel, text]) => !existsSync(join(CATALOG_DIR, rel)) || readFileSync(join(CATALOG_DIR, rel), "utf8") !== text).map(([rel]) => rel);
const ctxDir = join(CATALOG_DIR, "generated", "context");
const extra = existsSync(ctxDir) ? readdirSync(ctxDir).map((f) => `generated/context/${f}`).filter((rel) => !(rel in res.files)) : [];

if (args.includes("--check")) {
  if (stale.length || extra.length) {
    console.error(`generated files are stale (run npm run catalog:build): ${[...stale, ...extra].join(", ")}`);
    process.exit(1);
  }
  console.log(`catalog ${res.version}: checks pass, generated files are current`);
  process.exit(0);
}

for (const rel of stale) {
  mkdirSync(dirname(join(CATALOG_DIR, rel)), { recursive: true });
  writeFileSync(join(CATALOG_DIR, rel), res.files[rel]);
}
for (const rel of extra) rmSync(join(CATALOG_DIR, rel));
console.log(`catalog ${res.version}: checks pass; ${stale.length} file(s) written${extra.length ? `, ${extra.length} removed` : ""}`);

let total = 0;
let core = 0;
for (const [f, m] of Object.entries(PACK_FILES)) {
  const bytes = res.sizes[`generated/context/${f}`];
  total += bytes;
  if (m.tier === "core") core += bytes;
  const over = bytes > m.budget ? ` (over the ${m.budget} B budget)` : "";
  console.log(`  ${f.padEnd(28)} ${String(bytes).padStart(6)} B  ${m.tier}${over}`);
}
console.log(`  pack: ${total} B in all, core ${core} B, about ${Math.round(total / 4)} tokens`);

if (args.includes("--zip")) {
  const out = join(dirname(CATALOG_DIR.replace(/\/$/, "")), "out", "context_pack.zip");
  mkdirSync(dirname(out), { recursive: true });
  const entries = Object.entries(res.files).filter(([rel]) => rel.startsWith("generated/context/")).map(([rel, data]) => ({ name: `stickman_pack/${rel.slice("generated/context/".length)}`, data }));
  writeFileSync(out, zip(entries));
  console.log(`wrote ${out} (${entries.length} files): add them to a Claude Desktop project, paste project_instructions.md as its instructions`);
}
