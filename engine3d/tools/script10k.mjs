#!/usr/bin/env node
// Toybox 10K scripts (wave 3): lessons (10K/lessons/<band>/<id>.json, written from the specs) -> engine3d
// scripts (10K/scripts/<band>/<id>.json) with automated QA, review stills and thumbnails. Guide:
// engine3d/tools/script10k/README.md.
//   node engine3d/tools/script10k.mjs build <id|band|all>...     compile + QA (writes the script and qa.json)
//   node engine3d/tools/script10k.mjs qa <id>                     compile + print the full QA report
//   node engine3d/tools/script10k.mjs stills <id> [--every 10] [--speech off]   1080p stills + labelled contact sheet
//   node engine3d/tools/script10k.mjs thumbs <id>                 designed thumbnails + sheet into the qa folder
//   node engine3d/tools/script10k.mjs review <id> --ok|--fix "note"   record the eye check (qa/<id>/review.json)
//   node engine3d/tools/script10k.mjs ready [--band b] [--json]   specs whose assets all exist and have no lesson yet
//   node engine3d/tools/script10k.mjs needs <id>...               which new: assets are mapped (and how to build them) or missing
//   node engine3d/tools/script10k.mjs status                     10K/SCRIPT_STATUS.md
// Env TOYBOX_10K overrides the 10K folder.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadCatalog3d } from "../catalog/index.mjs";
import { buildPlan } from "../runtime/plan.js";
import { speakPlan } from "./lib/audio3d.mjs";
import { BANDS, bandOf } from "./script10k/bands.mjs";
import { ROOT, paths, buildId, specIds, loadSpec, missingNeeds } from "./script10k/index.mjs";
import { beatTimes } from "./script10k/polish.mjs";

export const BRAND = "Toybox Elementary";
const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (f) => args.includes(f);
const opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const positional = args.slice(1).filter((a, i, all) => !a.startsWith("--") && !["--every", "--speech", "--band", "--ok", "--fix"].includes(all[i - 1]));
const catalog = loadCatalog3d();

function expandIds(list) {
  const out = [];
  for (const x of list) {
    if (x === "all") out.push(...specIds());
    else if (BANDS[x]) out.push(...specIds(ROOT, x));
    else out.push(x);
  }
  return out;
}

const fmt = (e) => `  ${e.code} ${e.path ? `${e.path}: ` : ""}${e.message}`;

if (cmd === "build" || cmd === "qa") {
  const ids = expandIds(positional).filter((id) => existsSync(paths(id).lesson));
  let ok = 0;
  for (const id of ids) {
    try {
      const { qa } = buildId(id, catalog);
      if (qa.ok) ok++;
      const i = qa.info;
      console.log(`${qa.ok ? "ok  " : "FAIL"} ${id}: ${qa.errors.length} errors, ${qa.warnings.length} warnings; est ${i.estimate ?? "?"} s / ${i.target} s (x${i.ratio ?? "?"}), ${i.interactions ?? 0} interactions, +${i.keywordsPlaced?.length ?? 0} keywords, +${i.orbitsAdded} orbits`);
      if (cmd === "qa" || !qa.ok) for (const e of qa.errors) console.log(fmt(e));
      if (cmd === "qa") for (const w of qa.warnings) console.log(fmt(w));
    } catch (e) {
      console.log(`FAIL ${id}: ${e.message}`);
    }
  }
  if (ids.length > 1) console.log(`${ok}/${ids.length} pass`);
  process.exit(ok === ids.length ? 0 : 1);
}

if (cmd === "stills") {
  const id = positional[0];
  const p = paths(id);
  if (!existsSync(p.script)) buildId(id, catalog);
  const script = JSON.parse(readFileSync(p.script, "utf8"));
  const every = Number(opt("--every", 10));
  const speechMode = opt("--speech", "tts");
  // Times on the plan the render will use (real TTS clips), so the stills match the final video.
  let speech = {};
  if (speechMode === "tts") speech = speakPlan(await buildPlan({ script, catalog }), { log: () => {} });
  const { plan, beats } = beatTimes(script, catalog, speech);
  const times = new Map();
  const add = (t, label) => { const k = Math.round(t * 2) / 2; if (k > 0 && k < plan.duration - 0.2 && !times.has(k)) times.set(k, label); };
  const sceneOf = (t) => plan.scenes.findLast((s) => s.start <= t + 1e-6);
  for (const s of plan.scenes) add(s.start + 2, s.title);
  for (const b of beats) {
    const beat = script.scenes[b.si].beats[b.bi];
    if (beat.do.some((a) => ["challenge", "hook", "call"].includes(a.do))) add(b.t + 3.5, script.scenes[b.si].title);
    if (beat.id?.endsWith(".magic")) add(b.t + 3, `MAGIC ${script.scenes[b.si].title}`);
  }
  for (let t = every; t < plan.duration; t += every) add(t, sceneOf(t)?.title ?? "");
  const list = [...times.entries()].sort((a, b) => a[0] - b[0]).slice(0, 60);
  const dir = join(p.qaDir, "stills");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const r = spawnSync(process.execPath, [join(HERE, "render3d.mjs"), p.script, "--res", "1080p", "--fps", "30", "--speech", speechMode, "--music", "off", "--stills", list.map(([t]) => t).join(","), "--out", join(dir, "x.mp4")], { encoding: "utf8" });
  if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); }
  const pngDir = join(dir, `${id}_stills`);
  const pngs = list.map(([t, label]) => [`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")} ${label}`, join(pngDir, `${id}_1080p_t${t.toFixed(2)}.png`)]);
  for (let k = 0; k * 20 < pngs.length; k++) {
    const part = pngs.slice(k * 20, k * 20 + 20);
    const out = join(p.qaDir, `contact_${k + 1}.jpg`);
    const c = spawnSync("python3", [join(HERE, "script10k/contact.py"), out, "4", ...part.flat()], { encoding: "utf8" });
    if (c.status !== 0) { console.error(c.stderr); process.exit(1); }
    console.log(out);
  }
  console.log(`${pngs.length} stills over ${plan.duration.toFixed(1)} s (real TTS: ${speechMode === "tts"}); PNGs in ${pngDir}`);
  process.exit(0);
}

if (cmd === "thumbs") {
  const id = positional[0];
  const p = paths(id);
  if (!existsSync(p.script)) buildId(id, catalog);
  const out = join(p.qaDir, "thumbs");
  const r = spawnSync(process.execPath, [join(HERE, "thumbnail3d.mjs"), p.script, "--out", out], { stdio: "inherit", env: { ...process.env, THUMB_BRAND: BRAND } });
  if (r.status === 0) console.log(join(out, "thumbnails_sheet.jpg"));
  process.exit(r.status ?? 1);
}

if (cmd === "review") {
  const id = positional[0];
  const p = paths(id);
  const ok = flag("--ok");
  const note = opt(ok ? "--ok" : "--fix", "");
  mkdirSync(p.qaDir, { recursive: true });
  writeFileSync(join(p.qaDir, "review.json"), `${JSON.stringify({ id, ok, note, at: new Date().toISOString() }, null, 1)}\n`);
  console.log(`${id}: review ${ok ? "ok" : "needs fixes"}`);
  process.exit(0);
}

if (cmd === "ready") {
  const band = opt("--band", null);
  const rows = [];
  for (const id of specIds(ROOT, band)) {
    const miss = missingNeeds(loadSpec(id), catalog);
    rows.push({ id, missing: miss, lesson: existsSync(paths(id).lesson) });
  }
  const ready = rows.filter((r) => !r.missing.length && !r.lesson);
  if (flag("--json")) console.log(JSON.stringify({ ready: ready.map((r) => r.id), blocked: rows.filter((r) => r.missing.length).length }, null, 1));
  else {
    for (const r of ready) console.log(r.id);
    console.error(`${ready.length} ready without a lesson; ${rows.filter((r) => r.missing.length).length} blocked on assets; ${rows.filter((r) => r.lesson).length} have lessons`);
  }
  process.exit(0);
}

if (cmd === "needs") {
  // What the spec's new: assets are now: built (use the name), mapped (follow "how"), or still missing.
  const { assetContext, needState } = await import("./script10k/index.mjs");
  for (const id of positional) {
    const st = needState(loadSpec(id), assetContext(catalog));
    console.log(`${id}: ${st.missing.length ? `MISSING ${st.missing.join(", ")}` : "all assets available"}`);
    for (const m of st.mapped) console.log(`  ${m.group}.${m.name} -> use ${JSON.stringify(m.use)}: ${m.how}`);
  }
  process.exit(0);
}

if (cmd === "status") {
  const by = {};
  for (const id of specIds()) {
    const b = bandOf(id);
    const p = paths(id);
    const s = (by[b] ??= { specs: 0, ready: 0, lessons: 0, pass: 0, reviewed: 0 });
    s.specs++;
    if (!missingNeeds(loadSpec(id), catalog).length) s.ready++;
    if (existsSync(p.lesson)) s.lessons++;
    if (existsSync(p.qa) && JSON.parse(readFileSync(p.qa, "utf8")).ok) s.pass++;
    if (existsSync(join(p.qaDir, "review.json")) && JSON.parse(readFileSync(join(p.qaDir, "review.json"), "utf8")).ok) s.reviewed++;
  }
  const tot = Object.values(by).reduce((a, s) => { for (const k of Object.keys(s)) a[k] = (a[k] ?? 0) + s[k]; return a; }, {});
  const md = [
    "# 10K scripts status (wave 3)", "", `Updated ${new Date().toISOString().slice(0, 16).replace("T", " ")} by \`node engine3d/tools/script10k.mjs status\`.`, "",
    "Ready = every asset the spec needs exists (catalog or assets_map.json). Pass = automated QA clean. Reviewed = stills and thumbnails checked by eye.", "",
    "| Band | Specs | Assets ready | Lessons | QA pass | Reviewed |", "|---|---|---|---|---|---|",
    ...Object.entries(by).map(([b, s]) => `| ${b} | ${s.specs} | ${s.ready} | ${s.lessons} | ${s.pass} | ${s.reviewed} |`),
    `| all | ${tot.specs} | ${tot.ready} | ${tot.lessons} | ${tot.pass} | ${tot.reviewed} |`, "",
  ].join("\n");
  writeFileSync(join(ROOT, "SCRIPT_STATUS.md"), md);
  console.log(md);
  process.exit(0);
}

console.error("usage: script10k.mjs build|qa|stills|thumbs|review|ready|status ...");
process.exit(2);
