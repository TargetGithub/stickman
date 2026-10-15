// Structural validation and exported JSON Schema.
// Milestone: M3. Spec: section 16.1. Interfaces: docs/ARCHITECTURE.md section 4.

/** JSON Schema for scripts, also used for LLM structured output (spec 18.3). Filled in M3.4. */
export const jsonSchema = { $schema: "https://json-schema.org/draft/2020-12/schema", title: "StickmanScript", type: "object" };

/** Return Issue[] for structural problems. */
export function checkSchema(script) {
  throw new Error("not implemented: checkSchema");
}
