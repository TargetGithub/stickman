// The v3 camera lens (ENGINE_V3_SPEC 5.3, ADR-025): lens changes from the event log, channel blending,
// named moves (relative and absolute), auto focus on story shots, handheld noise, the lens camera, blur
// levels, cover scale, letterbox, the frame matrix and context, and the validator's camera checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LENS_DEFAULTS, lensChanges, lensAt, sampleMove, autoFocusSpans, autoFocusAt, createHandheld, handheldAt, lensCamera, blurFor, coverScale, letterboxBar } from "../../engine/camera3.js";
import { lensMatrix, framedContext } from "../../engine/renderer/lens_draw.js";
import { depthOf } from "../../engine/depth.js";
import { deriveRng } from "../../engine/math.js";
import { catalog } from "../../catalog/index.js";
import { validate } from "../../engine/index.js";

const M = catalog.cameraMoves;
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("the catalog ships the named moves with valid curves", () => {
  for (const name of ["push_in", "pull_out", "slow_push", "crane_up", "crane_down", "orbit_sweep", "dutch_tilt", "level", "handheld"]) assert.ok(M[name], name);
  assert.deepEqual(catalog.cameraMoveNames, Object.keys(M));
  for (const [name, m] of Object.entries(M)) {
    assert.equal(m.keys[0].t, 0, name);
    assert.equal(m.keys[m.keys.length - 1].t, 1, name);
  }
});

test("lensChanges keeps camera keys with lens fields and set_camera beats, in order", () => {
  const ev = [
    { type: "camera", videoT: 0, key: { at: 0, mode: "follow" } },
    { type: "camera", videoT: 1, key: { at: 1, mode: "follow", dolly: 300, dur: 2, lag: 0.5 } },
    { type: "world", do: "shake", videoT: 2, params: {} },
    { type: "world", do: "set_camera", videoT: 3, params: { move: "push_in", focus: "kai", dof: 0.5 } },
    { type: "world", do: "set_camera", videoT: 4, params: { focusZ: -600 } },
  ];
  assert.deepEqual(lensChanges(ev), [
    { t0: 1, dur: 2, ease: undefined, set: { dolly: 300 }, move: null, focus: undefined, focusZ: undefined },
    { t0: 3, dur: 0, ease: undefined, set: { dof: 0.5 }, move: "push_in", focus: "kai", focusZ: undefined },
    { t0: 4, dur: 0, ease: undefined, set: {}, move: null, focus: undefined, focusZ: -600 },
  ]);
});

test("lensAt blends channels over dur and holds them; focus and focusZ replace each other", () => {
  const ch = [{ t0: 1, dur: 2, ease: "linear", set: { dolly: 400, tilt: 4 } }, { t0: 5, dur: 0, set: { vignette: 0.6 }, focus: "kai" }, { t0: 6, dur: 0, set: {}, focusZ: -500 }];
  assert.deepEqual(lensAt(ch, 0, M), { ...LENS_DEFAULTS });
  near(lensAt(ch, 2, M).dolly, 200);
  near(lensAt(ch, 2, M).tilt, 2);
  assert.equal(lensAt(ch, 4, M).dolly, 400);
  const at5 = lensAt(ch, 5, M);
  assert.deepEqual([at5.vignette, at5.focus, at5.focusZ], [0.6, "kai", null]);
  const at6 = lensAt(ch, 6, M);
  assert.deepEqual([at6.focus, at6.focusZ], [null, -500]);
  assert.equal(lensAt([], 3, M, { ...LENS_DEFAULTS, dof: 0.4, letterbox: 1 }).letterbox, 1, "the scene lens is the base");
});

test("named moves: relative curves add to the lens and hold their end; push multiplies; absolute moves return to targets", () => {
  near(sampleMove(M.push_in, 0).dolly, 0);
  near(sampleMove(M.push_in, 1).dolly, 420);
  const sweep = sampleMove(M.orbit_sweep, 0.5);
  near(sweep.truck, 300);
  near(sweep.dolly, 220);
  const ch = [{ t0: 0, dur: 0, set: { dolly: 100 } }, { t0: 1, dur: 0, set: {}, move: "push_in" }];
  near(lensAt(ch, 1, M).dolly, 100);
  near(lensAt(ch, 1 + M.push_in.dur, M).dolly, 520);
  near(lensAt(ch, 99, M).dolly, 520, 1e-6);
  const timed = [{ t0: 0, dur: 1, ease: "linear", set: {}, move: "push_in" }];
  near(lensAt(timed, 1, M).dolly, 420, 1e-6);
  const pushed = [{ t0: 0, dur: 0, set: { push: 1.5 } }, { t0: 0, dur: 0, set: {}, move: "slow_push" }];
  near(lensAt(pushed, 10, M).push, 1.5 * 1.14);
  const level = [{ t0: 0, dur: 0, set: { roll: 6, dolly: 300, push: 1.3 } }, { t0: 2, dur: 0, set: {}, move: "level" }];
  const l = lensAt(level, 2 + M.level.dur, M);
  assert.deepEqual([l.roll, l.dolly, l.push], [0, 0, 1]);
  near(lensAt(level, 2.5, M).roll, 3);
  assert.equal(lensAt([{ t0: 0, dur: 0, set: {}, move: "nope" }], 1, M).dolly, 0, "an unknown move is ignored at render time");
});

test("auto focus: close-ups, over-the-shoulder and two-shots pull focus, fade in and out, and end at the next key", () => {
  const ev = [
    { type: "world", do: "shot", videoT: 2, params: { mode: "close_up", target: "kai", dur: 2 } },
    { type: "world", do: "shot", videoT: 6, params: { mode: "two_shot", targets: ["kai", "pip"] } },
    { type: "camera", videoT: 9, key: { mode: "follow" } },
    { type: "world", do: "shot", videoT: 10, params: { mode: "wide" } },
  ];
  const spans = autoFocusSpans(ev);
  assert.deepEqual(spans, [{ t0: 2, t1: 4, target: "kai", targets: null, dof: 0.65 }, { t0: 6, t1: 9, target: null, targets: ["kai", "pip"], dof: 0.3 }]);
  assert.equal(autoFocusAt(spans, 1), null);
  near(autoFocusAt(spans, 2).dof, 0);
  near(autoFocusAt(spans, 3).dof, 0.65);
  assert.deepEqual(autoFocusAt(spans, 3).ids, ["kai"]);
  near(autoFocusAt(spans, 4 + 0.35 / 2).dof, 0.65 / 2);
  assert.deepEqual(autoFocusAt(spans, 7).ids, ["kai", "pip"]);
  assert.equal(autoFocusAt(spans, 9.5), null);
});

test("handheld noise is deterministic per stream, bounded, and off at 0", () => {
  const a = createHandheld(deriveRng(5, "handheld@s1"));
  const b = createHandheld(deriveRng(5, "handheld@s1"));
  const c = createHandheld(deriveRng(5, "handheld@s2"));
  for (const t of [0, 0.4, 3.3, 17]) assert.deepEqual(handheldAt(a, 0.7, t), handheldAt(b, 0.7, t));
  assert.notDeepEqual(handheldAt(a, 1, 3.3), handheldAt(c, 1, 3.3));
  assert.deepEqual(handheldAt(a, 0, 3), { x: 0, y: 0, roll: 0 });
  for (let t = 0; t < 20; t += 0.37) {
    const h = handheldAt(a, 1, t);
    assert.ok(Math.abs(h.x) <= 16 && Math.abs(h.y) <= 11 && Math.abs(h.roll) <= 0.7);
  }
});

test("lensCamera: dolly grows the stage line and shortens the focal length, truck and crane move the camera, tilt and roll convert", () => {
  const cam = { x: 1600, y: 700, zoom: 1, shakeX: 0, shakeY: 0 };
  const depth = depthOf({});
  const flat = lensCamera(cam, { ...LENS_DEFAULTS }, depth);
  assert.deepEqual(flat.cam, cam);
  assert.equal(flat.bgZoom, 1);
  assert.deepEqual([flat.depth.focal, flat.depth.horizon, flat.tiltPx, flat.roll], [2400, 260, 0, 0]);
  const d = lensCamera(cam, { ...LENS_DEFAULTS, dolly: 600, truck: 200, crane: -100, push: 1.2, tilt: 5, roll: 3 }, depth, { x: 4, y: -2, roll: 0.5 });
  near(d.cam.zoom, 1.2 * (2400 / 1800));
  assert.equal(d.depth.focal, 1800);
  assert.ok(d.bgZoom > 1.2 && d.bgZoom < d.cam.zoom, "far layers change less than the stage line");
  assert.equal(d.cam.x, 1804);
  const ground = (c) => 540 + (880 - c.y) * c.zoom;
  near(ground({ ...d.cam, y: d.cam.y + 100 + 2 }), ground(cam), 1e-6); // without crane and sway the floor stays put on screen
  assert.equal(d.depth.horizon, 310, "a higher camera sees far feet higher");
  near(d.tiltPx, Math.tan((5 * Math.PI) / 180) * 1200);
  near(d.roll, (3.5 * Math.PI) / 180);
  assert.equal(lensCamera(cam, { ...LENS_DEFAULTS, dolly: 5000 }, depth).depth.focal, 2400 * 0.4, "dolly is clamped before the focal plane");
});

test("blur levels are quantized, zero at the focus and without dof, and capped", () => {
  assert.equal(blurFor(-800, -800, 1), 0);
  assert.equal(blurFor(-3000, 0, 0), 0);
  assert.equal(blurFor(-3000, 0, 1), 9);
  assert.equal(blurFor(-9000, 0, 1), 9);
  assert.equal(blurFor(-700, 0, 1), 4.5);
  assert.equal(blurFor(-100, 0, 1), 0, "small differences stay sharp");
  for (const z of [-50, -400, -1000, -1999]) assert.equal(blurFor(z, 0, 0.6) % 1.5, 0);
});

test("cover scale, letterbox bars and the frame matrix", () => {
  assert.equal(coverScale(1920, 1080, 0), 1);
  const k = coverScale(1920, 1080, (5 * Math.PI) / 180);
  assert.ok(k > 1.1 && k < 1.3);
  assert.equal(letterboxBar(1920, 1080, 0), 0);
  near(letterboxBar(1920, 1080, 1), (1080 - 1920 / 2.39) / 2);
  assert.ok(letterboxBar(1080, 1920, 1) > 0 && letterboxBar(1080, 1920, 1) <= 1920 / 4);
  const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const id = lensMatrix(1920, 1080, 0, 0, 1);
  assert.deepEqual(apply(id, 100, 200), [100, 200]);
  const tilt = lensMatrix(1920, 1080, 0, 30, 1);
  assert.deepEqual(apply(tilt, 100, 200), [100, 230]);
  const roll = lensMatrix(1920, 1080, Math.PI / 2, 0, 1);
  const [x, y] = apply(roll, 960 + 100, 540);
  near(x, 960);
  near(y, 640);
});

test("framedContext composes every setTransform with the base and passes everything else through", () => {
  const calls = [];
  const fake = { setTransform: (...a) => calls.push(a), fillRect: (...a) => calls.push(["fill", ...a]), filter: "none" };
  const g = framedContext(fake, [2, 0, 0, 2, 10, 20]);
  g.setTransform(1, 0, 0, 1, 5, 5);
  g.setTransform({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  g.fillRect(0, 0, 1, 1);
  g.filter = "blur(2px)";
  assert.deepEqual(calls, [[2, 0, 0, 2, 10, 20], [2, 0, 0, 2, 20, 30], [2, 0, 0, 2, 10, 20], ["fill", 0, 0, 1, 1]]);
  assert.equal(fake.filter, "blur(2px)");
});

test("the validator knows the v3 camera: lens block, key fields, set_camera, moves and focus", () => {
  const story = (patch = {}) => ({
    version: 3, meta: { title: "C", format: "landscape", seed: 1, kind: "clip", audience: "kids" },
    cast: [{ id: "a", color: "#3d7bd9" }, { id: "b", color: "#ffd23f" }],
    scenes: [{ id: "s1", location: "city_park", ...(patch.lens ? { lens: patch.lens } : {}), camera: patch.camera ?? [{ at: 0, mode: "follow", lag: 0.4, dof: 0.3, focus: "a", move: "push_in", dur: 2 }],
      cast: [{ id: "a", x: 1200, facing: 1 }, { id: "b", x: 1700, facing: -1, z: -500 }],
      beats: [{ id: "b1", at: 0, who: "a", do: "wave" }, { id: "c", at: 0.5, who: "world", do: "set_camera", params: patch.params ?? { move: "orbit_sweep", dof: 0.5, focus: "b", vignette: 0.4, letterbox: 1, ease: "inOutQuad" } }, { id: "b2", at: { after: "b1", delay: 2 }, who: "a", do: "wave" }] }],
  });
  const codes = (s) => validate(s, catalog).errors.map((e) => e.code);
  assert.deepEqual(codes(story({ lens: { dof: 0.4, focus: "a", vignette: 0.3, letterbox: 0.5, handheld: 0.2, autoFocus: false } })), []);
  assert.deepEqual(codes(story({ camera: [{ at: 0, mode: "follow", move: "spin" }] })), ["E_CAMERA_MOVE"]);
  assert.deepEqual(codes(story({ params: { move: "spin" } })), ["E_CAMERA_MOVE"]);
  assert.deepEqual(codes(story({ camera: [{ at: 0, mode: "follow", focus: "zed" }] })), ["E_REF_CHARACTER"]);
  assert.deepEqual(codes(story({ lens: { focus: "zed" } })), ["E_REF_CHARACTER"]);
  assert.deepEqual(codes(story({ params: { roll: 90 } })), ["E_WORLD_PARAM"]);
  assert.deepEqual(codes(story({ params: { ease: "wobbly" } })), ["E_WORLD_PARAM"]);
  assert.ok(codes(story({ camera: [{ at: 0, mode: "follow", dolly: 9999 }] })).includes("E_SCHEMA_RANGE"));
  const v2 = { ...story(), version: 2 };
  assert.ok(validate(v2, catalog).errors.some((e) => e.code === "E_SCHEMA_UNKNOWN_FIELD"), "v2 camera keys have no lens fields");
});
