import { test } from "node:test";
import assert from "node:assert/strict";
import { panGains, mixEvents, limit, addMusic, musicLevelAt, duckAt, mixdown, SR, CEILING } from "../../tools/lib/mixer.mjs";

const click = new Float32Array([1, 0.5, 0.25]);

test("constant-power pan keeps total power at 1", () => {
  for (const p of [-1, -0.5, 0, 0.3, 1]) {
    const [l, r] = panGains(p);
    assert.ok(Math.abs(l * l + r * r - 1) < 1e-12, `pan ${p}`);
  }
  assert.ok(panGains(-1)[1] < 1e-12 && panGains(1)[0] < 1e-12);
});

test("events land at their exact sample offset with volume and pan", () => {
  const out = mixEvents([{ t: 0.5, sfx: "x", volume: 0.5, pan: -1 }], 1, () => click, { gain: 1 });
  const i = Math.round(0.5 * SR);
  assert.ok(Math.abs(out[i * 2] - 0.5) < 1e-6, "left gets it");
  assert.ok(Math.abs(out[i * 2 + 1]) < 1e-6, "right silent");
  assert.equal(out[(i - 1) * 2], 0, "nothing before t");
  assert.equal(out.length, SR * 2);
});

test("events past the end are clipped, not thrown", () => {
  const out = mixEvents([{ t: 0.999999, sfx: "x", volume: 1, pan: 0 }], 1, () => new Float32Array(1000));
  assert.equal(out.length, SR * 2);
});

test("the limiter enforces the ceiling, leaves quiet audio alone, and reports reduction", () => {
  const loud = new Float32Array(SR * 2);
  for (let i = 0; i < SR; i++) loud[i * 2] = loud[i * 2 + 1] = 3 * Math.sin(i / 20);
  const db = limit(loud);
  assert.ok(Math.max(...loud.map(Math.abs)) <= CEILING + 1e-6);
  assert.ok(db < -9, `reduction ${db} dB`);
  const quiet = new Float32Array(2000).map((_, i) => 0.3 * Math.sin(i / 7));
  const copy = quiet.slice();
  assert.equal(limit(quiet), 0);
  assert.deepEqual(quiet, copy);
});

test("music follows cues, ducks under heavy hits, and fades at the end", () => {
  assert.equal(musicLevelAt(1, [], true), 1);
  assert.equal(musicLevelAt(1, [{ t: 2, cue: "start" }], true), 0, "silent before a start cue");
  assert.ok(Math.abs(musicLevelAt(2.5, [{ t: 2, cue: "start" }], true) - 1) < 1e-9);
  assert.ok(musicLevelAt(3.5, [{ t: 3, cue: "duck", volume: 0.3 }], true) < 0.31);
  assert.ok(duckAt(5.08, [5.1]) < 1 && duckAt(5, [5.1]) === 1, "attack starts 30 ms before the hit");
  assert.ok(Math.abs(duckAt(5.2, [5]) - 0.63) < 1e-9, "held during the hit");
  assert.equal(duckAt(6, [5]), 1, "released after");
  const out = new Float32Array(SR * 4);
  const music = new Float32Array(SR * 2).fill(1);
  addMusic(out, music, { volume: 0.5, events: [{ t: 1, sfx: "punch_heavy" }] });
  assert.ok(Math.abs(out[Math.round(0.5 * SR) * 2] - 0.5) < 1e-6, "loops at volume");
  assert.ok(out[Math.round(1.1 * SR) * 2] < 0.33, "ducked under the heavy hit");
  assert.ok(out[(SR * 2 - 1) * 2] < 0.01, "faded out");
});

test("mixdown is deterministic", () => {
  const events = [{ t: 0.1, sfx: "a", volume: 1, pan: 0.2 }, { t: 0.1, sfx: "b", volume: 1, pan: -0.4 }];
  const sample = () => new Float32Array(4800).fill(0.8);
  const a = mixdown({ events, durationSec: 0.5, sampleFor: sample });
  const b = mixdown({ events, durationSec: 0.5, sampleFor: sample });
  assert.deepEqual(a.samples, b.samples);
});
