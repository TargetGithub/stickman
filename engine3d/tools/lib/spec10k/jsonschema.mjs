// A small JSON Schema (draft 2020-12) validator for the keywords spec.schema.json uses: type, const, enum,
// required, properties, additionalProperties: false, items, minItems, maxItems, minLength, maxLength, pattern,
// minimum, maximum, oneOf and local $ref (#/$defs/...). No dependencies; unknown keywords are ignored.

/** @param {unknown} v */
function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

function typeOk(want, v) {
  const t = typeOf(v);
  return want === t || (want === "number" && t === "integer");
}

/**
 * Validate a value against a schema.
 * @param {object} schema  the root schema (for $ref)
 * @param {unknown} value
 * @returns {string[]}  errors as "path: message" (empty when valid)
 */
export function validateSchema(schema, value) {
  const errors = [];
  const resolve = (ref) => {
    if (!ref.startsWith("#/")) throw new Error(`only local $ref is supported (${ref})`);
    return ref.slice(2).split("/").reduce((o, k) => o?.[k], schema);
  };
  const walk = (s, v, path, out) => {
    if (s.$ref) return walk(resolve(s.$ref), v, path, out);
    const at = path || "(root)";
    if (s.oneOf) {
      const passing = s.oneOf.filter((alt) => { const e = []; walk(alt, v, path, e); return e.length === 0; });
      if (passing.length !== 1) {
        if (passing.length === 0) {
          // Report the alternative whose type matches, so the message is useful.
          const alt = s.oneOf.find((a) => !a.type || typeOk(a.type, v));
          if (alt) walk(alt, v, path, out); else out.push(`${at}: matches none of the allowed forms`);
        } else out.push(`${at}: matches more than one allowed form`);
      }
      return;
    }
    if (s.type && !typeOk(s.type, v)) { out.push(`${at}: expected ${s.type}, got ${typeOf(v)}`); return; }
    if ("const" in s && v !== s.const) out.push(`${at}: must be ${JSON.stringify(s.const)}`);
    if (s.enum && !s.enum.includes(v)) out.push(`${at}: must be one of ${s.enum.join(", ")} (got ${JSON.stringify(v)})`);
    if (typeof v === "string") {
      if (s.minLength != null && v.length < s.minLength) out.push(`${at}: shorter than ${s.minLength} characters`);
      if (s.maxLength != null && v.length > s.maxLength) out.push(`${at}: longer than ${s.maxLength} characters (${v.length})`);
      if (s.pattern && !new RegExp(s.pattern, "u").test(v)) out.push(`${at}: ${JSON.stringify(v)} does not match ${s.pattern}`);
    }
    if (typeof v === "number") {
      if (s.minimum != null && v < s.minimum) out.push(`${at}: below the minimum ${s.minimum}`);
      if (s.maximum != null && v > s.maximum) out.push(`${at}: above the maximum ${s.maximum}`);
    }
    if (Array.isArray(v)) {
      if (s.minItems != null && v.length < s.minItems) out.push(`${at}: needs at least ${s.minItems} items (has ${v.length})`);
      if (s.maxItems != null && v.length > s.maxItems) out.push(`${at}: at most ${s.maxItems} items (has ${v.length})`);
      if (s.items) v.forEach((x, i) => walk(s.items, x, `${path}[${i}]`, out));
    }
    if (typeOf(v) === "object") {
      for (const k of s.required ?? []) if (!(k in v)) out.push(`${at}: missing required field "${k}"`);
      for (const [k, x] of Object.entries(v)) {
        const p = path ? `${path}.${k}` : k;
        if (s.properties?.[k]) walk(s.properties[k], x, p, out);
        else if (s.additionalProperties === false) out.push(`${at}: unknown field "${k}"`);
      }
    }
  };
  walk(schema, value, "", errors);
  return errors;
}
