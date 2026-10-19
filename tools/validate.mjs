#!/usr/bin/env node
// Validate a script and print errors, warnings and the timeline (spec 16).
// Usage:
//   node tools/validate.mjs <script.json> [--json]
//   node tools/validate.mjs --schema          print the JSON Schema with catalog enums (for LLM structured output)
//   node tools/validate.mjs --schema-v2       print the story schema v2 draft (docs/schema/script-v2.schema.json)
//   node tools/validate.mjs --schema-v3       print the v3 schema (v2 plus depth; docs/schema/script-v3.schema.json)
// Exit code: 0 valid, 1 invalid, 2 usage or unreadable input.

import { readFileSync } from "node:fs";
import { validate, formatIssues, buildJsonSchema, WORLD_COMMANDS } from "../engine/validator/index.js";
import { jsonSchemaV2 } from "../engine/validator/schema_v2.js";
import { jsonSchemaV3 } from "../engine/validator/schema_v3.js";
import { exportSchema } from "../engine/validator/schema.js";
import { v1MoveNames } from "../engine/sim.js";
import { catalog, catalogForScript } from "../catalog/index.js";

const args = process.argv.slice(2);
if (args.includes("--schema-v3")) {
  console.log(JSON.stringify(exportSchema(jsonSchemaV3), null, 2));
  process.exit(0);
}
if (args.includes("--schema-v2")) {
  console.log(JSON.stringify(exportSchema(jsonSchemaV2), null, 2));
  process.exit(0);
}
if (args.includes("--schema")) {
  console.log(JSON.stringify(buildJsonSchema(catalog, v1MoveNames(catalog), Object.keys(WORLD_COMMANDS)), null, 2));
  process.exit(0);
}
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: node tools/validate.mjs <script.json> [--json] | --schema");
  process.exit(2);
}
let script;
try {
  script = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  console.error(`cannot read ${file}: ${e.message}`);
  process.exit(2);
}
const r = validate(script, catalogForScript(script));
if (args.includes("--json")) {
  console.log(JSON.stringify(r, null, 2));
} else {
  console.log(`${r.ok ? "VALID" : "INVALID"} (${r.stage}): ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
  if (r.errors.length || r.warnings.length) console.log(formatIssues([...r.errors, ...r.warnings]));
  if (r.timeline) console.log(`\ntimeline:\n${r.timeline}`);
}
process.exit(r.ok ? 0 : 1);
