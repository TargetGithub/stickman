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
  const shot = ts.scenes[0].beats[0].do.find((a) => a.do === "shot");
  assert.deepEqual([shot.target, shot.clear], [["fox", "w", "bunny"], "left"], "#90: the shot itself keeps the title side clear");
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

test("#71 stress: rings spread from the syllable and fade, the syllable swells; bad chars are errors", () => {
  const s = script("stress_ring");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const rings = plan.objects.filter((o) => o.id.startsWith("w1~ring"));
  assert.equal(rings.length, 3);
  const tl = plan.timeline;
  assert.equal(tl.valueAt(rings[0].id, "visible", 0.4), false);
  assert.equal(tl.valueAt(rings[0].id, "visible", 0.6), true);
  assert.ok(tl.valueAt(rings[0].id, "fade", 1.2) < 0.3 && tl.valueAt(rings[0].id, "scale", 1.0)[0] > rings[0].scale[0]);
  assert.ok(tl.valueAt("w1#c1", "scale", 0.68)[0] > 1.1 && tl.valueAt("w1#c4", "scale", 0.68)[0] === 1, "only the stressed syllable swells");
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].chars = [7];
  bad.scenes[0].beats[0].do[1].count = 9;
  assert.deepEqual(validateScript(bad, catalog).errors.map((e) => e.code), ["E3D_CHARS", "E3D_RANGE"]);
});

test("#73 choices stack long answers and row short ones; a beat with dur fit lasts until its last move", () => {
  const s = script("choices_fit");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const at = (id) => plan.objects.find((o) => o.id === id).at;
  assert.ok(at("short_o1")[1] === at("short_o3")[1] && at("short_o1")[0] < at("short_o3")[0], "short answers in a row");
  assert.ok(at("long_o1")[0] === at("long_o3")[0] && at("long_o1")[1] > at("long_o3")[1], "long answers stacked, first on top");
  assert.ok(Math.abs(plan.timeline.valueAt("ball", "position", 2.75)[0] - 4) < 1e-9);
  const beat2 = plan.lines[0].t; // the challenge prompt starts its beat
  assert.ok(beat2 >= 2.7 && beat2 < 3.2, `fit beat ends after the 2.7 s move (${beat2})`);
  const bad = structuredClone(s);
  bad.objects[0].options = ["one"];
  bad.scenes[0].beats[0].dur = "long";
  const codes = validateScript(bad, catalog).errors.map((e) => e.code);
  assert.ok(codes.includes("E3D_OPTIONS") && codes.includes("E3D_RANGE"), codes.join());
});

test("#80 a letter riding in a train_car stands on its lowest point; #75 the train docs say which way it faces", () => {
  const s = { kind: "video3d", version: 1, description: "x", meta: { title: "t", seed: 1 }, camera: { position: [0, 1.5, 9], lookAt: [0, 1, 0], fov: 40 },
    objects: [{ id: "car", kind: "prop", model: "train_car" }, { id: "g", kind: "letter", text: "g", parent: "car", at: [0, 0.22, 0] }, { id: "b", kind: "letter", text: "b", parent: "car", at: [0, 0.22, 0], lift: "baseline" }],
    scenes: [{ id: "a", beats: [{ dur: 1, do: [] }] }] };
  const plan = compileScript(s, { catalog });
  assert.equal(plan.objects.find((o) => o.id === "g").lift, "descender");
  assert.equal(plan.objects.find((o) => o.id === "b").lift, "baseline", "an explicit lift wins");
  assert.match(catalog.props.train_engine.description, /\[0, 180, 0\]/);
});

test("#79 textSize grows name tags, retext on a number_block, swap letters and tiles; #82 pictureRotation; #83 rowing_boat takes color", async () => {
  const { expandComposite } = await import("../../runtime/composite.js");
  const text = (o) => expandComposite({ id: "n", kind: "card", ...o }, catalog).objects.find((x) => x.id === "n_text");
  assert.ok(text({ style: "name_tag", text: "Pip", textSize: 0.3 }).width > 2 * text({ style: "name_tag", text: "Pip" }).width);
  const pic = expandComposite({ id: "n", kind: "card", text: "bike", picture: "bike", pictureRotation: [0, 90, 0] }, catalog).objects.find((x) => x.id === "n_pic");
  assert.deepEqual([pic.rotation, pic.scale], [[0, 90, 0], [0.4, 1, 1]], "turned a quarter, flattened along its own x");
  assert.ok(expandComposite({ id: "n", kind: "card", picture: "bike", pictureRotation: [10, 90, 5] }, catalog).errors.some((e) => e.code === "E3D_VEC"));
  assert.ok(!catalog.props.rowing_boat.parts[0].c, "the hull is the main colour");
  const s = script("cards_swap");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  assert.deepEqual(plan.objects.find((o) => o.id === "nb").texts, ["6", "7"]);
  const tl = plan.timeline;
  const x1 = tl.valueAt("w#c1", "position", 2.9)[0];
  const x4 = tl.valueAt("w#c4", "position", 2.9)[0];
  assert.ok(x1 > 0.5 && Math.abs(x1 + x4) < 1e-9, "s and p trade places");
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  assert.ok(near(tl.valueAt("ta", "position", 2.9), [2.4, 0, 1.5]) && near(tl.valueAt("tb", "position", 2.9), [1.4, 0, 1.5]), "the tiles trade places");
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].text = "seven";
  bad.scenes[0].beats[0].do[1].chars = [2, 2];
  bad.scenes[0].beats[0].do[2].with = "c1_text";
  assert.deepEqual(validateScript(bad, catalog).errors.map((e) => e.code), ["E3D_TEXT", "E3D_CHARS", "E3D_SWAP"]);
});

test("#95 base: true sits a turned shape on at like a prop (lowest point on at, middle over it)", async () => {
  const { baseAt } = await import("../../runtime/start_pose.js");
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-3);
  assert.deepEqual(baseAt({ shape: "box", at: [1, 0, 2] }), [1, 0, 2], "unturned shapes already stand on at");
  assert.ok(near(baseAt({ shape: "box", at: [0, 0, 0], rotation: [0, 0, 45] }), [0.3536, 0.3536, 0]), "a tipped cube rests on its corner");
  assert.ok(near(baseAt({ shape: "torus", at: [0, 0, 0], rotation: [90, 0, 0] }), [0, 0.15, -0.5]), "a torus laid flat sits centred");
  assert.ok(near(baseAt({ shape: "dome", at: [0, 0, 0], rotation: [180, 0, 0] }), [0, 0.5, 0]), "an upturned dome is a bowl on the floor");
  const s = script("shape_base");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  assert.ok(near(compileScript(s, { catalog }).timeline.valueAt("e", "position", 0), [3, 0.15, -0.5]));
});

test("#96 a long word on a word_train keeps a readable tile in a stretched car; short words keep the old spacing", async () => {
  const { expandComposite } = await import("../../runtime/composite.js");
  const o = expandComposite({ id: "t", kind: "word_train", words: ["the", "caterpillar", "ate"] }, catalog).objects;
  const get = (id) => o.find((x) => x.id === id);
  assert.ok(get("t_w2").size >= 0.6 && get("t_car2").scale[0] > 1.3);
  assert.ok(Math.abs(get("t_w2").scale[0] * get("t_car2").scale[0] - 1) < 0.01, "the rider is not stretched");
  assert.equal(get("t_car3").at[0], -1.2, "the last car still sits 1.2 m behind the engine");
  const short = expandComposite({ id: "s", kind: "word_train", words: ["a", "cat"] }, catalog).objects;
  assert.deepEqual(short.filter((x) => /_car\d$/.test(x.id)).map((x) => x.at[0]), [-2.4, -1.2]);
  assert.deepEqual(validateScript(script("word_train_long"), catalog).errors, []);
});

test("#97 book faces show only while open (no picture through a page); pageLayout gives a page's size and line spots", async () => {
  const s = script("book_sign_train");
  const plan = compileScript(s, { catalog });
  const tl = plan.timeline;
  const shown = (t) => plan.objects.map((o) => o.id).filter((id) => /^bk_.*(pic|text)$/.test(id) && tl.valueAt(id, "visible", t));
  assert.deepEqual(shown(0.5).sort(), ["bk_l1_text", "bk_leaf1_f_pic", "bk_leaf1_f_text"]);
  assert.deepEqual(shown(6.5).sort(), ["bk_leaf2_b_pic", "bk_leaf2_b_text", "bk_r3_text"]);
  const { pageLayout } = await import("../../runtime/composite.js");
  const L = pageLayout({ id: "p", kind: "page", lines: ["One.", "Two."] }, catalog);
  assert.equal(L.width, 3.4);
  assert.ok(L.height > 0.5 && L.lines.length === 2 && L.lines[0].y > L.lines[1].y);
});

test("#98 reset puts an object back; a lifted hook cover is put back unseen; reset: true glides a slid cover back", () => {
  const mk = (hook, extra = []) => ({ kind: "video3d", version: 1, description: "x", meta: { title: "t", seed: 1 }, camera: { position: [0, 1.5, 9], lookAt: [0, 1, 0], fov: 40 },
    objects: [{ id: "box", kind: "prop", model: "toy_box", at: [0, 0, 0] }, { id: "ball", kind: "prop", model: "ball", at: [0, 0, 0.6], hidden: true }],
    scenes: [{ id: "a", beats: [{ dur: 1, do: [{ do: "hook", question: "What is in here?", behind: "box", target: "ball", ...hook }] }, { dur: 2, do: extra }] }] });
  const lift = mk({}, [{ do: "show", target: "box", at: 0.2 }]);
  assert.deepEqual(validateScript(lift, catalog).errors, []);
  let plan = compileScript(lift, { catalog });
  assert.deepEqual(plan.timeline.valueAt("box", "position", plan.duration), [0, 0, 0], "shown again where it started");
  const slide = mk({ style: "slide", reset: true });
  assert.deepEqual(validateScript(slide, catalog).errors, []);
  plan = compileScript(slide, { catalog });
  assert.deepEqual(plan.timeline.valueAt("box", "position", plan.duration), [0, 0, 0]);
  const moved = mk({ style: "slide" }, [{ do: "reset", target: "box", at: 0.5, dur: 0 }]);
  assert.deepEqual(validateScript(moved, catalog).errors, []);
  plan = compileScript(moved, { catalog });
  assert.deepEqual(plan.timeline.valueAt("box", "position", plan.duration), [0, 0, 0]);
});

test("#85 alive swells a card picture out of its card and back; a hook pushes in less on a big cover", async () => {
  const s = script("photo_alive");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const tl = plan.timeline;
  const pic = plan.objects.find((o) => o.id === "card_pic");
  assert.ok(tl.valueAt("card_pic", "scale", 1.3)[2] > pic.scale[2] * 1.5, "full depth");
  assert.ok(tl.valueAt("card_pic", "position", 1.3)[2] > pic.at[2] + 0.3, "out of the card");
  assert.deepEqual(tl.valueAt("card_pic", "scale", 3), pic.scale, "back flat");
  const { frameBox } = await import("../../runtime/camera_moves.js");
  const cam = tl.valueAt("camera", "position", 4.3);
  const close = frameBox({ min: [0.8, 0, -1.3], max: [4, 2.6, -0.7] }, { framing: "close" });
  assert.ok(cam[2] > close.position[2] - 1e-6, "a big cover is framed medium, not close");
});

test("#89 ripple / stress off any object: rings in the world, upright or flat, sized from the object", () => {
  const s = script("ripple");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const ring = (id) => plan.objects.find((o) => o.id === `${id}~ring1` || o.id.startsWith(`${id}~ring`));
  assert.equal(ring("r").parent, undefined, "rings live in the world");
  assert.deepEqual(ring("r").rotation, [90, 0, 0]);
  assert.deepEqual(ring("m").rotation, [0, 0, 0], "flat round the mat");
  assert.ok(ring("m").scale[0] > 1.3 && ring("m").scale[2] > 1, "sized from the mat");
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].chars = [1];
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_CHARS"));
});

test("#90 thumbnail auto: every object's real box lands in the part of the picture the title leaves free", async () => {
  const { thumbnailScript } = await import("../../runtime/thumbnails.js");
  const { shotBounds } = await import("../../runtime/bounds_teach.js");
  const concept = { name: "a", title: "Big words", side: "left", camera: "auto", objects: [
    { id: "card", kind: "card", style: "word", text: "caterpillar", at: [-1.5, 0.5, 0], size: 1.6 },
    { id: "fox", kind: "critter", species: "fox", at: [1.8, 0, 0], size: 1.4 },
  ] };
  const ts = thumbnailScript({ meta: { title: "t", seed: 1 } }, concept);
  const plan = compileScript(ts, { catalog });
  const t = 1;
  const cam = plan.timeline.valueAt("camera", "position", t);
  const look = plan.timeline.valueAt("camera", "lookAt", t);
  const fov = 36;
  const f = look.map((v, i) => v - cam[i]);
  const L = Math.hypot(...f);
  const fw = f.map((v) => v / L);
  const right = [fw[2] * -1, 0, fw[0]].map((v, _, a) => v / Math.hypot(...a));
  const up = [right[1] * fw[2] - right[2] * fw[1], right[2] * fw[0] - right[0] * fw[2], right[0] * fw[1] - right[1] * fw[0]];
  const tanV = Math.tan((fov * Math.PI) / 360);
  const objs = new Map(plan.objects.map((o) => [o.id, o]));
  for (const id of ["card", "fox"]) {
    const b = shotBounds(objs.get(id), catalog, (x, p, tt) => plan.timeline.valueAt(x, p, tt), (x) => objs.get(x), t, plan.objects, true);
    for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
      const d = [x - cam[0], y - cam[1], z - cam[2]];
      const depth = d.reduce((a, v, i) => a + v * fw[i], 0);
      const sx = 0.5 + d.reduce((a, v, i) => a + v * right[i], 0) / depth / (tanV * (16 / 9)) / 2;
      const sy = 0.5 + d.reduce((a, v, i) => a + v * up[i], 0) / depth / tanV / 2;
      assert.ok(sx > 0.5 && sx <= 1.0001 && sy >= -0.0001 && sy <= 1.0001, `${id} corner at ${sx.toFixed(3)}, ${sy.toFixed(3)}`);
    }
  }
});

test("#92 book pictures sit on a pale panel with depth and fit their panel (a floating moon too); track and bridge composites", async () => {
  const s = script("book_pictures");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const pic = plan.objects.find((o) => o.id === "bk_leaf1_f_pic");
  assert.equal(pic.scale[2], 0.3);
  assert.ok(plan.objects.some((o) => o.id === "bk_leaf1_f_frame"));
  const { localBounds } = await import("../../runtime/bounds.js");
  assert.ok(localBounds({ kind: "prop", model: "moon", floor: false }, catalog).min[1] < -0.4, "the moon is measured below its origin for pictures");
  assert.equal(localBounds({ kind: "prop", model: "moon" }, catalog).min[1], 0, "shots still count it from its origin up");
  const t = script("track_bridge");
  assert.deepEqual(validateScript(t, catalog).errors, []);
  const ids = compileScript(t, { catalog }).objects.map((o) => o.id);
  assert.ok(ids.includes("tr_rail2") && ids.includes("tr_s16") && ids.includes("br_rope1") && ids.includes("br_p17"));
});

test("#100 hook peek: a target that shows a little under the cover hops at the reveal instead of popping", () => {
  const s = script("hook_peek");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  assert.equal(plan.timeline.valueAt("g", "visible", 0), true, "the tail shows from the start");
  const bad = structuredClone(s);
  delete bad.scenes[0].beats[0].do[0].peek;
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_HOOK"), "without peek it must start hidden");
});

test("#101 glowing strokes and a torch pen validate; a stroke's material must be known", () => {
  const s = script("light_paint");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  assert.deepEqual(validateScript(s, catalog).warnings, []);
  const bad = structuredClone(s);
  bad.objects[0].material = "lava";
  bad.objects[0].pen = "laser";
  assert.deepEqual(validateScript(bad, catalog).errors.map((e) => e.code).sort(), ["E3D_MATERIAL", "E3D_PEN"]);
});

test("#102 shot below keeps the camera under a waterline", () => {
  const s = script("below_water");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  assert.ok(plan.timeline.valueAt("camera", "position", 1)[1] <= 1.45 + 1e-9);
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].below = "deep";
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_RANGE"));
});

test("#105 a letter sentence (up to 60 characters) has word pieces: scoop words, point at a word; thought_bubble prop", async () => {
  const { letterWords } = await import("../../runtime/letter_layout.js");
  assert.deepEqual(letterWords({ text: "The cat  sat." }), [[1, 2, 3], [5, 6, 7], [10, 11, 12, 13]]);
  const s = script("sentence_words");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const scoop = plan.objects.find((o) => o.id.startsWith("s~vowel"));
  assert.ok(scoop && scoop.points.length === 13 && scoop.points[6][1] < scoop.points[0][1], "a smile under the phrase");
  assert.ok(catalog.props.thought_bubble);
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].words = [9];
  bad.scenes[0].beats[0].do[1] = { do: "hop", target: "s#w2" };
  assert.deepEqual(validateScript(bad, catalog).errors.map((e) => e.code), ["E3D_CHARS", "E3D_TARGET_KIND"]);
});

test("#106 mist hides one object and blows away; rewind runs objects back with a badge", () => {
  const s = script("mist_rewind");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const tl = plan.timeline;
  const puffs = plan.objects.filter((o) => o.id.startsWith("s2~mist"));
  assert.ok(puffs.length >= 4);
  assert.ok(tl.valueAt(puffs[0].id, "fade", 1.5) > 0.8 && tl.valueAt(puffs[0].id, "visible", 3.2) === false, "in, then gone");
  assert.deepEqual(tl.valueAt("ball", "position", 4.9), [3, 0, 1.2]);
  assert.deepEqual(tl.valueAt("ball", "position", 6.4), [-2, 0, 1.2], "back where it was 2 s before");
  assert.ok(plan.objects.some((o) => o.id.startsWith("rewind") && o.hud));
  const bad = structuredClone(s);
  bad.scenes[0].beats[1].do[1].back = 100;
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_RANGE"));
});

test("#107 crowd composite, lantern and audio_recorder props, water keeps its colour", async () => {
  const s = script("crowd_lantern");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const objs = compileScript(s, { catalog }).objects;
  const crowd = objs.filter((o) => /^crowd_m\d+$/.test(o.id));
  assert.equal(crowd.length, 10);
  assert.ok(new Set(crowd.map((o) => o.species)).size >= 5, "a mixed crowd");
  assert.ok(crowd.some((o) => o.at[2] < 0) && crowd.some((o) => o.at[2] === 0), "two rows");
  assert.ok(catalog.props.lantern && catalog.props.audio_recorder);
  assert.ok(catalog.materials.water.opacity >= 0.8);
  const { expandComposite } = await import("../../runtime/composite.js");
  assert.ok(expandComposite({ id: "c", kind: "crowd", cast: ["dragonfly_xyz"] }, catalog).errors.some((e) => e.code === "E3D_SPECIES"));
});

test("#108 low flat props tip toward the camera on picture cards and fill them; upright ones stay face-on", async () => {
  const { expandComposite } = await import("../../runtime/composite.js");
  const pic = (name, extra = {}) => expandComposite({ id: "c", kind: "card", text: "x", picture: name, ...extra }, catalog).objects.find((o) => o.id === "c_pic");
  for (const n of ["rug", "hat", "cookie", "paint_pots"]) assert.deepEqual(pic(n).rotation, [55, 0, 0], n);
  assert.equal(pic("apple").rotation, undefined, "an upright apple stays face-on");
  assert.ok(pic("paint_pots").size > 1, "the tray no longer counts as a 1 m slab");
  assert.deepEqual(pic("rug", { pictureRotation: [0, 0, 0] }).rotation, undefined, "pictureRotation [0, 0, 0] keeps it face-on");
  assert.deepEqual(validateScript(script("flat_pictures"), catalog).errors, []);
});

test("#109 gestures: arms wide, snap, thumbs up and down (a thumb pops beside the head); snap and clap sounds", () => {
  const s = script("gestures");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const tl = plan.timeline;
  assert.ok(tl.valueAt("bb#arm", "rotation", 0.8)[2] > 60, "baby bear's arms go wide");
  assert.ok(tl.valueAt("td#arm_l", "rotation", 0.8)[2] > 90, "the toddler's arm flicks up");
  const thumbs = plan.objects.filter((o) => o.model === "thumb_icon");
  assert.equal(thumbs.length, 2);
  assert.deepEqual(thumbs.find((o) => o.id.startsWith("fox")).rotation, [0, 0, 180], "thumbs down");
  assert.ok(catalog.sounds.snap && catalog.sounds.clap);
  const bad = structuredClone(s);
  bad.scenes[0].beats[0].do[0].kind = "wave";
  assert.ok(validateScript(bad, catalog).errors.some((e) => e.code === "E3D_GESTURE"));
});

test("#111 a beat's caption: false reaches kit macros; board headers grow with their column", async () => {
  const mk = (caption) => ({ kind: "video3d", version: 1, description: "x", meta: { title: "t", seed: 1 }, camera: { position: [0, 1.5, 9], lookAt: [0, 1, 0], fov: 40 },
    objects: [{ id: "box", kind: "prop", model: "toy_box" }, { id: "ball", kind: "prop", model: "ball", hidden: true }],
    scenes: [{ id: "a", beats: [{ dur: 1, ...(caption != null ? { caption } : {}), do: [{ do: "hook", question: "What is in the box?", behind: "box", target: "ball", answer: "A ball!" }] }] }] });
  assert.ok(compileScript(mk(), { catalog }).captions.length >= 2);
  assert.deepEqual(validateScript(mk(false), catalog).errors, []);
  assert.equal(compileScript(mk(false), { catalog }).captions.length, 0);
  const { expandComposite } = await import("../../runtime/composite.js");
  const head = (o) => expandComposite({ id: "b", kind: "board", labels: ["Fact", "Opinion"], layout: "columns", ...o }, catalog).objects.find((x) => x.id === "b_h1");
  assert.ok(head({}).size > 0.2, "a wide column gets big type");
  assert.equal(head({ headSize: 0.15 }).size, 0.15);
});

test("#112 retext on a hidden word, then show or pop, ends at full size with the new text", () => {
  const s = { kind: "video3d", version: 1, description: "x", meta: { title: "t", seed: 1 }, camera: { position: [0, 1.5, 9], lookAt: [0, 1, 0], fov: 40 },
    objects: [{ id: "w", kind: "letter", text: "go", hidden: true }, { id: "v", kind: "letter", text: "cap", hidden: true, at: [2, 0, 0] }],
    scenes: [{ id: "a", beats: [{ dur: 2, do: [{ do: "retext", target: "w", text: "got", at: 0.1 }, { do: "show", target: "w", at: 0.2 }, { do: "pop", target: "v", at: 0.2 }, { do: "retext", target: "v", text: "cape", at: 0.1 }] }] }] };
  const tl = compileScript(s, { catalog }).timeline;
  for (const id of ["w", "v"]) {
    assert.deepEqual(tl.valueAt(id, "scale", 1.9), [1, 1, 1], id);
    assert.equal(tl.valueAt(id, "textIdx", 1.9), 1, id);
  }
});

test("#113 props vine, plum, rake, sled, cliff, ink_blot, bitten_apple, coat_peg, pen, spiral_shell, lighthouse_split; pug", () => {
  for (const n of ["vine", "plum", "rake", "sled", "cliff", "ink_blot", "bitten_apple", "coat_peg", "pen", "spiral_shell", "lighthouse_split"]) assert.ok(catalog.props[n], n);
  assert.equal(catalog.props.lighthouse_split.parts.filter((p) => p.name === "beam").length, 2, "two beams that spin together");
  assert.ok(catalog.critters.pug);
  assert.deepEqual(validateScript(script("props113"), catalog).errors, []);
});

test("#114 single letters of a word hide, show, pop and drop in", () => {
  const s = script("letter_drop");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const tl = compileScript(s, { catalog }).timeline;
  assert.deepEqual(tl.valueAt("w#c3", "scale", 0.5), [0, 0, 0], "t waits hidden");
  assert.deepEqual(tl.valueAt("w#c1", "scale", 0.5), [1, 1, 1]);
  assert.ok(tl.valueAt("w#c3", "position", 1.7)[1] > 0.3, "t falls from above");
  assert.deepEqual(tl.valueAt("w#c3", "position", 2.5), [0, 0, 0]);
  assert.ok(tl.valueAt("w#c2", "scale", 3).every((v) => Math.abs(v) < 1e-9), "a hides");
  assert.deepEqual(tl.valueAt("w#c2", "scale", 3.9), [1, 1, 1], "and comes back");
});
