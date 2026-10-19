import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { simulate } from "../../engine/sim.js";
import { collectAudioEvents } from "../../engine/audio_events.js";
import { catalog } from "../../catalog/index.js";

const script = JSON.parse(readFileSync(new URL("../../scripts/samples/m4_dojo.json", import.meta.url), "utf8"));
const sim = simulate(script, catalog);
const audio = collectAudioEvents(sim);

test("audio events are sorted, in range, and use known SFX keys", () => {
  assert.ok(audio.length > 10, `${audio.length} events`);
  for (let i = 0; i < audio.length; i++) {
    const a = audio[i];
    assert.ok(catalog.sfxKeys.includes(a.sfx), `unknown sfx ${a.sfx}`);
    assert.ok(a.t >= 0 && a.t <= sim.durationSec);
    assert.ok(a.volume > 0 && a.volume <= 1);
    assert.ok(a.pan >= -1 && a.pan <= 1);
    if (i) assert.ok(a.t >= audio[i - 1].t);
  }
});

test("every landed hit has a sound at the moment of contact", () => {
  const hits = sim.events.filter((e) => e.type === "hit");
  for (const h of hits) assert.ok(audio.some((a) => a.t === h.videoT && a.sfx.split("_")[0] === h.sfx.split("_")[0]), `${h.move} ${h.kind}`);
  const big = hits.find((h) => h.damage >= 16 && h.sfx.endsWith("_light"));
  assert.ok(big && audio.some((a) => a.t === big.videoT && a.sfx === big.sfx.replace("_light", "_heavy")), "heavy hits use the heavy sound");
  assert.ok(audio.some((a) => a.sfx === "block"));
  assert.ok(audio.some((a) => a.sfx === "parry"));
});

test("sound is panned toward where it happens on screen", () => {
  const steps = audio.filter((a) => a.sfx === "step");
  assert.ok(steps.some((a) => a.pan < -0.05) || steps.some((a) => a.pan > 0.05), "steps are not all centred");
});

test("every SFX key used by move data and hit kinds is a required key", () => {
  for (const m of catalog.moves) {
    for (const e of m.events || []) if (e.sfx) assert.ok(catalog.sfxKeys.includes(e.sfx), `${m.name} ${e.sfx}`);
    for (const h of m.hits || []) if (h.sfx) assert.ok(catalog.sfxKeys.includes(h.sfx), `${m.name} ${h.sfx}`);
  }
});

const SFX_CASES = [
  ["a world sfx beat plays its sound at full volume by default", { name: "pirate_horn" }, 0.8, null],
  ["volume and pan follow the params", { name: "gloom_horn", volume: 0.5, x: 3000 }, 0.5, "right"],
];
for (const [name, params, volume, side] of SFX_CASES) {
  test(`sfx world command (batch B): ${name}`, () => {
    const story = {
      version: 2, meta: { title: "sfx", format: "landscape", seed: 3, kind: "clip", audience: "kids" },
      cast: [{ id: "kai", color: "#3fd8ff" }],
      locations: [{ id: "park", theme: "city_park" }],
      scenes: [{ id: "s", location: "park", cast: [{ id: "kai", x: 1500, facing: 1 }], beats: [
        { id: "h", at: 0.5, who: "world", do: "sfx", params },
        { id: "w", at: 0.6, who: "kai", do: "wave" },
      ] }],
    };
    const got = collectAudioEvents(simulate(story, catalog)).find((a) => a.sfx === params.name);
    assert.ok(got, "the sound plays");
    assert.equal(got.volume, volume);
    if (side === "right") assert.ok(got.pan > 0);
    else assert.equal(got.pan, 0);
  });
}
