// engine/bundles.js (ENGINE_V3_SPEC 4, CATALOG_BUNDLE_SPEC 7, ADR-022): add-only merge in id order, the
// names a script uses, and the script-side bundle codes; the worked example renders through the public API.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { catalog as base, loadBundleSync, catalogForScript, assembleBundle, BUNDLE_FILES } from "../../catalog/index.js";
import { mergeBundles, bundleOf, scriptNames, bundleIssues, BASE_ID } from "../../engine/bundles.js";
import { validate, createEngine } from "../../engine/index.js";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const robo = loadBundleSync(here("../fixtures/bundles/robo_pals"));
const H = (c) => `sha256-${c.repeat(64)}`;
const fake = (id, extra = {}) => ({ id, version: "1.0.0", hash: H(id[0]), audience: ["kids", "general"], dependencies: [], catalog: { poses: {}, moves: [], bodies: {}, faces: {}, fxPresets: {}, themes: {}, objects: {}, props: {}, activities: {}, musicMoods: {}, scales: {} }, ...extra });

test("bundleOf: bare names are base, namespaced names name their bundle", () => {
  for (const [name, want] of [["walk", BASE_ID], ["walkA", BASE_ID], ["robo_pals:boxbot", "robo_pals"], ["x:y", BASE_ID], [42, BASE_ID]]) assert.equal(bundleOf(name), want, String(name));
});

test("the base catalog is the bundle `base`", () => {
  assert.deepEqual(base.bundles.map((b) => b.id), [BASE_ID]);
  assert.match(base.bundles[0].version, /^\d+\.\d+\.\d+$/);
});

test("mergeBundles adds entries in ascending id order and leaves the base untouched", () => {
  const zed = fake("zed_pack", { catalog: { ...fake("zed_pack").catalog, themes: { "zed_pack:sky": { sky: {}, layers: [], ground: {} } }, moves: [{ name: "zed_pack:spin", category: "emote", duration: 1, keys: [] }] } });
  const merged = mergeBundles(base, [zed, robo]);
  assert.deepEqual(merged.bundles.map((b) => b.id), [BASE_ID, "robo_pals", "zed_pack"]);
  assert.equal(merged.moves.length, base.moves.length + 2);
  assert.deepEqual(merged.moves.slice(-2).map((m) => m.name), ["robo_pals:robot_dance", "zed_pack:spin"]);
  assert.ok(merged.bodies["robo_pals:boxbot"] && merged.objects["robo_pals:charging_pad"] && merged.poses["robo_pals:arms_square"]);
  assert.deepEqual(merged.bodyNames.slice(-1), ["robo_pals:boxbot"]);
  assert.deepEqual(merged.themeNames.slice(-1), ["zed_pack:sky"]);
  assert.equal(merged.sfxKeys, base.sfxKeys, "engine-owned lists are shared");
  assert.ok(!("robo_pals:boxbot" in base.bodies) && base.moves.length + 0 === base.moves.length && base.bundles.length === 1, "base unchanged");
  assert.deepEqual(mergeBundles(base, [robo, zed]).moves.map((m) => m.name), merged.moves.map((m) => m.name), "input order does not matter");
  assert.equal(merged.bundles[1].hash, robo.hash);
  assert.deepEqual(merged.bundles[1].audience, ["kids", "general"]);
});

test("mergeBundles refuses collisions, foreign namespaces, reserved ids and two hashes of one id", () => {
  const cases = [
    ["same id, other hash", [robo, { ...robo, hash: H("f") }], /loaded twice with different hashes/],
    ["a key outside the namespace", [fake("acme", { catalog: { ...fake("acme").catalog, faces: { "other:face": {} } } })], /outside its namespace/],
    ["a base name", [fake("acme", { catalog: { ...fake("acme").catalog, moves: [{ name: "walk" }] } })], /outside its namespace/],
    ["a reserved id", [fake("base")], /not allowed/],
    ["a bad id", [fake("Ab")], /not allowed/],
  ];
  for (const [name, bundles, re] of cases) assert.throws(() => mergeBundles(base, bundles), re, name);
  assert.equal(mergeBundles(base, [robo, robo]).bundles.length, 2, "the same bundle twice is one bundle");
});

test("assembleBundle takes only bundle files and tolerates missing ones", () => {
  const b = assembleBundle({ id: "acme", version: "2.0.0", contentHash: H("a"), audience: ["kids"], license: "MIT" }, { "moves/emotes.json": [{ name: "acme:x" }], "characters/presets/x.json": { id: "acme:x" } });
  assert.deepEqual(b.catalog.moves.map((m) => m.name), ["acme:x"]);
  assert.deepEqual(b.catalog.poses, {});
  assert.deepEqual([b.id, b.version, b.hash, b.license, b.dependencies], ["acme", "2.0.0", H("a"), "MIT", []]);
  assert.ok(!BUNDLE_FILES.includes("effects/sfx.json") && !BUNDLE_FILES.includes("moves/defeat.json") && BUNDLE_FILES.includes("moves/poses.json"));
});

test("scriptNames finds namespaced names in name fields and skips prose", () => {
  const names = scriptNames({ version: 2, bundles: [{ id: "robo_pals" }], cast: [{ id: "b", body: "robo_pals:boxbot", name: "x:y" }], scenes: [{ beats: [{ who: "b", do: "robo_pals:robot_dance", say: "note:this is text" }, { who: "world", do: "spawn_object", params: { kind: "acme:ball" } }] }] });
  assert.deepEqual([...names.entries()], [["robo_pals:boxbot", "cast[0].body"], ["robo_pals:robot_dance", "scenes[0].beats[0].do"], ["acme:ball", "scenes[0].beats[1].params.kind"]]);
});

const merged = mergeBundles(base, [robo, fake("dep_pack"), fake("needy", { dependencies: [{ id: "dep_pack", version: "1.0.0", hash: H("d") }] }), fake("grown", { audience: ["general"] })]);
const script = (bundles, extra = {}) => ({ version: 2, ...(bundles ? { bundles } : {}), meta: { title: "t", format: "landscape", seed: 1, kind: "clip", audience: "kids", ...extra.meta }, cast: [{ id: "a", ...(extra.body ? { body: extra.body } : {}), color: "#3d7bd9" }], scenes: [{ id: "s1", location: "city_park", cast: [{ id: "a", x: 1200, facing: 1 }], beats: [{ id: "b1", at: 0, who: "a", do: extra.move || "wave" }, { id: "b2", at: { after: "b1", delay: 1.5 }, who: "a", do: "wave" }] }] });
const codes = (s) => bundleIssues(s, merged).map((i) => i.code);

test("bundleIssues: the declared bundles against the loaded ones", () => {
  const cases = [
    ["nothing declared, no names", script(undefined), []],
    ["a pinned bundle that is used", script([{ id: "robo_pals", version: "1.0.0", hash: robo.hash }], { body: "robo_pals:boxbot" }), []],
    ["no hash", script([{ id: "robo_pals", version: "1.0.0" }], { body: "robo_pals:boxbot" }), ["W_BUNDLE_UNPINNED"]],
    ["not loaded", script([{ id: "ghost", version: "1.0.0", hash: H("9") }]), ["E_BUNDLE_MISSING"]],
    ["another version", script([{ id: "robo_pals", version: "1.1.0", hash: robo.hash }], { body: "robo_pals:boxbot" }), ["E_BUNDLE_MISSING"]],
    ["another hash", script([{ id: "robo_pals", version: "1.0.0", hash: H("e") }], { body: "robo_pals:boxbot" }), ["E_BUNDLE_HASH"]],
    ["base declared", script([{ id: "base", version: "1.0.0" }]), ["E_BUNDLE_RESERVED"]],
    ["a reserved id", script([{ id: "engine", version: "1.0.0" }]), ["E_BUNDLE_RESERVED"]],
    ["a dependency not declared", script([{ id: "needy", version: "1.0.0", hash: H("n") }], { move: "needy:x" }), ["E_BUNDLE_DEPENDENCY"]],
    ["a dependency declared", script([{ id: "needy", version: "1.0.0", hash: H("n") }, { id: "dep_pack", version: "1.0.0", hash: H("d") }], { move: "needy:x" }), ["W_BUNDLE_UNUSED"]],
    ["a kids script with a general-only bundle", script([{ id: "grown", version: "1.0.0", hash: H("g") }], { move: "grown:x" }), ["E_BUNDLE_AUDIENCE"]],
    ["a general script with a general-only bundle", script([{ id: "grown", version: "1.0.0", hash: H("g") }], { move: "grown:x", meta: { audience: "general" } }), []],
    ["an undeclared name", script(undefined, { body: "robo_pals:boxbot", move: "robo_pals:robot_dance" }), ["E_BUNDLE_UNDECLARED"]],
    ["an unknown bundle's name", script(undefined, { move: "nobody:x" }), ["E_BUNDLE_UNDECLARED"]],
    ["declared but unused", script([{ id: "robo_pals", version: "1.0.0", hash: robo.hash }]), ["W_BUNDLE_UNUSED"]],
  ];
  for (const [name, s, want] of cases) assert.deepEqual(codes(s), want, name);
  for (const i of bundleIssues(script([{ id: "ghost", version: "1.0.0", hash: H("9") }, { id: "robo_pals", version: "1.0.0", hash: H("e") }], { move: "nobody:x" }), merged)) assert.ok(i.message && i.fix && typeof i.path === "string", i.code);
});

test("validate() reports bundle codes before unknown names, and the v1 script form takes bundles too", () => {
  const r = validate(script(undefined, { body: "robo_pals:boxbot" }), base);
  assert.deepEqual(r.errors.map((e) => e.code), ["E_BUNDLE_UNDECLARED"]);
  assert.equal(r.stage, "semantic");
  const ok = validate(script([{ id: "robo_pals", version: "1.0.0", hash: robo.hash }], { body: "robo_pals:boxbot", move: "robo_pals:robot_dance" }), merged);
  assert.deepEqual(ok.errors, []);
  const v1 = { version: 1, bundles: [{ id: "robo_pals", version: "1.0.0" }], meta: { title: "v1", format: "landscape", seed: 1 }, characters: [{ id: "a", x: 1200, facing: 1, color: "#3366cc" }, { id: "b", x: 2000, facing: -1, color: "#cc3333" }], camera: [{ at: 0, mode: "follow" }],
    beats: [{ id: "d", at: 0.5, who: "a", do: "robo_pals:robot_dance" }, { id: "j", at: { after: "d" }, who: "a", do: "jab", target: "b", outcome: "hit", approach: "run" }, { id: "v", at: { after: "j", delay: 0.5 }, who: "a", do: "victory" }] };
  const rv1 = validate(v1, merged);
  assert.deepEqual(rv1.errors, []);
  assert.ok(rv1.warnings.some((w) => w.code === "W_BUNDLE_UNPINNED"));
  const { bundles: _pins, ...undeclared } = v1;
  assert.deepEqual(validate(undeclared, merged).errors.map((e) => e.code), ["E_BUNDLE_UNDECLARED"]);
});

test("catalogForScript loads the registered bundles a script declares, and leaves unknown ones for the validator", () => {
  const s = script([{ id: "robo_pals", version: "1.0.0", hash: robo.hash }], { body: "robo_pals:boxbot" });
  const c = catalogForScript(s);
  assert.deepEqual(c.bundles.map((b) => b.id), [BASE_ID, "robo_pals"]);
  assert.equal(c.bundles[1].hash, robo.hash);
  assert.equal(catalogForScript(script(undefined)), base, "no bundles: the base object itself");
  const r = validate(script([{ id: "ghost", version: "1.0.0", hash: H("9") }]), catalogForScript(script([{ id: "ghost", version: "1.0.0", hash: H("9") }])));
  assert.deepEqual(r.errors.map((e) => e.code), ["E_BUNDLE_MISSING"]);
  assert.throws(() => catalogForScript(s, { registry: { store: "bundles", bundles: [{ id: "robo_pals", version: "1.0.0", path: "tests/fixtures/bundles/robo_pals", hash: H("b") }] } }), /registers/);
});

test("the worked example loads, validates and renders a frame through the public API", () => {
  const example = JSON.parse(readFileSync(here("../fixtures/bundles/robo_pals/examples/stories/bolt_dances.json"), "utf8")).story;
  const engine = createEngine({ catalog: merged });
  const r = engine.load(example);
  assert.deepEqual(r.errors, [], JSON.stringify(r.errors));
  assert.ok(!r.warnings.some((w) => w.code === "W_BUNDLE_UNUSED"));
  assert.ok(r.totalFrames > 60);
  assert.ok(engine.getFrame(30).chars.some((c) => c.id === "bolt"));
});
