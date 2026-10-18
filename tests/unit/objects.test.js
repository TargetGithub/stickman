// Objects (S4): behaviors, the use move, riders, holdables, static objects from the event log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createObjects, spawnObject, setObject, stepObjects, useHeld, holdableData, holdableNames, movingItems, removeObject } from "../../engine/objects.js";
import { staticObjectsAt } from "../../engine/renderer/objects.js";
import { simulate } from "../../engine/sim.js";
import { createEngine } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const ctx = { catalog, seed: 3, sceneId: "s", groundY: 880, stageWidth: 3200 };
const run = (objs, seconds, t0 = 0) => {
  const ev = [];
  for (let i = 1; i <= Math.round(seconds * 60); i++) ev.push(...stepObjects(objs, 1 / 60, t0 + i / 60));
  return ev;
};

test("holdables: v1 props keep their order first, story holdables follow", () => {
  const names = holdableNames(catalog);
  assert.deepEqual(names.slice(0, 6), Object.keys(catalog.props));
  assert.ok(names.includes("racket") && names.includes("bubble_wand") && names.includes("balloon"));
  assert.equal(holdableData(catalog, "sword"), catalog.props.sword);
  assert.equal(holdableData(catalog, "racket"), catalog.objects.racket.hold);
  assert.equal(holdableData(catalog, "bench"), null);
});

test("ball: a launch lands near toX, bounces with sounds, then rolls to a stop", () => {
  const objs = createObjects([{ id: "b", object: "tennis_ball", x: 1000 }], ctx);
  assert.equal(setObject(objs, "b", { toX: 1600, height: 200 })[0].what, "launch");
  let first = null;
  const all = [];
  for (let i = 0; i < 600; i++) {
    const e = stepObjects(objs, 1 / 60, i / 60);
    all.push(...e);
    if (!first) first = e.find((x) => x.what === "bounce");
  }
  assert.ok(first && Math.abs(first.x - 1600) < 25, `first bounce at ${first?.x}`);
  assert.ok(all.filter((e) => e.what === "bounce").length >= 2);
  assert.equal(objs.byId.get("b").vx, 0, "came to rest");
});

test("ball: leaving the stage is reported", () => {
  const objs = createObjects([{ id: "b", object: "football", x: 3000 }], ctx);
  setObject(objs, "b", { toX: 4000, height: 100 });
  assert.ok(run(objs, 3).some((e) => e.what === "offstage"));
});

test("floater: closed-form rise and wobble, pops at the end of its life", () => {
  const objs = createObjects([], ctx);
  spawnObject(objs, { object: "bubble", id: "bb", x: 500, y: 200 }, 0);
  const o = objs.byId.get("bb");
  stepObjects(objs, 0, 1);
  const y1 = o.y;
  stepObjects(objs, 0, 1); // same time, same place (closed form)
  assert.equal(o.y, y1);
  assert.ok(o.y > 200);
  const ev = stepObjects(objs, 0, 10);
  assert.equal(ev[0].what, "pop");
  assert.deepEqual(ev[0].fx, ["bubble_pop"]);
  assert.equal(o.alive, false);
});

test("vehicle: drives to toX with turning wheels, or exits and is removed", () => {
  const objs = createObjects([{ id: "c", object: "car", x: 400 }], ctx);
  setObject(objs, "c", { toX: 1200, speed: 400 });
  const ev = run(objs, 3);
  assert.equal(Math.round(objs.byId.get("c").x), 1200);
  assert.ok(objs.byId.get("c").wheel > 10);
  assert.ok(ev.some((e) => e.what === "stop"));
  setObject(objs, "c", { exit: "right" });
  assert.ok(run(objs, 10).some((e) => e.what === "remove"));
});

test("states: a door opens with a sound; a crate breaks into pieces and is gone", () => {
  const objs = createObjects([{ id: "d", object: "door", x: 500 }, { id: "k", object: "crate", x: 900 }], ctx);
  assert.equal(objs.byId.get("d").state, "closed");
  assert.equal(setObject(objs, "d", { state: "open" })[0].sfx, "door_open");
  const br = setObject(objs, "k", { state: "broken" });
  assert.equal(br[0].what, "break");
  assert.equal(objs.byId.get("k").alive, false);
  assert.deepEqual(removeObject(objs, "k"), []);
});

test("use: a bubble wand blows 3-6 bubbles from its tip; a phone flashes", () => {
  const objs = createObjects([], ctx);
  const actor = { id: "a", facing: 1, prop: { name: "bubble_wand" } };
  const ev = useHeld(objs, actor, { x: 1000, y: 700 }, 0);
  const n = ev.filter((e) => e.what === "spawn").length;
  assert.ok(n >= 3 && n <= 6, `${n} bubbles`);
  assert.equal(ev.at(-1).sfx, "bubble_blow");
  assert.deepEqual(useHeld(objs, { ...actor, prop: { name: "phone" } }, { x: 0, y: 0 }, 0).at(-1).fx, ["camera_flash"]);
  assert.deepEqual(useHeld(objs, { ...actor, prop: { name: "sword" } }, { x: 0, y: 0 }, 0), []);
  assert.equal(movingItems(objs, 880).length, n);
});

test("static objects from the log: spawn, state, break and remove apply at their time", () => {
  const set = [{ id: "d", object: "door", x: 500 }, { id: "k", object: "crate", x: 900 }, { id: "b", object: "football", x: 1 }];
  const events = [
    { videoT: 1, what: "state", id: "d", state: "open" },
    { videoT: 2, what: "spawn", id: "n", kind: "bench", x: 300 },
    { videoT: 3, what: "break", id: "k" },
  ];
  const at = (t) => staticObjectsAt(catalog, set, events, t);
  assert.deepEqual(at(0).map((o) => o.id), ["d", "k"], "the ball is a moving item, not a static piece");
  assert.equal(at(1.5).find((o) => o.id === "d").state, "open");
  assert.deepEqual(at(3.5).map((o) => o.id).sort(), ["d", "n"]);
});

const story = (beats, set = []) => ({
  version: 2, meta: { title: "o", format: "landscape", seed: 2, kind: "clip" },
  cast: [{ id: "a", color: "#3fd8ff" }],
  locations: [{ id: "p", theme: "city_park", set }],
  scenes: [{ id: "s", location: "p", cast: [{ id: "a", x: 1200, facing: 1 }], beats }],
});

test("a spawned holdable lies on the floor and pick_prop picks it up", () => {
  const sim = simulate(story([{ id: "s1", at: 0.2, who: "world", do: "spawn_object", params: { kind: "racket", x: 1260 } }, { id: "p", at: 0.4, who: "a", do: "pick_prop" }]), catalog);
  assert.ok(sim.events.some((e) => e.type === "pick" && e.name === "racket"));
});

test("a rider moves with its vehicle until it dismounts", () => {
  const sim = simulate(story([
    { id: "r", at: 0.2, who: "a", do: "ride", object: "car1" },
    { id: "go", at: 1, who: "world", do: "set_object", object: "car1", params: { toX: 2200, speed: 600 } },
    { id: "off", at: 4, who: "a", do: "dismount" },
  ], [{ id: "car1", object: "car", x: 1200 }]), catalog);
  const anchor = sim.events.filter((e) => e.type === "object" && e.what === "stop");
  assert.equal(anchor.length, 1);
  const e = createEngine({ catalog });
  const r = e.load(story([
    { id: "r", at: 0.2, who: "a", do: "ride", object: "car1" },
    { id: "go", at: 1, who: "world", do: "set_object", object: "car1", params: { toX: 2200, speed: 600 } },
  ], [{ id: "car1", object: "car", x: 1200 }]));
  assert.ok(r.ok, JSON.stringify(r.errors));
  const hip = e.getFrame(r.totalFrames - 1).chars[0].joints[0];
  assert.ok(Math.abs(hip - (2200 - 10)) < 40, `rider hip x ${hip}`);
});

test("dry run: a ball kicked off the stage is E_SIM_OBJECT_OFFSTAGE", () => {
  const sim = simulate(story([{ id: "k", at: 0.2, who: "world", do: "set_object", object: "b", params: { toX: 6000, height: 100 } }], [{ id: "b", object: "football", x: 3000 }]), catalog, { dryRun: true });
  assert.ok(sim.issues.some((i) => i.code === "E_SIM_OBJECT_OFFSTAGE"));
});

test("objects are deterministic: same story, same events", () => {
  const s = story([{ id: "u", at: 0.2, who: "a", do: "use" }]);
  s.cast[0].prop = "bubble_wand";
  const a = JSON.stringify(simulate(s, catalog, { dryRun: true }).events);
  assert.equal(a, JSON.stringify(simulate(structuredClone(s), catalog, { dryRun: true }).events));
  assert.ok(a.includes('"what":"pop"'));
});
