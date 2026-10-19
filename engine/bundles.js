// Catalog bundles in the engine (ENGINE_V3_SPEC 4, CATALOG_BUNDLE_SPEC 5 and 7; ADR-022). Milestone: V3.1.
// The engine never reads a bundle folder: the host assembles each bundle into a partial catalog object
// (catalog/index.js assembleBundle) and mergeBundles() adds them to the base catalog, add-only and in
// ascending id order, so the same set of bundles always gives the same catalog. A script declares the
// bundles it uses (`bundles: [{ id, version, hash }]`); bundleIssues() compares that list with the loaded
// bundles (catalog.bundles) and with every namespaced name the script uses. Pure: no I/O, no hashing.

/** A bundle id: lowercase, 3-32 characters. `base` is the built-in catalog and is never declared. */
export const BUNDLE_ID = "^[a-z][a-z0-9_]{2,31}$";
/** A namespaced entry name: <bundleId>:<name>. Names without a colon mean the base catalog. */
export const NAMESPACED = /^([a-z][a-z0-9_]{2,31}):([a-z][a-z0-9_]{0,31})$/;
export const SEMVER = "^(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]{0,3})$";
export const SHA256 = "^sha256-[0-9a-f]{64}$";
/** Ids a bundle can never have (CATALOG_BUNDLE_SPEC 5.1). */
export const RESERVED_IDS = ["base", "core", "catalog", "stickman", "engine", "self", "user", "test", "draft", "local", "world"];
/** The id of the built-in catalog, always loaded, never declared. */
export const BASE_ID = "base";

/** Catalog keys a bundle may add to: keyed maps, the move list, and the name lists derived from the maps. */
export const BUNDLE_MAPS = ["poses", "themes", "fxPresets", "objects", "props", "faces", "bodies", "activities", "musicMoods", "scales"];
export const NAME_LISTS = { themes: "themeNames", fxPresets: "fxNames", faces: "faceNames", bodies: "bodyNames", activities: "activityNames" };

/** The bundle id a catalog name comes from, or "base" for a bare name. */
export function bundleOf(name) {
  const m = typeof name === "string" ? name.match(NAMESPACED) : null;
  return m ? m[1] : BASE_ID;
}

/**
 * The base catalog plus bundles, add-only (CATALOG_BUNDLE_SPEC 7.2). Bundles are added in ascending id
 * order whatever order they are given in; two copies of one id must have the same hash. A key that already
 * exists, or a key outside the bundle's namespace, is an error here (the bundle checker reports it first).
 * @param {object} base  the engine catalog (catalog.bundles holds the base pin)
 * @param {Array<{ id, version, hash, audience?, license?, dependencies?, catalog: object }>} bundles
 * @returns {object}  a new catalog object; base is not modified
 */
export function mergeBundles(base, bundles) {
  const sorted = [...bundles].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out = { ...base, moves: [...base.moves] };
  for (const key of BUNDLE_MAPS) out[key] = { ...(base[key] || {}) };
  for (const list of Object.values(NAME_LISTS)) out[list] = [...(base[list] || [])];
  const pins = [...(base.bundles || [{ id: BASE_ID }])];
  for (const b of sorted) {
    if (!new RegExp(BUNDLE_ID).test(b.id) || RESERVED_IDS.includes(b.id)) throw new Error(`bundle id '${b.id}' is not allowed`);
    const dup = pins.find((p) => p.id === b.id);
    if (dup) {
      if (dup.hash === b.hash) continue; // the same bundle twice (a shared dependency)
      throw new Error(`bundle '${b.id}' is loaded twice with different hashes (${dup.hash} and ${b.hash})`);
    }
    const own = (name) => bundleOf(name) === b.id;
    for (const key of BUNDLE_MAPS) {
      for (const [name, entry] of Object.entries(b.catalog[key] || {})) {
        if (!own(name)) throw new Error(`bundle '${b.id}': ${key} entry '${name}' is outside its namespace`);
        if (name in out[key]) throw new Error(`bundle '${b.id}': ${key} entry '${name}' already exists`);
        out[key][name] = entry;
        const list = NAME_LISTS[key];
        if (list && !(key === "fxPresets" && entry.internal)) out[list].push(name);
      }
    }
    const moveNames = new Set(out.moves.map((m) => m.name));
    for (const m of b.catalog.moves || []) {
      if (!own(m.name)) throw new Error(`bundle '${b.id}': move '${m.name}' is outside its namespace`);
      if (moveNames.has(m.name)) throw new Error(`bundle '${b.id}': move '${m.name}' already exists`);
      moveNames.add(m.name);
      out.moves.push(m);
    }
    pins.push({ id: b.id, version: b.version, hash: b.hash, audience: b.audience || ["kids", "general"], license: b.license, dependencies: (b.dependencies || []).map((d) => ({ id: d.id, version: d.version, hash: d.hash })) });
  }
  out.bundles = pins;
  return out;
}

// Fields whose strings are prose, never catalog names.
const TEXT_FIELDS = new Set(["say", "text", "title", "subtitle", "name", "description", "line", "lines", "caption", "premise", "notes", "credit"]);

/**
 * Every namespaced catalog name a script uses, with the path of its first use.
 * @returns {Map<string, string>}  name → path
 */
export function scriptNames(script) {
  const found = new Map();
  const walk = (v, path) => {
    if (typeof v === "string") {
      if (NAMESPACED.test(v) && !found.has(v)) found.set(v, path);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (k === "bundles" && !path) continue;
        if (!TEXT_FIELDS.has(k)) walk(x, path ? `${path}.${k}` : k);
      }
    }
  };
  walk(script, "");
  return found;
}

const issue = (code, path, message, fix) => ({ code, path, message, fix });

/**
 * The script's `bundles` against the loaded bundles and the names it uses (CATALOG_BUNDLE_SPEC 7.4).
 * Errors: E_BUNDLE_RESERVED (base or a reserved id declared), E_BUNDLE_MISSING (not loaded, or another
 * version), E_BUNDLE_HASH (loaded with another hash), E_BUNDLE_DEPENDENCY (a declared bundle's dependency
 * is not declared), E_BUNDLE_AUDIENCE (a kids script with a bundle not made for kids), E_BUNDLE_UNDECLARED
 * (a namespaced name whose bundle is not declared). Warnings: W_BUNDLE_UNPINNED (no hash), W_BUNDLE_UNUSED.
 * @param {object} script  a script that passed the schema check
 * @param {object} catalog  the merged catalog (catalog.bundles lists what is loaded)
 */
export function bundleIssues(script, catalog) {
  const out = [];
  const loaded = new Map((catalog.bundles || []).map((b) => [b.id, b]));
  const declared = Array.isArray(script.bundles) ? script.bundles : [];
  const declaredIds = new Set(declared.map((d) => d.id));
  declared.forEach((d, i) => {
    const path = `bundles[${i}]`;
    if (d.id === BASE_ID || RESERVED_IDS.includes(d.id)) {
      out.push(issue("E_BUNDLE_RESERVED", path, d.id === BASE_ID ? "The base catalog is always loaded and is never declared." : `'${d.id}' is a reserved bundle id.`, d.id === BASE_ID ? "Remove it from bundles; bare names always mean the base catalog." : "Declare the bundle under its real id."));
      return;
    }
    const b = loaded.get(d.id);
    if (!b) {
      out.push(issue("E_BUNDLE_MISSING", path, `Bundle '${d.id}' ${d.version} is not loaded.`, `Register it in catalog/bundles.json (or import it into the bundle store) and load it with the script; loaded: ${[...loaded.keys()].filter((k) => k !== BASE_ID).join(", ") || "none"}.`));
      return;
    }
    if (d.version !== b.version) {
      out.push(issue("E_BUNDLE_MISSING", `${path}.version`, `Bundle '${d.id}' is declared at ${d.version} but ${b.version} is loaded.`, `Declare "version": "${b.version}" or load ${d.version}.`));
      return;
    }
    if (d.hash && b.hash && d.hash !== b.hash) {
      out.push(issue("E_BUNDLE_HASH", `${path}.hash`, `Bundle '${d.id}' ${d.version} is loaded with hash ${b.hash}, not ${d.hash}.`, `Use the loaded bundle's hash, or load the bundle this script was written for; a different hash is different content.`));
      return;
    }
    if (!d.hash) out.push(issue("W_BUNDLE_UNPINNED", path, `Bundle '${d.id}' is declared without a hash.`, `Add "hash": "${b.hash || "sha256-..."}" so the video is pinned to this content.`));
    for (const dep of b.dependencies || []) {
      if (!declaredIds.has(dep.id)) out.push(issue("E_BUNDLE_DEPENDENCY", path, `Bundle '${d.id}' depends on '${dep.id}' ${dep.version}, which the script does not declare.`, `Add { "id": "${dep.id}", "version": "${dep.version}", "hash": "${dep.hash}" } to bundles.`));
    }
    const audience = script.meta?.audience ?? (script.version === 1 ? "general" : "kids");
    if (audience === "kids" && b.audience && !b.audience.includes("kids")) {
      out.push(issue("E_BUNDLE_AUDIENCE", path, `Bundle '${d.id}' is not made for a kids audience (${b.audience.join(", ")}).`, 'Use a bundle that lists "kids", or set meta.audience to "general".'));
    }
  });
  const used = new Set();
  for (const [name, path] of scriptNames(script)) {
    const id = bundleOf(name);
    used.add(id);
    if (!declaredIds.has(id) && !out.some((i) => i.code === "E_BUNDLE_UNDECLARED" && i.message.includes(`'${id}'`))) {
      const b = loaded.get(id);
      out.push(issue("E_BUNDLE_UNDECLARED", path, `'${name}' comes from bundle '${id}', which the script does not declare.`, b ? `Add { "id": "${id}", "version": "${b.version}", "hash": "${b.hash}" } to bundles.` : `Add bundle '${id}' to bundles and load it (names with a colon come from bundles).`));
    }
  }
  declared.forEach((d, i) => {
    if (loaded.has(d.id) && d.id !== BASE_ID && !used.has(d.id)) out.push(issue("W_BUNDLE_UNUSED", `bundles[${i}]`, `Bundle '${d.id}' is declared but nothing in the script uses it.`, "Remove it from bundles, or use one of its entries."));
  });
  return out;
}
