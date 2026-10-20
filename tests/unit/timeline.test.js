// Tracks and keyframes (ENGINE_V3_SPEC 6, V3.5 in progress): targets, easing (table, step, cubic-bezier),
// sampling numbers and colours, compiling with scene time bases, and values at a time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTarget, cubicBezier, easingOf, sampleTrack, compileTracks, trackValuesAt, valueFits } from "../../engine/timeline.js";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("targets: node kinds with an id, lens and post without one, only keyable props", () => {
  assert.deepEqual(parseTarget("text.title.y"), { kind: "text", id: "title", prop: "y" });
  assert.deepEqual(parseTarget("lens.dolly"), { kind: "lens", id: null, prop: "dolly" });
  assert.deepEqual(parseTarget("post.bloom"), { kind: "post", id: null, prop: "bloom" });
  for (const bad of ["text.title", "lens.x.dolly", "camera.zoom", "shape.s1.colour", "", 3]) assert.equal(parseTarget(bad), null, String(bad));
});

test("easing: the table, step, and cubic-bezier in both forms", () => {
  assert.equal(easingOf(undefined)(0.3), 0.3);
  assert.equal(easingOf("step")(0.99), 0);
  assert.equal(easingOf("step")(1), 1);
  assert.equal(easingOf("nope"), null);
  assert.equal(easingOf([1, 2]), null);
  const linear = cubicBezier(0, 0, 1, 1);
  for (const x of [0, 0.25, 0.5, 0.9, 1]) near(linear(x), x, 1e-5);
  const ease = easingOf("cubic-bezier(0.25, 0.1, 0.25, 1)");
  near(ease(0.5), 0.8024, 2e-3);
  near(easingOf([0.42, 0, 0.58, 1])(0.5), 0.5, 1e-5);
});

test("sampling: holds before and after, eases arrive at their key, colours mix per channel", () => {
  const keys = [{ t: 1, v: 0 }, { t: 3, v: 10, ease: "inQuad" }];
  assert.equal(sampleTrack(keys, 0), 0);
  near(sampleTrack(keys, 2), 2.5);
  assert.equal(sampleTrack(keys, 9), 10);
  assert.equal(sampleTrack([{ t: 0, v: "#000000" }, { t: 1, v: "#ffffff" }], 0.5), "#808080");
  assert.equal(sampleTrack([], 1), undefined);
  assert.ok(valueFits("fill", "#12ab34") && !valueFits("fill", 3) && valueFits("x", 2) && !valueFits("x", "2"));
});

test("compileTracks sorts keys stably and binds scene tracks to their scene's start; later tracks win", () => {
  const compiled = compileTracks([
    { target: "text.title.y", keys: [{ t: 2, v: 100 }, { t: 0, v: 0 }] },
    { target: "post.bloom", scene: "s2", keys: [{ t: 0, v: 0 }, { t: 1, v: 1 }] },
    { target: "text.title.y", keys: [{ t: 0, v: 5 }] },
    { target: "bad.target", keys: [{ t: 0, v: 1 }] },
  ], new Map([["s2", 10]]));
  assert.equal(compiled.length, 3);
  assert.deepEqual(compiled[0].keys.map((k) => k.t), [0, 2]);
  assert.equal(compiled[1].t0, 10);
  const at = trackValuesAt(compiled, 10.5, (s) => s === "s2");
  assert.equal(at["text.title"].y, 5);
  near(at.post.bloom, 0.5);
  assert.equal(trackValuesAt(compiled, 10.5, () => false).post, undefined);
});
