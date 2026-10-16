// Long-form limits (S1.10): a 5-minute story validates (including the dry run) in under 5 s, and
// stays inside the v2 limits. The story is generated here so it covers many scenes and beats.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../../engine/validator/index.js";
import { catalog } from "../../data/index.js";

const THEMES = ["city_park", "city_street", "home_interior", "alley_night", "villain_lair", "dojo_dusk"];
const ACTS = ["wave", "laugh", "point", "shrug", "bow", "taunt", "dance_a", "facepalm"];

/** About 300 s: 10 scenes of ~30 s, each with talk, walking and a short exchange. */
export function longStory() {
  const scenes = Array.from({ length: 10 }, (_, i) => {
    const beats = [{ id: `n${i}`, at: 0.3, who: "world", do: "narrate", params: { text: `Part ${i + 1} of the long walk.` } }];
    let prev = `n${i}`;
    for (let k = 0; k < 9; k++) {
      const id = `b${i}_${k}`;
      const who = k % 2 ? "pip" : "kai";
      beats.push({ id, at: { after: prev, delay: 0.6 }, who, do: ACTS[(i + k) % ACTS.length], say: k % 3 ? undefined : "Come on!" });
      prev = id;
    }
    beats.push({ id: `walk${i}`, at: { after: prev, delay: 0.3 }, who: "kai", do: "walk", params: { distance: 500 } });
    beats.push({ id: `j${i}`, at: { after: `walk${i}`, delay: 0.3 }, who: "kai", do: "jab", target: "pip", approach: "run", outcome: "blocked" });
    beats.push({ id: `w${i}`, at: { after: `j${i}`, delay: 1 }, who: "kai", do: "wait", params: { seconds: 5 } });
    return {
      id: `s${i}`, location: THEMES[i % THEMES.length], transitionIn: { type: i % 2 ? "fade" : "card", text: `Chapter ${i + 1}` },
      cast: [{ id: "kai", x: 1200, facing: 1 }, { id: "pip", x: 1700, facing: -1 }],
      beats: beats.map((b) => (b.say === undefined ? (({ say, ...rest }) => rest)(b) : b)),
    };
  });
  scenes.forEach((s, i) => { if (i % 2) delete s.transitionIn.text; });
  return {
    version: 2,
    meta: { title: "Long walk", format: "landscape", seed: 9, kind: "story", audience: "kids" },
    cast: [{ id: "kai", color: "#3fd8ff" }, { id: "pip", color: "#2fd3c0" }],
    scenes,
  };
}

test("a 5-minute story validates in under 5 s", () => {
  const script = longStory();
  const t0 = process.hrtime.bigint();
  const r = validate(script, catalog);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.deepEqual(r.errors, []);
  assert.ok(r.durationSec >= 240, `story is ${r.durationSec.toFixed(0)}s`);
  assert.ok(ms < 5000, `validation took ${ms.toFixed(0)} ms`);
});
