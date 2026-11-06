// Measures every tuned (sung) line of a script with the real TTS clips and writes text -> seconds to
// scripts/series/toybox/rhymes/durs/<episode>.json, so a rhyme generator can fit each sung beat to its spoken line
// (rhymes/kit.mjs fitSung). Run after changing lyrics or voices: node tools/sung_durs.mjs <script.json>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadCatalog3d } from "../catalog/index.mjs";
import { compileScript } from "../runtime/compile.js";
import { speakPlan } from "./lib/audio3d.mjs";

const file = process.argv[2];
if (!file) throw new Error("usage: node tools/sung_durs.mjs <script.json>");
const script = JSON.parse(readFileSync(file, "utf8"));
const plan = compileScript(script, { catalog: loadCatalog3d() });
const speech = speakPlan({ ...plan, meta: script.meta });
const out = {};
for (const l of plan.lines.filter((x) => x.tune)) out[l.text] = Math.round(speech[l.id].dur * 1000) / 1000;
const dir = fileURLToPath(new URL("../scripts/series/toybox/rhymes/durs/", import.meta.url));
mkdirSync(dir, { recursive: true });
const dest = `${dir}${script.meta.episode}.json`;
writeFileSync(dest, `${JSON.stringify(out, null, 1)}\n`);
console.log(`${Object.keys(out).length} sung lines -> ${dest}`);
