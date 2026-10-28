// Art references (WORKBOOK_SPEC 4.4): {preset}, {prop}, {object} or {shape}. The schema below checks the form;
// artIssues() checks the names against the workbook catalog (the engine catalog plus `presets`, and from W2
// `education`). Print approval (spec 8.3) applies once the catalog has education.lineArt.

import { closestMatch } from "../validator/report.js";
import { OBJECT_SHAPES } from "../renderer/objects.js";
import { PROP_SHAPES } from "../renderer/props.js";

const DRAWN_BEHAVIORS = ["seat", "static", "holdable", "breakable", "vehicle", "ball", "floater", "platform"];

export const ART_SCHEMA = {
  oneOf: [
    { type: "object", required: ["preset"], additionalProperties: false, properties: {
      preset: { type: "string", description: "A character preset id." },
      pose: { type: "string", description: "A catalog pose (default stand; dog_stand for four-legged plans)." },
      face: { type: "string", description: "A catalog face (default happy)." },
      facing: { enum: [1, -1], description: "1 faces right (default), -1 left." },
    } },
    { type: "object", required: ["prop"], additionalProperties: false, properties: { prop: { type: "string", description: "A v1 prop." } } },
    { type: "object", required: ["object"], additionalProperties: false, properties: {
      object: { type: "string", description: "A catalog object." },
      facing: { enum: [1, -1] },
    } },
    { type: "object", required: ["shape"], additionalProperties: false, properties: {
      shape: { type: "string", description: "A 2D shape from the education catalog." },
      rotate: { type: "number", minimum: -360, maximum: 360 },
      filled: { type: "boolean" },
    } },
  ],
  "x-formMessage": 'An art reference: {"preset": "doopi"}, {"prop": "bat"}, {"object": "bench"} or {"shape": "triangle"}.',
};

/** The kind of an art reference: preset, prop, object or shape. */
export const artKind = (ref) => ["preset", "prop", "object", "shape"].find((k) => k in ref);

/** Whether a preset uses a four-legged body plan (its poses are the dog_ ones). */
export function isQuadPreset(catalog, preset) {
  return !!catalog.bodies?.[preset?.cast?.body || "stickman"]?.quad;
}

const unknown = (path, what, name, names) => {
  const near = closestMatch(name, names);
  return { code: "E_WB_ART", path, message: `Unknown ${what} '${name}'.`, fix: near ? `Did you mean '${near}'?` : `Use a ${what} from the catalog.` };
};

function approval(catalog, group, name, path) {
  const list = catalog.education?.lineArt?.[group];
  if (!list || list[name]?.status === "ok") return [];
  return [{ code: "E_WB_ART", path, message: `'${name}' is not approved for print.`, fix: `Use one listed in 09_workbooks.md (print-approved ${group}).` }];
}

/** Name issues of one art reference (its form is the schema's job). */
export function artIssues(ref, path, catalog) {
  const kind = artKind(ref);
  if (kind === "preset") {
    const p = catalog.presets?.[ref.preset];
    if (!p) return [unknown(`${path}.preset`, "preset", ref.preset, Object.keys(catalog.presets || {}))];
    const out = approval(catalog, "presets", ref.preset, `${path}.preset`);
    if (ref.pose !== undefined) {
      const quad = isQuadPreset(catalog, p);
      const poses = Object.keys(catalog.poses).filter((n) => n.startsWith("dog_") === quad);
      if (!poses.includes(ref.pose)) out.push(unknown(`${path}.pose`, quad ? "dog pose" : "pose", ref.pose, poses));
    }
    if (ref.face !== undefined && !catalog.faces[ref.face]) out.push(unknown(`${path}.face`, "face", ref.face, Object.keys(catalog.faces)));
    return out;
  }
  if (kind === "prop") {
    if (!catalog.props[ref.prop]) return [unknown(`${path}.prop`, "prop", ref.prop, Object.keys(catalog.props))];
    return approval(catalog, "props", ref.prop, `${path}.prop`);
  }
  if (kind === "object") {
    const def = catalog.objects[ref.object];
    const drawn = (d) => DRAWN_BEHAVIORS.includes(d.behavior) && (d.paths || OBJECT_SHAPES().includes(d.draw) || PROP_SHAPES.includes(d.hold?.shape));
    if (!def || !drawn(def)) return [unknown(`${path}.object`, "object", ref.object, Object.keys(catalog.objects).filter((n) => drawn(catalog.objects[n])))];
    return approval(catalog, "objects", ref.object, `${path}.object`);
  }
  if (kind === "shape") {
    const shapes = catalog.education?.shapes;
    if (!shapes) return [{ code: "E_WB_SHAPE", path: `${path}.shape`, message: "The catalog has no shapes yet.", fix: "Use a preset, prop or object." }];
    if (!shapes[ref.shape]) {
      const near = closestMatch(ref.shape, Object.keys(shapes));
      return [{ code: "E_WB_SHAPE", path: `${path}.shape`, message: `Unknown shape '${ref.shape}'.`, fix: near ? `Did you mean '${near}'?` : "Use a shape from 09_workbooks.md." }];
    }
  }
  return [];
}
