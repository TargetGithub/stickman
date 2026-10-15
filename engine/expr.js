// Safe arithmetic evaluator for move params (no eval).
// Milestone: M0. Spec: section 8.1. Interfaces: docs/ARCHITECTURE.md section 4.
//
// Grammar:
//   expr   := term (('+' | '-') term)*
//   term   := unary (('*' | '/') unary)*
//   unary  := '-' unary | atom
//   atom   := number | name | '(' expr ')'

export class ExprError extends Error {}

const TOKEN = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|([-+*/()]))/y;
const MAX_LENGTH = 200;

function tokenize(src) {
  if (src.length > MAX_LENGTH) throw new ExprError(`expression longer than ${MAX_LENGTH} characters`);
  const tokens = [];
  TOKEN.lastIndex = 0;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (!m) throw new ExprError(`unexpected character '${src.slice(pos).trim()[0]}' in "${src}"`);
    if (m[1] !== undefined) tokens.push({ kind: "num", value: Number(m[1]) });
    else if (m[2] !== undefined) tokens.push({ kind: "name", value: m[2] });
    else tokens.push({ kind: "op", value: m[3] });
    pos = TOKEN.lastIndex;
  }
  return tokens;
}

/** Compile '+ - * / ( )', numbers and param names into (params) => number. */
export function compileExpr(src, allowedNames) {
  const tokens = tokenize(String(src));
  const allowed = new Set(allowedNames);
  let i = 0;

  const peek = () => tokens[i];
  const isOp = (v) => tokens[i] && tokens[i].kind === "op" && tokens[i].value === v;

  function atom() {
    const t = tokens[i++];
    if (!t) throw new ExprError(`unexpected end of "${src}"`);
    if (t.kind === "num") {
      const v = t.value;
      return () => v;
    }
    if (t.kind === "name") {
      if (!allowed.has(t.value)) {
        throw new ExprError(`unknown name '${t.value}' in "${src}" (allowed: ${[...allowed].join(", ") || "none"})`);
      }
      const name = t.value;
      return (p) => {
        const v = p[name];
        if (typeof v !== "number" || !Number.isFinite(v)) throw new ExprError(`param '${name}' is not a number`);
        return v;
      };
    }
    if (t.value === "(") {
      const inner = expr();
      if (!isOp(")")) throw new ExprError(`missing ')' in "${src}"`);
      i++;
      return inner;
    }
    throw new ExprError(`unexpected '${t.value}' in "${src}"`);
  }

  function unary() {
    if (isOp("-")) {
      i++;
      const f = unary();
      return (p) => -f(p);
    }
    return atom();
  }

  function term() {
    let f = unary();
    while (isOp("*") || isOp("/")) {
      const op = tokens[i++].value;
      const a = f;
      const b = unary();
      f = op === "*" ? (p) => a(p) * b(p) : (p) => a(p) / b(p);
    }
    return f;
  }

  function expr() {
    let f = term();
    while (isOp("+") || isOp("-")) {
      const op = tokens[i++].value;
      const a = f;
      const b = term();
      f = op === "+" ? (p) => a(p) + b(p) : (p) => a(p) - b(p);
    }
    return f;
  }

  if (tokens.length === 0) throw new ExprError("empty expression");
  const fn = expr();
  if (peek()) throw new ExprError(`unexpected '${peek().value}' in "${src}"`);
  return (params) => {
    const v = fn(params);
    if (!Number.isFinite(v)) throw new ExprError(`"${src}" evaluated to ${v}`);
    return v;
  };
}

const cache = new Map();

/** Return value if number, else evaluate the expression string against params. */
export function evalParam(value, params) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") throw new ExprError(`expected number or expression, got ${typeof value}`);
  const names = Object.keys(params).sort();
  const key = value + "|" + names.join(",");
  let fn = cache.get(key);
  if (!fn) {
    fn = compileExpr(value, names);
    cache.set(key, fn);
  }
  return fn(params);
}
