// The teaching kit (teach_layout.js, director_teach.js, validate_teach.js, teach*.js builders): number line
// layout and placement, build orders, the eight teaching actions as timeline data, validation codes, the tour
// script, and that every kind builds and poses in Node (no canvas).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { Font } from "three/addons/loaders/FontLoader.js";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { createDirector } from "../../runtime/director.js";
import { validateScript } from "../../runtime/validate.js";
import { buildPlan } from "../../runtime/plan.js";
import { buildObject, createMaterials } from "../../runtime/objects.js";
import { LINE_TOP, buildSteps, lineLabels, lineTicks, linePoint, pieceNames, TEACH_KINDS } from "../../runtime/teach_layout.js";

const catalog = loadCatalog3d();
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const nearVec = (a, b, eps = 1e-6) => a.forEach((x, i) => near(x, b[i], eps));
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const script = (objects, actions) => ({ kind: "video3d", version: 1, objects, scenes: [{ id: "s", beats: [{ dur: 2, do: actions }] }] });

test("number line ticks and labels", () => {
  const cases = [
    [{ from: 0, to: 10 }, 11, ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]],
    [{ from: 0, to: 1, minor: 4, labels: "fractions" }, 5, ["0", "1/4", "2/4", "3/4", "1"]],
    [{ from: 0, to: 2, minor: 3, labels: "fractions" }, 7, ["0", "1/3", "2/3", "1", "4/3", "5/3", "2"]],
    [{ from: 0, to: 2, minor: 2 }, 5, ["0", null, "1", null, "2"]],
    [{ from: 0, to: 20, step: 5 }, 5, ["0", "5", "10", "15", "20"]],
    [{ from: 0, to: 1, step: 0.25 }, 5, ["0", "0.25", "0.5", "0.75", "1"]],
    [{ from: 0, to: 3, labels: ["start", "a", "b", "end"] }, 4, ["start", "a", "b", "end"]],
    [{ from: 0, to: 2, minor: 2, labels: ["x", "y", "z"] }, 5, ["x", null, "y", null, "z"]],
    [{ from: 0, to: 4, labels: "none" }, 5, [null, null, null, null, null]],
  ];
  for (const [line, n, labels] of cases) {
    const o = { kind: "number_line", length: 8, ...line };
    assert.equal(lineTicks(o).length, n, JSON.stringify(line));
    assert.deepEqual(lineLabels(o), labels, JSON.stringify(line));
    near(lineTicks(o)[0].x, -4);
    near(lineTicks(o).at(-1).x, 4);
  }
});

test("linePoint: value → where an object stands on the line", () => {
  const cases = [
    [{ at: [0, 0, 1], from: 0, to: 10, length: 8 }, 0, [-4, LINE_TOP, 1]],
    [{ at: [0, 0, 1], from: 0, to: 10, length: 8 }, 5, [0, LINE_TOP, 1]],
    [{ at: [2, 0.5, 0], from: 0, to: 1, length: 6 }, 0.75, [3.5, 0.5 + LINE_TOP, 0]],
    [{ at: [0, 0, 0], from: 0, to: 10, length: 10, rotation: [0, 90, 0] }, 10, [0, LINE_TOP, -5]],
  ];
  for (const [line, v, want] of cases) nearVec(linePoint({ kind: "number_line", ...line }, v), want);
});

test("on: { line, value } places an object on the line in the director", () => {
  const d = createDirector({ catalog })
    .add({ id: "line", kind: "number_line", from: 0, to: 10, length: 8, at: [0, 0, 1] })
    .add({ id: "frog", kind: "critter", species: "frog", on: { line: "line", value: 2.5 } });
  nearVec(d.timeline.valueAt("frog", "position", 0), [-2, LINE_TOP, 1]);
  nearVec(d.lineAt("line", 10), [4, LINE_TOP, 1]);
  assert.throws(() => d.add({ id: "x", kind: "shape", shape: "cube", on: { line: "frog", value: 1 } }));
});

test("build orders: steps and the step each piece appears at", () => {
  const cases = [
    [{ kind: "array", rows: 3, cols: 4 }, "items", 12, [[0, 0], [5, 5], [11, 11]]],
    [{ kind: "array", rows: 3, cols: 4 }, "rows", 3, [[0, 0], [5, 1], [11, 2]]],
    [{ kind: "grid", rows: 3, cols: 4 }, "cols", 4, [[0, 0], [5, 1], [11, 3]]],
    [{ kind: "cubes", l: 3, w: 2, h: 2 }, "layers", 2, [[0, 0], [5, 0], [6, 1], [11, 1]]],
    [{ kind: "cubes", l: 3, w: 2, h: 2 }, "rows", 4, [[0, 0], [3, 1], [6, 2], [11, 3]]],
    [{ kind: "fraction_circle", parts: 8 }, "items", 8, [[7, 7]]],
    [{ kind: "number_line", from: 0, to: 1, minor: 4 }, "items", 5, [[4, 4]]],
  ];
  for (const [o, order, steps, pairs] of cases) {
    const b = buildSteps(o, order);
    assert.equal(b.steps, steps, `${o.kind} ${order}`);
    for (const [i, s] of pairs) assert.equal(b.stepOf(i), s, `${o.kind} ${order} piece ${i}`);
  }
  assert.deepEqual(pieceNames({ kind: "fraction_circle", parts: 3 }), ["s1", "s2", "s3"]);
  assert.deepEqual(pieceNames({ kind: "fraction_bar", parts: 2 }), ["p1", "p2"]);
  assert.deepEqual(pieceNames({ kind: "grid", rows: 1, cols: 2 }), ["c1", "c2"]);
  assert.deepEqual(pieceNames({ kind: "pointer" }), []);
});

test("build reveals pieces over its dur with one sound per step", () => {
  const d = createDirector({ catalog }).add({ id: "a", kind: "array", rows: 3, cols: 4, hidden: true });
  d.build("a", { at: 1, order: "rows", dur: 3 });
  const tl = d.timeline;
  assert.equal(tl.valueAt("a", "visible", 0.5), false);
  assert.equal(tl.valueAt("a", "visible", 1), true);
  assert.equal(tl.valueAt("a", "buildOrder", 1), "rows");
  for (const [t, want] of [[0.5, 1], [1, 0], [2.5, 0.5], [4, 1]]) near(tl.valueAt("a", "built", t), want);
  const plan = d.plan();
  assert.deepEqual(plan.audio.filter((a) => a.sound === "pop").map((a) => a.t), [1, 2, 3]);
  assert.throws(() => d.build("a", { order: "layers" }));
});

test("shade, draw, open and trace drive their props", () => {
  const d = createDirector({ catalog })
    .add({ id: "bar", kind: "fraction_bar", parts: 4, shaded: 1 })
    .add({ id: "ray", kind: "pointer", from: [0, 0, 0], to: [1, 0, 0], hidden: true })
    .add({ id: "ang", kind: "angle", degrees: 30 })
    .add({ id: "g", kind: "grid", rows: 2, cols: 3 });
  d.shade("bar", { at: 0, to: 3, dur: 1, color: "purple" });
  d.draw("ray", { at: 1, dur: 2 });
  d.open("ang", { at: 0, to: 90, dur: 1 });
  d.trace("g", { at: 0, dur: 5 });
  const tl = d.timeline;
  const cases = [
    ["bar", "shaded", 0, 1], ["bar", "shaded", 0.5, 2], ["bar", "shaded", 1, 3],
    ["ray", "drawn", 1, 0], ["ray", "drawn", 3, 1],
    ["ang", "degrees", 0, 30], ["ang", "degrees", 1, 90],
    ["g", "trace", 0, 0], ["g", "trace", 2.5, 0.5], ["g", "trace", 5, 1],
  ];
  for (const [id, prop, t, want] of cases) near(tl.valueAt(id, prop, t), want);
  nearVec(tl.valueAt("bar", "shadeColor", 1), [0xa4 / 255, 0x6b / 255, 1]);
  assert.equal(d.plan().audio.filter((a) => a.sound === "pop").length, 10); // one per perimeter unit
  assert.throws(() => d.shade("bar", { to: 5 }));
  assert.throws(() => d.open("bar", { to: 10 }));
});

test("leap arcs value to value along the line and leaves its arcs on the line", () => {
  const d = createDirector({ catalog })
    .add({ id: "line", kind: "number_line", from: 0, to: 10, length: 10, at: [0, 0, 0] })
    .add({ id: "frog", kind: "critter", species: "frog", on: { line: "line", value: 0 } });
  d.leap("frog", { at: 1, line: "line", values: [2, 4, 6], dur: 0.5, height: 1 });
  const tl = d.timeline;
  for (const [t, v] of [[1.5, 2], [2, 4], [2.5, 6]]) nearVec(tl.valueAt("frog", "position", t), linePoint({ kind: "number_line", from: 0, to: 10, length: 10, at: [0, 0, 0] }, v));
  near(tl.valueAt("frog", "hop", 1.25), 1);
  near(tl.valueAt("frog", "hop", 1.5), 0);
  const arcs = d.plan().objects.filter((o) => o.id.startsWith("line~pointer"));
  assert.equal(arcs.length, 3);
  assert.ok(arcs.every((a) => a.parent === "line" && a.internal && a.bend === 1));
  nearVec(arcs[0].from, [-5, LINE_TOP + 0.02, 0]);
  near(tl.valueAt(arcs[2].id, "drawn", 2), 0);
  near(tl.valueAt(arcs[2].id, "drawn", 2.5), 1);
  assert.equal(d.plan().audio.filter((a) => a.sound === "boing").length, 3);
});

test("mark and highlight add helpers that ride on the target or one piece", () => {
  const d = createDirector({ catalog }).add({ id: "pie", kind: "fraction_circle", parts: 4 }).add({ id: "cat", kind: "critter", species: "cat" });
  d.mark("pie#s2", { at: 1, result: "incorrect", dur: 2 });
  d.mark("cat", { at: 4 });
  d.highlight("pie", { at: 2, dur: 1.5, color: "pink" });
  const plan = d.plan();
  const helpers = plan.objects.filter((o) => o.internal).map((o) => [o.kind, o.parent, o.part ?? null, o.result ?? o.color]);
  assert.deepEqual(helpers, [["_mark", "pie", "s2", "incorrect"], ["_mark", "cat", null, "correct"], ["_glow", "pie", null, "pink"]]);
  const [m] = plan.objects.filter((o) => o.kind === "_mark");
  const tl = d.timeline;
  for (const [t, want] of [[0.5, false], [1, true], [2.9, true], [3.1, false]]) assert.equal(tl.valueAt(m.id, "visible", t), want, String(t));
  near(tl.valueAt(m.id, "ping", 1.2), 1);
  assert.deepEqual(plan.audio.filter((a) => a.sound).map((a) => [a.t, a.sound]), [[1, "boing"], [4, "ding"]]);
  assert.throws(() => d.mark("pie", { result: "maybe" }));
  assert.throws(() => d.highlight("pie#s9"));
});

test("validator: teaching kit errors carry their codes", () => {
  const line = { id: "line", kind: "number_line", from: 0, to: 10 };
  const cases = [
    [[line, { id: "l2", kind: "number_line", from: 0, to: 1, minor: 20 }], [], "E3D_RANGE"],
    [[line, { id: "l2", kind: "number_line", from: 0, to: 10, step: 3 }], [], "E3D_RANGE"],
    [[{ id: "b", kind: "fraction_bar", parts: 30 }], [], "E3D_PARTS"],
    [[{ id: "b", kind: "fraction_bar", parts: 3, shaded: 4 }], [], "E3D_SHADED"],
    [[{ id: "c", kind: "cubes", l: 11 }], [], "E3D_RANGE"],
    [[{ id: "c", kind: "callout", text: "hi" }], [], "E3D_REQUIRED"],
    [[{ id: "c", kind: "callout", text: "hi", target: "nobody" }], [], "E3D_TARGET"],
    [[{ id: "a", kind: "angle", degrees: 400 }], [], "E3D_RANGE"],
    [[line, { id: "f", kind: "shape", shape: "cube", on: { line: "line", value: -1 } }], [], "E3D_ON_VALUE"],
    [[line, { id: "f", kind: "shape", shape: "cube" }], [{ do: "leap", target: "f", line: "line", values: [] }], "E3D_REQUIRED"],
    [[{ id: "g", kind: "grid" }], [{ do: "shade", target: "g", to: 13 }], "E3D_SHADED"],
    [[{ id: "g", kind: "grid" }], [{ do: "draw", target: "g" }], "E3D_TARGET_KIND"],
    [[{ id: "g", kind: "grid" }], [{ do: "highlight", target: "g#c13" }], "E3D_PART"],
    [[{ id: "g", kind: "grid" }], [{ do: "spin", target: "g#c1" }], "E3D_TARGET_KIND"],
    [[{ id: "s", kind: "shape", shape: "cube" }], [{ do: "trace", target: "s" }], "E3D_TARGET_KIND"],
    [[{ id: "a", kind: "angle" }], [{ do: "open", target: "a", to: [1, 2, 3] }], "E3D_RANGE"],
  ];
  for (const [objects, actions, code] of cases) {
    const codes = validateScript(script(objects, actions.length ? actions : [{ do: "sound", sound: "pop" }]), catalog).errors.map((e) => e.code);
    assert.ok(codes.includes(code), `${JSON.stringify([objects, actions])}: wanted ${code}, got ${codes.join(", ")}`);
  }
  // Good uses pass cleanly: piece targets, number to:, sound false.
  const ok = validateScript(script([line, { id: "pie", kind: "fraction_circle", parts: 4 }, { id: "f", kind: "critter", species: "frog", on: { line: "line", value: 3 } }], [
    { do: "move", target: "pie#s1", to: [0.2, 0.2, 0] }, { do: "mark", target: "pie#s2", result: "correct" }, { do: "shade", target: "pie", to: 2 },
    { do: "build", target: "pie", sound: false }, { do: "leap", target: "f", line: "line", values: [5, 7] },
  ]), catalog);
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.warnings, []);
});

test("the teaching tour validates, uses every kind and action, and builds the same plan twice", async () => {
  const s = read("../../scripts/teach_tour.json");
  const v = validateScript(s, catalog);
  assert.deepEqual(v.errors, []);
  assert.deepEqual(v.warnings, []);
  const kinds = new Set(s.objects.map((o) => o.kind));
  for (const k of TEACH_KINDS) assert.ok(kinds.has(k), `tour has no ${k}`);
  const actions = new Set(s.scenes.flatMap((sc) => sc.beats.flatMap((b) => b.do.map((a) => a.do))));
  for (const a of ["build", "shade", "leap", "draw", "open", "mark", "highlight", "trace"]) assert.ok(actions.has(a), `tour has no ${a}`);
  const [a, b] = [await buildPlan({ script: s, catalog }), await buildPlan({ script: s, catalog })];
  assert.deepEqual(a.timeline.toJSON(), b.timeline.toJSON());
  assert.ok(a.duration > 50 && a.duration < 90, String(a.duration));
});

test("every teaching kind builds and poses in Node, with its pieces named", () => {
  const ttf = readFileSync(new URL("../../../assets/fonts/Andika-Bold.ttf", import.meta.url));
  const font = new Font(new TTFLoader().parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.length)));
  const assets = { fonts: new Map([["andika_bold", font]]), characters: new Map() };
  const material = createMaterials(catalog);
  const d = createDirector({ catalog });
  const specs = [
    { id: "line", kind: "number_line", from: 0, to: 1, minor: 4, labels: "fractions" },
    { id: "bar", kind: "fraction_bar", parts: 3, label: true },
    { id: "pie", kind: "fraction_circle", parts: 6, label: true },
    { id: "arr", kind: "array", rows: 2, cols: 2, trays: true },
    { id: "apples", kind: "array", rows: 1, cols: 2, item: "apple" },
    { id: "g", kind: "grid", rows: 2, cols: 3, upright: true },
    { id: "box", kind: "cubes", l: 2, w: 2, h: 2, box: true },
    { id: "ray", kind: "pointer", from: [0, 0, 0], to: [2, 0, 0], bend: 1 },
    { id: "note", kind: "callout", text: "3/4 of 45°", target: "bar" },
    { id: "ang", kind: "angle", degrees: 45 },
  ];
  for (const s of specs) d.add(s);
  d.mark("pie#s2", { at: 0 }).highlight("g", { at: 0 }).shade("pie", { at: 0, to: 2, dur: 1 }).build("arr", { at: 0, dur: 1 }).trace("g", { at: 0, dur: 2 });
  const plan = d.plan();
  const handles = new Map();
  for (const o of plan.objects) {
    const h = buildObject(o, { catalog, assets, material, seed: 1, handles });
    const parent = o.parent ? handles.get(o.parent) : null;
    (parent ? parent.named?.get(o.part) ?? parent.group : new THREE.Group()).add(h.group);
    handles.set(o.id, h);
    assert.deepEqual([...(h.named?.keys() ?? [])], pieceNames(o), o.id);
  }
  for (const t of [0, 0.5, 1, 2]) {
    const state = d.timeline.evaluate(t);
    for (const [id, h] of handles) h.update?.(t, state[id], state);
  }
  // Half way through the build, the second of four dots is in, the fourth not yet.
  const state = d.timeline.evaluate(0.5);
  handles.get("arr").update(0.5, state.arr, state);
  const dots = [...handles.get("arr").named.values()];
  assert.ok(dots[1].visible && !dots[3].visible);
  // The angle's label reads its degrees, with the degree sign from the font.
  const ang = handles.get("ang");
  ang.update(0, state.ang, state);
  assert.ok(ang.group.children.some((m) => m.isMesh && m.geometry.boundingBox && m.geometry.boundingBox.max.x - m.geometry.boundingBox.min.x > 0.2));
});
