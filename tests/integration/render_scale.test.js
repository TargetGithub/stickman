// Render scale (ADR-039, integration): a scale-2 (4K) frame downsampled to the frame size matches the scale-1
// frame closely: same layout, text and effects, only finer pixels. Covers a v2 story (with a dissolve), a
// portrait script, and a v3 scene with lighting, depth of field and every post effect.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadBackend } from "../../tools/lib/canvas.mjs";
import { createEngine } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const backend = await loadBackend();
const root = new URL("../../", import.meta.url);
const read = (file) => JSON.parse(readFileSync(new URL(file, root), "utf8"));

/** v3_9_polish (lights, depth of field) with bloom, grain, chroma, grade, vignette and letterbox on top. */
function v3WithPost() {
  const s = read("scripts/samples/v3_9_polish.json");
  s.post = { bloom: 0.4, grain: 0.3, chroma: 0.3, gamma: 1.08, saturation: 1.1, contrast: 1.05, vignette: 0.35, letterbox: 0.5 };
  return s;
}

function portrait() {
  const s = read("scripts/samples/m5_portrait.json");
  s.meta.format = "portrait";
  return s;
}

// [name, script, frames, max mean channel difference (0..255)]. Measured: v2 under 0.3, v3 about 0.6 (film grain);
// a DoF blur left at frame px (half width at 4K) already gives 0.86.
const CASES = [
  ["v2 story with transitions", () => read("tests/fixtures/good/transitions.json"), "holds", 0.5],
  ["v2 park", () => read("scripts/samples/s4_park.json"), [120, 600], 0.5],
  ["portrait", portrait, [90, 300], 0.5],
  ["v3 lights, depth of field and post", v3WithPost, [150, 300, 600], 0.75],
];

/** Frames 30% into each transition hold (a dissolve draws the next scene into a scratch canvas). */
function holdFrames(engine, total) {
  const out = [];
  let prevEnd = 0;
  for (const sc of engine.getScenes()) {
    if (sc.startFrame > prevEnd) out.push(Math.floor(prevEnd + (sc.startFrame - prevEnd) * 0.3));
    prevEnd = sc.startFrame + sc.frames;
  }
  return out.filter((n) => n < total);
}

/** Mean absolute RGB difference between two equally sized RGBA buffers. */
function meanDiff(a, b) {
  let sum = 0;
  for (let p = 0; p < a.length; p += 4) sum += Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]);
  return sum / ((a.length / 4) * 3);
}

for (const [name, make, frames, max] of CASES) {
  test(`render scale 2 matches scale 1 when downsampled: ${name}`, () => {
    const script = make();
    const one = createEngine({ catalog, createCanvas: backend.createCanvas });
    const two = createEngine({ catalog, createCanvas: backend.createCanvas, scale: 2 });
    const r1 = one.load(script);
    const r2 = two.load(script);
    assert.ok(r1.ok && r2.ok, JSON.stringify(r1.errors));
    assert.deepEqual([r2.outputWidth, r2.outputHeight], [r1.width * 2, r1.height * 2]);
    const c1 = backend.createCanvas(r1.width, r1.height);
    const c2 = backend.createCanvas(r2.outputWidth, r2.outputHeight);
    const down = backend.createCanvas(r1.width, r1.height);
    const dctx = down.getContext("2d");
    const list = frames === "holds" ? holdFrames(one, r1.totalFrames) : frames;
    assert.ok(list.length > 0);
    for (const n of list) {
      one.renderFrame(c1.getContext("2d"), n);
      two.renderFrame(c2.getContext("2d"), n);
      dctx.clearRect(0, 0, down.width, down.height);
      dctx.drawImage(c2, 0, 0, down.width, down.height);
      const d = meanDiff(backend.readRGBA(c1), backend.readRGBA(down));
      if (process.env.SCALE_DEBUG) console.log(name, n, d.toFixed(3));
      assert.ok(d < max, `${name} frame ${n}: mean difference ${d.toFixed(2)} (max ${max})`);
    }
  });
}
