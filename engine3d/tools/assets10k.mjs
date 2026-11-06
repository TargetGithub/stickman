#!/usr/bin/env node
// Toybox 10K asset wave status (lib/assets10k.mjs). Reads 10K/needs.json (from `spec10k.mjs needs`), the catalog
// and catalog/asset_map.json, and writes 10K/ASSETS_STATUS.md: what is built, mapped or remaining, with spec
// counts, and which specs are unblocked for scripting.
//   node engine3d/tools/assets10k.mjs [--root <10K dir>] [--check]
// Also writes 10K/assets_map.json (machine-readable: resolved names, unblocked ids, build order) and reads
// 10K/script_composed.json (names the scripts session builds in-script from shapes; they count as unblocking).
// --check only validates asset_map.json (exit 1 on a bad mapping). Run `spec10k.mjs needs` first for fresh counts.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadCatalog3d } from "../catalog/index.mjs";
import { DEFAULT_ROOT, loadProgramme, loadSpecs } from "./lib/spec10k/load.mjs";
import { assetMapJson, assetStatus, assetStatusMd, catalogSets, mapErrors } from "./lib/assets10k.mjs";

const args = process.argv.slice(2);
const at = args.indexOf("--root");
const root = resolve(at >= 0 ? args[at + 1] : DEFAULT_ROOT);
const checkOnly = args.includes("--check");

const map = JSON.parse(readFileSync(new URL("../catalog/asset_map.json", import.meta.url), "utf8"));
const p = loadProgramme(root);
const sets = catalogSets(loadCatalog3d(), { ...p.series?.features, ...p.series?.featureAliases });
const errs = mapErrors(map, sets);
for (const e of errs) console.log(`asset_map: ${e}`);
if (checkOnly) {
  console.log(`asset_map: ${errs.length} problems`);
  process.exit(errs.length ? 1 : 0);
}

const needs = JSON.parse(readFileSync(join(root, "needs.json"), "utf8"));
const specs = loadSpecs(root).filter((x) => x.spec).map((x) => x.spec.id).sort();
// Names the scripts session composes in the script itself (small one-off shape compositions): { "props": { "napkin": "how" } }.
const composedFile = join(root, "script_composed.json");
const composed = existsSync(composedFile) ? JSON.parse(readFileSync(composedFile, "utf8")) : {};
const st = assetStatus(needs, sets, map, composed);
const reqFile = join(root, "ENGINE_REQUESTS.md");
const requests = existsSync(reqFile) ? "See the file; each request there is marked done, mapped or open by the asset session." : "";
const when = new Date().toISOString().slice(0, 16).replace("T", " ");
writeFileSync(join(root, "ASSETS_STATUS.md"), assetStatusMd(st, { specCount: specs.length, allSpecIds: specs, when, requests }));
writeFileSync(join(root, "assets_map.json"), `${JSON.stringify(assetMapJson(st, specs, when), null, 1)}\n`);
const count = (g, s) => st.items[g].filter((x) => x.state === s).length;
console.log(`wrote ${join(root, "ASSETS_STATUS.md")}`);
for (const g of Object.keys(st.items)) console.log(`${g}: ${count(g, "built")} built, ${count(g, "mapped")} mapped, ${count(g, "script")} in script, ${count(g, "remaining")} remaining`);
const blocked = new Set(st.specs.filter((s) => s.open.length).map((s) => s.id));
console.log(`specs: ${specs.length - specs.filter((id) => blocked.has(id)).length}/${specs.length} unblocked`);
process.exit(errs.length ? 1 : 0);
