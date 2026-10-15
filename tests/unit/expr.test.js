import { test } from "node:test";
import assert from "node:assert/strict";
import { compileExpr, evalParam, ExprError } from "../../engine/expr.js";

const params = { travel: 260, damage: 14, range: 300 };

test("valid expressions", () => {
  const cases = [
    ["travel", 260],
    ["travel*0.7", 182],
    ["travel * 0.5 + 10", 140],
    ["-travel", -260],
    ["(travel + range) / 2", 280],
    ["damage - -1", 15],
    ["2 * (3 + 4) * .5", 7],
    ["  42  ", 42],
  ];
  for (const [src, want] of cases) {
    assert.equal(compileExpr(src, Object.keys(params))(params), want, src);
  }
});

test("rejected expressions", () => {
  const cases = [
    "",
    "travel *",
    "(travel",
    "travel)",
    "unknown + 1",
    "travel ** 2",
    "Math.PI",
    "alert(1)",
    "constructor",
    "travel; 1",
    "1e5",
    "a".repeat(201),
  ];
  for (const src of cases) {
    assert.throws(() => compileExpr(src, Object.keys(params))(params), ExprError, JSON.stringify(src));
  }
});

test("division by zero is an error, not Infinity", () => {
  assert.throws(() => compileExpr("travel / 0", ["travel"])(params), ExprError);
});

test("evalParam passes numbers through and evaluates strings", () => {
  assert.equal(evalParam(5, params), 5);
  assert.equal(evalParam("damage*2", params), 28);
  assert.throws(() => evalParam({}, params), ExprError);
});
