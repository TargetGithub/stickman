// Baby rhymes engine pieces: tunes (runtime/tune.js), sung-line validation, the HUD layer's validation, note
// placement on a clip (tools/lib/tune3d.mjs) and the formant-keeping pitch tools (tools/lib/tts/psola.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";
import { countSyllables, parseTune } from "../../runtime/tune.js";
import { placeNotes } from "../../tools/lib/tune3d.mjs";
import { medianPitch, psola, syllables, trackPitch } from "../../../tools/lib/tts/psola.mjs";

const catalog = loadCatalog3d();
const script = (objects, actions, extra = {}) => ({ kind: "video3d", version: 1, meta: { title: "t", seed: 1 }, objects, scenes: [{ id: "s", beats: [{ dur: 1, do: actions }] }], ...extra });
const codes = (r) => [...r.errors, ...r.warnings].map((e) => e.code);

test("parseTune: note names to MIDI, bar lines ignored, bad tokens reported", () => {
  for (const [tune, notes, bad] of [
    ["C4 D4 E4", [60, 62, 64], []],
    ["G4 G4 | F#4 Bb3", [67, 67, 66, 58], []],
    ["c5", [72], []],
    ["H4 C4 C9", [60], ["H4", "C9"]],
  ]) assert.deepEqual(parseTune(tune), { notes, bad });
});

test("countSyllables: rough vowel groups per word", () => {
  for (const [text, n] of [["Old MacDonald had a farm", 7], ["E-I-E-I-O!", 5], ["moo moo here", 3], ["Hmm", 1], ["little cake", 3]]) assert.equal(countSyllables(text), n, text);
});

test("a tuned say compiles to a line carrying its notes, patch, gain and sing", () => {
  const s = script([], [{ do: "say", text: "Old MacDonald had a farm", tune: "G4 G4 G4 D4 E4 E4 D4", sing: 0.6, tunePatch: "bell" }]);
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const [l] = compileScript(s, { catalog }).lines;
  assert.deepEqual(l.tune, { notes: [67, 67, 67, 62, 64, 64, 62], patch: "bell", gain: 0.5, sing: 0.6 });
  assert.equal(compileScript(script([], [{ do: "say", text: "Hi." }]), { catalog }).lines[0].tune, undefined);
});

test("tune validation: bad notes, syllable count, patch, gain, sing without tune", () => {
  const v = (a) => codes(validateScript(script([], [{ do: "say", text: "Old MacDonald had a farm", ...a }]), catalog));
  assert.ok(v({ tune: "G4 X9" }).includes("E3D_TUNE"));
  assert.ok(v({ tune: "G4 G4" }).includes("W3D_TUNE_SYLLABLES"));
  assert.ok(v({ tune: "G4 G4 G4 D4 E4 E4 D4", tunePatch: "kazoo" }).includes("E3D_TUNE"));
  assert.ok(v({ tune: "G4 G4 G4 D4 E4 E4 D4", tuneGain: 2 }).includes("E3D_RANGE"));
  assert.ok(v({ sing: true }).includes("E3D_TUNE"));
});

test("hud: boolean, parent and child share a layer, the camera cannot frame it", () => {
  const ok = script([{ id: "slot", kind: "prop", model: "tracker_slot", hud: true, at: [-6, 3.6, 0] }, { id: "c", kind: "critter", species: "cow", hud: true, parent: "slot", at: [0, -0.3, 0.15] }], []);
  assert.deepEqual(validateScript(ok, catalog).errors, []);
  const mixed = script([{ id: "slot", kind: "prop", model: "tracker_slot", hud: true }, { id: "c", kind: "critter", species: "cow", parent: "slot" }], []);
  assert.ok(codes(validateScript(mixed, catalog)).includes("E3D_HUD"));
  assert.ok(codes(validateScript(script([{ id: "c", kind: "critter", species: "cow", hud: "yes" }], []), catalog)).includes("E3D_HUD"));
  const shot = script([{ id: "c", kind: "critter", species: "cow", hud: true }], [{ do: "shot", target: "c" }]);
  assert.ok(codes(validateScript(shot, catalog)).includes("E3D_HUD"));
});

test("meta.host must name an object that can talk", () => {
  const objs = [{ id: "robo", kind: "character", character: "robot" }, { id: "b", kind: "shape", shape: "cube" }];
  assert.deepEqual(validateScript(script(objs, [], { meta: { title: "t", host: "robo" } }), catalog).errors, []);
  assert.ok(codes(validateScript(script(objs, [], { meta: { title: "t", host: "b" } }), catalog)).includes("E3D_CAST"));
  assert.ok(codes(validateScript(script(objs, [], { meta: { title: "t", host: "nobody" } }), catalog)).includes("E3D_CAST"));
});

// A voice-like test clip: a pulse train through a vowel resonance, in syllables separated by short gaps.
function voiced(sr, f0, segs) {
  const x = new Float32Array(Math.round(sr * segs[segs.length - 1][1]) + sr / 10);
  let y1 = 0;
  let y2 = 0;
  const w = (2 * Math.PI * 800) / sr;
  const r = 0.97;
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / sr;
    const on = segs.some(([a, b]) => t >= a && t < b);
    ph += f0 / sr;
    let e = 0;
    if (ph >= 1) {
      ph -= 1;
      e = on ? 1 : 0;
    }
    const y = e + 2 * r * Math.cos(w) * y1 - r * r * y2;
    y2 = y1;
    y1 = y;
    x[i] = y * 0.05;
  }
  return x;
}

test("psola: lifts the pitch by the ratio and keeps the length", () => {
  const sr = 48000;
  const x = voiced(sr, 200, [[0, 0.8]]);
  near(medianPitch(trackPitch(x, sr)), 200, 2);
  const y = psola(x, sr, 2 ** (4 / 12));
  assert.equal(y.length, x.length);
  near(medianPitch(trackPitch(y, sr)), 200 * 2 ** (4 / 12), 3);
  assert.deepEqual(psola(x, sr, 1.3), psola(x, sr, 1.3)); // deterministic
});

test("syllables and placeNotes: one note per voiced stretch, at its start", () => {
  const sr = 48000;
  const segs = [[0.05, 0.3], [0.4, 0.65], [0.8, 1.1]];
  const x = voiced(sr, 220, segs);
  const syl = syllables(x, sr, trackPitch(x, sr), 3);
  assert.equal(syl.length, 3);
  const placed = placeNotes(x, sr, [60, 62, 64]);
  assert.deepEqual(placed.map((n) => n.midi), [60, 62, 64]);
  placed.forEach((n, i) => near(n.t, i === 0 ? segs[0][0] : segs[i][0], 0.12));
});

function near(a, b, eps) {
  assert.ok(Math.abs(a - b) <= eps, `${a} != ${b} (±${eps})`);
}
