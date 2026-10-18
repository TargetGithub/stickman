// Lean copy-paste prompts (CATALOG_SPEC 7.3, C4): under their size targets, filled, stamped with the pack
// version, and carrying the same task text as the full prompts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import {
  packVersion, leanWritePrompt, leanOutlinePrompt, leanScenePrompt, leanFixPrompt, leanExtendPrompt, packVersionWarning, REPLY_RULE,
} from "../../tools/lib/lean_prompts.mjs";
import { writeRequest } from "../../tools/lib/prompt_pack.mjs";
import { outlineRequest, sceneRequest, exampleStories, extendRequest } from "../../tools/lib/story_prompts.mjs";
import { manualWritePrompt, checkReply } from "../../tools/lib/manual.mjs";
import { manualOutlinePrompt, manualScenePrompt, checkSceneReply, manualExtendPrompt } from "../../tools/lib/manual_story.mjs";
import { PACK_FILES } from "../../tools/lib/context_pack.mjs";

const V = packVersion();
const PREMISE = { title: "A tiny ninja vs a giant robot", logline: "A tiny ninja takes on a giant robot in a neon city and wins with speed.", tone: "comedic" };
const brave = exampleStories().find((e) => e.name.startsWith("brave"));

/** A long outline: 16 scenes and 8 in the cast, built from the example's scenes. */
function bigOutline(scenes = 16, castSize = 8) {
  const o = structuredClone(brave.outline);
  o.scenes = Array.from({ length: scenes }, (_, k) => ({ ...structuredClone(brave.outline.scenes[k % brave.outline.scenes.length]), id: `s${k + 1}` }));
  while (o.cast.length < castSize) o.cast.push({ ...structuredClone(o.cast[o.cast.length % 3]), id: `extra${o.cast.length}` });
  return o;
}
const endState = (o) => Object.fromEntries(o.cast.map((c) => [c.id, { hp: 80, prop: null, face: "happy", scene: "s3" }]));

const cases = () => [
  ["clip", 3000, leanWritePrompt(V, PREMISE, { format: "landscape", length: 30, seed: 12345 })],
  ...["story", "fight"].flatMap((kind) => ["kids", "general"].map((audience) => [`outline ${kind} ${audience}`, 2500, leanOutlinePrompt(V, PREMISE, { kind, audience, format: "portrait" })])),
  ...exampleStories().flatMap((ex) => ex.outline.scenes.map((s, i) => [`scene ${ex.name} ${s.id}`, 5000, leanScenePrompt(V, ex.outline, i, { endState: i ? endState(ex.outline) : null })])),
  ...[[12, 6], [16, 8]].flatMap(([n, c]) => [0, n - 1].map((i) => [`scene ${i + 1} of ${n} (cast ${c})`, 5000, leanScenePrompt(V, bigOutline(n, c), i, { endState: i ? endState(bigOutline(n, c)) : null })])),
];

test("lean prompts are under their size targets (clip 3,000, outline 2,500, scene 5,000 characters)", () => {
  for (const [name, max, text] of cases()) assert.ok(text.length < max, `${name}: ${text.length} characters`);
});

test("lean prompts are filled, start with the pack line and its version, and end with the reply rule", () => {
  for (const [name, , text] of cases()) {
    assert.doesNotMatch(text, /\{\{\w+\}\}/, name);
    assert.ok(text.startsWith(`Use the Stickman catalog files attached to this project (catalog version ${V}).`), name);
    assert.ok(text.trim().endsWith(REPLY_RULE), name);
    assert.doesNotMatch(text, /\| move \||### Moves/, `${name}: no catalog tables`);
  }
});

test("lean prompts name only pack files that exist", () => {
  const names = Object.keys(PACK_FILES);
  for (const [name, , text] of cases()) {
    for (const f of text.match(/\b\d\d_[a-z_]+\.md\b/g) || []) assert.ok(names.includes(f), `${name}: ${f}`);
    for (const n of (text.match(/read ([^.]*)\./)?.[1].match(/\b0\d\b/g) || [])) assert.ok(names.some((f) => f.startsWith(n)), `${name}: ${n}`);
  }
});

test("lean prompts carry the same task text as the full prompts", () => {
  const opts = { format: "landscape", length: 30, seed: 777 };
  assert.ok(leanWritePrompt(V, PREMISE, opts).includes(writeRequest(PREMISE, opts)));
  assert.ok(manualWritePrompt(catalog, PREMISE, opts).includes(writeRequest(PREMISE, opts)));
  const so = { kind: "story", format: "landscape", minLength: 300 };
  assert.ok(leanOutlinePrompt(V, PREMISE, so).includes(outlineRequest(PREMISE, so)));
  assert.ok(manualOutlinePrompt(catalog, PREMISE, so).includes(outlineRequest(PREMISE, so)));
  assert.ok(leanScenePrompt(V, brave.outline, 0, {}).includes(sceneRequest(brave.outline, 0, {})));
  assert.ok(leanExtendPrompt(V, 20, 35).includes(extendRequest(20, 35)));
});

test("the manual workflow switches to lean prompts with opts.lean, and stays full without it", () => {
  const opts = { kind: "story", format: "landscape", minLength: 300, seed: 3, audience: "kids" };
  const full = manualOutlinePrompt(catalog, PREMISE, opts);
  const short = manualOutlinePrompt(catalog, PREMISE, { ...opts, lean: V });
  assert.ok(full.length > 8000 && short.length < 2500, `${full.length} / ${short.length}`);
  const sceneFull = manualScenePrompt(catalog, brave.outline, [], 0, opts);
  const sceneLean = manualScenePrompt(catalog, brave.outline, [], 0, { ...opts, lean: V });
  assert.ok(sceneFull.length > 20000 && sceneLean.length < 5000, `${sceneFull.length} / ${sceneLean.length}`);
  assert.equal(manualExtendPrompt(20, 35, V), leanExtendPrompt(V, 20, 35));
  assert.ok(!manualExtendPrompt(20, 35).includes("catalog version"));
});

test("lean fix prompts are the full fix text with the pack line in front", () => {
  const bad = structuredClone(brave.story.scenes[0]);
  bad.beats[0].do = "moonwalk";
  const reply = "```json\n" + JSON.stringify(bad) + "\n```";
  const opts = { kind: "story", format: "landscape", seed: 3, audience: "kids", minLength: 90 };
  const full = checkSceneReply(reply, brave.outline, [], 0, catalog, opts);
  const short = checkSceneReply(reply, brave.outline, [], 0, catalog, { ...opts, lean: V });
  assert.equal(full.ok, false);
  assert.equal(short.fixPrompt, leanFixPrompt(V, full.fixPrompt));
  const clip = checkReply("```json\n{\"version\": 1}\n```", catalog, { lean: V });
  assert.ok(clip.fixPrompt.startsWith("Use the Stickman catalog files") && clip.fixPrompt.includes("E_SCHEMA_REQUIRED"));
});

test("a reply that names another catalog version gets a warning", () => {
  assert.equal(packVersionWarning("no version here", V), null);
  assert.equal(packVersionWarning(`Written with catalog version ${V}.`, V), null);
  assert.match(packVersionWarning("Written with catalog version 1-0123456789.", V), /upload catalog\/generated\/context/);
  const r = checkReply("Catalog version 1-0123456789\n```json\n{\"version\": 1}\n```", catalog, { lean: V });
  assert.match(r.versionWarning, /1-0123456789/);
  assert.equal(checkReply("Catalog version 1-0123456789\n```json\n{\"version\": 1}\n```", catalog).versionWarning, undefined);
});
