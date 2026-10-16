// SVG import (S4.9) and drafting checks (S4.10).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePathD, parseSvg, toCatalogPaths } from "../../tools/lib/svg.mjs";
import { checkDraft, mockDraft, draftPrompt, similarEntries } from "../../tools/lib/draft.mjs";
import { drawPaths } from "../../engine/renderer/paths.js";
import { catalog } from "../../data/index.js";

const PATHS = [
  ["absolute lines", "M0 0 L10 0 L10 10 Z", [["M", 0, 0], ["L", 10, 0], ["L", 10, 10], ["Z"]]],
  ["relative with implicit line-tos", "m5 5 10 0 0 10z", [["M", 5, 5], ["L", 15, 5], ["L", 15, 15], ["Z"]]],
  ["H and V", "M0 0 H20 V5 h-5 v5", [["M", 0, 0], ["L", 20, 0], ["L", 20, 5], ["L", 15, 5], ["L", 15, 10]]],
  ["S mirrors the last control point", "M0 0 C0 10 10 10 10 0 S20 -10 20 0", [["M", 0, 0], ["C", 0, 10, 10, 10, 10, 0], ["C", 10, -10, 20, -10, 20, 0]]],
  ["T mirrors the quadratic control", "M0 0 Q5 10 10 0 T20 0", [["M", 0, 0], ["Q", 5, 10, 10, 0], ["Q", 15, -10, 20, 0]]],
  ["arcs become lines to their end", "M0 0 A5 5 0 0 1 10 0", [["M", 0, 0], ["L", 10, 0]]],
  ["numbers without separators", "M0-5L.5.5", [["M", 0, -5], ["L", 0.5, 0.5]]],
];
for (const [name, d, want] of PATHS) test(`parsePathD: ${name}`, () => assert.deepEqual(parsePathD(d), want));

test("parseSvg: shapes, group transforms and style fills", () => {
  const shapes = parseSvg(readFileSync(new URL("../fixtures/svg/castle.svg", import.meta.url), "utf8"));
  assert.equal(shapes.length, 6);
  assert.deepEqual(shapes[0].d[0], ["M", 30, 50], "translate(10,10) applied to the rect");
  assert.equal(shapes[2].fill, "#8a919a", "fill from style");
});

test("toCatalogPaths: scaled to the height, centered, standing on the floor, palette colors", () => {
  const shapes = parseSvg(readFileSync(new URL("../fixtures/svg/castle.svg", import.meta.url), "utf8"));
  const { paths, h } = toCatalogPaths(shapes, { height: 300, palette: ["#111111", "#9aa7b4", "#e04f4f"] });
  const ys = paths.flatMap((p) => p.d.flatMap((c) => c.slice(1).filter((_, k) => k % 2 === 1)));
  const xs = paths.flatMap((p) => p.d.flatMap((c) => c.slice(1).filter((_, k) => k % 2 === 0)));
  assert.equal(h, 300);
  assert.ok(Math.abs(Math.min(...ys) + 300) < 0.2 && Math.max(...ys) === 0);
  assert.ok(Math.abs(Math.min(...xs) + Math.max(...xs)) < 0.2, "centered on x");
  assert.ok(paths.every((p) => ["#111111", "#9aa7b4", "#e04f4f"].includes(p.fill)));
});

test("drawPaths issues only canvas path calls", () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_, k) => (...a) => calls.push(k), set: () => true });
  drawPaths(ctx, [{ d: [["M", 0, 0], ["L", 1, 0], ["C", 1, 1, 2, 2, 3, 3], ["Q", 1, 1, 2, 2], ["Z"]], fill: "colors.a", stroke: "#111111" }], { a: "#ff0000" });
  assert.deepEqual(calls, ["beginPath", "moveTo", "lineTo", "bezierCurveTo", "quadraticCurveTo", "closePath", "fill", "stroke"]);
});

const ok = { name: "mailbox", entry: { behavior: "static", draw: "paths", w: 60, h: 120, paths: [{ d: [["M", -20, 0], ["L", 20, 0], ["L", 20, -120], ["Z"]], fill: "#e04f4f" }] } };
const DRAFTS = [
  ["a good paths object", "object", ok, []],
  ["an existing name", "object", { ...ok, name: "bench" }, ["already exists"]],
  ["below the floor", "object", { ...ok, entry: { ...ok.entry, paths: [{ d: [["M", 0, 0], ["L", 0, 40]], fill: "#e04f4f" }] } }, ["below the floor"]],
  ["unknown behavior", "object", { ...ok, entry: { ...ok.entry, behavior: "flying" } }, ["behavior must be"]],
  ["bad command", "object", { ...ok, entry: { ...ok.entry, paths: [{ d: [["M", 0, 0], ["X", 1]], fill: "#e04f4f" }] } }, ["bad command"]],
  ["holdable without a shape", "object", { name: "spoon", entry: { behavior: "holdable", draw: "held", hold: { shape: "spoon", len: 20, width: 3, gripAt: 0.1, grip: "rHand", color: "#cccccc" } } }, ["hold.shape"]],
  ["theme with an unknown layer", "theme", { name: "moon", entry: { sky: { top: "#000000", bottom: "#222244" }, ground: { color: "#777777", line: "#555555" }, layers: [{ kind: "craters" }], characterBg: "#556677" } }, ["unknown"]],
  ["theme too bright behind characters", "theme", { name: "glare", entry: { sky: { top: "#ffffff", bottom: "#ffffff" }, ground: { color: "#ffffff", line: "#eeeeee" }, layers: [], characterBg: "#ffffff" } }, ["mid-tone"]],
];
for (const [name, kind, draft, want] of DRAFTS) {
  test(`checkDraft: ${name}`, () => {
    const p = checkDraft(kind, draft, catalog);
    if (!want.length) assert.deepEqual(p, []);
    for (const w of want) assert.ok(p.some((x) => x.includes(w)), JSON.stringify(p));
  });
}

test("mock drafts pass the checks; prompts carry the format and similar entries", () => {
  for (const kind of ["object", "theme"]) assert.deepEqual(checkDraft(kind, mockDraft(kind, "a park bench in the city", catalog), catalog), []);
  const { system, user } = draftPrompt("object", "a tennis racket", catalog);
  assert.match(system, /up is NEGATIVE/);
  assert.match(user, /"racket"/);
  assert.equal(similarEntries(catalog.objects, "tennis racket ball")[0].name.includes("tennis") || similarEntries(catalog.objects, "tennis racket ball")[0].name === "racket", true);
});
