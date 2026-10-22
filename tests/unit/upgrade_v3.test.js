import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { upgradeToV3, episodeOf } from "../../tools/lib/upgrade_v3.mjs";
import { validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const profile = JSON.parse(readFileSync(new URL("../../series/doopi/v3_profile.json", import.meta.url), "utf8"));
const voices = JSON.parse(readFileSync(new URL("../../series/doopi/tts_voices.json", import.meta.url), "utf8")).cast;

test("episodeOf reads the number and title from a series title", () => {
  const cases = [
    ["Doopi & Friends 7: The Spice Tunnel", { episode: 7, title: "The Spice Tunnel" }],
    ["Doopi & Friends 24: The Last Light", { episode: 24, title: "The Last Light" }],
    ["A Day Out", null],
  ];
  for (const [title, want] of cases) assert.deepEqual(episodeOf(title), want, title);
});

const v2 = {
  version: 2,
  meta: { title: "Doopi & Friends 9: Test", format: "landscape", seed: 9, kind: "story", audience: "kids", autoCamera: "story" },
  cast: [{ id: "doopi", color: "#5ec8ff", voice: { pitch: 1 } }, { id: "stranger", color: "#888888" }],
  locations: [{ id: "lair", theme: "gloom_throne_room", set: [{ id: "t", object: "bench", x: 900, layer: "back" }] }, { id: "park", theme: "city_park" }],
  scenes: [
    { id: "one", location: "park", time: "night", transitionIn: { type: "card", kind: "title", title: "Doopi & Friends", subtitle: "Episode 9" },
      cast: [{ id: "doopi", x: 800, layer: "back" }], beats: [{ id: "w", at: 0.3, who: "doopi", do: "wave", say: "Hi!" }] },
  ],
};

test("upgradeToV3 applies the profile: version, voices, limbs, depth, light, vignette, intro, pace, audio", () => {
  const { script: s, notes } = upgradeToV3(v2, profile, voices);
  assert.equal(s.version, 3);
  assert.equal(s.meta.speech, "tts");
  assert.equal(s.cast[0].voice.tts.model, voices.doopi.model);
  assert.equal(s.cast[0].voice.pitch, 1, "the babble voice is kept");
  assert.equal(s.cast[0].limbStyle, "bendy");
  assert.ok(notes.some((n) => n.includes("'stranger'")), "a character without a voice is noted");
  assert.deepEqual(s.locations[0].set[0], { id: "t", object: "bench", x: 900, z: -300 });
  assert.equal(s.locations[0].light, "gloom");
  assert.equal(s.locations[1].light, undefined, "outdoor places keep the light of their time of day");
  assert.equal(s.scenes[0].id, "intro");
  assert.deepEqual(s.scenes[0].use.params, { episode: 9, title: "Test", location: "tokyo_village" });
  assert.deepEqual(s.scenes[1].transitionIn, { type: "fade", dur: 0.6 }, "the title card gives way to the intro");
  assert.deepEqual(s.scenes[1].cast[0], { id: "doopi", x: 800, z: -300 });
  assert.equal(s.scenes[1].lens.vignette, 0.35);
  assert.deepEqual(s.pace, profile.pace);
  assert.deepEqual(s.audio.duck, profile.audio.duck);
  assert.equal(v2.version, 2, "the input is not changed");
  assert.throws(() => upgradeToV3(s, profile, voices), /version 2/);
});

test("every upgraded Doopi episode validates", () => {
  for (let i = 1; i <= 24; i++) {
    const file = new URL(`../../scripts/series/doopi/ep${String(i).padStart(2, "0")}_v3.json`, import.meta.url);
    const r = validate(JSON.parse(readFileSync(file, "utf8")), catalog);
    assert.ok(r.ok, `ep${i}: ${r.errors.map((e) => e.code).join(", ")}`);
    assert.equal(r.warnings.filter((w) => w.code === "W_SPEAKER_OFFSCREEN").length, 0, `ep${i} has a speaker out of shot`);
  }
});
