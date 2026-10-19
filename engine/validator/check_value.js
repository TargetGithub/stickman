// The schema checker: the subset of JSON Schema (draft 2020-12) that the script schemas, the macro
// params and the catalog and bundle schemas use. Pure: $refs to other files resolve through documents
// the caller passes in (opts.schemas); the checker does no I/O.

import { closestMatch } from "./report.js";

// Keywords: type, enum, const, oneOf, minimum/maximum, minLength/maxLength, pattern, minItems/maxItems,
// uniqueItems, items, required, properties, additionalProperties, propertyNames, minProperties/maxProperties,
// $ref ("#/$defs/x" in the same document, "<file>#/$defs/x" from opts.schemas), and the checker-only
// x-select, x-discriminator and x-formMessage.

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
const typeOk = (v, t) => (t === "number" ? typeof v === "number" && Number.isFinite(v) : t === "integer" ? Number.isInteger(v) : typeOf(v) === t);
const show = (v) => JSON.stringify(v);

const ANNOTATIONS = new Set(["$ref", "description", "title", "$comment"]);

/** The schema a $ref points at, and the document its own local refs resolve in. */
function resolveRef(ref, ctx) {
  const hash = ref.indexOf("#");
  const file = hash < 0 ? ref : ref.slice(0, hash);
  const root = file ? ctx.schemas?.[file] : ctx.root;
  if (!root) throw new Error(`Schema $ref to unknown document '${file}' (pass it in opts.schemas).`);
  let node = root;
  for (const seg of (hash < 0 ? "" : ref.slice(hash + 1)).split("/").slice(1)) {
    node = node?.[seg.replace(/~1/g, "/").replace(/~0/g, "~")];
    if (node === undefined) throw new Error(`Schema $ref '${ref}' points at nothing.`);
  }
  return { schema: node, ctx: root === ctx.root ? ctx : { ...ctx, root } };
}

/** Follow $refs that carry nothing else (only annotations), so branch logic sees the real schema. */
function deref(schema, ctx) {
  let cur = { schema, ctx };
  for (let n = 0; cur.schema.$ref && Object.keys(cur.schema).every((k) => ANNOTATIONS.has(k)); n++) {
    if (n > 32) throw new Error(`Schema $ref loop at '${cur.schema.$ref}'.`);
    cur = resolveRef(cur.schema.$ref, cur.ctx);
  }
  return cur;
}

/** Stable text of a JSON value (keys sorted), for uniqueItems. */
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}` : JSON.stringify(v));

function check(value, schema, path, out, ctx) {
  if (schema.$ref) {
    const target = resolveRef(schema.$ref, ctx);
    check(value, target.schema, path, out, target.ctx);
    if (Object.keys(schema).every((k) => ANNOTATIONS.has(k))) return;
  }
  if (schema.oneOf) {
    const branches = schema.oneOf.map((b) => deref(b, ctx));
    // x-discriminator (checker-only): the branch whose const matches this field's value is the one to report.
    const field = schema["x-discriminator"];
    if (field && typeOf(value) === "object") {
      const sub = path ? `${path}.${field}` : field;
      if (!(field in value)) {
        out.push({ code: "E_SCHEMA_REQUIRED", path: sub, message: `Missing required field '${field}'.`, fix: `Add '${field}'.` });
        return;
      }
      const consts = branches.map((b) => b.schema.properties?.[field]?.const);
      const hit = consts.indexOf(value[field]);
      if (hit >= 0) {
        check(value, branches[hit].schema, path, out, branches[hit].ctx);
        return;
      }
      const near = typeof value[field] === "string" ? closestMatch(value[field], consts.filter((c) => typeof c === "string")) : null;
      out.push({ code: "E_SCHEMA_ENUM", path: sub, message: `${show(value[field])} is not allowed.`, fix: `Use one of: ${consts.map(show).join(", ")}${near ? ` (closest: ${show(near)})` : ""}.` });
      return;
    }
    // x-select (checker-only): the presence of this key picks the branch, for precise messages.
    const key = schema["x-select"];
    const picked = key && typeOf(value) === "object" && branches.find((b) => (b.schema.required || []).includes(key) === key in value);
    if (picked) {
      check(value, picked.schema, path, out, picked.ctx);
      return;
    }
    const results = branches.map((branch) => {
      const issues = [];
      check(value, branch.schema, path, issues, branch.ctx);
      return issues;
    });
    if (results.some((r) => r.length === 0)) return;
    // If exactly one branch has the right shape (type, plus its required key), report that branch's
    // specific problems (e.g. a range error) instead of the generic form message.
    const shaped = branches
      .map(({ schema: b }, i) => ({ b, i }))
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
    if (schema.uniqueItems) {
      const seen = new Map();
      value.forEach((v, i) => {
        const k = canon(v);
        if (seen.has(k)) out.push({ code: "E_REF_DUPLICATE", path: `${path}[${i}]`, message: `${show(v)} is listed twice (also at [${seen.get(k)}]).`, fix: "List each item once." });
        else seen.set(k, i);
      });
    }
    if (schema.items) value.forEach((v, i) => check(v, schema.items, `${path}[${i}]`, out, ctx));
  }
  if (typeOf(value) === "object") {
    const n = Object.keys(value).length;
    if (schema.minProperties !== undefined && n < schema.minProperties || schema.maxProperties !== undefined && n > schema.maxProperties) {
      out.push({ code: "E_SCHEMA_SIZE", path, message: `Has ${n} fields.`, fix: `Use ${schema.minProperties ?? 0} to ${schema.maxProperties ?? "any number of"} fields.` });
    }
    if (schema.propertyNames) {
      for (const key of Object.keys(value)) {
        for (const i of checkValue(key, schema.propertyNames, path ? `${path}.${key}` : key, { schemas: ctx.schemas, root: ctx.root })) out.push({ ...i, message: `Name ${show(key)}: ${i.message}` });
      }
    }
    for (const key of schema.required || []) {
      if (!(key in value)) out.push({ code: "E_SCHEMA_REQUIRED", path: path ? `${path}.${key}` : key, message: `Missing required field '${key}'.`, fix: `Add '${key}'.` });
    }
    const props = schema.properties || {};
    for (const [key, v] of Object.entries(value)) {
      const sub = path ? `${path}.${key}` : key;
      if (props[key]) check(v, props[key], sub, out, ctx);
      else if (schema.additionalProperties === false) {
        const near = closestMatch(key, Object.keys(props));
        out.push({ code: "E_SCHEMA_UNKNOWN_FIELD", path: sub, message: `Unknown field '${key}'.`, fix: near ? `Did you mean '${near}'?` : `Remove it. Allowed: ${Object.keys(props).join(", ")}.` });
      } else if (typeof schema.additionalProperties === "object") check(v, schema.additionalProperties, sub, out, ctx);
    }
  }
}

/**
 * Structural issues for any value against a schema in the subset above (used for v2, macro params,
 * catalog and bundle files).
 * @param {{ schemas?: Record<string, object>, root?: object }} [opts]  schemas: documents that
 *   "<file>#/$defs/x" refs name (by file name, e.g. "common.schema.json"); root: the document "#/..." refs
 *   resolve in (default: schema itself). The checker does no I/O; the caller passes the documents.
 */
export function checkValue(value, schema, path = "", opts = {}) {
  const out = [];
  check(value, schema, path, out, { schemas: opts.schemas, root: opts.root ?? schema });
  return out;
}
