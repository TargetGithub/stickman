// v0.2 checks (EDITOR_SPEC.md 5): stage, cast, timeline and poses. Called by validate() for version "0.2".
// Without a catalog only the structure is checked; with one, names, capabilities and move options are checked too.
import { JOINT_NAMES } from "./rig.js";

const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const isColor = (x) => typeof x === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(x);
const show = (v) => {
  const s = JSON.stringify(v);
  return s === undefined ? String(v) : s.length > 40 ? `${s.slice(0, 37)}...` : s;
};

export const CAST_KINDS = ["rig", "critter", "character", "prop", "shape"];
const CAST_KEYS = ["id", "kind", "name", "at", "facing", "size", "color"];
const BLOCK_KEYS = ["who", "at", "dur", "do", "with"];

/**
 * @param {any} doc
 * @param {{ err: (path: string, code: string, message: string) => void, claimId: (obj: any, path: string) => void,
 *   unknown: (obj: any, allowed: string[], path: string) => void, duration: number, catalog?: any }} c
 */
export function validateV02(doc, { err, claimId, unknown, duration, catalog }) {
  if (doc.stage !== undefined) {
    if (typeof doc.stage !== "string") err("stage", "E_TYPE", "stage must be a stage name");
    else if (catalog && !catalog.stages[doc.stage]) err("stage", "E_ENUM", `unknown stage ${show(doc.stage)} (one of: ${Object.keys(catalog.stages).join(", ")})`);
  }

  // Poses: { name: { emoji?, joints: { joint: [x, y, z] } } }
  const poses = isObj(doc.poses) ? doc.poses : {};
  if (doc.poses !== undefined && !isObj(doc.poses)) err("poses", "E_TYPE", "poses must be an object of named poses");
  for (const [name, p] of Object.entries(poses)) {
    const path = `poses.${name}`;
    if (!isObj(p)) { err(path, "E_TYPE", "a pose is { emoji?, joints }"); continue; }
    unknown(p, ["emoji", "joints"], path);
    if (!isObj(p.joints)) { err(`${path}.joints`, "E_TYPE", "joints must be an object of joint rotations"); continue; }
    for (const [j, v] of Object.entries(p.joints)) {
      if (!JOINT_NAMES.includes(j)) err(`${path}.joints.${j}`, "E_ENUM", `unknown joint "${j}" (one of: ${JOINT_NAMES.join(", ")})`);
      else if (!(Array.isArray(v) && v.length === 3 && v.every(isNum))) err(`${path}.joints.${j}`, "E_TYPE", `expected [x, y, z] degrees, got ${show(v)}`);
    }
  }

  // Cast
  const cast = new Map();
  if (doc.cast !== undefined) {
    if (!Array.isArray(doc.cast)) err("cast", "E_TYPE", "cast must be an array");
    else doc.cast.forEach((m, i) => {
      const path = `cast[${i}]`;
      if (!isObj(m)) return err(path, "E_TYPE", "a cast member is { id, kind, name, at, facing?, size?, color? }");
      unknown(m, CAST_KEYS, path);
      claimId(m, path);
      if (m.id === "camera") err(`${path}.id`, "E_TYPE", `"camera" is reserved for the camera row`);
      if (m.kind === undefined) err(`${path}.kind`, "E_REQUIRED", `"kind" is required`);
      else if (!CAST_KINDS.includes(m.kind)) err(`${path}.kind`, "E_ENUM", `unknown kind ${show(m.kind)} (one of: ${CAST_KINDS.join(", ")})`);
      if (typeof m.name !== "string") err(`${path}.name`, m.name === undefined ? "E_REQUIRED" : "E_TYPE", "name must be a model name");
      else if (catalog) {
        const model = catalog.models[m.name];
        if (!model) err(`${path}.name`, "E_ENUM", `unknown model ${show(m.name)} (one of: ${Object.keys(catalog.models).join(", ")})`);
        else if (CAST_KINDS.includes(m.kind) && model.kind !== m.kind) err(`${path}.kind`, "E_ENUM", `"${m.name}" is a ${model.kind}, not a ${m.kind}`);
      }
      if (!(Array.isArray(m.at) && (m.at.length === 2 || m.at.length === 3) && m.at.every(isNum))) err(`${path}.at`, m.at === undefined ? "E_REQUIRED" : "E_TYPE", `at is [x, z] on the floor or [x, y, z] above it, got ${show(m.at)}`);
      if (m.facing !== undefined && !isNum(m.facing)) err(`${path}.facing`, "E_TYPE", "facing is a number of degrees");
      if (m.size !== undefined && !(isNum(m.size) && m.size > 0)) err(`${path}.size`, "E_RANGE", `size must be > 0, got ${show(m.size)}`);
      if (m.color !== undefined && !isColor(m.color)) err(`${path}.color`, "E_TYPE", `expected a color like "#ff8800", got ${show(m.color)}`);
      if (typeof m.id === "string") cast.set(m.id, m);
    });
  }

  // Timeline
  if (doc.timeline === undefined) return;
  if (!Array.isArray(doc.timeline)) return err("timeline", "E_TYPE", "timeline must be an array of blocks");
  const rows = new Map();
  doc.timeline.forEach((b, i) => {
    const path = `timeline[${i}]`;
    if (!isObj(b)) return err(path, "E_TYPE", "a block is { who, at, dur?, do, with? }");
    unknown(b, BLOCK_KEYS, path);
    const camera = b.who === "camera";
    if (typeof b.who !== "string") err(`${path}.who`, b.who === undefined ? "E_REQUIRED" : "E_TYPE", "who is a cast id or \"camera\"");
    else if (!camera && !cast.has(b.who)) err(`${path}.who`, "E_REF", `"${b.who}" is not in the cast`);
    if (!isNum(b.at)) err(`${path}.at`, b.at === undefined ? "E_REQUIRED" : "E_TYPE", "at is the start time in seconds");
    else if (b.at < 0) err(`${path}.at`, "E_RANGE", `must be ≥ 0, got ${b.at}`);
    if (b.dur !== undefined && !(isNum(b.dur) && b.dur > 0)) err(`${path}.dur`, "E_RANGE", `dur must be > 0, got ${show(b.dur)}`);
    if (typeof b.do !== "string") return err(`${path}.do`, b.do === undefined ? "E_REQUIRED" : "E_TYPE", "do is a move name");
    if (b.with !== undefined && !isObj(b.with)) return err(`${path}.with`, "E_TYPE", "with is an object of move options");
    if (!catalog) return;
    const move = catalog.moves[b.do];
    if (!move) return err(`${path}.do`, "E_ENUM", `unknown move ${show(b.do)} (one of: ${Object.keys(catalog.moves).join(", ")})`);
    if (camera !== (move.needs === "camera")) {
      return err(`${path}.do`, "E_CAPS", camera ? `"${b.do}" is not a camera move` : `"${b.do}" is a camera move; use who: "camera"`);
    }
    const dur = b.dur ?? move.dur;
    if (isNum(b.at) && isNum(dur) && b.at + dur > duration + 1e-9) err(`${path}.dur`, "E_RANGE", `the block ends at ${b.at + dur}, after the scene's duration ${duration}`);
    const member = cast.get(b.who);
    const model = member && catalog.models[member.name];
    if (model && !model.caps.includes(move.needs)) err(`${path}.do`, "E_CAPS", `a ${member.name} can't "${b.do}" (it needs ${move.needs})`);
    checkOptions(b, move, `${path}.with`, { err, cast, catalog, poses, model });
    if (typeof b.who === "string" && isNum(b.at) && isNum(dur)) {
      if (!rows.has(b.who)) rows.set(b.who, []);
      rows.get(b.who).push({ at: b.at, end: b.at + dur, i });
    }
  });
  for (const [who, list] of rows) {
    list.sort((a, b) => a.at - b.at || a.i - b.i);
    for (let k = 1; k < list.length; k++) {
      if (list[k].at < list[k - 1].end - 1e-9) {
        err(`timeline[${list[k].i}].at`, "E_OVERLAP", `"${who}" is still busy with timeline[${list[k - 1].i}] until ${list[k - 1].end}`);
      }
    }
  }
}

function checkOptions(b, move, path, { err, cast, catalog, poses, model }) {
  const given = b.with ?? {};
  const specs = move.options ?? {};
  for (const k of Object.keys(given)) if (!(k in specs)) err(`${path}.${k}`, "E_UNKNOWN_KEY", `"${b.do}" has no option "${k}"${Object.keys(specs).length ? ` (options: ${Object.keys(specs).join(", ")})` : ""}`);
  for (const [k, spec] of Object.entries(specs)) {
    const v = given[k];
    const p = `${path}.${k}`;
    if (v === undefined) {
      if (spec.required) err(p, "E_REQUIRED", `"${b.do}" needs "${k}"`);
      continue;
    }
    if (spec.type === "number" || spec.type === "int") {
      if (!isNum(v) || (spec.type === "int" && !Number.isInteger(v))) err(p, "E_TYPE", `expected ${spec.type === "int" ? "a whole number" : "a number"}, got ${show(v)}`);
      else if ((spec.min !== undefined && v < spec.min) || (spec.max !== undefined && v > spec.max)) err(p, "E_RANGE", `must be between ${spec.min} and ${spec.max}, got ${v}`);
    } else if (spec.type === "point") {
      if (!(Array.isArray(v) && v.length === 2 && v.every(isNum))) err(p, "E_TYPE", `expected [x, z] on the floor, got ${show(v)}`);
    } else if (spec.type === "cast") {
      if (typeof v !== "string" || !cast.has(v)) err(p, "E_REF", `${show(v)} is not in the cast`);
      else if (v === b.who) err(p, "E_REF", "pick someone else");
    } else if (spec.type === "words") {
      if (!Array.isArray(v) || v.length === 0 || v.length > 8) err(p, "E_TYPE", "words is a list of 1 to 8 words from the word list");
      else v.forEach((w, i) => { if (!(w in catalog.words)) err(`${p}[${i}]`, "E_ENUM", `${show(w)} is not in the word list`); });
    } else if (spec.type === "sound") {
      if (!(v in catalog.sounds)) err(p, "E_ENUM", `unknown sound ${show(v)} (one of: ${Object.keys(catalog.sounds).join(", ")})`);
    } else if (spec.type === "clip") {
      if (!model?.clips?.[v]) err(p, "E_ENUM", `unknown clip ${show(v)}${model?.clips ? ` (one of: ${Object.keys(model.clips).join(", ")})` : ""}`);
    } else if (spec.type === "pose") {
      if (!(v in poses)) err(p, "E_REF", `no pose named ${show(v)} in poses`);
    }
  }
}
