// Validator checks for the round 3 options: character voices (meta.cast, say pitch and speed), the `stage`
// action (a mid-episode stage change), shot's pad, letter lift and paint on teaching-kit kinds. validate.js
// calls these. Pure.

import { PAINT_KIT } from "./director_extras.js";
import { canTalk } from "./validate_look.js";
import { rectCells, withDefaults } from "./teach_layout.js";

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

/**
 * Round 3 action checks. Returns true when validate.js should skip its own target checks (stage has none).
 * @param {{ err, ids: Map, catalog }} k
 */
export function checkR3Action(a, p, { err, ids, catalog }) {
  if (a.do === "say") checkVoiceNums(a, p, err);
  if (a.do === "shot" && a.pad != null && !isNum(a.pad, 0, 2)) err("E3D_RANGE", `${p}.pad`, "pad must be 0-2 (0.2: a 20% bigger box)");
  if (a.do === "shot" && a.fit != null && !FITS.includes(a.fit)) err("E3D_FIT", `${p}.fit`, `fit must be ${FITS.join(" or ")}`);
  if (a.do === "caption" && a.pos != null && !CAPTION_POS.includes(a.pos)) err("E3D_POS", `${p}.pos`, `pos must be ${CAPTION_POS.join(", ")}`);
  if (a.do === "music") {
    if (!isNum(a.gain, 0, 1)) err(a.gain == null ? "E3D_REQUIRED" : "E3D_RANGE", `${p}.gain`, "music needs gain: 0-1 (times the scene's level; 1 brings it back)");
    return true;
  }
  if (a.do === "shade" && a.rect != null) {
    const o = ids.get(a.target);
    if (o && o.kind !== "grid" && o.kind !== "array") err("E3D_TARGET_KIND", `${p}.rect`, `rect shades a block of a grid or array, "${a.target}" is a ${o.kind}`);
    else if (o && !rectCells(withDefaults(o), a.rect)) err("E3D_CELLS", `${p}.rect`, `rect must be [row, col, rows, cols] (from 1) inside the ${withDefaults(o).rows} x ${withDefaults(o).cols} ${o.kind}`);
    if (a.cells != null || a.to != null) err("E3D_CELLS", `${p}.rect`, "shade takes one of to, cells or rect");
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
