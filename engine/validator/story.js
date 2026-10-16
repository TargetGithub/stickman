// Story (v2) semantic checks (STORY_SPEC 17). Milestone: S1.
// Story-level checks (cast, locations, scenes, transitions, macros, audience text) plus the v1 checks
// run on each scene's flat view, with paths and codes mapped back to the story.

import { checkSemantics, checkText, WORLD_COMMANDS_V2 } from "./semantic.js";
import { closestMatch } from "./report.js";
import { flatScene, resolveLocation } from "../story/normalize.js";
import { readingTime } from "../story/speech.js";

const issue = (code, path, message, fix, severity) => ({ code, path, message, fix, ...(severity ? { severity } : {}) });

/** Map a flat-scene issue path back to the story. */
function mapPath(path, si, scene) {
  const pre = `scenes[${si}]`;
  if (path.startsWith("beats")) return `${pre}.${path}`;
  if (path.startsWith("camera")) return `${pre}.${path}`;
  const m = path.match(/^characters\[(\d+)\](.*)$/);
  if (m) return `${pre}.cast[${m[1]}]${m[2] === ".color" ? "" : m[2]}`;
  if (path.startsWith("meta.theme")) return `${pre}.location`;
  return path ? `${pre}.${path}` : pre;
}

/** Soft-listed words in a text (W_TEXT_SOFT), for the story's audience. */
export function softWordIssues(text, path, catalog, audience) {
  const lower = String(text).toLowerCase();
  const out = [];
  for (const w of catalog.softWords || []) {
    if (!w.audiences.includes(audience)) continue;
    const re = new RegExp(`(^|[^a-z])${w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`);
    if (re.test(lower)) {
      out.push(issue("W_TEXT_SOFT", path, `"${w.word}" is a strong word for a ${audience} audience.`, `Say "${w.alt}" instead (or set meta.audience to "general" if that fits).`));
    }
  }
  return out;
}

function checkTransition(t, path, story, si, out) {
  if (!t) return;
  if (t.type === "card" && !t.title && !t.text) {
    out.push(issue("E_TRANSITION", path, "A card transition needs text.", 'Add "text" (or "title" for kind "title").'));
  }
  if (t.type === "card" && t.kind === "title" && !t.title) {
    out.push(issue("E_TRANSITION", path, 'A "title" card needs a "title".', 'Add "title", or use kind "chapter" with "text".'));
  }
  if (t.type === "iris") {
    const scene = story.scenes[si];
    const ids = (scene.cast || []).map((c) => c.id);
    if (!t.target) out.push(issue("E_TRANSITION", path, "An iris transition needs a target character.", `Add "target": one of ${ids.join(", ") || "the scene's cast"}.`));
    else if (!ids.includes(t.target)) out.push(issue("E_TRANSITION", `${path}.target`, `'${t.target}' is not in scene '${scene.id}'.`, `Use one of: ${ids.join(", ")}.`));
  }
  for (const k of ["title", "subtitle", "text"]) {
    if (t[k]) checkText(t[k], `${path}.${k}`, story.catalogBlocklist, out);
    if (t[k] && t.type !== "card") out.push(issue("E_TRANSITION", `${path}.${k}`, `'${k}' only applies to card transitions.`, `Remove '${k}' or use "type": "card".`));
  }
}

/** E_BODY_UNKNOWN and E_APPEARANCE for one cast entry (catalog option lists, and things worn in the same place). */
export function castLookIssues(c, path, catalog) {
  const out = [];
  if (c.body !== undefined && !catalog.bodies?.[c.body]) {
    const names = Object.keys(catalog.bodies || {});
    const near = closestMatch(c.body, names);
    out.push(issue("E_BODY_UNKNOWN", `${path}.body`, `Unknown body plan '${c.body}'.`, `Use one of: ${names.join(", ")}${near ? ` (closest: ${near})` : ""}.`));
  }
  const opts = catalog.appearance || {};
  const look = c.appearance || {};
  for (const key of ["eyes", "brows", "mouthStyle", "hair", "outfit"]) {
    const v = look[key];
    if (v === undefined || !opts[key] || opts[key].includes(v)) continue;
    const near = closestMatch(v, opts[key]);
    out.push(issue("E_APPEARANCE", `${path}.appearance.${key}`, `Unknown ${key} '${v}'.`, `Use one of: ${opts[key].join(", ")}${near ? ` (closest: ${near})` : ""}.`));
  }
  const worn = new Set([...Object.keys(look.accessories || {}), ...Object.keys(c.style || {}), ...["eyes", "hair"].filter((k) => look[k]).map((k) => `${k}:${look[k]}`)]);
  for (const [a, b] of opts.conflicts || []) {
    if (worn.has(a) && worn.has(b)) {
      out.push(issue("E_APPEARANCE", `${path}.appearance`, `'${a}' and '${b}' sit in the same place and cannot be worn together.`, `Remove one of them.`));
    }
  }
  if (look.hairColor && (!look.hair || look.hair === "none")) {
    out.push(issue("E_APPEARANCE", `${path}.appearance.hairColor`, "hairColor is set but there is no hair.", `Add "hair" (${(opts.hair || []).filter((h) => h !== "none").join(", ")}) or remove hairColor.`));
  }
  if (look.outfitColor && (!look.outfit || look.outfit === "none")) {
    out.push(issue("E_APPEARANCE", `${path}.appearance.outfitColor`, "outfitColor is set but there is no outfit.", `Add "outfit" (${(opts.outfit || []).filter((h) => h !== "none").join(", ")}) or remove outfitColor.`));
  }
  return out;
}

/**
 * @param {object} story  normalized v2 story (schema-valid)
 * @returns {object[]} issues
 */
export function checkStory(story, catalog, moves) {
  const out = [];
  story = { ...story, catalogBlocklist: catalog.blocklist };
  const audience = story.meta.audience ?? "kids";
  const castIds = new Set();
  story.cast.forEach((c, i) => out.push(...castLookIssues(c, `cast[${i}]`, catalog)));
  story.cast.forEach((c, i) => {
    if (castIds.has(c.id)) out.push(issue("E_REF_DUPLICATE", `cast[${i}].id`, `Cast id '${c.id}' is used twice.`, "Give every cast member a unique id."));
    castIds.add(c.id);
    if (c.prop && !(c.prop in catalog.props)) out.push(issue("E_PROP_UNKNOWN", `cast[${i}].prop`, `Unknown prop '${c.prop}'.`, `Use one of: ${Object.keys(catalog.props).join(", ")}.`));
  });
  const locIds = new Set();
  (story.locations || []).forEach((l, i) => {
    if (locIds.has(l.id)) out.push(issue("E_REF_DUPLICATE", `locations[${i}].id`, `Location id '${l.id}' is used twice.`, "Give every location a unique id."));
    locIds.add(l.id);
    if (!catalog.themes[l.theme]) {
      const near = closestMatch(l.theme, catalog.themeNames);
      out.push(issue("E_THEME_UNKNOWN", `locations[${i}].theme`, `Unknown theme '${l.theme}'.`, `Use one of: ${catalog.themeNames.join(", ")}${near ? ` (closest: ${near})` : ""}.`));
    }
    (l.set || []).forEach((p, k) => {
      if (!catalog.objects?.[p.object]) out.push(issue("E_OBJECT_UNKNOWN", `locations[${i}].set[${k}].object`, `Unknown object '${p.object}'.`, `Use one of: ${Object.keys(catalog.objects || {}).join(", ")}.`));
    });
  });

  // Beat ids are unique across the story; references stay inside a scene.
  const beatScene = new Map();
  const sceneIds = new Set();
  story.scenes.forEach((scene, si) => {
    if (sceneIds.has(scene.id)) out.push(issue("E_REF_DUPLICATE", `scenes[${si}].id`, `Scene id '${scene.id}' is used twice.`, "Give every scene a unique id."));
    sceneIds.add(scene.id);
    (scene.beats || []).forEach((b, bi) => {
      if (!b.id) return;
      if (beatScene.has(b.id) && beatScene.get(b.id) !== si) {
        out.push(issue("E_REF_DUPLICATE", `scenes[${si}].beats[${bi}].id`, `Beat id '${b.id}' is also used in scene ${beatScene.get(b.id)}.`, "Beat ids must be unique across the whole story."));
      }
      if (!beatScene.has(b.id)) beatScene.set(b.id, si);
    });
  });

  story.scenes.forEach((scene, si) => {
    const pre = `scenes[${si}]`;
    if (scene.macro) {
      out.push(issue("E_MACRO_UNKNOWN", `${pre}.macro`, `The '${scene.macro}' scene macro is not available in this engine version yet.`, "Write the scenes out by hand for now."));
      return;
    }
    const location = resolveLocation(story, scene, catalog);
    if (!location) {
      const near = closestMatch(scene.location, [...locIds, ...catalog.themeNames]);
      out.push(issue("E_LOCATION_UNKNOWN", `${pre}.location`, `No location or theme '${scene.location}'.`, near ? `Did you mean '${near}'?` : `Use a location id (${[...locIds].join(", ") || "none defined"}) or a theme name.`));
      return;
    }
    (scene.set || []).forEach((p, k) => {
      if (!catalog.objects?.[p.object]) out.push(issue("E_OBJECT_UNKNOWN", `${pre}.set[${k}].object`, `Unknown object '${p.object}'.`, `Use one of: ${Object.keys(catalog.objects || {}).join(", ")}.`));
    });
    const placed = new Set();
    (scene.cast || []).forEach((p, k) => {
      if (!castIds.has(p.id)) {
        const near = closestMatch(p.id, [...castIds]);
        out.push(issue("E_CAST_UNKNOWN", `${pre}.cast[${k}].id`, `'${p.id}' is not in the story's cast.`, near ? `Did you mean '${near}'?` : "Add it to 'cast' first."));
      }
      if (placed.has(p.id)) out.push(issue("E_REF_DUPLICATE", `${pre}.cast[${k}].id`, `'${p.id}' is placed twice in scene '${scene.id}'.`, "Place each character once per scene."));
      placed.add(p.id);
    });
    if (!(scene.beats || []).length && scene.duration === undefined) {
      out.push(issue("E_SCENE_EMPTY", pre, `Scene '${scene.id}' has no beats and no duration.`, 'Add beats, or a "duration" for a still scene.'));
    }
    checkTransition(scene.transitionIn, `${pre}.transitionIn`, story, si, out);
    checkTransition(scene.transitionOut, `${pre}.transitionOut`, story, si, out);
    (scene.beats || []).forEach((b, bi) => {
      if (b.macro) out.push(issue("E_MACRO_UNKNOWN", `${pre}.beats[${bi}].macro`, `The '${b.macro}' macro is not available in this engine version yet.`, "Write the beats out by hand for now (the story compiler comes later)."));
    });
    if ((scene.beats || []).some((b) => b.macro)) return;

    // The v1 checks on the scene's flat view.
    const flat = flatScene(story, si, catalog);
    for (const i of checkSemantics(flat, catalog, moves, { worldCommands: WORLD_COMMANDS_V2 })) {
      const mapped = { ...i, path: mapPath(i.path, si, scene) };
      const ref = i.message.match(/^No (?:character|beat with id) '([^']+)'/);
      if (i.code === "E_REF_CHARACTER" && ref && castIds.has(ref[1])) {
        out.push(issue("E_CAST_ABSENT", mapped.path, `'${ref[1]}' is not placed in scene '${scene.id}'.`, `Add {"id": "${ref[1]}", "x": ...} to this scene's cast.`));
      } else if (i.code === "E_REF_BEAT" && ref && beatScene.has(ref[1])) {
        out.push(issue("E_REF_BEAT", mapped.path, `Beat '${ref[1]}' is in another scene; timing references stay inside a scene.`, "Use a number of seconds from this scene's start instead."));
      } else out.push(mapped);
    }
    // Faces come from the catalog; explicit bubble times should leave time to read.
    const faceIssue = (name, path) => {
      if (catalog.faces?.[name]) return;
      const names = Object.keys(catalog.faces || {});
      const near = closestMatch(name, names);
      out.push(issue("E_FACE_UNKNOWN", path, `Unknown face '${name}'.`, `Use one of: ${names.join(", ")}${near ? ` (closest: ${near})` : ""}.`));
    };
    (scene.cast || []).forEach((p, k) => p.face !== undefined && faceIssue(p.face, `${pre}.cast[${k}].face`));
    (scene.beats || []).forEach((b, bi) => {
      if (b.face !== undefined) faceIssue(b.face, `${pre}.beats[${bi}].face`);
      if (b.say && b.sayDur !== undefined && b.sayDur < readingTime(b.say) - 1e-9) {
        out.push(issue("W_DIALOGUE_FAST", `${pre}.beats[${bi}].sayDur`, `"${b.say}" shows for ${b.sayDur}s; it needs about ${readingTime(b.say).toFixed(1)}s to read.`, `Remove "sayDur" (the default is the reading time) or use at least ${readingTime(b.say).toFixed(1)}.`));
      }
    });
    // Audience: soft-listed words in on-screen text.
    (scene.beats || []).forEach((b, bi) => {
      const p = `${pre}.beats[${bi}]`;
      if (b.say) out.push(...softWordIssues(b.say, `${p}.say`, catalog, audience));
      for (const k of ["text", "title", "subtitle"]) if (typeof b.params?.[k] === "string") out.push(...softWordIssues(b.params[k], `${p}.params.${k}`, catalog, audience));
    });
    for (const [k, t] of [["transitionIn", scene.transitionIn], ["transitionOut", scene.transitionOut]]) {
      for (const f of ["title", "subtitle", "text"]) if (t?.[f]) out.push(...softWordIssues(t[f], `${pre}.${k}.${f}`, catalog, audience));
    }
  });
  return out;
}
