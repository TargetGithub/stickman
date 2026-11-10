import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";

// Engine requests from the 10K scripts session (10K/ENGINE_REQUESTS.md).
const catalog = loadCatalog3d();
const script = (name) => JSON.parse(readFileSync(new URL(`../../scripts/tour/${name}.json`, import.meta.url), "utf8"));

test("#2 duck, chick and hen have a named wing that point can aim", () => {
  for (const s of ["duck", "chick", "hen", "duckling"]) assert.ok(catalog.critters[s].parts.some((p) => p.name === "wing"), s);
  assert.deepEqual(validateScript(script("bird_point"), catalog).errors, []);
});

const rolls = [
  { to: [2.5, 0.33, 0], r: 0.33, axis: 2, sign: -1 },
  { to: [-2.5, 0.33, 0], r: 0.33, axis: 2, sign: 1 },
  { to: [0, 0.33, 2], r: 0.33, axis: 0, sign: 1 },
];
for (const c of rolls) {
  test(`#5 roll turns by distance / radius (${c.to})`, () => {
    const s = { kind: "video3d", version: 1, meta: { seed: 1 }, objects: [{ id: "ball", kind: "prop", model: "ball", size: 0.8, pivot: [0, c.r, 0], at: [0, c.r, 0] }],
      scenes: [{ id: "a", beats: [{ dur: 2, do: [{ do: "roll", target: "ball", to: c.to, dur: 1 }] }] }] };
    assert.deepEqual(validateScript(s, catalog).errors, []);
    const plan = compileScript(s, { catalog });
    const seg = plan.timeline ?? plan;
    const json = JSON.stringify(seg);
    const dist = Math.hypot(c.to[0], c.to[2]);
    const deg = Math.round((c.sign * dist / c.r) * (180 / Math.PI) * 1000) / 1000;
    assert.ok(json.includes(String(deg)), `rotation ${deg} in the plan`);
  });
}

test("#5 roll needs to", () => {
  const s = { kind: "video3d", version: 1, objects: [{ id: "ball", kind: "prop", model: "ball" }], scenes: [{ id: "a", beats: [{ dur: 1, do: [{ do: "roll", target: "ball" }] }] }] };
  assert.ok(validateScript(s, catalog).errors.some((e) => e.code === "E3D_REQUIRED"));
});

test("#1 hook behind a named part opens it, slowly for babies", () => {
  const s = script("hook_lid");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const json = JSON.stringify(plan);
  assert.ok(json.includes("box#lid"), "the lid part is animated");
  assert.ok(json.includes("-100"), "it turns to the default open angle");
  const fast = compileScript({ ...s, meta: { ...s.meta, audience: "k" } }, { catalog });
  assert.ok(plan.duration >= fast.duration, "the babies reveal is not shorter");
});

const hookBad = [
  [{ behind: "box#door" }, /no named part "door"/],
  [{ behind: "box#lid", style: "lift" }, /must be "open"/],
  [{ behind: "box", style: "open" }, /needs behind to be a named part/],
  [{ behind: "box#lid", open: [1, 2] }, /open must be/],
];
for (const [patch, re] of hookBad) {
  test(`#1 hook part errors: ${JSON.stringify(patch)}`, () => {
    const s = structuredClone(script("hook_lid"));
    Object.assign(s.scenes[0].beats[0].do[0], patch);
    assert.match(validateScript(s, catalog).errors.map((e) => e.message).join("\n"), re);
  });
}

const boxes = [
  ["prop", "swing", { maxW: 2.0, minH: 1.4 }],
  ["prop", "slide", { maxD: 1.0 }],
  ["prop", "kite", { maxW: 1.2, maxD: 0.5 }],
  ["critter", "giraffe", { minH: 2.0 }],
  ["critter", "bear", { minH: 1.2, maxW: 0.9 }],
];
for (const [kind, name, lim] of boxes) {
  test(`#3 model box of ${name} is tight (shot frames it, not the park)`, async () => {
    const { localBounds } = await import("../../runtime/bounds.js");
    const b = localBounds({ kind, [kind === "prop" ? "model" : "species"]: name, size: 1 }, catalog);
    const [w, h, d] = b.min.map((x, i) => b.max[i] - x);
    if (lim.maxW) assert.ok(w <= lim.maxW, `width ${w}`);
    if (lim.maxD) assert.ok(d <= lim.maxD, `depth ${d}`);
    if (lim.minH) assert.ok(h >= lim.minH, `height ${h}`);
  });
}

test("#10 lie rests a critter on the floor and stands it up again", () => {
  const s = script("lie_down");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const v = (id, prop, t) => plan.timeline.valueAt(id, prop, t);
  assert.ok(v("bunny", "rotation", 1.5)[2] === 90, "on its side");
  assert.ok(v("bunny", "position", 1.5)[1] > 0.1, "lifted by its half width");
  assert.deepEqual(v("bear", "rotation", 1.5), [-90, 0, 90]);
  assert.deepEqual(v("bear", "position", 3.4), [0.6, 0, 0.3], "stands again");
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].pose = "sit";
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_LIE"));
});

test("#8 kite_landed rests on the ground", async () => {
  const { localBounds } = await import("../../runtime/bounds.js");
  const b = localBounds({ kind: "prop", model: "kite_landed", size: 1 }, catalog);
  assert.ok(b.min[1] >= 0 && b.max[1] < 1.4, `kite spans ${b.min[1]}..${b.max[1]}`);
});

test("#7 shot looks down on flat targets unless height is given", () => {
  const base = (target, extra = {}) => ({ kind: "video3d", version: 1, meta: { seed: 1 }, stage: { preset: "garden" },
    objects: [{ id: "pond", kind: "shape", shape: "disc", color: "pond", at: [0, 0, 0], scale: [3, 0.3, 2] }, { id: "bear", kind: "critter", species: "bear", at: [3, 0, 0] }],
    scenes: [{ id: "a", beats: [{ dur: 2, do: [{ do: "shot", target, dur: 1, ...extra }] }] }] });
  const elev = (s) => {
    const p = compileScript(s, { catalog });
    const pos = p.timeline.valueAt("camera", "position", 1.5);
    const look = p.timeline.valueAt("camera", "lookAt", 1.5);
    return Math.atan2(pos[1] - look[1], Math.hypot(pos[0] - look[0], pos[2] - look[2])) * (180 / Math.PI);
  };
  assert.ok(Math.abs(elev(base("pond")) - 35) < 1);
  assert.ok(Math.abs(elev(base("bear")) - 8) < 1);
  assert.ok(Math.abs(elev(base("pond", { height: 12 })) - 12) < 1);
});

const shoutCases = [
  ["Zip, zip!", "babies", "shout"],
  ["Splash!", "babies", "shout"],
  ["The bunny zips up her coat.", "babies", undefined],
  ["Zip, zip!", "k", undefined],
];
for (const [text, audience, want] of shoutCases) {
  test(`#9 caption style for "${text}" (${audience})`, async () => {
    const { captionStyle } = await import("../../runtime/compile.js");
    assert.equal(captionStyle(text, { audience }), want);
  });
}

test("#11 shot frames where a target moving in the same beat ends up; #14 a pop before a challenge's options", () => {
  const s = { kind: "video3d", version: 1, meta: { seed: 1 },
    objects: [{ id: "bear", kind: "critter", species: "bear", at: [-4, 0, 0] }, { id: "a", kind: "prop", model: "apple", at: [1, 0, 0], hidden: true }, { id: "b", kind: "prop", model: "apple", at: [2, 0, 0], hidden: true }],
    scenes: [{ id: "s", beats: [
      { dur: 3, do: [{ do: "shot", target: "bear", dur: 1.5 }, { do: "move", target: "bear", to: [4, 0, 0], dur: 1 }] },
      { dur: 8, do: [{ do: "challenge", prompt: "Which one?", options: ["a", "b"], answer: "a", dur: 3 }, { do: "pop", target: "a" }, { do: "pop", target: "b" }] },
    ] }] };
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const p = compileScript(s, { catalog });
  assert.equal(p.timeline.valueAt("camera", "lookAt", 1.5)[0], 4);
  for (const t of [3.5, 5, 7]) assert.ok(p.timeline.valueAt("a", "scale", t)[0] > 0.9, `option visible at ${t}`);
});

test("#13 keyword badges take a shape", () => {
  const s = script("keyword_shapes");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  assert.ok(plan.objects.some((o) => o.kind === "shape" && o.shape === "bottle" && o.hud), "a bottle on a HUD badge");
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].shape = "nope_shape";
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_SHAPE"));
});

test("#12 a checklist tracker is only as wide as its labels need", async () => {
  const { trackerLayout } = await import("../../runtime/retain_layout.js");
  const w = (labels) => trackerLayout({ style: "checklist", slots: labels.length, labels }).width;
  assert.equal(w(["Up", "Go"]), 1.6);
  assert.ok(Math.abs(w(["Add", "Count"]) - 2.1) < 1e-9);
  assert.ok(w(["Point to G"]) > w(["Add"]));
  assert.equal(w(["A very long step!"]), 3.3);
});

test("#16 fog rolls in and lifts on the stage's fog track", () => {
  const s = script("fog");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const thick = plan.timeline.valueAt("stage", "fog", 2.5);
  assert.ok(thick[0] <= 3.01 && thick[1] <= 20.01, `thick fog ${thick}`);
  assert.equal(plan.stage.fogAction, true);
  const clear = plan.timeline.valueAt("stage", "fog", 5.9);
  assert.ok(clear[1] > 50, `cleared ${clear}`);
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].amount = 2;
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_RANGE"));
});

test("#25 shot frames cards and pages by their real (upright) size, straight on", () => {
  const s = script("shot_cards");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const p = compileScript(s, { catalog });
  for (const t of [2, 4.2]) {
    const pos = p.timeline.valueAt("camera", "position", t);
    const look = p.timeline.valueAt("camera", "lookAt", t);
    const elev = Math.atan2(pos[1] - look[1], Math.hypot(pos[0] - look[0], pos[2] - look[2])) * (180 / Math.PI);
    const dist = Math.hypot(...pos.map((x, i) => x - look[i]));
    assert.ok(elev < 12, `upright target seen nearly straight on (${elev.toFixed(1)}°)`);
    assert.ok(dist < 7, `close enough (${dist.toFixed(2)} m)`);
  }
});

test("#59 challenge hideWrong keeps wrong options hidden after the praise; keywords on kit prompts; sineOut", async () => {
  const { EASE_NAMES } = await import("../../runtime/ease.js");
  assert.ok(EASE_NAMES.includes("sineOut") && EASE_NAMES.includes("sineIn"));
  const s = { kind: "video3d", version: 1, meta: { seed: 1 },
    objects: [{ id: "a", kind: "prop", model: "apple", at: [-1, 0, 0] }, { id: "b", kind: "prop", model: "apple", at: [1, 0, 0] }],
    scenes: [{ id: "s", beats: [{ dur: 10, do: [{ do: "challenge", prompt: "Which apple is red?", keywords: { apple: "apple" }, options: ["a", "b"], answer: "a", dur: 2, praise: "Yes, that one!", hideWrong: true }] }] }] };
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const p = compileScript(s, { catalog });
  assert.equal(p.timeline.valueAt("b", "visible", p.duration - 0.6), false);
  assert.ok(p.timeline.valueAt("a", "visible", p.duration - 0.6));
  assert.ok(p.objects.some((o) => o.kind === "badge"), "a keyword badge for apple");
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].keywords = { pear: "apple" };
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_KEYWORD"));
});

test("#50 thumbnail camera auto frames every object and keeps the title side clear; silent_e colour", async () => {
  const { thumbnailScript } = await import("../../runtime/thumbnails.js");
  const s = script("thumb_auto");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  assert.ok(catalog.colors.silent_e);
  const ts = thumbnailScript(s, s.meta.thumbnails[0]);
  const room = ts.objects.find((o) => o.id === "thumb_room");
  assert.ok(room.at[0] < -2.6, "the empty spot is on the title's (left) side");
  const shot = ts.scenes[0].beats[0].do.find((a) => a.do === "shot");
  assert.deepEqual(shot.target, ["fox", "w", "bunny", "thumb_room"]);
  const p = compileScript(ts, { catalog });
  assert.ok(p.timeline.valueAt("camera", "lookAt", 1)[0] < 0, "the camera looks left of the scene so it sits right of the title");
});

test("#65 stage.hide drops set pieces (and prefix*), stage.move places them; thumbnails keep them; bad ids are errors", async () => {
  const { stageSet } = await import("../../runtime/stage_set.js");
  const { thumbnailScript } = await import("../../runtime/thumbnails.js");
  const stage = { preset: "fox_workshop", hide: ["machine", "window_*"], move: { plant: { at: [9, 0, -5] } } };
  const set = stageSet(stage, catalog);
  assert.ok(!set.some((o) => o.id === "set_machine" || o.id.startsWith("set_window_")));
  assert.deepEqual(set.find((o) => o.id === "set_plant").at, [9, 0, -5]);
  const th = thumbnailScript({ stage, meta: {} }, { name: "a", stage: "fox_workshop", camera: "auto", objects: [{ id: "x", kind: "shape", shape: "cube" }] });
  assert.deepEqual(th.stage.hide, stage.hide);
  const s = { kind: "video3d", version: 1, description: "x", meta: { title: "t", seed: 1 }, stage: { preset: "fox_workshop", hide: ["nope"], move: { plant: { at: [1, 2] } } }, camera: { position: [0, 1.5, 9], lookAt: [0, 1, 0], fov: 40 }, objects: [], scenes: [{ id: "a", beats: [{ dur: 1, do: [] }] }] };
  assert.deepEqual(validateScript(s, catalog).errors.map((e) => e.path), ["stage.hide[0]", "stage.move.plant.at"]);
});

test("#67 emphasize after a retext finds and marks words on the new text", () => {
  const s = script("emphasize_retext");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const card = compileScript(s, { catalog }).objects.find((o) => o.id === "line_text");
  assert.deepEqual(card.marks, [{ words: [3, 3], color: "yellow" }, { words: [3, 6], color: "pink", text: 1 }]);
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[2].words = "nap on a rug";
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_EMPHASIZE"));
});

test("#68 school_stage, dress_form, hook revealing a group; #78 hook with no cover out of a slot, answerWho", () => {
  assert.ok(catalog.stages.school_stage.set.length > 20 && catalog.lights.stage_bright);
  assert.ok(catalog.props.dress_form.parts.some((p) => p.name === "torso"));
  const s = script("school_stage_hooks");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const tl = plan.timeline;
  const shown = (id) => plan.duration && [...Array(120).keys()].map((i) => (i / 120) * plan.duration).find((t) => tl.valueAt(id, "visible", t));
  assert.ok(shown("t1") < shown("t2") && shown("t2") < shown("t3"), "the group pops in turn");
  assert.deepEqual(tl.valueAt("mach#slot", "rotation", plan.duration), [0, 0, 0], "style none moves no cover");
  assert.ok(tl.valueAt("print", "position", plan.duration)[2] > 1, "out slides the print toward the camera");
  assert.ok(plan.lines.some((l) => l.text === "Cat!" && l.who === "bear"), "answerWho speaks the answer");
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].target = ["t1", "t2", "t3", "box", "mach"];
  bad.scenes[0].beats[1].do[0].style = "slide";
  const codes = validateScript(bad, catalog).errors.map((e) => e.path);
  assert.ok(codes.includes("scenes[0].beats[0].do[0].target") && codes.includes("scenes[0].beats[1].do[0].style"), codes.join());
});
