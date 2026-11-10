#!/usr/bin/env node
// Toybox 10K render queue: every reviewed 10K script (qa ok + qa/<band>/<id>/review.json ok) rendered at 4K60 with
// its designed thumbnails, contact sheet and youtube.txt (episode3d.mjs --final), one at a time, onto the external
// drives. Resumable: finished videos (in 10K/render_manifest.json and on disk) are skipped; a crash or a stop
// loses at most the video in progress. Each final is spot-checked (3840x2160, 60 fps, length, about -16 LUFS,
// thumbnail and youtube.txt present). Never uploads.
//   node engine3d/tools/render10k.mjs [--watch] [--band kg] [--only id,id] [--dry]
//   nohup caffeinate -is node engine3d/tools/render10k.mjs --watch > out/logs/render10k.out 2>&1 &
// --watch keeps going: when nothing is ready it waits 5 minutes and looks again (new reviews land all the time).
//
// Drives: each band has a home disk (10K/ROADMAP.md A4), then overflow DISK8MAC, DISK9ExFAT, DISK10ExFAT,
// DISK1MAC. A drive is skipped below MIN_FREE_GB. Output: <drive>/AI Backup files - Youtube/Toybox/10K/renders/<band>/<id>/.

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ROOT, paths, specIds } from "./script10k/index.mjs";
import { bandOf } from "./script10k/bands.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const WATCH = args.includes("--watch");
const DRY = args.includes("--dry");
const ONLY = opt("--only")?.split(",");
const BAND = opt("--band");
export const MIN_FREE_GB = 20;
const SUB = "AI Backup files - Youtube/Toybox/10K/renders";
const HOME = { bb: "DISK4MAC", pk: "DISK4MAC", kg: "DISK5MAC", g1: "DISK5MAC", g2: "DISK6MAC", g3: "DISK6MAC", g4: "DISK7MAC", g5: "DISK7MAC" };
const OVERFLOW = ["DISK8MAC", "DISK9ExFAT", "DISK10ExFAT", "DISK1MAC", "DISK4MAC", "DISK5MAC", "DISK6MAC", "DISK7MAC"];
const MANIFEST = join(ROOT, "render_manifest.json");
const STATUS = join(ROOT, "RENDER_STATUS.md");
const LOGS = join(HERE, "../../out/logs/render10k");
/** Local time (the Mac's clock), as Sridhar reads it. */
const stamp = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace("T", " ");
const log = (...a) => console.log(stamp(), ...a);

const readJson = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : d);
const sh = (cmd, a) => spawnSync(cmd, a, { encoding: "utf8" });

export function freeGb(dir) {
  const r = sh("df", ["-k", dir]);
  if (r.status !== 0) return -1;
  const cols = r.stdout.trim().split("\n").pop().trim().split(/\s+/);
  return Math.floor(Number(cols[3]) / 1024 / 1024);
}

/** The drive for a band: its home disk, else the first overflow disk mounted, writable and above MIN_FREE_GB. */
export function pickDrive(band, { free = freeGb, mounted = (d) => existsSync(`/Volumes/${d}`) } = {}) {
  for (const d of [HOME[band], ...OVERFLOW.filter((x) => x !== HOME[band])]) {
    if (!mounted(d)) continue;
    const f = free(`/Volumes/${d}`);
    if (f >= MIN_FREE_GB + 2) return { drive: d, free: f };
  }
  return null;
}

/** Ready to render: compiled, QA ok and reviewed ok. */
function ready(id) {
  const p = paths(id);
  if (!existsSync(p.script) || !existsSync(p.qa)) return false;
  if (!readJson(p.qa, {}).ok) return false;
  return !!readJson(join(p.qaDir, "review.json"), {}).ok;
}

/** Another heavy render running (Doopi record.mjs, any render3d/episode3d not started by us). */
function busy() {
  const r = sh("pgrep", ["-fl", "tools/record.mjs|render3d.mjs|episode3d.mjs"]);
  return r.stdout.trim().split("\n").filter((l) => l && !l.includes("render10k")).length > 0;
}

/** Spot-check a final: resolution, fps, length vs the plan, loudness from the stats, kit files. */
export function spotCheck(dir) {
  const out = [];
  const mp4 = join(dir, "final_4k60.mp4");
  const r = sh("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:format=duration", "-of", "json", mp4]);
  let info = {};
  try { info = JSON.parse(r.stdout); } catch { out.push("ffprobe failed"); }
  const s = info.streams?.[0] ?? {};
  if (s.width !== 3840 || s.height !== 2160) out.push(`size ${s.width}x${s.height}`);
  if (s.r_frame_rate !== "60/1") out.push(`fps ${s.r_frame_rate}`);
  const dur = Number(info.format?.duration ?? 0);
  if (!(dur > 30)) out.push(`duration ${dur}`);
  const stats = readJson(join(dir, "final_4k60_stats.json"), {});
  if (stats.lufs == null || Math.abs(stats.lufs + 16) > 1.5) out.push(`loudness ${stats.lufs?.toFixed?.(1)} LUFS`);
  if (stats.duration && Math.abs(stats.duration - dur) > 1) out.push(`length ${dur.toFixed(1)} vs plan ${stats.duration.toFixed(1)}`);
  for (const f of ["thumbnail.jpg", "youtube.txt", "contact.jpg"]) if (!existsSync(join(dir, f))) out.push(`missing ${f}`);
  return { ok: !out.length, problems: out, duration: dur, lufs: stats.lufs, renderSec: stats.totalSec ?? stats.renderSec };
}

function writeStatus(man, queue) {
  const done = Object.values(man).filter((m) => m.ok);
  const byBand = {};
  for (const [id, m] of Object.entries(man)) { const b = bandOf(id); (byBand[b] ??= { ok: 0, bad: 0, gb: 0, sec: 0 }); m.ok ? byBand[b].ok++ : byBand[b].bad++; byBand[b].gb += m.gb ?? 0; byBand[b].sec += m.duration ?? 0; }
  const rows = Object.entries(byBand).sort().map(([b, s]) => `| ${b} | ${s.ok} | ${s.bad} | ${s.gb.toFixed(1)} | ${(s.sec / 60).toFixed(0)} |`);
  const drives = [...new Set(Object.values(HOME).concat(OVERFLOW))].map((d) => `${d} ${existsSync(`/Volumes/${d}`) ? `${freeGb(`/Volumes/${d}`)} GB free` : "not mounted"}`);
  const last = done.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 15).map((m) => `- ${m.at} ${m.id} (${m.drive}, ${Math.round(m.duration)} s, ${m.lufs?.toFixed(1)} LUFS, ${m.gb?.toFixed(2)} GB)`);
  const bad = Object.values(man).filter((m) => !m.ok).map((m) => `- ${m.id}: ${m.problems?.join("; ")}`);
  writeFileSync(STATUS, [
    "# 10K renders (Phase A)", "", `Updated ${stamp()} by \`engine3d/tools/render10k.mjs\`. Manifest: render_manifest.json.`, "",
    `Rendered and spot-checked: **${done.length}**; waiting in the queue now: ${queue}.`, "",
    "| Band | OK | Problems | GB | Minutes of video |", "|---|---|---|---|---|", ...rows, "",
    `Drives: ${drives.join(" · ")}`, "", "## Latest", "", ...last, "", "## Problems (re-render after fixing)", "", ...(bad.length ? bad : ["none"]), "",
  ].join("\n"));
}

async function main() {
  mkdirSync(LOGS, { recursive: true });
  for (;;) {
    // The 10K folder lives on an external drive: if it is unplugged, wait for it instead of crashing.
    if (!existsSync(ROOT)) {
      log(`waits: ${ROOT} is not mounted`);
      await new Promise((r) => setTimeout(r, 300_000));
      continue;
    }
    const man = readJson(MANIFEST, {});
    const todo = (ONLY ?? specIds(ROOT, BAND)).filter((id) => !(man[id]?.ok && existsSync(join(man[id].dir, "final_4k60.mp4"))) && !man[id]?.failed && ready(id));
    writeStatus(man, todo.length);
    if (!todo.length) {
      if (!WATCH) { log("nothing to render"); return; }
      await new Promise((r) => setTimeout(r, 300_000));
      continue;
    }
    const id = todo[0];
    const band = bandOf(id);
    while (busy()) { log(`${id} waits: another heavy render is running`); await new Promise((r) => setTimeout(r, 120_000)); }
    const pick = pickDrive(band);
    if (!pick) { log("STOPPED: no drive with enough free space"); return; }
    const dir = `/Volumes/${pick.drive}/${SUB}/${band}/${id}`;
    log(`${id} start -> ${dir} (${pick.free} GB free)`);
    if (DRY) { log("dry run"); return; }
    mkdirSync(dir, { recursive: true });
    const logFile = join(LOGS, `${id}.log`);
    let ok = false;
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
      const t0 = Date.now();
      const r = spawnSync(process.execPath, [join(HERE, "episode3d.mjs"), paths(id).script, "--final", "--out-dir", dir], { encoding: "utf8", env: { ...process.env, THUMB_BRAND: "Toybox Elementary" }, maxBuffer: 64 << 20 });
      writeFileSync(logFile, `${r.stdout}\n${r.stderr}`);
      ok = r.status === 0 && existsSync(join(dir, "final_4k60.mp4"));
      if (!ok) { log(`${id} attempt ${attempt} failed (${logFile})`); await new Promise((res) => setTimeout(res, 60_000)); }
      else log(`${id} rendered in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
    }
    const m = readJson(MANIFEST, {});
    if (!ok) { m[id] = { id, ok: false, failed: true, dir, drive: pick.drive, at: stamp(), problems: ["render failed twice: see log"] }; }
    else {
      const c = spotCheck(dir);
      const gb = statSync(join(dir, "final_4k60.mp4")).size / 1e9;
      m[id] = { id, ok: c.ok, dir, drive: pick.drive, at: stamp(), duration: c.duration, lufs: c.lufs, gb, problems: c.problems };
      log(`${id} ${c.ok ? "ok" : `CHECK: ${c.problems.join("; ")}`} (${gb.toFixed(2)} GB, ${Math.round(c.duration)} s)`);
      // Mark the spec rendered in the episode registry (the manifest is the registry for 10K ids).
    }
    writeFileSync(MANIFEST, `${JSON.stringify(m, null, 1)}\n`);
    if (ONLY && ONLY.every((x) => m[x])) { writeStatus(m, 0); return; }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
