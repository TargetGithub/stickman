// Validator for Lottie3D v0.1 (SPEC.md section 6). Returns every problem it finds, each with a path.
import { JOINT_NAMES, LIGHT_TYPES, PROP_TYPES, RIGS } from "./rig.js";
import { EASE_NAMES } from "./sample.js";
import { validateV02 } from "./validate02.js";

/** @typedef {{ path: string, code: string, message: string }} ValidationError */

const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const isVec3 = (x) => Array.isArray(x) && x.length === 3 && x.every(isNum);
const isColor = (x) => typeof x === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(x);

const TOP_KEYS = ["format", "version", "name", "duration", "fps", "loop", "scene", "characters", "props", "meta"];
const V02_KEYS = ["stage", "cast", "timeline", "poses"];
export const VERSIONS = ["0.1", "0.2"];
const SCENE_KEYS = ["background", "camera", "lights", "ground"];
const CAMERA_KEYS = ["position", "target", "fov", "tracks"];
const LIGHT_KEYS = ["type", "color", "intensity", "position", "groundColor", "shadow"];
const GROUND_KEYS = ["color", "size"];
const CHAR_KEYS = ["id", "rig", "color", "accent", "scale", "position", "yaw", "tracks"];
const PROP_KEYS = ["id", "type", "color", "size", "position", "rotation", "tracks"];
const KEY_KEYS = ["t", "v", "ease"];

/**
 * Validate a Lottie3D document (an object, or a JSON string). Pass the kids catalog (catalog/kids.json) to also
 * check v0.2 names, capabilities and move options.
 * @param {unknown} input
 * @param {{ catalog?: any }} [options]
 * @returns {{ ok: boolean, errors: ValidationError[], doc: any }}
 */
export function validate(input, options = {}) {
  /** @type {ValidationError[]} */
  const errors = [];
  const err = (path, code, message) => errors.push({ path, code, message });
  let doc = input;
  if (typeof input === "string") {
    try {
      doc = JSON.parse(input);
    } catch (e) {
      err("", "E_JSON", `not valid JSON: ${e.message}`);
      return { ok: false, errors, doc: null };
    }
  }
  if (!isObj(doc)) {
    err("", "E_TYPE", "the document must be a JSON object");
    return { ok: false, errors, doc: null };
  }

  const unknown = (obj, allowed, path) => {
    for (const k of Object.keys(obj)) {
      if (!allowed.includes(k)) err(join(path, k), "E_UNKNOWN_KEY", `unknown key "${k}" (allowed: ${allowed.join(", ")})`);
    }
  };
  const req = (obj, key, path) => {
    if (obj[key] === undefined) {
      err(join(path, key), "E_REQUIRED", `"${key}" is required`);
      return false;
    }
    return true;
  };
  const vec3 = (v, path) => isVec3(v) || (err(path, "E_TYPE", `expected [x, y, z] numbers, got ${show(v)}`), false);
  const color = (v, path) => isColor(v) || (err(path, "E_TYPE", `expected a color like "#ff8800", got ${show(v)}`), false);
  const num = (v, path, min, max, strictMin = false) => {
    if (!isNum(v)) return err(path, "E_TYPE", `expected a number, got ${show(v)}`), false;
    if (strictMin ? v <= min : v < min) return err(path, "E_RANGE", `must be ${strictMin ? ">" : "≥"} ${min}, got ${v}`), false;
    if (max !== undefined && v > max) return err(path, "E_RANGE", `must be ≤ ${max}, got ${v}`), false;
    return true;
  };
  const oneOf = (v, list, path, what) =>
    list.includes(v) || (err(path, "E_ENUM", `unknown ${what} ${show(v)} (one of: ${list.join(", ")})`), false);

  const v02 = doc.version === "0.2";
  unknown(doc, v02 ? [...TOP_KEYS, ...V02_KEYS] : TOP_KEYS, "");
  if (req(doc, "format", "") && doc.format !== "lottie3d") err("format", "E_FORMAT", `format must be "lottie3d", got ${show(doc.format)}`);
  if (req(doc, "version", "") && !VERSIONS.includes(doc.version)) err("version", "E_VERSION", `unsupported version ${show(doc.version)} (this player reads ${VERSIONS.map((v) => `"${v}"`).join(" and ")})`);
  if (doc.name !== undefined && typeof doc.name !== "string") err("name", "E_TYPE", "name must be a string");
  const durOk = req(doc, "duration", "") && num(doc.duration, "duration", 0, undefined, true);
  const duration = durOk ? doc.duration : Infinity;
  if (req(doc, "fps", "") && num(doc.fps, "fps", 1, 120) && !Number.isInteger(doc.fps)) err("fps", "E_TYPE", `fps must be a whole number, got ${doc.fps}`);
  if (doc.loop !== undefined && typeof doc.loop !== "boolean") err("loop", "E_TYPE", "loop must be true or false");
  if (doc.meta !== undefined && !isObj(doc.meta)) err("meta", "E_TYPE", "meta must be an object");

  /** Check a track; `kind` is "vec3" or "number". */
  const track = (tr, path, kind) => {
    let keys = tr;
    if (isObj(tr)) {
      unknown(tr, ["keys", "repeat"], path);
      if (tr.repeat !== undefined && typeof tr.repeat !== "boolean") err(join(path, "repeat"), "E_TYPE", "repeat must be true or false");
      keys = tr.keys;
      path = join(path, "keys");
    }
    if (!Array.isArray(keys)) return err(path, "E_TYPE", "a track is an array of keyframes or { keys, repeat }");
    if (keys.length === 0) return err(path, "E_EMPTY", "a track needs at least one keyframe");
    let prev = -Infinity;
    keys.forEach((k, i) => {
      const p = `${path}[${i}]`;
      if (!isObj(k)) return err(p, "E_TYPE", "a keyframe is an object { t, v, ease? }");
      unknown(k, KEY_KEYS, p);
      if (req(k, "t", p) && num(k.t, `${p}.t`, 0, duration)) {
        if (k.t <= prev) err(`${p}.t`, "E_KEY_ORDER", `key times must increase: ${k.t} after ${prev}`);
        prev = k.t;
      }
      if (req(k, "v", p)) {
        if (kind === "vec3") vec3(k.v, `${p}.v`);
        else if (!isNum(k.v)) err(`${p}.v`, "E_TYPE", `expected a number, got ${show(k.v)}`);
      }
      if (k.ease !== undefined) {
        if (Array.isArray(k.ease)) {
          const ok = k.ease.length === 4 && k.ease.every(isNum);
          if (!ok) err(`${p}.ease`, "E_TYPE", "a cubic-bezier ease is [x1, y1, x2, y2]");
          else if (k.ease[0] < 0 || k.ease[0] > 1 || k.ease[2] < 0 || k.ease[2] > 1) err(`${p}.ease`, "E_RANGE", "cubic-bezier x1 and x2 must be between 0 and 1");
        } else oneOf(k.ease, EASE_NAMES, `${p}.ease`, "ease");
      }
    });
    if (isObj(tr) && tr.repeat === true && isObj(keys[keys.length - 1]) && keys[keys.length - 1].t === 0) {
      err(path, "E_RANGE", "a repeating track needs its last key at t > 0 (that is its period)");
    }
  };
  const tracks = (trs, path, allowed) => {
    if (trs === undefined) return;
    if (!isObj(trs)) return err(path, "E_TYPE", "tracks must be an object of named tracks");
    for (const name of Object.keys(trs)) {
      if (!(name in allowed)) err(join(path, name), "E_ENUM", `unknown track "${name}" (one of: ${Object.keys(allowed).join(", ")})`);
      else track(trs[name], join(path, name), allowed[name]);
    }
  };

  // Scene (v0.2: a stage name can replace it; one of the two is required)
  if (v02 && doc.scene !== undefined && doc.stage !== undefined) err("stage", "E_CONFLICT", "give either stage or scene, not both");
  if (v02 && doc.scene === undefined && doc.stage === undefined) err("stage", "E_REQUIRED", `"stage" (or "scene") is required`);
  if (v02 ? doc.scene !== undefined : req(doc, "scene", "")) {
    const s = doc.scene;
    if (!isObj(s)) err("scene", "E_TYPE", "scene must be an object");
    else {
      unknown(s, SCENE_KEYS, "scene");
      if (req(s, "background", "scene")) color(s.background, "scene.background");
      if (req(s, "camera", "scene")) {
        const c = s.camera;
        if (!isObj(c)) err("scene.camera", "E_TYPE", "camera must be an object");
        else {
          unknown(c, CAMERA_KEYS, "scene.camera");
          if (req(c, "position", "scene.camera")) vec3(c.position, "scene.camera.position");
          if (c.target !== undefined) vec3(c.target, "scene.camera.target");
          if (c.fov !== undefined) num(c.fov, "scene.camera.fov", 1, 170);
          tracks(c.tracks, "scene.camera.tracks", { position: "vec3", target: "vec3", fov: "number" });
        }
      }
      if (s.lights !== undefined) {
        if (!Array.isArray(s.lights)) err("scene.lights", "E_TYPE", "lights must be an array");
        else s.lights.forEach((l, i) => {
          const p = `scene.lights[${i}]`;
          if (!isObj(l)) return err(p, "E_TYPE", "a light is an object");
          unknown(l, LIGHT_KEYS, p);
          if (req(l, "type", p)) oneOf(l.type, LIGHT_TYPES, `${p}.type`, "light type");
          if (l.color !== undefined) color(l.color, `${p}.color`);
          if (l.groundColor !== undefined) color(l.groundColor, `${p}.groundColor`);
          if (l.intensity !== undefined) num(l.intensity, `${p}.intensity`, 0);
          if (l.position !== undefined) vec3(l.position, `${p}.position`);
          if (l.shadow !== undefined && typeof l.shadow !== "boolean") err(`${p}.shadow`, "E_TYPE", "shadow must be true or false");
        });
      }
      if (s.ground !== undefined) {
        if (!isObj(s.ground)) err("scene.ground", "E_TYPE", "ground must be an object");
        else {
          unknown(s.ground, GROUND_KEYS, "scene.ground");
          if (s.ground.color !== undefined) color(s.ground.color, "scene.ground.color");
          if (s.ground.size !== undefined) num(s.ground.size, "scene.ground.size", 0, undefined, true);
        }
      }
    }
  }

  // Characters and props share one id space.
  const ids = new Map();
  const claimId = (obj, path) => {
    if (!req(obj, "id", path)) return;
    if (typeof obj.id !== "string" || obj.id === "") return err(join(path, "id"), "E_TYPE", "id must be a non-empty string");
    if (ids.has(obj.id)) err(join(path, "id"), "E_DUP_ID", `id "${obj.id}" is already used by ${ids.get(obj.id)}`);
    else ids.set(obj.id, path);
  };
  const jointTracks = Object.fromEntries([["position", "vec3"], ...JOINT_NAMES.map((n) => [n, "vec3"])]);
  if (doc.characters !== undefined) {
    if (!Array.isArray(doc.characters)) err("characters", "E_TYPE", "characters must be an array");
    else doc.characters.forEach((c, i) => {
      const p = `characters[${i}]`;
      if (!isObj(c)) return err(p, "E_TYPE", "a character is an object");
      unknown(c, CHAR_KEYS, p);
      claimId(c, p);
      if (req(c, "rig", p)) oneOf(c.rig, RIGS, `${p}.rig`, "rig");
      if (c.color !== undefined) color(c.color, `${p}.color`);
      if (c.accent !== undefined) color(c.accent, `${p}.accent`);
      if (c.scale !== undefined) num(c.scale, `${p}.scale`, 0, undefined, true);
      if (c.position !== undefined) vec3(c.position, `${p}.position`);
      if (c.yaw !== undefined) num(c.yaw, `${p}.yaw`, -Infinity);
      tracks(c.tracks, `${p}.tracks`, jointTracks);
    });
  }
  if (doc.props !== undefined) {
    if (!Array.isArray(doc.props)) err("props", "E_TYPE", "props must be an array");
    else doc.props.forEach((o, i) => {
      const p = `props[${i}]`;
      if (!isObj(o)) return err(p, "E_TYPE", "a prop is an object");
      unknown(o, PROP_KEYS, p);
      claimId(o, p);
      if (req(o, "type", p)) oneOf(o.type, PROP_TYPES, `${p}.type`, "prop type");
      if (o.color !== undefined) color(o.color, `${p}.color`);
      if (o.size !== undefined && !(isNum(o.size) && o.size > 0) && !(isVec3(o.size) && o.size.every((x) => x > 0))) {
        err(`${p}.size`, "E_TYPE", `size is a positive number or [x, y, z], got ${show(o.size)}`);
      }
      if (o.position !== undefined) vec3(o.position, `${p}.position`);
      if (o.rotation !== undefined) vec3(o.rotation, `${p}.rotation`);
      tracks(o.tracks, `${p}.tracks`, { position: "vec3", rotation: "vec3", scale: "vec3" });
    });
  }

  if (v02) validateV02(doc, { err, claimId, unknown, duration, catalog: options.catalog });

  return { ok: errors.length === 0, errors, doc };
}

/** One line per error, for consoles and the demo page. */
export function formatErrors(errors) {
  return errors.map((e) => `${e.path || "(document)"}: ${e.code} ${e.message}`).join("\n");
}

function join(path, key) {
  return path ? `${path}.${key}` : key;
}

function show(v) {
  const s = JSON.stringify(v);
  return s === undefined ? String(v) : s.length > 40 ? `${s.slice(0, 37)}...` : s;
}
