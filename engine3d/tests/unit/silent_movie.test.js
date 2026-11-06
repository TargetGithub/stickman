// DumpyDoo's silent movie: the film look's iris schedule (runtime/film_look.js), the prop shapes
// (runtime/silent_shapes.js) and their catalog entries, a timeline value cleared back to null, and the scene's
// plan (about ten minutes, title cards in order and read aloud, a music mood per chapter). Node only, no canvas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { irisAt } from "../../runtime/film_look.js";
import { SILENT_SHAPES } from "../../runtime/silent_shapes.js";
import { shapeGeometry } from "../../runtime/geometry.js";
import { createTimeline } from "../../runtime/timeline.js";
import { buildPlan } from "../../runtime/plan.js";
import { loadCatalog3d } from "../../catalog/index.mjs";

const catalog = loadCatalog3d();
const near = (a, b, eps = 1e-9, what = "") => assert.ok(Math.abs(a - b) < eps, `${what} ${a} != ${b}`);

test("irisAt: open with no moves; closes and opens on schedule, eased, holding between moves", () => {
  assert.deepEqual(irisAt([], 5), { r: 1, center: [0.5, 0.5] });
  const moves = [
    { at: 0, dur: 0.01, to: 0, center: [0.2, 0.4] },
    { at: 10, dur: 2, to: 1 },
    { at: 20, dur: 1, to: 0.1, center: "dd" },
  ];
  near(irisAt(moves, 5).r, 0, 1e-9, "closed at the start");
  assert.deepEqual(irisAt(moves, 5).center, [0.2, 0.4]);
  near(irisAt(moves, 11).r, 0.5, 1e-9, "halfway (smoothstep is 0.5 at the middle)");
  assert.ok(irisAt(moves, 10.4).r < 0.2, "eased: slow at first");
  near(irisAt(moves, 15).r, 1, 1e-9, "held open");
  near(irisAt(moves, 21.5).r, 0.1, 1e-9, "closed down to 0.1");
  assert.equal(irisAt(moves, 21.5).center, "dd", "an object id centres it on that object");
  for (let t = 0; t < 25; t += 0.1) {
    const { r } = irisAt(moves, t);
    assert.ok(r >= 0 && r <= 1, `t ${t}: ${r}`);
    assert.deepEqual(irisAt(moves, t), irisAt(moves, t), "pure");
  }
});

test("silent shapes build, are described in shapes.json, and sit in their unit boxes", () => {
  for (const n of Object.keys(SILENT_SHAPES)) {
    const g = shapeGeometry(n);
    assert.ok(g.attributes.position.count > 50, n);
    assert.ok(catalog.shapes[n]?.description, `${n} in shapes.json`);
    g.computeBoundingBox();
    const s = g.boundingBox.getSize(new (g.boundingBox.min.constructor)());
    assert.ok(s.x <= 1.25 && s.y <= 1.05 && s.z <= 1.25, `${n} fits: ${s.toArray()}`);
  }
  // The crook is half a ring: its ends level, its top up.
  const c = shapeGeometry("crook");
  c.computeBoundingBox();
  near(c.boundingBox.max.y, 0.6, 1e-6, "crook top");
  assert.ok(c.boundingBox.min.y > -0.11, "nothing below its ends");
});

test("silent-movie props are in the catalog with descriptions and tags", () => {
  for (const n of ["bowler_hat", "cane", "banana_peel", "mirror_frame", "street_lamp"]) {
    const p = catalog.props[n];
    assert.ok(p?.description && p.tags?.length, n);
    for (const part of p.parts) assert.ok(catalog.shapes[part.p] || SILENT_SHAPES[part.p] || ["box", "cylinder", "sphere", "capsule", "pyramid", "leaf"].includes(part.p), `${n}: ${part.p}`);
  }
});

test("timeline: a value set back to null clears it (a gaze given back to the idle glances)", () => {
  const tl = createTimeline();
  tl.tween("dd", "gaze", { start: 1, dur: 1, to: [1, 0] });
  tl.set("dd", "gaze", null, 3);
  tl.tween("dd", "gaze", { start: 5, dur: 1, to: [0, 1] });
  assert.deepEqual(tl.valueAt("dd", "gaze", 2.5), [1, 0]);
  assert.equal(tl.valueAt("dd", "gaze", 4), null);
  assert.deepEqual(tl.valueAt("dd", "gaze", 7), [0, 1], "a later tween starts again from its target");
});

test("the silent movie plans to about ten minutes, its cards in order, and is deterministic", async () => {
  const sceneUrl = pathToFileURL(new URL("../../scenes/dumpydoo_silent_movie.js", import.meta.url).pathname).href;
  const plan = await buildPlan({ sceneUrl, catalog });
  assert.ok(plan.duration > 540 && plan.duration < 660, `${plan.duration} s`);
  const cards = plan.captions.filter((c) => c.style === "intertitle");
  assert.ok(cards.length >= 20, `${cards.length} cards`);
  for (let i = 1; i < cards.length; i++) assert.ok(cards[i].start >= cards[i - 1].start + cards[i - 1].dur - 1e-6, `card ${i} overlaps the one before`);
  assert.equal(cards.at(-1).text, "The End");
  // Every card is read aloud in the baby voice, and DumpyDoo says his own lines (his mouth moves with them).
  assert.ok(cards.every((c) => plan.lines.some((l) => Math.abs(l.t - (c.start + 0.35)) < 1e-6 && l.voice === "toddler")), "each card is read");
  assert.ok(plan.lines.filter((l) => l.who === "dd").length >= 15, "DumpyDoo talks");
  // A music mood per chapter, and more than a few different ones.
  assert.ok(plan.scenes.length >= 17, `${plan.scenes.length} chapters`);
  assert.ok(new Set(plan.scenes.map((s) => s.music)).size >= 9, "a variety of music");
  // Built again, the plan is the same (the module-level iris list is reset per build).
  const again = await buildPlan({ sceneUrl, catalog });
  assert.equal(again.duration, plan.duration);
  assert.equal(again.audio.length, plan.audio.length);
  assert.equal(again.hooks.length, plan.hooks.length);
});
