// Lip-sync tracks (runtime/lipsync.js) and say.who in scripts (no canvas, no TTS).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { MOUTH_HZ, mouthFromEnvelope, mouthFromText, sampleMouth, syllableCount } from "../../runtime/lipsync.js";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";
import { envelope, LIP_HZ } from "../../../tools/lib/tts/lipsync.mjs";

const catalog = loadCatalog3d();

/** A fake voice clip: syllable-like bursts (4 per second) of a 180 Hz tone with silent gaps between words. */
function fakeClip(words = [3, 2, 4], sr = 48000) {
  const out = [];
  for (const syl of words) {
    for (let s = 0; s < syl; s++) {
      for (let i = 0; i < sr * 0.18; i++) out.push(0.5 * Math.sin((2 * Math.PI * 180 * i) / sr) * Math.sin((Math.PI * i) / (sr * 0.18)));
      for (let i = 0; i < sr * 0.07; i++) out.push(0);
    }
    for (let i = 0; i < sr * 0.3; i++) out.push(0); // a pause between words
  }
  return Float32Array.from(out);
}

/** Shortest time between a local maximum and the next local minimum (how fast the mouth flaps). */
function fastestSwing(track) {
  let last = null;
  let best = Infinity;
  for (let i = 1; i < track.length - 1; i++) {
    const max = track[i] > track[i - 1] && track[i] >= track[i + 1];
    const min = track[i] < track[i - 1] && track[i] <= track[i + 1];
    if (max) last = i;
    if (min && last != null) {
      best = Math.min(best, (i - last) / MOUTH_HZ);
      last = null;
    }
  }
  return best;
}

test("syllable counts", () => {
  for (const [w, n] of [["cat", 1], ["apple", 2], ["Robo", 2], ["banana!", 3], ["the", 1], ["make", 1], ["hello,", 2], ["123", 4], ["5", 1], ["--", 0]]) assert.equal(syllableCount(w), n, w);
});

const TEXTS = ["Hi!", "Hello, friends! Welcome to our classroom.", "Quack! I love the big green chalkboard.", "One, two, three, four, five."];
for (const text of TEXTS) {
  test(`text fallback: "${text}"`, () => {
    const dur = 0.3 + 0.075 * text.length;
    const track = mouthFromText(text, dur);
    assert.equal(track.length, Math.round(dur * MOUTH_HZ));
    assert.ok(track.every((v) => v >= 0 && v <= 1));
    assert.ok(Math.max(...track) > 0.5, "opens");
    assert.equal(track[0], 0, "starts shut");
    assert.equal(track.at(-1), 0, "ends shut");
    // Shut between words: at least a few samples at zero after the first syllable.
    assert.ok(track.filter((v) => v === 0).length >= 3);
    assert.ok(fastestSwing(track) >= 1 / 24, "no flapping faster than about 12 Hz");
    assert.deepEqual(mouthFromText(text, dur), track, "the same every time");
  });
}

test("envelope track: opens on the voice, shuts in pauses, never flaps faster than ~12 Hz", () => {
  const clip = fakeClip();
  const env = envelope(clip, 48000, LIP_HZ);
  const track = mouthFromEnvelope(env, LIP_HZ);
  assert.ok(Math.abs(track.length - env.length / 2) <= 1);
  assert.ok(Math.max(...track) > 0.9);
  // The 0.3 s word pauses: the middle of each is shut.
  const pauseMid = (k) => Math.round(((k * 0.25 + 0.15) * MOUTH_HZ));
  let t = 0;
  for (const syl of [3, 2]) {
    t += syl * 0.25;
    assert.ok(track[Math.round((t + 0.15) * MOUTH_HZ)] <= 0.06, `shut in the pause at ${(t + 0.15).toFixed(2)} s`);
    t += 0.3;
  }
  assert.ok(pauseMid(0) >= 0);
  assert.ok(fastestSwing(track) >= 1 / 24, `fastest swing ${fastestSwing(track)} s`);
  assert.deepEqual(mouthFromEnvelope(envelope(fakeClip(), 48000, LIP_HZ), LIP_HZ), track, "deterministic");
});

test("silence keeps the mouth shut", () => {
  assert.ok(mouthFromEnvelope(new Array(200).fill(0)).every((v) => v === 0));
  assert.deepEqual(mouthFromEnvelope([]), []);
});

test("sampleMouth interpolates and is 0 outside the track", () => {
  const tr = [0, 1, 0.5];
  assert.equal(sampleMouth(tr, -0.1), 0);
  assert.equal(sampleMouth(tr, 0.5 / MOUTH_HZ), 0.5);
  assert.equal(sampleMouth(tr, 1.5 / MOUTH_HZ), 0.75);
  assert.equal(sampleMouth(tr, 10), 0);
});

const base = (lines) => ({
  kind: "video3d", version: 1,
  objects: [
    { id: "duck", kind: "critter", species: "duck" },
    { id: "robo", kind: "character", character: "robot", at: [2, 0, 0] },
    { id: "sun", kind: "shape", shape: "circle", face: true, at: [-2, 1, 0] },
    { id: "box", kind: "shape", shape: "cube", at: [0, 0, 2] },
  ],
  scenes: [{ id: "s", beats: lines.map((a) => ({ dur: 1, do: [{ do: "say", text: "Hello there, friend.", ...a }] })) }],
});

test("say who: critters, characters and face shapes talk; the talk prop is 0 outside their lines", () => {
  const s = base([{ who: "duck", id: "a" }, { who: "robo", id: "b" }, { who: "sun", id: "c" }, { id: "d" }]);
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const tl = plan.timeline;
  const line = (id) => plan.lines.find((l) => l.id === id);
  for (const [id, who] of [["a", "duck"], ["b", "robo"], ["c", "sun"]]) {
    const l = line(id);
    assert.equal(l.who, who);
    let open = 0;
    for (let t = l.t; t < l.t + l.dur; t += 0.02) open = Math.max(open, tl.valueAt(who, "talk", t));
    assert.ok(open > 0.5, `${who} opens its mouth`);
    assert.equal(tl.valueAt(who, "talk", l.t + l.dur + 0.01), 0, `${who} shuts after the line`);
    assert.equal(tl.valueAt(who, "talk", l.t - 0.01), 0);
  }
  assert.equal(line("d").who, undefined);
  assert.ok(plan.objects.find((o) => o.id === "duck").talks);
  assert.ok(!plan.objects.find((o) => o.id === "box").talks);
});

test("a measured clip's envelope drives the mouth instead of the text", () => {
  const s = base([{ who: "duck", id: "a" }]);
  const env = envelope(fakeClip([2]), 48000, LIP_HZ);
  const plan = compileScript(s, { catalog, speech: { a: { dur: env.length / LIP_HZ, env, hz: LIP_HZ } } });
  const track = mouthFromEnvelope(env, LIP_HZ);
  const l = plan.lines[0];
  for (const u of [0.05, 0.13, 0.3, 0.41]) assert.equal(plan.timeline.valueAt("duck", "talk", l.t + u), sampleMouth(track, u));
});

test("lines without who leave every face alone", () => {
  const plan = compileScript(base([{ id: "a" }, { id: "b" }]), { catalog });
  for (const id of ["duck", "robo", "sun"]) assert.equal(plan.timeline.valueAt(id, "talk", 0.5), undefined);
});

for (const [who, code] of [["nobody", "E3D_WHO"], ["box", "E3D_WHO"]]) {
  test(`say who "${who}" fails with ${code}`, () => {
    const codes = validateScript(base([{ who }]), catalog).errors.map((e) => e.code);
    assert.ok(codes.includes(code), codes.join(", "));
  });
}
