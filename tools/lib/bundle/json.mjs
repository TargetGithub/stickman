// Strict JSON for bundle files (CATALOG_BUNDLE_SPEC 4.1, step 2): UTF-8 without a BOM, the JSON grammar
// only (no comments, trailing commas, NaN or Infinity), duplicate keys rejected, nesting and string
// length capped. canonical() is RFC 8785 (JCS): keys sorted by UTF-16 code units, no whitespace,
// ECMAScript number and string formatting. Pure; runs in Node and the browser.

export const JSON_LIMITS = { depth: 32, string: 4096, text: 64 * 1024 };

export class BundleJsonError extends Error {
  constructor(message, at) {
    super(message);
    this.at = at;
  }
}

/** Bytes → string, strictly: invalid UTF-8 or a BOM is an error. */
export function decodeUtf8(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new BundleJsonError("the file starts with a byte order mark (BOM)", 0);
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new BundleJsonError("the file is not valid UTF-8", 0);
  }
}

/**
 * Parse strict JSON. Throws BundleJsonError with a short reason and the character offset.
 * @param {string} text
 * @param {{ depth?: number, string?: number }} [limits]
 */
export function parseStrict(text, limits = JSON_LIMITS) {
  let i = 0;
  const fail = (msg) => {
    const line = text.slice(0, i).split("\n").length;
    throw new BundleJsonError(`${msg} (line ${line})`, i);
  };
  const ws = () => {
    while (i < text.length && (text[i] === " " || text[i] === "\t" || text[i] === "\n" || text[i] === "\r")) i++;
  };
  const str = () => {
    i++; // opening quote
    let out = "";
    for (;;) {
      if (i >= text.length) fail("unterminated string");
      const c = text[i];
      if (c === '"') break;
      if (c === "\\") {
        const e = text[++i];
        const simple = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" }[e];
        if (simple !== undefined) { out += simple; i++; continue; }
        if (e !== "u" || !/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) fail("bad escape in a string");
        out += String.fromCharCode(parseInt(text.slice(i + 1, i + 5), 16));
        i += 5;
        continue;
      }
      if (c.charCodeAt(0) < 0x20) fail("control character in a string");
      out += c;
      i++;
    }
    i++;
    if (out.length > (limits.string ?? JSON_LIMITS.string)) fail(`a string is longer than ${limits.string ?? JSON_LIMITS.string} characters`);
    return out;
  };
  const NUM = /-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/y;
  const value = (depth) => {
    if (depth > (limits.depth ?? JSON_LIMITS.depth)) fail(`nested deeper than ${limits.depth ?? JSON_LIMITS.depth} levels`);
    ws();
    const c = text[i];
    if (c === "{") {
      i++;
      const entries = [];
      const seen = new Set();
      ws();
      if (text[i] === "}") { i++; return {}; }
      for (;;) {
        ws();
        if (text[i] !== '"') fail("expected a quoted key");
        const key = str();
        if (seen.has(key)) fail(`duplicate key "${key}"`);
        seen.add(key);
        ws();
        if (text[i] !== ":") fail("expected ':'");
        i++;
        entries.push([key, value(depth + 1)]);
        ws();
        if (text[i] === ",") { i++; continue; }
        if (text[i] === "}") { i++; break; }
        fail("expected ',' or '}'");
      }
      return Object.fromEntries(entries); // CreateDataProperty: "__proto__" stays a plain key
    }
    if (c === "[") {
      i++;
      const arr = [];
      ws();
      if (text[i] === "]") { i++; return arr; }
      for (;;) {
        arr.push(value(depth + 1));
        ws();
        if (text[i] === ",") { i++; continue; }
        if (text[i] === "]") { i++; break; }
        fail("expected ',' or ']'");
      }
      return arr;
    }
    if (c === '"') return str();
    for (const [word, v] of [["true", true], ["false", false], ["null", null]]) {
      if (text.startsWith(word, i)) { i += word.length; return v; }
    }
    NUM.lastIndex = i;
    const m = NUM.exec(text);
    if (!m || !m[0].length || m[0] === "-") fail(c === undefined ? "unexpected end of the file" : `unexpected character '${c}'`);
    i += m[0].length;
    const n = Number(m[0]);
    if (!Number.isFinite(n)) fail("a number is too large");
    return n;
  };
  const v = value(1);
  ws();
  if (i < text.length) fail("extra content after the JSON value");
  return v;
}

/** RFC 8785 canonical JSON text of a parsed value. */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

/** README / LICENSE: text with line endings normalized to \n (what gets hashed). */
export const normalizeText = (s) => s.replace(/\r\n?/g, "\n");

/** Text files may hold only \n and \t below U+0020 (step 2). */
export function textIssue(s) {
  if (s.length > JSON_LIMITS.text) return `longer than ${JSON_LIMITS.text} characters`;
  // eslint-disable-next-line no-control-regex
  const bad = s.match(/[\x00-\x08\x0b-\x1f\x7f]/);
  return bad ? `control character U+${bad[0].charCodeAt(0).toString(16).padStart(4, "0")}` : null;
}
