// Validator entry point: schema → semantics → dry run (spec 16). Milestone M3.
export { jsonSchema } from "./schema.js";

/** @returns {{ ok:boolean, errors:Array, warnings:Array, timeline:string }} */
export function validate(script, catalog) {
  throw new Error("not implemented: validate");
}
