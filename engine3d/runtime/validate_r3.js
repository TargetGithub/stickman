// Validator checks for the round 3 options: character voices (meta.cast, say pitch and speed), the `stage`
// action (a mid-episode stage change), shot's pad, letter lift and paint on teaching-kit kinds. validate.js
// calls these. Pure.

import { PAINT_KIT } from "./director_extras.js";
import { canTalk } from "./validate_look.js";
import { rectCells, withDefaults } from "./teach_layout.js";
import { countSyllables, parseTune, TEMPO_RANGE, TUNE_PATCHES } from "./tune.js";

/** shot fit: "exact" uses thin shapes' real heights and every turn. */
export const FITS = ["approx", "exact"];
/** caption pos (runtime/overlay.js CAPTION_POS). */
export const CAPTION_POS = ["left", "right", "top"];

const isNum = (v, lo = -Infinity, hi = Infinity) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** Ranges of a character's voice settings (meta.cast and say). */
export const VOICE_RANGE = { pitch: [0.8, 1.3], speed: [0.8, 1.2] };
const CAST_FIELDS = new Set(["voice", "pitch", "speed", "description"]);
/** Letter lifts: "descender" stands the text on its lowest point. */
export const LIFTS = ["descender"];

/** pitch and speed on a cast entry or a say. */
function checkVoiceNums(v, p, err) {
  for (const [k, [lo, hi]] of Object.entries(VOICE_RANGE)) if (v[k] != null && !isNum(v[k], lo, hi)) err("E3D_RANGE", `${p}.${k}`, `${k} must be ${lo}-${hi}`);
}

/**
 * meta.cast: { "<object id>": { voice, pitch, speed } }, one entry per speaking character.
 * @param {{ err, warn, ids: Map, catalog }} k
 */
export function checkCast(meta, { err, warn, ids, catalog }) {
  // meta.host: who speaks the lines without `who` (an id that can talk, or null for the narrator voice).
  if (meta?.host != null) {
    const h = ids.get(meta.host);
    if (typeof meta.host !== "string" || !h) err("E3D_CAST", "meta.host", `host must be the id of an object listed in objects (or null), not ${JSON.stringify(meta.host)}`);
    else if (!canTalk(h)) err("E3D_CAST", "meta.host", `"${meta.host}" is a ${h.kind}: only things that can speak can host`);
  }
  const cast = meta?.cast;
  if (cast == null) return;
  if (typeof cast !== "object" || Array.isArray(cast)) return err("E3D_CAST", "meta.cast", 'cast must map object ids to voices, e.g. { "bunny": { "voice": "soft", "pitch": 1.25 } }');
  for (const [id, v] of Object.entries(cast)) {
    const p = `meta.cast.${id}`;
    const o = ids.get(id);
    if (!o) err("E3D_CAST", p, `no object "${id}" to give a voice`);
    else if (!canTalk(o)) err("E3D_CAST", p, `"${id}" is a ${o.kind}: only things that can speak (who) take a voice`);
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      err("E3D_CAST", p, "a cast entry is { voice, pitch, speed }");
      continue;
    }
    for (const k of Object.keys(v)) if (!CAST_FIELDS.has(k)) warn("W3D_UNKNOWN_FIELD", `${p}.${k}`, `cast entries take voice, pitch and speed, not "${k}"`);
    if (v.voice != null && !catalog.voices.includes(v.voice)) err("E3D_VOICE", `${p}.voice`, `unknown voice "${v.voice}" (known: ${catalog.voices.join(", ")})`);
    checkVoiceNums(v, p, err);
  }
}

/** A sung line's tune, sing, tunePatch and tuneGain (runtime/tune.js). */
function checkTune(a, p, { err, warn }) {
  if (a.tune == null) {
    for (const k of ["sing", "tunePatch", "tuneGain", "tempo", "rhythm"]) if (a[k] != null) err("E3D_TUNE", `${p}.${k}`, `${k} goes with tune`);
    return;
  }
  const { notes, bad } = typeof a.tune === "string" ? parseTune(a.tune) : { notes: [], bad: [String(a.tune)] };
  if (bad.length) err("E3D_TUNE", `${p}.tune`, `not notes: ${bad.slice(0, 4).join(", ")} (write note names like C4, F#4, Bb3 between C2 and C7, with :beats 0.25-8 for longer or shorter notes: D4:2)`);
  else if (!notes.length) err("E3D_TUNE", `${p}.tune`, "a tune needs at least one note");
  else {
    const syl = countSyllables(a.text ?? "");
    if (Math.abs(syl - notes.length) > 1) warn("W3D_TUNE_SYLLABLES", `${p}.tune`, `${notes.length} notes for about ${syl} syllables in "${a.text}": one note per syllable`);
  }
  if (a.sing != null && a.sing !== true && a.sing !== false && !isNum(a.sing, 0.3, 1)) err("E3D_RANGE", `${p}.sing`, "sing must be true or 0.3-1");
  if (a.tunePatch != null && !TUNE_PATCHES.includes(a.tunePatch)) err("E3D_TUNE", `${p}.tunePatch`, `tunePatch must be one of ${TUNE_PATCHES.join(", ")}`);
  if (a.tuneGain != null && !isNum(a.tuneGain, 0, 1)) err("E3D_RANGE", `${p}.tuneGain`, "tuneGain must be 0-1");
  if (a.tempo != null && !isNum(a.tempo, ...TEMPO_RANGE)) err("E3D_RANGE", `${p}.tempo`, `tempo must be ${TEMPO_RANGE.join("-")} beats a minute`);
  if (a.rhythm != null && typeof a.rhythm !== "boolean") err("E3D_TUNE", `${p}.rhythm`, "rhythm must be true or false");
}

/**
 * Round 3 action checks. Returns true when validate.js should skip its own target checks (stage has none).
 * @param {{ err, ids: Map, catalog }} k
 */
export function checkR3Action(a, p, { err, warn = () => {}, ids, catalog }) {
  if (a.do === "say") {
    checkVoiceNums(a, p, err);
    checkTune(a, p, { err, warn });
  }
  if (a.do === "shot") for (const id of [a.target].flat()) if (ids.get(id)?.hud) err("E3D_HUD", `${p}.target`, `"${id}" is on the HUD (screen space): the camera cannot frame it`);
  if (a.do === "shot" && a.pad != null && !isNum(a.pad, 0, 2)) err("E3D_RANGE", `${p}.pad`, "pad must be 0-2 (0.2: a 20% bigger box)");
  if (a.do === "shot" && a.fit != null && !FITS.includes(a.fit)) err("E3D_FIT", `${p}.fit`, `fit must be ${FITS.join(" or ")}`);
  if (a.do === "caption" && a.pos != null && !CAPTION_POS.includes(a.pos)) err("E3D_POS", `${p}.pos`, `pos must be ${CAPTION_POS.join(", ")}`);
  if (a.do === "music") {
    if (a.intensity != null && !isNum(a.intensity, 0, 1)) err("E3D_RANGE", `${p}.intensity`, "intensity must be 0 (calm, sparse) to 1 (lively, full)");
    if (a.gain == null ? a.intensity == null : !isNum(a.gain, 0, 1)) err(a.gain == null ? "E3D_REQUIRED" : "E3D_RANGE", `${p}.gain`, "music needs gain: 0-1 (times the scene's level; 1 brings it back), or intensity");
    return true;
  }
  if (a.do === "shade" && a.rect != null) {
    const o = ids.get(a.target);
    if (o && o.kind !== "grid" && o.kind !== "array") err("E3D_TARGET_KIND", `${p}.rect`, `rect shades a block of a grid or array, "${a.target}" is a ${o.kind}`);
    else if (o && !rectCells(withDefaults(o), a.rect)) err("E3D_CELLS", `${p}.rect`, `rect must be [row, col, rows, cols] (from 1) inside the ${withDefaults(o).rows} x ${withDefaults(o).cols} ${o.kind}`);
    if (a.cells != null || a.to != null) err("E3D_CELLS", `${p}.rect`, "shade takes one of to, cells or rect");
  }
  if ((a.do === "open" || a.do === "close") && typeof a.target === "string") {
    // A prop's door, lid or gate (#119): it needs one of those named parts.
    const [base, part] = a.target.split("#");
    const o = ids.get(base);
    if (o?.kind === "prop") {
      const names = (catalog.props[o.model]?.parts ?? []).map((q) => q.name).filter((n) => /^(door|lid|flap|gate)(_|$)/.test(n ?? ""));
      if (!names.length || (part && !names.includes(part))) err("E3D_TARGET_KIND", `${p}.target`, `"${a.target}" has no door, lid or gate to ${a.do}`);
      if (a.to != null && !(Array.isArray(a.to) && a.to.length === 3 && a.to.every(Number.isFinite))) err("E3D_VEC", `${p}.to`, "to (for a prop) is the part's turn [x, y, z] in degrees");
      return true;
    }
    if (a.do === "close") return err("E3D_TARGET_KIND", `${p}.target`, `close needs a prop with a door, lid or gate`), true;
  }
  if (a.do === "fade" && a.to != null && !isNum(a.to, 0, 1)) err("E3D_RANGE", `${p}.to`, "fade to must be 0 (gone) to 1 (solid)");
  if (a.do === "fade") return true;
  if (a.do === "slump" && a.deg != null && !isNum(a.deg, 0, 60)) err("E3D_RANGE", `${p}.deg`, "deg must be 0-60");
  if (a.do === "fill_box") {
    if (!ids.has(`${a.target}_t1`) || !ids.has(`${a.target}_b1`)) err("E3D_TARGET_KIND", `${p}.target`, `fill_box needs a sound_boxes object, "${a.target}" is not one`);
    else if (!a.clear && !(Number.isInteger(a.box ?? 1) && ids.has(`${a.target}_t${a.box ?? 1}`))) err("E3D_RANGE", `${p}.box`, `"${a.target}" has no box ${a.box}`);
    return true;
  }
  if (a.do === "conga") {
    if (!Array.isArray(a.targets) || !a.targets.length || a.targets.some((id) => !ids.has(id))) err("E3D_TARGET", `${p}.targets`, "conga needs targets: a list of object ids (the first leads)");
    if (!Array.isArray(a.points) || !a.points.length || a.points.some((q) => !(Array.isArray(q) && q.length === 3 && q.every(Number.isFinite)))) err("E3D_VEC", `${p}.points`, "conga needs points: [[x, y, z], ...] the leader dances to");
    if (a.beat != null && !isNum(a.beat, 0.2, 2)) err("E3D_RANGE", `${p}.beat`, "beat must be 0.2-2 s a step");
    return true;
  }
  if (a.do === "circle") {
    if (!Array.isArray(a.targets) || !a.targets.length || a.targets.some((id) => !ids.has(id))) err("E3D_TARGET", `${p}.targets`, "circle needs targets: a list of object ids");
    if (a.center != null && !(Array.isArray(a.center) && a.center.length === 3 && a.center.every(Number.isFinite))) err("E3D_VEC", `${p}.center`, "center must be [x, y, z]");
    if (a.radius != null && !isNum(a.radius, 0.3, 20)) err("E3D_RANGE", `${p}.radius`, "radius must be 0.3-20 m");
    if (a.turns != null && !isNum(Math.abs(a.turns), 0.25, 10)) err("E3D_RANGE", `${p}.turns`, "turns must be 0.25-10");
    if (a.sink != null && !isNum(a.sink, 0, 2)) err("E3D_RANGE", `${p}.sink`, "sink must be 0-2 m");
    return true;
  }
  if (a.do === "rewind") {
    // Effects (director_effects.js): rewind has no target; it lists targets (default everything in the scene).
    if (a.back != null && !isNum(a.back, 0.2, 60)) err("E3D_RANGE", `${p}.back`, "back must be 0.2-60 s: how far back the objects go");
    if (a.targets != null && (!Array.isArray(a.targets) || a.targets.some((id) => !ids.has(id)))) err("E3D_TARGET", `${p}.targets`, "targets must be a list of object ids");
    return true;
  }
  if (a.do === "gesture") {
    if (a.kind != null && !["wide", "snap", "thumbs_up", "thumbs_down"].includes(a.kind)) err("E3D_GESTURE", `${p}.kind`, "kind must be wide, snap, thumbs_up or thumbs_down");
    const o = ids.get(a.target);
    if (o && !["critter", "character"].includes(o.kind)) err("E3D_TARGET_KIND", `${p}.target`, `gesture needs a critter, "${a.target}" is a ${o.kind}`);
  }
  if (a.do === "mist") {
    if (a.amount != null && !isNum(a.amount, 0.1, 1)) err("E3D_RANGE", `${p}.amount`, "amount must be 0.1-1 (how thick the mist is)");
    if (a.size != null && !isNum(a.size, 0.1, 5)) err("E3D_RANGE", `${p}.size`, "size must be 0.1-5 m (each puff)");
    if (a.clear != null && typeof a.clear !== "boolean") err("E3D_RANGE", `${p}.clear`, "clear must be true or false");
  }
  if (a.do === "stage") {
    if (a.preset == null) err("E3D_REQUIRED", `${p}.preset`, "stage needs preset: a stage name");
    else if (!catalog.stages[a.preset]) err("E3D_STAGE", `${p}.preset`, `unknown stage "${a.preset}" (known: ${Object.keys(catalog.stages).join(", ")})`);
    return true;
  }
  if (a.do === "paint" && typeof a.target === "string") {
    const o = ids.get(a.target);
    if (o && ["fraction_bar", "fraction_circle"].includes(o.kind) && a.from != null) {
      const f = withDefaults(o);
      if (a.from !== f.empty && a.from !== f.color) err("E3D_PAINT_FROM", `${p}.from`, `a ${o.kind} paints its colour "${f.color}" or, with from, its empty colour "${f.empty}"`);
    }
  }
  return false;
}

/** Kinds paint takes beyond shapes, letters, blocks, critters and props. */
export const PAINT_KINDS = PAINT_KIT;

/** letter lift, inherit. */
export function checkLift(o, p, err) {
  if (o.kind === "letter" && o.lift != null && !LIFTS.includes(o.lift)) err("E3D_LIFT", `${p}.lift`, `lift must be ${LIFTS.join(" or ")}`);
  if (o.inherit != null) {
    if (o.inherit !== "size") err("E3D_INHERIT", `${p}.inherit`, 'inherit must be "size"');
    else if (o.parent == null || o.part != null) err("E3D_INHERIT", `${p}.inherit`, "inherit needs a parent (and no part: part riders already scale with the parent)");
  }
}
