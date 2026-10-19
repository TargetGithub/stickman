// The schema checker's bundle keywords (CATALOG_BUNDLE_SPEC 4.1, B1.1): $ref/$defs, propertyNames,
// minProperties/maxProperties, uniqueItems and the checker-only x-discriminator.

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkValue, exportSchema } from "../../engine/validator/schema.js";

const codes = (issues) => issues.map((i) => `${i.code} ${i.path}`);

const common = {
  $id: "common.schema.json",
  $defs: {
    name: { type: "string", pattern: "^[a-z]+$" },
    pair: { type: "array", minItems: 2, maxItems: 2, items: { $ref: "#/$defs/unit" } },
    unit: { type: "number", minimum: 0, maximum: 1 },
    alias: { $ref: "#/$defs/name", description: "a ref with only annotations" },
  },
};
const schemas = { "common.schema.json": common };

const CASES = [
  // $ref / $defs
  ["local $ref passes", { $defs: { n: { type: "integer" } }, $ref: "#/$defs/n" }, 3, []],
  ["local $ref fails", { $defs: { n: { type: "integer" } }, $ref: "#/$defs/n" }, "x", ["E_SCHEMA_TYPE "]],
  ["nested local $ref", { $defs: { n: { $ref: "#/$defs/m" }, m: { enum: ["a"] } }, type: "object", properties: { k: { $ref: "#/$defs/n" } } }, { k: "b" }, ["E_SCHEMA_ENUM k"]],
  ["common $ref passes", { $ref: "common.schema.json#/$defs/name" }, "abc", []],
  ["common $ref fails", { $ref: "common.schema.json#/$defs/name" }, "Abc", ["E_SCHEMA_PATTERN "]],
  ["common refs resolve inside common", { $ref: "common.schema.json#/$defs/pair" }, [0.5, 2], ["E_SCHEMA_RANGE [1]"]],
  ["annotation-only ref chain", { $ref: "common.schema.json#/$defs/alias" }, "ABC", ["E_SCHEMA_PATTERN "]],
  ["$ref with siblings checks both", { $ref: "common.schema.json#/$defs/name", maxLength: 2 }, "abc", ["E_TEXT_LENGTH "]],
  ["oneOf over $refs picks the shaped branch", { oneOf: [{ $ref: "common.schema.json#/$defs/name" }, { $ref: "common.schema.json#/$defs/pair" }] }, [0.5, 3], ["E_SCHEMA_RANGE [1]"]],
  // propertyNames
  ["propertyNames pass", { type: "object", propertyNames: { pattern: "^a:" }, additionalProperties: { type: "number" } }, { "a:x": 1 }, []],
  ["propertyNames fail", { type: "object", propertyNames: { type: "string", pattern: "^a:" }, additionalProperties: { type: "number" } }, { "b:x": 1, "a:y": "s" }, ["E_SCHEMA_PATTERN b:x", "E_SCHEMA_TYPE a:y"]],
  ["propertyNames via common ref", { type: "object", propertyNames: { $ref: "common.schema.json#/$defs/name" } }, { ok: 1, No: 2 }, ["E_SCHEMA_PATTERN No"]],
  // min/maxProperties
  ["maxProperties ok", { type: "object", maxProperties: 2 }, { a: 1, b: 2 }, []],
  ["maxProperties over", { type: "object", properties: { x: { type: "object", maxProperties: 1 } } }, { x: { a: 1, b: 2 } }, ["E_SCHEMA_SIZE x"]],
  ["minProperties under", { type: "object", minProperties: 1 }, {}, ["E_SCHEMA_SIZE "]],
  ["min/maxProperties ignore non-objects", { type: ["object", "null"], minProperties: 1 }, null, []],
  // uniqueItems
  ["uniqueItems ok", { type: "array", uniqueItems: true }, ["a", "b"], []],
  ["uniqueItems duplicate", { type: "array", uniqueItems: true }, ["a", "b", "a"], ["E_REF_DUPLICATE [2]"]],
  ["uniqueItems compares objects by value", { type: "array", uniqueItems: true }, [{ a: 1, b: 2 }, { b: 2, a: 1 }], ["E_REF_DUPLICATE [1]"]],
  ["uniqueItems false allows duplicates", { type: "array", uniqueItems: false }, [1, 1], []],
  // x-discriminator
  ...(() => {
    const s = {
      $defs: {
        sun: { type: "object", required: ["kind", "r"], additionalProperties: false, properties: { kind: { const: "sun" }, r: { type: "number", minimum: 10 } } },
        hills: { type: "object", required: ["kind", "step"], additionalProperties: false, properties: { kind: { const: "hills" }, step: { type: "number", minimum: 40 } } },
      },
      type: "array",
      items: { "x-discriminator": "kind", oneOf: [{ $ref: "#/$defs/sun" }, { $ref: "#/$defs/hills" }] },
    };
    return [
      ["discriminator valid", s, [{ kind: "sun", r: 20 }, { kind: "hills", step: 50 }], []],
      ["discriminator reports the matching branch", s, [{ kind: "hills", step: 0 }], ["E_SCHEMA_RANGE [0].step"]],
      ["discriminator branch unknown field", s, [{ kind: "sun", r: 20, step: 3 }], ["E_SCHEMA_UNKNOWN_FIELD [0].step"]],
      ["discriminator unknown value", s, [{ kind: "lasers", color: "#f00" }], ["E_SCHEMA_ENUM [0].kind"]],
      ["discriminator missing field", s, [{ r: 20 }], ["E_SCHEMA_REQUIRED [0].kind"]],
      ["discriminator on a non-object falls back to oneOf", s, ["sun"], ["E_SCHEMA_TYPE [0]"]],
    ];
  })(),
];

for (const [name, schema, value, want] of CASES) {
  test(`checkValue: ${name}`, () => assert.deepEqual(codes(checkValue(value, schema, "", { schemas })), want));
}

test("checkValue: an unknown $ref document is a schema bug, not a value issue", () => {
  assert.throws(() => checkValue(1, { $ref: "other.schema.json#/$defs/x" }), /unknown document 'other.schema.json'/);
  assert.throws(() => checkValue(1, { $ref: "#/$defs/missing" }), /points at nothing/);
});

test("checkValue: the discriminator message lists the allowed values", () => {
  const s = { "x-discriminator": "rig", oneOf: [{ type: "object", properties: { rig: { const: "humanoid" } } }, { type: "object", properties: { rig: { const: "quadruped" } } }] };
  const [i] = checkValue({ rig: "humanoit" }, s);
  assert.match(i.fix, /"humanoid", "quadruped" \(closest: "humanoid"\)/);
});

test("checkValue: propertyNames issues name the key", () => {
  const [i] = checkValue({ Bad: 1 }, { type: "object", propertyNames: { pattern: "^[a-z]+$" } });
  assert.equal(i.path, "Bad");
  assert.match(i.message, /^Name "Bad": /);
});

test("exportSchema drops x-discriminator like the other checker-only keywords", () => {
  const out = exportSchema({ oneOf: [{ const: 1 }], "x-discriminator": "kind", "x-select": "macro" });
  assert.deepEqual(out, { oneOf: [{ const: 1 }] });
});
