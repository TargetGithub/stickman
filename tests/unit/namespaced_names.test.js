// Catalog names from bundles (CATALOG_BUNDLE_SPEC 5.1, B1.2): every field that holds a catalog name
// accepts a namespaced name such as "acme:robo" when the catalog has it, mood and activity names come
// from the catalog, and ids keep their patterns.

import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog as base } from "../../catalog/index.js";
import { validate } from "../../engine/index.js";
import { checkValue, jsonSchema } from "../../engine/validator/schema.js";
import { jsonSchemaV2, schemaV2For } from "../../engine/validator/schema_v2.js";
import { MACRO_PARAMS, macroParamsFor } from "../../engine/validator/macro_params.js";
import { WORLD_COMMANDS_V2, worldCommandsV2For } from "../../engine/validator/semantic.js";
import { V2_ENUMS, catalogNames } from "../../engine/validator/v2_names.js";

const N = "acme:robo";
const PIN = { id: "acme", version: "1.0.0", hash: `sha256-${"a".repeat(64)}` };
const copy = (v) => JSON.parse(JSON.stringify(v));

/** The base catalog plus one entry named "acme:robo" of every kind a bundle can add. */
function withAcme() {
  const c = { ...base };
  const add = (key, from) => ({ ...c[key], [N]: copy(c[key][from]) });
  c.themes = add("themes", "city_park");
  c.themeNames = [...c.themeNames, N];
  c.bodies = add("bodies", "buddy");
  c.bodyNames = [...c.bodyNames, N];
  c.faces = add("faces", "happy");
  c.faceNames = [...c.faceNames, N];
  c.fxPresets = add("fxPresets", "sparkle");
  c.fxNames = [...c.fxNames, N];
  c.props = add("props", "staff");
  c.objects = add("objects", "bench");
  c.activities = add("activities", "dance_together");
  c.activityNames = [...c.activityNames, N];
  c.musicMoods = add("musicMoods", "happy");
  c.moves = [...c.moves, { ...copy(c.moves.find((m) => m.name === "wave")), name: N }];
  c.bundles = [{ ...PIN, audience: ["kids", "general"], dependencies: [] }]; // what mergeBundles records
  return c;
}
const acme = withAcme();

/** The subschema at a path of property names ("[]" steps into items, "|n" into oneOf branch n). */
function at(schema, path) {
  let s = schema;
  for (const step of path.split(".")) {
    if (step === "[]") s = s.items;
    else if (step.startsWith("|")) s = s.oneOf[+step.slice(1)];
    else s = s.properties[step];
    assert.ok(s, `${path}: no schema at ${step}`);
  }
  return s;
}

const v2 = schemaV2For(acme);
const macros = macroParamsFor(acme);
const SCENE = "scenes.[].|0";
const BEAT = `${SCENE}.beats.[].|0`;

// [where, schema, path] for every field that holds a catalog name.
const NAME_FIELDS = [
  ["v1 meta.theme", jsonSchema, "meta.theme"],
  ["v1 characters.prop", jsonSchema, "characters.[].prop"],
  ["v1 beats.do", jsonSchema, "beats.[].do"],
  ["v1 beats.fx", jsonSchema, "beats.[].fx.[]"],
  ["v1 audio.music", jsonSchema, "audio.music"],
  ["v2 cast.body", v2, "cast.[].body"],
  ["v2 cast.prop", v2, "cast.[].prop"],
  ["v2 locations.theme", v2, "locations.[].theme"],
  ["v2 locations.set.object", v2, "locations.[].set.[].object"],
  ["v2 scenes.location (a theme name)", v2, `${SCENE}.location`],
  ["v2 scenes.set.object", v2, `${SCENE}.set.[].object`],
  ["v2 scenes.music.mood", v2, `${SCENE}.music.|1.mood`],
  ["v2 scene macro music.mood", v2, "scenes.[].|1.music.|1.mood"],
  ["v2 scenes.cast.face", v2, `${SCENE}.cast.[].face`],
  ["v2 scenes.cast.prop", v2, `${SCENE}.cast.[].prop`],
  ["v2 beats.do", v2, `${BEAT}.do`],
  ["v2 beats.fx", v2, `${BEAT}.fx.[]`],
  ["v2 beats.face", v2, `${BEAT}.face`],
  ["@activity name", macros.activity, "name"],
  ["@fight finisher", macros.fight, "finisher"],
  ["@gauntlet finisher", macros.gauntlet, "finisher"],
  ["@fight_card matchups.location", macros.fight_card, "matchups.[].location"],
  ["@montage clips.location", macros.montage, "clips.[].location"],
  ["@montage clips.do", macros.montage, "clips.[].do"],
];
for (const [where, schema, path] of NAME_FIELDS) {
  test(`namespaced name accepted: ${where}`, () => assert.deepEqual(checkValue(N, at(schema, path)), []));
}

const ID_FIELDS = [
  ["v1 characters.id", jsonSchema, "characters.[].id"],
  ["v1 beats.id", jsonSchema, "beats.[].id"],
  ["v2 cast.id", v2, "cast.[].id"],
  ["v2 locations.id", v2, "locations.[].id"],
  ["v2 set piece id", v2, "locations.[].set.[].id"],
  ["v2 scenes.id", v2, `${SCENE}.id`],
  ["v2 beats.id", v2, `${BEAT}.id`],
  ["v2 beats.object (a set piece id)", v2, `${BEAT}.object`],
  ["@activity object (a set piece id)", macros.activity, "object"],
  ["@defeat who", macros.defeat, "who"],
];
for (const [where, schema, path] of ID_FIELDS) {
  test(`ids keep their pattern: ${where}`, () => assert.deepEqual(checkValue(N, at(schema, path)).map((i) => i.code), ["E_SCHEMA_PATTERN"]));
}

test("mood and activity names come from the catalog, with the frozen lists as the fallback", () => {
  assert.equal(schemaV2For(base), jsonSchemaV2, "the base catalog keeps the prebuilt schema");
  assert.equal(macroParamsFor(base), MACRO_PARAMS);
  assert.equal(worldCommandsV2For(base), WORLD_COMMANDS_V2);
  assert.deepEqual(catalogNames({}), { mood: V2_ENUMS.mood, activity: V2_ENUMS.activity, frozen: true });
  const w = worldCommandsV2For(acme);
  assert.ok(w.set_music.mood.enum.includes(N) && w.activity.name.enum.includes(N) && w.activity.name.required);
  assert.ok(v2.$defs.enums.mood.includes(N) && v2.$defs.enums.activity.includes(N));
  assert.ok(!jsonSchemaV2.$defs.enums.mood.includes(N), "the frozen schema is not changed");
  const small = { ...base, musicMoods: { calm: base.musicMoods.calm }, activityNames: ["sleep"] };
  assert.equal(checkValue("happy", at(schemaV2For(small), `${SCENE}.music.|1.mood`))[0].code, "E_SCHEMA_ENUM");
  assert.equal(checkValue("comfort", macroParamsFor(small).activity.properties.name)[0].code, "E_SCHEMA_ENUM");
});

test("a v2 story using namespaced names of every kind validates", () => {
  const story = {
    version: 2,
    bundles: [PIN],
    meta: { title: "Acme", format: "landscape", seed: 1, kind: "clip", audience: "kids" },
    cast: [
      { id: "kai", color: "#3fd8ff" },
      { id: "bot", body: N, color: "#3d7bd9" },
    ],
    locations: [{ id: "park", theme: N, set: [{ id: "seat", object: N, x: 2200 }] }],
    scenes: [{
      id: "s1", location: "park", music: { mood: N },
      cast: [{ id: "kai", x: 1300, facing: 1, face: N }, { id: "bot", x: 1700, facing: -1 }],
      beats: [
        { id: "b1", at: 0.5, who: "bot", do: N, fx: [N], face: N },
        { id: "b2", at: { after: "b1" }, who: "world", do: "set_music", params: { mood: N } },
        { id: "b3", at: { after: "b1" }, macro: "activity", params: { name: N, with: ["kai", "bot"], dur: 4 } },
        { id: "b4", at: { after: "b3" }, who: "world", do: "set_theme", params: { theme: N } },
        { id: "b5", at: { after: "b4" }, who: "world", do: "activity", params: { name: N, with: ["kai", "bot"], dur: 3 } },
        { id: "b6", at: { after: "b5" }, who: "world", do: "spawn_object", params: { kind: N, x: 2600 } },
      ],
    }],
  };
  const r = validate(story, acme);
  assert.deepEqual(r.errors, []);
  assert.ok(r.stage === "dry-run");
  const unknown = validate(story, base);
  assert.deepEqual(unknown.errors.map((e) => e.code), ["E_BUNDLE_MISSING"], "the same story without the bundle loaded");
  const { bundles, ...undeclared } = story;
  const u = validate(undeclared, acme);
  assert.equal(u.stage, "bundles");
  assert.ok(u.errors.length && u.errors.every((e) => e.code === "E_BUNDLE_UNDECLARED"), JSON.stringify(u.errors));
  assert.equal(u.errors[0].path, "cast[1].body");
});

test("a v1 script using namespaced names validates", () => {
  const script = {
    version: 1,
    bundles: [PIN],
    meta: { title: "Acme", format: "landscape", seed: 1, theme: N },
    characters: [{ id: "a", x: 1200, facing: 1, color: "#3fd8ff", prop: N }, { id: "b", x: 1700, facing: -1, color: "#ff7a3d" }],
    camera: [{ at: 0, mode: "follow", targets: ["a", "b"] }],
    beats: [
      { id: "w", at: 0.3, who: "a", do: N, fx: [N] },
      { at: { after: "w" }, who: "world", do: "spawn_prop", params: { prop: N, x: 1500 } },
      { at: 1, who: "world", do: "set_theme", params: { theme: N } },
      { at: 1.5, who: "b", do: "jab", target: "a", outcome: "hit", approach: "run" },
      { at: 3.5, who: "world", do: "fade", params: { to: "black", dur: 0.5 } },
    ],
    audio: { music: N },
  };
  const r = validate(script, acme);
  assert.deepEqual(r.errors, []);
});
