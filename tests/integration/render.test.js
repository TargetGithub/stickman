// Renderer smoke + determinism (needs the Node canvas backend; integration only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBackend } from "../../tools/lib/canvas.mjs";
import { simulate } from "../../engine/sim.js";
import { createRenderer, renderFrame } from "../../engine/renderer/index.js";
import { catalog } from "../../data/index.js";

const script = JSON.parse(readFileSync(new URL("../../scripts/samples/m4_dojo.json", import.meta.url), "utf8"));
const backend = await loadBackend();

function hashes(frames) {
  const sim = simulate(script, catalog);
  const r = createRenderer(catalog, sim);
  const canvas = backend.createCanvas(sim.format.width, sim.format.height);
  const ctx = canvas.getContext("2d");
  return frames.map((n) => {
    renderFrame(r, ctx, Math.min(n, sim.frames.length - 1));
    return createHash("sha256").update(backend.readRGBA(canvas)).digest("hex");
  });
}

test("frames render deterministically, in any order (random access)", () => {
  const picks = [0, 120, 200, 420, 428, 640, 720];
  const a = hashes(picks);
  const b = hashes([...picks].reverse()).reverse();
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length, "frames differ from each other");
});
