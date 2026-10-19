// Steps 6-8 (CATALOG_BUNDLE_SPEC 6.2, 5.3): per-file schemas, namespacing and collisions, and reference
// resolution (base, own and dependency names, with the dependency rules). Pure.

import { checkValue } from "../../../engine/validator/schema.js";
import { closestMatch } from "../../../engine/validator/report.js";
import { schemaOf, bundleOf, localPart, catalogFragment, presetsOf, MOVE_GROUPS } from "./layout.mjs";

const issue = (code, file, path, message, fix) => ({ code, file, path, message, fix });

/** Step 6: each file against its bundle schema. */
export function checkSchemas(files, schemas) {
  const out = [];
  for (const [rel, value] of Object.entries(files)) {
    const name = schemaOf(rel);
    if (!name || name === "bundle.schema.json") continue;
    for (const i of checkValue(value, schemas[name], "", { schemas })) out.push(issue("E_BUNDLE_SCHEMA", rel, i.path, `${i.code}: ${i.message}`, i.fix));
  }
  return out;
}

/** Step 7: own prefixes, preset file names, unique names, loaded bundles with the same id. */
export function checkNamespace(files, manifest, hash, loaded = []) {
  const out = [];
  const id = manifest.id;
  const own = (name, file, path) => {
    if (bundleOf(name) !== id) out.push(issue("E_BUNDLE_NAMESPACE", file, path, `'${name}' does not start with '${id}:'.`, `Name it '${id}:${bundleOf(name) ? localPart(name) : name}'.`));
  };
  const keys = (rel, obj, pre = "") => Object.keys(obj || {}).forEach((k) => own(k, rel, pre + k));
  keys("moves/poses.json", files["moves/poses.json"]);
  for (const rel of ["characters/bodies.json", "characters/faces.json", "effects/fx.json", "world/themes.json", "world/objects.json", "world/props.json", "story/activities.json"]) keys(rel, files[rel]);
  keys("story/music_moods.json", files["story/music_moods.json"]?.scales, "scales.");
  keys("story/music_moods.json", files["story/music_moods.json"]?.moods, "moods.");
  const moveAt = new Map();
  for (const g of MOVE_GROUPS) {
    (files[`moves/${g}.json`] || []).forEach((m, i) => {
      const rel = `moves/${g}.json`;
      own(m.name, rel, `[${i}].name`);
      if (moveAt.has(m.name)) out.push(issue("E_BUNDLE_COLLISION", rel, `[${i}].name`, `The move '${m.name}' is also defined in ${moveAt.get(m.name)}.`, "Give each move its own name."));
      else moveAt.set(m.name, rel);
    });
  }
  const presetIds = new Map();
  for (const p of presetsOf(files)) {
    own(p.id, p.file, "id");
    if (bundleOf(p.id) === id && p.file !== `characters/presets/${localPart(p.id)}.json`) out.push(issue("E_BUNDLE_NAMESPACE", p.file, "id", `A preset with id '${p.id}' must be in characters/presets/${localPart(p.id)}.json.`, "Rename the file after the id's local part."));
    if (presetIds.has(p.id)) out.push(issue("E_BUNDLE_COLLISION", p.file, "id", `The preset id '${p.id}' is also used in ${presetIds.get(p.id)}.`, "Give each preset its own id."));
    else presetIds.set(p.id, p.file);
  }
  for (const b of loaded) {
    if (b.id === id && b.hash !== hash) {
      out.push(issue("E_BUNDLE_COLLISION", "bundle.json", "id", `A bundle '${id}' (${b.version}, ${b.hash}) is already loaded.`, b.version === manifest.version ? "Two different bundles use the same id and version: one of them changed after packing." : "Only one version of a bundle id can be loaded at a time: remove the other one first."));
    }
  }
  return out;
}

/** The names of each kind a catalog (or fragment) defines. */
export function namesOf(c) {
  const holdKinds = [...Object.values(c.props || {}).map((p) => p.kind), ...Object.values(c.objects || {}).filter((o) => o.hold).map((o) => o.hold.kind)];
  const holdables = [...Object.keys(c.props || {}), ...Object.entries(c.objects || {}).filter(([, o]) => o.hold).map(([k]) => k)];
  return {
    pose: new Set(Object.keys(c.poses || {})), move: new Set((c.moves || []).map((m) => m.name)), face: new Set(Object.keys(c.faces || {})),
    fx: new Set(Object.keys(c.fxPresets || {})), object: new Set(Object.keys(c.objects || {})), body: new Set(Object.keys(c.bodies || {})),
    scale: new Set(Object.keys(c.scales || {})), holdable: new Set(holdables), kind: new Set(holdKinds), sfx: new Set(c.sfxKeys || []),
  };
}

const KIND_WORD = { pose: "pose", move: "move", face: "face", fx: "FX preset", object: "object", body: "body plan", scale: "scale", holdable: "prop or holdable", kind: "prop kind", sfx: "SFX key" };

/** Every reference a bundle makes (the table of 5.3): [{ kind, name, file, path }]. */
export function referencesOf(files) {
  const refs = [];
  const r = (kind, name, file, path) => { if (typeof name === "string") refs.push({ kind, name, file, path }); };
  for (const g of MOVE_GROUPS) {
    const file = `moves/${g}.json`;
    (files[file] || []).forEach((m, i) => {
      const at = `[${i}]`;
      (m.keys || []).forEach((k, j) => r("pose", k.pose, file, `${at}.keys[${j}].pose`));
      r("face", m.face, file, `${at}.face`);
      r("move", m.chain, file, `${at}.chain`);
      r("move", m.pair?.partnerMove, file, `${at}.pair.partnerMove`);
      if (m.needsProp !== "any") r("kind", m.needsProp, file, `${at}.needsProp`);
      (m.hits || []).forEach((h, j) => { (h.fx || []).forEach((f, k) => r("fx", f, file, `${at}.hits[${j}].fx[${k}]`)); r("sfx", h.sfx, file, `${at}.hits[${j}].sfx`); });
      (m.events || []).forEach((e, j) => { (e.fx || []).forEach((f, k) => r("fx", f, file, `${at}.events[${j}].fx[${k}]`)); r("sfx", e.sfx, file, `${at}.events[${j}].sfx`); });
    });
  }
  for (const [name, b] of Object.entries(files["characters/bodies.json"] || {})) {
    (b.avoid || []).forEach((m, i) => r("move", m, "characters/bodies.json", `${name}.avoid[${i}]`));
    for (const [g, m] of Object.entries(b.moves || {})) r("move", m, "characters/bodies.json", `${name}.moves.${g}`);
  }
  for (const p of presetsOf(files)) {
    r("body", p.cast?.body, p.file, "cast.body");
    r("holdable", p.cast?.prop ?? undefined, p.file, "cast.prop");
  }
  for (const [name, o] of Object.entries(files["world/objects.json"] || {})) {
    r("object", o.use?.spawn, "world/objects.json", `${name}.use.spawn`);
    (o.use?.fx || []).forEach((f, i) => r("fx", f, "world/objects.json", `${name}.use.fx[${i}]`));
    r("sfx", o.use?.sfx, "world/objects.json", `${name}.use.sfx`);
    for (const [k, s] of Object.entries(o.sfx || {})) r("sfx", s, "world/objects.json", `${name}.sfx.${k}`);
  }
  for (const [name, a] of Object.entries(files["story/activities.json"] || {})) {
    const f = "story/activities.json";
    (a.objects || []).forEach((o, i) => r("object", o, f, `${name}.objects[${i}]`));
    (a.roles || []).forEach((role, i) => {
      const at = `${name}.roles[${i}]`;
      r("move", role.start, f, `${at}.start`);
      (role.moves || []).forEach((m, j) => r("move", m, f, `${at}.moves[${j}]`));
      r("face", role.face, f, `${at}.face`);
      r("fx", role.fx, f, `${at}.fx`);
      r("holdable", role.holds, f, `${at}.holds`);
    });
    if (a.rally) {
      r("object", a.rally.ball, f, `${name}.rally.ball`);
      a.rally.hit.forEach((m, j) => r("move", m, f, `${name}.rally.hit[${j}]`));
      r("move", a.rally.catch, f, `${name}.rally.catch`);
    }
  }
  for (const [name, m] of Object.entries(files["story/music_moods.json"]?.moods || {})) r("scale", m.scale, "story/music_moods.json", `moods.${name}.scale`);
  return refs;
}

/**
 * Step 8: every reference resolves; dependencies are declared, loaded with the pinned hash, acyclic and
 * complete (a dependency's own dependencies are listed too).
 * @param {object} base  the engine catalog
 * @param {Array<{ id, version, hash, manifest, files }>} loaded  bundles already imported
 */
export function checkRefs(files, manifest, base, loaded = []) {
  const out = [];
  const id = manifest.id;
  const deps = manifest.dependencies || [];
  const byId = new Map(loaded.map((b) => [b.id, b]));
  const ok = new Map();
  deps.forEach((d, i) => {
    const path = `dependencies[${i}]`;
    const b = byId.get(d.id);
    if (d.id === id) out.push(issue("E_BUNDLE_DEPENDENCY", "bundle.json", path, "A bundle cannot depend on itself.", "Remove this entry."));
    else if (!b) out.push(issue("E_BUNDLE_DEPENDENCY", "bundle.json", path, `The dependency '${d.id}' ${d.version} is not loaded.`, `Import ${d.id} ${d.version} (${d.hash}) first.`));
    else if (b.hash !== d.hash) out.push(issue("E_BUNDLE_DEPENDENCY", "bundle.json", path, `'${d.id}' is loaded with hash ${b.hash}, the manifest pins ${d.hash}.`, "Import the pinned version, or pin the loaded one."));
    else ok.set(d.id, b);
  });
  for (const [depId, b] of ok) {
    for (const dd of b.manifest.dependencies || []) {
      if (dd.id === id) out.push(issue("E_BUNDLE_DEPENDENCY", "bundle.json", "dependencies", `'${depId}' depends on '${id}': dependencies cannot form a cycle.`, "Move the shared entries into one of the two bundles."));
      else if (!deps.some((d) => d.id === dd.id && d.hash === dd.hash)) out.push(issue("E_BUNDLE_DEPENDENCY", "bundle.json", "dependencies", `'${depId}' depends on '${dd.id}' (${dd.hash}), which this manifest does not list.`, `Add ${JSON.stringify(dd)} to dependencies.`));
    }
  }
  const tables = { base: namesOf(base), own: namesOf(catalogFragment(files)), dep: new Map([...ok].map(([k, b]) => [k, namesOf(catalogFragment(b.files))])) };
  const reported = new Set();
  for (const ref of referencesOf(files)) {
    const pre = bundleOf(ref.name);
    let table;
    if (ref.kind === "sfx") table = pre ? null : tables.base.sfx;
    else if (!pre) table = tables.base[ref.kind];
    else if (pre === id) table = tables.own[ref.kind];
    else if (!deps.some((d) => d.id === pre)) {
      out.push(issue("E_BUNDLE_DEPENDENCY", ref.file, ref.path, `'${ref.name}' is from the bundle '${pre}', which is not in dependencies.`, `Add ${pre} to the manifest's dependencies, or use a base or own name.`));
      continue;
    } else if (!ok.has(pre)) {
      if (!reported.has(pre)) out.push(issue("E_BUNDLE_DEPENDENCY", ref.file, ref.path, `'${ref.name}' needs the dependency '${pre}', which is not loaded.`, `Import ${pre} first.`));
      reported.add(pre);
      continue;
    } else table = tables.dep.get(pre)[ref.kind];
    // A namespaced prop kind is defined by using it (4.12): it only has to come from this bundle or a dependency.
    if (ref.kind === "kind" && pre) continue;
    if (table?.has(ref.name)) continue;
    const near = table ? closestMatch(ref.name, [...table]) : null;
    out.push(issue("E_BUNDLE_REF", ref.file, ref.path, ref.kind === "sfx" && pre ? `'${ref.name}': bundles cannot add sounds.` : `'${ref.name}' is not a ${KIND_WORD[ref.kind]} ${pre === id ? "in this bundle" : pre ? `in '${pre}'` : "in the base catalog"}.`,
      near ? `Did you mean '${near}'?` : `Use a ${KIND_WORD[ref.kind]} that exists.`));
  }
  // Generic names in a quadruped map are the base plans' generic names.
  const generic = new Set(Object.values(base.bodies || {}).filter((b) => b.rig === "quadruped").flatMap((b) => Object.keys(b.moves || {})));
  for (const [name, b] of Object.entries(files["characters/bodies.json"] || {})) {
    for (const g of Object.keys(b.moves || {})) {
      if (!generic.has(g)) out.push(issue("E_BUNDLE_REF", "characters/bodies.json", `${name}.moves.${g}`, `'${g}' is not a generic move name of the base quadruped plans.`, `Use one of: ${[...generic].slice(0, 12).join(", ")} ...`));
    }
  }
  return out;
}
