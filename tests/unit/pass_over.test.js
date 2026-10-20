// Walkers pass over standing characters in story scripts (Sridhar, 2026-10-19; ADR-030): a character only
// moves when its own script moves it. v1 clips keep the old separation (fighters never overlap).
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../../engine/sim.js";
import { frameView } from "../../engine/framestore.js";
import { catalog } from "../../catalog/index.js";

const story = (version) => ({
  version, meta: { title: "Pass over", format: "landscape", seed: 1, kind: "clip", audience: "kids" },
  cast: [{ id: "a", color: "#3d7bd9" }, { id: "b", color: "#ffd23f" }, { id: "c", color: "#ff7eb6" }],
  scenes: [{ id: "s1", location: "city_park", cast: [{ id: "a", x: 1200, facing: 1 }, { id: "b", x: 1400, facing: -1 }, { id: "c", x: 2400, facing: -1 }],
    beats: [{ id: "w", at: 0.5, who: "c", do: "walk", to: { x: 1100 } }, { id: "v", at: { after: "w", delay: 0.5 }, who: "a", do: "wave" }] }],
});

function hipXs(sim, i) {
  const out = [];
  for (let n = 0; n < sim.store.length; n++) {
    const f = frameView(sim.store, n, 60);
    if (!f.hold) out.push(f.chars[i].joints[0]);
  }
  return out;
}

test("a walker passes over two standing characters; they never slide", () => {
  for (const version of [2, 3]) {
    const sim = simulate(story(version), catalog);
    for (const [i, x0] of [[0, 1200], [1, 1400]]) {
      const xs = hipXs(sim, i);
      assert.ok(xs.every((x) => Math.abs(x - x0) < 0.5), `v${version} ${"ab"[i]} moved: ${Math.min(...xs).toFixed(1)}..${Math.max(...xs).toFixed(1)}`);
    }
    const walker = hipXs(sim, 2);
    assert.ok(Math.abs(walker[walker.length - 1] - 1100) < 30, `v${version}: the walker reaches its spot (${walker[walker.length - 1].toFixed(0)})`);
  }
});

test("v1 clips keep separation: two fighters never overlap", () => {
  const clip = { version: 1, meta: { title: "Sep", format: "landscape", seed: 1 }, characters: [{ id: "a", x: 1200, facing: 1, color: "#3366cc" }, { id: "b", x: 1300, facing: -1, color: "#cc3333" }], camera: [{ at: 0, mode: "follow" }],
    beats: [{ id: "w", at: 0.2, who: "a", do: "walk", params: { distance: 300 } }, { id: "v", at: { after: "w", delay: 0.4 }, who: "a", do: "victory" }] };
  const sim = simulate(clip, catalog);
  const a = hipXs(sim, 0);
  const b = hipXs(sim, 1);
  assert.ok(a.every((x, k) => b[k] - x >= 39), "they keep the minimum gap");
});
