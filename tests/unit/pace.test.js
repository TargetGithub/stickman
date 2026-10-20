// Pace (ADR-038): opt-in preschool-show timing for version 3 stories: resolution, travel speed, cut-to-arrival,
// dialogue timing, the cutting auto camera, subtitles and the TTS durations.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PACE_DEFAULTS, paceOf, pacedOpts, moveSpeed, pacedReadingTime, talkFor, subtitlesOn, PACED_MIN } from "../../engine/story/pace.js";
import { createCuts, cutsEvent, cutsKey } from "../../engine/camera_cuts.js";
import { sentences } from "../../engine/renderer/subtitles.js";
import { createEngine, compileScript, validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";
import { collectLines, injectDurations } from "../../tools/lib/tts/lines.mjs";
import { loadVoiceTable } from "../../tools/lib/tts/index.mjs";

const v3 = { v3: true, meta: {} };

test("paceOf: only version 3 with a pace block; scenes merge over the script or turn it off", () => {
  for (const [story, scene, want] of [
    [{ version: 2, pace: {} }, {}, null],
    [{ v3: true }, {}, null],
    [{ ...v3, pace: {} }, { pace: false }, null],
    [{ ...v3, pace: {} }, {}, { moves: 1.25, gap: 0.2, walk: 1.7 }],
    [{ ...v3, pace: { gap: 0.3, travel: { walk: 2 } } }, {}, { moves: 1.25, gap: 0.3, walk: 2 }],
    [{ ...v3, pace: { gap: 0.3 } }, { pace: { gap: 0.1, moves: 1.1 } }, { moves: 1.1, gap: 0.1, walk: 1.7 }],
    [{ version: 3, pace: {}, meta: {} }, {}, { moves: 1.25, gap: 0.2, walk: 1.7 }],
  ]) {
    const p = paceOf(story, scene);
    if (want === null) assert.equal(p, null);
    else assert.deepEqual({ moves: p.moves, gap: p.gap, walk: p.travel.walk }, want);
  }
  assert.equal(paceOf({ ...v3, pace: {}, meta: { speech: "tts" } }).speech, true);
});

test("pacedOpts: travel steps faster and further (speed x stride = factor); cycles keep their ground; others unchanged", () => {
  const pace = paceOf({ ...v3, pace: {} });
  for (const name of ["walk", "run", "sneak", "tiptoe"]) {
    const o = pacedOpts(pace, name, { params: { distance: 500 } });
    assert.ok(Math.abs(o.speed * o.stride - PACE_DEFAULTS.travel[name]) < 1e-9, name);
  }
  const byCycles = pacedOpts(pace, "walk", { params: { cycles: 2 } });
  assert.deepEqual([byCycles.speed, byCycles.stride], [1.7, 1]);
  const jab = { params: {} };
  assert.equal(pacedOpts(pace, "jab", jab), jab);
});

test("moveSpeed: gestures speed up; attacks, holds, loops, pairs, speaking and timed beats do not", () => {
  const pace = paceOf({ ...v3, pace: {} });
  const def = (category, flags = {}, extra = {}) => ({ name: "x", category, flags, ...extra });
  for (const [d, beat, want] of [
    [def("emote"), {}, 1.25],
    [def("attack"), {}, undefined],
    [def("emote", { durationParam: "seconds" }), {}, undefined],
    [def("emote", { loop: true }), {}, undefined],
    [def("emote", {}, { pair: {} }), {}, undefined],
    [def("emote"), { say: "Hi" }, undefined],
    [def("emote"), { speed: 0.8 }, undefined],
  ]) assert.equal(moveSpeed(pace, d, beat), want);
  assert.equal(moveSpeed(null, def("emote"), {}), undefined);
});

test("reading time, talk timing and subtitles", () => {
  assert.equal(pacedReadingTime("Hi"), 1);
  assert.ok(Math.abs(pacedReadingTime("x".repeat(40)) - 2.5) < 1e-9);
  for (const s of [0.6, 1, 1.7, 2.5, 4.1]) {
    const { cycles, speed } = talkFor(s);
    assert.ok(Math.abs((cycles * 0.8) / speed - s) < 0.01, `talk ends with a ${s}s line`);
    assert.ok(speed >= 0.6 && speed <= 1.5);
  }
  assert.equal(subtitlesOn(null), false);
  assert.equal(subtitlesOn({ captions: "auto", speech: true }), true);
  assert.equal(subtitlesOn({ captions: "auto", speech: false }), false);
  assert.equal(subtitlesOn({ captions: "subtitles", speech: false }), true);
  assert.equal(subtitlesOn({ captions: "bubbles", speech: true }), false);
});

test("sentences: the bubbles of one line join into one subtitle; finished sentences and other speakers do not", () => {
  const says = [
    { actor: "a", text: "Dony, you are the best friend in", videoT: 1, dur: 2 },
    { actor: "a", text: "the whole valley!", videoT: 3.05, dur: 1 },
    { actor: "b", text: "Thanks!", videoT: 4.2, dur: 1 },
    { actor: "b", text: "Really.", videoT: 5.25, dur: 1 },
  ];
  const out = sentences(says);
  assert.deepEqual(out.map((s) => s.text), ["Dony, you are the best friend in the whole valley!", "Thanks!", "Really."]);
  assert.ok(Math.abs(out[0].dur - 3.05) < 1e-9);
});

const actor = (id, x) => ({ id, x, hidden: false, facing: 1, vx: 0, joints: {} });

test("cutsKey: establish wide, medium two-shot, then shot/reverse-shot cuts and a reaction on long lines", () => {
  const pace = paceOf({ ...v3, pace: {} });
  const auto = { t0: 0, active: new Map(), close: null };
  const cuts = createCuts(pace);
  const actors = [actor("kai", 1000), actor("mo", 1200)];
  const ids = () => [];
  const at = (t) => cutsKey(auto, cuts, actors, t, ids);
  assert.equal(at(0.5).mode, "wide");
  cutsEvent(cuts, { type: "say", actor: "kai", to: "mo", dur: 1.5 }, 2.1);
  const k1 = at(2.1);
  assert.deepEqual([k1.mode, k1.targets, k1.cut], ["medium", ["kai", "mo"], true]);
  cutsEvent(cuts, { type: "say", actor: "mo", to: "kai", dur: 6 }, 3.8);
  const k2 = at(3.8);
  assert.deepEqual([k2.mode, k2.favor, k2.cut], ["medium", "mo", true], "over the listener's shoulder");
  assert.equal(at(5), k2, "holds while the line runs");
  const k3 = at(8);
  assert.deepEqual([k3.mode, k3.target, k3.cut], ["close_up", "kai", true], "a reaction close-up on a long line");
  cutsEvent(cuts, { type: "say", actor: "kai", to: "mo", dur: 1 }, 10);
  assert.deepEqual([at(10).mode, at(10).target], ["close_up", "kai"]);
  cutsEvent(cuts, { type: "travelCut" }, 20);
  assert.equal(at(20).cut, true, "a travel cut always cuts");
});

const pacedStory = (pace, extra = {}) => ({
  version: 3,
  meta: { title: "Pace", format: "landscape", seed: 3, kind: "clip", audience: "kids", autoCamera: "story" },
  ...(pace ? { pace } : {}),
  cast: [{ id: "kai", color: "#1a5fd8" }, { id: "mo", color: "#7a2ab8" }],
  locations: [{ id: "park", theme: "city_park", stageWidth: 4000 }],
  scenes: [{
    id: "one", location: "park", cast: [{ id: "kai", x: 400, facing: 1 }, { id: "mo", x: 2600, facing: -1 }],
    beats: [
      { id: "w", at: 0.3, who: "kai", do: "walk", to: { near: "mo" } },
      { id: "d", at: { after: "w" }, macro: "dialogue", params: { lines: [["kai", "Hello there, my good friend Mo!"], ["mo", "Hi Kai! Shall we play?"]] } },
      { id: "v", at: { after: "d" }, who: "mo", do: "wave" },
    ],
    ...extra,
  }],
});

function run(script) {
  const engine = createEngine({ catalog });
  const r = engine.load(script);
  assert.ok(r.ok, JSON.stringify(r.errors));
  const span = (id) => {
    const a = engine.getAnchors().filter((x) => x.beatId === id);
    return a.find((x) => x.anchor === "end").videoT - a.find((x) => x.anchor === "start").videoT;
  };
  return { engine, r, span };
}

test("a paced scene is shorter: the long walk cuts to the arrival, the dialogue is tighter, the camera cuts", () => {
  const slow = run(pacedStory(null));
  const fast = run(pacedStory({}));
  assert.ok(slow.span("w") > 10, `unpaced walk ${slow.span("w")}`);
  assert.ok(fast.span("w") < 3, `paced walk ${fast.span("w")}`);
  assert.ok(fast.r.durationSec < slow.r.durationSec * 0.5, `${fast.r.durationSec} vs ${slow.r.durationSec}`);
  assert.ok(fast.engine.getEvents().some((e) => e.type === "travelCut"));
  const cuts = fast.engine.getCameraLog().filter((c) => c.cut).length;
  assert.ok(cuts >= 4, `cuts ${cuts}`);
  assert.ok(!validate(pacedStory({}), catalog).warnings.some((w) => w.code.startsWith("W_PACE")));
});

test("a scene with pace false runs exactly as without a pace", () => {
  const off = run(pacedStory({}, { pace: false }));
  const none = run(pacedStory(null));
  assert.equal(off.r.durationSec, none.r.durationSec);
  assert.deepEqual(off.engine.getAnchors(), none.engine.getAnchors());
});

test("the v2 schema has no pace; a v3 pace is checked", () => {
  const v2 = { ...pacedStory({}), version: 2 };
  assert.ok(!validate(v2, catalog).ok);
  assert.ok(!validate(pacedStory({ captions: "loud" }), catalog).ok);
  assert.ok(!validate(pacedStory({}, { pace: { shot: [1] } }), catalog).ok);
});

test("injectDurations under a pace: the voice alone sets the line, and the talk gesture ends with it", () => {
  const compiled = compileScript(pacedStory({}), catalog).script;
  const lines = collectLines(compiled, loadVoiceTable());
  injectDurations(compiled, lines.map((l) => ({ ...l, dur: 0.9 })));
  for (const l of lines) {
    const parts = (l.parts ?? [{ beat: l.beat }]).map((p) => compiled.scenes[l.scene].beats[p.beat]);
    for (const b of parts) {
      assert.ok(b.sayDur >= PACED_MIN && b.sayDur < 1.2, `${b.say}: ${b.sayDur}`);
      assert.ok(Math.abs((b.params.cycles * 0.8) / b.speed - b.sayDur) < 0.02);
    }
  }
  const v = validate(compiled, catalog);
  assert.ok(v.ok && !v.warnings.some((w) => w.code === "W_DIALOGUE_FAST"), JSON.stringify(v.warnings.map((w) => w.code)));
});
