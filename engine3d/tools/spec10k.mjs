#!/usr/bin/env node
// Toybox Elementary 10K programme: spec tooling (lib/spec10k/). The programme lives outside the repo, on the
// external disk (default below; override with --root <dir> or TOYBOX_10K):
//   node engine3d/tools/spec10k.mjs validate [--band kg] [ids or files...]   schema + retention + allocation + catalog names
//   node engine3d/tools/spec10k.mjs dedupe [--json]                       exact / near duplicates vs all specs + existing episodes
//   node engine3d/tools/spec10k.mjs coverage                              counts against the allocation -> 10K/COVERAGE.md
//   node engine3d/tools/spec10k.mjs needs [--json]                        new assets/features + counts -> 10K/NEEDS.md, needs.json
//   node engine3d/tools/spec10k.mjs index                                 10K/specs/<band>/INDEX.md and specs/INDEX.md
//   node engine3d/tools/spec10k.mjs plan [--freeze] [--band kg]           check allocation; --freeze gives rows slot ranges; rewrites PLAN.md tables
//                                                                          (with --band: that band only, PLAN.md untouched)
//   node engine3d/tools/spec10k.mjs shards                                10K/shards/<band>.md from allocation + shards/_COMMON.md
//   node engine3d/tools/spec10k.mjs next --band kg [--size 25]            reserve the next free slots -> 10K/batches/<band>-NNN.md, progress.json
//   node engine3d/tools/spec10k.mjs peek <ids...> | --batch <band>-NNN    one line per spec (title, objective, hook) for spot-reading
//   node engine3d/tools/spec10k.mjs status                                10K/STATUS.md: per band, validate/dedupe counts, top needs
//   node engine3d/tools/spec10k.mjs check                                 plan check + validate + dedupe (exit 1 on any error)
// Exit code 1 when anything fails.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog3d } from "../catalog/index.mjs";
import { BANDS, DEFAULT_ROOT, catalogNames, loadExisting, loadProgramme, loadSpecs } from "./lib/spec10k/load.mjs";
import { validateSpec } from "./lib/spec10k/rules.mjs";
import { existingRecords, findDuplicates, sameDistinctBy, specRecord } from "./lib/spec10k/dedupe.mjs";
import { allocationErrors, bandTables, freezeSlots, magicTable, replaceBlock, seriesTable, summaryTable } from "./lib/spec10k/alloc.mjs";
import { batchBriefMd, nextSlots, readProgress, statusMd } from "./lib/spec10k/batch.mjs";
import { aggregateNeeds, bandIndexMd, coverage, coverageMd, needsMd, shardBriefMd } from "./lib/spec10k/reports.mjs";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const SCHEMA_FILE = fileURLToPath(new URL("./lib/spec10k/spec.schema.json", import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, v && !v.startsWith("--") ? 2 : 1); return v && !v.startsWith("--") ? v : true; };
const root = resolve(String(flag("--root") ?? DEFAULT_ROOT));
const bandFilter = flag("--band");
const asJson = flag("--json");
const freeze = flag("--freeze");
const size = Number(flag("--size") ?? 25);
const batchArg = flag("--batch");
const cmd = args.shift() ?? "check";

const schema = JSON.parse(readFileSync(SCHEMA_FILE, "utf8"));
const p = loadProgramme(root);
const write = (file, text) => { mkdirSync(join(file, ".."), { recursive: true }); writeFileSync(file, text); console.log(`wrote ${file}`); };
let failed = false;

function specsToCheck() {
  let list = loadSpecs(root);
  if (bandFilter) list = list.filter((x) => x.band === bandFilter);
  if (args.length) list = list.filter((x) => args.some((a) => basename(x.file) === `${a}.json` || resolve(a) === x.file));
  return list;
}

function runValidate(quiet = false) {
  const skills = JSON.parse(readFileSync(join(REPO, "catalog/education/skills.json"), "utf8")).skills;
  const names = catalogNames(loadCatalog3d(), p.series, skills);
  const list = specsToCheck();
  let bad = 0, warn = 0;
  for (const x of list) {
    const r = x.spec ? validateSpec(x.spec, { schema, programme: p, names, file: x.file }) : { errors: [x.error], warnings: [] };
    if (r.errors.length) { bad++; if (!quiet) { console.log(`✗ ${basename(x.file)}`); for (const e of r.errors) console.log(`    ${e}`); } }
    for (const w of r.warnings) { warn++; if (!quiet) console.log(`  warning ${basename(x.file)}: ${w}`); }
  }
  console.log(`validate: ${list.length} specs, ${bad} with errors, ${warn} warnings`);
  if (bad) failed = true;
  return bad;
}

function runDedupe(quiet = false) {
  const specs = loadSpecs(root).filter((x) => x.spec).map((x) => x.spec);
  const allowFile = join(root, "dedupe_allow.json");
  const allow = existsSync(allowFile) ? JSON.parse(readFileSync(allowFile, "utf8")).pairs ?? [] : [];
  const records = [...specs.map(specRecord), ...loadExisting(REPO).flatMap(existingRecords)];
  const dups = findDuplicates(records, { allow });
  const reskins = sameDistinctBy(specs);
  if (asJson) console.log(JSON.stringify({ duplicates: dups, reskins }, null, 1));
  else if (quiet) console.log(`dedupe: ${dups.length} duplicate pairs, ${reskins.length} re-skins`);
  else {
    for (const d of dups) console.log(`${d.kind.padEnd(5)} ${d.field.padEnd(9)} ${d.score.toFixed(2)}  ${d.a} ~ ${d.b}\n      "${d.textA.slice(0, 90)}"\n      "${d.textB.slice(0, 90)}"`);
    for (const r of reskins) console.log(`reskin    ${r.a} ~ ${r.b}: same standard, sub-skill, example set and difficulty`);
    console.log(`dedupe: ${specs.length} specs + existing episodes; ${dups.length} duplicate pairs, ${reskins.length} re-skins (allow-list: ${allow.length})`);
  }
  if (dups.length || reskins.length) failed = true;
  return dups.length + reskins.length;
}

function runPlan() {
  // --band limits freezing and the error report to one band and leaves PLAN.md alone (safe for parallel shards).
  const bands = bandFilter ? [bandFilter] : BANDS;
  if (freeze) {
    for (const b of bands) {
      const file = join(root, "allocation", `${b}.json`);
      if (!existsSync(file)) continue;
      const n = freezeSlots(p.allocation[b]);
      if (n) write(file, `${JSON.stringify(p.allocation[b], null, 1)}\n`);
    }
  }
  const errs = allocationErrors(p).filter((e) => !bandFilter || e.startsWith(`${bandFilter} `) || e.startsWith(`${bandFilter}.`) || e.startsWith(`${bandFilter}:`));
  for (const e of errs) console.log(`allocation: ${e}`);
  if (errs.length) failed = true;
  if (bandFilter) { console.log(`plan --band ${bandFilter}: ${errs.length} allocation problems`); return; }
  const planFile = join(root, "PLAN.md");
  if (existsSync(planFile)) {
    let md = readFileSync(planFile, "utf8");
    md = replaceBlock(md, "summary", summaryTable(p));
    if (md.includes("<!-- series:start -->")) md = replaceBlock(md, "series", seriesTable(p));
    if (md.includes("<!-- magic:start -->")) md = replaceBlock(md, "magic", magicTable(p));
    md = replaceBlock(md, "bands", BANDS.map((b) => bandTables(p, b, false)).join("\n"));
    write(planFile, md);
  }
  copyFileSync(SCHEMA_FILE, join(root, "schema", "spec.schema.json"));
  console.log(`plan: ${errs.length} allocation problems; schema copied to ${join(root, "schema")}`);
}

function parsedSpecs() { return loadSpecs(root).filter((x) => x.spec).map((x) => x.spec); }

switch (cmd) {
  case "validate": runValidate(); break;
  case "dedupe": runDedupe(); break;
  case "coverage": {
    const c = coverage(p, parsedSpecs());
    write(join(root, "COVERAGE.md"), coverageMd(c, p));
    console.log(`coverage: ${c.written}/${c.target}; ${BANDS.map((b) => `${b} ${c.bands[b].written}/${c.bands[b].target}`).join(", ")}`);
    if (c.stray.length) { console.log(`outside slot ranges: ${c.stray.join(", ")}`); failed = true; }
    break;
  }
  case "needs": {
    const specs = parsedSpecs();
    const n = aggregateNeeds(specs);
    if (asJson) console.log(JSON.stringify(n, null, 1));
    write(join(root, "NEEDS.md"), needsMd(n, specs.length));
    write(join(root, "needs.json"), `${JSON.stringify(n, null, 1)}\n`);
    break;
  }
  case "index": {
    const specs = parsedSpecs();
    for (const b of BANDS) write(join(root, "specs", b, "INDEX.md"), bandIndexMd(p, b, specs));
    write(join(root, "specs", "INDEX.md"), `# 10K spec index\n\n<!-- Generated by engine3d/tools/spec10k.mjs index. -->\n\n| Band | Specs | Target |\n|---|---|---|\n${BANDS.map((b) => `| [${b}](${b}/INDEX.md) ${p.bands.bands[b].name} | ${specs.filter((s) => s.band === b).length} | ${p.bands.bands[b].total} |`).join("\n")}\n`);
    break;
  }
  case "plan": runPlan(); break;
  case "shards": {
    const common = readFileSync(join(root, "shards", "_COMMON.md"), "utf8");
    const existing = loadExisting(REPO);
    for (const b of BANDS) write(join(root, "shards", `${b}.md`), shardBriefMd(p, b, common, existing));
    break;
  }
  case "next": {
    if (!bandFilter || !BANDS.includes(bandFilter)) { console.error("next needs --band <band>"); process.exit(2); }
    const specs = parsedSpecs();
    const written = new Set(specs.map((s) => s.id));
    const prog = readProgress(root);
    for (const bt of prog.batches) if (bt.band === bandFilter && bt.state === "open") { bt.state = "closed"; bt.written = bt.ids.filter((i) => written.has(i)).length; }
    const slots = nextSlots(p, bandFilter, written, size);
    if (!slots.length) { console.log(`next: ${bandFilter} is complete`); write(join(root, "progress.json"), `${JSON.stringify(prog, null, 1)}\n`); break; }
    const n = prog.batches.filter((bt) => bt.band === bandFilter).length + 1;
    const id = `${bandFilter}-${String(n).padStart(3, "0")}`;
    const file = join(root, "batches", `${id}.md`);
    write(file, batchBriefMd(p, bandFilter, slots, specs, id));
    prog.batches.push({ id, band: bandFilter, state: "open", ids: slots.map((s) => s.id), brief: `batches/${id}.md` });
    write(join(root, "progress.json"), `${JSON.stringify(prog, null, 1)}\n`);
    console.log(`next: ${id} ${slots[0].id}..${slots[slots.length - 1].id} (${slots.length})`);
    break;
  }
  case "peek": {
    let ids = args;
    if (batchArg) ids = readProgress(root).batches.find((bt) => bt.id === batchArg)?.ids ?? [];
    const by = new Map(parsedSpecs().map((s) => [s.id, s]));
    for (const i of ids) {
      const s = by.get(i);
      if (!s) { console.log(`${i}: MISSING`); continue; }
      console.log(`${i} [${s.standards[0]} d${s.distinct_by.difficulty} ${s.series} ${s.magical_moment.id}] ${s.title} | ${s.objective} | ${s.hook.line} | ${s.distinct_by.example_set}`);
    }
    break;
  }
  case "status": {
    const specs = parsedSpecs();
    const invalid = runValidate(true);
    const dups = runDedupe(true);
    failed = false;
    const c = coverage(p, specs);
    write(join(root, "STATUS.md"), statusMd(p, c, aggregateNeeds(specs), { invalid, dups, when: new Date().toISOString().slice(0, 16).replace("T", " ") }));
    break;
  }
  case "check": {
    const errs = allocationErrors(p);
    for (const e of errs) console.log(`allocation: ${e}`);
    if (errs.length) failed = true;
    runValidate();
    runDedupe();
    break;
  }
  default:
    console.error(`unknown command ${cmd}; see the header of engine3d/tools/spec10k.mjs`);
    process.exit(2);
}
process.exit(failed ? 1 : 0);
