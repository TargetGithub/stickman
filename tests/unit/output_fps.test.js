import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOutputFps, outputFrames, OUTPUT_FPS } from "../../tools/lib/output_fps.mjs";

test("parseOutputFps accepts the listed rates and refuses the rest", () => {
  const cases = [
    [undefined, { fps: 60 }],
    [null, { fps: 60 }],
    ["24", { fps: 24 }],
    ["25", { fps: 25 }],
    ["30", { fps: 30 }],
    ["60", { fps: 60 }],
    ["29.97", "error"],
    ["12", "error"],
    ["fast", "error"],
    ["", "error"],
  ];
  for (const [value, want] of cases) {
    const got = parseOutputFps(value, 60);
    if (want === "error") assert.ok(got.error, `${value} should be refused`);
    else assert.deepEqual(got, want, String(value));
  }
  assert.deepEqual(OUTPUT_FPS, [24, 25, 30, 60]);
});

test("parseOutputFps refuses a rate above the simulation's", () => {
  assert.ok(parseOutputFps("60", 30).error);
});

test("outputFrames picks the nearest simulation frame for each output frame", () => {
  const cases = [
    // [from, to, outFps, expected]
    [0, 9, 60, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
    [0, 9, 30, [0, 2, 4, 6, 8]],
    [0, 14, 24, [0, 3, 5, 8, 10, 13]],
    [100, 109, 30, [100, 102, 104, 106, 108]],
    [0, 11, 25, [0, 2, 5, 7, 10]],
    [5, 4, 30, []],
  ];
  for (const [from, to, outFps, want] of cases) assert.deepEqual(outputFrames(from, to, 60, outFps), want, `${from}-${to} @${outFps}`);
});

test("outputFrames keeps the video length: frames / output rate ≈ simulated seconds", () => {
  for (const outFps of [24, 25, 30, 60]) {
    const picks = outputFrames(0, 16764, 60, outFps);
    const secs = picks.length / outFps;
    assert.ok(Math.abs(secs - 16765 / 60) < 1 / outFps, `${outFps}: ${secs}`);
    assert.equal(picks[0], 0);
    assert.ok(picks.every((n, i) => i === 0 || n > picks[i - 1]), "ascending");
    assert.ok(picks.at(-1) <= 16764);
  }
});
