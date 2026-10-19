// Reads the whole catalog/ folder (CATALOG_SPEC 4): the engine catalog plus everything the engine does
// not need (descriptions of engine vocabularies, presets, roles, voices, ambience, examples). Node only;
// the checks (catalog_check.mjs) and the build (catalog_build.mjs) work on the result.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog, ENGINE_FILES } from "../../catalog/index.js";

export const CATALOG_DIR = fileURLToPath(new URL("../../catalog/", import.meta.url));

/** Authored files outside the engine catalog, and the schema each one follows. */
export const EXTRA_FILES = {
  "characters/voices.json": "named_list",
  "characters/roles.json": "named_list",
  "world/ambience.json": "named_list",
  "docs/world_commands.json": "doc_entries",
  "docs/macros.json": "doc_entries",
  "docs/camera.json": "camera",
  "docs/transitions.json": "transitions",
  "docs/codes.json": "codes",
  "examples/index.json": "examples",
};

/** The schema (catalog/schemas/<name>.schema.json) for an authored file. */
export function schemaFor(rel) {
  if (EXTRA_FILES[rel]) return EXTRA_FILES[rel];
  if (rel === "moves/poses.json") return "poses";
  if (rel.startsWith("moves/")) return "moves";
  if (rel.startsWith("characters/presets/")) return "preset";
  const own = { "effects/sfx.json": "sfx", "characters/appearance.json": "appearance", "story/music_moods.json": "music_moods", "story/blocklist.json": "blocklist", "story/macro_lines.json": "macro_lines" };
  return own[rel] || "described";
}

const posix = (p) => p.split(sep).join("/");

/** Every file under dir (relative, sorted), skipping generated/. */
export function listFiles(root = CATALOG_DIR, dir = root) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const rel = posix(relative(root, full));
    if (rel === "generated") continue;
    if (statSync(full).isDirectory()) out.push(...listFiles(root, full));
    else out.push(rel);
  }
  return out;
}

/**
 * @returns {{ root, catalog, files: Record<string, any>, presets: object[], examples: Record<string, any>,
 *   schemas: Record<string, object>, formatMd: string, texts: Record<string, string>, authored: string[] }}
 */
export function readCatalogDir(root = CATALOG_DIR) {
  const json = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
  const all = listFiles(root);
  const files = {};
  for (const rel of [...ENGINE_FILES, ...Object.keys(EXTRA_FILES)]) files[rel] = json(rel);
  const presetFiles = all.filter((f) => f.startsWith("characters/presets/") && f.endsWith(".json"));
  for (const rel of presetFiles) files[rel] = json(rel);
  const examples = {};
  for (const rel of all.filter((f) => /^examples\/(clips|stories)\/[^/]+\.json$/.test(f))) examples[rel.slice("examples/".length)] = json(rel);
  const schemas = {};
  // Catalog file schemas only: schemas/bundle/ holds the bundle schemas (readBundleSchemas).
  for (const rel of all.filter((f) => /^schemas\/[^/]+\.schema\.json$/.test(f))) schemas[rel.slice(8).replace(".schema.json", "")] = json(rel);
  return {
    root,
    catalog: loadCatalog((p) => files[p]),
    files,
    presets: presetFiles.map((rel) => ({ file: rel, ...files[rel] })),
    examples,
    schemas,
    formatMd: readFileSync(join(root, "docs/format.md"), "utf8"),
    texts: Object.fromEntries(all.filter((f) => f.startsWith("docs/") && f.endsWith(".md")).map((f) => [f, readFileSync(join(root, f), "utf8")])),
    authored: all.filter((f) => !f.endsWith(".js") && f !== "manifest.json" && f !== "README.md"), // data only: index.js and merge.js are code
  };
}

/**
 * The catalog bundle schemas (CATALOG_BUNDLE_SPEC 4), keyed by file name ("common.schema.json"), which is
 * also each schema's $id and the document name its $refs use: pass the map as checkValue's opts.schemas.
 */
export function readBundleSchemas(root = CATALOG_DIR) {
  const dir = join(root, "schemas/bundle");
  return Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".schema.json")).sort().map((f) => [f, JSON.parse(readFileSync(join(dir, f), "utf8"))]));
}

/** Every validator code the engine can report (scanned from engine/, engine/validator/ and engine/story/). */
export function engineCodes() {
  const engine = fileURLToPath(new URL("../../engine/", import.meta.url));
  const text = ["", "validator", "story"].flatMap((d) => readdirSync(join(engine, d)).filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(engine, d, f), "utf8"))).join("\n");
  return new Set(text.match(/\b[EW]_[A-Z]+(?:_[A-Z]+)*\b/g));
}

let docsCache = null;
/** catalog/docs/*.json, read once: { world_commands, macros, camera, transitions, codes }. */
export function catalogDocs() {
  if (!docsCache) {
    const read = (f) => JSON.parse(readFileSync(join(CATALOG_DIR, "docs", `${f}.json`), "utf8"));
    docsCache = Object.fromEntries(["world_commands", "macros", "camera", "transitions", "codes"].map((f) => [f, read(f)]));
  }
  return docsCache;
}
