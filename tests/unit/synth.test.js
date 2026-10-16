import { test } from "node:test";
import assert from "node:assert/strict";
import { synthesize, RECIPE_KEYS, SAMPLE_RATE } from "../../tools/lib/synth.mjs";
import { catalog } from "../../data/index.js";

test("every required SFX key has a recipe", () => {
  for (const key of catalog.sfxKeys) assert.ok(RECIPE_KEYS.includes(key), key);
});

test("each sound is finite, peaks at -1 dBFS, starts promptly and ends silent", () => {
  for (const key of catalog.sfxKeys) {
    const s = synthesize(key);
    let peak = 0;
    let firstLoud = -1;
    for (let i = 0; i < s.length; i++) {
      assert.ok(Number.isFinite(s[i]), `${key} NaN at ${i}`);
      const a = Math.abs(s[i]);
      peak = Math.max(peak, a);
      if (firstLoud < 0 && a > 0.05) firstLoud = i;
    }
    assert.ok(Math.abs(peak - 0.89) < 1e-6, `${key} peak ${peak}`);
    assert.ok(firstLoud >= 0 && firstLoud / SAMPLE_RATE < 0.7, `${key} starts at ${firstLoud / SAMPLE_RATE}s`);
    assert.ok(Math.abs(s[s.length - 1]) < 1e-3, `${key} ends with a click`);
    assert.ok(s.length / SAMPLE_RATE <= 2.5, `${key} too long`);
  }
});

test("synthesis is deterministic and keys sound different", () => {
  assert.deepEqual(synthesize("punch_heavy"), synthesize("punch_heavy"));
  const a = synthesize("punch_light");
  const b = synthesize("kick_light");
  let diff = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) diff += Math.abs(a[i] - b[i]);
  assert.ok(diff > 100);
});
