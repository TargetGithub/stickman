// Frame independence (parallel rendering, tools/lib/parallel_render.mjs): a frame draws the same whatever the
// engine drew before it, so render workers can take any chunk. Regression: the lit set pieces' scratch canvases
// grew with the pieces seen so far, and frame 298 of the V3.4 camera sample changed after drawing frame 120.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBackend } from "../../tools/lib/canvas.mjs";
import { createEngine } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const backend = await loadBackend();
const load = (name) => JSON.parse(readFileSync(new URL(`../../scripts/samples/${name}.json`, import.meta.url), "utf8"));

/** Hash of frame `target` after the engine drew the frames in `before` (a fresh engine and canvas per call). */
function frameAfter(script, before, target) {
  const engine = createEngine({ catalog, createCanvas: backend.createCanvas });
  const r = engine.load(structuredClone(script));
  const canvas = backend.createCanvas(r.outputWidth, r.outputHeight);
  const ctx = canvas.getContext("2d");
  for (const n of before) engine.renderFrame(ctx, n);
  engine.renderFrame(ctx, target);
  return createHash("sha256").update(backend.readRGBA(canvas)).digest("hex");
}

const CASES = [
  // [sample, frames drawn first, frame checked]
  ["v3_4_camera", [120], 298],
  ["v3_4_camera", [200, 220], 298],
  ["v3_4_camera", [296], 298],
  ["v3_3_lights", [60], 400],
];

for (const [name, before, target] of CASES) {
  test(`integration: ${name} frame ${target} is the same after drawing ${before.join(", ")}`, () => {
    const script = load(name);
    assert.equal(frameAfter(script, before, target), frameAfter(script, [], target));
  });
}
