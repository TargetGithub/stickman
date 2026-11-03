// Round 2 of the teaching kit: place value layout and shifts, text card words, transform maths, the new
// director actions (shift, set, emphasize, reparent, point, spin/turn axis, shade cells, trace count) as
// timeline data, validation codes, the round 2 tour, and that every new kind and option builds in Node.
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
import { KIT2_KINDS } from "../../runtime/teach_layout.js";
import { KIT2_ACTIONS } from "../../runtime/director_kit2.js";
import { digitsText, parseDigits, placeX, pvLayout, shiftDigits } from "../../runtime/place_value.js";
import { cardWords, findWords } from "../../runtime/card_words.js";
import { apply, chain, compose, decompose, eulerMat, invert, matEuler, point, rotBetween } from "../../runtime/xform.js";

const catalog = loadCatalog3d();
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const nearVec = (a, b, eps = 1e-6) => a.forEach((x, i) => near(x, b[i], eps));
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const norm = (v) => v.map((x) => x / Math.hypot(...v));

test("place value layout: places by column, the point column narrow", () => {
  const L = pvLayout({ columns: ["thousands", "hundreds", "tens", "ones", ".", "tenths", "hundredths"], cell: 1 });
  assert.deepEqual(L.cols.map((c) => c.place), [3, 2, 1, 0, null, -1, -2]);
  assert.deepEqual([L.max, L.min], [3, -2]);
  near(L.width, 6.4);
  near(placeX(L, 0), L.cols[3].x);
  near(placeX(L, -0.5), (L.cols[3].x + L.cols[5].x) / 2); // half way across the point column
  const whole = pvLayout({ columns: ["tens", "ones"], cell: 1 });
  assert.deepEqual(whole.cols.map((c) => c.place), [1, 0]);
  assert.equal(whole.pointX, null);
});

test("digits parse right-aligned at the point and shift by powers of ten", () => {
  const cases = [
    ["35.2", 1, "352", []],
    ["35.2", 2, "3520", [0]],
    ["352", -1, "35.2", []],
    ["3520", -3, "3.52", []],
    ["35", -3, "0.035", [0, -1]],
    ["0.07", 2, "7", []],
    ["4", 3, "4000", [2, 1, 0]],
    [".5", 1, "5", []],
  ];
  for (const [from, places, want, zeros] of cases) {
    const { kept, added } = shiftDigits(parseDigits(from), places);
    assert.equal(digitsText([...kept, ...added]), want, `${from} x 10^${places}`);
    assert.deepEqual(added.map((a) => a.place), zeros, `${from} placeholders`);
  }
  assert.deepEqual(parseDigits("35.2"), [{ ch: "3", place: 1 }, { ch: "5", place: 0 }, { ch: "2", place: -1 }]);
  assert.throws(() => parseDigits("3.5.1"));
});

test("text card words: phrases and index ranges", () => {
  const text = "The wind blew.\nBecause the road was blocked, the bus was late.";
  assert.equal(cardWords(text).length, 12);
  const cases = [
    ["the road was blocked", [4, 7]],
    ["BLOCKED the bus", [7, 9]],
    ["wind, blew", [1, 2]],
    ["the dog", null],
    [[0, 2], [0, 2]],
    [[3, 99], null],
  ];
  for (const [words, want] of cases) assert.deepEqual(findWords(text, words), want, JSON.stringify(words));
});

test("transforms: Euler round trips, inverse, shortest rotation", () => {
  for (const e of [[0, 0, 0], [30, -20, 45], [-90, 23, 0], [10, 80, -170]]) nearVec(matEuler(eulerMat(e)), e, 1e-4);
  const a = compose([1, 2, 3], [20, 40, -10], [2, 2, 2]);
  nearVec(point(chain(invert(a), a), [0.3, -1, 5]), [0.3, -1, 5]);
  const d = decompose(a);
  nearVec(d.position, [1, 2, 3]);
  nearVec(d.rotation, [20, 40, -10], 1e-4);
  nearVec(d.scale, [2, 2, 2]);
  for (const [u, v] of [[[0, -1, 0], [1, 0, 0]], [[0, 1, 0], [0, -1, 0]], [[1, 0, 0], [0.3, 0.4, 0.5]]]) nearVec(apply(rotBetween(u, v), norm(u)), norm(v));
});

test("shift and set record each digit slot's place and visibility", () => {
  const d = createDirector({ catalog }).add({ id: "pv", kind: "place_value_chart", columns: ["hundreds", "tens", "ones", ".", "tenths"], digits: "3.5" });
  d.shift("pv", { at: 1, places: 2, dur: 1 }).setDigits("pv", { at: 4, digits: "0.2", pop: false });
  const plan = d.plan();
  const o = plan.objects.find((x) => x.id === "pv");
  // 3.5 → 350: slots 0 and 1 slide, a placeholder zero (slot 2) joins in the ones; set adds slots 3 and 4.
  assert.deepEqual(o.pvSlots, [{ ch: "3", zero: false }, { ch: "5", zero: false }, { ch: "0", zero: true }, { ch: "0", zero: false }, { ch: "2", zero: false }]);
  const at = (prop, t) => d.timeline.valueAt("pv", prop, t);
  const cases = [["pvp0", 0, 0], ["pvp0", 2, 2], ["pvp1", 2, 1], ["pvs0", 0, 1], ["pvs2", 1.5, 0], ["pvs2", 3, 1], ["pvp2", 3, 0], ["pvs0", 4, 0], ["pvs4", 4, 1], ["pvp4", 4, -1]];
  for (const [prop, t, want] of cases) near(at(prop, t), want);
  assert.throws(() => createDirector({ catalog }).add({ id: "x", kind: "place_value_chart", columns: ["tens", "ones"], digits: "35" }).shift("x", { places: 1 }));
});

test("emphasize marks word ranges; clear wipes earlier marks", () => {
  const d = createDirector({ catalog }).add({ id: "card", kind: "text_card", text: "The big storm came. The trees fell down." });
  d.emphasize("card", { at: 0, words: "the big storm", dur: 1 }).emphasize("card", { at: 2, words: [4, 5], clear: true, color: "mint", dur: 1 });
  const o = d.plan().objects[0];
  assert.deepEqual(o.marks, [{ words: [0, 2], color: "yellow" }, { words: [4, 5], color: "mint" }]);
  const tl = d.timeline;
  for (const [prop, t, want] of [["hl0", 0.5, 0.5], ["hl0", 1.5, 1], ["hl0", 2.4, 0], ["hl1", 2.2, 0], ["hl1", 3.3, 1]]) near(tl.valueAt("card", prop, t), want, 1e-3);
  assert.throws(() => d.emphasize("card", { words: "a dragon" }));
});

test("reparent keeps the world position, then glides in the new parent", () => {
  const cat = catalog.critters.cat.head.at;
  const dog = catalog.critters.dog.head.at;
  const d = createDirector({ catalog })
    .add({ id: "cat", kind: "critter", species: "cat", at: [1, 0, 0] })
    .add({ id: "dog", kind: "critter", species: "dog", at: [-2, 0, 0.5], size: 2 })
    .add({ id: "hat", kind: "prop", model: "hat", parent: "cat", part: "head", at: [0, 0.28, 0] });
  d.reparent("hat", { at: 1, parent: null });
  const world = [1 + cat[0], cat[1] + 0.28, cat[2]];
  nearVec(d.timeline.valueAt("hat", "position", 1), world);
  assert.equal(d.timeline.valueAt("hat", "parentRef", 0.5), "cat#head");
  assert.equal(d.timeline.valueAt("hat", "parentRef", 1), "");
  d.reparent("hat", { at: 2, parent: "dog", part: "head", to: [0, 0.3, 0], dur: 1 });
  // In the dog's head frame (its size 2 scales its parts): (world - dog - 2 × head) / 2, then the glide.
  nearVec(d.timeline.valueAt("hat", "position", 2), world.map((x, i) => (x - [-2, 0, 0.5][i] - 2 * dog[i]) / 2));
  nearVec(d.timeline.valueAt("hat", "scale", 2), [0.5, 0.5, 0.5]);
  nearVec(d.timeline.valueAt("hat", "position", 3), [0, 0.3, 0]);
  assert.throws(() => d.reparent("dog", { at: 4, parent: "hat" })); // the hat rides on the dog
});

test("point: Robo's arm props; a critter's wing turns to aim at the target", () => {
  const d = createDirector({ catalog })
    .add({ id: "robo", kind: "character", character: "robot" })
    .add({ id: "apple", kind: "prop", model: "apple", at: [3, 0, 1] })
    .add({ id: "owl", kind: "critter", species: "owl", at: [-3, 0, 0] });
  d.point("robo", { at: 1, to: "apple", dur: 0.5, hold: 1 });
  const tl = d.timeline;
  assert.equal(tl.valueAt("robo", "pointArm", 1), "left"); // the apple is on his left (+x)
  for (const [t, want] of [[0.9, 0], [1.5, 1], [2.2, 1], [3.1, 0]]) near(tl.valueAt("robo", "point", t), want);
  assert.ok(tl.valueAt("robo", "look", 1.5)[0] > 20, "his head turns toward it");
  const target = [-1, 1.5, 0];
  d.point("owl", { at: 0, to: target, dur: 0.5, hold: 1, look: false });
  // The wing on the owl's left (+x, the part as listed) now points from its pivot at the target.
  const wing = catalog.critters.owl.parts.find((p) => p.name === "wing");
  assert.equal(tl.valueAt("owl#wing", "liftSide", 0.5), 1);
  const lift = tl.valueAt("owl#wing", "lift", 0.5);
  const e = wing.r.map((x, i) => x + lift[i]);
  const dir = apply(eulerMat(e), wing.hang);
  const pivot = [-3 + wing.at[0], wing.at[1], wing.at[2]];
  nearVec(norm(dir), norm(target.map((x, i) => x - pivot[i])), 1e-4);
  assert.throws(() => d.point("apple", { to: "owl" })); // no arm or wing
});

test("spin and turn about an axis; plans without axis are unchanged", () => {
  const d = createDirector({ catalog }).add({ id: "g", kind: "prop", model: "globe", rotation: [10, 20, 30] });
  const cases = [[{}, [10, 380, 30]], [{ axis: "z", turns: 2 }, [10, 20, 750]], [{ axis: "x", turns: -1 }, [-350, 20, 30]]];
  cases.forEach(([o, want], i) => {
    const t = i * 2;
    d.spin("g", { at: t, dur: 1, ...o });
    nearVec(d.timeline.valueAt("g", "rotation", t + 0.999999), want, 1e-3);
    nearVec(d.timeline.valueAt("g", "rotation", t + 1), [10, 20, 30]);
  });
  d.turn("g", { at: 10, by: 90, axis: "z", dur: 1 });
  nearVec(d.timeline.valueAt("g", "rotation", 11), [10, 20, 120]);
  d.spin("g#globe", { at: 12, axis: "z", dur: 2, ease: "linear" });
  nearVec(d.timeline.valueAt("g#globe", "rotation", 13), [0, 0, 180]);
  assert.throws(() => d.spin("g", { axis: "w" }));
});

test("shade cells shades exactly the listed pieces; trace count switches the counter on", () => {
  const d = createDirector({ catalog }).add({ id: "g", kind: "grid", rows: 2, cols: 3 }).add({ id: "bar", kind: "fraction_bar", parts: 4 });
  d.shade("g", { at: 0, cells: [2, 5], dur: 1 }).shade("g", { at: 2, cells: [5, 6], dur: 0.5 });
  const v = (piece, t) => d.timeline.valueAt(`g#${piece}`, "shade", t) ?? 0;
  for (const [piece, t, want] of [["c2", 1, 1], ["c5", 1, 1], ["c1", 1, 0], ["c2", 2.5, 0], ["c5", 2.5, 1], ["c6", 2.5, 1]]) near(v(piece, t), want);
  d.trace("g", { at: 3, dur: 2, count: true });
  assert.equal(d.timeline.valueAt("g", "traceCount", 2), 0);
  assert.equal(d.timeline.valueAt("g", "traceCount", 3), 1);
  assert.throws(() => d.shade("bar", { cells: [0] }));
});

test("validator: round 2 errors carry their codes, and a talking prop is fine", () => {
  for (const f of ["bad_kit2_fields.json", "bad_kit2_actions.json"]) {
    const { expect, script } = read(`../fixtures/bad/${f}`);
    const codes = validateScript(script, catalog).errors.map((e) => e.code);
    for (const c of expect) assert.ok(codes.includes(c), `${f}: wanted ${c}, got ${codes.join(", ")}`);
  }
  const ok = { kind: "video3d", version: 1, objects: [{ id: "m", kind: "prop", model: "pattern_machine" }, { id: "w", kind: "letter", text: "cat", colors: [null, "orange", "orange"] }],
    scenes: [{ id: "s", beats: [{ dur: 2, do: [{ do: "say", text: "Plus three!", who: "m" }, { do: "spin", target: "m#dial", axis: "z" }] }] }] };
  const v = validateScript(ok, catalog);
  assert.deepEqual(v.errors, []);
  assert.deepEqual(v.warnings, []);
});

test("the round 2 tour validates, uses every new kind and action, and builds the same plan twice", async () => {
  const s = read("../../scripts/round2_tour.json");
  const v = validateScript(s, catalog);
  assert.deepEqual(v.errors, []);
  assert.deepEqual(v.warnings, []);
  const kinds = new Set(s.objects.map((o) => o.kind));
  for (const k of KIT2_KINDS) assert.ok(kinds.has(k), `tour has no ${k}`);
  const actions = s.scenes.flatMap((sc) => sc.beats.flatMap((b) => b.do));
  for (const a of KIT2_ACTIONS) assert.ok(actions.some((x) => x.do === a), `tour has no ${a}`);
  for (const [what, ok] of [["spin axis", actions.some((a) => a.do === "spin" && a.axis)], ["shade cells", actions.some((a) => a.cells)], ["trace count", actions.some((a) => a.count)],
    ["sizes", s.objects.some((o) => o.sizes)], ["grid labels", s.objects.some((o) => o.labels === "numbers")], ["letter colors", s.objects.some((o) => o.colors)],
    ["pointer targets", s.objects.some((o) => o.fromTarget && o.toTarget)], ["prop who", actions.some((a) => a.who === "machine")]]) assert.ok(ok, `tour has no ${what}`);
  const [a, b] = [await buildPlan({ script: s, catalog }), await buildPlan({ script: s, catalog })];
  assert.equal(JSON.stringify(a.timeline.toJSON()), JSON.stringify(b.timeline.toJSON())); // talk curves are closures: compare the data
  assert.ok(a.duration > 60 && a.duration < 120, String(a.duration));
});

test("every round 2 kind and option builds and poses in Node", () => {
  const ttf = readFileSync(new URL("../../../assets/fonts/Andika-Bold.ttf", import.meta.url));
  const font = new Font(new TTFLoader().parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.length)));
  const assets = { fonts: new Map([["andika_bold", font]]), characters: new Map() };
  const material = createMaterials(catalog);
  const d = createDirector({ catalog });
  const specs = [
    { id: "s1", kind: "stroke", points: [[0, 0, 0], [1, 1, 0], [2, 0, 0]], pen: true },
    { id: "s2", kind: "stroke", points: [[0, 0, 0], [1, 1, 0], [2, 0, 0], [3, 1, 0]], smooth: true, closed: true, pen: "dot" },
    { id: "f1", kind: "flow", points: [[0, 0, 0], [2, 0, 0], [2, 2, 0]], closed: true, track: true, changes: [{ at: 0.5, color: "blue" }] },
    { id: "q", kind: "fraction_text", whole: 1, numerator: 3, denominator: 4 },
    { id: "pv", kind: "place_value_chart", digits: "35.2" },
    { id: "card", kind: "text_card", text: "A short passage." },
    { id: "bar", kind: "fraction_bar", parts: 3, sizes: [0.5, 0.25, 0.25], label: true },
    { id: "pie", kind: "fraction_circle", parts: 2, sizes: [0.7, 0.3] },
    { id: "g", kind: "grid", rows: 2, cols: 2, labels: "numbers" },
    { id: "gf", kind: "grid", rows: 1, cols: 2, labels: "numbers", upright: true },
    { id: "line", kind: "pointer", fromTarget: "bar", toTarget: "pie", head: "none", tail: "dot" },
    { id: "w", kind: "letter", text: "cat", colors: [null, "orange", "orange"] },
  ];
  for (const s of specs) d.add(s);
  d.draw("s1", { at: 0, dur: 1 }).shift("pv", { at: 0, places: 1 }).emphasize("card", { at: 0, words: "short" }).shade("bar", { at: 0, cells: [2] }).trace("g", { at: 0, count: true });
  const plan = d.plan();
  const handles = new Map();
  for (const o of plan.objects) {
    const h = buildObject(o, { catalog, assets, material, seed: 1, handles });
    new THREE.Group().add(h.group);
    handles.set(o.id, h);
  }
  for (const t of [0, 0.5, 1, 2]) {
    const state = d.timeline.evaluate(t);
    for (const [id, h] of handles) h.update?.(t, state[id], state);
  }
  // Letter colours: one mesh per letter, the first in the letter colour, the others orange.
  const w = handles.get("w").group.children;
  assert.equal(w.length, 3);
  assert.notEqual(w[0].material, w[1].material);
  assert.equal(w[1].material, w[2].material);
  // The colour pieces line up as the one-mesh word would: centred on x.
  const box = new THREE.Box3().setFromObject(handles.get("w").group);
  near((box.min.x + box.max.x) / 2, 0, 1e-3);
});
