// Script validator for kind "video3d" (the 3D twin of engine/validate). Checks the shape of the script and
// every catalog name it uses, so an AI-written script fails here with a path and a code, not in the page.
// Returns { ok, errors, warnings }; each issue is { code, path, message }.

import { EASE_NAMES } from "./ease.js";

const KNOWN_TOP = new Set(["kind", "version", "meta", "stage", "camera", "objects", "scenes", "description"]);
const COMMON = new Set(["id", "kind", "at", "rotation", "scale", "hidden", "description"]);
const FIELDS = {
  shape: ["shape", "color", "material", "size", "face"],
  number_block: ["value", "color", "digitColor", "size"],
  letter: ["text", "color", "material", "font", "size", "depth"],
  character: ["character", "clip"],
  confetti: ["count", "colors", "area", "height"],
  critter: ["species", "color", "size"],
  prop: ["model", "color", "size"],
  bubbles: ["count", "area", "height", "size"],
  stars: ["count", "color", "width"],
};
const TARGETS = { clip: ["character"], burst: ["confetti", "bubbles"], sleep: ["critter", "shape"], wake: ["critter", "shape"] };
const META = new Set(["title", "seed", "voice", "voiceSpeed", "music", "musicGain", "series", "episode", "audience", "skills", "thumbnail", "youtube", "description"]);
const NO_TARGET = new Set(["camera", "say", "caption", "sound"]);

const isVec = (v) => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === "number" && Number.isFinite(x));
const isNum = (v, lo = -Infinity, hi = Infinity) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/**
 * @param {object} script
 * @param {object} catalog  loadCatalog3d() (with characters[].clipDurations when known)
 */
export function validateScript(script, catalog) {
  const errors = [];
  const warnings = [];
  const err = (code, path, message) => errors.push({ code, path, message });
  const warn = (code, path, message) => warnings.push({ code, path, message });
  const name = (table, value, code, path, what) => {
    if (value != null && !table[value]) err(code, path, `unknown ${what} "${value}" (known: ${Object.keys(table).join(", ")})`);
  };

  if (!script || typeof script !== "object") return { ok: false, errors: [{ code: "E3D_NOT_OBJECT", path: "", message: "script must be a JSON object" }], warnings };
  if (script.kind !== "video3d") err("E3D_KIND", "kind", 'kind must be "video3d"');
  if (script.version !== 1) err("E3D_VERSION", "version", "version must be 1");
  for (const k of Object.keys(script)) if (!KNOWN_TOP.has(k)) warn("W3D_UNKNOWN_FIELD", k, `unknown top-level field "${k}"`);

  const meta = script.meta ?? {};
  if (meta.seed != null && !Number.isInteger(meta.seed)) err("E3D_SEED", "meta.seed", "seed must be an integer");
  for (const k of Object.keys(meta)) if (!META.has(k)) warn("W3D_UNKNOWN_FIELD", `meta.${k}`, `unknown meta field "${k}"`);
  if (meta.voiceSpeed != null && !isNum(meta.voiceSpeed, 0.75, 1.3)) err("E3D_RANGE", "meta.voiceSpeed", "voiceSpeed must be 0.75-1.3");
  if (meta.musicGain != null && !isNum(meta.musicGain, 0, 1)) err("E3D_RANGE", "meta.musicGain", "musicGain must be 0-1");
  if (meta.music != null && meta.music !== false && catalog.musicMoods?.length && !catalog.musicMoods.includes(meta.music)) err("E3D_MUSIC", "meta.music", `unknown music mood "${meta.music}" (known: ${catalog.musicMoods.join(", ")})`);
  if (meta.audience != null && !["babies", "prek"].includes(meta.audience)) err("E3D_AUDIENCE", "meta.audience", 'audience must be "babies" or "prek"');
  if (meta.thumbnail != null && !isNum(meta.thumbnail?.t, 0, 3600)) err("E3D_RANGE", "meta.thumbnail.t", "thumbnail.t must be a time in seconds");
  if (meta.voice != null && !catalog.voices.includes(meta.voice)) err("E3D_VOICE", "meta.voice", `unknown voice "${meta.voice}" (known: ${catalog.voices.join(", ")})`);
  if (script.stage?.preset != null) name(catalog.stages, script.stage.preset, "E3D_STAGE", "stage.preset", "stage");
  for (const k of ["position", "lookAt"]) if (script.camera?.[k] != null && !isVec(script.camera[k])) err("E3D_VEC", `camera.${k}`, "must be [x, y, z]");
  if (script.camera?.fov != null && !isNum(script.camera.fov, 10, 120)) err("E3D_RANGE", "camera.fov", "fov must be 10-120");

  // Objects.
  const ids = new Map();
  (Array.isArray(script.objects) ? script.objects : []).forEach((o, i) => {
    const p = `objects[${i}]`;
    if (typeof o?.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(o.id)) return err("E3D_ID", `${p}.id`, "id must be lower_snake_case");
    if (ids.has(o.id) || o.id === "camera") err("E3D_DUP_ID", `${p}.id`, `id "${o.id}" is used twice or reserved`);
    ids.set(o.id, o);
    if (!catalog.kinds[o.kind]) return err("E3D_OBJ_KIND", `${p}.kind`, `unknown kind "${o.kind}" (known: ${Object.keys(catalog.kinds).join(", ")})`);
    for (const k of Object.keys(o)) if (!COMMON.has(k) && !FIELDS[o.kind].includes(k)) warn("W3D_UNKNOWN_FIELD", `${p}.${k}`, `${o.kind} has no field "${k}"`);
    for (const k of ["at", "rotation"]) if (o[k] != null && !isVec(o[k])) err("E3D_VEC", `${p}.${k}`, "must be [x, y, z]");
    if (o.scale != null && !isVec(o.scale) && !isNum(o.scale, 0.01, 100)) err("E3D_VEC", `${p}.scale`, "must be a number or [x, y, z]");
    if (o.size != null && !isNum(o.size, 0.05, 50)) err("E3D_RANGE", `${p}.size`, "size must be 0.05-50");
    name(catalog.colors, o.color, "E3D_COLOR", `${p}.color`, "color");
    name(catalog.colors, o.digitColor, "E3D_COLOR", `${p}.digitColor`, "color");
    name(catalog.materials, o.material, "E3D_MATERIAL", `${p}.material`, "material");
    if (o.kind === "shape") {
      if (o.shape == null) err("E3D_REQUIRED", `${p}.shape`, "shape is required");
      name(catalog.shapes, o.shape, "E3D_SHAPE", `${p}.shape`, "shape");
    }
    if (o.kind === "number_block" && !(Number.isInteger(o.value) && o.value >= 0 && o.value <= 99)) err("E3D_RANGE", `${p}.value`, "value must be an integer 0-99");
    if (o.kind === "letter") {
      if (typeof o.text !== "string" || o.text.length < 1 || o.text.length > 12) err("E3D_TEXT", `${p}.text`, "text must be 1-12 characters");
      name(catalog.fonts, o.font, "E3D_FONT", `${p}.font`, "font");
    }
    if (o.kind === "character") {
      if (!catalog.characters[o.character]) err("E3D_CHARACTER", `${p}.character`, `unknown character "${o.character}"`);
      else if (o.clip != null && !catalog.characters[o.character].clips[o.clip]) err("E3D_CLIP", `${p}.clip`, `${o.character} has no clip "${o.clip}"`);
    }
    if (o.kind === "critter" && !catalog.critters[o.species]) err("E3D_SPECIES", `${p}.species`, `unknown species "${o.species}" (known: ${Object.keys(catalog.critters).join(", ")})`);
    if (o.kind === "prop" && !catalog.props[o.model]) err("E3D_MODEL", `${p}.model`, `unknown prop "${o.model}" (known: ${Object.keys(catalog.props).join(", ")})`);
    if (o.kind === "shape" && o.face != null && typeof o.face !== "boolean") err("E3D_FACE", `${p}.face`, "face must be true or false");
    if (o.kind === "confetti") {
      for (const [j, c] of (o.colors ?? []).entries()) name(catalog.colors, c, "E3D_COLOR", `${p}.colors[${j}]`, "color");
      if (o.count != null && !(Number.isInteger(o.count) && o.count >= 1 && o.count <= 2000)) err("E3D_RANGE", `${p}.count`, "count must be 1-2000");
    }
  });

  // Scenes and beats.
  if (!Array.isArray(script.scenes) || !script.scenes.length) err("E3D_SCENES", "scenes", "scenes must be a non-empty list");
  const lineIds = new Set();
  (Array.isArray(script.scenes) ? script.scenes : []).forEach((s, si) => {
    const sp = `scenes[${si}]`;
    if (typeof s?.id !== "string") err("E3D_ID", `${sp}.id`, "scene id is required");
    if (!Array.isArray(s?.beats) || !s.beats.length) return err("E3D_BEATS", `${sp}.beats`, "beats must be a non-empty list");
    s.beats.forEach((b, bi) => {
      const bp = `${sp}.beats[${bi}]`;
      if (b.dur != null && !isNum(b.dur, 0.1, 60)) err("E3D_RANGE", `${bp}.dur`, "dur must be 0.1-60 s");
      if (!Array.isArray(b.do)) return err("E3D_DO", `${bp}.do`, "do must be a list of actions");
      b.do.forEach((a, ai) => checkAction(a, `${bp}.do[${ai}]`, b));
    });
  });

  function checkAction(a, p, beat) {
    const spec = catalog.actions[a?.do];
    if (!spec) return err("E3D_ACTION", `${p}.do`, `unknown action "${a?.do}" (known: ${Object.keys(catalog.actions).join(", ")})`);
    for (const k of Object.keys(a)) if (k !== "do" && k !== "at" && k !== "id" && !(k in spec.params)) warn("W3D_UNKNOWN_FIELD", `${p}.${k}`, `${a.do} has no parameter "${k}"`);
    if (a.at != null && !isNum(a.at, 0, 60)) err("E3D_RANGE", `${p}.at`, "at must be 0-60 s from the beat start");
    if (a.at != null && beat.dur != null && a.at >= beat.dur && a.do !== "say") warn("W3D_LATE", `${p}.at`, `starts after its beat's ${beat.dur} s`);
    if (a.dur != null && !isNum(a.dur, 0, 60)) err("E3D_RANGE", `${p}.dur`, "dur must be 0-60 s");
    if (a.ease != null && !EASE_NAMES.includes(a.ease)) err("E3D_EASE", `${p}.ease`, `unknown ease "${a.ease}" (known: ${EASE_NAMES.join(", ")})`);
    for (const k of ["to", "position", "lookAt"]) if (a[k] != null && !(a.do === "grow" ? isNum(a[k], 0.01, 100) : isVec(a[k]))) err("E3D_VEC", `${p}.${k}`, a.do === "grow" ? "to must be a scale number" : "must be [x, y, z]");
    if (a.sound != null && a.sound !== false && !catalog.sounds[a.sound]) err("E3D_SOUND", `${p}.sound`, `unknown sound "${a.sound}"`);
    if (NO_TARGET.has(a.do)) {
      if (a.do === "say" || a.do === "caption") {
        if (typeof a.text !== "string" || !a.text.trim()) err("E3D_TEXT", `${p}.text`, `${a.do} needs text`);
        else if (a.do === "caption" && a.text.length > 60) warn("W3D_LONG_CAPTION", `${p}.text`, "captions over 60 characters are hard for kids to read");
      }
      if (a.do === "say" && a.voice != null && !catalog.voices.includes(a.voice)) err("E3D_VOICE", `${p}.voice`, `unknown voice "${a.voice}"`);
      if (a.do === "say" && a.id != null) {
        if (lineIds.has(a.id)) err("E3D_DUP_ID", `${p}.id`, `line id "${a.id}" is used twice`);
        lineIds.add(a.id);
      }
      if (a.do === "sound" && a.sound == null) err("E3D_REQUIRED", `${p}.sound`, "sound is required");
      if (a.do === "camera" && a.position == null && a.lookAt == null && a.fov == null) err("E3D_REQUIRED", p, "camera needs position, lookAt or fov");
      if (a.do === "caption" && a.color != null && !catalog.colors[a.color]) err("E3D_COLOR", `${p}.color`, `unknown color "${a.color}"`);
      if (a.do === "caption" && a.style != null && !["title", "count", "subtitle", "label"].includes(a.style)) err("E3D_STYLE", `${p}.style`, "style must be title, count, label or subtitle");
      return;
    }
    const o = ids.get(a.target);
    if (!o) return err("E3D_TARGET", `${p}.target`, `no object "${a.target}"`);
    if ((a.do === "sleep" || a.do === "wake") && o.kind === "shape" && !o.face) err("E3D_TARGET_KIND", `${p}.target`, `${a.do} needs eyes: "${a.target}" is a shape without face: true`);
    if (TARGETS[a.do] && !TARGETS[a.do].includes(o.kind)) err("E3D_TARGET_KIND", `${p}.target`, `${a.do} needs a ${TARGETS[a.do].join(" or ")}, "${a.target}" is a ${o.kind}`);
    if (a.do === "clip") {
      const ch = catalog.characters[o.character];
      if (ch && !ch.clips[a.clip]) err("E3D_CLIP", `${p}.clip`, `${o.character} has no clip "${a.clip}" (known: ${Object.keys(ch.clips).join(", ")})`);
      if (ch && a.then != null && !ch.clips[a.then]) err("E3D_CLIP", `${p}.then`, `${o.character} has no clip "${a.then}"`);
    }
    if ((a.do === "drop" || a.do === "move") && a.to == null) err("E3D_REQUIRED", `${p}.to`, `${a.do} needs to: [x, y, z]`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
