// Schema v2 draft (S0): the generated JSON snapshot matches the code, the reference story
// passes it, macro params pass their own schemas, and typical mistakes get the expected codes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { jsonSchemaV2 } from "../../engine/validator/schema_v2.js";
import { MACRO_PARAMS, MACRO_ANCHORS } from "../../engine/validator/macro_params.js";
import { V2_ENUMS } from "../../engine/validator/v2_names.js";
import { checkValue, exportSchema } from "../../engine/validator/schema.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const reference = read("../fixtures/v2/reference_abridged.json");
const codes = (issues) => issues.map((i) => i.code);

test("docs/schema/script-v2.schema.json is generated from schema_v2.js", () => {
  assert.deepEqual(read("../../docs/schema/script-v2.schema.json"), exportSchema(jsonSchemaV2), "run: node tools/validate.mjs --schema-v2 > docs/schema/script-v2.schema.json");
});

test("the reference story passes the v2 schema", () => {
  assert.deepEqual(checkValue(reference, jsonSchemaV2), []);
});

test("every macro beat in the reference story passes its param schema", () => {
  let n = 0;
  for (const scene of reference.scenes) {
    for (const beat of scene.beats) {
      if (!beat.macro) continue;
      n++;
      assert.deepEqual(checkValue(beat.params, MACRO_PARAMS[beat.macro], `${scene.id}.${beat.id}`), [], beat.macro);
    }
  }
  assert.ok(n >= 8);
});

test("every macro has a param schema, and every beat macro has anchors", () => {
  for (const m of [...V2_ENUMS.beatMacro, ...V2_ENUMS.sceneMacro]) assert.ok(MACRO_PARAMS[m], m);
  for (const m of V2_ENUMS.beatMacro) assert.deepEqual(MACRO_ANCHORS[m].slice(0, 2), ["start", "end"], m);
});

const mutate = (fn) => {
  const s = structuredClone(reference);
  fn(s);
  return codes(checkValue(s, jsonSchemaV2));
};

const BAD = [
  ["version 3", (s) => { s.version = 3; }, "E_SCHEMA_ENUM"],
  ["v1 'characters' at top level", (s) => { s.characters = []; }, "E_SCHEMA_UNKNOWN_FIELD"],
  ["body plan of the wrong type", (s) => { s.cast[1].body = 2; }, "E_SCHEMA_TYPE"],
  ["face of the wrong type", (s) => { s.scenes[0].cast[0].face = 3; }, "E_SCHEMA_TYPE"],
  ["accessory singular (pre-freeze name)", (s) => { s.cast[1].appearance.accessory = { antenna: "#ffcc00" }; }, "E_SCHEMA_UNKNOWN_FIELD"],
  ["macro written as who:@fight (no 'do')", (s) => { s.scenes[3].beats[1] = { at: 1, who: "@fight", params: {} }; }, "E_SCHEMA_REQUIRED"],
  ["macro beat with action fields", (s) => { s.scenes[3].beats[1].who = "kai"; }, "E_SCHEMA_UNKNOWN_FIELD"],
  ["think as a field (pre-freeze name)", (s) => { s.scenes[0].beats[3].think = "Hmm"; }, "E_SCHEMA_UNKNOWN_FIELD"],
  ["scene macro without params", (s) => { s.scenes.push({ id: "fc", macro: "fight_card" }); }, "E_SCHEMA_REQUIRED"],
  ["unknown transition", (s) => { s.scenes[1].transitionIn.type = "spin"; }, "E_SCHEMA_ENUM"],
  ["bad music", (s) => { s.scenes[0].music = "happy"; }, "E_SCHEMA_FORM"],
  ["scene at beyond 300 s", (s) => { s.scenes[0].beats[0].at = 400; }, "E_SCHEMA_RANGE"],
  ["too many on stage", (s) => { s.scenes[2].cast.push(...Array.from({ length: 4 }, (_, i) => ({ id: `x${i}`, x: 0 }))); }, "E_SCHEMA_SIZE"],
  ["scene without cast", (s) => { delete s.scenes[0].cast; }, "E_SCHEMA_REQUIRED"],
];

for (const [name, fn, code] of BAD) {
  test(`schema v2 rejects: ${name} → ${code}`, () => assert.ok(mutate(fn).includes(code), JSON.stringify(mutate(fn))));
}

const BAD_PARAMS = [
  ["fight with one side", "fight", { sides: ["kai"], winner: "kai" }, "E_SCHEMA_SIZE"],
  ["gauntlet with 7 opponents", "gauntlet", { hero: "kai", opponents: ["a", "b", "c", "d", "e", "f", "g"] }, "E_SCHEMA_SIZE"],
  ["defeat style unknown", "defeat", { who: "pip", style: "explode" }, "E_SCHEMA_ENUM"],
  ["dialogue line too short", "dialogue", { lines: [["kai"]] }, "E_SCHEMA_SIZE"],
  ["activity rallies (pre-freeze name)", "activity", { name: "tennis_rally", with: ["kai"], rallies: 4 }, "E_SCHEMA_UNKNOWN_FIELD"],
  ["travel destination form", "travel", { who: ["kai"], to: { left: 3 } }, "E_SCHEMA_FORM"],
];

for (const [name, macro, params, code] of BAD_PARAMS) {
  test(`macro params reject: ${name} → ${code}`, () => assert.ok(codes(checkValue(params, MACRO_PARAMS[macro])).includes(code)));
}
