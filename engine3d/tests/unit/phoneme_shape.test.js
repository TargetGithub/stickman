import { test } from "node:test";
import assert from "node:assert/strict";
import { breath, cutAtVoicing, voicingOnset } from "../../tools/lib/phoneme_shape.mjs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { compileScript } from "../../runtime/compile.js";

const SR = 48000;
/** silence, then noise (a burst and aspiration), then a loud voiced vowel (a 180 Hz tone) */
function cv(silence, noise, vowel) {
  const x = new Float32Array(Math.round((silence + noise + vowel) * SR));
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const a = Math.round(silence * SR);
  const b = a + Math.round(noise * SR);
  for (let i = a; i < b; i++) x[i] = 0.15 * rnd();
  for (let i = b; i < x.length; i++) x[i] = 0.6 * Math.sin((2 * Math.PI * 180 * i) / SR);
  return { x, vowelAt: b };
}

for (const [silence, noise] of [[0.03, 0.04], [0.0, 0.06], [0.05, 0.02]]) {
  test(`voicingOnset finds the vowel after ${noise * 1000} ms of noise`, () => {
    const { x, vowelAt } = cv(silence, noise, 0.25);
    assert.ok(Math.abs(voicingOnset(x, SR) - vowelAt) <= 0.006 * SR, "within one window");
    const y = cutAtVoicing(x, SR);
    assert.ok(y.length <= Math.round((Math.max(noise, 0.03) + 0.006) * SR), `kept ${y.length / SR}s, no vowel`);
  });
}

test("cutAtVoicing caps a clip with no vowel (a long hiss) at max", () => {
  const { x } = cv(0, 0.4, 0);
  assert.ok(cutAtVoicing(x, SR, 0.07).length <= Math.round(0.07 * SR) + 1);
});

test("breath is deterministic noise that swells and fades", () => {
  const a = breath(0.24, SR, "ph_h");
  const b = breath(0.24, SR, "ph_h");
  assert.deepEqual(a, b);
  assert.equal(a.length, Math.round(0.24 * SR));
  assert.ok(Math.abs(a[0]) < 1e-3 && Math.abs(a.at(-1)) < 1e-3);
});

test("stops are cut and h is a breath in the catalog; a letter sound takes the speaker's voice", () => {
  const catalog = loadCatalog3d();
  for (const n of ["ph_b", "ph_d", "ph_g", "ph_p", "ph_t", "ph_k", "ph_c", "ph_j", "ph_ch"]) assert.equal(catalog.sounds[n].cut, "voicing", n);
  assert.ok(catalog.sounds.ph_h.breath > 0.1);
  const s = { kind: "video3d", version: 1, meta: { seed: 1, cast: { bear: { voice: "deep", pitch: 0.9 } } },
    objects: [{ id: "bear", kind: "critter", species: "bear" }],
    scenes: [{ id: "a", beats: [{ dur: 2, do: [{ do: "sound", sound: "ph_p", who: "bear" }, { do: "sound", sound: "ph_t", at: 1 }, { do: "sound", sound: "ding", at: 1.5 }] }] }] };
  assert.deepEqual(compileScript(s, { catalog }).audio.map((a) => a.sound), ["ph_p__deep_90", "ph_t", "ding"]);
});
