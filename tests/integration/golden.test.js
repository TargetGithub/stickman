// Golden frames (M5.4): 5 scripts × 10 frames, compared at quarter size against stored PNGs.
// S1 adds a story with one transition of each type: 30% into every hold plus each scene's first frame.
// Update deliberately and review by eye: npm run golden:update (then look at tests/golden/*/).
// GOLDEN_ONLY=<name> limits a run (or an update) to one script.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { loadBackend } from "../../tools/lib/canvas.mjs";
import { createEngine } from "../../engine/index.js";
import { catalog } from "../../data/index.js";

export const GOLDEN_SCRIPTS = {
  minimal: "tests/fixtures/good/minimal.json",
  m3_duel: "scripts/samples/m3_duel.json",
  m4_dojo: "scripts/samples/m4_dojo.json",
  m5_portrait: "scripts/samples/m5_portrait.json",
  m5_fx: "scripts/samples/m5_fx.json",
  s1_transitions: "tests/fixtures/good/transitions.json",
  s2_dialogue: "scripts/samples/s2_dialogue.json",
  s3_bodies: "scripts/samples/s3_bodies.json",
  s4_park: "scripts/samples/s4_park.json",
  s5_pairs: "scripts/samples/s5_pairs.json",
};
const ONLY = process.env.GOLDEN_ONLY;

/** Frames to compare: 10 evenly spaced, or (stories) 30% into each hold and each scene's first frame. */
function framesFor(engine, r) {
  const scenes = engine.getScenes();
  if (scenes.length < 2) return Array.from({ length: 10 }, (_, i) => Math.floor((i * (r.totalFrames - 1)) / 9));
  const out = [];
  let prevEnd = 0;
  for (const sc of scenes) {
    if (sc.startFrame > prevEnd) out.push(Math.floor(prevEnd + (sc.startFrame - prevEnd) * 0.3));
    out.push(sc.startFrame + 30);
    prevEnd = sc.startFrame + sc.frames;
  }
  if (r.totalFrames > prevEnd) out.push(Math.floor(prevEnd + (r.totalFrames - prevEnd) * 0.3));
  return out;
}
const UPDATE = process.env.GOLDEN_UPDATE === "1";
const TOLERANCE = 0.005; // fraction of pixels allowed to differ
const CHANNEL = 16; // per-channel difference that counts as a changed pixel
const root = new URL("../../", import.meta.url);
const backend = await loadBackend();

for (const [name, file] of Object.entries(GOLDEN_SCRIPTS)) {
  if (ONLY && ONLY !== name) continue;
  test(`golden: ${name}`, async () => {
    const engine = createEngine({ catalog, createCanvas: backend.createCanvas });
    const r = engine.load(JSON.parse(readFileSync(new URL(file, root), "utf8")));
    assert.ok(r.ok, JSON.stringify(r.errors));
    const full = backend.createCanvas(r.width, r.height);
    const small = backend.createCanvas(r.width / 4, r.height / 4);
    const sctx = small.getContext("2d");
    const dir = new URL(`tests/golden/${name}/`, root);
    if (UPDATE) mkdirSync(dir, { recursive: true });
    for (const n of framesFor(engine, r)) {
      engine.renderFrame(full.getContext("2d"), n);
      sctx.clearRect(0, 0, small.width, small.height);
      sctx.drawImage(full, 0, 0, small.width, small.height);
      const path = new URL(`f${String(n).padStart(4, "0")}.png`, dir).pathname;
      if (UPDATE) {
        await backend.savePng(small, path);
        continue;
      }
      assert.ok(existsSync(path), `missing golden ${path}: run npm run golden:update`);
      const ref = backend.createCanvas(small.width, small.height);
      ref.getContext("2d").drawImage(await backend.loadImage(path), 0, 0);
      const a = backend.readRGBA(small);
      const b = backend.readRGBA(ref);
      let changed = 0;
      for (let p = 0; p < a.length; p += 4) {
        if (Math.abs(a[p] - b[p]) > CHANNEL || Math.abs(a[p + 1] - b[p + 1]) > CHANNEL || Math.abs(a[p + 2] - b[p + 2]) > CHANNEL) changed++;
      }
      const frac = changed / (a.length / 4);
      assert.ok(frac <= TOLERANCE, `${name} frame ${n}: ${(frac * 100).toFixed(2)}% pixels differ (max ${TOLERANCE * 100}%)`);
    }
  });
}
