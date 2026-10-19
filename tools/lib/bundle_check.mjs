// The bundle check pipeline (CATALOG_BUNDLE_SPEC 6; V3.1 builds steps 1-11 of B2 for folders). Pure over
// the raw file texts, the base catalog, the bundle schemas and a sha256 function: no I/O (bundle_files.mjs
// reads folders). Each issue is { code, file, path, message, fix }, the validator's shape plus the file.
// Steps 1-7 stop the pipeline when they fail; steps 8-11 each report everything they find.

import { checkValue } from "../../engine/validator/schema.js";
import { validate, ENGINE_VERSION } from "../../engine/index.js";
import { closestMatch } from "../../engine/validator/report.js";
import { checkText } from "../../engine/validator/semantic.js";
import { mergeBundles, bundleOf, RESERVED_IDS, BASE_ID, BUNDLE_MAPS } from "../../engine/bundles.js";
import { assembleBundle, BUNDLE_FILES, MOVE_FILES } from "../../catalog/index.js";
import { SCHEMA_VERSION } from "./catalog_build.mjs";
import { presetStory } from "./catalog_harness.mjs";
import { checkMove } from "./draft.mjs";
import { strictParse } from "./strict_json.mjs";

/** Generic move names a quadruped plan must map (ADR-020: story modules start these by name). */
export const REQUIRED_GENERICS = ["idle", "walk", "run", "get_up"];
export const LIMITS = { fileBytes: 256 * 1024, totalBytes: 2 * 1024 * 1024, entries: 65, textBytes: 64 * 1024 };
/** Resource caps of step 9. */
export const CAPS = {
  entries: 256, moves: 64, poses: 128, bodies: 4, faces: 16, presets: 24, fxPresets: 24, themes: 8, objects: 32, props: 8, activities: 8, musicMoods: 8,
  keys: 24, root: 12, hits: 6, events: 12, particles: 120, sustain: 60, pathCommands: 1600, pathCommandsTotal: 4000, layers: 12,
};

/** The schema file for a bundle path (section 3), or null for example scripts. */
export function schemaOf(rel) {
  if (rel === "bundle.json") return "bundle";
  if (rel === "moves/poses.json") return "poses";
  if (rel.startsWith("moves/")) return "moves";
  if (rel.startsWith("characters/presets/")) return "preset";
  if (/^examples\/(clips|stories)\//.test(rel)) return null;
  return { "characters/bodies.json": "bodies", "characters/faces.json": "faces", "effects/fx.json": "fx", "world/themes.json": "themes", "world/objects.json": "objects",
    "world/props.json": "props", "story/activities.json": "activities", "story/music_moods.json": "music_moods", "examples/index.json": "examples" }[rel] || null;
}

const parseVer = (v) => v.split(".").map(Number);
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Does a semver range (^, ~, >=, >= <, exact) contain a version? */
export function rangeHas(range, version) {
  const v = parseVer(version);
  const m = range.match(/^(\^|~|>=)?(\d+\.\d+\.\d+)(?: <(\d+\.\d+\.\d+))?$/);
  if (!m) return false;
  const lo = parseVer(m[2]);
  if (!m[1]) return cmp(v, lo) === 0;
  if (cmp(v, lo) < 0) return false;
  let hi = m[3] ? parseVer(m[3]) : null;
  if (m[1] === "^") hi = lo[0] > 0 ? [lo[0] + 1, 0, 0] : [0, lo[1] + 1, 0];
  if (m[1] === "~") hi = [lo[0], lo[1] + 1, 0];
  return !hi || cmp(v, hi) < 0;
}

/** Does a catalog format range ("1", ">=1", ">=1 <3") contain a format version? */
export function catalogRangeHas(range, n) {
  const m = range.match(/^(>=)?(\d+)(?: <(\d+))?$/);
  if (!m) return false;
  if (!m[1]) return Number(m[2]) === n;
  return n >= Number(m[2]) && (!m[3] || n < Number(m[3]));
}

/**
 * @param {{ raw: Record<string, string>, listing?: Array<{ path, size, symlink }> }} input  file texts (bundle.json included)
 * @param {{ base: object, schemas: Record<string, object>, sha256: (text: string) => string, canonical: (v) => string,
 *           loaded?: object[], moveChecks?: boolean, examples?: boolean }} opts
 *   loaded: bundles already loaded (mergeBundles input shape), for collisions and dependencies
 * @returns {{ ok: boolean, issues: object[], bundle: object|null, manifest: object|null, files: Record<string, any>, counts: object }}
 */
export function checkBundle(input, opts) {
  const { base, schemas, sha256, canonical, loaded = [], moveChecks = true, examples = true } = opts;
  const issues = [];
  const bad = (code, file, path, message, fix = "") => issues.push({ code, file, path, message, fix });
  const result = (bundle = null, manifest = null, files = {}) => ({ ok: !issues.some((i) => i.code.startsWith("E_")), issues, bundle, manifest, files, counts: countsOf(files) });
  const raw = input.raw;
  const listing = input.listing || Object.keys(raw).filter((p) => p !== "bundle.json").map((path) => ({ path, size: Buffer.byteLength(raw[path]), symlink: false }));
  const pathPattern = new RegExp(schemas["bundle.schema.json"].properties.files.items.properties.path.pattern);

  // 1. Paths and sizes.
  let total = Buffer.byteLength(raw["bundle.json"] || "");
  if (listing.length + 1 > LIMITS.entries) bad("E_BUNDLE_SIZE", "", "", `The bundle has ${listing.length + 1} entries.`, `Keep it to ${LIMITS.entries} files including bundle.json.`);
  const seenPaths = new Set();
  for (const f of listing) {
    if (f.symlink) bad("E_BUNDLE_PATH", f.path, "", "Symbolic links are not allowed in a bundle.", "Copy the file in.");
    else if (!pathPattern.test(f.path)) bad("E_BUNDLE_PATH", f.path, "", "This path is not one a bundle may contain.", "Allowed: README.md, LICENSE.txt, characters/, moves/, effects/fx.json, world/, story/, examples/ (CATALOG_BUNDLE_SPEC 3).");
    const key = f.path.normalize("NFC").toLowerCase();
    if (seenPaths.has(key)) bad("E_BUNDLE_PATH", f.path, "", "Two paths differ only in case or Unicode form.", "Rename one.");
    seenPaths.add(key);
    if (f.size > LIMITS.fileBytes) bad("E_BUNDLE_SIZE", f.path, "", `The file is ${f.size} bytes.`, `Keep each file under ${LIMITS.fileBytes} bytes.`);
    total += f.size;
  }
  if (total > LIMITS.totalBytes) bad("E_BUNDLE_SIZE", "", "", `The bundle is ${total} bytes in all.`, `Keep it under ${LIMITS.totalBytes} bytes.`);
  if (!raw["bundle.json"]) bad("E_BUNDLE_ARCHIVE", "bundle.json", "", "The bundle has no bundle.json.", "Add the manifest (CATALOG_BUNDLE_SPEC 4.3).");
  if (issues.length) return result();

  // 2. Strict JSON.
  const files = {};
  for (const [path, text] of Object.entries(raw)) {
    if (!path.endsWith(".json")) {
      if (Buffer.byteLength(text) > LIMITS.textBytes) bad("E_BUNDLE_JSON", path, "", "The text file is over 64 KB.", "Shorten it.");
      else if (/[^\n\t\x20-￿]/.test(text)) bad("E_BUNDLE_JSON", path, "", "The text file has control characters.", "Keep plain text with newlines and tabs only.");
      files[path] = text;
      continue;
    }
    try {
      files[path] = strictParse(text);
    } catch (err) {
      bad("E_BUNDLE_JSON", path, err.path || "", err.message, "Write strict JSON: no comments, trailing commas or duplicate keys.");
    }
  }
  if (issues.length) return result();

  // 3. Manifest.
  const manifest = files["bundle.json"];
  for (const i of checkValue(manifest, schemas["bundle.schema.json"], "", { schemas })) bad("E_BUNDLE_MANIFEST", "bundle.json", i.path, `${i.code}: ${i.message}`, i.fix || "");
  if (manifest && RESERVED_IDS.includes(manifest.id)) bad("E_BUNDLE_RESERVED", "bundle.json", "id", `'${manifest.id}' is a reserved bundle id.`, `Reserved: ${RESERVED_IDS.join(", ")}.`);
  if (issues.length) return result(null, manifest);
  const id = manifest.id;

  // 4. Compatibility.
  if (manifest.schemaVersion !== 1) bad("E_BUNDLE_COMPAT", "bundle.json", "schemaVersion", `Bundle format ${manifest.schemaVersion} is not supported.`, "This engine reads bundle format 1.");
  if (!rangeHas(manifest.engineVersion, ENGINE_VERSION)) bad("E_BUNDLE_COMPAT", "bundle.json", "engineVersion", `The bundle needs engine ${manifest.engineVersion}; this is ${ENGINE_VERSION}.`, `Widen engineVersion (for example "^${ENGINE_VERSION}") after testing with this engine.`);
  if (!catalogRangeHas(manifest.catalogVersion, SCHEMA_VERSION)) bad("E_BUNDLE_COMPAT", "bundle.json", "catalogVersion", `The bundle needs catalog format ${manifest.catalogVersion}; this is ${SCHEMA_VERSION}.`, `Set catalogVersion to "${SCHEMA_VERSION}" or a range containing it.`);
  if (issues.length) return result(null, manifest);

  // 5. File list and hashes.
  const listed = manifest.files.map((f) => f.path);
  const actual = listing.map((f) => f.path).sort();
  if (JSON.stringify([...listed].sort()) !== JSON.stringify(actual)) {
    const missing = listed.filter((p) => !actual.includes(p));
    const extra = actual.filter((p) => !listed.includes(p));
    bad("E_BUNDLE_FILES", "bundle.json", "files", `The manifest and the folder differ${missing.length ? `: missing ${missing.join(", ")}` : ""}${extra.length ? `; not listed: ${extra.join(", ")}` : ""}.`, "Run `node tools/bundle.mjs pack <folder>` to rewrite files and contentHash.");
  } else if (JSON.stringify(listed) !== JSON.stringify(actual)) bad("E_BUNDLE_FILES", "bundle.json", "files", "files is not sorted by path.", "Run `node tools/bundle.mjs pack <folder>`.");
  else {
    manifest.files.forEach((f, i) => {
      const text = raw[f.path];
      const h = sha256(f.path.endsWith(".json") ? canonical(files[f.path]) : text.replace(/\r\n?/g, "\n"));
      if (h !== f.sha256) bad("E_BUNDLE_HASH", "bundle.json", `files[${i}].sha256`, `${f.path} hashes to ${h}, not ${f.sha256}.`, "Run `node tools/bundle.mjs pack <folder>` after editing a file.");
    });
    const { contentHash: _c, ...rest } = manifest;
    const h = sha256(canonical(rest));
    if (h !== manifest.contentHash) bad("E_BUNDLE_HASH", "bundle.json", "contentHash", `The manifest hashes to ${h}, not ${manifest.contentHash}.`, "Run `node tools/bundle.mjs pack <folder>`.");
  }
  if (issues.length) return result(null, manifest, files);

  // 6. Per-file schemas.
  for (const [path, value] of Object.entries(files)) {
    const name = schemaOf(path);
    if (!name || path === "bundle.json") continue;
    for (const i of checkValue(value, schemas[`${name}.schema.json`], "", { schemas })) bad("E_BUNDLE_SCHEMA", path, i.path, `${i.code}: ${i.message}`, i.fix || "");
  }
  if (!manifest.files.some((f) => f.path === "examples/index.json")) bad("E_BUNDLE_FILES", "examples/index.json", "", "Every bundle needs examples/index.json with at least one example.", "Add an example story or clip that uses the bundle's entries.");
  if (issues.length) return result(null, manifest, files);

  // 7. Namespacing and collisions.
  const own = (name) => bundleOf(name) === id;
  const names = { moves: new Map() };
  for (const key of BUNDLE_MAPS) names[key] = new Map();
  const bundle = assembleBundle(manifest, files);
  for (const key of BUNDLE_MAPS) {
    const file = BUNDLE_FILES.find((p) => fileKey(p) === key) || key;
    for (const name of Object.keys(bundle.catalog[key])) {
      if (!own(name)) bad("E_BUNDLE_NAMESPACE", file, name, `'${name}' does not start with '${id}:'.`, `Name it '${id}:${name.split(":").pop()}'.`);
      else if (base[key]?.[name]) bad("E_BUNDLE_COLLISION", file, name, `'${name}' already exists in the base catalog.`, "Pick another name.");
      names[key].set(name, file);
    }
  }
  for (const m of MOVE_FILES) {
    for (const [i, mv] of (files[`moves/${m}.json`] || []).entries()) {
      const file = `moves/${m}.json`;
      if (!own(mv.name)) bad("E_BUNDLE_NAMESPACE", file, `[${i}].name`, `'${mv.name}' does not start with '${id}:'.`, `Name it '${id}:${mv.name.split(":").pop()}'.`);
      else if (names.moves.has(mv.name)) bad("E_BUNDLE_COLLISION", file, `[${i}].name`, `'${mv.name}' is also in ${names.moves.get(mv.name)}.`, "Each move name once.");
      else if (base.moves.some((b) => b.name === mv.name)) bad("E_BUNDLE_COLLISION", file, `[${i}].name`, `'${mv.name}' already exists in the base catalog.`, "Pick another name.");
      names.moves.set(mv.name, file);
    }
  }
  const presets = Object.entries(files).filter(([p]) => p.startsWith("characters/presets/")).map(([p, v]) => ({ file: p, ...v }));
  for (const p of presets) {
    if (!own(p.id)) bad("E_BUNDLE_NAMESPACE", p.file, "id", `'${p.id}' does not start with '${id}:'.`, `Use '${id}:${p.id.split(":").pop()}'.`);
    else if (p.file !== `characters/presets/${p.id.split(":")[1]}.json`) bad("E_BUNDLE_NAMESPACE", p.file, "id", `Preset '${p.id}' should be in characters/presets/${p.id.split(":")[1]}.json.`, "Name the file after the id's local part.");
  }
  const clash = loaded.find((b) => b.id === id && b.hash !== manifest.contentHash);
  if (clash) bad("E_BUNDLE_COLLISION", "bundle.json", "id", `Bundle '${id}' is already loaded with hash ${clash.hash}.`, "One version of a bundle per session.");
  if (issues.length) return result(bundle, manifest, files);

  // 8. References.
  const deps = manifest.dependencies || [];
  const depById = new Map(loaded.filter((b) => deps.some((d) => d.id === b.id && d.hash === b.hash)).map((b) => [b.id, b]));
  for (const d of deps) {
    if (!depById.has(d.id)) bad("E_BUNDLE_DEPENDENCY", "bundle.json", "dependencies", `Dependency '${d.id}' ${d.version} (${d.hash}) is not loaded.`, "Import the dependency first, with that exact hash.");
    for (const dd of depById.get(d.id)?.dependencies || []) if (!deps.some((x) => x.id === dd.id)) bad("E_BUNDLE_DEPENDENCY", "bundle.json", "dependencies", `'${d.id}' depends on '${dd.id}', which this bundle does not list.`, "List every transitive dependency (CATALOG_BUNDLE_SPEC 5.3).");
  }
  const refs = new RefChecker({ base, bundle, deps, depById, bad, id });
  refs.run(files, presets);

  // 9. Caps.
  checkCaps({ bundle, files, presets, bad });

  // 10. Text.
  checkTexts({ manifest, files, presets, base, bad });
  if (issues.some((i) => i.code.startsWith("E_"))) return result(bundle, manifest, files);

  // 11. Semantic checks on the merged catalog.
  let merged;
  try {
    merged = mergeBundles(base, [...depById.values(), bundle]);
  } catch (err) {
    bad("E_BUNDLE_COLLISION", "bundle.json", "", err.message, "Rename the colliding entry.");
    return result(bundle, manifest, files);
  }
  if (moveChecks) checkMoves({ merged, bundle, base, bad, names });
  checkEntries({ bundle, merged, bad });
  if (examples) checkPresetsAndExamples({ manifest, files, presets, merged, bad });
  return result(bundle, manifest, files);
}

const fileKey = (p) => ({ "moves/poses.json": "poses", "characters/bodies.json": "bodies", "characters/faces.json": "faces", "effects/fx.json": "fxPresets", "world/themes.json": "themes",
  "world/objects.json": "objects", "world/props.json": "props", "story/activities.json": "activities", "story/music_moods.json": "musicMoods" })[p] || null;

function countsOf(files) {
  const n = (p) => Object.keys(files[p] || {}).length;
  return { moves: MOVE_FILES.reduce((s, m) => s + (files[`moves/${m}.json`]?.length || 0), 0), poses: n("moves/poses.json"), bodies: n("characters/bodies.json"), faces: n("characters/faces.json"),
    fx: n("effects/fx.json"), themes: n("world/themes.json"), objects: n("world/objects.json"), props: n("world/props.json"), activities: n("story/activities.json"),
    moods: Object.keys(files["story/music_moods.json"]?.moods || {}).length, presets: Object.keys(files).filter((p) => p.startsWith("characters/presets/")).length,
    examples: files["examples/index.json"]?.examples?.length || 0 };
}

/** Step 8: every name a bundle entry refers to resolves (CATALOG_BUNDLE_SPEC 5.3). */
class RefChecker {
  constructor(o) { Object.assign(this, o); }
  table(kind, where) {
    const cat = where === BASE_ID ? this.base : where === this.id ? this.bundle.catalog : this.depById.get(where)?.catalog;
    if (!cat) return null;
    if (kind === "moves") return new Set(cat.moves.map((m) => m.name));
    if (kind === "kinds") return new Set([...Object.values(cat.props || {}).map((p) => p.kind), ...Object.values(cat.objects || {}).filter((o) => o.hold).map((o) => o.hold.kind), "any"]);
    if (kind === "holdables") return new Set([...Object.keys(cat.props || {}), ...Object.keys(cat.objects || {}).filter((k) => cat.objects[k].behavior === "holdable")]);
    return new Set(Object.keys(cat[kind] || {}));
  }
  ref(name, kind, file, path) {
    if (typeof name !== "string") return;
    const where = bundleOf(name);
    if (where !== BASE_ID && where !== this.id && !this.deps.some((d) => d.id === where)) {
      this.bad("E_BUNDLE_DEPENDENCY", file, path, `'${name}' comes from bundle '${where}', which is not a declared dependency.`, "Add it to dependencies (id, version, hash) or use a base entry.");
      return;
    }
    const table = this.table(kind, where);
    if (!table) return; // an undeclared or unloaded dependency was reported above
    if (!table.has(name)) {
      const near = closestMatch(name, [...table]);
      this.bad("E_BUNDLE_REF", file, path, `Unknown ${kind === "fxPresets" ? "fx" : kind.replace(/s$/, "")} '${name}'.`, near ? `Did you mean '${near}'?` : `Use a base name or one of this bundle's ${kind}.`);
    }
  }
  run(files, presets) {
    const sfx = new Set(this.base.sfxKeys);
    for (const m of MOVE_FILES) {
      for (const [i, mv] of (files[`moves/${m}.json`] || []).entries()) {
        const file = `moves/${m}.json`;
        const p = `[${i}]`;
        (mv.keys || []).forEach((k, j) => { if (typeof k.pose === "string") this.ref(k.pose, "poses", file, `${p}.keys[${j}].pose`); });
        if (mv.face) this.ref(mv.face, "faces", file, `${p}.face`);
        if (mv.chain) this.ref(mv.chain, "moves", file, `${p}.chain`);
        if (mv.pair?.partnerMove) this.ref(mv.pair.partnerMove, "moves", file, `${p}.pair.partnerMove`);
        if (mv.needsProp) this.ref(mv.needsProp, "kinds", file, `${p}.needsProp`);
        (mv.hits || []).forEach((h, j) => { for (const f of [].concat(h.fx || [])) this.ref(f, "fxPresets", file, `${p}.hits[${j}].fx`); if (h.sfx && !sfx.has(h.sfx)) this.bad("E_BUNDLE_REF", file, `${p}.hits[${j}].sfx`, `Unknown SFX key '${h.sfx}'.`, "Bundles use base SFX keys only (catalog/effects/sfx.json)."); });
        (mv.events || []).forEach((e, j) => { for (const f of [].concat(e.fx || [])) this.ref(f, "fxPresets", file, `${p}.events[${j}].fx`); if (e.sfx && !sfx.has(e.sfx)) this.bad("E_BUNDLE_REF", file, `${p}.events[${j}].sfx`, `Unknown SFX key '${e.sfx}'.`, "Bundles use base SFX keys only."); });
      }
    }
    for (const [name, b] of Object.entries(files["characters/bodies.json"] || {})) {
      for (const [i, a] of (b.avoid || []).entries()) this.ref(a, "moves", "characters/bodies.json", `${name}.avoid[${i}]`);
      for (const [g, target] of Object.entries(b.moves || {})) this.ref(target, "moves", "characters/bodies.json", `${name}.moves.${g}`);
    }
    for (const p of presets) {
      if (p.cast?.body) this.ref(p.cast.body, "bodies", p.file, "cast.body");
      if (p.cast?.prop) this.ref(p.cast.prop, "holdables", p.file, "cast.prop");
    }
    for (const [name, o] of Object.entries(files["world/objects.json"] || {})) {
      if (o.use?.spawn) this.ref(o.use.spawn, "objects", "world/objects.json", `${name}.use.spawn`);
      if (o.use?.fx) this.ref(o.use.fx, "fxPresets", "world/objects.json", `${name}.use.fx`);
      if (o.use?.sfx && !sfx.has(o.use.sfx)) this.bad("E_BUNDLE_REF", "world/objects.json", `${name}.use.sfx`, `Unknown SFX key '${o.use.sfx}'.`, "Bundles use base SFX keys only.");
    }
    for (const [name, a] of Object.entries(files["story/activities.json"] || {})) {
      (a.roles || []).forEach((r, i) => {
        if (r.start) this.ref(r.start, "moves", "story/activities.json", `${name}.roles[${i}].start`);
        for (const m of r.moves || []) this.ref(m, "moves", "story/activities.json", `${name}.roles[${i}].moves`);
        if (r.face) this.ref(r.face, "faces", "story/activities.json", `${name}.roles[${i}].face`);
        if (r.fx) this.ref(r.fx, "fxPresets", "story/activities.json", `${name}.roles[${i}].fx`);
        if (r.holds) this.ref(r.holds, "holdables", "story/activities.json", `${name}.roles[${i}].holds`);
      });
      for (const k of a.objects || []) this.ref(k, "objects", "story/activities.json", `${name}.objects`);
      if (a.rally?.ball) this.ref(a.rally.ball, "objects", "story/activities.json", `${name}.rally.ball`);
    }
    const scales = { ...this.base.scales, ...this.bundle.catalog.scales };
    for (const [name, m] of Object.entries(files["story/music_moods.json"]?.moods || {})) {
      if (!scales[m.scale]) this.bad("E_BUNDLE_REF", "story/music_moods.json", `moods.${name}.scale`, `Unknown scale '${m.scale}'.`, `Base scales: ${Object.keys(this.base.scales).join(", ")}.`);
    }
  }
}

/** Step 9: resource caps. */
function checkCaps({ bundle, files, presets, bad }) {
  const c = bundle.catalog;
  const over = (file, path, n, cap, what) => { if (n > cap) bad("E_BUNDLE_CAP", file, path, `${n} ${what} (the cap is ${cap}).`, "Split the bundle or trim it."); };
  const counts = { moves: c.moves.length, poses: Object.keys(c.poses).length, bodies: Object.keys(c.bodies).length, faces: Object.keys(c.faces).length, presets: presets.length,
    fxPresets: Object.keys(c.fxPresets).length, themes: Object.keys(c.themes).length, objects: Object.keys(c.objects).length, props: Object.keys(c.props).length, activities: Object.keys(c.activities).length, musicMoods: Object.keys(c.musicMoods).length };
  for (const [k, n] of Object.entries(counts)) over("bundle.json", k, n, CAPS[k], k);
  over("bundle.json", "", Object.values(counts).reduce((a, b) => a + b, 0), CAPS.entries, "entries in all");
  for (const m of MOVE_FILES) {
    for (const [i, mv] of (files[`moves/${m}.json`] || []).entries()) {
      const file = `moves/${m}.json`;
      over(file, `[${i}].keys`, (mv.keys || []).length, CAPS.keys, "keyframes");
      over(file, `[${i}].root`, (mv.root || []).length, CAPS.root, "root keys");
      over(file, `[${i}].hits`, (mv.hits || []).length, CAPS.hits, "hits");
      over(file, `[${i}].events`, (mv.events || []).length, CAPS.events, "events");
    }
  }
  for (const [name, fx] of Object.entries(c.fxPresets)) {
    over("effects/fx.json", name, (fx.layers || []).reduce((s, l) => s + (l.count || 0), 0), CAPS.particles, "particles per burst");
    if (fx.sustain) over("effects/fx.json", `${name}.sustain`, (fx.sustain.rate || 0) * (fx.sustain.duration || 0), CAPS.sustain, "sustained bursts");
  }
  let pathTotal = 0;
  for (const [name, o] of Object.entries(c.objects)) {
    const n = (o.paths || []).reduce((s, p) => s + (p.d || []).length, 0);
    pathTotal += n;
    over("world/objects.json", `${name}.paths`, n, CAPS.pathCommands, "path commands");
    for (const [i, p] of (o.paths || []).entries()) for (const [j, cmd] of (p.d || []).entries()) {
      const nums = cmd.slice(1).filter((x) => typeof x === "number");
      nums.forEach((v, k) => { const isX = k % 2 === 0; if (isX ? v < -600 || v > 600 : v < -1200 || v > 50) bad("E_BUNDLE_CAP", "world/objects.json", `${name}.paths[${i}].d[${j}]`, `Coordinate ${v} is outside x -600..600, y -1200..50.`, "Keep the drawing inside the object's box."); });
    }
  }
  over("world/objects.json", "", pathTotal, CAPS.pathCommandsTotal, "path commands in all");
  for (const [name, t] of Object.entries(c.themes)) over("world/themes.json", `${name}.layers`, (t.layers || []).length, CAPS.layers, "layers");
}

/** Step 10: visible text against the blocklist and the soft list; descriptions without URLs or handles. */
function checkTexts({ manifest, files, presets, base, bad }) {
  const texts = [["bundle.json", "name", manifest.name], ["bundle.json", "description", manifest.description], ...(manifest.tags || []).map((t, i) => ["bundle.json", `tags[${i}]`, t])];
  if (files["README.md"]) texts.push(["README.md", "", files["README.md"]]);
  const entries = (file, map) => { for (const [k, v] of Object.entries(map || {})) { if (v?.description) texts.push([file, `${k}.description`, v.description]); for (const [i, t] of (v?.tags || []).entries()) texts.push([file, `${k}.tags[${i}]`, t]); } };
  for (const p of ["characters/bodies.json", "characters/faces.json", "effects/fx.json", "world/themes.json", "world/objects.json", "world/props.json", "story/activities.json"]) entries(p, files[p]);
  entries("story/music_moods.json", files["story/music_moods.json"]?.moods);
  for (const m of MOVE_FILES) for (const [i, mv] of (files[`moves/${m}.json`] || []).entries()) { texts.push([`moves/${m}.json`, `[${i}].description`, mv.description]); for (const [j, t] of (mv.tags || []).entries()) texts.push([`moves/${m}.json`, `[${i}].tags[${j}]`, t]); }
  for (const [name, fx] of Object.entries(files["effects/fx.json"] || {})) for (const [i, l] of (fx.layers || []).entries()) if (l.text) texts.push(["effects/fx.json", `${name}.layers[${i}].text`, l.text]);
  for (const p of presets) texts.push([p.file, "name", p.name], [p.file, "description", p.description]);
  for (const [i, e] of (files["examples/index.json"]?.examples || []).entries()) texts.push(["examples/index.json", `examples[${i}].title`, e.title], ["examples/index.json", `examples[${i}].description`, e.description]);
  for (const [file, path, text] of texts) {
    if (typeof text !== "string") continue;
    const out = [];
    checkText(text, path, base.blocklist, out);
    for (const i of out) if (i.code === "E_TEXT_BLOCKED") bad("E_BUNDLE_TEXT", file, path, "The text contains a blocked word.", "Keep everything family-friendly (no gore, self-harm or slurs).");
    for (const aud of manifest.audience) for (const w of base.softWords || []) {
      if (!w.audiences.includes(aud)) continue;
      if (new RegExp(`(^|[^a-z])${w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`).test(text.toLowerCase())) { bad("W_BUNDLE_SOFT", file, path, `"${w.word}" is a strong word for a ${aud} audience.`, `Say "${w.alt}" instead.`); break; }
    }
    if (path.endsWith("description") && /https?:\/\/|(^|\s)@[a-z0-9_]/i.test(text)) bad("E_BUNDLE_TEXT", file, path, "Descriptions carry no URLs or @ handles.", "Put links in author.url and README.md.");
    if (path === "name" && /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u.test(text)) bad("E_BUNDLE_TEXT", file, path, "Names carry no emoji.", "Use letters.");
  }
}

/** Step 11a: every bundle move on every plan of its rig, and every base move on each bundle plan. */
function checkMoves({ merged, bundle, base, bad, names }) {
  for (const m of bundle.catalog.moves) {
    if (m.flags?.partner) continue;
    for (const p of checkMove(m, merged, { draft: true })) bad("E_BUNDLE_MOVE", names.moves.get(m.name) || "moves", m.name, p, "Fix the keyframes or root motion so the move runs on every body plan of its rig.");
  }
  const plans = Object.keys(bundle.catalog.bodies);
  if (!plans.length) return;
  // A four-legged plan renames the generic moves every story module starts by name (ADR-020).
  for (const p of plans) {
    const plan = merged.bodies[p];
    if (plan.rig !== "quadruped") continue;
    for (const g of REQUIRED_GENERICS) {
      const target = plan.moves?.[g];
      const def = target && merged.moves.find((m) => m.name === target);
      if (!def) bad("E_BUNDLE_BODY", "characters/bodies.json", `${p}.moves.${g}`, `The quadruped plan does not map '${g}' to one of its moves.`, `Map ${REQUIRED_GENERICS.join(", ")} to quadruped moves (base: idle_dog, walk_dog, run_dog, get_up_dog).`);
      else if (def.rig !== "quadruped") bad("E_BUNDLE_BODY", "characters/bodies.json", `${p}.moves.${g}`, `'${target}' is not a quadruped move.`, "Point the map at a move with \"rig\": \"quadruped\".");
    }
  }
  const onBundlePlans = { ...merged, bodies: Object.fromEntries(plans.map((p) => [p, merged.bodies[p]])) };
  for (const m of base.moves) {
    if (m.flags?.partner) continue;
    const rig = m.rig || "humanoid";
    if (!plans.some((p) => (merged.bodies[p].rig || "humanoid") === rig)) continue;
    const problems = checkMove(m, onBundlePlans, { draft: false });
    if (problems.length) bad("E_BUNDLE_BODY", "characters/bodies.json", problems[0].split(":")[0], `Base move '${m.name}': ${problems[0]}`, "Adjust the plan's dims so every base move of its rig runs on it.");
  }
}

/** Step 11b: semantic rules per entry kind that the schemas cannot express. */
function checkEntries({ bundle, bad }) {
  for (const [name, o] of Object.entries(bundle.catalog.objects)) {
    for (const [i, p] of (o.paths || []).entries()) for (const key of ["fill", "stroke"]) {
      const v = p[key];
      if (typeof v === "string" && v.startsWith("colors.") && !(o.colors || {})[v.slice(7)]) bad("E_BUNDLE_ENTRY", "world/objects.json", `${name}.paths[${i}].${key}`, `'${v}' names no colour of this object.`, `Colours: ${Object.keys(o.colors || {}).join(", ") || "none"}.`);
    }
    if (o.states && o.states.length < 2) bad("E_BUNDLE_ENTRY", "world/objects.json", `${name}.states`, "An object with states needs at least two.", "List the states in order (the first is the default).");
  }
  for (const [name, t] of Object.entries(bundle.catalog.themes)) {
    for (const [i, l] of (t.layers || []).entries()) for (const [lo, hi] of [["minW", "maxW"], ["minH", "maxH"]]) {
      if (typeof l[lo] === "number" && typeof l[hi] === "number" && l[lo] > l[hi]) bad("E_BUNDLE_ENTRY", "world/themes.json", `${name}.layers[${i}]`, `${lo} is above ${hi}.`, "Swap them.");
    }
  }
}

/** Step 11c: presets stand on stage without errors; every example validates (per audience) and the examples cover every entry. */
function checkPresetsAndExamples({ manifest, files, presets, merged, bad }) {
  const errorsOf = (story) => {
    try { return validate(story, merged).errors.map((e) => `${e.code} ${e.path}: ${e.message}`); } catch (err) { return [`the engine cannot run it: ${err.message.split("\n")[0]}`]; }
  };
  const pin = { id: manifest.id, version: manifest.version };
  for (const p of presets) {
    for (const a of p.audience || []) if (!manifest.audience.includes(a)) bad("E_BUNDLE_AUDIENCE", p.file, "audience", `The preset lists '${a}' but the bundle does not.`, `Preset audiences must be a subset of ${JSON.stringify(manifest.audience)}.`);
    const local = p.id.split(":")[1];
    const story = presetStory({ ...p, id: local }, "white_stage");
    story.bundles = [pin];
    for (const e of errorsOf(story)) bad("E_BUNDLE_PRESET", p.file, "cast", e, "Fix the cast entry so the preset stands on stage.");
  }
  const index = files["examples/index.json"]?.examples || [];
  if (!index.length) bad("E_BUNDLE_EXAMPLE", "examples/index.json", "examples", "At least one example is required.", "Add a story or clip that uses the bundle.");
  const used = new Set();
  index.forEach((e, i) => {
    const file = `examples/${e.path}`;
    const data = files[file];
    if (!data) { bad("E_BUNDLE_EXAMPLE", "examples/index.json", `examples[${i}].path`, `${file} is not in the bundle.`, "Add the file or fix the path."); return; }
    const script = e.kind === "story" ? data.story : data;
    if (!script || typeof script !== "object") { bad("E_BUNDLE_EXAMPLE", file, "", e.kind === "story" ? "A story example is { \"story\": ..., \"outline\"?: ... }." : "A clip example is a v1 script.", "Match catalog/examples."); return; }
    const own = (script.bundles || []).find((b) => b.id === manifest.id);
    if (!own || own.version !== manifest.version) bad("E_BUNDLE_EXAMPLE", file, "bundles", `The example must declare this bundle: { "id": "${manifest.id}", "version": "${manifest.version}" } without a hash.`, "The hash covers the example file itself, so the own pin is written without it.");
    else if (own.hash) bad("E_BUNDLE_EXAMPLE", file, "bundles", "The own bundle's pin carries a hash.", "Leave the hash out of a bundle's own examples; scripts outside the bundle pin the hash.");
    for (const aud of manifest.audience) {
      const copy = JSON.parse(JSON.stringify(script));
      if (copy.version === 2) copy.meta.audience = aud;
      else if (aud !== "general") continue; // v1 clips carry no audience
      for (const err of errorsOf(copy)) bad("E_BUNDLE_EXAMPLE", file, "", `${err} (audience ${aud})`, "Fix the example so it validates with no errors.");
    }
    for (const s of JSON.stringify(script).match(/"[a-z][a-z0-9_]{2,31}:[a-z][a-z0-9_]{0,31}"/g) || []) used.add(s.slice(1, -1));
  });
  const c = presetsFree(merged, manifest.id);
  for (const name of c) if (!used.has(name)) bad("E_BUNDLE_EXAMPLE", "examples/index.json", "examples", `No example uses '${name}'.`, "Every entry (except poses and presets) must appear in an example.");
}

/** The bundle's entry names an example must use: moves, bodies, faces, fx, themes, objects, props, activities and moods. */
function presetsFree(merged, id) {
  const own = (n) => bundleOf(n) === id;
  return [...merged.moves.map((m) => m.name).filter(own), ...["bodies", "faces", "fxPresets", "themes", "objects", "props", "activities", "musicMoods"].flatMap((k) => Object.keys(merged[k]).filter(own))];
}
