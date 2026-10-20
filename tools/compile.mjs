#!/usr/bin/env node
// Expand a story's macros and print the result (STORY_SPEC 11.3, S6.6).
// Usage:
//   node tools/compile.mjs <story.json>                    print the compiled script (every macro expanded)
//   node tools/compile.mjs <story.json> --summary          one line per macro: what it expanded to
//   node tools/compile.mjs <story.json> --eject <macroId> [--out file.json]
//                                                         the script with that macro written out as beats (or scenes)
// The script is validated first; exit code 0 ok, 1 invalid script or unknown macro, 2 usage or unreadable input.

import { readFileSync, writeFileSync } from "node:fs";
import { validate, formatIssues, compileScript, ejectMacro } from "../engine/index.js";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const file = args.find((a, i) => !a.startsWith("--") && !["--eject", "--out"].includes(args[i - 1]));
if (!file) {
  console.error("usage: node tools/compile.mjs <story.json> [--summary] [--eject <macroId> [--out file.json]]");
  process.exit(2);
}
let script;
try {
  script = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  console.error(`cannot read ${file}: ${e.message}`);
  process.exit(2);
}
const v = validate(script, catalog);
if (v.stage !== "dry-run") {
  console.error(`INVALID (${v.stage}): fix these before compiling\n${formatIssues(v.errors)}`);
  process.exit(1);
}
const write = (obj) => {
  const text = `${JSON.stringify(obj, null, 2)}\n`;
  if (opt("--out")) writeFileSync(opt("--out"), text);
  else process.stdout.write(text);
};
const id = opt("--eject");
if (id) {
  const out = ejectMacro(script, id, catalog);
  if (!out) {
    console.error(`no macro '${id}' in ${file}`);
    process.exit(1);
  }
  write(out);
  if (opt("--out")) console.error(`wrote ${opt("--out")} with '${id}' ejected`);
  process.exit(0);
}
const { script: compiled, expansions } = compileScript(script, catalog);
if (args.includes("--summary")) {
  for (const x of expansions) {
    const what = x.scenes ? `${x.scenes.length} scenes: ${x.scenes.join(", ")}` : `${x.beats.length} beat${x.beats.length === 1 ? "" : "s"}; anchors ${Object.keys(x.anchors).join(", ")}`;
    console.log(`${`${x.sceneId ?? x.id} ${x.path}`.padEnd(30)} @${x.macro} ${x.id}: ${what}`);
  }
  if (!expansions.length) console.log("no macros");
} else write(compiled);
