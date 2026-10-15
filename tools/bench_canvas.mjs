#!/usr/bin/env node
// M0.7 canvas backend spike (ADR-001): speed and determinism of skia-canvas vs @napi-rs/canvas.
// Usage: node tools/bench_canvas.mjs [--frames 300] [--backends skia,napi]
//
// Each frame draws a 1080p scene comparable to spec 14.4: gradient background, two characters,
// 500 particles (dots, lines, rings), text, and a 'saturation' composite pass (desaturate effect).
// Each backend renders the sequence twice; per-frame SHA-256 of RGBA must match between runs.

import { createHash } from "node:crypto";
import { loadBackend } from "./lib/canvas.mjs";
import { computeJoints } from "../engine/skeleton.js";
import { blendForBench } from "./lib/bench_pose.mjs";
import { drawCharacter } from "../engine/renderer/character.js";
import { mulberry32 } from "../engine/math.js";

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const FRAMES = Number(flag("--frames", 300));
const BACKENDS = flag("--backends", "skia,napi").split(",");
const W = 1920;
const H = 1080;

function drawScene(ctx, n) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#f6efe4");
  g.addColorStop(1, "#d9c7ab");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#8a7356";
  ctx.fillRect(0, 880, W, H - 880);

  const t = n / 60;
  const heroPose = blendForBench("runA", "runB", 0.5 + 0.5 * Math.sin(t * 8));
  const bossPose = blendForBench("guard", "punchExtend", 0.5 + 0.5 * Math.sin(t * 3));
  const hero = computeJoints(heroPose, { x: 700 + 200 * Math.sin(t), y: 786 }, 1, 1);
  const boss = computeJoints(bossPose, { x: 1300, y: 880 - 94 * 2.2 }, -1, 2.2);
  drawCharacter(ctx, boss, { color: "#ff3b3b", scale: 2.2, facing: -1, mouth: "shout" });
  drawCharacter(ctx, hero, { color: "#22aaff", scale: 1, facing: 1, mouth: "grin" });

  const rng = mulberry32(n + 1);
  for (let i = 0; i < 500; i++) {
    const x = rng() * W;
    const y = rng() * 880;
    const kind = i % 3;
    ctx.globalAlpha = 0.3 + 0.7 * rng();
    if (kind === 0) {
      ctx.fillStyle = "#ffcc33";
      ctx.beginPath();
      ctx.arc(x, y, 2 + rng() * 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 1) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 20 * rng(), y + 20 * rng());
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#ff8844";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5 + rng() * 15, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  ctx.font = "120px Bangers";
  ctx.textAlign = "center";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#111111";
  ctx.strokeText("POW!", 960, 300);
  ctx.fillStyle = "#ffdd00";
  ctx.fillText("POW!", 960, 300);

  ctx.save();
  ctx.globalCompositeOperation = "saturation";
  ctx.fillStyle = `rgba(128,128,128,${0.5 + 0.5 * Math.sin(t)})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

async function run(backend) {
  const canvas = backend.createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const hashes = [];
  let drawMs = 0;
  let readMs = 0;
  for (let n = 0; n < FRAMES; n++) {
    const t0 = process.hrtime.bigint();
    drawScene(ctx, n);
    const t1 = process.hrtime.bigint();
    const rgba = backend.readRGBA(canvas);
    const t2 = process.hrtime.bigint();
    drawMs += Number(t1 - t0) / 1e6;
    readMs += Number(t2 - t1) / 1e6;
    hashes.push(createHash("sha256").update(rgba).digest("hex"));
  }
  return { hashes, drawMs: drawMs / FRAMES, readMs: readMs / FRAMES, canvas };
}

const rows = [];
for (const name of BACKENDS) {
  const backend = await loadBackend(name);
  await run(backend); // warm-up pass (JIT, font cache) — discarded
  const a = await run(backend);
  const b = await run(backend);
  const mismatches = a.hashes.filter((h, i) => h !== b.hashes[i]).length;
  await backend.savePng(a.canvas, `out/demos/m0_bench_${name}.png`);
  rows.push({
    backend: backend.name,
    drawMs: a.drawMs.toFixed(2),
    readMs: a.readMs.toFixed(2),
    totalMs: (a.drawMs + a.readMs).toFixed(2),
    fps: (1000 / (a.drawMs + a.readMs)).toFixed(1),
    deterministic: mismatches === 0 ? "yes" : `NO (${mismatches} frames differ)`,
  });
}
console.table(rows);

// --encode: end-to-end throughput (render → raw RGBA → ffmpeg libx264), spec 14.4 target ≥ 25 fps.
if (args.includes("--encode")) {
  const { spawn } = await import("node:child_process");
  const backend = await loadBackend(BACKENDS[BACKENDS.length - 1]);
  const canvas = backend.createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const out = "out/demos/m0_bench.mp4";
  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", "60", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((resolve, reject) => ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)))));
  const t0 = process.hrtime.bigint();
  for (let n = 0; n < FRAMES; n++) {
    drawScene(ctx, n);
    if (!ff.stdin.write(Buffer.from(backend.readRGBA(canvas).buffer))) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await done;
  const sec = Number(process.hrtime.bigint() - t0) / 1e9;
  console.log(`end-to-end (${backend.name} + libx264 medium): ${FRAMES} frames in ${sec.toFixed(1)} s = ${(FRAMES / sec).toFixed(1)} fps → ${out}`);
}
