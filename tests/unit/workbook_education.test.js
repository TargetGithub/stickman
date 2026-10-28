// Workbook education catalog, PreK-5 (WORKBOOK_SPEC 5, 8.4-8.6): math templates, clocks, coins, fractions, place
// value, number lines, multiple choice, reading passages and writing lines. Generators and display lists only; no canvas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { workbookCatalogSync } from "../../catalog/index.js";
import { validate, buildWorkbook } from "../../engine/index.js";
import { deriveRng } from "../../engine/math.js";
import { GRADES, GRADE_RULES, atLeast } from "../../engine/workbook/grades.js";
import { carries, borrows, makeProblem, makeProblems, sentence, answerText, show } from "../../engine/workbook/math_problems.js";
import { parseTime, handAngles, timeText } from "../../engine/workbook/activities/clock.js";
import { moneyText, makeChange } from "../../engine/workbook/activities/coins.js";
import { parseFraction, fractionParts } from "../../engine/workbook/activities/fractions.js";
import { expanded, withCommas } from "../../engine/workbook/activities/place_value.js";
import { blankPlaces } from "../../engine/workbook/activities/number_line.js";
import { permute, pickInOrder, shuffleOptions } from "../../engine/workbook/activities/qa_items.js";
import { questionsOf } from "../../engine/workbook/activities/choose.js";
import { gradeDirections } from "../../engine/workbook/word_grid.js";

const catalog = workbookCatalogSync();
const ed = catalog.education;
const flat = (items) => items.flatMap((it) => (it.type === "group" ? flat(it.items) : [it]));
const book = (grade, blocks, layout = "full") => ({ kind: "workbook", version: 1, title: "Test", seed: 11, grade, documents: [{ id: "s", pages: [{ id: "p", layout, blocks }] }, { id: "a", answersFor: "s" }] });

test("grades run pre-K to 5 with rules that grow steadily", () => {
  assert.deepEqual(GRADES, ["prek", "k", "1", "2", "3", "4", "5"]);
  for (let i = 1; i < GRADES.length; i++) {
    const [a, b] = [GRADE_RULES[GRADES[i - 1]], GRADE_RULES[GRADES[i]]];
    assert.ok(b.title <= a.title && b.body <= a.body && b.minItem <= a.minItem, GRADES[i]);
    assert.ok(b.mazeMax >= a.mazeMax && b.dotsMax >= a.dotsMax && b.wordGrid >= a.wordGrid, GRADES[i]);
  }
  for (const [g, min, want] of [["prek", "1", false], ["1", "1", true], ["5", "2", true], ["k", "prek", true]]) assert.equal(atLeast(g, min), want, `${g} >= ${min}`);
  assert.deepEqual(gradeDirections("4"), gradeDirections("2"), "diagonals from grade 2 on");
});

test("regrouping is detected column by column", () => {
  for (const [a, b, c] of [[25, 14, false], [25, 17, true], [95, 5, true], [120, 300, false], [999, 1, true]]) assert.equal(carries(a, b), c, `${a}+${b}`);
  for (const [a, b, c] of [[57, 23, false], [52, 27, true], [300, 100, false], [301, 102, true], [9, 9, false]]) assert.equal(borrows(a, b), c, `${a}-${b}`);
});

test("every math template makes problems that keep its rules", () => {
  for (const [name, t] of Object.entries(ed.math.templates)) {
    const ps = makeProblems(t, 40, deriveRng(3, name));
    assert.ok(ps, `${name} makes problems`);
    for (const p of ps) {
      const tag = `${name}: ${p.a} ${p.op} ${p.b}`;
      if (t.op === "÷") {
        assert.equal(p.a, p.b * p.result + p.remainder, tag);
        assert.ok(p.remainder < p.b, tag);
        if (!t.remainder) assert.equal(p.remainder, 0, tag);
      } else {
        const r = t.op === "+" ? p.a + p.b : t.op === "-" ? p.a - p.b : p.a * p.b;
        assert.equal(p.result, r, tag);
        assert.ok(p.result >= 0, tag);
        if (t.max != null) assert.ok(p.result <= t.max, tag);
        if (t.min != null) assert.ok(p.result >= t.min, tag);
        if (t.regroup != null && t.op === "+") assert.equal(carries(p.a, p.b), t.regroup, tag);
        if (t.regroup != null && t.op === "-") assert.equal(borrows(p.a, p.b), t.regroup, tag);
      }
    }
  }
});

test("number sentences put the blank where the template asks", () => {
  const p = { op: "+", a: 7, b: 5, result: 12, remainder: 0 };
  for (const [missing, at] of [["answer", 4], ["a", 0], ["b", 2]]) {
    const s = sentence(p, missing);
    assert.equal(s.findIndex((t) => typeof t === "object"), at, missing);
  }
  assert.deepEqual(sentence({ op: "+", a: 34, b: 25, result: 59, remainder: 0 }, "answer", 1).slice(0, 3), ["3.4", "+", "2.5"]);
  for (const [p2, d, want] of [[{ op: "÷", a: 29, b: 4, result: 7, remainder: 1 }, 0, "7 R1"], [{ op: "+", a: 1245, b: 380, result: 1625, remainder: 0 }, 2, "16.25"], [{ op: "×", a: 4, b: 30, result: 120, remainder: 0 }, 0, "120"]]) assert.equal(answerText(p2, d), want);
  assert.equal(show(5, 2), "0.05");
  assert.equal(makeProblem({ op: "+", a: [5, 5], b: [5, 5], max: 3 }, deriveRng(1, "x")), null, "an impossible template gives null");
});

test("clock times parse, print and point the hands", () => {
  for (const [s, want] of [["3:00", { h: 3, m: 0 }], ["12:45", { h: 12, m: 45 }], ["13:00", null], ["0:30", null], ["7:60", null], ["7:5", null]]) assert.deepEqual(parseTime(s), want, s);
  for (const [t, hour, minute] of [[{ h: 3, m: 0 }, 90, 0], [{ h: 6, m: 30 }, 195, 180], [{ h: 12, m: 15 }, 7.5, 90]]) assert.deepEqual(handAngles(t), { hour, minute });
  assert.equal(timeText({ h: 9, m: 5 }), "9:05");
});

test("money prints in cents or dollars and change adds up", () => {
  for (const [c, want] of [[7, "7¢"], [99, "99¢"], [100, "$1.00"], [135, "$1.35"], [1205, "$12.05"]]) assert.equal(moneyText(c), want);
  const money = ed.math.money;
  for (const [cents, use] of [[47, ["penny", "nickel", "dime", "quarter"]], [6, ["penny"]], [235, ["penny", "nickel", "dime", "quarter", "dollar"]], [30, ["nickel", "dime"]]]) {
    const pieces = makeChange(cents, use, money, deriveRng(cents, "c"));
    assert.equal(pieces.reduce((s, n) => s + money[n].value, 0), cents, `${cents}`);
    assert.ok(pieces.every((n) => use.includes(n)) && pieces.length <= 9);
  }
  assert.equal(makeChange(3, ["nickel"], money, deriveRng(1, "c")), null);
});

test("fractions parse and split shapes into equal parts", () => {
  for (const [s, want] of [["1/2", { n: 1, d: 2 }], ["0/4", { n: 0, d: 4 }], ["12/12", { n: 12, d: 12 }], ["5/4", null], ["1/1", null], ["1/13", null], ["a/b", null]]) assert.deepEqual(parseFraction(s), want, s);
  const area = (pts) => Math.abs(pts.reduce((s, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return s + x * y2 - x2 * y; }, 0)) / 2;
  for (const shape of ["circle", "rect", "bar"]) {
    for (const d of [2, 3, 4, 6, 8]) {
      const parts = fractionParts(shape, d, 0, 0, 50);
      assert.equal(parts.length, d, `${shape} ${d}`);
      const a = parts.map(area);
      assert.ok(Math.max(...a) - Math.min(...a) < a[0] * 0.01, `${shape} ${d}: equal parts`);
    }
  }
});

test("place value expands and groups digits", () => {
  for (const [n, want] of [[345, "300 + 40 + 5"], [3405, "3000 + 400 + 5"], [70, "70"], [100002, "100000 + 2"]]) assert.equal(expanded(n), want);
  for (const [n, want] of [[999, "999"], [1000, "1,000"], [123456, "123,456"]]) assert.equal(withCommas(n), want);
});

test("number line blanks never hide the first two numbers", () => {
  for (const [len, k] of [[6, 2], [8, 3], [12, 8], [4, 5]]) {
    const b = blankPlaces(len, k, deriveRng(len, "nl"));
    assert.ok(!b.has(0) && !b.has(1));
    assert.equal(b.size, Math.min(k, len - 2));
  }
});

test("option shuffles keep the right answer and set picks keep order", () => {
  const rng = deriveRng(5, "q");
  for (let i = 0; i < 20; i++) {
    const q = shuffleOptions({ q: "?", options: ["right", "w1", "w2", "w3"], answer: 0 }, rng);
    assert.equal(q.options[q.answer], "right");
  }
  assert.deepEqual([...permute(6, rng)].sort(), [0, 1, 2, 3, 4, 5]);
  const picked = pickInOrder([10, 20, 30, 40, 50], 3, rng);
  assert.equal(picked.length, 3);
  assert.deepEqual(picked, [...picked].sort((a, b) => a - b));
  const qs = questionsOf({ set: "rhyming_k", count: 4 }, catalog, deriveRng(1, "s"));
  assert.equal(qs.length, 4);
  for (const q of qs) assert.ok(ed.questions.sets.rhyming_k.questions.some((o) => o.q === q.q && o.options[0] === q.options[q.answer]));
});

// One page per new activity at a grade it suits: it validates, has answers (writing lines have none), and builds
// the same twice.
const PAGES = [
  ["k", { activity: "math_facts", template: "add_within_10", count: 10 }, "text"],
  ["4", { activity: "math_facts", template: "div_3digit_by_1digit", count: 6, form: "stacked" }, "text"],
  ["1", { activity: "number_line", rows: [{ start: 0, step: 2 }, { start: 50, step: -5 }] }, "text"],
  ["k", { activity: "place_value", numbers: [13, 17], task: "blocks" }, "text"],
  ["3", { activity: "place_value", count: 6, task: "expand" }, "text"],
  ["1", { activity: "clock", count: 4, step: 30 }, "text"],
  ["2", { activity: "clock", times: ["3:25", "10:50"], task: "draw" }, "line"],
  ["2", { activity: "coins", count: 4 }, "text"],
  ["1", { activity: "fractions", fractions: ["1/2", "1/3", "3/4"], shape: "circle" }, "text"],
  ["4", { activity: "fractions", fractions: ["2/4", "3/6"], shape: "rect", task: "shade" }, "poly"],
  ["k", { activity: "choose", set: "living_things_k", count: 4 }, "rect"],
  ["2", { activity: "choose", questions: [{ q: "Which one can fly?", options: ["bird", "fish"], answer: 0, picture: { shape: "star" } }] }, "rect"],
  ["3", { activity: "read_passage", passage: "octopus" }, "text"],
  ["1", { activity: "read_passage", title: "My Kite", text: "I have a red kite. It flies high in the wind.", questions: [{ q: "What colour is the kite?", answer: "red" }] }, "text"],
  ["2", { activity: "write_lines", model: "The sun is hot.", rows: 4 }, null],
];

for (const [grade, block, answerType] of PAGES) {
  test(`${block.activity} at grade ${grade}: valid, answered and deterministic`, () => {
    const script = book(grade, [block]);
    const r = validate(script, catalog);
    assert.deepEqual([...r.errors, ...r.warnings], []);
    const a = buildWorkbook(script, catalog);
    const b = buildWorkbook(script, catalog);
    assert.deepEqual(a, b);
    const key = a.documents[1].pages;
    if (!answerType) return assert.equal(key.length, 0, "no answer key page");
    const answers = flat(key[0].items).filter((i) => i.answer);
    assert.ok(answers.some((i) => i.type === answerType), `answers drawn as ${answerType}`);
    assert.ok(flat(a.documents[0].pages[0].items).every((i) => !i.answer), "the student page has no answers");
  });
}

test("multiple-choice keys ring exactly the right option", () => {
  const script = book("1", [{ activity: "choose", questions: [{ q: "Which is a colour?", options: ["red", "run", "rug"], answer: 0 }, { q: "Which is a number?", options: ["cat", "six"], answer: 1 }] }]);
  const items = flat(buildWorkbook(script, catalog).documents[1].pages[0].items);
  const rings = items.filter((i) => i.answer && i.type === "rect");
  assert.equal(rings.length, 2);
  for (const [ring, word] of [[rings[0], "red"], [rings[1], "six"]]) {
    const inside = items.filter((i) => i.type === "text" && !i.answer && i.x >= ring.x - 1 && i.x + i.w <= ring.x + ring.w + 1 && i.y >= ring.y - 2 && i.y <= ring.y + ring.h);
    assert.deepEqual(inside.map((i) => i.text), [word]);
  }
});

test("the skills map covers every strand from K to 5 and every example builds", () => {
  const skills = Object.values(ed.skills.skills);
  for (const g of GRADES.slice(1)) {
    const strands = new Set(skills.filter((k) => k.grade === g).map((k) => k.strand));
    for (const s of Object.keys(ed.skills.strands)) assert.ok(strands.has(s), `grade ${g} has a ${s} skill`);
  }
  for (const k of skills) assert.ok(k.activities.includes(k.example.activity));
});

test("the per-grade sample books (out/demos/education) validate with no issues", () => {
  for (const g of GRADES) {
    const script = JSON.parse(readFileSync(new URL(`../fixtures/workbooks/edu_grade_${g}.json`, import.meta.url), "utf8"));
    assert.equal(script.grade, g);
    const r = validate(script, catalog);
    assert.deepEqual([...r.errors, ...r.warnings], [], g);
  }
});
