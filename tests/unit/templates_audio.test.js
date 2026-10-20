// Templates, markers and audio tracks (ENGINE_V3_SPEC 6, ADR-031): substitution and params, expansion of the
// Doopi intro, marker times, the audio track plan (tracks, sfx hits, buses, ducking), the gain helpers, the
// tools' stem mixing with pan, and the validator codes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { expandScript, substitute, templateParams, templateKey } from "../../engine/templates.js";
import { collectAudioTracks, busGainAt, duckGainAt, trackGainAt, trackPanAt } from "../../engine/audio_tracks.js";
import { simulate } from "../../engine/sim.js";
import { validate, createEngine } from "../../engine/index.js";
import { addTrackStems, applyEventBuses, stemGains } from "../../tools/lib/track_mix.mjs";
import { catalog } from "../../catalog/index.js";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const SAMPLE = JSON.parse(readFileSync(new URL("../../scripts/samples/v3_8_audio.json", import.meta.url), "utf8"));

test("substitute: whole placeholders keep their type, inner ones become text, unknown ones stay", () => {
  assert.deepEqual(substitute({ a: "${n}", b: "Ep ${n}: ${t}", c: ["${list}"], d: "${nope}" }, { n: 25, t: "Hi", list: [1, 2] }), { a: 25, b: "Ep 25: Hi", c: [[1, 2]], d: "${nope}" });
  assert.equal(templateKey("base:intro_card"), "intro_card");
  assert.equal(templateKey("doopi_intro"), "doopi_intro");
});

test("templateParams: required, defaults, types, enums, length and unknown params", () => {
  const tpl = { params: { a: { type: "number", required: true, description: "a" }, b: { type: "string", default: "x", maxLength: 3, description: "b" }, c: { type: "string", enum: ["p", "q"], default: "p", description: "c" } } };
  assert.deepEqual(templateParams(tpl, { a: 1 }, "u"), { vars: { a: 1, b: "x", c: "p" }, issues: [] });
  const codes = (given) => templateParams(tpl, given, "u").issues.map((i) => i.path);
  assert.deepEqual(codes({}), ["u.params"]);
  assert.deepEqual(codes({ a: "1" }), ["u.params.a"]);
  assert.deepEqual(codes({ a: 1, b: "long" }), ["u.params.b"]);
  assert.deepEqual(codes({ a: 1, c: "z" }), ["u.params.c"]);
  assert.deepEqual(codes({ a: 1, zz: 2 }), ["u.params.zz"]);
});

test("expandScript: the Doopi intro becomes a scene with its titles, tracks, markers and audio; markers become times", () => {
  const { script, issues, expansions } = expandScript(SAMPLE, catalog);
  assert.deepEqual(issues, []);
  assert.deepEqual(expansions, [{ id: "intro", template: "doopi_intro", scenes: ["intro"] }]);
  assert.deepEqual(script.scenes.map((s) => s.id), ["intro", "test"]);
  assert.equal(script.scenes[0].location, "square");
  assert.ok(script.text.some((t) => t.text === "Episode 25: The Sound Test"));
  assert.ok(script.layers.some((l) => l.id === "intro_titles") && script.shapes.some((s) => s.id === "intro_band"));
  assert.ok(script.audio.tracks.some((t) => t.id === "intro_lift") && script.audio.markers.some((m) => m.id === "intro_drop"));
  assert.equal(script.scenes[0].beats.find((b) => b.id === "intro_jump").at, 3);
  assert.equal(script.scenes[1].beats.find((b) => b.id === "nod2").at, 2.4);
  assert.equal(SAMPLE.scenes[0].use.template, "doopi_intro", "the input is not changed");
  assert.equal(expandScript({ version: 2, scenes: [] }, catalog).script.version, 2);
});

test("expandScript errors: unknown template, bad params, unknown or foreign markers", () => {
  const codes = (patch) => expandScript({ ...SAMPLE, ...patch }, catalog).issues.map((i) => `${i.code} ${i.path}`);
  assert.deepEqual(codes({ scenes: [{ id: "x", use: { template: "nope" } }, SAMPLE.scenes[1]] }), ["E_TEMPLATE_UNKNOWN scenes[0].use.template"]);
  assert.deepEqual(codes({ scenes: [{ id: "x", use: { template: "doopi_intro", params: { title: "T" } } }, SAMPLE.scenes[1]] }), ["E_TEMPLATE_PARAM scenes[0].use.params"]);
  const foreign = { ...SAMPLE.audio, markers: [{ id: "drum", scene: "intro", t: 1 }, ...SAMPLE.audio.markers.filter((m) => m.id !== "drum")] };
  assert.ok(codes({ audio: foreign }).includes("E_MARKER_UNKNOWN scenes[1].beats[1].at.marker"));
  assert.ok(codes({ audio: { ...SAMPLE.audio, markers: [] } }).some((c) => c.startsWith("E_MARKER_UNKNOWN")));
});

const sim = simulate(SAMPLE, catalog);
const plan = collectAudioTracks(sim);
const test0 = sim.scenes.find((s) => s.id === "test").startFrame / 60;

test("the audio track plan: tracks in scene time, sfx hits at markers, a bus, duck spans", () => {
  assert.deepEqual(plan.tracks.map((t) => [t.id, t.kind]), [["beat", "music"], ["birds", "ambience"]]);
  const beat = plan.tracks[0];
  near(beat.t0, test0, 0.02);
  near(beat.t1, test0 + 14.6, 0.05);
  const hits = plan.sfx.filter((e) => e.track === "hits").map((e) => e.t - test0);
  assert.equal(hits.length, 3);
  near(hits[1] - hits[0], 0.4, 0.02);
  near(hits[0], 2, 0.05);
  assert.ok(plan.sfx.some((e) => e.track === "intro_shimmer"), "the template's sfx at its own marker");
  assert.equal(plan.buses.voice.length, 1);
  assert.equal(plan.buses.music.length, 1, "the intro's music lift");
  assert.ok(plan.duck[0].spans.length > 0 && plan.duck[1].spans.length === 1);
  const bare = { ...SAMPLE, audio: { musicVolume: 0.3 }, scenes: [{ ...SAMPLE.scenes[1], beats: SAMPLE.scenes[1].beats.map((b) => (b.at?.marker ? { ...b, at: 2 } : b)) }] };
  assert.equal(collectAudioTracks(simulate(bare, catalog)), null, "no tracks, no plan");
});

test("gains: bus keys, ducking ramps to its depth, track fades, pan keys", () => {
  near(busGainAt(plan, "voice", test0 + 1), 1.2);
  assert.equal(busGainAt(plan, "voice", 0.1), 1, "outside the bus span");
  assert.equal(busGainAt(plan, "sfx", test0 + 1), 1);
  const say = plan.duck[0].spans[0];
  near(duckGainAt(plan, "music", (say[0] + say[1]) / 2), 10 ** (-12 / 20));
  assert.equal(duckGainAt(plan, "music", say[0] - 1), 1);
  const birds = plan.tracks[1];
  assert.equal(trackGainAt(birds, birds.t0 - 1), 0);
  near(trackGainAt(birds, birds.t0 + 3), 0.9);
  near(trackPanAt(birds, birds.t0), -0.8);
  assert.ok(trackPanAt(birds, birds.t0 + 12) > 0.79);
});

test("the tools mix: a track panned hard left is silent on the right; bus gains scale events; stem gains combine", () => {
  const seconds = 3;
  const stems = { music: new Float32Array(seconds * 48000 * 2), ambience: new Float32Array(seconds * 48000 * 2) };
  const one = { tracks: [{ id: "x", kind: "ambience", bed: "park_birds", t0: 0, t1: 3, fadeIn: 0, fadeOut: 0, volume: [{ t: 0, v: 1 }], pan: [{ t: 0, v: -1 }], seed: "s" }], buses: { music: [], ambience: [], sfx: [{ t0: 0, t1: 3, keys: [{ t: 0, v: 0.5 }] }], voice: [] }, duck: [] };
  addTrackStems(stems, one, { seed: 1, catalog });
  let l = 0;
  let r = 0;
  for (let i = 0; i < stems.ambience.length; i += 2) { l += Math.abs(stems.ambience[i]); r += Math.abs(stems.ambience[i + 1]); }
  assert.ok(l > 1 && r < l * 1e-6, `left ${l.toFixed(2)} right ${r.toFixed(6)}`);
  const ev = applyEventBuses([{ t: 1, sfx: "pop", volume: 0.8 }, { t: 1, sfx: "voice:soft:a:0", volume: 1 }], one);
  assert.deepEqual(ev.map((e) => e.volume), [0.4, 1]);
  assert.deepEqual(stemGains(null), {});
  assert.equal(stemGains(one).musicGain(1), 1);
});

test("the validator: templates, markers and audio tracks", () => {
  assert.deepEqual(validate(SAMPLE, catalog).errors, []);
  const codes = (patch) => validate({ ...SAMPLE, ...patch }, catalog).errors.map((e) => e.code);
  const tracks = (t) => ({ audio: { ...SAMPLE.audio, tracks: [...SAMPLE.audio.tracks, t] } });
  assert.deepEqual(codes(tracks({ id: "m2", kind: "music", mood: "disco" })), ["E_AUDIO_TRACK"]);
  assert.deepEqual(codes(tracks({ id: "s2", kind: "sfx", sfx: "pop" })), ["E_AUDIO_TRACK"]);
  assert.deepEqual(codes(tracks({ id: "s3", kind: "sfx", sfx: "pop", at: [{ marker: "nope" }] })), ["E_MARKER_UNKNOWN"]);
  assert.deepEqual(codes(tracks({ id: "b2", kind: "bus" })), ["E_AUDIO_TRACK"]);
  assert.deepEqual(codes(tracks({ id: "a2", kind: "ambience", bed: "x", scene: "zz" })), ["E_REF_SCENE", "E_AUDIO_TRACK"]);
  assert.deepEqual(codes({ audio: { ...SAMPLE.audio, duck: [{ duck: "music", under: "ghost" }] } }), ["E_AUDIO_TRACK"]);
  assert.ok(validate({ ...SAMPLE, version: 2 }, catalog).errors.length > 0, "v2 has no templates or tracks");
  const engine = createEngine({ catalog });
  assert.ok(engine.load(SAMPLE).ok);
  assert.ok(engine.getAudioTracks().tracks.length === 2 && engine.getAudioEvents().some((e) => e.sfx === "crystal_chime"));
});
