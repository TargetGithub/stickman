// Generated music, ambience, the story score and loudness (S7): deterministic, never clipping, fitted to the
// scene, crossfaded on scene boundaries, levelled for kids-friendly listening.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { createEngine } from "../../engine/index.js";
import { renderMusic, MUSIC_LUFS } from "../../tools/lib/music_gen.mjs";
import { compose } from "../../tools/lib/patterns.mjs";
import { renderAmbience, BEDS, AMBIENCE_LUFS } from "../../tools/lib/ambience.mjs";
import { renderScore, segmentGain, storyDuck } from "../../tools/lib/score.mjs";
import { measureLoudness, normalizeLoudness } from "../../tools/lib/loudness.mjs";
import { mixdownStory, STORY_LUFS, SR } from "../../tools/lib/mixer.mjs";

const MOODS = Object.keys(catalog.musicMoods);
const peakOf = (buf) => buf.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

test("the same mood, seed and length give byte-identical audio; another seed does not", () => {
  const a = renderMusic({ mood: "happy", catalog, seed: 3, seconds: 8 }).samples;
  const b = renderMusic({ mood: "happy", catalog, seed: 3, seconds: 8 }).samples;
  assert.deepEqual(Buffer.from(a.buffer), Buffer.from(b.buffer));
  const c = renderMusic({ mood: "happy", catalog, seed: 4, seconds: 8 }).samples;
  assert.notDeepEqual(Buffer.from(a.buffer), Buffer.from(c.buffer));
});

test("every mood renders 30 s at the music level without clipping", () => {
  for (const mood of MOODS) {
    const r = renderMusic({ mood, catalog, seed: 1, seconds: 30 });
    assert.equal(r.samples.length, 30 * SR * 2, mood);
    assert.ok(r.samples.every(Number.isFinite), `${mood}: finite`);
    assert.ok(peakOf(r.samples) <= 0.891, `${mood}: peak ${peakOf(r.samples)}`);
    const l = measureLoudness(r.samples);
    assert.ok(Math.abs(l.integrated - MUSIC_LUFS) < 0.5, `${mood}: ${l.integrated} LUFS`);
    let dc = 0;
    for (const v of r.samples) dc += v;
    assert.ok(Math.abs(dc / r.samples.length) < 0.002, `${mood}: DC offset`);
  }
});

test("the bars fill the length exactly, so the ending lands on the last beat", () => {
  for (const mood of MOODS) {
    for (const seconds of [7.3, 31, 64.2]) {
      const m = catalog.musicMoods[mood];
      const c = compose(m, catalog.scales, { seed: "x", seconds, intensityAt: () => 0.6 });
      assert.ok(Math.abs(c.bars * c.barSec - seconds) < 1e-9, `${mood} ${seconds}`);
      assert.ok(c.tempo > m.tempo[0] * 0.8 && c.tempo < m.tempo[1] * 1.25, `${mood} ${seconds}: ${c.tempo} bpm`);
      const last = Math.max(...c.notes.map((n) => n.t));
      assert.ok(last < seconds, `${mood}: no note after the end`);
      assert.ok(c.notes.some((n) => n.t >= seconds - c.barSec - 1e-9 && n.inst === m.patches.pad), `${mood}: a final chord`);
    }
  }
});

test("layers follow intensity: drums and arpeggios come in as it rises", () => {
  for (const mood of ["happy", "battle", "heroic"]) {
    const m = catalog.musicMoods[mood];
    const quiet = compose(m, catalog.scales, { seed: "i", seconds: 30, intensityAt: () => 0.1 });
    const loud = compose(m, catalog.scales, { seed: "i", seconds: 30, intensityAt: () => 0.95 });
    const count = (c, inst) => c.notes.filter((n) => n.inst === inst).length;
    assert.ok(loud.notes.length > quiet.notes.length * 2, mood);
    assert.equal(count(quiet, "snare") + count(quiet, "hat"), 0, `${mood}: no groove when it is quiet`);
    assert.ok(count(loud, "kick") > 10 && count(loud, m.patches.arp) > 0, mood);
  }
});

test("loudness meter: BS.1770 reference tones", () => {
  const tone = (db, both = true) => {
    const n = SR * 5;
    const a = 10 ** (db / 20);
    const st = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      st[i * 2] = a * Math.sin((2 * Math.PI * 997 * i) / SR);
      st[i * 2 + 1] = both ? st[i * 2] : 0;
    }
    return st;
  };
  assert.ok(Math.abs(measureLoudness(tone(-20)).integrated + 20) < 0.05);
  assert.ok(Math.abs(measureLoudness(tone(-20, false)).integrated + 23.01) < 0.05);
  assert.equal(measureLoudness(new Float32Array(SR * 2)).integrated, -Infinity);
  const t = tone(-30);
  normalizeLoudness(t, -16);
  assert.ok(Math.abs(measureLoudness(t).integrated + 16) < 0.05);
});

test("ambience beds: deterministic, levelled far below dialogue, never clipping", () => {
  for (const bed of BEDS) {
    const a = renderAmbience(bed, 12, 5);
    assert.deepEqual(Buffer.from(a.buffer), Buffer.from(renderAmbience(bed, 12, 5).buffer), bed);
    assert.ok(Math.abs(measureLoudness(a).integrated - AMBIENCE_LUFS) < 0.5, bed);
    assert.ok(peakOf(a) < 0.9, `${bed}: peak ${peakOf(a)}`);
  }
});

/** A short three-scene story: happy → (same mood, continues) → sad, with a set_music intensity change. */
function moodStory() {
  const scene = (id, mood, extra = {}) => ({ id, location: "city_park", cast: [{ id: "kai", x: 1300, facing: 1 }, { id: "pip", x: 1600, facing: -1 }],
    beats: [{ id: `${id}w`, at: 0.3, who: "kai", do: "wave", say: "Hi there!" }, { at: { after: `${id}w`, delay: 4 }, who: "pip", do: "bow" }], ...(mood !== undefined ? { music: mood } : {}), ...extra });
  return {
    version: 2, meta: { title: "Moods", format: "landscape", seed: 11, kind: "clip" },
    cast: [{ id: "kai", color: "#3fd8ff" }, { id: "pip", color: "#2fd3c0", body: "buddy" }],
    scenes: [
      scene("a", { mood: "happy" }, { ambience: "park_birds" }),
      { ...scene("b", undefined, { transitionIn: { type: "card", kind: "chapter", text: "Later" } }), beats: [{ id: "bw", at: 0.3, who: "kai", do: "wave" }, { at: 1, who: "world", do: "set_music", params: { intensity: 0.9 } }, { at: { after: "bw", delay: 4 }, who: "pip", do: "bow" }] },
      scene("c", { mood: "sad" }, { weather: "rain", transitionIn: { type: "fade", dur: 1 } }),
      scene("d", null),
    ],
  };
}

test("music plan: a mood carries on until it changes, crossfades centred on the scene boundary, silence with null", () => {
  const e = createEngine({ catalog });
  assert.ok(e.load(moodStory()).ok);
  const plan = e.getMusicPlan();
  const scenes = e.getScenes();
  // Scene b keeps scene a's mood: one happy segment across the card, then sad from scene c's hold, then silence.
  assert.deepEqual(plan.segments.map((s) => s.mood), ["happy", "sad"]);
  const holdStart = (i) => (scenes[i - 1].startFrame + scenes[i - 1].frames) / 60;
  assert.ok(Math.abs(plan.segments[0].t1 - holdStart(2)) < 1e-9 && Math.abs(plan.segments[1].t0 - holdStart(2)) < 1e-9);
  assert.ok(Math.abs(plan.segments[1].t1 - holdStart(3)) < 1e-9, "scene d is silent");
  assert.ok(plan.segments[0].intensity.some((p) => p.v === 0.9), "set_music raises the intensity");
  assert.ok(plan.duck.length >= 3);
  const [a, b] = plan.segments;
  const T = a.t1;
  const total = e.getMeta().durationSec;
  const ga = (t) => segmentGain(a, t, total);
  const gb = (t) => segmentGain(b, t, total);
  assert.ok(Math.abs(ga(T - a.fadeOut / 2) - 1) < 1e-9 && ga(T + a.fadeOut / 2) < 1e-9);
  assert.ok(gb(T - b.fadeIn / 2) < 1e-9 && Math.abs(gb(T + b.fadeIn / 2) - 1) < 1e-9);
  assert.ok(Math.abs(ga(T) ** 2 + gb(T) ** 2 - 1) < 1e-9, "equal power at the boundary");
  const amb = e.getAmbiencePlan();
  assert.ok(amb.some((s) => s.beds.park_birds) && amb.some((s) => s.beds.rain));
});

test("story mix: about -16 LUFS integrated, peaks under -1 dBFS, music ducked under speech", () => {
  const e = createEngine({ catalog });
  e.load(moodStory());
  const plan = e.getMusicPlan();
  const seconds = e.getMeta().durationSec;
  const score = renderScore({ musicPlan: plan, ambiencePlan: e.getAmbiencePlan(), seconds, seed: 11, catalog });
  const silent = new Float32Array(1);
  const mix = mixdownStory({ events: e.getAudioEvents(), durationSec: seconds, sampleFor: () => silent, music: score.music, ambience: score.ambience,
    duck: plan.duck, dips: plan.dips, storyDuck, normalize: normalizeLoudness, loudness: measureLoudness });
  assert.ok(Math.abs(mix.loudness.integrated - STORY_LUFS) < 1, `${mix.loudness.integrated} LUFS`);
  assert.ok(mix.loudness.peak <= -0.99);
  const [a, b] = plan.duck[0];
  assert.ok(storyDuck((a + b) / 2, plan.duck, []) < 0.45 && storyDuck(b + 1, plan.duck, []) === 1);
});

test("story sounds: footsteps by weight, cartoon impacts in kids stories; v1 scripts sound as before", () => {
  const e = createEngine({ catalog });
  e.load({
    version: 2, meta: { title: "Sounds", format: "landscape", seed: 2, kind: "clip" },
    cast: [{ id: "kai", color: "#3fd8ff" }, { id: "bo", color: "#ff9b3d", body: "bulky" }],
    scenes: [{ id: "s", location: "dojo_dusk", cast: [{ id: "kai", x: 1200, facing: 1 }, { id: "bo", x: 1700, facing: -1 }], beats: [
      { id: "w", at: 0.2, who: "bo", do: "walk", params: { distance: 200 } },
      { id: "j", at: { after: "w" }, who: "kai", do: "jab", target: "bo", outcome: "hit", approach: "run" },
      { at: { after: "j" }, who: "kai", do: "laugh" },
    ] }],
  });
  const keys = new Set(e.getAudioEvents().map((x) => x.sfx));
  for (const k of ["footstep_hard", "footstep_soft", "pow", "laugh_small"]) assert.ok(keys.has(k), k);
  const v1 = createEngine({ catalog });
  v1.load({ version: 1, meta: { title: "v1", format: "landscape", seed: 2 }, characters: [{ id: "a", x: 1200, facing: 1, color: "#3fd8ff" }, { id: "b", x: 1700, facing: -1, color: "#ff5c8a" }],
    camera: [{ at: 0, mode: "follow" }], beats: [{ id: "w", at: 0.2, who: "a", do: "walk", params: { distance: 200 } }, { at: { after: "w" }, who: "a", do: "jab", target: "b", outcome: "hit", approach: "run" }, { at: 3, who: "a", do: "laugh" }] });
  const v1keys = new Set(v1.getAudioEvents().map((x) => x.sfx));
  for (const k of catalog.sfxKeys.slice(-11)) assert.ok(!v1keys.has(k), `v1 has no ${k}`);
  assert.equal(v1.getMusicPlan(), null);
});
