// Toybox 10K script pipeline: paths, building a lesson into a script, readiness of specs (assets present).
// CLI: tools/script10k.mjs. Format and workflow: tools/script10k/README.md.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_ROOT } from "../lib/spec10k/load.mjs";
import { bandOf } from "./bands.mjs";
import { expandLesson } from "./expand.mjs";
import { attachKeywords, keepCameraAlive } from "./polish.mjs";
import { qaScript } from "./qa.mjs";
import { loadProgramme } from "../lib/spec10k/load.mjs";
import { GROUPS, catalogSets } from "../lib/assets10k.mjs";

export const ROOT = DEFAULT_ROOT;
export const paths = (id, root = ROOT) => {
  const b = bandOf(id);
  return {
    spec: join(root, "specs", b, `${id}.json`),
    lesson: join(root, "lessons", b, `${id}.json`),
    script: join(root, "scripts", b, `${id}.json`),
    qaDir: join(root, "qa", b, id),
    qa: join(root, "qa", b, id, "qa.json"),
  };
};

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
export const loadSpec = (id, root) => readJson(paths(id, root).spec);
export const loadLesson = (id, root) => readJson(paths(id, root).lesson);

let SKILLS = null;
export function skillIds() {
  if (!SKILLS) SKILLS = readJson(new URL("../../../catalog/education/skills.json", import.meta.url)).skills;
  return SKILLS;
}

/**
 * Lesson + spec -> polished script and its QA report. Pure apart from reading the skills list.
 * @param {object} lesson
 * @param {object} spec
 * @param {object} catalog
 */
export function buildScript(lesson, spec, catalog) {
  const script = expandLesson(lesson, spec, { catalog, skills: skillIds() });
  const keywords = attachKeywords(script, spec, catalog);
  let orbits = 0;
  try { orbits = keepCameraAlive(script, catalog, { babies: spec.band === "bb" }); } catch { /* the validator reports what broke */ }
  const qa = qaScript(script, spec, lesson, catalog);
  qa.info.keywordsPlaced = keywords;
  qa.info.orbitsAdded = orbits;
  return { script, qa };
}

/** Build one id from disk and write its script and QA report. */
export function buildId(id, catalog, root = ROOT) {
  const p = paths(id, root);
  const { script, qa } = buildScript(loadLesson(id, root), loadSpec(id, root), catalog);
  mkdirSync(dirname(p.script), { recursive: true });
  mkdirSync(p.qaDir, { recursive: true });
  writeFileSync(p.script, `${JSON.stringify(script, null, 1)}\n`);
  writeFileSync(p.qa, `${JSON.stringify({ id, at: new Date().toISOString(), ...qa }, null, 1)}\n`);
  return { script, qa };
}

/** All spec ids on disk, band by band. */
export function specIds(root = ROOT, band = null) {
  const out = [];
  for (const b of band ? [band] : ["bb", "pk", "kg", "g1", "g2", "g3", "g4", "g5"]) {
    const d = join(root, "specs", b);
    if (!existsSync(d)) continue;
    out.push(...readdirSync(d).filter((f) => /^[a-z0-9]+\.json$/.test(f)).map((f) => f.slice(0, -5)).sort());
  }
  return out;
}

/** Catalog name sets and the asset map, as tools/assets10k.mjs reads them (one source of truth for readiness). */
let SETS = null;
export function assetContext(catalog, root = ROOT) {
  if (!SETS) {
    const p = loadProgramme(root);
    SETS = catalogSets(catalog, { ...p.series?.features, ...p.series?.featureAliases });
  }
  const composedFile = join(root, "script_composed.json");
  const composed = existsSync(composedFile) ? readJson(composedFile) : {};
  return { sets: SETS, map: readJson(new URL("../../catalog/asset_map.json", import.meta.url)), composed };
}

/**
 * A spec's `new:` needs that are neither built (now in the catalog) nor mapped (catalog/asset_map.json), and
 * the mapped ones with their `how` (what the script must do with the existing asset).
 * @returns {{ missing: string[], mapped: { name: string, group: string, use: unknown, how: string }[] }}
 */
export function needState(spec, ctx) {
  const missing = [], mapped = [];
  const seen = new Set();
  const visit = (g, raw) => {
    if (!String(raw).startsWith("new:") || seen.has(`${g}:${raw}`)) return;
    seen.add(`${g}:${raw}`);
    const n = raw.slice(4);
    if (ctx.sets[g].has(n)) return;
    const m = ctx.map[g]?.[n];
    const c = ctx.composed?.[g]?.[n];
    if (m) mapped.push({ name: n, group: g, use: m.use, how: m.how });
    else if (c) mapped.push({ name: n, group: g, use: "script", how: `composed in the script: ${c}` });
    else missing.push(n);
  };
  for (const g of GROUPS) for (const n of spec.needs?.[g] ?? []) visit(g, typeof n === "string" ? n : n.name);
  for (const c of spec.cast ?? []) visit("characters", c.who);
  return { missing, mapped };
}

export const missingNeeds = (spec, catalog, root = ROOT) => needState(spec, assetContext(catalog, root)).missing;
