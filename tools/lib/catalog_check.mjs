// Catalog checks (CATALOG_SPEC 6 step 1-2, 11): schemas per authored file, unique names, descriptions and
// tags, references, the engine's own move checks on every body plan, engine vocabulary coverage, and every
// example (docs, presets, examples/) validated. Pure: the caller reads the folder (catalog_files.mjs).
// Each issue is { file, path, message }; an empty list means the catalog is good.

import { checkValue } from "../../engine/validator/schema.js";
import { validate } from "../../engine/index.js";
import { WORLD_COMMANDS_V2 } from "../../engine/validator/semantic.js";
import { MACRO_PARAMS } from "../../engine/validator/macro_params.js";
import { V2_ENUMS } from "../../engine/validator/v2_names.js";
import { OBJECT_SHAPES } from "../../engine/renderer/objects.js";
import { PROP_SHAPES } from "../../engine/renderer/props.js";
import { LAYER_KINDS } from "../../engine/renderer/background.js";
import { MOVE_FILES } from "../../catalog/index.js";
import { ACTIVITY_NAMES } from "../../engine/workbook/activities/index.js";
import { educationIssues } from "./catalog_education.mjs";
import { checkMove } from "./move_check.mjs";
import { schemaFor } from "./catalog_files.mjs";
import { worldCommandStory, macroStory, cameraStory, transitionStory, presetStory } from "./catalog_harness.mjs";

/** The names the engine owns, which catalog/docs must describe one to one. */
export function engineNames(codes) {
  return {
    "docs/world_commands.json": Object.keys(WORLD_COMMANDS_V2),
    "docs/macros.json": Object.keys(MACRO_PARAMS),
    "docs/camera.json modes": V2_ENUMS.cameraMode,
    "docs/transitions.json types": V2_ENUMS.transition,
    "docs/transitions.json cards": V2_ENUMS.cardKind,
    "docs/codes.json": [...codes].sort(),
    "characters/voices.json timbres": V2_ENUMS.timbre,
    "world/ambience.json beds": V2_ENUMS.ambience,
    "docs/workbook_activities.json": ACTIVITY_NAMES,
  };
}

/**
 * The base names bundles can refer to (CATALOG_BUNDLE_SPEC 9: a public interface once bundles ship).
 * catalog/base_names.json keeps them as of the last release; the check below fails when one disappears.
 */
export function baseNames(catalog) {
  return {
    poses: Object.keys(catalog.poses), moves: catalog.moves.map((m) => m.name), bodies: catalog.bodyNames, faces: catalog.faceNames,
    fx: Object.keys(catalog.fxPresets), sfx: catalog.sfxKeys, themes: catalog.themeNames, objects: Object.keys(catalog.objects),
    props: Object.keys(catalog.props), activities: catalog.activityNames, moods: Object.keys(catalog.musicMoods), scales: Object.keys(catalog.scales),
  };
}

/** Validator errors for a story, or the engine's own complaint when the catalog is too broken to load. */
function storyErrors(story, catalog) {
  try {
    return validate(story, catalog).errors.map((e) => `${e.code} ${e.path}: ${e.message}`);
  } catch (err) {
    return [`the engine cannot run it: ${err.message.split("\n").join(" ")}`];
  }
}

/**
 * @param {ReturnType<import("./catalog_files.mjs").readCatalogDir>} src
 * @param {{ codes: Set<string>, moveChecks?: boolean, examples?: boolean }} opts  codes: every code the validator
 *   can report; moveChecks / examples false skip the slow parts (the move runs, the example dry runs)
 */
export function checkCatalog(src, { codes, moveChecks = true, examples = true }) {
  const out = [];
  const errorsOf = examples ? storyErrors : () => [];
  const bad = (file, path, message) => out.push({ file, path, message });
  const { files, catalog } = src;

  // 1. Schemas.
  for (const [rel, value] of Object.entries(files)) {
    const schema = src.schemas[schemaFor(rel)];
    if (!schema) { bad(rel, "", `no schema "${schemaFor(rel)}"`); continue; }
    for (const i of checkValue(value, schema)) bad(rel, i.path, `${i.code}: ${i.message} ${i.fix || ""}`.trim());
  }

  // 2. Unique names.
  const seen = new Map();
  for (const f of MOVE_FILES) {
    for (const [i, m] of files[`moves/${f}.json`].entries()) {
      if (seen.has(m.name)) bad(`moves/${f}.json`, `[${i}]`, `move "${m.name}" is also in ${seen.get(m.name)}`);
      seen.set(m.name, `moves/${f}.json`);
    }
  }
  const uniq = (rel, list, path) => {
    const s = new Set();
    for (const e of list) (s.has(e.name) ? bad(rel, path, `"${e.name}" is listed twice`) : s.add(e.name));
  };
  uniq("effects/sfx.json", files["effects/sfx.json"], "");
  for (const [k, v] of Object.entries(files["characters/appearance.json"])) if (k !== "conflicts") uniq("characters/appearance.json", v, k);
  for (const [rel, key] of [["characters/voices.json", "timbres"], ["characters/roles.json", "roles"], ["world/ambience.json", "beds"]]) uniq(rel, files[rel][key], key);

  // Spoken voices (SPEECH_SPEC 5): one entry per engine timbre.
  const ttsTimbres = Object.keys(files["story/tts_voices.json"].timbres).sort();
  if (ttsTimbres.join() !== [...V2_ENUMS.timbre].sort().join()) bad("story/tts_voices.json", "timbres", `needs exactly the timbres ${V2_ENUMS.timbre.join(", ")}`);
  for (const m of Object.keys(files["story/tts_voices.json"].moods || {})) if (!catalog.faces[m]) bad("story/tts_voices.json", `moods.${m}`, `"${m}" is not a face (moods are keyed by face name)`);
  if (!files["story/tts_voices.json"].moods?.neutral) bad("story/tts_voices.json", "moods", "needs a neutral mood (the fallback)");

  // Talking mouth shapes (ADR-032): a rest shape, sizes in head radii, each grapheme on one viseme only.
  const vis = files["characters/visemes.json"];
  if (!vis.rest) bad("characters/visemes.json", "rest", "needs a rest shape (the face's own mouth)");
  const owner = new Map();
  for (const [name, v] of Object.entries(vis)) {
    for (const k of ["open", "width"]) if (typeof v[k] !== "number" || v[k] < 0 || v[k] > 0.4) bad("characters/visemes.json", `${name}.${k}`, "needs a number from 0 to 0.4 (head radii)");
    if (v.round !== undefined && !(v.round >= 0 && v.round <= 1)) bad("characters/visemes.json", `${name}.round`, "needs a number from 0 to 1");
    if (!Array.isArray(v.letters)) bad("characters/visemes.json", `${name}.letters`, "needs a list of letters");
    for (const g of v.letters || []) {
      if (!/^[a-z]{1,3}$/.test(g)) bad("characters/visemes.json", `${name}.letters`, `"${g}" is not 1-3 lowercase letters`);
      else if (owner.has(g)) bad("characters/visemes.json", `${name}.letters`, `"${g}" is already on ${owner.get(g)}`);
      else owner.set(g, name);
    }
  }

  // 3. References.
  const moveNames = new Set(catalog.moves.map((m) => m.name));
  const holdKinds = new Set([...Object.values(catalog.props).map((p) => p.kind), ...Object.values(catalog.objects).filter((o) => o.hold).map((o) => o.hold.kind), "any"]);
  for (const m of catalog.moves) if (m.needsProp && !holdKinds.has(m.needsProp)) bad("moves", m.name, `needsProp "${m.needsProp}" matches no prop or holdable`);
  for (const [name, b] of Object.entries(catalog.bodies)) for (const a of b.avoid || []) if (!moveNames.has(a)) bad("characters/bodies.json", `${name}.avoid`, `unknown move "${a}"`);
  for (const [name, o] of Object.entries(catalog.objects)) {
    if (o.draw !== "paths" && o.draw !== "held" && !OBJECT_SHAPES().includes(o.draw)) bad("world/objects.json", `${name}.draw`, `unknown shape "${o.draw}"`);
    if (o.hold && !PROP_SHAPES.includes(o.hold.shape)) bad("world/objects.json", `${name}.hold.shape`, `unknown prop shape "${o.hold.shape}"`);
  }
  for (const [name, p] of Object.entries(catalog.props)) if (!PROP_SHAPES.includes(p.shape)) bad("world/props.json", `${name}.shape`, `unknown prop shape "${p.shape}"`);
  for (const [name, t] of Object.entries(catalog.themes)) for (const [i, l] of (t.layers || []).entries()) if (!LAYER_KINDS.includes(l.kind)) bad("world/themes.json", `${name}.layers[${i}]`, `unknown layer kind "${l.kind}"`);
  for (const [name, a] of Object.entries(catalog.activities)) {
    const used = [...a.roles.flatMap((r) => [r.start, ...(r.moves || [])]), ...(a.rally ? [...a.rally.hit, a.rally.catch] : [])].filter(Boolean);
    for (const m of used) if (!moveNames.has(m)) bad("story/activities.json", name, `unknown move "${m}"`);
    for (const k of [...(a.objects || []), a.rally?.ball, ...a.roles.map((r) => r.holds)].filter(Boolean)) if (!catalog.objects[k] && !catalog.props[k]) bad("story/activities.json", name, `unknown object "${k}"`);
  }
  for (const [name, m] of Object.entries(catalog.musicMoods)) if (!catalog.scales[m.scale]) bad("story/music_moods.json", `moods.${name}.scale`, `unknown scale "${m.scale}"`);
  for (const f of catalog.moves.flatMap((m) => (m.events || []).flatMap((e) => [].concat(e.fx || [])))) if (!catalog.fxPresets[f]) bad("moves", "events", `unknown fx "${f}"`);

  // 4. The engine's own move checks, every move on every body plan.
  if (moveChecks) {
    for (const m of catalog.moves) {
      if (m.flags?.partner) continue; // a partner move only plays together with its lead
      for (const p of checkMove(m, catalog, { draft: false })) bad("moves", m.name, p);
    }
  }

  // 5. Engine vocabulary coverage: one doc entry per engine name, and no doc for a name the engine lacks.
  const docNames = {
    "docs/world_commands.json": Object.keys(files["docs/world_commands.json"]),
    "docs/macros.json": Object.keys(files["docs/macros.json"]),
    "docs/camera.json modes": Object.keys(files["docs/camera.json"].modes),
    "docs/transitions.json types": Object.keys(files["docs/transitions.json"].types),
    "docs/transitions.json cards": Object.keys(files["docs/transitions.json"].cards),
    "docs/codes.json": Object.keys(files["docs/codes.json"]).sort(),
    "characters/voices.json timbres": files["characters/voices.json"].timbres.map((v) => v.name),
    "world/ambience.json beds": files["world/ambience.json"].beds.map((v) => v.name),
    "docs/workbook_activities.json": Object.keys(files["docs/workbook_activities.json"]),
  };
  for (const [where, names] of Object.entries(engineNames(codes))) {
    const have = new Set(docNames[where]);
    for (const n of names) if (!have.has(n)) bad(where, n, `the engine has "${n}" but it has no description`);
    for (const n of have) if (!names.includes(n)) bad(where, n, `"${n}" is described but the engine does not have it`);
  }

  // 6. Examples in the docs validate.
  const docEx = [
    ...Object.entries(files["docs/world_commands.json"]).map(([n, d]) => [`docs/world_commands.json`, n, () => worldCommandStory(n, d.example)]),
    ...Object.entries(files["docs/macros.json"]).map(([n, d]) => [`docs/macros.json`, n, () => macroStory(n, d.example)]),
    ...Object.entries(files["docs/camera.json"].modes).map(([n, d]) => [`docs/camera.json`, n, () => cameraStory(d.example)]),
    ...["types", "cards"].flatMap((g) => Object.entries(files["docs/transitions.json"][g]).map(([n, d]) => [`docs/transitions.json`, `${g}.${n}`, () => transitionStory(d.example)])),
  ];
  for (const [file, name, build] of docEx) {
    try {
      for (const e of errorsOf(build(), catalog)) bad(file, name, `example does not validate: ${e}`);
    } catch (err) {
      bad(file, name, err.message);
    }
  }
  for (const [i, m] of [...src.formatMd.matchAll(/```json\n([\s\S]*?)```/g)].entries()) {
    for (const e of errorsOf(JSON.parse(m[1]), catalog)) bad("docs/format.md", `example ${i + 1}`, `does not validate: ${e}`);
  }

  // 7. Presets: file name = id, a known role, and the cast entry validates on stage.
  const roles = new Set(files["characters/roles.json"].roles.map((r) => r.name));
  const ids = new Set();
  for (const p of src.presets) {
    if (p.file !== `characters/presets/${p.id}.json`) bad(p.file, "id", `the file must be named ${p.id}.json`);
    if (ids.has(p.id)) bad(p.file, "id", `preset id "${p.id}" is used twice`);
    ids.add(p.id);
    if (!roles.has(p.role)) bad(p.file, "role", `unknown role "${p.role}" (characters/roles.json)`);
    for (const e of errorsOf(presetStory(p), catalog)) bad(p.file, "cast", e);
  }

  // 8. examples/: every file indexed, every index entry present and valid.
  const index = files["examples/index.json"];
  const listed = new Set(index.examples.map((e) => e.path));
  for (const rel of Object.keys(src.examples)) if (!listed.has(rel)) bad("examples/index.json", rel, "example file is not in the index");
  for (const e of index.examples) {
    const ex = src.examples[e.path];
    if (!ex) { bad("examples/index.json", e.path, "no such example file"); continue; }
    const script = e.kind === "story" ? ex.story : ex;
    if (e.kind === "story" && !ex.outline) bad(e.path, "outline", "a story example needs its outline");
    if (script?.meta?.title !== e.title) bad("examples/index.json", e.path, `title "${e.title}" differs from the script's "${script?.meta?.title}"`);
    for (const err of errorsOf(script, catalog)) bad(e.path, "", err);
    for (const c of ex.outline?.cast || []) if (c.role && !roles.has(c.role)) bad(e.path, `outline.cast.${c.id}`, `unknown role "${c.role}"`);
  }
  // 9. Base names: every name of the last release is still there (bundles refer to them).
  const now = baseNames(catalog);
  for (const [kind, names] of Object.entries(files["base_names.json"]?.names || {})) {
    const have = new Set(now[kind] || []);
    for (const n of names) if (!have.has(n)) bad("base_names.json", `${kind}.${n}`, `the base name "${n}" is gone: bundles may refer to it. Keep it (or an entry by that name) until the next catalog format version; then run node tools/catalog_build.mjs --release-names`);
  }

  // 10. Education files (WORKBOOK_SPEC 8): shape facts against their drawings, pictures, print approvals.
  out.push(...educationIssues(src));

  const pick = index.pack;
  for (const p of [pick.clip, pick.outline]) if (!listed.has(p)) bad("examples/index.json", "pack", `"${p}" is not an indexed example`);
  for (const s of pick.scenes) if (!src.examples[s.story]?.story.scenes.some((x) => x.id === s.scene)) bad("examples/index.json", "pack.scenes", `${s.story} has no scene "${s.scene}"`);
  return out;
}

/** Themes a preset is easy to see on (no W_CONTRAST), in catalog order. */
export function goodThemes(preset, catalog) {
  return catalog.themeNames.filter((t) => !validate(presetStory(preset, t), catalog).warnings.some((w) => w.code === "W_CONTRAST"));
}
