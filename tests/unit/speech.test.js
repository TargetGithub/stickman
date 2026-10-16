// Speech (S2): syllable timing shared by the mouth flap and the babble sounds, reading time,
// the voice synthesizer, and the audio events for story scripts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { syllables, mouthOpenAt, readingTime, voiceOf } from "../../engine/story/speech.js";
import { synthVoice, isVoiceKey } from "../../tools/lib/speech.mjs";
import { synthesize } from "../../tools/lib/synth.mjs";
import { createEngine } from "../../engine/index.js";
import { catalog } from "../../data/index.js";

const say = (text, o = {}) => ({ text, dur: readingTime(text), actor: "kai", at: 1.5, ...o });

test("reading time: 1.2 s + 0.06 s per character, at least 1.5 s", () => {
  assert.equal(readingTime("Hi"), 1.5);
  assert.ok(Math.abs(readingTime("x".repeat(40)) - 3.6) < 1e-9);
});

const CASES = [
  ["one syllable per vowel group", "Hello there friend", {}, (s) => s.length === 5],
  ["thoughts are silent", "Hmm, maybe...", { bubble: "think" }, (s) => s.length === 0],
  ["whispers are quieter", "psst over here", { bubble: "whisper" }, (s) => s.every((x) => x.gain < 0.5)],
  ["a question rises at the end", "Who is that over there?", {}, (s) => s[s.length - 1].semi >= s[0].semi],
  ["syllables fit inside the bubble time", "A very long line that keeps on going", { dur: 0.6 }, (s) => s.every((x) => x.t + x.dur <= 0.6)],
  ["text without vowels still makes a sound", "Hm!", {}, (s) => s.length === 1],
];
for (const [name, text, o, ok] of CASES) test(`syllables: ${name}`, () => assert.ok(ok(syllables(say(text, o), null, 3)), JSON.stringify(syllables(say(text, o), null, 3))));

test("syllables are deterministic and change with the seed", () => {
  const a = syllables(say("Give Pip back!"), { pitch: 1.4 }, 7);
  assert.deepEqual(a, syllables(say("Give Pip back!"), { pitch: 1.4 }, 7));
  assert.notDeepEqual(a, syllables(say("Give Pip back!"), { pitch: 1.4 }, 8));
});

test("the mouth is open exactly while a syllable sounds", () => {
  const s = syllables(say("Banana"), null, 1);
  assert.ok(mouthOpenAt(s, s[0].t + 0.01));
  assert.ok(!mouthOpenAt(s, s[0].t + s[0].dur + 0.001) || s.length > 1);
  assert.ok(!mouthOpenAt(s, 99));
});

test("voice defaults", () => assert.deepEqual(voiceOf(undefined), { pitch: 1, speed: 1, timbre: "soft" }));

for (const timbre of ["soft", "squeaky", "deep", "robot"]) {
  test(`synthVoice: ${timbre} is deterministic, short and below full scale`, () => {
    const key = `voice:${timbre}:a:3`;
    assert.ok(isVoiceKey(key));
    const a = synthVoice(key);
    assert.deepEqual(a, synthVoice(key));
    assert.ok(a.length > 1000 && a.length < 48000 * 0.2);
    assert.ok(Math.max(...a.map(Math.abs)) <= 0.81);
  });
}

test("vowels and pitches sound different", () => {
  const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
  assert.notDeepEqual(synthVoice("voice:soft:a:0"), synthVoice("voice:soft:i:0"));
  assert.notDeepEqual(synthVoice("voice:soft:a:0"), synthVoice("voice:soft:a:5"));
  assert.ok(rms(synthVoice("voice:deep:o:-3")) > 0.1);
});

test("narrate_chime has a recipe", () => assert.ok(synthesize("narrate_chime").length > 0));

const v2 = {
  version: 2,
  meta: { title: "talk", format: "landscape", seed: 4, kind: "clip" },
  cast: [{ id: "kai", color: "#3fd8ff", voice: { pitch: 1.2, timbre: "squeaky" } }],
  scenes: [{ id: "s", location: "city_park", cast: [{ id: "kai", x: 1200, facing: 1 }],
    beats: [{ at: 0.2, who: "world", do: "narrate", params: { text: "Once upon a time." } }, { at: 0.5, who: "kai", do: "talk", say: "Hello everyone!" }] }],
};

test("story audio events: one voice event per syllable plus the narration chime; voices can be turned off", () => {
  const e = createEngine({ catalog });
  assert.ok(e.load(structuredClone(v2)).ok);
  const ev = e.getAudioEvents();
  assert.equal(ev.filter((x) => x.sfx === "narrate_chime").length, 1);
  const voice = ev.filter((x) => x.sfx.startsWith("voice:squeaky:"));
  const say = e.getEvents().find((x) => x.type === "say");
  assert.equal(voice.length, syllables({ ...say, at: say.videoT }, v2.cast[0].voice, 4).length);
  assert.ok(voice.length >= 4, `${voice.length} syllables for "Hello everyone!"`);
  assert.ok(voice.every((x) => x.sfx.split(":")[3] !== undefined));
  const quiet = structuredClone(v2);
  quiet.audio = { voices: false };
  assert.ok(e.load(quiet).ok);
  assert.equal(e.getAudioEvents().filter((x) => x.sfx.startsWith("voice:")).length, 0);
});
