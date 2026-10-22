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

test("cutsKey: a travel cut during the opening wide keeps the wide (no one-frame medium)", () => {
  const cuts = createCuts(paceOf({ ...v3, pace: { establish: 3 } }));
  const auto = { t0: 0, active: new Map(), close: null };
  const actors = [actor("kai", 1000)];
  const at = (t) => cutsKey(auto, cuts, actors, t, () => ["kai"]);
  assert.equal(at(0.5).mode, "wide");
  cutsEvent(cuts, { type: "travelCut" }, 2.2);
  const k = at(2.2);
  assert.deepEqual([k.mode, k.cut], ["wide", true]);
  assert.equal(at(2.3).mode, "wide");
  assert.equal(at(3.5).mode, "medium", "the medium comes once the wide is over");
});

test("cutsKey: minCut spaces the cuts, reactions false keeps the speaker, and an action medium holds minCut", () => {
  const cases = [
    // [pace, second line at, expect a cut on it]
    [{}, 3.2, true], // default minCut = shot[0] / 2 = 1 s
    [{ minCut: 3 }, 3.2, false], // 1.1 s after the first cut: too soon
    [{ minCut: 3 }, 5.2, true],
  ];
  for (const [block, t2, cut] of cases) {
    const cuts = createCuts(paceOf({ ...v3, pace: block }));
    const auto = { t0: 0, active: new Map(), close: null };
    const actors = [actor("kai", 1000), actor("mo", 1200)];
    const at = (t) => cutsKey(auto, cuts, actors, t, () => []);
    cutsEvent(cuts, { type: "say", actor: "kai", to: "mo", dur: 0.9 }, 2.1);
    at(2.1);
    cutsEvent(cuts, { type: "say", actor: "mo", to: "kai", dur: 2 }, t2);
    assert.equal(at(t2).favor === "mo", cut, JSON.stringify(block) + " @" + t2);
  }
  const quiet = createCuts(paceOf({ ...v3, pace: { reactions: false } }));
  const auto = { t0: 0, active: new Map(), close: null };
  const actors = [actor("kai", 1000), actor("mo", 1200)];
  cutsEvent(quiet, { type: "say", actor: "kai", to: "mo", dur: 9 }, 2.1);
  const first = cutsKey(auto, quiet, actors, 2.1, () => []);
  assert.equal(cutsKey(auto, quiet, actors, 8, () => []), first, "no reaction close-up");
  // Action: who is acting flips at 6.4 s, 0.4 s after a cut to kai; with minCut 2 the shot holds until 8 s.
  const act = createCuts(paceOf({ ...v3, pace: { minCut: 2, establish: 0 } }));
  let ids = ["kai"];
  const key = (t) => cutsKey(auto, act, actors, t, () => ids);
  assert.deepEqual(key(6).targets, ["kai"]);
  ids = ["mo"];
  assert.deepEqual(key(6.4).targets, ["kai"], "held");
  assert.deepEqual(key(8.1).targets, ["mo"], "then cuts");
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

test("pace.glide: the paced camera glides between framings instead of cutting; cut-to-arrival still cuts", () => {
  const cutLog = run(pacedStory({})).engine.getCameraLog();
  const glideLog = run(pacedStory({ glide: 1 })).engine.getCameraLog();
  const hard = (log) => log.filter((e) => e.cut && e.mode !== "travelCut" && e.t > 0.1).length;
  assert.ok(hard(cutLog) > 0, "without glide the auto camera cuts");
  assert.ok(glideLog.some((e) => e.glide), "with glide it glides");
  const travelTimes = glideLog.filter((e) => e.mode === "travelCut").map((e) => e.t);
  assert.ok(glideLog.filter((e) => e.glide && e.cut && e.t > 0.1).every((e) => travelTimes.includes(e.t)), "after the first frame, a glide is only a cut where a travel cut lands on it");
  assert.ok(hard(glideLog) < hard(cutLog), "fewer hard cuts");
  assert.equal(glideLog.filter((e) => e.mode === "travelCut").length, cutLog.filter((e) => e.mode === "travelCut").length, "travel cuts unchanged");
});

test("cutsKey: a speaker outside the shot is brought in at once (quick), even inside minCut; a split line keeps its shot", () => {
  const cuts = createCuts(paceOf({ ...v3, pace: { minCut: 3, establish: 0 } }));
  const auto = { t0: 0, active: new Map(), close: null };
  const actors = [actor("dony", 1000), actor("doopi", 1200), actor("mooka", 1400)];
  const at = (t) => cutsKey(auto, cuts, actors, t, () => []);
  cutsEvent(cuts, { type: "say", actor: "dony", to: "doopi", dur: 3 }, 1);
  assert.deepEqual(at(1).targets, ["dony", "doopi"]);
  cutsEvent(cuts, { type: "say", actor: "doopi", to: "dony", dur: 1 }, 4.2);
  const cu = at(4.2); // over the shoulder: dony and doopi
  cutsEvent(cuts, { type: "say", actor: "doopi", to: "dony", dur: 0.8 }, 5.3); // the next sentence of the same line
  assert.equal(at(5.3), cu, "the same speaker's next bubble keeps the shot");
  cutsEvent(cuts, { type: "say", actor: "mooka", to: "dony", dur: 1 }, 6.2); // 2 s after the last cut, mooka unseen
  const k = at(6.2);
  assert.ok(k.target === "mooka" || k.targets?.includes("mooka"), JSON.stringify(k));
  assert.equal(k.quick, true);
});

test("W_SPEAKER_OFFSCREEN: a line spoken during a script shot of someone else is warned about (keepSpeakers false)", () => {
  const story = pacedStory({ establish: 0, keepSpeakers: false });
  const beats = story.scenes[0].beats;
  beats.push({ id: "cu", at: { with: "d", delay: 0.1 }, who: "world", do: "shot", params: { mode: "close_up", target: "kai", dur: 30 } });
  const r = validate(story, catalog);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.ok(r.warnings.some((w) => w.code === "W_SPEAKER_OFFSCREEN" && w.message.includes("'mo'")), JSON.stringify(r.warnings.map((w) => w.code)));
  assert.ok(!validate(pacedStory({}), catalog).warnings.some((w) => w.code === "W_SPEAKER_OFFSCREEN"), "the auto camera alone keeps speakers in shot");
});

test("cutsKey: two lines at once frame both speakers; a face close-up gives way to another speaker", () => {
  const cuts = createCuts(paceOf({ ...v3, pace: { establish: 0 } }));
  const actors = [actor("kai", 1000), actor("mo", 1200), actor("zed", 1500)];
  const auto = { t0: 0, active: new Map(), close: null };
  const at = (t) => cutsKey(auto, cuts, actors, t, () => []);
  cutsEvent(cuts, { type: "say", actor: "kai", to: "mo", dur: 2 }, 1);
  at(1);
  cutsEvent(cuts, { type: "say", actor: "zed", dur: 1 }, 1.5); // over kai's line
  assert.deepEqual(at(1.5).targets, ["zed", "kai"]);
  auto.close = { target: "mo", until: 9 }; // a face change close-up on mo
  cutsEvent(cuts, { type: "say", actor: "kai", to: "zed", dur: 1 }, 5);
  const k = at(5);
  assert.ok(k.target === "kai" || k.targets?.includes("kai"), JSON.stringify(k));
});

test("a script shot gives way to a speaker it leaves out (pace keepSpeakers), and holds with keepSpeakers false", () => {
  const story = (keep) => {
    const s = pacedStory({ establish: 0, ...(keep === false ? { keepSpeakers: false } : {}) });
    s.scenes[0].beats.push({ id: "cu", at: { with: "d", delay: 0.1 }, who: "world", do: "shot", params: { mode: "close_up", target: "kai", dur: 30 } });
    return s;
  };
  const offscreen = (keep) => validate(story(keep), catalog).warnings.filter((w) => w.code === "W_SPEAKER_OFFSCREEN").length;
  assert.equal(offscreen(true), 0);
  assert.ok(offscreen(false) > 0);
});
