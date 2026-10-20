// Integration (canvas backend): a v3 motion-graphics script (layers, text, shapes, tracks, post) renders the
// same pixels for a frame whatever was drawn before it (random access, seeded grain).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createEngine } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";
import { loadBackend } from "../../tools/lib/canvas.mjs";

test("the motion sample renders the same frame twice, in any order", async () => {
  const backend = await loadBackend();
  const script = JSON.parse(readFileSync(new URL("../../scripts/samples/v3_5_motion.json", import.meta.url), "utf8"));
  const engine = createEngine({ catalog, createCanvas: backend.createCanvas });
  assert.ok(engine.load(script).ok);
  const canvas = backend.createCanvas(1920, 1080);
  const ctx = canvas.getContext("2d");
  const hashOf = (n) => { engine.renderFrame(ctx, n); return createHash("sha256").update(backend.readRGBA(canvas)).digest("hex"); };
  const a = hashOf(300);
  hashOf(60);
  assert.equal(hashOf(300), a);
});
