// coins (WORKBOOK_SPEC 5): rows of coins and bills (education/math.json `money`, drawn as plain labelled circles
// and notes, no real coin art); the child counts the money and writes the total. Totals are given or drawn from
// the stream within the grade's limit. The key writes each total in red.

import { gridCells } from "./qa_items.js";

const DEFAULT_COINS = { prek: ["penny"], k: ["penny"], 1: ["penny", "nickel", "dime"], 2: ["penny", "nickel", "dime", "quarter"], 3: ["penny", "nickel", "dime", "quarter", "dollar"], 4: ["penny", "nickel", "dime", "quarter", "dollar", "five"], 5: ["penny", "nickel", "dime", "quarter", "dollar", "five"] };
const MAX_PIECES = 9;

/** Cents as printed: "47¢" under a dollar, "$1.35" from a dollar up. */
export const moneyText = (c) => (c < 100 ? `${c}¢` : `$${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`);

/** Pieces (money names, largest first) that add up to cents, using only `names`; null when it cannot. */
export function makeChange(cents, names, money, rng) {
  const vals = names.map((n) => [n, money[n].value]).sort((a, b) => b[1] - a[1]);
  for (let t = 0; t < 40; t++) {
    let left = cents;
    const out = [];
    for (const [n, v] of vals) {
      // Take a random number of this piece (up to what fits), leaving the rest to smaller pieces.
      const most = Math.floor(left / v);
      const smaller = vals.some(([, w]) => w < v);
      const k = smaller ? Math.floor(rng() * (most + 1)) : most;
      for (let i = 0; i < k; i++) out.push(n);
      left -= k * v;
    }
    if (left === 0 && out.length <= MAX_PIECES) return out;
  }
  // Fall back to the fewest pieces.
  let left = cents;
  const out = [];
  for (const [n, v] of vals) while (left >= v) out.push(n), (left -= v);
  return left === 0 && out.length <= MAX_PIECES ? out : null;
}

export const coins = {
  name: "coins",
  params: {
    totals: { type: "array", minItems: 1, maxItems: 6, items: { type: "integer", minimum: 1, maximum: 2000 }, description: "Amounts in cents, one per row (default: drawn from the stream)." },
    count: { type: "integer", minimum: 1, maximum: 6, description: "How many rows when totals are not given (default 4)." },
    use: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" }, uniqueItems: true, description: "Money names to use (default by grade: pennies in K, nickels and dimes in 1, quarters in 2, dollars from 3)." },
    max: { type: "integer", minimum: 2, maximum: 2000, description: "The largest drawn total in cents (default by grade)." },
  },
  required: [],
  artPaths: () => [],
  check(block, path, catalog) {
    const money = catalog.education?.math?.money || {};
    return (block.use || []).flatMap((n, i) => (money[n] ? [] : [{ code: "E_WB_SOURCE", path: `${path}.use[${i}]`, message: `No money named '${n}'.`, fix: `Use: ${Object.keys(money).join(", ")}.` }]));
  },
  generate(block, box, env) {
    const money = env.catalog.education.math.money;
    const use = block.use ?? DEFAULT_COINS[env.grade];
    const smallest = Math.min(...use.map((n) => money[n].value));
    const max = block.max ?? Math.min(MAX_PIECES * Math.max(...use.map((n) => money[n].value)), { prek: 5, k: 10, 1: 50, 2: 100, 3: 500, 4: 1000, 5: 2000 }[env.grade]);
    const totals = block.totals ?? Array.from({ length: block.count ?? 4 }, () => smallest * (1 + Math.floor(env.rng() * Math.max(1, Math.floor(max / smallest)))));
    const r = env.rules;
    const cells = gridCells(box, totals.length, 1);
    const items = [];
    const answers = [];
    const issues = [];
    totals.forEach((cents, i) => {
      const c = cells[i];
      const pieces = makeChange(cents, use, money, env.rng);
      if (!pieces) {
        issues.push({ code: "E_WB_VALUE", path: block.totals ? `totals[${i}]` : "max", message: `${moneyText(cents)} cannot be made from ${use.join(", ")} in ${MAX_PIECES} pieces or fewer.`, fix: "Use another amount or allow more kinds of money." });
        return;
      }
      const ansW = Math.min(c.w * 0.24, r.body * 5);
      const areaW = c.w - ansW - 16;
      const unit = Math.min(c.h * 0.42, areaW / (pieces.reduce((s, n) => s + (money[n].kind === "bill" ? 2.3 : 1.05), 0) + 0.5));
      if (unit < r.minItem * 0.35) issues.push({ code: "E_WB_FIT", path: "totals", message: "The money does not fit the row at a readable size.", fix: "Use smaller totals or fewer rows." });
      let x = c.x + 4;
      const cy = c.y + c.h / 2;
      for (const n of pieces) {
        const m = money[n];
        if (m.kind === "bill") {
          items.push({ type: "rect", x, y: cy - unit * 0.5, w: unit * 2.1, h: unit, radius: 4, width: r.weight * 0.6 },
            { type: "rect", x: x + unit * 0.12, y: cy - unit * 0.38, w: unit * 1.86, h: unit * 0.76, radius: 3, width: 0.8 },
            { type: "text", x, y: cy - unit * 0.35, w: unit * 2.1, h: unit * 0.7, text: m.label, size: unit * 0.45, align: "center", valign: "middle", weight: "bold", lines: 1 });
          x += unit * 2.3;
        } else {
          const rad = (unit / 2) * m.size;
          items.push({ type: "circle", x: x + unit / 2, y: cy, r: rad, width: r.weight * 0.6 }, { type: "circle", x: x + unit / 2, y: cy, r: rad * 0.84, width: 0.7, dash: [2, 2] },
            { type: "text", x: x + unit / 2 - rad, y: cy - rad * 0.6, w: rad * 2, h: rad * 1.2, text: m.label, size: rad * 0.75, align: "center", valign: "middle", weight: "bold", lines: 1 });
          x += unit * 1.05;
        }
      }
      const bx = c.x + c.w - ansW;
      items.push({ type: "rect", x: bx, y: cy - r.body, w: ansW, h: r.body * 2, radius: 6, width: r.weight * 0.6 });
      answers.push({ type: "text", x: bx, y: cy - r.body, w: ansW, h: r.body * 2, text: moneyText(cents), size: r.body, align: "center", valign: "middle", weight: "bold", colour: env.ink.answer, lines: 1 });
      if (i > 0) items.push({ type: "line", points: [[c.x, c.y], [c.x + c.w, c.y]], width: 1, colour: env.ink.guide, dash: [4, 4] });
    });
    return { items, answers, issues: issues.slice(0, 2) };
  },
};
