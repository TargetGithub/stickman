// Feeling clouds (Doopi season 2): set_cloud state, the dim filter, validation and the pop's fx and sound.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cloudAt, dimFilter, cloudPuffs, cloudFrame } from "../../engine/renderer/cloud.js";
import { simulate } from "../../engine/sim.js";
import { validate } from "../../engine/index.js";
import { collectAudioEvents } from "../../engine/audio_events.js";
import { catalog } from "../../catalog/index.js";

const ev = (videoT, params) => ({ videoT, params });
const CLOUD = [
  ["nothing set", [], 2, null],
  ["an instant cloud", [ev(1, { size: 0.5 })], 2, { size: 0.5, rain: true, pop: false }],
  ["growing halfway", [ev(1, { size: 1, dur: 2 })], 2, { size: 0.5, rain: true, pop: false }],
  ["not yet", [ev(3, { size: 1 })], 2, null],
  ["no rain", [ev(1, { size: 0.4, rain: false })], 2, { size: 0.4, rain: false, pop: false }],
  ["cleared quietly", [ev(1, { size: 0.6 }), ev(2, { size: 0 })], 3, null],
  ["popping", [ev(1, { size: 0.6 }), ev(2, { pop: true })], 2.5, { size: 0, rain: true, pop: true }],
  ["after the pop", [ev(1, { size: 0.6 }), ev(2, { pop: true })], 4, null],
  ["a new cloud after a pop", [ev(1, { size: 0.6 }), ev(2, { pop: true }), ev(2.2, { size: 0.3 })], 2.5, { size: 0.3, rain: true, pop: false }],
];
for (const [name, events, t, want] of CLOUD) {
  test(`cloudAt: ${name}`, () => {
    const got = cloudAt(events, t);
    if (!want) return assert.equal(got, null);
    assert.ok(Math.abs(got.size - want.size) < 1e-9, `size ${got.size}`);
    assert.equal(got.rain, want.rain);
    assert.equal(!!got.pop, want.pop);
  });
}

test("cloudAt: the pop keeps the cloud's size for the burst and a gold note by default", () => {
  const got = cloudAt([ev(1, { size: 0.8 }), ev(2, { pop: true })], 2.3);
  assert.equal(got.pop.size, 0.8);
  assert.equal(got.pop.note, "#ffd23f");
  assert.ok(got.pop.u > 0 && got.pop.u < 1);
});

const DIM = [
  [0, null],
  [0.005, null],
  [0.5, "saturate(0.700) brightness(0.930)"],
  [1, "saturate(0.400) brightness(0.860)"],
];
for (const [size, want] of DIM) test(`dimFilter(${size})`, () => assert.equal(dimFilter(size), want));

test("cloudPuffs are the same for one id and differ between ids", () => {
  assert.deepEqual(cloudPuffs("chintu"), cloudPuffs("chintu"));
  assert.notDeepEqual(cloudPuffs("chintu"), cloudPuffs("gappu"));
});

test("cloudFrame sits above the head and grows with size", () => {
  const c = { id: "a", scale: 1, j: { head: { x: 100, y: 300 } } };
  const small = cloudFrame(c, 0.2, 0);
  const big = cloudFrame(c, 1, 0);
  assert.ok(small.y < 300 - 22 && big.y < small.y);
  assert.ok(big.w > small.w);
});

const script = (beats) => ({
  version: 2,
  meta: { title: "Cloud", format: "landscape", seed: 3, kind: "clip", audience: "kids" },
  cast: [{ id: "kai", color: "#3fd8ff" }, { id: "mo", color: "#ffd23f" }],
  locations: [{ id: "park", theme: "city_park" }],
  scenes: [{ id: "one", location: "park", cast: [{ id: "kai", x: 1500, facing: 1 }, { id: "mo", x: 1750, facing: -1 }], beats: [...beats, { id: "w", at: 0.2, who: "mo", do: "wait", params: { seconds: 4 } }] }],
});
const VALID = [
  ["a cloud that grows", [{ id: "a", at: 0.3, who: "world", do: "set_cloud", params: { who: "kai", size: 0.6, dur: 1 } }], true],
  ["a pop", [{ id: "a", at: 0.3, who: "world", do: "set_cloud", params: { who: "kai", pop: true, note: "#ff9ccc" } }], true],
  ["no size and no pop", [{ id: "a", at: 0.3, who: "world", do: "set_cloud", params: { who: "kai" } }], false],
  ["size over 1", [{ id: "a", at: 0.3, who: "world", do: "set_cloud", params: { who: "kai", size: 2 } }], false],
  ["an unknown character", [{ id: "a", at: 0.3, who: "world", do: "set_cloud", params: { who: "zed", size: 0.5 } }], false],
];
for (const [name, beats, ok] of VALID) {
  test(`validate set_cloud: ${name}`, () => {
    const r = validate(script(beats), catalog);
    assert.equal(r.ok, ok, JSON.stringify(r.errors));
    if (!ok) assert.ok(r.errors.some((e) => e.code === "E_WORLD_PARAM"));
  });
}

test("a pop bursts note_burst sparkles on the character and plays cloud_pop", () => {
  const s = script([
    { id: "a", at: 0.3, who: "world", do: "set_cloud", params: { who: "kai", size: 0.6, dur: 0.5 } },
    { id: "b", at: 1.5, who: "world", do: "set_cloud", params: { who: "kai", pop: true } },
  ]);
  const sim = simulate(s, catalog);
  assert.ok(sim.events.some((e) => e.type === "fx" && e.names?.includes("note_burst") && e.actor === "kai"));
  assert.ok(collectAudioEvents(sim).some((e) => e.sfx === "cloud_pop"));
});
