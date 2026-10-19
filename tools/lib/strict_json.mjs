// Strict JSON for bundle files (CATALOG_BUNDLE_SPEC 6.2 step 2): what JSON.parse accepts, minus duplicate
// keys, plus limits on nesting (32) and string length (4,096). A parse error carries `path` (the JSON path
// of the offending value) so the checker can point at it.

const MAX_DEPTH = 32;
const MAX_STRING = 4096;

/**
 * @param {string} text
 * @returns {any}
 * @throws {Error & { path?: string }}
 */
export function strictParse(text) {
  if (text.charCodeAt(0) === 0xfeff) throw fail("The file starts with a byte-order mark.", "");
  const s = new Scanner(text);
  s.ws();
  const value = s.value("", 0);
  s.ws();
  if (s.i < text.length) throw fail(`Unexpected text after the JSON value at offset ${s.i}.`, "");
  return value;
}

function fail(message, path) {
  const err = new Error(message);
  err.path = path;
  return err;
}

class Scanner {
  constructor(text) { this.t = text; this.i = 0; }
  ws() { while (this.i < this.t.length && " \t\n\r".includes(this.t[this.i])) this.i++; }
  value(path, depth) {
    if (depth > MAX_DEPTH) throw fail(`Nesting deeper than ${MAX_DEPTH} levels.`, path);
    const c = this.t[this.i];
    if (c === "{") return this.object(path, depth);
    if (c === "[") return this.array(path, depth);
    if (c === '"') return this.string(path);
    const m = /^(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(this.t.slice(this.i, this.i + 64));
    if (!m) throw fail(`Unexpected character '${c ?? "end of file"}' at offset ${this.i}.`, path);
    this.i += m[0].length;
    return JSON.parse(m[0]);
  }
  string(path) {
    const start = this.i++;
    while (this.i < this.t.length) {
      const c = this.t[this.i];
      if (c === "\\") this.i += 2;
      else if (c === '"') break;
      else if (c < " ") throw fail("A control character inside a string.", path);
      else this.i++;
    }
    if (this.t[this.i] !== '"') throw fail("An unterminated string.", path);
    const raw = this.t.slice(start, ++this.i);
    if (raw.length - 2 > MAX_STRING) throw fail(`A string longer than ${MAX_STRING} characters.`, path);
    try { return JSON.parse(raw); } catch { throw fail("A bad escape in a string.", path); }
  }
  array(path, depth) {
    this.i++;
    const out = [];
    this.ws();
    if (this.t[this.i] === "]") { this.i++; return out; }
    for (;;) {
      this.ws();
      out.push(this.value(`${path}[${out.length}]`, depth + 1));
      this.ws();
      const c = this.t[this.i++];
      if (c === "]") return out;
      if (c !== ",") throw fail(`Expected ',' or ']' at offset ${this.i - 1}.`, path);
    }
  }
  object(path, depth) {
    this.i++;
    const out = {};
    this.ws();
    if (this.t[this.i] === "}") { this.i++; return out; }
    for (;;) {
      this.ws();
      if (this.t[this.i] !== '"') throw fail(`Expected a key at offset ${this.i}.`, path);
      const key = this.string(path);
      const sub = path ? `${path}.${key}` : key;
      if (Object.prototype.hasOwnProperty.call(out, key)) throw fail(`Duplicate key '${key}'.`, sub);
      this.ws();
      if (this.t[this.i++] !== ":") throw fail(`Expected ':' after key '${key}'.`, sub);
      this.ws();
      out[key] = this.value(sub, depth + 1);
      this.ws();
      const c = this.t[this.i++];
      if (c === "}") return out;
      if (c !== ",") throw fail(`Expected ',' or '}' at offset ${this.i - 1}.`, path);
    }
  }
}
