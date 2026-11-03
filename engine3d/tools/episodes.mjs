#!/usr/bin/env node
// The tracked Toy Box Friends episode list (lib/episodes.mjs).
//   node engine3d/tools/episodes.mjs                    rewrite scripts/series/toybox/EPISODES.md
//   node engine3d/tools/episodes.mjs --check            exit 1 if EPISODES.md is stale or episodes.json is wrong
//   node engine3d/tools/episodes.mjs --set <id> <status> [location]   e.g. --set g301 rendered disk1:GRADE3-PLAYLIST/g301_array_garden
//   node engine3d/tools/episodes.mjs --scan             mark episodes whose final_4k60.mp4 is found under the roots as rendered

import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { buildEpisodesMd, checkRegistry, readScripts, scanRenders, STATUSES } from "./lib/episodes.mjs";
import { REPO } from "./lib/server.mjs";

const DIR = join(REPO, "engine3d/scripts/series/toybox");
const REG = join(DIR, "episodes.json");
const MD = join(DIR, "EPISODES.md");
const args = process.argv.slice(2);
const reg = JSON.parse(readFileSync(REG, "utf8"));
const skills = JSON.parse(readFileSync(join(REPO, "catalog/education/skills.json"), "utf8")).skills;
const save = () => writeFileSync(REG, `${JSON.stringify(reg, null, 1)}\n`);

if (args[0] === "--set") {
  const [, id, status, render] = args;
  if (!STATUSES.includes(status)) throw new Error(`status must be one of ${STATUSES.join(", ")}`);
  reg.episodes[id] = { ...(reg.episodes[id] ?? {}), status, ...(render ? { render } : {}) };
  save();
}
if (args[0] === "--scan") {
  const roots = Object.fromEntries(Object.entries(reg.roots).map(([k, v]) => [k, isAbsolute(v) ? v : join(REPO, v)]));
  const found = scanRenders(roots, Object.keys(reg.episodes));
  for (const [id, loc] of Object.entries(found)) {
    const e = reg.episodes[id];
    if (e.render !== loc) console.log(`${id}: ${e.render ?? "–"} -> ${loc}`);
    e.render = loc;
    if (e.status === "scripted" || e.status === "spec") e.status = "rendered";
  }
  save();
}

const scripts = readScripts(DIR);
const problems = checkRegistry(reg, scripts, skills);
const md = buildEpisodesMd({ reg, scripts, skills });
if (args[0] === "--check") {
  let old = "";
  try { old = readFileSync(MD, "utf8"); } catch { /* missing */ }
  if (old !== md) problems.push("EPISODES.md is stale: run node engine3d/tools/episodes.mjs");
  for (const p of problems) console.error(p);
  process.exit(problems.length ? 1 : 0);
}
for (const p of problems) console.error(`warning: ${p}`);
writeFileSync(MD, md);
console.log(`EPISODES.md: ${scripts.length} scripts, ${Object.keys(reg.episodes).length} registry entries`);
