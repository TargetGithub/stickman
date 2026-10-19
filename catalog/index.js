// The catalog loader (docs/CATALOG_SPEC.md section 5). catalog/ is the only place catalog content is
// authored; this module turns its JSON files into the object passed to createEngine({ catalog }).
// The engine never imports this module (ADR-006). Description and tag fields pass through untouched.
//
//   loadCatalog(read)   read(relativePath) → parsed JSON (or a promise of it); no I/O of its own
//   loadCatalogSync()   Node: reads this folder with fs
//   catalog             the default catalog, loaded once (fs in Node, fetch in the browser)
//
// Catalog bundles (ENGINE_V3_SPEC 4, CATALOG_BUNDLE_SPEC 7, V3.1): the base catalog is the bundle `base`;
// bundles.json registers the others. assembleBundle(manifest, files) turns a bundle's files into the partial
// catalog that engine/bundles.js mergeBundles() adds; catalogForScript(script) (Node) loads what a script declares.

import { mergeBundles, BASE_ID } from "../engine/bundles.js";

/** Move files in catalog order (the order moves are listed and prepared in). */
export const MOVE_FILES = ["movement", "unarmed", "armed", "defensive", "reactions", "emotes", "utility", "life", "interactions", "defeat", "quadruped"];

/** Every authored file the engine catalog is assembled from. */
export const ENGINE_FILES = [
  "moves/poses.json",
  ...MOVE_FILES.map((f) => `moves/${f}.json`),
  "characters/bodies.json",
  "characters/appearance.json",
  "characters/faces.json",
  "effects/fx.json",
  "effects/sfx.json",
  "world/themes.json",
  "world/objects.json",
  "world/props.json",
  "story/activities.json",
  "story/music_moods.json",
  "story/macro_lines.json",
  "story/blocklist.json",
  "bundles.json",
];

/** The catalog files a bundle may carry (CATALOG_BUNDLE_SPEC 3): the engine files minus the engine-owned ones. */
export const BUNDLE_FILES = ENGINE_FILES.filter((p) => !["moves/defeat.json", "characters/appearance.json", "effects/sfx.json", "story/macro_lines.json", "story/blocklist.json", "bundles.json"].includes(p));

/** Appearance lists of {name, description} entries; the engine sees the names. */
export const APPEARANCE_LISTS = ["eyes", "brows", "mouthStyle", "hair", "outfit", "accessories"];

const names = (list) => list.map((e) => (typeof e === "string" ? e : e.name));
const isThenable = (v) => v !== null && typeof v === "object" && typeof v.then === "function";

/**
 * Assemble the engine catalog from parsed files.
 * @param {Record<string, any>} f  ENGINE_FILES path → parsed JSON
 */
export function assembleCatalog(f) {
  const fxPresets = f["effects/fx.json"];
  const themes = f["world/themes.json"];
  const faces = f["characters/faces.json"];
  const bodies = f["characters/bodies.json"];
  const activities = f["story/activities.json"];
  const words = f["story/blocklist.json"];
  const music = f["story/music_moods.json"];
  const look = f["characters/appearance.json"];
  const appearance = {};
  for (const [k, v] of Object.entries(look)) appearance[k] = APPEARANCE_LISTS.includes(k) ? names(v) : v;
  const base = f["bundles.json"].bundles.find((b) => b.id === BASE_ID);
  return {
    poses: f["moves/poses.json"],
    moves: MOVE_FILES.flatMap((m) => f[`moves/${m}.json`]),
    props: f["world/props.json"],
    fxPresets,
    fxNames: Object.keys(fxPresets).filter((n) => !fxPresets[n].internal),
    themes,
    themeNames: Object.keys(themes),
    sfxKeys: names(f["effects/sfx.json"]),
    blocklist: words.blocklist,
    softWords: words.softWords,
    objects: f["world/objects.json"],
    faces,
    faceNames: Object.keys(faces),
    bodies,
    bodyNames: Object.keys(bodies),
    appearance,
    activities,
    activityNames: Object.keys(activities),
    macroLines: f["story/macro_lines.json"],
    musicMoods: music.moods, // read by tools/lib/music_gen.mjs (the engine only checks mood names)
    scales: music.scales,
    bundles: [{ id: BASE_ID, version: base.version, audience: ["kids", "general"] }], // the loaded bundles (mergeBundles appends)
  };
}

/**
 * A bundle's files as the partial catalog mergeBundles() takes (CATALOG_BUNDLE_SPEC 7.2). Missing files
 * count as empty; description and tag fields pass through as in the base catalog.
 * @param {object} manifest  the parsed bundle.json
 * @param {Record<string, any>} files  bundle path → parsed JSON (BUNDLE_FILES paths; others are ignored)
 */
export function assembleBundle(manifest, files) {
  const map = (p) => files[p] || {};
  const music = files["story/music_moods.json"] || {};
  return {
    id: manifest.id,
    version: manifest.version,
    hash: manifest.contentHash,
    name: manifest.name,
    license: manifest.license,
    audience: manifest.audience,
    dependencies: manifest.dependencies || [],
    catalog: {
      poses: map("moves/poses.json"),
      moves: MOVE_FILES.flatMap((m) => files[`moves/${m}.json`] || []),
      bodies: map("characters/bodies.json"),
      faces: map("characters/faces.json"),
      fxPresets: map("effects/fx.json"),
      themes: map("world/themes.json"),
      objects: map("world/objects.json"),
      props: map("world/props.json"),
      activities: map("story/activities.json"),
      musicMoods: music.moods || {},
      scales: music.scales || {},
    },
  };
}

/**
 * @param {(path: string) => any} read  relative path → parsed JSON, or a promise of it
 * @returns {object | Promise<object>}  a promise only when read returns promises
 */
export function loadCatalog(read) {
  const got = ENGINE_FILES.map((p) => read(p));
  const build = (vals) => assembleCatalog(Object.fromEntries(ENGINE_FILES.map((p, i) => [p, vals[i]])));
  return got.some(isThenable) ? Promise.all(got).then(build) : build(got);
}

const inNode = typeof process !== "undefined" && !!process.versions?.node;
const fs = inNode ? await import("node:fs") : null;
const nodeUrl = inNode ? await import("node:url") : null;

/** Node: a reader for a catalog folder (default: this one). */
export function fileReader(root = new URL("./", import.meta.url)) {
  if (!fs) throw new Error("fileReader needs Node");
  const base = root instanceof URL ? root : nodeUrl.pathToFileURL(root.endsWith("/") ? root : `${root}/`);
  return (p) => JSON.parse(fs.readFileSync(new URL(p, base), "utf8"));
}

/** Node: load a catalog folder synchronously (default: this one). */
export function loadCatalogSync(root) {
  return loadCatalog(fileReader(root));
}

/** The project root (the folder above catalog/), for bundle paths in bundles.json. */
export const PROJECT_ROOT = new URL("../", import.meta.url);

/**
 * Node: read a bundle folder: the manifest, every file it lists (JSON parsed; README and LICENSE as text)
 * and the raw text of each, for the checker's hashes.
 * @returns {{ manifest: object, files: Record<string, any>, raw: Record<string, string>, dir: string }}
 */
export function readBundleDir(dir) {
  if (!fs) throw new Error("readBundleDir needs Node");
  const path = nodeUrl.pathToFileURL(dir.endsWith("/") ? dir : `${dir}/`);
  const text = (p) => fs.readFileSync(new URL(p, path), "utf8");
  const raw = { "bundle.json": text("bundle.json") };
  const manifest = JSON.parse(raw["bundle.json"]);
  const files = {};
  for (const f of manifest.files || []) {
    try {
      raw[f.path] = text(f.path);
      files[f.path] = f.path.endsWith(".json") ? JSON.parse(raw[f.path]) : raw[f.path];
    } catch (err) {
      files[f.path] = { error: err.message };
    }
  }
  return { manifest, files, raw, dir };
}

/** Node: a bundle folder as the object mergeBundles() takes. */
export function loadBundleSync(dir) {
  const { manifest, files } = readBundleDir(dir);
  return assembleBundle(manifest, files);
}

/**
 * Node: the base catalog plus the bundles a script declares, found through bundles.json (an entry's `path`,
 * else the store <store>/<id>/<hash>/). A bundle that cannot be found is left out, so the validator reports
 * E_BUNDLE_MISSING; a registered hash that differs from the folder's manifest is a load error.
 * @param {object} script
 * @param {{ base?: object, root?: URL|string, registry?: object }} opts
 */
export function catalogForScript(script, opts = {}) {
  const base = opts.base || catalog;
  const declared = Array.isArray(script?.bundles) ? script.bundles : [];
  if (!declared.length) return base;
  if (!fs) throw new Error("catalogForScript needs Node (pass a merged catalog in the browser)");
  const root = opts.root instanceof URL ? opts.root : opts.root ? nodeUrl.pathToFileURL(`${opts.root}/`) : PROJECT_ROOT;
  const registry = opts.registry || fileReader()("bundles.json");
  const loaded = [];
  for (const pin of declared) {
    const entry = registry.bundles.find((b) => b.id === pin.id && b.id !== BASE_ID);
    const dirs = [];
    if (entry?.path) dirs.push(new URL(`${entry.path}/`, root));
    if (pin.hash) dirs.push(new URL(`${registry.store}/${pin.id}/${pin.hash}/`, root));
    const dir = dirs.find((d) => fs.existsSync(new URL("bundle.json", d)));
    if (!dir) continue;
    const bundle = loadBundleSync(nodeUrl.fileURLToPath(dir));
    if (entry?.hash && bundle.hash !== entry.hash) throw new Error(`bundle '${pin.id}' at ${entry.path} has hash ${bundle.hash}, but bundles.json registers ${entry.hash}`);
    loaded.push(bundle);
  }
  return mergeBundles(base, loaded);
}

export const catalog = inNode
  ? loadCatalogSync()
  : await loadCatalog((p) => fetch(new URL(p, import.meta.url)).then((r) => r.json()));
