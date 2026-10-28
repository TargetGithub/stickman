// The workbook script schema (WORKBOOK_SPEC 4): { kind: "workbook", version: 1, ... }. Checked with the same
// schema checker as video scripts (validator/check_value.js); the activity branches come from the registry.

import { ACTIVITIES } from "./activities/index.js";
import { ART_SCHEMA } from "./art.js";
import { GRADES, PAGE_SIZES, LAYOUTS } from "./grades.js";

const ID = { type: "string", pattern: "^[a-z][a-z0-9_]{0,23}$" };
const TEXT = (max) => ({ type: "string", minLength: 1, maxLength: max });
const SLOT = { oneOf: [{ type: "integer", minimum: 0, maximum: 5 }, { type: "array", minItems: 2, maxItems: 2, items: { type: "integer", minimum: 0, maximum: 5 } }],
  "x-formMessage": "A slot index (0-5) or a span [first, last]." };
const HEADER_ART = { type: "object", required: ["preset"], additionalProperties: false, properties: {
  preset: { type: "string" }, pose: { type: "string" }, face: { type: "string" }, facing: { enum: [1, -1] },
}, description: "A character beside the page title." };

function blockSchema() {
  const branches = Object.values(ACTIVITIES).map((a) => ({
    type: "object",
    required: ["activity", ...a.required],
    additionalProperties: false,
    properties: {
      activity: { const: a.name },
      slot: SLOT,
      instructions: TEXT(160),
      ...a.params,
    },
  }));
  return { oneOf: branches, "x-discriminator": "activity" };
}

const PAGE = {
  type: "object",
  required: ["id", "blocks"],
  additionalProperties: false,
  properties: {
    id: ID,
    title: TEXT(40),
    instructions: TEXT(160),
    layout: { enum: Object.keys(LAYOUTS) },
    blocks: { type: "array", minItems: 1, maxItems: 6, items: { $ref: "#/$defs/block" } },
    art: HEADER_ART,
  },
};

const COVER = { type: "object", additionalProperties: false, properties: {
  subtitle: TEXT(60),
  art: { type: "array", minItems: 1, maxItems: 4, items: ART_SCHEMA },
} };

const DOCUMENT = {
  oneOf: [
    { type: "object", required: ["id", "pages"], additionalProperties: false, properties: {
      id: ID, title: TEXT(60), cover: COVER, pages: { type: "array", minItems: 1, maxItems: 64, items: PAGE },
    } },
    { type: "object", required: ["id", "answersFor"], additionalProperties: false, properties: {
      id: ID, title: TEXT(60), cover: COVER, answersFor: ID, answerStyle: { enum: ["overlay"] },
    } },
  ],
  "x-select": "answersFor",
};

/** The workbook schema (version 1). */
export function workbookSchema() {
  return {
    type: "object",
    required: ["kind", "version", "title", "seed", "grade", "documents"],
    additionalProperties: false,
    properties: {
      kind: { const: "workbook" },
      version: { const: 1 },
      title: TEXT(60),
      seed: { type: "integer", minimum: 0, maximum: 2147483647 },
      grade: { enum: GRADES },
      page: { type: "object", additionalProperties: false, properties: {
        size: { enum: Object.keys(PAGE_SIZES) },
        margin: { type: "number", minimum: 27, maximum: 72 },
        orientation: { enum: ["portrait", "landscape"] },
      } },
      style: { type: "object", additionalProperties: false, properties: {
        cast: { type: "array", maxItems: 8, items: { type: "string" }, uniqueItems: true },
        nameLine: { type: "boolean" },
        pageNumbers: { type: "boolean" },
        font: { enum: ["andika"] },
      } },
      documents: { type: "array", minItems: 1, maxItems: 6, items: DOCUMENT },
    },
    $defs: { block: blockSchema() },
  };
}
