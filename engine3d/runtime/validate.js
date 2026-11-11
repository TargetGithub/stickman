// Script validator for kind "video3d" (the 3D twin of engine/validate). Checks the shape of the script and
// every catalog name it uses, so an AI-written script fails here with a path and a code, not in the page.
// Returns { ok, errors, warnings }; each issue is { code, path, message }.

import { EASE_NAMES } from "./ease.js";
import { expandObjects, isComposite } from "./composite.js";
import { spokenError } from "./spoken.js";
import { letterPieces } from "./letter_layout.js";
import { LETTER_START_FIELDS, checkStartPose } from "./start_pose.js";
import { checkLetterAction } from "./validate_letters.js";
import { FEELINGS, modelColors, parseClock } from "./director_extras.js";
import { checkThumbnails } from "./thumbnails.js";
import { MOVABLE_PIECES, NUMBER_TO, PIECE_ACTIONS, TEACH_FIELDS, checkTeachAction, checkTeachObject, teachPieces } from "./validate_teach.js";
import { addSetPieces, checkLookCamera, checkWho } from "./validate_look.js";
import { KIT2_FIELDS, checkKit2Object, createKit2Checker } from "./validate_kit2.js";
import { PAINT_KINDS, checkCast, checkLift, checkR3Action } from "./validate_r3.js";
import { RETAIN_FIELDS, checkRetainAction, checkRetainObject, checkRetentionMeta, lintsOn, retentionLints } from "./validate_retain.js";

const KNOWN_TOP = new Set(["kind", "version", "meta", "stage", "camera", "objects", "scenes", "description"]);
const COMMON = new Set(["id", "kind", "at", "rotation", "scale", "hidden", "description", "parent", "part", "pivot", "on", "inherit", "hud", "pose"]);
const FIELDS = {
  shape: ["shape", "color", "material", "size", "face", "feeling", "base"],
  number_block: ["value", "color", "digitColor", "size"],
  letter: ["text", "color", "colors", "material", "font", "size", "depth", "lift", "forms", ...LETTER_START_FIELDS],
  character: ["character", "clip", "feeling"],
  confetti: ["count", "colors", "area", "height"],
  critter: ["species", "color", "size", "feeling", "recolor"],
  prop: ["model", "color", "size", "recolor"],
  bubbles: ["count", "area", "height", "size"],
  stars: ["count", "color", "width"],
  clock: ["time", "size", "color", "face", "numberColor", "hourColor", "minuteColor", "ticks", "numbers", "minuteHand", "font"],
  lamp: ["color", "intensity", "distance", "angle", "soft", "aim", "beam", "shadow"],
  weather: ["type", "count", "area", "height", "speed", "colors"],
  group: [],
  ...TEACH_FIELDS,
  ...KIT2_FIELDS,
  ...RETAIN_FIELDS,
};
const TARGETS = {
  clip: ["character"], burst: ["confetti", "bubbles"], sleep: ["critter", "shape"], wake: ["critter", "shape"],
  feel: ["critter", "shape", "character"], paint: ["shape", "letter", "number_block", "critter", "prop", ...PAINT_KINDS], clock: ["clock"], aim: ["lamp"],
};
// Moves that can target a named part of a critter or prop ("box#lid", "dog#head").
const PART_MOVES = new Set(["turn", "move", "wiggle", "spin"]);
const META = new Set(["title", "seed", "voice", "voiceSpeed", "music", "musicGain", "series", "episode", "audience", "skills", "thumbnail", "thumbnails", "youtube", "description", "cast", "host", "retention"]);
const AUDIENCES = ["babies", "prek", "k", "grade1", "grade2", "grade3", "grade4", "grade5"];
const NO_TARGET = new Set(["camera", "say", "caption", "sound", "lights", "stage", "music", "fog"]);
const WEATHER = ["rain", "snow", "leaves", "petals"];

const isVec = (v) => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === "number" && Number.isFinite(x));
const isNum = (v, lo = -Infinity, hi = Infinity) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/**
 * @param {object} script
 * @param {object} catalog  loadCatalog3d() (with characters[].clipDurations when known)
 * @param {{ retention?: boolean, speech?: object }} [opts]  retention: force the retention lints on or off
 *   (default: on when meta.retention asks or the script uses the retention kit); speech: measured clips for them
 */
export function validateScript(script, catalog, opts = {}) {
  const errors = [];
  const warnings = [];
  const err = (code, path, message) => errors.push({ code, path, message });
  const warn = (code, path, message) => warnings.push({ code, path, message });
  const name = (table, value, code, path, what) => {
    if (value != null && !table[value]) err(code, path, `unknown ${what} "${value}" (known: ${Object.keys(table).join(", ")})`);
  };

  if (!script || typeof script !== "object") return { ok: false, errors: [{ code: "E3D_NOT_OBJECT", path: "", message: "script must be a JSON object" }], warnings };
  // Composite kinds (card, page, board) are checked here, then validated as the plain pieces they expand to.
  if (Array.isArray(script.objects) && script.objects.some(isComposite)) {
    const ex = expandObjects(script.objects, catalog);
    for (const e of ex.errors) (e.warn ? warnings : errors).push({ code: e.code, path: e.path, message: e.message });
    script = { ...script, objects: ex.objects };
  }
  if (script.kind !== "video3d") err("E3D_KIND", "kind", 'kind must be "video3d"');
  if (script.version !== 1) err("E3D_VERSION", "version", "version must be 1");
  for (const k of Object.keys(script)) if (!KNOWN_TOP.has(k)) warn("W3D_UNKNOWN_FIELD", k, `unknown top-level field "${k}"`);

  const meta = script.meta ?? {};
  if (meta.seed != null && !Number.isInteger(meta.seed)) err("E3D_SEED", "meta.seed", "seed must be an integer");
  for (const k of Object.keys(meta)) if (!META.has(k)) warn("W3D_UNKNOWN_FIELD", `meta.${k}`, `unknown meta field "${k}"`);
  if (meta.voiceSpeed != null && !isNum(meta.voiceSpeed, 0.75, 1.3)) err("E3D_RANGE", "meta.voiceSpeed", "voiceSpeed must be 0.75-1.3");
  if (meta.musicGain != null && !isNum(meta.musicGain, 0, 1)) err("E3D_RANGE", "meta.musicGain", "musicGain must be 0-1");
  if (meta.music != null && meta.music !== false && catalog.musicMoods?.length && !catalog.musicMoods.includes(meta.music)) err("E3D_MUSIC", "meta.music", `unknown music mood "${meta.music}" (known: ${catalog.musicMoods.join(", ")})`);
  if (meta.audience != null && !AUDIENCES.includes(meta.audience)) err("E3D_AUDIENCE", "meta.audience", `audience must be one of ${AUDIENCES.join(", ")}`);
  if (meta.thumbnail != null) checkThumbnail(meta.thumbnail);
  checkRetentionMeta(meta.retention, err);
  if (meta.thumbnails != null) {
    const t = checkThumbnails(meta.thumbnails, script, catalog, validateScript); // designed thumbnails (runtime/thumbnails.js)
    errors.push(...t.errors);
    warnings.push(...t.warnings);
  }
  if (meta.voice != null && !catalog.voices.includes(meta.voice)) err("E3D_VOICE", "meta.voice", `unknown voice "${meta.voice}" (known: ${catalog.voices.join(", ")})`);
  if (script.stage?.preset != null) name(catalog.stages, script.stage.preset, "E3D_STAGE", "stage.preset", "stage");
  for (const k of ["position", "lookAt"]) if (script.camera?.[k] != null && !isVec(script.camera[k])) err("E3D_VEC", `camera.${k}`, "must be [x, y, z]");
  if (script.camera?.fov != null && !isNum(script.camera.fov, 10, 120)) err("E3D_RANGE", "camera.fov", "fov must be 10-120");

  // Objects.
  const ids = new Map();
  addSetPieces(script, catalog, ids, err);
  (Array.isArray(script.objects) ? script.objects : []).forEach((o, i) => {
    const p = `objects[${i}]`;
    if (typeof o?.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(o.id)) return err("E3D_ID", `${p}.id`, "id must be lower_snake_case");
    if (ids.has(o.id) || o.id === "camera" || o.id === "stage") err("E3D_DUP_ID", `${p}.id`, `id "${o.id}" is used twice or reserved`);
    if (o.parent != null) {
      const par = ids.get(o.parent);
      if (!par) err("E3D_PARENT", `${p}.parent`, `parent "${o.parent}" must be an object listed before "${o.id}"`);
      else if (o.part != null && !partNames(par).includes(o.part)) err("E3D_PART", `${p}.part`, `"${o.parent}" has no named part "${o.part}" (known: ${partNames(par).join(", ") || "none"})`);
      // On a part, at is measured from the part's pivot (a head's centre) in the parent's own units (times its
      // size): a toy is about 1.1 units tall, so an offset of 1.5 or more is almost always a world position.
      else if (o.part != null && isVec(o.at) && Math.hypot(...o.at) >= 1.5) warn("W3D_PART_FAR", `${p}.at`, `at is relative to "${o.parent}#${o.part}" (its pivot, in "${o.parent}"'s units), not a world position`);
    } else if (o.part != null) err("E3D_PART", `${p}.part`, "part needs a parent");
    // hud: drawn in screen space over the 3D picture (stage.js createHud); a child shares its parent's layer.
    if (o.hud != null && typeof o.hud !== "boolean") err("E3D_HUD", `${p}.hud`, "hud must be true or false");
    if (o.parent != null && ids.get(o.parent) && !!ids.get(o.parent).hud !== !!o.hud) err("E3D_HUD", `${p}.hud`, `"${o.id}" and its parent "${o.parent}" must both be on the HUD or both in the scene`);
    if (o.pivot != null && !isVec(o.pivot)) err("E3D_VEC", `${p}.pivot`, "must be [x, y, z]");
    ids.set(o.id, o);
    if (!catalog.kinds[o.kind]) return err("E3D_OBJ_KIND", `${p}.kind`, `unknown kind "${o.kind}" (known: ${Object.keys(catalog.kinds).join(", ")})`);
    for (const k of Object.keys(o)) if (!COMMON.has(k) && !FIELDS[o.kind].includes(k)) warn("W3D_UNKNOWN_FIELD", `${p}.${k}`, `${o.kind} has no field "${k}"`);
    for (const k of ["at", "rotation"]) if (o[k] != null && !isVec(o[k])) err("E3D_VEC", `${p}.${k}`, "must be [x, y, z]");
    checkStartPose(o, p, { err, partNames });
    if (o.base != null && typeof o.base !== "boolean") err("E3D_RANGE", `${p}.base`, "base must be true or false");
    if (o.scale != null && !isVec(o.scale) && !isNum(o.scale, 0.01, 100)) err("E3D_VEC", `${p}.scale`, "must be a number or [x, y, z]");
    if (o.size != null && !isNum(o.size, 0.05, 50)) err("E3D_RANGE", `${p}.size`, "size must be 0.05-50");
    name(catalog.colors, o.color, "E3D_COLOR", `${p}.color`, "color");
    name(catalog.colors, o.digitColor, "E3D_COLOR", `${p}.digitColor`, "color");
    name(catalog.materials, o.material, "E3D_MATERIAL", `${p}.material`, "material");
    if (o.kind === "shape") {
      if (o.shape == null) err("E3D_REQUIRED", `${p}.shape`, "shape is required");
      name(catalog.shapes, o.shape, "E3D_SHAPE", `${p}.shape`, "shape");
    }
    if (o.kind === "number_block" && !(Number.isInteger(o.value) && o.value >= 0 && o.value <= 999)) err("E3D_RANGE", `${p}.value`, "value must be an integer 0-999");
    if (o.feeling != null && !FEELINGS.includes(o.feeling)) err("E3D_FEELING", `${p}.feeling`, `feeling must be one of ${FEELINGS.join(", ")}`);
    if (o.kind === "clock" && o.time != null && !clockOk(o.time)) err("E3D_TIME", `${p}.time`, 'time must look like "3:25" (hours 1-12)');
    for (const k of ["face", "numberColor", "hourColor", "minuteColor", "ticks"]) if (o.kind === "clock") name(catalog.colors, o[k], "E3D_COLOR", `${p}.${k}`, "color");
    if (o.kind === "lamp" && o.aim != null && !isVec(o.aim)) err("E3D_VEC", `${p}.aim`, "must be [x, y, z]");
    if (o.kind === "weather") {
      if (o.type != null && !WEATHER.includes(o.type)) err("E3D_WEATHER", `${p}.type`, `type must be one of ${WEATHER.join(", ")}`);
      for (const [j, c] of (o.colors ?? []).entries()) name(catalog.colors, c, "E3D_COLOR", `${p}.colors[${j}]`, "color");
    }
    if (o.kind === "letter") {
      if (typeof o.text !== "string" || o.text.length < 1 || o.text.length > 24) err("E3D_TEXT", `${p}.text`, "text must be 1-24 characters");
      name(catalog.fonts, o.font, "E3D_FONT", `${p}.font`, "font");
      if (o.forms != null && !["school", "book"].includes(o.forms)) err("E3D_FORMS", `${p}.forms`, 'forms must be "school" (single-storey a and g, the default) or "book" (two-storey a and g)');
      else if (o.forms === "book" && !catalog.fontBook?.[o.font ?? "andika_bold"]) err("E3D_FORMS", `${p}.forms`, `font "${o.font}" has no book forms`);
    }
    if (o.kind === "character") {
      if (!catalog.characters[o.character]) err("E3D_CHARACTER", `${p}.character`, `unknown character "${o.character}"`);
      else if (o.clip != null && !catalog.characters[o.character].clips[o.clip]) err("E3D_CLIP", `${p}.clip`, `${o.character} has no clip "${o.clip}"`);
    }
    if (o.kind === "critter" && !catalog.critters[o.species]) err("E3D_SPECIES", `${p}.species`, `unknown species "${o.species}" (known: ${Object.keys(catalog.critters).join(", ")})`);
    if (o.kind === "prop" && !catalog.props[o.model]) err("E3D_MODEL", `${p}.model`, `unknown prop "${o.model}" (known: ${Object.keys(catalog.props).join(", ")})`);
    if (o.recolor != null) checkRecolor(o, p);
    checkTeachObject(o, p, { err, warn, ids, catalog, name });
    checkKit2Object(o, p, { err, warn, ids, catalog, name });
    checkRetainObject(o, p, { err, warn, name: (c) => name(catalog.colors, c, "E3D_COLOR", p, "color") });
    checkLift(o, p, err);
    if (o.kind === "shape" && o.face != null && typeof o.face !== "boolean") err("E3D_FACE", `${p}.face`, "face must be true or false");
    if (o.kind === "confetti") {
      for (const [j, c] of (o.colors ?? []).entries()) name(catalog.colors, c, "E3D_COLOR", `${p}.colors[${j}]`, "color");
      if (o.count != null && !(Number.isInteger(o.count) && o.count >= 1 && o.count <= 2000)) err("E3D_RANGE", `${p}.count`, "count must be 1-2000");
    }
  });

  checkCast(meta, { err, warn, ids, catalog }); // character voices name objects

  // Scenes and beats.
  if (!Array.isArray(script.scenes) || !script.scenes.length) err("E3D_SCENES", "scenes", "scenes must be a non-empty list");
  const lineIds = new Set();
  const kit2 = createKit2Checker({ err, ids, catalog, partNames, texts: retextTexts(script, ids) });
  const progress = new Map(); // tracker id → steps filled so far, in script order
  (Array.isArray(script.scenes) ? script.scenes : []).forEach((s, si) => {
    const sp = `scenes[${si}]`;
    if (typeof s?.id !== "string") err("E3D_ID", `${sp}.id`, "scene id is required");
    if (!Array.isArray(s?.beats) || !s.beats.length) return err("E3D_BEATS", `${sp}.beats`, "beats must be a non-empty list");
    s.beats.forEach((b, bi) => {
      const bp = `${sp}.beats[${bi}]`;
      if (b.dur != null && b.dur !== "fit" && !isNum(b.dur, 0.1, 60)) err("E3D_RANGE", `${bp}.dur`, 'dur must be 0.1-60 s, or "fit" (until its last action ends)');
      if (!Array.isArray(b.do)) return err("E3D_DO", `${bp}.do`, "do must be a list of actions");
      b.do.forEach((a, ai) => checkAction(a, `${bp}.do[${ai}]`, b));
    });
  });

  function checkAction(a, p, beat) {
    const spec = catalog.actions[a?.do];
    if (!spec) return err("E3D_ACTION", `${p}.do`, `unknown action "${a?.do}" (known: ${Object.keys(catalog.actions).join(", ")})`);
    for (const k of Object.keys(a)) if (k !== "do" && k !== "at" && k !== "id" && !(k in spec.params)) warn("W3D_UNKNOWN_FIELD", `${p}.${k}`, `${a.do} has no parameter "${k}"`);
    // look's at may name what to look at; a say's at may be "after" (queued after the beat's previous line).
    const timed = (a.do !== "look" || typeof a.at === "number") && !(a.do === "say" && a.at === "after");
    if (a.at != null && timed && !isNum(a.at, 0, 60)) err("E3D_RANGE", `${p}.at`, "at must be 0-60 s from the beat start");
    if (a.at != null && timed && typeof beat.dur === "number" && a.at >= beat.dur && a.do !== "say") warn("W3D_LATE", `${p}.at`, `starts after its beat's ${beat.dur} s`);
    if (a.dur != null && !isNum(a.dur, 0, 60)) err("E3D_RANGE", `${p}.dur`, "dur must be 0-60 s");
    if (a.ease != null && !EASE_NAMES.includes(a.ease)) err("E3D_EASE", `${p}.ease`, `unknown ease "${a.ease}" (known: ${EASE_NAMES.join(", ")})`);
    if (checkR3Action(a, p, { err, warn, ids, catalog })) return; // stage, voices, shot pad, paint from on fractions
    if (checkLookCamera(a, p, ids, err)) return;
    if (kit2(a, p)) return; // shift, set, emphasize, reparent, point (validate_kit2.js)
    if (checkRetainAction(a, p, { err, ids, catalog, progress })) return; // the retention kit (validate_retain.js)
    for (const k of ["to", "position", "lookAt"]) {
      if (a[k] == null || a.do === "clock" || NUMBER_TO.has(a.do)) continue;
      const ok = a.do === "grow" ? isNum(a[k], 0.01, 100) || (isVec(a[k]) && a[k].every((x) => x >= 0.001)) : isVec(a[k]);
      if (!ok) err("E3D_VEC", `${p}.${k}`, a.do === "grow" ? "to must be a scale number or [x, y, z] factors" : "must be [x, y, z]");
    }
    if (a.sound != null && a.sound !== false && !catalog.sounds[a.sound]) err("E3D_SOUND", `${p}.sound`, `unknown sound "${a.sound}"`);
    if (a.do === "fog") {
      if (a.amount != null && !isNum(a.amount, 0, 1)) err("E3D_RANGE", `${p}.amount`, "amount must be 0 (clear) to 1 (thick)");
      name(catalog.colors, a.color, "E3D_COLOR", `${p}.color`, "color");
    }
    if (NO_TARGET.has(a.do)) {
      if (a.do === "say" || a.do === "caption") {
        if (typeof a.text !== "string" || !a.text.trim()) err("E3D_TEXT", `${p}.text`, `${a.do} needs text`);
        else if (a.do === "caption" && a.text.length > 60) warn("W3D_LONG_CAPTION", `${p}.text`, "captions over 60 characters are hard for kids to read");
      }
      if (a.do === "say") checkWho(a, p, ids, err);
      if (a.do === "say" && a.spoken != null) {
        // spoken: what Piper reads instead of text (the caption): a respelling ("kay bull") or IPA in [[ ]].
        const why = spokenError(a.spoken);
        if (why) err("E3D_SPOKEN", `${p}.spoken`, why);
      }
      if (a.do === "say" && a.voice != null && !catalog.voices.includes(a.voice)) err("E3D_VOICE", `${p}.voice`, `unknown voice "${a.voice}"`);
      if (a.do === "say" && a.id != null) {
        if (lineIds.has(a.id)) err("E3D_DUP_ID", `${p}.id`, `line id "${a.id}" is used twice`);
        lineIds.add(a.id);
      }
      if (a.do === "sound" && a.sound == null) err("E3D_REQUIRED", `${p}.sound`, "sound is required");
      if (a.do === "sound" && (a.voice != null || a.who != null || a.pitch != null)) {
        if (a.sound != null && catalog.sounds[a.sound]?.ipa == null) warn("W3D_SOUND_VOICE", `${p}.voice`, `only letter sounds (ph_...) have voices; "${a.sound}" plays as it is`);
        if (a.voice != null && (!catalog.voices.includes(a.voice) || a.voice === "narrator")) err("E3D_VOICE", `${p}.voice`, `unknown voice "${a.voice}"`);
        if (a.pitch != null && !isNum(a.pitch, 0.8, 1.3)) err("E3D_RANGE", `${p}.pitch`, "pitch must be 0.8-1.3");
        if (a.who != null && !ids.has(a.who)) err("E3D_TARGET", `${p}.who`, `no object "${a.who}"`);
      }
      if (a.do === "camera" && a.position == null && a.lookAt == null && a.fov == null) err("E3D_REQUIRED", p, "camera needs position, lookAt or fov");
      if (a.do === "caption" && a.color != null && !catalog.colors[a.color]) err("E3D_COLOR", `${p}.color`, `unknown color "${a.color}"`);
      if (a.do === "lights") {
        name(catalog.lights, a.rig, "E3D_LIGHTS", `${p}.rig`, "light rig");
        for (const k of ["background", "floor", "rug"]) name(catalog.colors, a[k], "E3D_COLOR", `${p}.${k}`, "color");
        if (a.rig == null && a.background == null && a.floor == null && a.rug == null) err("E3D_REQUIRED", p, "lights needs rig, background, floor or rug");
      }
      if (a.do === "caption" && a.style != null && !["title", "count", "subtitle", "shout", "label", "intertitle", "chapter"].includes(a.style)) err("E3D_STYLE", `${p}.style`, "style must be title, count, label, subtitle, shout, intertitle or chapter");
      return;
    }
    if (typeof a.target === "string" && a.target.includes("#")) {
      const [base, part] = a.target.split("#");
      const owner = ids.get(base);
      if (!owner) return err("E3D_TARGET", `${p}.target`, `no object "${base}"`);
      // A letter word's characters also take hop, grow and paint (one vowel team bounces or turns gold).
      const letterOnly = owner.kind === "letter" && ["hop", "grow", "paint"].includes(a.do);
      if (!letterOnly && !PART_MOVES.has(a.do) && !PIECE_ACTIONS.has(a.do)) return err("E3D_TARGET_KIND", `${p}.target`, `${a.do} cannot target a part (parts take ${[...PART_MOVES, ...PIECE_ACTIONS].join(", ")}; letter pieces also hop, grow, paint)`);
      if (a.do === "paint" && !catalog.colors[a.color]) err("E3D_COLOR", `${p}.color`, `paint needs a known color, got "${a.color}"`);
      if (!partNames(owner).includes(part)) return err("E3D_PART", `${p}.target`, `"${base}" has no named part "${part}" (known: ${partNames(owner).join(", ") || "none"})`);
      if (PART_MOVES.has(a.do) && teachPieces(owner).length && !MOVABLE_PIECES.has(owner.kind)) return err("E3D_TARGET_KIND", `${p}.target`, `${a.do} cannot move a piece of a ${owner.kind} (only fraction bar parts and circle slices move)`);
      if (a.do === "move" && a.to == null) err("E3D_REQUIRED", `${p}.to`, "move needs to: [x, y, z]");
      if (a.do === "mark" && a.result != null && a.result !== "correct" && a.result !== "incorrect") err("E3D_RESULT", `${p}.result`, 'result must be "correct" or "incorrect"');
      return;
    }
    const o = ids.get(a.target);
    if (!o) return err("E3D_TARGET", `${p}.target`, `no object "${a.target}"`);
    if (a.do === "feel" && !FEELINGS.includes(a.feeling)) err("E3D_FEELING", `${p}.feeling`, `feeling must be one of ${FEELINGS.join(", ")}`);
    if (a.do === "feel" && o.kind === "shape" && !o.face) err("E3D_TARGET_KIND", `${p}.target`, `feel needs a face: "${a.target}" is a shape without face: true`);
    if (a.do === "paint" && !catalog.colors[a.color]) err("E3D_COLOR", `${p}.color`, `paint needs a known color, got "${a.color}"`);
    if (a.do === "paint" && a.from != null) {
      if (o.kind === "fraction_bar" || o.kind === "fraction_circle") {
        // validate_r3.js: its colour or its empty colour
      } else if (o.kind !== "critter" && o.kind !== "prop") err("E3D_TARGET_KIND", `${p}.from`, `paint from needs a critter or prop, "${a.target}" is a ${o.kind}`);
      else if (!catalog.colors[a.from]) err("E3D_COLOR", `${p}.from`, `unknown color "${a.from}"`);
      else if (!modelColors(o, catalog).includes(a.from)) err("E3D_PAINT_FROM", `${p}.from`, `"${a.target}" has no parts coloured "${a.from}" (it uses ${modelColors(o, catalog).join(", ")})`);
    }
    if (a.do === "clock" && a.to == null && a.minuteHand == null) err("E3D_REQUIRED", p, "clock needs to (a time) or minuteHand");
    if (a.do === "clock" && a.to != null && !clockOk(a.to)) err("E3D_TIME", `${p}.to`, 'to must look like "3:25" (hours 1-12)');
    if (a.do === "aim" && !isVec(a.to)) err("E3D_VEC", `${p}.to`, "aim needs to: [x, y, z]");
    if (a.do === "path" && !(Array.isArray(a.points) && a.points.length && a.points.every(isVec))) err("E3D_VEC", `${p}.points`, "path needs points: a list of [x, y, z]");
    if ((a.do === "sleep" || a.do === "wake") && o.kind === "shape" && !o.face) err("E3D_TARGET_KIND", `${p}.target`, `${a.do} needs eyes: "${a.target}" is a shape without face: true`);
    if (TARGETS[a.do] && !TARGETS[a.do].includes(o.kind)) err("E3D_TARGET_KIND", `${p}.target`, `${a.do} needs a ${TARGETS[a.do].join(" or ")}, "${a.target}" is a ${o.kind}`);
    if (a.do === "clip") {
      const ch = catalog.characters[o.character];
      if (ch && !ch.clips[a.clip]) err("E3D_CLIP", `${p}.clip`, `${o.character} has no clip "${a.clip}" (known: ${Object.keys(ch.clips).join(", ")})`);
      if (ch && a.then != null && !ch.clips[a.then]) err("E3D_CLIP", `${p}.then`, `${o.character} has no clip "${a.then}"`);
    }
    checkTeachAction(a, p, o, { err, ids, catalog });
    if ((a.do === "drop" || a.do === "move" || a.do === "roll") && a.to == null) err("E3D_REQUIRED", `${p}.to`, `${a.do} needs to: [x, y, z]`);
    checkLetterAction(a, p, o, { err, ids, catalog, name }); // vowel_mark, stress, turn_page, retext, split
    if (a.do === "lie" && a.pose != null && !["side", "back", "up"].includes(a.pose)) err("E3D_LIE", `${p}.pose`, "pose must be side, back or up");
    if (a.do === "lie" && a.side != null && a.side !== 1 && a.side !== -1) err("E3D_LIE", `${p}.side`, "side must be 1 (head to the left) or -1");
    if (a.do === "roll" && a.radius != null && !isNum(a.radius, 0.01, 20)) err("E3D_RANGE", `${p}.radius`, "radius must be 0.01-20 m");
  }

  if (errors.length === 0 && lintsOn(script, opts.retention)) warnings.push(...retentionLints(script, catalog, { speech: opts.speech }));
  return { ok: errors.length === 0, errors, warnings };

  /** recolor: { "<colour a part uses>": "<new colour>" }, both catalog colour names. */
  function checkRecolor(o, p) {
    if (o.kind !== "critter" && o.kind !== "prop") return;
    if (typeof o.recolor !== "object" || Array.isArray(o.recolor)) return err("E3D_RECOLOR", `${p}.recolor`, 'recolor must map colour names to colour names, e.g. { "leaf": "brown" }');
    const used = modelColors({ ...o, recolor: undefined }, catalog);
    for (const [from, to] of Object.entries(o.recolor)) {
      name(catalog.colors, from, "E3D_COLOR", `${p}.recolor`, "color");
      name(catalog.colors, to, "E3D_COLOR", `${p}.recolor.${from}`, "color");
      if (catalog.colors[from] && !used.includes(from)) warn("W3D_RECOLOR_UNUSED", `${p}.recolor.${from}`, `"${o.id}" has no parts coloured "${from}" (it uses ${used.join(", ")})`);
    }
  }

  /** thumbnail: { t: seconds } or { scene: "<scene id>", at: seconds into that scene }. */
  function checkThumbnail(th) {
    if (th?.scene != null) {
      const scenes = Array.isArray(script.scenes) ? script.scenes : [];
      if (!scenes.some((s) => s?.id === th.scene)) err("E3D_THUMBNAIL", "meta.thumbnail.scene", `no scene "${th.scene}"`);
      if (th.at != null && !isNum(th.at, 0, 3600)) err("E3D_RANGE", "meta.thumbnail.at", "thumbnail.at must be seconds into the scene");
      if (th.t != null) warn("W3D_THUMBNAIL", "meta.thumbnail.t", "thumbnail has both scene and t: scene wins");
    } else if (!isNum(th?.t, 0, 3600)) err("E3D_RANGE", "meta.thumbnail.t", "thumbnail needs t (seconds) or scene (a scene id) with at");
  }

  /** Every text a retext gives a word or text card (a card's goes to its <id>_text): emphasize may mark any of them. */
  function retextTexts(sc, all) {
    const m = new Map();
    for (const s of Array.isArray(sc.scenes) ? sc.scenes : []) for (const b of s?.beats ?? []) for (const a of Array.isArray(b?.do) ? b.do : []) {
      if (a?.do !== "retext" || typeof a.text !== "string") continue;
      const id = all.get(a.target)?.kind === "group" ? `${a.target}_text` : a.target;
      m.set(id, [...(m.get(id) ?? []), a.text]);
    }
    return m;
  }
  function partNames(o) {
    const m = o.kind === "critter" ? catalog.critters[o.species] : o.kind === "prop" ? catalog.props[o.model] : null;
    if (o.kind === "letter") return letterPieces(o); // a word's characters c1..cN, spaces too
    return m ? ["head", "body", ...m.parts.filter((x) => x.name).map((x) => x.name)] : teachPieces(o);
  }
}

function clockOk(text) {
  try {
    parseClock(text);
    return true;
  } catch {
    return false;
  }
}
