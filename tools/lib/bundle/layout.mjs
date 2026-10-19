// The bundle layout (CATALOG_BUNDLE_SPEC 3): which schema each file follows, the reserved ids, namespaced
// names, and the catalog fragment a bundle adds (its entries in the order of section 3). Pure.

/** Move files in catalog order (catalog/index.js MOVE_FILES without defeat; a test keeps them equal). */
export const MOVE_GROUPS = ["movement", "unarmed", "armed", "defensive", "reactions", "emotes", "utility", "life", "interactions", "quadruped"];

/** Bundle ids nobody may use (5.1); the bundle blocklist adds more. */
export const RESERVED_IDS = ["base", "core", "catalog", "stickman", "engine", "self", "user", "test", "draft", "local", "world"];

/** The value examples write for their own bundle's hash (4.15, 7.1). */
export const SELF_HASH = "self";

/** The file name of the bundle schema for a bundle file, or null (example scripts, README, LICENSE). */
export function schemaOf(rel) {
  if (rel === "bundle.json") return "bundle.schema.json";
  if (rel === "moves/poses.json") return "poses.schema.json";
  if (rel.startsWith("moves/")) return "moves.schema.json";
  if (rel.startsWith("characters/presets/")) return "preset.schema.json";
  const own = {
    "characters/bodies.json": "bodies", "characters/faces.json": "faces", "effects/fx.json": "fx", "world/themes.json": "themes", "world/objects.json": "objects",
    "world/props.json": "props", "story/activities.json": "activities", "story/music_moods.json": "music_moods", "examples/index.json": "examples",
  }[rel];
  return own ? `${own}.schema.json` : null;
}

export const isText = (rel) => rel === "README.md" || rel === "LICENSE.txt";
export const isExample = (rel) => /^examples\/(clips|stories)\/[^/]+\.json$/.test(rel);

/** "robo_pals:boxbot" → "robo_pals"; a base name → null. */
export const bundleOf = (name) => (typeof name === "string" && name.includes(":") ? name.slice(0, name.indexOf(":")) : null);
export const localPart = (name) => name.slice(name.indexOf(":") + 1);

/**
 * The catalog fragment a bundle adds, shaped like the engine catalog's own keys, in section 3 order.
 * @param {Record<string, any>} files  bundle path → parsed JSON
 */
export function catalogFragment(files) {
  const music = files["story/music_moods.json"] || {};
  return {
    poses: files["moves/poses.json"] || {},
    moves: MOVE_GROUPS.flatMap((g) => files[`moves/${g}.json`] || []),
    bodies: files["characters/bodies.json"] || {},
    faces: files["characters/faces.json"] || {},
    fxPresets: files["effects/fx.json"] || {},
    themes: files["world/themes.json"] || {},
    objects: files["world/objects.json"] || {},
    props: files["world/props.json"] || {},
    activities: files["story/activities.json"] || {},
    musicMoods: music.moods || {},
    scales: music.scales || {},
  };
}

/** Presets of a bundle: [{ file, ...preset }] in path order. */
export const presetsOf = (files) => Object.keys(files).filter((f) => f.startsWith("characters/presets/")).sort().map((file) => ({ file, ...files[file] }));

/** Every entry a bundle adds: [{ kind, name, file, path }] (kinds as in the 9 caps table). */
export function entryList(files) {
  const out = [];
  const keyed = (kind, file, obj, pre = "") => Object.keys(obj || {}).forEach((name) => out.push({ kind, name, file, path: pre + name }));
  keyed("pose", "moves/poses.json", files["moves/poses.json"]);
  for (const g of MOVE_GROUPS) (files[`moves/${g}.json`] || []).forEach((m, i) => out.push({ kind: "move", name: m.name, file: `moves/${g}.json`, path: `[${i}].name` }));
  keyed("body", "characters/bodies.json", files["characters/bodies.json"]);
  keyed("face", "characters/faces.json", files["characters/faces.json"]);
  for (const p of presetsOf(files)) out.push({ kind: "preset", name: p.id, file: p.file, path: "id" });
  keyed("fx", "effects/fx.json", files["effects/fx.json"]);
  keyed("theme", "world/themes.json", files["world/themes.json"]);
  keyed("object", "world/objects.json", files["world/objects.json"]);
  keyed("prop", "world/props.json", files["world/props.json"]);
  keyed("activity", "story/activities.json", files["story/activities.json"]);
  keyed("scale", "story/music_moods.json", files["story/music_moods.json"]?.scales, "scales.");
  keyed("mood", "story/music_moods.json", files["story/music_moods.json"]?.moods, "moods.");
  return out;
}
