// Math problems from a template (WORKBOOK_SPEC 8.4, education/math.json): seeded operands within the template's
// ranges and rules (result limit, regrouping or not, exact or remainder division, decimals). Pure.

const TRIES = 200;

/** A random integer in [lo, hi], or a pick from a list. */
const draw = (range, set, rng) => (set ? set[Math.floor(rng() * set.length)] : range[0] + Math.floor(rng() * (range[1] - range[0] + 1)));

const digits = (n) => String(Math.abs(n)).split("").reverse().map(Number);

/** Does a + b carry in any column? */
export function carries(a, b) {
  const x = digits(a);
  const y = digits(b);
  let c = 0;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    c = (x[i] || 0) + (y[i] || 0) + c >= 10 ? 1 : 0;
    if (c) return true;
  }
  return false;
}

/** Does a - b (a >= b) borrow in any column? */
export function borrows(a, b) {
  const x = digits(a);
  const y = digits(b);
  return y.some((d, i) => d > (x[i] || 0));
}

/** A number shown with the template's decimals (integers stored as tenths or hundredths). */
export const show = (n, decimals = 0) => (decimals ? (n / 10 ** decimals).toFixed(decimals) : String(n));

/** One problem: { a, b, op, result, remainder } with integers (decimals are applied when shown), or null. */
export function makeProblem(t, rng) {
  for (let k = 0; k < TRIES; k++) {
    if (t.op === "÷") {
      const b = draw(t.b, t.bSet, rng);
      const q = draw(t.quotient || [1, 10], null, rng);
      const rem = t.remainder ? Math.floor(rng() * b) : 0;
      if (b === 0) continue;
      if (t.remainder === true && rem === 0 && b > 1) continue; // remainder practice: every problem has one
      return { op: "÷", a: b * q + rem, b, result: q, remainder: rem };
    }
    let a = draw(t.a, t.aSet, rng);
    let b = draw(t.b, t.bSet, rng);
    if (t.op === "-" && a < b) [a, b] = [b, a];
    const result = t.op === "+" ? a + b : t.op === "-" ? a - b : a * b;
    if (t.max != null && result > t.max) continue;
    if (t.min != null && result < t.min) continue;
    if (t.regroup != null && t.op === "+" && carries(a, b) !== t.regroup) continue;
    if (t.regroup != null && t.op === "-" && borrows(a, b) !== t.regroup) continue;
    return { op: t.op, a, b, result, remainder: 0 };
  }
  return null;
}

/** n problems, no two the same while the template allows it. */
export function makeProblems(t, n, rng) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    let p = null;
    for (let k = 0; k < 20; k++) {
      const c = makeProblem(t, rng);
      if (!c) break;
      p = c;
      if (!seen.has(`${c.a}${c.op}${c.b}`)) break;
    }
    if (!p) return null;
    seen.add(`${p.a}${p.op}${p.b}`);
    out.push(p);
  }
  return out;
}

/** The answer as printed: "7", "7 R2", "3.5". */
export const answerText = (p, decimals = 0) => (p.remainder ? `${p.result} R${p.remainder}` : show(p.result, p.op === "×" || p.op === "÷" ? 0 : decimals));

/**
 * The tokens of a horizontal number sentence; the missing part ("answer", "a" or "b") is a blank.
 * @returns {(string|{blank:true, answer:string})[]}
 */
export function sentence(p, missing = "answer", decimals = 0) {
  const s = (n) => show(n, decimals);
  const blank = (answer) => ({ blank: true, answer });
  const ans = answerText(p, decimals);
  if (missing === "a") return [blank(s(p.a)), p.op, s(p.b), "=", ans];
  if (missing === "b") return [s(p.a), p.op, blank(s(p.b)), "=", ans];
  return [s(p.a), p.op, s(p.b), "=", blank(ans)];
}
