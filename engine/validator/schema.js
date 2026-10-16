// Script schema (spec 11, 16.1): one JSON Schema object, used both to validate scripts here and,
// via buildJsonSchema(catalog), as the structured-output schema for the LLM (spec 18.3).
// The checker below implements the subset of JSON Schema this schema uses.

import { closestMatch } from "./report.js";
import { LIMITS } from "../config.js";

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
  },
};

/** The schema with catalog enums filled in (moves, themes, props) and checker-only keywords removed. */
export function buildJsonSchema(catalog, moveNames, worldCommands) {
  const s = JSON.parse(JSON.stringify(jsonSchema, (k, v) => (k.startsWith("x-") ? undefined : v)));
  s.properties.beats.items.properties.do.enum = [...moveNames, ...worldCommands];
  s.properties.meta.properties.theme.enum = catalog.themeNames;
  s.properties.characters.items.properties.prop = { enum: [...Object.keys(catalog.props), null] };
  return s;
}

// ---------- checker ----------

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
const typeOk = (v, t) => (t === "number" ? typeof v === "number" && Number.isFinite(v) : t === "integer" ? Number.isInteger(v) : typeOf(v) === t);
const show = (v) => JSON.stringify(v);

function check(value, schema, path, out) {
  if (schema.oneOf) {
    const results = schema.oneOf.map((branch) => {
      const issues = [];
      check(value, branch, path, issues);
      return issues;
    });
    if (results.some((r) => r.length === 0)) return;
    // If exactly one branch has the right shape (type, plus its required key), report that branch's
    // specific problems (e.g. a range error) instead of the generic form message.
    const shaped = schema.oneOf
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.type && typeOk(value, b.type) && (!b.required || b.required.every((k) => value && k in value)));
    if (shaped.length === 1) {
      out.push(...results[shaped[0].i]);
      return;
    }
    if (schema["x-formMessage"]) {
      out.push({ code: "E_SCHEMA_FORM", path, message: `${show(value)} is not a valid value here.`, fix: schema["x-formMessage"] });
    } else out.push(...results.reduce((a, b) => (b.length < a.length ? b : a)));
    return;
  }
  if ("const" in schema && value !== schema.const) {
    out.push({ code: "E_SCHEMA_ENUM", path, message: `Must be ${show(schema.const)}, got ${show(value)}.`, fix: `Use ${show(schema.const)}.` });
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    const near = typeof value === "string" ? closestMatch(value, schema.enum.filter((e) => typeof e === "string")) : null;
    out.push({ code: "E_SCHEMA_ENUM", path, message: `${show(value)} is not allowed.`, fix: `Use one of: ${schema.enum.map(show).join(", ")}${near ? ` (closest: ${show(near)})` : ""}.` });
    return;
  }
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((t) => typeOk(value, t))) {
      out.push({ code: "E_SCHEMA_TYPE", path, message: `Expected ${types.join(" or ")}, got ${typeOf(value)}.`, fix: `Write ${path} as ${types.join(" or ")}.` });
      return;
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum || schema.maximum !== undefined && value > schema.maximum) {
      out.push({ code: "E_SCHEMA_RANGE", path, message: `${value} is out of range.`, fix: `Use a value from ${schema.minimum ?? "-∞"} to ${schema.maximum ?? "∞"}.` });
    }
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength || schema.maxLength !== undefined && value.length > schema.maxLength) {
      out.push({ code: "E_TEXT_LENGTH", path, message: `Text is ${value.length} characters.`, fix: `Use ${schema.minLength ?? 0} to ${schema.maxLength} characters.` });
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      out.push({ code: "E_SCHEMA_PATTERN", path, message: `${show(value)} has the wrong format.`, fix: path.endsWith("color") || /glow|headband|cape|hat|scarf/.test(path) ? 'Use a color like "#22aaff".' : "Use lowercase letters, digits and _ (start with a letter, max 24)." });
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems || schema.maxItems !== undefined && value.length > schema.maxItems) {
      out.push({ code: "E_SCHEMA_SIZE", path, message: `Has ${value.length} items.`, fix: `Use ${schema.minItems ?? 0} to ${schema.maxItems} items.` });
    }
    if (schema.items) value.forEach((v, i) => check(v, schema.items, `${path}[${i}]`, out));
  }
  if (typeOf(value) === "object") {
    for (const key of schema.required || []) {
      if (!(key in value)) out.push({ code: "E_SCHEMA_REQUIRED", path: path ? `${path}.${key}` : key, message: `Missing required field '${key}'.`, fix: `Add '${key}'.` });
    }
    const props = schema.properties || {};
    for (const [key, v] of Object.entries(value)) {
      const sub = path ? `${path}.${key}` : key;
      if (props[key]) check(v, props[key], sub, out);
      else if (schema.additionalProperties === false) {
        const near = closestMatch(key, Object.keys(props));
        out.push({ code: "E_SCHEMA_UNKNOWN_FIELD", path: sub, message: `Unknown field '${key}'.`, fix: near ? `Did you mean '${near}'?` : `Remove it. Allowed: ${Object.keys(props).join(", ")}.` });
      } else if (typeof schema.additionalProperties === "object") check(v, schema.additionalProperties, sub, out);
    }
  }
}

/** Structural issues for a script (spec 16.1). */
export function checkSchema(script) {
  const out = [];
  const size = JSON.stringify(script)?.length ?? 0;
  if (size > LIMITS.scriptBytes) {
    out.push({ code: "E_SCHEMA_SIZE", path: "", message: `Script is ${size} bytes.`, fix: `Keep scripts under ${LIMITS.scriptBytes} bytes.` });
    return out;
  }
  check(script, jsonSchema, "", out);
  return out;
}
