// The newer director moves (director_extras.js) record the right timeline values: clocks, feelings, paint,
// stage lights, paths, parts, parents and stretched grows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { createDirector } from "../../runtime/director.js";
import { parseClock, rgb } from "../../runtime/director_extras.js";
import { validateScript } from "../../runtime/validate.js";

const catalog = loadCatalog3d();
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("parseClock reads 12-hour times", () => {
  for (const [text, mins] of [["12:00", 0], ["3:00", 180], ["3:25", 205], ["7:50", 470], ["11:59", 719]]) assert.equal(parseClock(text), mins);
  for (const bad of ["0:30", "13:00", "3:60", "3.30", "noon"]) assert.throws(() => parseClock(bad));
});

test("clock hands always go forward round the dial", () => {
  const d = createDirector({ catalog }).add({ id: "c", kind: "clock", time: "3:00" });
  d.clock("c", { at: 1, to: "3:30", dur: 1 });
  d.clock("c", { at: 3, to: "2:00", dur: 1 }); // earlier on the dial: forward to 2:00 the next time round
  const tl = d.timeline;
  for (const [t, want] of [[0, 180], [1.5, 195], [2, 210], [4, 840]]) near(tl.valueAt("c", "minutes", t), want);
  d.clock("c", { at: 5, minuteHand: false });
  near(tl.valueAt("c", "minuteHand", 6), 0);
});

test("feel switches the feeling and remembers the one before", () => {
  const d = createDirector({ catalog }).add({ id: "dog", kind: "critter", species: "dog" });
  d.feel("dog", { at: 1, feeling: "sad", dur: 0.5 }).feel("dog", { at: 3, feeling: "surprised" });
  const tl = d.timeline;
  const at = (t) => ({ f: tl.valueAt("dog", "feeling", t), from: tl.valueAt("dog", "feelingFrom", t), at: tl.valueAt("dog", "feelAt", t) });
  assert.deepEqual(at(0), { f: "happy", from: "happy", at: -1 });
  assert.deepEqual(at(2), { f: "sad", from: "happy", at: 1 });
  assert.deepEqual(at(4), { f: "surprised", from: "sad", at: 3 });
  assert.throws(() => d.feel("dog", { feeling: "grumpy" }));
});

test("paint starts from the main colour and blends to the new one", () => {
  const d = createDirector({ catalog }).add({ id: "duck", kind: "critter", species: "duck" });
  d.paint("duck", { at: 0, color: "blue", dur: 2, ease: "linear" });
  const plan = d.plan();
  assert.equal(plan.objects[0].paint, "yellow");
  const [y, b] = [rgb(catalog.colors.yellow.hex), rgb(catalog.colors.blue.hex)];
  d.timeline.valueAt("duck", "tint", 1).forEach((v, i) => near(v, (y[i] + b[i]) / 2));
});

test("lights blends the stage from its preset to a new rig and colours", () => {
  const d = createDirector({ catalog }).stage({ preset: "playroom" });
  d.lights({ at: 1, dur: 2, rig: "moonlight", background: "midnight", ease: "linear" });
  const tl = d.timeline;
  near(tl.valueAt("stage", "sun", 0), catalog.lights.soft_day.sun.intensity);
  near(tl.valueAt("stage", "sun", 3), catalog.lights.moonlight.sun.intensity);
  tl.valueAt("stage", "background", 3).forEach((v, i) => near(v, rgb(catalog.colors.midnight.hex)[i]));
});

test("path travels at an even speed and faces where it goes", () => {
  const d = createDirector({ catalog }).add({ id: "car", kind: "shape", shape: "cube", at: [0, 0, 0] });
  d.path("car", { at: 0, points: [[3, 0, 0], [3, 0, 1]], dur: 4, face: true });
  const tl = d.timeline;
  assert.deepEqual(tl.valueAt("car", "position", 3), [3, 0, 0]); // 3 m of 4 m at t = 3 s
  assert.deepEqual(tl.valueAt("car", "position", 4), [3, 0, 1]);
  near(tl.valueAt("car", "rotation", 2)[1], 90); // heading +x
  near(tl.valueAt("car", "rotation", 4)[1], 0); // then heading +z
});

test("named parts are targets with rotation and position offsets", () => {
  const d = createDirector({ catalog }).add({ id: "cat", kind: "critter", species: "cat" });
  d.turn("cat#head", { at: 0, to: [0, 30, 0], dur: 1 });
  assert.deepEqual(d.timeline.valueAt("cat#head", "rotation", 2), [0, 30, 0]);
  assert.throws(() => d.turn("cat#nope", { to: [0, 1, 0] }));
});

test("grow can stretch one way", () => {
  const d = createDirector({ catalog }).add({ id: "water", kind: "shape", shape: "cylinder", scale: [1, 0.2, 1] });
  d.grow("water", { at: 0, to: [1, 4, 1], dur: 1 });
  d.timeline.valueAt("water", "scale", 2).forEach((v, i) => near(v, [1, 0.8, 1][i]));
});

test("a child must come after its parent", () => {
  const d = createDirector({ catalog });
  assert.throws(() => d.add({ id: "flame", kind: "shape", shape: "cone", parent: "rocket" }));
  d.add({ id: "rocket", kind: "group" }).add({ id: "flame", kind: "shape", shape: "cone", parent: "rocket" });
});

test("a script using every new kind and move validates cleanly", () => {
  const s = {
    kind: "video3d", version: 1, meta: { audience: "grade1" }, stage: { preset: "theatre" },
    objects: [
      { id: "clock", kind: "clock", time: "3:00", minuteHand: false },
      { id: "lamp", kind: "lamp", at: [0, 4, 4], aim: [0, 1, -2], beam: true },
      { id: "snow", kind: "weather", type: "snow", hidden: true },
      { id: "rocket", kind: "group", at: [-3, 0, 0] },
      { id: "nose", kind: "shape", shape: "cone", parent: "rocket", at: [0, 2, 0], pivot: [0, 0.5, 0] },
      { id: "bear", kind: "critter", species: "bear", feeling: "sleepy" },
      { id: "big", kind: "number_block", value: 345 },
      { id: "word", kind: "letter", text: "describing words" },
    ],
    scenes: [{ id: "s", beats: [{ dur: 4, do: [
      { do: "clock", target: "clock", to: "3:30", minuteHand: true },
      { do: "aim", target: "lamp", to: [1, 1, -2] },
      { do: "show", target: "snow" },
      { do: "path", target: "rocket", points: [[0, 3, 0], [3, 6, 0]], face: false },
      { do: "feel", target: "bear", feeling: "surprised" },
      { do: "turn", target: "bear#head", to: [0, 20, 0] },
      { do: "paint", target: "big", color: "gold" },
      { do: "grow", target: "big", to: [1, 2, 1] },
      { do: "lights", rig: "evening", background: "night" },
    ] }] }],
  };
  const v = validateScript(s, catalog);
  assert.deepEqual(v.errors, []);
  assert.deepEqual(v.warnings, []);
});
