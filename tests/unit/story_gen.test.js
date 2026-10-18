// LLM story pipeline (S8): the story prompt pack, outline checks, the two-stage pipeline with the offline
// mock (repair, extend, critique), the copy-paste workflow, story scoring, and the prompt/validator sync.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { catalog } from "../../data/index.js";
import { validate } from "../../engine/index.js";
import { createLlm } from "../../tools/lib/llm/index.mjs";
import { createMockAdapter, defaultResponder } from "../../tools/lib/llm/mock.mjs";
import {
  storyOutlineSystem, storySceneSystem, storyIdeationSystem, exampleStories, checkOutline, assembleStory, sceneRequest, MIN_LENGTH,
} from "../../tools/lib/story_prompts.mjs";
import { CODE_HELP } from "../../tools/lib/story_tables.mjs";
import { generateStory } from "../../tools/lib/story_pipeline.mjs";
import { scoreStory, storyFeedback } from "../../tools/lib/story_score.mjs";
import { manualOutlinePrompt, checkOutlineReply, manualScenePrompt, checkSceneReply, assembleManual } from "../../tools/lib/manual_story.mjs";
import { historyEntry } from "../../tools/lib/history.mjs";

const MODELS = Object.fromEntries(["ideation", "write", "flagship", "repair", "repairEscalate", "critique", "metadata"].map((k) => [k, "mock"]));
const run = (responder, opts, cfg = {}) => {
  const adapter = createMockAdapter(responder);
  const ctx = { llm: createLlm(adapter, {}), catalog, cfg: { models: MODELS, maxAttempts: 3, minScore: 60, ...cfg }, log: () => {}, renderStorySheet: async () => Buffer.from("png") };
  return generateStory(ctx, { title: "Brave", logline: "Kai saves Pip." }, { seed: 5, ...opts }).then((r) => ({ r, adapter }));
};
const brave = () => exampleStories().find((e) => e.name.startsWith("brave"));

test("the story scene prompt explains every validator code, and only real ones", () => {
  const src = (dir) => readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => readFileSync(`${dir}/${f}`, "utf8")).join("\n");
  const engine = src("engine") + src("engine/validator") + src("engine/story");
  const codes = (text) => new Set(text.match(/\b[EW]_[A-Z]+(?:_[A-Z]+)*\b/g));
  const real = codes(engine);
  const prompt = storySceneSystem(catalog);
  const mentioned = codes(prompt);
  for (const c of real) assert.ok(mentioned.has(c), `story prompt does not explain ${c}`);
  for (const c of mentioned) assert.ok(real.has(c), `story prompt mentions ${c}, which the validator never reports`);
  assert.deepEqual(new Set(Object.keys(CODE_HELP)), real);
});

test("story prompts are filled, byte-stable and a sensible size", () => {
  for (const [name, text, again] of [
    ["outline", storyOutlineSystem(catalog, { kind: "story" }), storyOutlineSystem(catalog, { kind: "story" })],
    ["fight outline", storyOutlineSystem(catalog, { kind: "fight" }), storyOutlineSystem(catalog, { kind: "fight" })],
    ["scene", storySceneSystem(catalog), storySceneSystem(catalog)],
    ["ideation", storyIdeationSystem(catalog), storyIdeationSystem(catalog)],
  ]) {
    assert.doesNotMatch(text, /\{\{\w+\}\}/, name);
    assert.equal(text, again, `${name} is byte-stable`);
    assert.ok(text.length < 40000, `${name}: ${text.length} chars`);
  }
  assert.match(storyOutlineSystem(catalog, { kind: "fight" }), /at least 180 s/);
  assert.match(storyOutlineSystem(catalog, { kind: "story" }), /at least 300 s/);
  assert.match(storySceneSystem(catalog, { audience: "kids" }), /never ghost/);
  assert.doesNotMatch(storySceneSystem(catalog, { audience: "general" }), /never ghost/);
  for (const m of ["@fight", "@gauntlet", "@dialogue", "@fight_card"]) assert.match(storySceneSystem(catalog), new RegExp(m));
});

test("example stories validate (abridged: only the length warning) and their outlines pass the outline checks", () => {
  for (const ex of exampleStories()) {
    const r = validate(ex.story, catalog);
    assert.deepEqual(r.errors, [], ex.name);
    assert.deepEqual(r.warnings.map((w) => w.code), ["W_STORY_SHORT"], ex.name);
    assert.deepEqual(checkOutline(ex.outline, catalog, { minLength: 90 }), [], ex.name);
  }
});

test("outline checks: bad bodies, themes, moods, ids, contrast and too little length are caught", () => {
  const base = () => structuredClone(brave().outline);
  const cases = [
    [(o) => (o.cast[0].body = "dragon"), /E_BODY_UNKNOWN/],
    [(o) => (o.locations[0].theme = "moon"), /E_THEME_UNKNOWN/],
    [(o) => (o.scenes[0].mood = "angsty"), /mood "angsty"/],
    [(o) => (o.scenes[1].cast.push("zed")), /"zed" is not in cast/],
    [(o) => (o.cast[0].id = "Kai Hero"), /lowercase/],
    [(o) => (o.cast[1].color = catalog.themes.city_park.characterBg), /W_CONTRAST/],
    [(o) => o.scenes.forEach((s) => (s.seconds = 10)), /add up to 40 s/],
  ];
  for (const [mut, re] of cases) {
    const o = base();
    mut(o);
    const issues = checkOutline(o, catalog, { minLength: 90 });
    assert.ok(issues.some((i) => re.test(i)), `${re}: ${issues.join(" | ")}`);
  }
  assert.ok(checkOutline(brave().outline, catalog, {}).some((i) => /at least 8 scenes/.test(i)), "300 s needs more scenes");
});

test("pipeline: outline, scenes (a broken draft repaired on its own), critique revision, metadata", async () => {
  const { r, adapter } = await run(defaultResponder(), { kind: "story", minLength: 150, critique: true });
  assert.equal(r.status, "accepted");
  assert.equal(validate(r.script, catalog).ok, true);
  assert.equal(r.script.meta.kind, "story");
  assert.equal(r.script.scenes.length, 4);
  const s2 = r.attempts.filter((a) => a.stage === "s2");
  assert.deepEqual(s2.map((a) => a.ok), [false, true], "scene 2 repaired in its own conversation");
  assert.deepEqual(s2[0].errors, ["E_MOVE_UNKNOWN"]);
  assert.ok(r.attempts.some((a) => a.stage === "s1+revise"), "the critique's note revises scene s1");
  assert.ok(r.score >= 60 && r.metadata.title);
  // Each scene request carries the state the previous scenes left behind.
  const s3req = adapter.calls.find((c) => c.system.startsWith("You write ONE scene") && /Write scene 3/.test(c.messages[0].content));
  assert.match(s3req.messages[0].content, /pip: hp \d+, DEFEATED/);
});

test("pipeline: a short story gets one extend round, then comes back marked short", async () => {
  const { r } = await run(defaultResponder(), { kind: "story", minLength: 172 });
  assert.equal(r.status, "short");
  assert.ok(r.attempts.some((a) => a.stage.endsWith("+extend")));
  assert.ok(r.script && r.stats.durationSec < 172);
});

test("pipeline: fight videos, failed outlines and scenes that never validate", async () => {
  const fight = await run(defaultResponder(), { kind: "fight", minLength: 150 });
  assert.equal(fight.r.status, "accepted");
  assert.equal(fight.r.script.meta.kind, "fight");
  assert.equal(fight.r.script.meta.hpBars, true);
  const outlineFails = await run(defaultResponder(), { kind: "story", minLength: 300 });
  assert.equal(outlineFails.r.status, "invalid_outline", "the mock outline has too few scenes for 300 s");
  const base = defaultResponder();
  const stuck = await run((req, n) => {
    if (req.system.startsWith("You write ONE scene") && /Write scene 3/.test(req.messages[0].content)) return { text: '{"id": "s3", "location": "street", "cast": [], "beats": [{"at": 0, "who": "kai", "do": "wave"}]}' };
    return base(req, n);
  }, { kind: "story", minLength: 150 });
  assert.equal(stuck.r.status, "invalid_scene");
  assert.equal(stuck.r.failedScene, "s3");
  assert.equal(stuck.r.scenes.length, 2, "scenes 1-2 were kept");
});

test("copy-paste workflow: outline, scenes with fix prompts, assemble with a score", () => {
  const ex = brave();
  const opts = { kind: "story", minLength: 150, seed: 9, format: "landscape", audience: "kids" };
  assert.match(manualOutlinePrompt(catalog, { title: "Brave", logline: "Kai saves Pip." }, opts), /# Your task[\s\S]*Kai saves Pip/);
  const o = checkOutlineReply("Here you go:\n```json\n" + JSON.stringify(ex.outline) + "\n```", catalog, opts);
  assert.equal(o.ok, true, o.message);
  const scenes = [];
  ex.story.scenes.forEach((sc, i) => {
    assert.match(manualScenePrompt(catalog, o.outline, scenes, i, opts), new RegExp(`Write scene ${i + 1} of 4`));
    const c = checkSceneReply(JSON.stringify(sc), o.outline, scenes, i, catalog, opts);
    assert.equal(c.ok, true, c.message);
    scenes.push(c.scene);
  });
  const broken = structuredClone(ex.story.scenes[1]);
  broken.beats[1].do = "pointt";
  const bad = checkSceneReply(JSON.stringify(broken), o.outline, scenes.slice(0, 1), 1, catalog, opts);
  assert.equal(bad.ok, false);
  assert.match(bad.fixPrompt, /E_MOVE_UNKNOWN[\s\S]*Return the corrected scene/);
  assert.throws(() => manualScenePrompt(catalog, o.outline, [], 2, opts), /must be checked first/);
  const a = assembleManual(o.outline, scenes, catalog, opts);
  assert.equal(a.ok, true);
  assert.equal(a.short, false);
  assert.ok(a.score.score > 60 && a.sceneSeconds.length === 4);
  assert.equal(assembleManual(o.outline, scenes, catalog, { ...opts, minLength: 400 }).short, true);
});

test("story score: arc, variety, feelings, narration, action, length; feedback names what is missing", () => {
  const ex = brave();
  const ok = scoreStory(ex.story, ex.outline, catalog, { minLength: 150 });
  assert.ok(ok.ok && ok.parts.length === 15 && ok.parts.emotion === 15 && ok.parts.action === 15);
  const flat = structuredClone(ex.outline);
  flat.scenes.forEach((s) => (s.purpose = "setup"));
  const worse = scoreStory(ex.story, flat, catalog, { minLength: 600 });
  assert.ok(worse.parts.arc < ok.parts.arc && worse.parts.length < 15);
  const fb = storyFeedback(worse);
  assert.ok(fb.some((f) => /arc/.test(f)) && fb.some((f) => /needs more/.test(f)));
  assert.equal(MIN_LENGTH.story, 300);
  assert.equal(MIN_LENGTH.fight, 180);
});

test("helpers: assembled scripts drop outline-only fields; history entries read v2 stories", () => {
  const ex = brave();
  const s = assembleStory(ex.outline, ex.story.scenes, { seed: 3, kind: "story" });
  assert.ok(s.cast.every((c) => !("role" in c)));
  assert.equal(s.meta.autoCamera, "story");
  const h = historyEntry({ logline: "x" }, s);
  assert.ok(h.moves.includes("@gauntlet") && h.palette.length === s.cast.length && h.kind === "story");
  assert.match(sceneRequest(ex.outline, 0, {}), /first scene: open with a title card/);
});
