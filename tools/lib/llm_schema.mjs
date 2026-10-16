// Adapt the script JSON Schema (engine/validator/schema.js) to the API's structured-output subset
// (spec 18.3). Structured outputs support objects with additionalProperties:false, enum, const,
// anyOf, $ref; not oneOf, numeric or string ranges, patterns or open maps. Dropped constraints are
// still enforced by our own validator, which every script goes through anyway.

import { scriptSchema } from "../../engine/index.js";
import { WORLD_COMMANDS } from "../../engine/validator/index.js";
import { movesFor } from "../../engine/sim.js";

const DROP = new Set(["$schema", "title", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "pattern", "minItems", "maxItems", "uniqueItems", "format"]);

/** Recursively rewrite a schema node into the supported subset. */
export function toStructured(node) {
  if (Array.isArray(node)) return node.map(toStructured);
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (DROP.has(k) || k.startsWith("x-")) continue;
    if (k === "oneOf") out.anyOf = toStructured(v);
    else if (k === "properties") out.properties = Object.fromEntries(Object.entries(v).map(([p, s]) => [p, toStructured(s)]));
    else out[k] = toStructured(v);
  }
  // type: ["a", "b"] → anyOf of single types (keeps each branch simple).
  if (Array.isArray(out.type)) {
    const types = out.type;
    delete out.type;
    out.anyOf = types.map((t) => ({ type: t }));
  }
  if (out.type === "object" || out.properties) {
    out.type = "object";
    if (typeof out.additionalProperties !== "boolean" || out.additionalProperties) out.additionalProperties = false;
  }
  return out;
}

/** Every param name any move or world command accepts, so beat params can be a closed object. */
export function paramNames(catalog) {
  const names = new Set(["damage", "distance", "cycles"]);
  for (const def of movesFor(catalog).values()) for (const k of Object.keys(def.params)) names.add(k);
  for (const spec of Object.values(WORLD_COMMANDS)) for (const k of Object.keys(spec)) names.add(k);
  return [...names].sort();
}

/** Structured-output schema for a whole script, with catalog enums. */
export function scriptOutputSchema(catalog) {
  const s = scriptSchema(catalog);
  // Open map → closed object listing every known param (each optional, scalar).
  const scalar = { anyOf: [{ type: "number" }, { type: "string" }, { type: "boolean" }] };
  s.properties.beats.items.properties.params = {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(paramNames(catalog).map((n) => [n, scalar])),
  };
  const fx = s.properties.beats.items.properties.fx;
  fx.items = { enum: [...catalog.fxNames] };
  return toStructured(s);
}

/** Small schemas for the other stages. */
export const IDEATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["premises"],
  properties: {
    premises: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "logline", "tone", "theme", "characters", "beats", "standout"],
        properties: {
          title: { type: "string" },
          logline: { type: "string" },
          tone: { type: "string" },
          theme: { type: "string" },
          characters: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "role", "look"],
              properties: { id: { type: "string" }, role: { type: "string" }, look: { type: "string" } },
            },
          },
          beats: { type: "array", items: { type: "string" } },
          standout: { type: "string" },
        },
      },
    },
  },
};

export const CRITIQUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "revise", "notes"],
  properties: {
    score: { type: "integer" },
    revise: { type: "boolean" },
    notes: { type: "array", items: { type: "string" } },
  },
};

export const METADATA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "tags"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
};
