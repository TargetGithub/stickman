// Script schema (spec 11, 16.1): one JSON Schema object, used both to validate scripts here and,
// via buildJsonSchema(catalog), as the structured-output schema for the LLM (spec 18.3).
// The checker below implements the subset of JSON Schema this schema uses.

import { checkValue } from "./check_value.js";
import { LIMITS } from "../config.js";
import { BUNDLE_ID, SEMVER, SHA256 } from "../bundles.js";

/** The catalog bundles a script uses (CATALOG_BUNDLE_SPEC 7.1, V3.1); shared by the v1 and v2 schemas. */
export const BUNDLES = {
  type: "array",
  maxItems: 8,
  description: "Catalog bundles the script uses (names with a colon, such as robo_pals:boxbot). Each pin: id, version and the bundle's contentHash.",
  items: {
    type: "object",
    required: ["id", "version"],
    additionalProperties: false,
    properties: {
      id: { type: "string", pattern: BUNDLE_ID },
      version: { type: "string", pattern: SEMVER },
      hash: { type: "string", pattern: SHA256 },
    },
  },
};

const ID = "^[a-z][a-z0-9_]{0,23}$";
const COLOR = "^#[0-9a-fA-F]{6}$";
const DELAY = { type: "number", minimum: 0, maximum: 30, description: "Seconds after the referenced moment." };

const AT = {
  description: "When the beat runs: story seconds, or relative to another beat.",
  "x-formMessage": 'Use a number of seconds, {"after": "<beatId>"}, {"with": "<beatId>"} or {"on": "<beatId>.<start|windowOpen|hit|end>"}, each with an optional "delay".',
  oneOf: [
    { type: "number", minimum: 0, maximum: LIMITS.maxDuration },
    { type: "object", required: ["after"], additionalProperties: false, properties: { after: { type: "string", pattern: ID }, delay: DELAY } },
    { type: "object", required: ["with"], additionalProperties: false, properties: { with: { type: "string", pattern: ID }, delay: DELAY } },
    { type: "object", required: ["on"], additionalProperties: false, properties: { on: { type: "string", pattern: "^[a-z][a-z0-9_]{0,23}\\.(start|windowOpen|hit|end)$" }, delay: DELAY } },
  ],
};

export const jsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "StickmanScript",
  type: "object",
  required: ["version", "meta", "characters", "camera", "beats"],
  additionalProperties: false,
  properties: {
    version: { const: 1 },
    meta: {
      type: "object",
      required: ["title", "format", "seed"],
      additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 1, maxLength: 80 },
        format: { enum: ["landscape", "portrait"] },
        seed: { type: "integer", minimum: 0, maximum: 2147483647 },
        mode: { enum: ["choreographed", "simulated"] },
        stageWidth: { type: "number", minimum: 1600, maximum: 8000 },
        theme: { type: "string" },
        hpBars: { type: "boolean" },
        autoCamera: { type: "boolean" },
        tail: { type: "number", minimum: 0, maximum: 3 },
      },
    },
    characters: {
      type: "array",
      minItems: 1,
      maxItems: LIMITS.characters,
      items: {
        type: "object",
        required: ["id", "x", "facing", "color"],
        additionalProperties: false,
        properties: {
          id: { type: "string", pattern: ID },
          x: { type: "number", description: "Start position in world px (stage is 0..stageWidth)." },
          facing: { enum: [1, -1] },
          color: { type: "string", pattern: COLOR },
          scale: { type: "number", minimum: 0.4, maximum: 4 },
          hp: { type: "number", minimum: 1, maximum: 1000 },
          prop: { type: ["string", "null"] },
          style: {
            type: "object",
            additionalProperties: false,
            properties: {
              overlap: { type: "boolean" },
              outline: { type: "boolean" },
              squash: { type: "boolean" },
              glow: { type: "string", pattern: COLOR },
              headband: { type: "string", pattern: COLOR },
              cape: { type: "string", pattern: COLOR },
              hat: { type: "string", pattern: COLOR },
              scarf: { type: "string", pattern: COLOR },
            },
          },
        },
      },
    },
    camera: {
      type: "array",
      minItems: 1,
      maxItems: 60,
      items: {
        type: "object",
        required: ["at", "mode"],
        additionalProperties: false,
        properties: {
          at: AT,
          mode: { enum: ["follow", "focus", "fixed", "pan", "push"] },
          targets: { type: "array", items: { type: "string" }, maxItems: LIMITS.characters },
          target: { type: "string" },
          zoom: { oneOf: [{ type: "number", minimum: 0.3, maximum: 4 }, { const: "auto" }], "x-formMessage": 'Use a number from 0.3 to 4 or "auto".' },
          padding: { type: "number", minimum: 0, maximum: 1200 },
          x: { type: "number" },
          y: { type: "number" },
          ease: { type: "string" },
          dur: { type: "number", minimum: 0, maximum: 10 },
        },
      },
    },
    beats: {
      type: "array",
      maxItems: LIMITS.beats,
      items: {
        type: "object",
        required: ["at", "who", "do"],
        additionalProperties: false,
        properties: {
          id: { type: "string", pattern: ID },
          at: AT,
          who: { type: "string", description: 'A character id, or "world" for effects and camera cuts.' },
          do: { type: "string", description: "A move name (characters) or a world command." },
          target: { type: "string" },
          outcome: { enum: ["hit", "whiff", "blocked", "parried", "dodged"] },
          params: { type: "object", additionalProperties: { type: ["number", "string", "boolean"] } },
          speed: { type: "number", minimum: 0.25, maximum: 3 },
          approach: { enum: ["run", "walk", false] },
          interrupt: { type: "boolean" },
          fx: { type: "array", items: { type: "string" }, maxItems: 6 },
          say: { type: "string", minLength: 1, maxLength: LIMITS.say },
          sayDur: { type: "number", minimum: 0.2, maximum: 10 },
        },
      },
    },
    audio: {
      type: "object",
      additionalProperties: false,
      properties: {
        music: { type: ["string", "null"] },
        musicVolume: { type: "number", minimum: 0, maximum: 1 },
      },
    },
    bundles: BUNDLES,
  },
};

/** A deep copy of a schema without checker-only keywords (x-*). */
export function exportSchema(schema) {
  return JSON.parse(JSON.stringify(schema, (k, v) => (k.startsWith("x-") ? undefined : v)));
}

/** The schema with catalog enums filled in (moves, themes, props) and checker-only keywords removed. */
export function buildJsonSchema(catalog, moveNames, worldCommands) {
  const s = exportSchema(jsonSchema);
  s.properties.beats.items.properties.do.enum = [...moveNames, ...worldCommands];
  s.properties.meta.properties.theme.enum = catalog.themeNames;
  s.properties.characters.items.properties.prop = { enum: [...Object.keys(catalog.props), null] };
  return s;
}

// ---------- checker (check_value.js) ----------

export { checkValue };

/** Structural issues for a script (spec 16.1). */
export function checkSchema(script) {
  const out = [];
  const size = JSON.stringify(script)?.length ?? 0;
  if (size > LIMITS.scriptBytes) {
    out.push({ code: "E_SCHEMA_SIZE", path: "", message: `Script is ${size} bytes.`, fix: `Keep scripts under ${LIMITS.scriptBytes} bytes.` });
    return out;
  }
  out.push(...checkValue(script, jsonSchema));
  return out;
}
