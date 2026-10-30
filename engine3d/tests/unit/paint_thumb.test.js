// paint from (one part colour), recolor, thumbnails by scene and the part-child warning: the timeline values
// they record and what the validator says about them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { createDirector } from "../../runtime/director.js";
import { mainColor, modelColors, rgb } from "../../runtime/director_extras.js";
import { compileScript } from "../../runtime/compile.js";
import { thumbnailTime } from "../../runtime/plan.js";
import { validateScript } from "../../runtime/validate.js";

const catalog = loadCatalog3d();
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const script = (objects, beats, meta = {}) => ({ kind: "video3d", version: 1, meta, objects, scenes: [{ id: "s", beats }] });
const codes = (v) => [...v.errors, ...v.warnings].map((e) => e.code);

test("paint from blends one part colour on its own timeline prop", () => {
  const d = createDirector({ catalog }).add({ id: "p", kind: "prop", model: "flowering_plant" });
  d.paint("p", { at: 0, color: "brown", from: "pink", dur: 2, ease: "linear" });
  d.paint("p", { at: 0, color: "yellow", dur: 2 }); // the main colour, as before
  const plan = d.plan();
  assert.deepEqual(plan.objects[0].paintParts, ["pink"]);
  assert.equal(plan.objects[0].paint, "leaf");
  const [a, b] = [rgb(catalog.colors.pink.hex), rgb(catalog.colors.brown.hex)];
  d.timeline.valueAt("p", "tint:pink", 1).forEach((v, i) => near(v, (a[i] + b[i]) / 2));
  // from the main colour is the plain paint.
  const d2 = createDirector({ catalog }).add({ id: "p", kind: "prop", model: "plant" });
  d2.paint("p", { color: "brown", from: "leaf" });
  assert.equal(d2.plan().objects[0].paint, "leaf");
  assert.equal(d2.plan().objects[0].paintParts, undefined);
  assert.throws(() => d2.paint("p", { color: "brown", from: "mauve" }));
});

test("recolor changes the main colour and the colours a model uses", () => {
  const o = { id: "p", kind: "prop", model: "plant", recolor: { leaf: "brown" } };
  assert.equal(mainColor(o, catalog), "brown");
  assert.ok(modelColors(o, catalog).includes("brown") && !modelColors(o, catalog).includes("leaf"));
  const v = validateScript(script([o], [{ do: [{ do: "paint", target: "p", color: "orange", from: "brown" }] }]), catalog);
  assert.deepEqual(codes(v), []);
  // A colour the model does not use: a warning for recolor, an error for paint from.
  const w = validateScript(script([{ ...o, recolor: { purple: "red" } }], [{ do: [{ do: "paint", target: "p", color: "orange", from: "purple" }] }]), catalog);
  assert.deepEqual(w.warnings.map((x) => x.code), ["W3D_RECOLOR_UNUSED"]);
  assert.deepEqual(w.errors.map((x) => x.code), ["E3D_PAINT_FROM"]);
});

test("thumbnail { scene, at } follows the scene start; t still works", () => {
  const s = { ...script([], [{ dur: 3, do: [] }]), scenes: [{ id: "a", beats: [{ dur: 3, do: [] }] }, { id: "b", beats: [{ dur: 5, do: [] }] }] };
  const plan = compileScript(s, { catalog });
  near(thumbnailTime(plan, { scene: "b", at: 1.5 }), 4.5);
  near(thumbnailTime(plan, { scene: "a" }), 0);
  near(thumbnailTime(plan, { t: 2 }), 2);
  near(thumbnailTime(plan, undefined), 1);
  assert.throws(() => thumbnailTime(plan, { scene: "zz" }));
  // Real TTS clips stretch the first scene: the thumbnail moves with scene b.
  const long = { ...s, scenes: [{ id: "a", beats: [{ do: [{ do: "say", id: "l1", text: "Hello there" }] }] }, s.scenes[1]] };
  const p1 = compileScript(long, { catalog });
  const p2 = compileScript(long, { catalog, speech: { l1: { dur: 9 } } });
  near(thumbnailTime(p2, { scene: "b", at: 1 }) - thumbnailTime(p1, { scene: "b", at: 1 }), p2.scenes[1].start - p1.scenes[1].start);
  assert.ok(p2.scenes[1].start > p1.scenes[1].start);
  assert.deepEqual(codes(validateScript({ ...s, meta: { thumbnail: { scene: "b", at: 1.5 } } }, catalog)), []);
  assert.deepEqual(codes(validateScript({ ...s, meta: { thumbnail: { t: 2 } } }, catalog)), []);
  assert.deepEqual(codes(validateScript({ ...s, meta: { thumbnail: { at: 2 } } }, catalog)), ["E3D_RANGE"]);
});

test("a part child placed at a world position gets a warning", () => {
  const cat = { id: "cat", kind: "critter", species: "cat", at: [4.3, 0, 1.3], size: 0.9 };
  const hat = (at) => ({ id: "hat", kind: "shape", shape: "cone", parent: "cat", part: "head", at });
  assert.deepEqual(codes(validateScript(script([cat, hat([0, 0.28, 0])], [{ do: [] }]), catalog)), []);
  assert.deepEqual(codes(validateScript(script([cat, hat([4.3, 0.98, 1.3])], [{ do: [] }]), catalog)), ["W3D_PART_FAR"]);
});
