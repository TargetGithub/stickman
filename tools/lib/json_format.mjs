// Stable, diff-friendly JSON for catalog files: 2-space indent, and any object or array whose one-line
// form fits in `width` columns stays on one line (keyframes, layers, short lists), and so does any object or
// array of plain values (a pose, a color list) however long. Same input → same bytes.

/**
 * @param {unknown} value  plain JSON data
 * @param {number} [width]
 * @returns {string}  with a trailing newline
 */
export function formatJson(value, width = 120) {
  return `${fmt(value, "", width)}\n`;
}

function fmt(v, indent, width) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  const flat = oneLine(v);
  const leaf = Object.values(v).every((x) => x === null || typeof x !== "object");
  if (leaf || indent.length + flat.length <= width) return flat;
  const inner = `${indent}  `;
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    return `[\n${v.map((x) => inner + fmt(x, inner, width)).join(",\n")}\n${indent}]`;
  }
  const keys = Object.keys(v);
  if (!keys.length) return "{}";
  return `{\n${keys.map((k) => `${inner}${JSON.stringify(k)}: ${fmt(v[k], inner, width)}`).join(",\n")}\n${indent}}`;
}

function oneLine(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(oneLine).join(", ")}]`;
  return `{ ${Object.keys(v).map((k) => `${JSON.stringify(k)}: ${oneLine(v[k])}`).join(", ")} }`.replace("{  }", "{}");
}
