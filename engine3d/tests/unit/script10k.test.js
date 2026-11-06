// script10k (Toybox 10K lessons -> scripts) and render10k helpers: table-driven checks of the pure parts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { validateScript } from "../../runtime/validate.js";
import { bandOf, seedOf, musicFrom } from "../../tools/script10k/bands.mjs";
import { keywordBadge, buildMeta } from "../../tools/script10k/meta.mjs";
import { trackerFrom, fitLabel, expandLesson, LESSON_SCHEMA } from "../../tools/script10k/expand.mjs";
import { attachKeywords, keepCameraAlive, beatTimes, staticStretches } from "../../tools/script10k/polish.mjs";
import { knownWord, dictionary, qaScript } from "../../tools/script10k/qa.mjs";
import { buildThumbnails } from "../../tools/script10k/thumbs.mjs";
import { pickDrive } from "../../tools/render10k.mjs";

const catalog = loadCatalog3d();

test("bands: ids, seeds and music notes", () => {
  for (const [id, band] of [["bb0101", "bb"], ["kg0117", "kg"], ["g10713", "g1"], ["g50659", "g5"]]) assert.equal(bandOf(id), band);
  assert.throws(() => bandOf("pk01"));
  assert.notEqual(seedOf("kg0117"), seedOf("pk0117"));
  for (const [note, band, mood, gain] of [
    ["calm glockenspiel lullaby, musicGain 0.3", "bb", "calm", 0.3],
    ["playful and happy, musicGain 0.22", "kg", "playful", 0.22],
    ["bouncy and heroic", "bb", "lullaby", 0.3],
    ["tense music", "g3", "calm", 0.2],
    [undefined, "g1", "playful", 0.21],
  ]) assert.deepEqual(musicFrom(note, band), { mood, gain }, `${note} ${band}`);
});

test("keyword badges: props, icons, short text, star", () => {
  for (const [k, want] of [
    [{ word: "apple", icon: "a red apple" }, "apple"],
    [{ word: "water", icon: "a blue drop" }, "drop"],
    [{ word: "listen", icon: "an ear" }, "ear"],
    [{ word: "5", icon: "the digit" }, { text: "5" }],
    [{ word: "zigzag", icon: "a squiggle" }, "star"],
    [{ word: "letter", icon: "a capital A", sound: "train_whistle" }, { icon: "star", sound: "train_whistle" }],
  ]) assert.deepEqual(keywordBadge(k, catalog), want, k.word);
});

test("tracker labels fit the style", () => {
  const spec = (style, labels, id = "kg0001") => ({ id, progress_tracker: { style, steps: labels.length, labels } });
  assert.equal(trackerFrom(spec("six train cars", ["A", "B", "C"]), {}).style, "train");
  assert.deepEqual(trackerFrom(spec("six train cars", ["A", "B", "C"]), {}).labels, ["A", "B", "C"]);
  assert.deepEqual(trackerFrom(spec("train cars", ["line of 5", "scatter"]), {}).labels, ["1", "2"]);
  assert.equal(trackerFrom(spec("a checklist card", ["find the goal", "count"], "g10001"), {}).style, "checklist");
  assert.equal(trackerFrom(spec("train", ["a", "b"], "bb0001"), {}).style, "stars");
  assert.equal(fitLabel("the golden tenth firefly", 14), "golden tenth");
  assert.equal(fitLabel("short", 14), "short");
});

test("spell check knows inflections and compounds", () => {
  const d = dictionary();
  for (const w of ["jumps", "hopped", "happiest", "bunnies", "can't", "Robo's", "train-car"]) assert.ok(knownWord(w, d), w);
  assert.ok(!knownWord("colourr", d));
});

const SPEC = {
  id: "kg0999", band: "kg", subject: "ela", title: "Test Lesson", youtube_title: "Test! | Kindergarten | Toybox Elementary",
  objective: "I can test the pipeline.", target_length_s: 40, skills: ["no_such_skill"],
  progress_tracker: { style: "train", steps: 2, labels: ["A", "B"] },
  keywords: [{ word: "apple", icon: "a red apple" }], recap: { points: ["A apple."] }, check: { questions: [{ q: "?", answer: "a" }] },
  magical_moment: { id: "x" }, story: { premise: "p", problem: "q" }, hook: { line: "Look!" },
};
const LESSON = {
  lesson: LESSON_SCHEMA, id: "kg0999", stage: "garden",
  cast: { robo: { character: "robot", at: [-4, 0, 1] }, bunny: { species: "bunny", at: [4, 0, 1], voice: "squeaky" } },
  objects: [
    { id: "box", kind: "prop", model: "toy_box", at: [0, 0, 0] },
    { id: "a", kind: "letter", text: "A", color: "red", at: [0, 0, 0], hidden: true },
    { id: "b1", kind: "letter", text: "B", hidden: true }, { id: "b2", kind: "letter", text: "B", hidden: true },
    { spread: { ids: ["b1", "b2"], center: [0, 0, 1], gap: 2 } },
  ],
  scenes: [
    { title: "Hook", beats: [{ hook: { question: "What is in the box?", behind: "box", target: "a", answer: "A!" } }, { say: "Stay for the surprise!", progress: "tease" }] },
    { title: "Teach", beats: [
      { say: "A is for apple. A apple.", who: "bunny", shot: "a", progress: true },
      { say: "A has three lines.", pause: 1.5 }, { say: "Lines make letters.", pop: ["b1", "b2"] },
      { say: "Count with me.", orbit: 10 }, { say: "One more letter.", progress: true },
    ] },
    { title: "End", beats: [{ say: "Surprise!", magic: true, progress: 3, confetti: true }, { say: "Bye!" }] },
  ],
  thumbnails: [{ title: "A!", objects: [{ id: "a", kind: "letter", text: "A" }, { id: "r", kind: "character", character: "robot" }] }],
};

test("expandLesson: meta, cast voices, spread, tracker, sugar", () => {
  const s = expandLesson(LESSON, SPEC, { catalog, skills: {} });
  assert.equal(s.meta.episode, "kg0999");
  assert.equal(s.meta.audience, "k");
  assert.deepEqual(s.meta.skills, []);
  assert.equal(s.meta.cast.bunny.voice, "squeaky");
  assert.equal(s.meta.host, undefined, "Robo hosts");
  assert.deepEqual(s.objects.find((o) => o.id === "b1").at, [-1, 0, 1]);
  assert.ok(s.objects.some((o) => o.id === "trk" && o.kind === "tracker" && o.slots === 2));
  assert.ok(s.objects.some((o) => o.id === "party"));
  const first = s.scenes[0].beats[0].do;
  assert.ok(first.some((a) => a.do === "hook") && first.some((a) => a.do === "pop" && a.target === "trk"));
  const teach = s.scenes[1].beats;
  assert.ok(teach[0].do.some((a) => a.do === "shot" && a.pad === 0.15));
  assert.equal(teach[2].do[0].sound, "windup_click", "the pause is its own beat");
  assert.equal(teach[2].dur, 1.5);
  assert.ok(s.scenes[2].beats[0].id.endsWith(".magic"));
  assert.equal(s.meta.thumbnails[0].badge, "KINDERGARTEN");
  assert.ok(s.meta.thumbnails[0].objects.every((o) => o.at), "thumbnail objects are laid out");
});

test("babies: narrator host, no confetti, stars tracker", () => {
  const spec = { ...SPEC, id: "bb0999", band: "bb" };
  const lesson = { ...LESSON, id: "bb0999", cast: { duck: { species: "duck", at: [3, 0, 1], voice: "squeaky" } } };
  const s = expandLesson(lesson, spec, { catalog, skills: {} });
  assert.equal(s.meta.host, null);
  assert.ok(!s.objects.some((o) => o.kind === "confetti"));
  assert.equal(s.objects.find((o) => o.id === "trk").style, "stars");
  assert.ok(qaScript(s, spec, lesson, catalog).errors.every((e) => e.code !== "Q_BABY_CONFETTI"));
});

test("polish: keywords attach, camera keeps moving, the script validates", () => {
  const s = expandLesson(LESSON, SPEC, { catalog, skills: {} });
  assert.deepEqual(attachKeywords(s, SPEC, catalog), ["apple"]);
  // A long still stretch: many lines with no camera move.
  s.scenes[1].beats.push(...Array.from({ length: 8 }, (_, i) => ({ do: [{ do: "say", text: `Line number ${i} is a fairly long sentence.` }] })));
  keepCameraAlive(s, catalog);
  const { plan } = beatTimes(s, catalog);
  assert.deepEqual(staticStretches(plan, 12), []);
  const v = validateScript(s, catalog, { retention: true });
  assert.deepEqual(v.errors, []);
});

test("qa: hook first, magic, banned words, blood only in science", () => {
  const s = expandLesson(LESSON, SPEC, { catalog, skills: {} });
  s.scenes[1].beats[0].do[0].text = "The heart pumps blood.";
  const codes = (sp) => qaScript(s, sp, LESSON, catalog).errors.map((e) => e.code);
  assert.ok(codes(SPEC).includes("Q_BANNED"));
  assert.ok(!codes({ ...SPEC, subject: "science" }).includes("Q_BANNED"));
  s.scenes[1].beats[0].do[0].text = "A bloody nose.";
  assert.ok(codes({ ...SPEC, subject: "science" }).includes("Q_BANNED"));
  s.scenes[0].beats.shift();
  assert.ok(codes(SPEC).includes("Q_HOOK_FIRST"));
});

test("thumbnails: right-half layout, badge, robot waves", () => {
  const [t] = buildThumbnails([{ title: "HI", objects: [{ id: "x", kind: "prop", model: "apple" }, { id: "r", kind: "character", character: "robot" }] }], { band: "g3" });
  assert.equal(t.badge, "GRADE 3");
  assert.ok(t.objects.every((o) => o.at[0] > 0));
  assert.equal(t.objects[1].clip, "Wave");
});

test("render drives: home disk first, overflow, minimum free space", () => {
  const free = (m) => (dir) => m[dir.slice(9)] ?? 0;
  const mounted = (m) => (d) => d in m;
  assert.equal(pickDrive("kg", { free: free({ DISK5MAC: 300 }), mounted: mounted({ DISK5MAC: 1 }) }).drive, "DISK5MAC");
  assert.equal(pickDrive("kg", { free: free({ DISK5MAC: 10, DISK8MAC: 400 }), mounted: mounted({ DISK5MAC: 1, DISK8MAC: 1 }) }).drive, "DISK8MAC");
  assert.equal(pickDrive("g5", { free: free({ DISK7MAC: 5 }), mounted: mounted({ DISK7MAC: 1 }) }), null);
});
