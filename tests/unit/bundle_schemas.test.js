// The catalog bundle schemas (CATALOG_BUNDLE_SPEC 4, B1.3): catalog/schemas/bundle/ equals the spec,
// follows its conventions, stays in step with the engine's vocabularies, accepts the worked example of
// 11.1 and rejects the invalid bundle of 11.2 with the listed checker codes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { checkValue } from "../../engine/validator/schema.js";
import { V2_ENUMS, OBJECT_BEHAVIORS } from "../../engine/validator/v2_names.js";
import { POSE_CHANNELS } from "../../engine/types.js";
import { CATEGORIES, HIT_PARTS, SHAKES } from "../../engine/moves.js";
import { easings } from "../../engine/math.js";
import { LAYER_KINDS } from "../../engine/renderer/background.js";
import { OBJECT_SHAPES } from "../../engine/renderer/objects.js";
import { PROP_SHAPES } from "../../engine/renderer/props.js";
import { PATCHES } from "../../tools/lib/instruments.mjs";
import { readBundleSchemas, readCatalogDir } from "../../tools/lib/catalog_files.mjs";
import { catalog as base } from "../../catalog/index.js";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const SCHEMAS = readBundleSchemas();
const opts = { schemas: SCHEMAS };
const NAMES = ["activities", "bodies", "bundle", "common", "examples", "faces", "fx", "moves", "music_moods", "objects", "poses", "preset", "props", "themes"];

/** The schema for a bundle file path (section 3). */
function schemaOf(rel) {
  if (rel === "bundle.json") return "bundle";
  if (rel === "moves/poses.json") return "poses";
  if (rel.startsWith("moves/")) return "moves";
  if (rel.startsWith("characters/presets/")) return "preset";
  if (/^examples\/(clips|stories)\//.test(rel)) return null; // scripts: checked by the validator (step 11)
  return { "characters/bodies.json": "bodies", "characters/faces.json": "faces", "effects/fx.json": "fx", "world/themes.json": "themes",
    "world/objects.json": "objects", "world/props.json": "props", "story/activities.json": "activities", "story/music_moods.json": "music_moods", "examples/index.json": "examples" }[rel];
}
const check = (value, name, path = "") => checkValue(value, SCHEMAS[`${name}.schema.json`], path, opts);
const codes = (issues) => issues.map((i) => `${i.code} ${i.path}`);

function readBundle(dir) {
  const out = {};
  const walk = (d) => {
    for (const f of readdirSync(d).sort()) {
      const full = join(d, f);
      if (statSync(full).isDirectory()) walk(full);
      else if (f.endsWith(".json")) out[relative(dir, full).split("\\").join("/")] = JSON.parse(readFileSync(full, "utf8"));
    }
  };
  walk(dir);
  return out;
}

/** Every subschema with its JSON pointer. */
function* nodes(s, ptr = "") {
  if (Array.isArray(s)) for (const [i, v] of s.entries()) yield* nodes(v, `${ptr}/${i}`);
  else if (s && typeof s === "object") {
    yield [s, ptr];
    for (const [k, v] of Object.entries(s)) if (k !== "enum" && k !== "const") yield* nodes(v, `${ptr}/${k}`);
  }
}

test("the bundle schemas are exactly the ones in the spec (section 4)", () => {
  const spec = readFileSync(here("../../docs/CATALOG_BUNDLE_SPEC.md"), "utf8");
  const sec = spec.slice(spec.indexOf("## 4. Strict schemas"), spec.indexOf("## 5. Naming and references"));
  const blocks = [...sec.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]));
  assert.deepEqual(blocks.map((b) => b.$id).sort(), NAMES.map((n) => `${n}.schema.json`));
  for (const b of blocks) assert.deepEqual(SCHEMAS[b.$id], b, b.$id);
});

test("every bundle schema is named, titled and draft 2020-12", () => {
  assert.deepEqual(Object.keys(SCHEMAS), NAMES.map((n) => `${n}.schema.json`));
  for (const [file, s] of Object.entries(SCHEMAS)) {
    assert.equal(s.$id, file);
    assert.equal(s.$schema, "https://json-schema.org/draft/2020-12/schema", file);
    assert.ok(typeof s.title === "string" && s.title.length > 20, `${file}: title`);
  }
});

test("conventions (4.1): $refs resolve within common or the same file, objects are closed, numbers ranged", () => {
  for (const [file, s] of Object.entries(SCHEMAS)) {
    for (const [n, ptr] of nodes(s)) {
      if (n.$ref) {
        const [doc, frag] = n.$ref.split("#");
        assert.ok(doc === "" || doc === "common.schema.json", `${file}${ptr}: $ref ${n.$ref}`);
        const target = frag.split("/").slice(1).reduce((o, k) => o?.[k], doc ? SCHEMAS[doc] : s);
        assert.ok(target, `${file}${ptr}: $ref ${n.$ref} resolves`);
      }
      const types = [].concat(n.type || []);
      if (types.includes("object")) {
        assert.ok("additionalProperties" in n, `${file}${ptr}: object without additionalProperties`);
      }
      if (types.includes("number") || types.includes("integer")) {
        assert.ok(n.minimum !== undefined && n.maximum !== undefined, `${file}${ptr}: number without a range`);
      }
    }
  }
});

test("schema enums match the engine's vocabularies", () => {
  const c = SCHEMAS["common.schema.json"].$defs;
  const m = SCHEMAS["moves.schema.json"].$defs.move.properties;
  const b = SCHEMAS["bodies.schema.json"].$defs;
  const p = SCHEMAS["preset.schema.json"].properties.cast.properties;
  const o = SCHEMAS["objects.schema.json"].$defs;
  assert.deepEqual(Object.keys(c.poseChannels.properties), POSE_CHANNELS);
  assert.deepEqual(m.category.enum, CATEGORIES.filter((x) => x !== "defeat"));
  assert.deepEqual(m.keys.items.properties.ease.enum, Object.keys(easings));
  assert.deepEqual(m.root.items.properties.ease.enum, Object.keys(easings));
  assert.deepEqual(m.hits.items.properties.part.enum, HIT_PARTS);
  assert.deepEqual(m.hits.items.properties.shake.enum, SHAKES);
  for (const look of [b.humanoid.properties.appearance.properties, p.appearance.properties]) {
    for (const k of ["eyes", "brows", "mouthStyle", "hair", "outfit"]) assert.deepEqual(look[k].enum, V2_ENUMS[k], k);
  }
  assert.ok(b.quadruped.properties.appearance.properties.eyes.enum.every((e) => V2_ENUMS.eyes.includes(e)));
  assert.deepEqual(Object.keys(p.appearance.properties.accessories.properties), V2_ENUMS.accessory);
  assert.deepEqual(p.voice.properties.timbre.enum, V2_ENUMS.timbre);
  const roles = readCatalogDir().files["characters/roles.json"].roles.map((r) => r.name);
  assert.deepEqual(SCHEMAS["preset.schema.json"].properties.role.enum, roles);
  const layers = SCHEMAS["themes.schema.json"].$defs.theme.properties.layers.items.oneOf.map((r) => r.$ref.split("/").pop());
  assert.deepEqual(layers, LAYER_KINDS);
  for (const k of LAYER_KINDS) assert.equal(SCHEMAS["themes.schema.json"].$defs[k].properties.kind.const, k);
  assert.deepEqual(o.shape.enum, [...OBJECT_SHAPES(), "paths"]);
  assert.deepEqual(o.hold.properties.shape.enum, PROP_SHAPES);
  assert.deepEqual(SCHEMAS["props.schema.json"].additionalProperties.properties.shape.enum, PROP_SHAPES);
  assert.deepEqual(SCHEMAS["objects.schema.json"].additionalProperties.oneOf.map((r) => r.$ref.split("/").pop()), OBJECT_BEHAVIORS);
  assert.deepEqual(SCHEMAS["music_moods.schema.json"].$defs.patch.enum, PATCHES);
});

test("the worked example robo_pals (11.1) passes every schema", () => {
  const files = readBundle(here("../fixtures/bundles/robo_pals"));
  const manifest = files["bundle.json"];
  assert.deepEqual(manifest.files.map((f) => f.path), Object.keys(files).filter((f) => f !== "bundle.json").sort());
  for (const [rel, value] of Object.entries(files)) {
    const name = schemaOf(rel);
    if (name) assert.deepEqual(check(value, name), [], rel);
  }
});

const BAD = JSON.parse(readFileSync(here("../fixtures/bundles/zz_bad.expect.json"), "utf8"));
const badFiles = readBundle(here("../fixtures/bundles/zz_bad"));
test("zz_bad.expect.json covers every file of the bad bundle", () => assert.deepEqual(Object.keys(BAD.schema).sort(), Object.keys(badFiles).sort()));
for (const [rel, want] of Object.entries(BAD.schema)) {
  test(`the invalid bundle zz_bad (11.2): ${rel} → ${want.join(", ") || "passes the schema"}`, () => assert.deepEqual(codes(check(badFiles[rel], schemaOf(rel))), want));
}

test("small breakages give the checker's codes", () => {
  const ex = readBundle(here("../fixtures/bundles/robo_pals"));
  const cases = [
    ["bodies", { "robo_pals:boxbot": { ...ex["characters/bodies.json"]["robo_pals:boxbot"], rig: "spider" } }, ["E_SCHEMA_ENUM robo_pals:boxbot.rig"]],
    ["bodies", { "robo_pals:boxbot": { ...ex["characters/bodies.json"]["robo_pals:boxbot"], bodyWidth: 12 } }, ["E_SCHEMA_UNKNOWN_FIELD robo_pals:boxbot.bodyWidth"]],
    ["bodies", { boxbot: ex["characters/bodies.json"]["robo_pals:boxbot"] }, ["E_SCHEMA_PATTERN boxbot"]],
    ["poses", { "robo_pals:p": {} }, ["E_SCHEMA_SIZE robo_pals:p"]],
    ["poses", { "robo_pals:p": { lUA: 400 } }, ["E_SCHEMA_RANGE robo_pals:p.lUA"]],
    ["poses", Object.fromEntries(Array.from({ length: 129 }, (_, i) => [`robo_pals:p${i}`, { rot: 0 }])), ["E_SCHEMA_SIZE "]],
    ["moves", [{ ...ex["moves/emotes.json"][0], tags: ["robot", "robot"] }], ["E_REF_DUPLICATE [0].tags[1]"]],
    ["moves", [{ ...ex["moves/emotes.json"][0], events: [{ t: 0.5, give: true }] }], ["E_SCHEMA_UNKNOWN_FIELD [0].events[0].give"]],
    ["moves", [{ ...ex["moves/emotes.json"][0], root: [{ t: 0, dx: "Math.random()" }, { t: 1 }] }], ["E_SCHEMA_PATTERN [0].root[0].dx"]],
    ["objects", { "robo_pals:x": { ...ex["world/objects.json"]["robo_pals:charging_pad"], behavior: "teleporter" } }, ["E_SCHEMA_ENUM robo_pals:x.behavior"]],
    ["objects", { "robo_pals:x": { ...ex["world/objects.json"]["robo_pals:charging_pad"], colors: { base: "url(#evil)" } } }, ["E_SCHEMA_PATTERN robo_pals:x.colors.base"]],
    ["bundle", { ...ex["bundle.json"], contentHash: "sha256-9c4e…" }, ["E_SCHEMA_PATTERN contentHash"]],
    ["bundle", { ...ex["bundle.json"], files: [...ex["bundle.json"].files, { path: "../evil.json", sha256: ex["bundle.json"].contentHash }] }, ["E_SCHEMA_PATTERN files[7].path"]],
  ];
  for (const [name, value, want] of cases) assert.deepEqual(codes(check(value, name)), want, `${name}: ${want}`);
});

test("the base catalog's own entries pass the bundle schemas once prefixed (4.1, checked while drafting)", () => {
  const doc = (name) => SCHEMAS[`${name}.schema.json`];
  const one = (value, name, key) => checkValue(value, doc(name).additionalProperties, key, { ...opts, root: doc(name) });
  const issues = [];
  const each = (map, name, skip = () => false) => {
    for (const [k, v] of Object.entries(map)) if (!skip(k, v)) issues.push(...one(v, name, k));
  };
  each(base.themes, "themes");
  each(base.faces, "faces");
  each(base.props, "props");
  each(base.objects, "objects");
  each(base.bodies, "bodies");
  each(base.activities, "activities", (k, v) => !["loop", "rally"].includes(v.runner)); // fetch, race, tug and pyramid stay built-in
  each(base.fxPresets, "fx", (k, v) => v.internal);
  const moods = doc("music_moods");
  for (const [k, v] of Object.entries(base.musicMoods)) issues.push(...checkValue(v, moods.properties.moods.additionalProperties, k, { ...opts, root: moods }));
  assert.deepEqual(issues.map((i) => `${i.code} ${i.path}: ${i.message}`), []);
});
