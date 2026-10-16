#!/usr/bin/env node
// Validate a script and print errors, warnings and the timeline (spec 16).
// Usage:
//   node tools/validate.mjs <script.json> [--json]
//   node tools/validate.mjs --schema          print the JSON Schema with catalog enums (for LLM structured output)
// Exit code: 0 valid, 1 invalid, 2 usage or unreadable input.

import { readFileSync } from "node:fs";
import { validate, formatIssues, buildJsonSchema, WORLD_COMMANDS } from "../engine/validator/index.js";
import { movesFor } from "../engine/sim.js";
import { catalog } from "../data/index.js";

const args = process.argv.slice(2);
if (args.includes("--schema")) {
  console.log(JSON.stringify(buildJsonSchema(catalog, [...movesFor(catalog).keys()], Object.keys(WORLD_COMMANDS)), null, 2));
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
const r = validate(script, catalog);
if (args.includes("--json")) {
  console.log(JSON.stringify(r, null, 2));
} else {
  console.log(`${r.ok ? "VALID" : "INVALID"} (${r.stage}): ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
  if (r.errors.length || r.warnings.length) console.log(formatIssues([...r.errors, ...r.warnings]));
  if (r.timeline) console.log(`\ntimeline:\n${r.timeline}`);
}
process.exit(r.ok ? 0 : 1);
