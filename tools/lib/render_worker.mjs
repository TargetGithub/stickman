// One render worker for tools/record.mjs (lib/parallel_render.mjs starts several with fork()).
// The parent sends { init } once: the tool's arguments (for --bundle and the bundle store), the script as the
// engine loads it (after --speech tts set the line lengths), the lip-sync tracks and the render scale. Then
// { chunk } messages: a run of output frames to draw into its own MP4 (or PNGs). frames are pure with respect
// to (script, n), so any worker can draw any chunk and the joined video is the same as a one-process render.

import { createHash } from "node:crypto";
import { join } from "node:path";
import { loadBackend } from "./canvas.mjs";
import { startEncoder } from "./encode.mjs";
import { catalogFromArgs } from "./bundle_args.mjs";
import { createEngine } from "../../engine/index.js";
import { catalog as baseCatalog } from "../../catalog/index.js";

let engine;
let backend;
let canvas;

async function init({ argv, script, source, lipSync, scale }) {
  const { catalog } = await catalogFromArgs(argv, baseCatalog, source);
  backend = await loadBackend();
  engine = createEngine({ catalog, createCanvas: backend.createCanvas, scale });
  const r = engine.load(script, lipSync ? { lipSync } : {});
  if (!r.ok) throw new Error(`the script does not load in a worker: ${r.errors.map((e) => e.code).join(", ")}`);
  canvas = backend.createCanvas(r.outputWidth, r.outputHeight);
}

async function chunk({ index, picks, out, framesDir, fps, crf, preset, threads, hash }) {
  const ctx = canvas.getContext("2d");
  const enc = out ? startEncoder(out, canvas.width, canvas.height, { fps, crf, preset, threads }) : null;
  const hashes = [];
  for (let i = 0; i < picks.length; i++) {
    const n = picks[i];
    engine.renderFrame(ctx, n);
    const rgba = backend.readRGBA(canvas);
    if (hash) hashes.push(`${n} ${createHash("sha256").update(rgba).digest("hex")}`);
    if (enc) await enc.write(rgba);
    else await backend.savePng(canvas, join(framesDir, `${String(n).padStart(5, "0")}.png`));
    if (i % 30 === 29) process.send({ progress: 30 });
  }
  if (enc) await enc.close();
  process.send({ progress: picks.length % 30 });
  return { index, hashes };
}

process.on("message", async (msg) => {
  try {
    if (msg.init) {
      await init(msg.init);
      process.send({ ready: true });
    } else if (msg.chunk) {
      process.send({ done: await chunk(msg.chunk) });
    } else if (msg.exit) {
      process.exit(0);
    }
  } catch (err) {
    process.send({ error: String(err?.stack || err) });
  }
});
