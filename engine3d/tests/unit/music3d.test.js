// Scene music (tools/lib/music3d.mjs): which mood plays when, the crossfade gains, the checks, and the bed
// for an episode without scene music matching the single-mood bed it always was. Plus the phoneme entries.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { musicTimeline, moodGainAt, checkSceneMusic, renderMusicBed, XFADE } from "../../tools/lib/music3d.mjs";
import { phonemeTable } from "../../tools/phonemes.mjs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { validateScript } from "../../runtime/validate.js";
import { renderMusic } from "../../../tools/lib/music_gen.mjs";
import { loadCatalogSync } from "../../../catalog/index.js";

const plan = [{ id: "a", start: 0 }, { id: "b", start: 10 }, { id: "c", start: 20 }, { id: "d", start: 30 }];
const ep = { music: "playful", musicGain: 0.32, duration: 40 };
const seg = (start, end, mood, gain) => ({ start, end, mood, gain });

const cases = [
  ["no scene music: one segment", [], [seg(0, 40, "playful", 0.32)]],
  ["a calm middle", [{ id: "b", music: "calm" }, { id: "c", music: "calm" }], [seg(0, 10, "playful", 0.32), seg(10, 30, "calm", 0.32), seg(30, 40, "playful", 0.32)]],
  ["music false is silence", [{ id: "c", music: false }], [seg(0, 20, "playful", 0.32), seg(20, 30, null, 0), seg(30, 40, "playful", 0.32)]],
  ["musicGain alone keeps the episode mood", [{ id: "a", musicGain: 0.2 }], [seg(0, 10, "playful", 0.2), seg(10, 40, "playful", 0.32)]],
  ["the same mood named again merges", [{ id: "a", music: "playful" }], [seg(0, 40, "playful", 0.32)]],
  ["mood and gain", [{ id: "d", music: "lullaby", musicGain: 0.25 }], [seg(0, 30, "playful", 0.32), seg(30, 40, "lullaby", 0.25)]],
];
for (const [name, scenes, want] of cases) test(`timeline: ${name}`, () => assert.deepEqual(musicTimeline(plan, scenes, ep), want));

test("timeline: an episode without music only plays scene music", () => {
  assert.deepEqual(musicTimeline(plan, [{ id: "b", music: "calm" }], { ...ep, music: null }), [seg(0, 10, null, 0), seg(10, 20, "calm", 0.32), seg(20, 40, null, 0)]);
});

test("timeline: a JS scene (no plan scenes) gets the episode mood", () => {
  assert.deepEqual(musicTimeline(undefined, [], ep), [seg(0, 40, "playful", 0.32)]);
});

test("crossfade: equal power across a mood change, centred on the scene start", () => {
  const segs = musicTimeline(plan, [{ id: "b", music: "calm" }], ep);
  const at = (t) => [moodGainAt(segs, "playful", t), moodGainAt(segs, "calm", t)].map((g) => Math.round((g / 0.32) * 1000) / 1000);
  const table = [[0, [1, 0]], [8.9, [1, 0]], [10 - XFADE / 2, [1, 0]], [10, [0.707, 0.707]], [10 + XFADE / 2, [0, 1]], [15, [0, 1]], [19, [0, 1]], [20, [0.707, 0.707]], [21, [1, 0]], [39.9, [1, 0]]];
  for (const [t, want] of table) assert.deepEqual(at(t), want, `t=${t}`);
  // Power stays constant through the fade.
  for (let t = 9; t <= 11; t += 0.25) assert.ok(Math.abs(moodGainAt(segs, "playful", t) ** 2 + moodGainAt(segs, "calm", t) ** 2 - 0.32 ** 2) < 1e-9);
});

test("crossfade: a gain change within one mood is a linear ramp", () => {
  const segs = musicTimeline(plan, [{ id: "a", musicGain: 0.2 }], ep);
  const table = [[0, 0.2], [9, 0.2], [10, 0.26], [11, 0.32], [30, 0.32]];
  for (const [t, want] of table) assert.ok(Math.abs(moodGainAt(segs, "playful", t) - want) < 1e-9, `t=${t}`);
});

test("checks: unknown moods and gains out of range; the runtime validator ignores the scene keys", () => {
  const catalog = loadCatalog3d();
  const scenes = [{ id: "a", music: "calm", musicGain: 0.2, beats: [{ dur: 1, do: [] }] }, { id: "b", music: false, beats: [{ dur: 1, do: [] }] }];
  const script = { kind: "video3d", version: 1, meta: { title: "t", seed: 1 }, scenes };
  const v = validateScript(script, catalog);
  assert.deepEqual([v.errors, v.warnings], [[], []]);
  assert.deepEqual(checkSceneMusic(script, catalog.musicMoods), []);
  const bad = { scenes: [{ id: "a", music: "disco" }, { id: "b", musicGain: 2 }] };
  assert.deepEqual(checkSceneMusic(bad, catalog.musicMoods).map((e) => [e.code, e.path]), [["E3D_MUSIC", "scenes[0].music"], ["E3D_RANGE", "scenes[1].musicGain"]]);
});

test("bed: without scene music it is the single-mood bed scaled by the gain, as before", () => {
  const catalog = loadCatalogSync();
  const bed = renderMusicBed(musicTimeline([{ id: "a", start: 0 }], [], { music: "calm", musicGain: 0.3, duration: 3 }), { catalog, seed: 7, duration: 3 });
  const old = renderMusic({ mood: "calm", catalog, seed: 7, seconds: 3 }).samples;
  for (let i = 0; i < old.length; i++) old[i] *= 0.3;
  assert.deepEqual(bed, old);
  assert.equal(renderMusicBed([seg(0, 3, null, 0)], { catalog, seed: 7, duration: 3 }), null);
});

test("phonemes: every ph_ sound has IPA, a description and phonics tags", () => {
  const table = phonemeTable(loadCatalog3d().sounds);
  const names = Object.keys(table);
  for (const n of ["ph_a_short", "ph_e_short", "ph_i_short", "ph_o_short", "ph_u_short", "ph_a_long", "ph_sh", "ph_ch", "ph_th", "ph_wh", "ph_g", "ph_l"]) assert.ok(table[n], n);
  for (const n of names) {
    assert.match(n, /^ph_[a-z_]+$/);
    assert.ok(table[n].description && table[n].tags.includes("phonics"), n);
  }
  // The soft voice's model knows every IPA symbol used (when the model is installed).
  const cfg = new URL("../../../assets/speech/models/en_US-kristin-medium.onnx.json", import.meta.url);
  if (!existsSync(cfg)) return;
  const ids = JSON.parse(readFileSync(cfg, "utf8")).phoneme_id_map;
  for (const n of names) for (const ch of table[n].ipa) assert.ok(ids[ch], `${n}: "${ch}" is not a Piper phoneme`);
});
