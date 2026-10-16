// Serialize move/pose data as JS literals in the house style of /data (unquoted keys, compact arrays).

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function num(v) {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
}

/** Inline literal: { a: 1, b: "x" } / [1, 2]. */
export function inline(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return num(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.map(inline).join(", ")}]`;
  const parts = Object.entries(v)
    .filter(([, x]) => x !== undefined)
    .map(([k, x]) => `${IDENT.test(k) ? k : JSON.stringify(k)}: ${inline(x)}`);
  return parts.length ? `{ ${parts.join(", ")} }` : "{}";
}

/** A move as a multi-line literal: scalar fields inline, arrays one entry per line. */
export function serializeMove(move, indent = "  ") {
  const order = ["name", "category", "duration", "params", "needsProp", "mouth", "flags", "chain", "keys", "root", "hits", "events"];
  const keys = [...order.filter((k) => k in move), ...Object.keys(move).filter((k) => !order.includes(k))];
  const lines = ["{"];
  for (const k of keys) {
    const v = move[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length && typeof v[0] === "object") {
      lines.push(`${indent}${k}: [`);
      for (const item of v) lines.push(`${indent}  ${inline(item)},`);
      lines.push(`${indent}],`);
    } else if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) {
      continue;
    } else {
      lines.push(`${indent}${k}: ${inline(v)},`);
    }
  }
  lines.push("}");
  return lines.join("\n");
}
