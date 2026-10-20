// Spoken dialogue (SPEECH_SPEC 7): lines, voices, cache keys, duration injection and the babble swap,
// with a fake backend (no Piper needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createEngine, compileScript, validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";
import { readingTime } from "../../engine/story/speech.js";
import { cleanText, resolveVoice, collectLines, injectDurations, moodTone, SAY_TAIL } from "../../tools/lib/tts/lines.mjs";
import { cacheKey, synthesizeLines, speechClips, trimSilence, clipLoudness, levelClip, renderSettings } from "../../tools/lib/tts/synth.mjs";
import { prepareSpeech, loadVoiceTable } from "../../tools/lib/tts/index.mjs";
import { postFilters } from "../../tools/lib/tts/piper.mjs";
import { swapSpeech, SR } from "../../tools/lib/mixer.mjs";
import { fakeBackend, speechStory } from "../helpers/fake_tts.mjs";
import { readWav } from "../../tools/lib/wav.mjs";

const readWavSamples = (f) => readWav(f).samples;

const table = loadVoiceTable();
const tmp = () => mkdtempSync(join(tmpdir(), "stickman-tts-"));

test("cleanText: pauses, stage directions, shouted capitals, nothing speakable", () => {
  for (const [input, want] of [
    ["Five more minutes...", "Five more minutes."],
    ["Wait... what?", "Wait, what?"],
    ["*yawn* Good morning!", "Good morning!"],
    ["(sighs) Okay", "Okay."],
    ["Whoa-whoa-WHOA!", "Whoa-whoa-Whoa!"],
    ["OK, go!", "OK, go!"],
    ["!!!", null],
    ["...", null],
    ["Hmm…", "Hmm."],
  ]) assert.equal(cleanText(input), want, input);
});

test("resolveVoice: timbre table, cast tts, override file, babble-only voices", () => {
  const soft = resolveVoice({ pitch: 1.35, speed: 1, timbre: "soft" }, table);
  assert.equal(soft.model, table.timbres.soft.model);
  assert.ok(soft.pitch > 0 && soft.pitch <= table.timbres.soft.pitchMax);
  assert.equal(soft.rate, 1);
  const deep = resolveVoice({ pitch: 0.7, speed: 0.9, timbre: "deep" }, table);
  assert.ok(deep.pitch < 0);
  assert.equal(deep.rate, 0.9);
  const squeaky = resolveVoice({ pitch: 1.9, speed: 1.3, timbre: "squeaky" }, table);
  assert.equal(squeaky.rate, 1.43); // speed × rateScale 1.1
  assert.equal(resolveVoice({ timbre: "robot" }, table).filter, "robot");
  assert.equal(resolveVoice({ timbre: "bark" }, table), null);
  assert.equal(resolveVoice({ timbre: "soft", tts: { off: true } }, table), null);
  const cast = resolveVoice({ timbre: "soft", tts: { model: "m1", speaker: 3, rate: 1.2, pitch: 2 } }, table);
  assert.deepEqual(cast, { model: "m1", speaker: 3, rate: 1.2, pitch: 2, filter: null });
  const over = resolveVoice({ timbre: "soft", tts: { model: "m1", pitch: 2 } }, table, { model: "m2", pitch: -1 });
  assert.equal(over.model, "m2");
  assert.equal(over.pitch, -1);
  assert.equal(resolveVoice({ timbre: "soft" }, table, { off: true }), null);
});

test("collectLines: macro lines, authored lines, narration; no thoughts, barks or tts.off", () => {
  const compiled = compileScript(speechStory(), catalog).script;
  const lines = collectLines(compiled, table);
  assert.deepEqual(lines.map((l) => [l.kind, l.who, l.spoken]), [
    ["narrate", "narrator", "One sunny morning in the park."],
    ["say", "kai", "Hello there, my friend!"],
    ["say", "mo", "Hello! How are you today?"],
    ["say", "kai", "See you later!"],
  ]);
  assert.equal(lines[2].voice.model, "custom-voice");
  assert.equal(lines[3].bubble, "shout");
  // Every line has an id the sim reports back (macro beats get one if they had none).
  for (const l of lines) assert.equal(compiled.scenes[l.scene].beats[l.beat].id, l.id);
});

test("cache keys are stable and change with every setting", () => {
  const b = fakeBackend();
  const line = { spoken: "Hello there.", bubble: "speech", voice: { model: "m", speaker: 0, rate: 1, pitch: 0, filter: null } };
  const k = cacheKey(b, line);
  assert.match(k, /^[0-9a-f]{64}$/);
  assert.equal(cacheKey(b, structuredClone(line)), k);
  assert.equal(cacheKey(b, { bubble: "speech", spoken: "Hello there.", voice: { filter: null, pitch: 0, rate: 1, speaker: 0, model: "m" } }), k, "property order does not matter");
  const variants = [
    { ...line, spoken: "Hello there!" },
    { ...line, bubble: "shout" },
    { ...line, voice: { ...line.voice, model: "n" } },
    { ...line, voice: { ...line.voice, speaker: 1 } },
    { ...line, voice: { ...line.voice, rate: 1.1 } },
    { ...line, voice: { ...line.voice, pitch: 2 } },
    { ...line, voice: { ...line.voice, filter: "robot" } },
  ];
  const keys = new Set([k, ...variants.map((v) => cacheKey(b, v))]);
  assert.equal(keys.size, variants.length + 1);
  assert.notEqual(cacheKey(fakeBackend({ version: "2" }), line), k, "backend version");
});

test("synthesizeLines renders each line once, then reuses the cache", () => {
  const dir = tmp();
  try {
    const compiled = compileScript(speechStory(), catalog).script;
    const lines = collectLines(compiled, table);
    const b = fakeBackend();
    const first = synthesizeLines(lines, b, { cacheDir: dir });
    assert.equal(b.calls.length, lines.length);
    assert.ok(first.every((l) => !l.cached && l.dur > 0));
    // 0.06 s per character, plus up to 60 ms of kept edges.
    for (const l of first) assert.ok(Math.abs(l.dur - 0.06 * l.spoken.length) < 0.07, `${l.spoken}: ${l.dur}`);
    const again = synthesizeLines(lines, b, { cacheDir: dir });
    assert.equal(b.calls.length, lines.length, "no new renders");
    assert.ok(again.every((l) => l.cached));
    assert.deepEqual(again.map((l) => l.dur), first.map((l) => l.dur));
    assert.equal(readdirSync(dir).filter((f) => f.endsWith(".wav")).length, lines.length, "no temporary files left");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("clips are trimmed and levelled; shout louder than speech", () => {
  const x = new Float32Array(SR);
  for (let i = SR / 4; i < SR / 2; i++) x[i] = 0.1 * Math.sin((2 * Math.PI * 300 * i) / SR);
  const t = trimSilence(x);
  assert.ok(Math.abs(t.length - (SR / 4 + 2 * Math.round(0.03 * SR))) <= 2);
  levelClip(t, -16);
  assert.ok(Math.abs(clipLoudness(t) + 16) < 0.5);
  assert.equal(trimSilence(new Float32Array(100)).length, 0);
});

test("injectDurations: sayDur from the audio, clamped; talk loops and narration stretch; no W_DIALOGUE_FAST", () => {
  const compiled = compileScript(speechStory(), catalog).script;
  const lines = collectLines(compiled, table);
  const durs = [6, 0.4, 3, 20]; // narration, a short line, a long line, a too-long line
  const report = injectDurations(compiled, lines.map((l, i) => ({ ...l, dur: durs[i] })));
  const beat = (l) => compiled.scenes[l.scene].beats[l.beat];
  assert.equal(beat(lines[0]).params.dur, 6.7);
  assert.equal(beat(lines[1]).sayDur, Math.round(readingTime(lines[1].text) * 100) / 100, "never shorter than the reading time");
  assert.equal(beat(lines[2]).sayDur, Math.max(3 + SAY_TAIL, Math.round(readingTime(lines[2].text) * 100) / 100));
  assert.ok(beat(lines[2]).params.cycles * 0.8 >= beat(lines[2]).sayDur, "the talk gesture lasts the whole line");
  assert.equal(beat(lines[3]).sayDur, 10);
  assert.deepEqual(report.map((r) => r.long), [false, false, false, true]);
  const v = validate(compiled, catalog);
  assert.ok(v.ok, JSON.stringify(v.errors));
  assert.ok(!v.warnings.some((w) => w.code === "W_DIALOGUE_FAST"));
});

test("prepareSpeech: spoken lines push later beats back, and the original script is untouched", () => {
  const dir = tmp();
  try {
    const story = speechStory();
    const before = JSON.stringify(story);
    const plain = createEngine({ catalog });
    assert.ok(plain.load(story).ok);
    const { script, lines } = prepareSpeech(story, { catalog, backend: fakeBackend(), table, cacheDir: dir });
    assert.equal(JSON.stringify(story), before);
    const e = createEngine({ catalog });
    assert.ok(e.load(script).ok);
    const says = e.getEvents().filter((x) => x.type === "say");
    const mo = says.find((x) => x.actor === "mo");
    const moLine = lines.find((l) => l.who === "mo");
    assert.ok(mo.dur >= moLine.dur + SAY_TAIL - 1e-9);
    // Speakers do not talk over each other: each spoken line starts after the previous one ends.
    const spoken = says.filter((x) => lines.some((l) => l.id === x.beatId)).sort((a, b) => a.videoT - b.videoT);
    for (let i = 1; i < spoken.length; i++) assert.ok(spoken[i].videoT >= spoken[i - 1].videoT + lines.find((l) => l.id === spoken[i - 1].beatId).dur - 1e-6);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("swapSpeech replaces babble with one clip only for spoken lines, and softens their chimes", () => {
  const events = [
    { t: 1, sfx: "narrate_chime", volume: 0.45, pan: 0, line: "n1" },
    { t: 3, sfx: "voice:soft:a:0", volume: 0.3, pan: -0.4, line: "a" },
    { t: 3.13, sfx: "voice:soft:e:1", volume: 0.3, pan: -0.4, line: "a" },
    { t: 4, sfx: "voice:bark:o:2", volume: 0.3, pan: 0.2, line: "woof" },
    { t: 4.2, sfx: "footstep_soft", volume: 0.4, pan: 0 },
  ];
  const clips = new Map([["n1", { t: 1.3, sfx: "tts:n", volume: 1 }], ["a", { t: 3, sfx: "tts:a", volume: 1 }]]);
  const out = swapSpeech(events, clips);
  assert.deepEqual(out.map((e) => [e.t, e.sfx]), [[1, "narrate_chime"], [1.3, "tts:n"], [3, "tts:a"], [4, "voice:bark:o:2"], [4.2, "footstep_soft"]]);
  assert.equal(out[0].volume, 0.225);
  assert.equal(out[2].pan, -0.4, "the clip sits where the speaker stands");
  assert.deepEqual(swapSpeech(events, new Map()), events, "no clips: babble unchanged");
});

test("speechClips times each clip from the sim's say and narrate events", () => {
  const clips = speechClips([{ id: "a", key: "k1" }, { id: "n", key: "k2" }, { id: "gone", key: "k3" }],
    [{ type: "say", beatId: "a", videoT: 2 }, { type: "world", do: "narrate", beatId: "n", videoT: 5 }]);
  assert.deepEqual([...clips], [["a", { t: 2, sfx: "tts:k1", volume: 1 }], ["n", { t: 5.3, sfx: "tts:k2", volume: 1 }]]);
});

test("babble events name their line; tts mode off leaves audio events as they were", () => {
  const e = createEngine({ catalog });
  assert.ok(e.load(speechStory()).ok);
  const voice = e.getAudioEvents().filter((x) => x.sfx.startsWith("voice:"));
  assert.ok(voice.length > 0 && voice.every((x) => typeof x.line === "string"));
});

test("postFilters: pitch keeps length, whisper filters, robot rings", () => {
  assert.equal(postFilters(22050, { pitch: 0 }, "speech"), "aresample=48000");
  const up = postFilters(22050, { pitch: 12 }, "speech");
  assert.match(up, /asetrate=44100,aresample=22050,atempo=0\.500000/);
  assert.match(postFilters(22050, { pitch: 0 }, "whisper"), /highpass/);
  assert.match(postFilters(22050, { pitch: -3, filter: "robot" }, "speech"), /aeval/);
});

test("a line the dialogue macro splits into bubbles is spoken once, spread over its bubbles", () => {
  const story = speechStory();
  story.scenes[0].beats[1].params.lines[0][1] = "Hello there, my good friend, the festival starts as soon as the sun is up";
  const compiled = compileScript(story, catalog).script;
  const lines = collectLines(compiled, table);
  const kai = lines.find((l) => l.who === "kai");
  assert.ok(kai.parts?.length >= 2, "split into bubbles by the macro");
  assert.equal(kai.spoken, "Hello there, my good friend, the festival starts as soon as the sun is up.");
  assert.equal(lines.filter((l) => l.who === "kai" && l.kind === "say").length, 2, "one spoken line plus 'See you later!'");
  injectDurations(compiled, lines.map((l) => ({ ...l, dur: l.id === kai.id ? 8 : 1 })));
  const durs = kai.parts.map((p) => compiled.scenes[0].beats[p.beat].sayDur);
  assert.ok(durs.reduce((a, b) => a + b, 0) >= 8 + SAY_TAIL - 0.02, `bubbles cover the audio: ${durs}`);
  const clips = speechClips([{ ...kai, key: "k" }], kai.parts.map((p, i) => ({ type: "say", beatId: p.id, videoT: i * 4 })));
  assert.equal(clips.get(kai.parts[0].id).sfx, "tts:k");
  assert.equal(clips.get(kai.parts[1].id).sfx, null);
  const out = swapSpeech([{ t: 0, sfx: "voice:soft:a:0", volume: 1, pan: 0, line: kai.parts[0].id }, { t: 4, sfx: "voice:soft:a:0", volume: 1, pan: 0, line: kai.parts[1].id }], clips);
  assert.deepEqual(out.map((e) => e.sfx), ["tts:k"], "the second bubble's babble is gone and adds no clip");
});

test("moodTone: a tone per face; neutral, unknown faces and moods off give none", () => {
  for (const [face, enabled, want] of [["sad", true, "sad"], ["cry", true, "cry"], ["neutral", true, null], [undefined, true, null], ["no_such_face", true, null], ["sad", false, null]]) {
    assert.equal(moodTone(face, table, enabled)?.mood ?? null, want, `${face} ${enabled}`);
  }
  const sad = moodTone("sad", table);
  assert.ok(sad.rate < 1 && sad.pitch < 0 && sad.gainDb < 0 && sad.pause > 0, "sad is slower, lower, quieter, with pauses");
  assert.ok(!("description" in sad) && !("tags" in sad));
  const excited = moodTone("surprised", table);
  assert.ok(excited.rate > 1 && excited.pitch > 0 && excited.gainDb > 0);
  for (const face of Object.keys(table.moods)) assert.ok(catalog.faces[face], `mood "${face}" is a face`);
});

test("collectLines: each line takes the speaker's face at that beat (own, carried over, scene start)", () => {
  const story = speechStory();
  const sc = story.scenes[0];
  sc.cast[1].face = "angry"; // mo starts the scene angry
  sc.beats[1].params.lines[0][2] = "sad"; // kai's first dialogue line is sad
  sc.beats.find((b) => b.id === "bye").face = "happy";
  const lines = collectLines(compileScript(story, catalog).script, table);
  const mood = (who, i = 0) => lines.filter((l) => l.who === who)[i].tone?.mood ?? null;
  assert.equal(lines[0].tone, null, "narration is neutral");
  assert.equal(mood("kai"), "sad");
  assert.equal(mood("mo"), "angry", "the scene's starting face");
  assert.equal(mood("kai", 1), "happy");
  // Without its own face, a later line keeps the face the speaker last had.
  delete sc.beats.find((b) => b.id === "bye").face;
  const again = collectLines(compileScript(story, catalog).script, table);
  assert.equal(again.filter((l) => l.who === "kai")[1].tone?.mood, "sad");
  const off = collectLines(compileScript(story, catalog).script, table, { moods: false });
  assert.ok(off.every((l) => l.tone === null), '"moods": false in the --voices file');
});

test("tones: in the cache key, and they change rate, pitch, pauses and loudness", () => {
  const b = fakeBackend();
  const line = { spoken: "Oh no. It is gone.", bubble: "speech", voice: { model: "m", speaker: 0, rate: 1, pitch: 2, filter: null } };
  const sadLine = { ...line, tone: moodTone("sad", table) };
  assert.equal(cacheKey(b, { ...line, tone: null }), cacheKey(b, line), "neutral lines keep their old cache files");
  assert.notEqual(cacheKey(b, sadLine), cacheKey(b, line));
  assert.notEqual(cacheKey(b, sadLine), cacheKey(b, { ...line, tone: moodTone("cry", table) }));
  const r = renderSettings(sadLine);
  assert.equal(r.rate, 0.78);
  assert.equal(r.pitch, 0, "voice +2, sad -2");
  assert.equal(r.pause, 0.45);
  assert.equal(renderSettings({ ...line, voice: { ...line.voice, pitch: 11 }, tone: moodTone("surprised", table) }).pitch, 12, "clamped");
  assert.equal(renderSettings({ ...line, bubble: "shout" }).rate, 1.08);
  const dir = tmp();
  try {
    const [plain, sad, happy] = synthesizeLines([{ ...line, id: "a" }, { ...sadLine, id: "b" }, { ...line, id: "c", tone: moodTone("happy", table) }], b, { cacheDir: dir });
    assert.ok(sad.dur > plain.dur + 0.45, `sad is slower with a pause: ${sad.dur} vs ${plain.dur}`);
    assert.ok(happy.dur < plain.dur);
    assert.ok(Math.abs(clipLoudness(readWavSamples(sad.file)) - (-16 - 3)) < 0.6, "sad is 3 dB quieter");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("postFilters adds the mood colour", () => {
  assert.match(postFilters(22050, { pitch: 0 }, "speech", moodTone("cry", table)), /vibrato=f=6:d=0\.25,tremolo=f=5:d=0\.3/);
  assert.match(postFilters(22050, { pitch: 0 }, "speech", moodTone("sad", table)), /lowpass=f=5000/);
  assert.equal(postFilters(22050, { pitch: 0 }, "speech", null), "aresample=48000");
});
