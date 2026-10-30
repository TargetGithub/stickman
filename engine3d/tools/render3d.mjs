#!/usr/bin/env node
// Render a 3D script or JS scene to MP4 (or hash its frames).
//   node engine3d/tools/render3d.mjs engine3d/scripts/count_to_five.json --res 1080p --fps 30
//   node engine3d/tools/render3d.mjs engine3d/scenes/vowels.js --res 4k --fps 60 --jobs 3 --encoder vt
//   node engine3d/tools/render3d.mjs <input> --hash out/x.json --frames 0:120      (determinism check: no video)
//   node engine3d/tools/render3d.mjs <input> --bench 120                           (where the time goes)
//   node engine3d/tools/render3d.mjs <input> --stills 2,6.5,30                     (PNGs for review)
// Options: --gl gpu|swiftshader  --speech tts|off  --music <mood>|off  --out <file.mp4>  --inflight N
//   --encoder webcodecs (default): the page encodes H.264 on the GPU and sends only compressed chunks
//   --encoder x264 | vt: frames are read back and piped to ffmpeg (libx264, or VideoToolbox in ffmpeg)

import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { cpus } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadCatalog3d } from "../catalog/index.mjs";
import { validateScript } from "../runtime/validate.js";
import { buildPlan } from "../runtime/plan.js";
import { startServer, REPO } from "./lib/server.mjs";
import { launchBrowser, openPlayer } from "./lib/browser.mjs";
import { speakPlan, mixPlan } from "./lib/audio3d.mjs";
import { checkSceneMusic } from "./lib/music3d.mjs";
import { startEncoder } from "./lib/encode3d.mjs";
import { sampleMemory } from "./lib/memory.mjs";

// WebCodecs bitrates: YouTube's recommended SDR upload rates, raised a third for headroom (it re-encodes).
const WC_BITRATE = (w, fps) => (w >= 3840 ? (fps > 30 ? 60e6 : 45e6) : w >= 1920 ? (fps > 30 ? 16e6 : 12e6) : 8e6);
const RES = { "720p": [1280, 720], "1080p": [1920, 1080], "4k": [3840, 2160] };

function parseArgs(argv) {
  const o = { res: "1080p", fps: 30, gl: "gpu", jobs: 1, encoder: "webcodecs", speech: "tts", inflight: 4 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) rest.push(a);
    else o[a.slice(2)] = argv[i + 1]?.startsWith("--") || argv[i + 1] == null ? true : argv[++i];
  }
  o.input = rest[0];
  o.fps = Number(o.fps);
  o.jobs = Number(o.jobs);
  o.inflight = Number(o.inflight);
  if (!o.input || !RES[o.res]) throw new Error("usage: render3d.mjs <script.json|scene.js> [--res 720p|1080p|4k] [--fps 30|60] [--jobs N] [--gl gpu|swiftshader] [--encoder x264|vt]");
  return o;
}

const log = (...a) => console.log(...a);

function writePng(file, rgba, width, height) {
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-video_size", `${width}x${height}`, "-i", "-", "-vf", "vflip", "-frames:v", "1", file], { input: rgba });
  if (r.status !== 0) throw new Error(`png: ${r.stderr}`);
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const catalog = loadCatalog3d();
  const input = resolve(o.input);
  const isScript = extname(input) === ".json";
  const script = isScript ? JSON.parse(readFileSync(input, "utf8")) : null;
  if (script) {
    const v = validateScript(script, catalog);
    for (const w of v.warnings) log(`warning ${w.code} ${w.path}: ${w.message}`);
    v.errors.push(...checkSceneMusic(script, catalog.musicMoods)); // scene music is checked here, not in runtime/
    v.ok = !v.errors.length;
    if (!v.ok) {
      for (const e of v.errors) console.error(`error ${e.code} ${e.path}: ${e.message}`);
      process.exit(1);
    }
  }
  const src = isScript ? { script } : { sceneUrl: pathToFileURL(input).href };
  const pageSrc = (origin) => (isScript ? { script } : { sceneUrl: `${origin}/${input.slice(REPO.length)}` });

  // Speech first: measured clips stretch the beats, so the plan is built again with them.
  const t0 = Date.now();
  let plan = await buildPlan({ ...src, catalog });
  const speech = o.speech === "tts" ? speakPlan(plan, { log }) : {};
  plan = await buildPlan({ ...src, catalog, speech });
  const [width, height] = RES[o.res];
  const total = Math.ceil(plan.duration * o.fps);
  const [from, to] = o.frames ? o.frames.split(":").map(Number) : [0, total];
  const name = basename(input, extname(input));
  const out = o.out ? resolve(o.out) : join(REPO, "out/demos/3d", `${name}_${o.res}${o.fps}.mp4`);
  log(`${name}: ${plan.duration.toFixed(2)} s, frames ${from}-${to} of ${total} at ${width}x${height} ${o.fps} fps, ${o.jobs} job(s), gl ${o.gl}`);

  const jobs = [];
  const per = Math.ceil((to - from) / o.jobs);
  for (let j = 0; j < o.jobs; j++) jobs.push({ id: String(j), from: from + j * per, to: Math.min(to, from + (j + 1) * per) });
  const tmp = join(dirname(out), `.tmp_${name}_${o.res}${o.fps}`);
  mkdirSync(tmp, { recursive: true });
  const hashes = [];
  const sinks = new Map();
  for (const job of jobs) {
    const threads = Math.max(2, Math.floor(cpus().length / o.jobs));
    const piped = !(o.hash || o.bench || o.stills) && o.encoder !== "webcodecs";
    const h264 = !(o.hash || o.bench || o.stills) && o.encoder === "webcodecs" ? join(tmp, `chunk${job.id}.h264`) : null;
    const enc = !piped ? null : startEncoder(join(tmp, `chunk${job.id}.mp4`), width, height, { fps: o.fps, encoder: o.encoder, threads });
    sinks.set(job.id, { job, enc, h264, fd: h264 ? openSync(h264, "w") : null, next: job.from, waiting: new Map() });
  }
  // Frames can arrive out of order (several uploads in flight): hold them until their turn.
  const onFrame = async (id, i, rgba) => {
    const s = sinks.get(id);
    if (s.fd != null) return void writeSync(s.fd, rgba); // encoded chunks arrive in decode order on one socket
    await new Promise((res) => {
      s.waiting.set(i, { rgba, res });
      s.wake?.();
    });
  };
  const pump = async (s) => {
    while (s.next < s.job.to) {
      const w = s.waiting.get(s.next);
      if (!w) {
        await new Promise((r) => (s.wake = r));
        continue;
      }
      s.waiting.delete(s.next);
      if (s.png) writePng(s.png, w.rgba, width, height);
      if (process.env.DUMP_FRAMES?.split(",").includes(String(s.next))) writePng(join(process.env.DUMP_DIR, `f${s.next}.png`), w.rgba, width, height);
      if (o.hash || s.hashOnly) hashes[s.next] = createHash("sha256").update(w.rgba).digest("hex");
      else await s.enc.write(w.rgba);
      w.res();
      s.next++;
    }
  };

  const server = await startServer(onFrame);
  const browser = await launchBrowser(o.gl);
  const mem = sampleMemory(process.pid);
  let gpu = "";
  const tLoad = Date.now();
  const players = await Promise.all(jobs.map(async (job) => {
    const p = await openPlayer(browser, server.origin);
    const info = await p.page.evaluate((a) => window.engine3d.load(a), { ...pageSrc(server.origin), catalog, speech, width, height, base: "/" });
    gpu = info.gpu;
    if (Math.abs(info.duration - plan.duration) > 1e-9) throw new Error(`page plan is ${info.duration} s, Node plan ${plan.duration} s`);
    return p;
  }));
  const loadSec = (Date.now() - tLoad) / 1000;
  log(`  gpu: ${gpu}; pages loaded in ${loadSec.toFixed(1)} s`);

  const stats = { input: o.input, res: o.res, width, height, fps: o.fps, gl: o.gl, gpu, jobs: o.jobs, encoder: o.encoder, inflight: o.inflight, frames: to - from, duration: plan.duration, loadSec };
  if (o.stills) {
    const dir = join(dirname(out), `${name}_stills`);
    mkdirSync(dir, { recursive: true });
    const s = sinks.get("0");
    for (const t of String(o.stills).split(",").map(Number)) {
      const i = Math.min(total - 1, Math.round(t * o.fps));
      const png = join(dir, `${name}_${o.res}_t${t.toFixed(2)}.png`);
      Object.assign(s, { next: i, job: { ...s.job, to: i + 1 }, hashOnly: true, png });
      await Promise.all([pump(s), players[0].page.evaluate((a) => window.engine3d.renderRange(a), { from: i, to: i + 1, fps: o.fps, url: `${server.origin.replace("http", "ws")}/ws/0` })]);
      log(`  still -> ${png}`);
    }
  } else if (o.bench) {
    const n = Number(o.bench) || 120;
    const bench = {};
    for (const [label, args] of [["draw", { readback: false }], ["draw+readback", { url: null }], ["draw+readback+upload", { url: "upload" }]]) {
      const tb = Date.now();
      await Promise.all(players.map((p, k) => {
        const job = jobs[k];
        const a = { from: job.from, to: Math.min(job.to, job.from + n), fps: o.fps, inflight: o.inflight, ...args };
        if (args.url === "upload") {
          // Hash instead of encoding: isolates the upload cost.
          Object.assign(sinks.get(job.id), { next: a.from, job: { ...job, to: a.to }, hashOnly: true });
          pump(sinks.get(job.id));
          a.url = `${server.origin.replace("http", "ws")}/ws/${job.id}`;
        }
        return p.page.evaluate((x) => window.engine3d.renderRange(x), a);
      }));
      const frames = players.length * Math.min(n, per);
      bench[label] = { frames, sec: (Date.now() - tb) / 1000, fps: frames / ((Date.now() - tb) / 1000) };
      log(`  bench ${label}: ${bench[label].fps.toFixed(1)} fps`);
    }
    stats.bench = bench;
  } else {
    const tr = Date.now();
    await Promise.all(players.map((p, k) => {
      const job = jobs[k];
      const s = sinks.get(job.id);
      const url = `${server.origin.replace("http", "ws")}/ws/${job.id}`;
      if (s.fd != null) return p.page.evaluate((a) => window.engine3d.renderEncoded(a), { from: job.from, to: job.to, fps: o.fps, url, bitrate: WC_BITRATE(width, o.fps) });
      return Promise.all([pump(s), p.page.evaluate((a) => window.engine3d.renderRange(a), { from: job.from, to: job.to, fps: o.fps, url, inflight: o.inflight })]);
    }));
    for (const s of sinks.values()) await s.enc?.close();
    // Wrap each raw H.264 stream in MP4 (no re-encode), tagged BT.709 like the piped path.
    for (const s of sinks.values()) {
      if (s.fd == null) continue;
      closeSync(s.fd);
      const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-r", String(o.fps), "-f", "h264", "-i", s.h264, "-c", "copy",
        "-bsf:v", "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1", s.h264.replace(/\.h264$/, ".mp4")]);
      if (r.status !== 0) throw new Error(`ffmpeg wrap failed: ${r.stderr}`);
    }
    stats.renderSec = (Date.now() - tr) / 1000;
    stats.renderFps = (to - from) / stats.renderSec;
    log(`  rendered ${to - from} frames in ${stats.renderSec.toFixed(1)} s = ${stats.renderFps.toFixed(1)} fps (${(stats.renderFps / o.fps).toFixed(2)}x real time)`);
  }
  for (const p of players) if (p.errors.length) log(`  page errors: ${p.errors.join("; ")}`);
  await browser.close();
  await server.close();
  stats.memory = mem.stop();
  log(`  peak memory MB: ${JSON.stringify(stats.memory)}`);

  if (o.hash) {
    writeFileSync(resolve(o.hash), JSON.stringify({ ...stats, hashes: hashes.slice(from, to) }, null, 1));
    log(`  hashes -> ${o.hash}`);
  } else if (!o.bench && !o.stills) {
    const tm = Date.now();
    const list = join(tmp, "list.txt");
    writeFileSync(list, jobs.map((j) => `file 'chunk${j.id}.mp4'`).join("\n"));
    const audioArgs = [];
    if (from === 0 && to === total) {
      const wav = join(tmp, "mix.wav");
      const mix = mixPlan(plan, speech, wav, { ...(o.music ? { music: o.music === "off" ? null : o.music } : {}), scenes: script?.scenes ?? [], log });
      stats.lufs = mix.lufs;
      audioArgs.push("-i", wav, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k");
    }
    const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, ...audioArgs, "-c:v", "copy", "-movflags", "+faststart", out]);
    if (r.status !== 0) throw new Error(`ffmpeg concat failed: ${r.stderr}`);
    if (!process.env.KEEP_TMP) rmSync(tmp, { recursive: true, force: true });
    stats.muxSec = (Date.now() - tm) / 1000;
    log(`  -> ${out}`);
  }
  stats.totalSec = (Date.now() - t0) / 1000;
  const statsFile = o.stats ? resolve(o.stats) : o.hash || o.stills ? null : out.replace(/\.mp4$/, o.bench ? `_bench_${o.gl}.json` : ".json");
  if (statsFile) writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  if (statsFile) log(`  stats -> ${statsFile}`);
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
