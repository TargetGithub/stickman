// The catalog loader (docs/CATALOG_SPEC.md section 5). catalog/ is the only place catalog content is
// authored; this module turns its JSON files into the object passed to createEngine({ catalog }).
// The engine never imports this module (ADR-006). Description and tag fields pass through untouched.
//
//   loadCatalog(read)   read(relativePath) → parsed JSON (or a promise of it); no I/O of its own
//   loadCatalogSync()   Node: reads this folder with fs
//   catalog             the default catalog, loaded once (fs in Node, fetch in the browser)

/** Move files in catalog order (the order moves are listed and prepared in). */
export const MOVE_FILES = ["movement", "unarmed", "armed", "defensive", "reactions", "emotes", "utility", "life", "interactions", "defeat", "quadruped"];

/** Every authored file the engine catalog is assembled from. */
export const ENGINE_FILES = [
  "moves/poses.json",
  ...MOVE_FILES.map((f) => `moves/${f}.json`),
  "characters/bodies.json",
  "characters/appearance.json",
  "characters/faces.json",
  "characters/visemes.json",
  "characters/crowds.json",
  "effects/fx.json",
  "effects/sfx.json",
  "world/themes.json",
  "world/objects.json",
  "world/props.json",
  "world/lights.json",
  "world/camera_moves.json",
  "world/text_styles.json",
  "story/activities.json",
  "story/music_moods.json",
  "story/macro_lines.json",
  "story/blocklist.json",
  "story/templates.json",
];

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
    visemes: f["characters/visemes.json"], // talking mouth shapes (lip-sync, ADR-032)
    bodies,
    bodyNames: Object.keys(bodies),
    crowds: f["characters/crowds.json"], // crowd kinds for seeded extras (engine/story/crowd.js)
    crowdNames: Object.keys(f["characters/crowds.json"]),
    appearance,
    activities,
    activityNames: Object.keys(activities),
    macroLines: f["story/macro_lines.json"],
    musicMoods: music.moods, // read by tools/lib/music_gen.mjs (the engine only checks mood names)
    scales: music.scales,
    // Engine v3 data (ENGINE_V3_SPEC): light rigs (V3.3), camera moves (V3.4), text styles (V3.5), templates (V3.8).
    lights: f["world/lights.json"],
    lightNames: Object.keys(f["world/lights.json"].rigs),
    cameraMoves: f["world/camera_moves.json"],
    cameraMoveNames: Object.keys(f["world/camera_moves.json"]),
    textStyles: f["world/text_styles.json"],
    textStyleNames: Object.keys(f["world/text_styles.json"]),
    templates: f["story/templates.json"],
    templateNames: Object.keys(f["story/templates.json"]),
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

export const catalog = inNode
  ? loadCatalogSync()
  : await loadCatalog((p) => fetch(new URL(p, import.meta.url)).then((r) => r.json()));

/**
 * Character presets by id (CATALOG_SPEC 4.1), from the files the manifest lists. The engine catalog does not
 * carry them; workbooks draw them (WORKBOOK_SPEC 4.4).
 * @param {(path: string) => any} read  as loadCatalog's (sync or promises)
 */
export function loadPresets(read) {
  const fromManifest = (m) => {
    const files = m.authored.filter((p) => p.startsWith("characters/presets/"));
    const got = files.map((p) => read(p));
    const build = (vals) => Object.fromEntries(vals.map((p) => [p.id, p]));
    return got.some(isThenable) ? Promise.all(got).then(build) : build(got);
  };
  const m = read("manifest.json");
  return isThenable(m) ? m.then(fromManifest) : fromManifest(m);
}

/** Node: the workbook catalog (WORKBOOK_SPEC 3): a catalog (default the base one) plus `presets` from a folder. */
export function workbookCatalogSync(base = catalog, root) {
  return { ...base, presets: loadPresets(fileReader(root)) };
}
