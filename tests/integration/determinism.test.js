// Determinism (M5.3, acceptance criterion 3): two independent loads of the same script render
// byte-identical frames. Every frame of the M4 sample is hashed (SHA-256 of RGBA).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBackend } from "../../tools/lib/canvas.mjs";
import { createEngine } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const script = JSON.parse(readFileSync(new URL("../../scripts/samples/m4_dojo.json", import.meta.url), "utf8"));
const backend = await loadBackend();

function renderAll() {
  const engine = createEngine({ catalog });
  const r = engine.load(structuredClone(script));
  const canvas = backend.createCanvas(r.width, r.height);
  const ctx = canvas.getContext("2d");
  const out = [];
  for (let n = 0; n < r.totalFrames; n++) {
    engine.renderFrame(ctx, n);
    out.push(createHash("sha256").update(backend.readRGBA(canvas)).digest("hex"));
  }
  return { hashes: out, audio: JSON.stringify(engine.getAudioEvents()) };
}

test("every frame and the audio event list are identical across two runs", () => {
  const a = renderAll();
  const b = renderAll();
  assert.equal(a.hashes.length, b.hashes.length);
  const diff = a.hashes.findIndex((h, i) => h !== b.hashes[i]);
  assert.equal(diff, -1, `first differing frame: ${diff}`);
  assert.equal(a.audio, b.audio);
});
