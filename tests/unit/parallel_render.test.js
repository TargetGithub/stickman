import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultJobs, planChunks, usefulJobs, concatList } from "../../tools/lib/parallel_render.mjs";
import { resolve } from "node:path";

const GB = 1e9;

test("defaultJobs takes one worker per core unless memory runs short", () => {
  const cases = [
    // [width, height, cpus, memory, expected]
    [1920, 1080, 12, 18 * GB, 12],
    [3840, 2160, 12, 18 * GB, 5], // a 4K worker and its x264 need about 2 GB
    [3840, 2160, 48, 192 * GB, 48],
    [3840, 2160, 12, 1 * GB, 1],
    [1920, 1080, 1, 64 * GB, 1],
  ];
  for (const [w, h, cpus, memory, want] of cases) assert.equal(defaultJobs(w, h, { cpus, memory }), want, `${w}x${h} ${cpus} cpus ${memory / GB} GB`);
});

test("planChunks keeps every frame once, in order, about four chunks per worker", () => {
  const picks = Array.from({ length: 9000 }, (_, i) => i * 2);
  const chunks = planChunks(picks, 8);
  assert.deepEqual(chunks.flat(), picks);
  assert.ok(chunks.length >= 30 && chunks.length <= 33, `${chunks.length} chunks`);
});

test("planChunks never makes chunks shorter than 60 frames (except the last)", () => {
  const chunks = planChunks(Array.from({ length: 500 }, (_, i) => i), 12);
  assert.ok(chunks.slice(0, -1).every((c) => c.length === 60));
  assert.equal(chunks.flat().length, 500);
});

test("usefulJobs drops to one process for short renders", () => {
  const cases = [
    [12, 30, 1],
    [12, 119, 1],
    [12, 240, 4],
    [12, 18000, 12],
    [1, 18000, 1],
  ];
  for (const [jobs, frames, want] of cases) assert.equal(usefulJobs(jobs, frames), want, `${jobs} jobs, ${frames} frames`);
});

test("concatList names every chunk by its absolute path (ffmpeg reads relative ones from the list's folder)", () => {
  const list = concatList(["out/x/parts/part_0000.mp4", "/abs/it's.mp4"]);
  assert.equal(list, `file '${resolve("out/x/parts/part_0000.mp4")}'\nfile '/abs/it'\\''s.mp4'\n`);
});

test("planChunks keeps a given chunk size (a resumed render cuts its frames as before)", () => {
  const picks = Array.from({ length: 2000 }, (_, i) => i);
  const chunks = planChunks(picks, 3, 572);
  assert.deepEqual(chunks.map((c) => c.length), [572, 572, 572, 284]);
  assert.deepEqual(planChunks(picks, 9, 572), chunks, "the worker count no longer matters");
});
