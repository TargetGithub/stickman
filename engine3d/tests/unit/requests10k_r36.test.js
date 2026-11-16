import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";
import { expandComposite } from "../../runtime/composite.js";
import { trackerLayout, TRACKER_STYLES } from "../../runtime/retain_layout.js";
import { findMark } from "../../runtime/card_words.js";
import { buildThumbnails } from "../../tools/script10k/thumbs.mjs";

// Engine requests #141-#159 (10K/ENGINE_REQUESTS.md, wave 3 rounds 32-36).
const catalog = loadCatalog3d();
const S = (objects, actions, dur = 6) => ({ kind: "video3d", version: 1, meta: { seed: 1 }, objects, scenes: [{ id: "a", beats: [{ dur, do: actions }] }] });
const errs = (s) => validateScript(s, catalog).errors;
const codes = (s) => errs(s).map((e) => e.code);

test("#141 a card with text \"\" is a blank board; leaving text out still needs a picture", () => {
  assert.deepEqual(expandComposite({ id: "c", kind: "card", text: "" }, catalog).errors, []);
  assert.ok(expandComposite({ id: "c", kind: "card", text: "" }, catalog).objects.some((o) => o.id === "c_back"));
  assert.ok(expandComposite({ id: "c", kind: "card" }, catalog).errors.length);
});

const trackers = [
  { style: "fuel", slots: 10, labels: ["E", "", "F"].filter(Boolean), ok: true },
  { style: "fuel", slots: 4, labels: ["full"], ok: false },
  { style: "moon", slots: 8, labels: ["new", "half", "full"], ok: true },
  { style: "rainbow", slots: 6, labels: ["red", "orange"], ok: true },
  { style: "rainbow", slots: 3, labels: ["crimson!!"], ok: false },
];
for (const c of trackers) {
  test(`#142 #148 #150 tracker ${c.style} labels ${JSON.stringify(c.labels)}`, () => {
    const s = S([{ id: "t", kind: "tracker", hud: true, style: c.style, slots: c.slots, labels: c.labels }], [{ do: "progress", target: "t", at: 0.2 }]);
    assert.equal(errs(s).length === 0, c.ok, JSON.stringify(errs(s)));
  });
}

test("#142 #150 fuel and moon styles lay out one slot per step", () => {
  for (const style of ["fuel", "moon"]) {
    assert.ok(TRACKER_STYLES.includes(style));
    const L = trackerLayout({ style, slots: 9, surprise: true });
    assert.equal(L.slots.length, 10);
    assert.ok(L.slots.every((p, i) => i === 0 || p[0] > L.slots[i - 1][0]));
  }
});

test("#143 a letter on a prop stands on its lowest point; lift none keeps the baseline", () => {
  const objs = (lift) => [{ id: "box", kind: "prop", model: "toy_box" }, { id: "w", kind: "letter", text: "gym", parent: "box", ...(lift ? { lift } : {}) }];
  const p = compileScript(S(objs(), []), { catalog });
  assert.equal(p.objects.find((o) => o.id === "w").lift, "descender");
  assert.equal(compileScript(S(objs("none"), []), { catalog }).objects.find((o) => o.id === "w").lift, "none");
  assert.deepEqual(errs(S(objs("none"), [])), []);
});

test("#144 atAnswer times a move from a call's answer", () => {
  const s = S([{ id: "b", kind: "prop", model: "ball" }], [
    { do: "call", prompt: "Say it with me!", answer: "Ball!", wait: 2 },
    { do: "hop", target: "b", atAnswer: 0.2 },
  ], "fit");
  assert.deepEqual(errs(s), []);
  const p = compileScript(s, { catalog });
  const sparkle = p.audio.find((a) => a.sound === "sparkle").t; // the call's answer
  assert.ok(sparkle > 2);
  assert.ok(p.timeline.valueAt("b", "hop", sparkle + 0.2 + 0.15) > 0, "the ball hops just after the answer");
  assert.equal(p.timeline.valueAt("b", "hop", sparkle - 0.5) ?? 0, 0);
});

test("#144 atAnswer needs a call or challenge in its beat", () => {
  assert.ok(codes(S([{ id: "b", kind: "prop", model: "ball" }], [{ do: "hop", target: "b", atAnswer: 0.2 }])).includes("E3D_ANSWER"));
});

const marks = [
  { text: "Is it big?", words: "?", want: { words: [2, 2], chars: [3, 3] } },
  { text: "Wow! A cat!", words: "!", want: { words: [0, 0], chars: [3, 3] } },
  { text: "Is it big?", words: "big", want: null },
  { text: "No marks here", words: "?", want: null },
];
for (const c of marks) {
  test(`#144 emphasize a mark: ${JSON.stringify(c.words)} in "${c.text}"`, () => assert.deepEqual(findMark(c.text, c.words), c.want));
}

test("#145 theatre is lit bright; theatre_dark keeps the dim light", () => {
  assert.equal(catalog.stages.theatre.lights, "theatre_warm");
  assert.equal(catalog.stages.theatre_dark.lights, "dim");
  assert.ok(catalog.lights.theatre_warm.sun.intensity > catalog.lights.dim.sun.intensity);
});

test("#146 show after a grow and a hide comes back at the grown size; scale overrides", () => {
  const s = S([{ id: "c", kind: "shape", shape: "cube" }], [
    { do: "grow", target: "c", to: 2, at: 0, dur: 0.5 },
    { do: "hide", target: "c", at: 1 },
    { do: "show", target: "c", at: 2 },
    { do: "hide", target: "c", at: 3 },
    { do: "pop", target: "c", at: 4, scale: 1.5 },
  ]);
  const p = compileScript(s, { catalog });
  assert.deepEqual(p.timeline.valueAt("c", "scale", 2.9), [2, 2, 2]);
  assert.deepEqual(p.timeline.valueAt("c", "scale", 5.5), [1.5, 1.5, 1.5]);
});

test("#147 dust puffs appear and fade; validated", () => {
  const s = S([{ id: "sack", kind: "prop", model: "ball" }], [{ do: "dust", target: "sack", at: 0.5 }]);
  assert.deepEqual(errs(s), []);
  const p = compileScript(s, { catalog });
  const puffs = p.objects.filter((o) => o.id.includes("~dust"));
  assert.equal(puffs.length, 9);
  assert.ok(p.timeline.valueAt(puffs[4].id, "fade", 0.9) > 0.3);
  assert.equal(p.timeline.valueAt(puffs[4].id, "visible", 2.5), false);
  assert.ok(codes(S([{ id: "sack", kind: "prop", model: "ball" }], [{ do: "dust", target: "sack", amount: 3 }])).includes("E3D_RANGE"));
});

test("#148 dial zones paint one colour per label; pie slice shapes exist", () => {
  const r = expandComposite({ id: "g", kind: "dial", labels: ["low", "ok", "high"], zones: ["red", "yellow", "green"] }, catalog);
  assert.deepEqual(r.errors, []);
  assert.equal(r.objects.filter((o) => /^g_z\d+_\d+$/.test(o.id)).length, 30);
  assert.ok(expandComposite({ id: "g", kind: "dial", labels: ["a", "b"], zones: ["red"] }, catalog).errors.length);
  for (const s of ["pie_third", "pie_sixth", "pie_eighth"]) assert.ok(catalog.shapes[s], s);
});

test("#148 Robo's chest, head and hands take riders", () => {
  const objs = (part) => [{ id: "robo", kind: "character", character: "robot" }, { id: "badge", kind: "shape", shape: "star", parent: "robo", part, at: [0, 0, 0.3] }];
  assert.deepEqual(errs(S(objs("chest"), [])), []);
  assert.ok(codes(S(objs("tail"), [])).includes("E3D_PART"));
});

test("#148 a call can answer with a sound", () => {
  const s = S([], [{ do: "call", prompt: "What sound does m make?", answerSound: "ph_m", wait: 2 }], "fit");
  assert.deepEqual(errs(s), []);
  const p = compileScript(s, { catalog });
  assert.ok(p.audio.some((a) => a.sound === "ph_m"));
  assert.ok(codes(S([], [{ do: "call", prompt: "Hi", answerSound: "no_such_sound" }], "fit")).includes("E3D_SOUND"));
});

test("#149 hook revealFraming is checked", () => {
  const objs = [{ id: "cup", kind: "prop", model: "ball" }, { id: "prize", kind: "shape", shape: "star", hidden: true }];
  assert.ok(codes(S(objs, [{ do: "hook", question: "What is under it?", behind: "cup", target: "prize", revealFraming: "huge" }], "fit")).includes("E3D_HOOK"));
  assert.deepEqual(errs(S(objs, [{ do: "hook", question: "What is under it?", behind: "cup", target: "prize", revealFraming: "close" }], "fit")), []);
});

test("#150 keyword text up to 8 characters", () => {
  const s = (text) => S([], [{ do: "say", text: "A caterpillar crawls.", keywords: { caterpillar: { text } } }], "fit");
  assert.deepEqual(errs(s("crawling")), []);
  assert.ok(codes(s("caterpillar")).includes("E3D_KEYWORD"));
});

test("#150 ripple on a letter piece ripples just that character", () => {
  const s = S([{ id: "w", kind: "letter", text: "cat" }], [{ do: "ripple", target: "w#c2", at: 0.2 }]);
  const p = compileScript(s, { catalog });
  assert.ok(p.timeline.valueAt("w#c2", "scale", 0.36)[0] > 1.1, "c2 swells");
  assert.equal(p.timeline.valueAt("w#c1", "scale", 0.36)[0], 1);
});

test("#150 circle turns its riders back to the front unless face is travel", () => {
  const objs = [{ id: "duck", kind: "critter", species: "duck" }];
  const front = compileScript(S(objs, [{ do: "circle", targets: ["duck"], dur: 3 }]), { catalog });
  assert.deepEqual(front.timeline.valueAt("duck", "rotation", 4), [0, 0, 0]);
  const travel = compileScript(S(objs, [{ do: "circle", targets: ["duck"], dur: 3, face: "travel" }]), { catalog });
  assert.notDeepEqual(travel.timeline.valueAt("duck", "rotation", 4), [0, 0, 0]);
  assert.ok(codes(S(objs, [{ do: "circle", targets: ["duck"], face: "up" }])).includes("E3D_RANGE"));
});

test("#150 #158 lion_roar exists; sound echo repeats softer", () => {
  assert.ok(catalog.sounds.lion_roar);
  const p = compileScript(S([], [{ do: "sound", sound: "lion_roar", at: 1, echo: 2, echoGap: 0.5 }]), { catalog });
  assert.deepEqual(p.audio.filter((a) => a.sound === "lion_roar").map((a) => [a.t, a.volume]), [[1, 1], [1.5, 0.5], [2, 0.25]]);
});

test("#142 #145 #147 #150 #158 new props are in the catalog", () => {
  for (const m of ["flower_face", "hair_bow", "torn_sail", "sort_chute", "cubby_shelf", "star_map", "mailbox", "echo_machine", "fountain", "chick_face", "chick_feet", "choir_bench"]) assert.ok(catalog.props[m], m);
  assert.ok(catalog.props.mailbox.parts.some((p) => p.name === "flap"));
  assert.ok(catalog.props.fountain.parts.some((p) => p.name === "jet"));
});

test("#159 thumbnail letters leave the characters their own strip", () => {
  const [c] = buildThumbnails([{ title: "Short a", objects: [{ id: "w", kind: "letter", text: "caterpillar" }, { id: "f", kind: "critter", species: "frog" }, { id: "h", kind: "critter", species: "hen" }] }], { spec: {}, band: "g1", catalog });
  const w = c.objects.find((o) => o.id === "w");
  const xs = c.objects.filter((o) => o.kind === "critter").map((o) => o.at[0]);
  assert.ok(w.size < 1, "a long word shrinks");
  assert.ok(xs.every((x) => x > w.at[0] + 0.5), "characters stand right of the word");
  assert.ok(xs.every((x) => x < 3.5));
});

test("#160 stage.lights is checked; a thumbnail on the same preset keeps the episode's lights", async () => {
  const { thumbnailScript } = await import("../../runtime/thumbnails.js");
  const s = (stage) => ({ ...S([], []), stage });
  assert.deepEqual(errs(s({ preset: "farm", lights: "night" })), []);
  assert.ok(codes(s({ preset: "farm", lights: "starlight" })).includes("E3D_LIGHTS"));
  assert.equal(catalog.lights.night.background, "midnight");
  const ep = { meta: { title: "Night" }, stage: { preset: "farm", lights: "moonlight", background: "midnight", hide: ["sun*"] } };
  assert.deepEqual(thumbnailScript(ep, { name: "a", stage: "farm", camera: "auto", objects: [] }).stage, ep.stage);
  assert.deepEqual(thumbnailScript(ep, { name: "a", stage: "playroom", camera: "auto", objects: [] }).stage, { preset: "playroom" });
});

test("#163 move by goes from where the target is", () => {
  const s = S([{ id: "w", kind: "prop", model: "ball", at: [1, 0, 0] }], [
    { do: "move", target: "w", by: [2, 0, 0], at: 0, dur: 1 },
    { do: "move", target: "w", by: [0, 0, -1], at: 2, dur: 1 },
  ]);
  assert.deepEqual(errs(s), []);
  const p = compileScript(s, { catalog });
  assert.deepEqual(p.timeline.valueAt("w", "position", 1.5), [3, 0, 0]);
  assert.deepEqual(p.timeline.valueAt("w", "position", 3.5), [3, 0, -1]);
  assert.ok(codes(S([{ id: "w", kind: "prop", model: "ball" }], [{ do: "move", target: "w", by: [1, 0, 0], to: [0, 0, 0] }])).includes("E3D_VEC"));
});

test("#161 #162 floats, wagons, carts, harps, corn and stepping stones are in the catalog", () => {
  for (const m of ["parade_float", "wagon", "cart", "harp", "corn_cob", "stepping_stone"]) assert.ok(catalog.props[m], m);
  assert.ok(catalog.props.harp.parts.some((p) => p.name === "strings"));
});
