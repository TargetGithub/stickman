// Validator checks for talking, looking and framed camera moves (say.who, look, shot, orbit) and for stage
// set pieces, kept apart from validate.js so it stays small. Each check gets the script's objects by id and
// an err(code, path, message) callback. Pure.

import { FRAMING } from "./camera_moves.js";
import { SET_PREFIX, stageSet } from "./stage_set.js";

const isVec = (v) => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === "number" && Number.isFinite(x));
const isNum = (v, lo = -Infinity, hi = Infinity) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/**
 * Objects that can speak with a moving mouth (or head): critters, characters, shapes with face: true, and props
 * (a face opens its mouth, a light part pulses, anything else bobs with the voice).
 */
export const canTalk = (o) => o.kind === "critter" || o.kind === "character" || o.kind === "prop" || (o.kind === "shape" && o.face === true);

/** say.who: the speaker's object id. */
export function checkWho(a, p, ids, err) {
  if (a.who == null) return;
  const o = ids.get(a.who);
  if (!o) return err("E3D_WHO", `${p}.who`, `no object "${a.who}" to speak the line`);
  if (!canTalk(o)) err("E3D_WHO", `${p}.who`, `"${a.who}" is a ${o.kind}${o.kind === "shape" ? " without face: true" : ""}: who must be a critter, a character, a prop or a shape with a face`);
}

/**
 * look, shot and orbit. Returns true when the action was one of them (validate.js then skips its own target
 * checks). look's at is the thing to look at (an id or [x, y, z]) unless it is a number (the time); then the
 * thing to look at goes in to.
 */
export function checkLookCamera(a, p, ids, err) {
  if (a.do === "look") {
    const o = ids.get(a.target);
    if (!o) return err("E3D_TARGET", `${p}.target`, `no object "${a.target}"`), true;
    if (o.kind !== "critter" && o.kind !== "character") err("E3D_TARGET_KIND", `${p}.target`, `look needs a critter or a character, "${a.target}" is a ${o.kind}`);
    const point = a.to ?? (typeof a.at === "number" ? undefined : a.at);
    const key = a.to != null ? "to" : "at";
    if (point == null) err("E3D_REQUIRED", `${p}.at`, "look needs at: an object id or [x, y, z] (or to, when at is the time)");
    else if (typeof point === "string") {
      if (point !== "ahead" && !ids.has(point)) err("E3D_LOOK", `${p}.${key}`, `no object "${point}" to look at (or use [x, y, z], or "ahead")`);
      else if (point === a.target) err("E3D_LOOK", `${p}.${key}`, "an object cannot look at itself");
    } else if (!isVec(point)) err("E3D_LOOK", `${p}.${key}`, "look at an object id or [x, y, z]");
    return true;
  }
  if (a.do === "shot") {
    const list = Array.isArray(a.target) ? a.target : [a.target];
    if (!list.length || list.some((x) => typeof x !== "string")) err("E3D_REQUIRED", `${p}.target`, "shot needs target: an object id or a list of ids");
    for (const [i, id] of list.entries()) if (typeof id === "string" && !ids.has(id)) err("E3D_TARGET", `${p}.target${Array.isArray(a.target) ? `[${i}]` : ""}`, `no object "${id}"`);
    if (a.framing != null && !FRAMING[a.framing]) err("E3D_FRAMING", `${p}.framing`, `framing must be one of ${Object.keys(FRAMING).join(", ")}`);
    if (a.yaw != null && !isNum(a.yaw, -360, 360)) err("E3D_RANGE", `${p}.yaw`, "yaw must be -360 to 360 degrees");
    if (a.height != null && !isNum(a.height, -30, 75)) err("E3D_RANGE", `${p}.height`, "height must be -30 to 75 degrees (elevation)");
    return true;
  }
  if (a.do === "orbit") {
    if (!isVec(a.around)) err("E3D_VEC", `${p}.around`, "orbit needs around: [x, y, z]");
    if (a.degrees == null || !isNum(a.degrees, -720, 720)) err("E3D_RANGE", `${p}.degrees`, "orbit needs degrees (-720 to 720)");
    if (a.radius != null && !isNum(a.radius, 0.5, 100)) err("E3D_RANGE", `${p}.radius`, "radius must be 0.5-100 m");
    if (a.height != null && !isNum(a.height, -5, 50)) err("E3D_RANGE", `${p}.height`, "height must be -5 to 50 m above around");
    return true;
  }
  return false;
}

/**
 * Stage set pieces join the objects before the script's own (so actions may target "set_board"); script ids
 * may not use the set_ prefix. stage.set overrides the preset's list ([] for none).
 */
export function addSetPieces(script, catalog, ids, err) {
  if (script.stage?.set !== undefined && !Array.isArray(script.stage.set)) err("E3D_STAGE_SET", "stage.set", "set must be a list of objects ([] for none)");
  for (const o of stageSet(script.stage ?? {}, catalog)) ids.set(o.id, o);
  (Array.isArray(script.objects) ? script.objects : []).forEach((o, i) => {
    if (typeof o?.id === "string" && o.id.startsWith(SET_PREFIX)) err("E3D_ID", `objects[${i}].id`, `ids starting with "${SET_PREFIX}" are kept for stage set pieces`);
  });
}
