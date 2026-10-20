// Catalog checks (CATALOG_SPEC 11): the real catalog is clean, and each kind of mistake is caught.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readCatalogDir, engineCodes, schemaFor } from "../../tools/lib/catalog_files.mjs";
import { checkCatalog, engineNames, goodThemes } from "../../tools/lib/catalog_check.mjs";
import { loadCatalog } from "../../catalog/index.js";
import { formatJson } from "../../tools/lib/json_format.mjs";

const SRC = readCatalogDir();
const codes = engineCodes();

/** A copy of the catalog with one change, the engine catalog re-assembled from the changed files. */
function mutated(change) {
  const src = structuredClone({ ...SRC, catalog: null });
  change(src.files, src);
  src.presets = Object.keys(src.files).filter((f) => f.startsWith("characters/presets/")).map((file) => ({ file, ...src.files[file] }));
  src.catalog = loadCatalog((p) => src.files[p]);
  return src;
}

test("the catalog passes every check", () => {
  assert.deepEqual(checkCatalog(SRC, { codes }), []);
});

const CASES = [
  ["a base name of the last release removed", (f) => f["base_names.json"].names.moves.push("old_spin_kick"), /base_names.json moves.old_spin_kick.*bundles may refer to it/],
  ["a move without a description", (f) => delete f["moves/emotes.json"][0].description, /emotes.json.*description/],
  ["a move with no tags", (f) => (f["moves/life.json"][0].tags = []), /life.json.*E_SCHEMA_SIZE/],
  ["a tag in capitals", (f) => (f["world/themes.json"].arena.tags = ["Fight"]), /themes.json.*E_SCHEMA_PATTERN/],
  ["a theme without a description", (f) => delete f["world/themes.json"].arena.description, /themes.json.*arena.*description/],
  ["an sfx key without a category", (f) => delete f["effects/sfx.json"][0].category, /sfx.json.*category/],
  ["an appearance option without a description", (f) => (f["characters/appearance.json"].hair[1] = { name: "spiky" }), /appearance.json.*hair\[1\].*description/],
  ["the same move in two files", (f) => f["moves/emotes.json"].push(structuredClone(f["moves/movement.json"][1])), /moves\/emotes.json.*"walk" is also in moves\/movement.json/],
  ["an unknown move in an activity", (f) => (f["story/activities.json"].selfie.roles[1].moves = ["moonwalk"]), /activities.json.*unknown move "moonwalk"/],
  ["an unknown move in a body's avoid list", (f) => (f["characters/bodies.json"].elder.avoid.push("moonwalk")), /bodies.json.*unknown move "moonwalk"/],
  ["an unknown object drawing", (f) => (f["world/objects.json"].bench.draw = "sofa"), /objects.json.*unknown shape "sofa"/],
  ["an unknown layer kind", (f) => (f["world/themes.json"].arena.layers[0].kind = "lava"), /themes.json.*unknown layer kind "lava"/],
  ["a mood with an unknown scale", (f) => (f["story/music_moods.json"].moods.sad.scale = "blues"), /music_moods.json.*unknown scale "blues"/],
  ["move check: a pose that breaks the skeleton (every move on every body plan)", (f) => (f["moves/emotes.json"].find((m) => m.name === "bow").keys[1].pose = { lean: "abc" }), /moves bow stickman: a joint becomes NaN/],
  ["move check: a root with an unknown param", (f) => (f["moves/movement.json"].find((m) => m.name === "dash").root[1].dx = "travel*nope"), /unknown name 'nope'/],
  ["a world command with no description", (f) => delete f["docs/world_commands.json"].shake, /world_commands.json.*the engine has "shake"/],
  ["a description of a command the engine lacks", (f) => (f["docs/world_commands.json"].teleport_all = { description: "Moves everyone.", example: {} }), /"teleport_all" is described but the engine does not have it/],
  ["a validator code with no doc", (f) => delete f["docs/codes.json"].W_REACH, /codes.json.*W_REACH/],
  ["a macro example that does not validate", (f) => (f["docs/macros.json"].fight.example.params.winner = "zed"), /macros.json.*fight.*example does not validate/],
  ["a camera mode example missing its target", (f) => delete f["docs/camera.json"].modes.close_up.example.target, /camera.json.*close_up.*E_CAMERA_FIELD/],
  ["a timbre the engine lacks", (f) => f["characters/voices.json"].timbres.push({ name: "alien", description: "A wobbly alien voice." }), /voices.json timbres.*alien/],
  ["a preset with an unknown role", (f) => (f["characters/presets/kai.json"].role = "wizard"), /presets\/kai.json.*unknown role "wizard"/],
  ["a preset with an unknown body", (f) => (f["characters/presets/pip.json"].cast.body = "dragon"), /presets\/pip.json.*E_BODY_UNKNOWN/],
  ["a preset in the wrong file", (f) => (f["characters/presets/vex.json"].id = "vexx"), /presets\/vex.json.*named vexx.json/],
  ["an example missing from the index", (f, src) => (src.examples["clips/extra.json"] = src.examples["clips/cookie_duel.json"]), /clips\/extra.json.*not in the index/],
  ["an indexed example with the wrong title", (f) => (f["examples/index.json"].examples[0].title = "Cookies"), /index.json.*title "Cookies"/],
  ["a pack scene that does not exist", (f) => (f["examples/index.json"].pack.scenes[0].scene = "s9"), /pack.scenes.*no scene "s9"/],
  ["a format example that does not validate", (f, src) => (src.formatMd = src.formatMd.replace('"seed": 7', '"seed": "7"')), /format.md.*example 1/],
];

for (const [name, change, re] of CASES) {
  test(`catalog check: ${name}`, () => {
    const issues = checkCatalog(mutated(change), { codes, moveChecks: name.startsWith("move check"), examples: /example|preset|format|engine/.test(name) });
    const text = issues.map((i) => `${i.file} ${i.path} ${i.message}`).join("\n");
    assert.match(text, re, text || "(no issues)");
  });
}

test("every authored file has a schema", () => {
  for (const rel of Object.keys(SRC.files)) assert.ok(SRC.schemas[schemaFor(rel)], rel);
});

test("engine names: the doc files cover the same groups the checks compare", () => {
  const groups = Object.keys(engineNames(codes));
  assert.equal(groups.length, 8);
  assert.ok(engineNames(codes)["docs/codes.json"].length >= 70);
});

test("presets: at least 12 starters covering every body plan and most roles, each easy to see on some themes", () => {
  assert.ok(SRC.presets.length >= 12);
  assert.deepEqual(new Set(SRC.presets.map((p) => p.cast.body || "stickman")), new Set(SRC.catalog.bodyNames));
  assert.ok(new Set(SRC.presets.map((p) => p.role)).size >= 9);
  for (const p of SRC.presets) assert.ok(goodThemes(p, SRC.catalog).length >= 6, p.id);
});

test("formatJson: stable, plain-value objects stay on one line, nested ones break", () => {
  const v = { a: [1, 2], pose: { lean: 4, head: -4 }, keys: [{ t: 0, pose: "stand" }], long: { x: "y".repeat(130), n: { m: 1 } } };
  const text = formatJson(v);
  assert.deepEqual(JSON.parse(text), v);
  assert.equal(formatJson(JSON.parse(text)), text);
  assert.match(text, /"pose": \{ "lean": 4, "head": -4 \}/);
  assert.match(text, /"long": \{\n/);
});

test("addToCatalog: a reviewed draft lands in its catalog file with a description and the draft tag", async () => {
  const { mkdtempSync, cpSync, readFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { addToCatalog, moveFileFor } = await import("../../tools/lib/catalog_write.mjs");
  const root = mkdtempSync(join(tmpdir(), "catalog-"));
  try {
    cpSync(new URL("../../catalog/", import.meta.url), root, { recursive: true });
    const wave = SRC.catalog.moves.find((m) => m.name === "wave");
    const { name, description, tags, ...entry } = wave;
    assert.equal(addToCatalog("move", "wave_big", entry, { description: "a big two-arm wave", root }), "moves/emotes.json");
    const added = JSON.parse(readFileSync(join(root, "moves/emotes.json"), "utf8")).at(-1);
    assert.deepEqual([added.name, added.description, added.tags], ["wave_big", "A big two-arm wave.", ["draft"]]);
    assert.throws(() => addToCatalog("move", "wave", entry, { description: "again", root }), /already exists/);
    addToCatalog("object", "stool", { behavior: "seat", draw: "chair", w: 60, h: 90, seatY: 60, slots: [0] }, { description: "a small stool", root });
    assert.equal(JSON.parse(readFileSync(join(root, "world/objects.json"), "utf8")).stool.description, "A small stool.");
    const next = readCatalogDir(root);
    assert.deepEqual(checkCatalog(next, { codes, moveChecks: false }), []);
    assert.deepEqual([moveFileFor({ category: "attack", needsProp: "sword" }), moveFileFor({ category: "attack" }), moveFileFor({ category: "reaction" })], ["armed", "unarmed", "reactions"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
