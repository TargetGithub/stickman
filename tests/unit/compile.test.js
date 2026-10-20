// Story compiler (S6.1, S6.6): determinism, per-macro streams, ids and paths, anchor rewriting, eject.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalog } from "../../catalog/index.js";
import { compileStory, hasMacros } from "../../engine/story/compile.js";
import { normalize } from "../../engine/story/normalize.js";
import { movesFor } from "../../engine/sim.js";
import { validate, compileScript, ejectMacro } from "../../engine/index.js";
import { macroIssues } from "../../engine/validator/macros.js";
import { story } from "../helpers/macro_stories.js";

const moves = movesFor(catalog);
const load = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const reference = () => load("../fixtures/v2/reference_abridged.json");
const compile = (s) => compileStory(normalize(s), catalog, moves);
const beatsOf = (compiled, macroId) => compiled.story.scenes.flatMap((s) => s.beats).filter((b) => b.expandedFrom === macroId);

test("compiling is deterministic and the seed matters", () => {
  assert.deepEqual(compile(reference()).story, compile(reference()).story);
  const other = reference();
  other.meta.seed = 99;
  assert.notDeepEqual(beatsOf(compile(other), "boss"), beatsOf(compile(reference()), "boss"));
});

test("each macro has its own stream: editing one never changes another", () => {
  const edited = reference();
  edited.scenes[3].beats.find((b) => b.id === "boss").params.exchanges = 14;
  const a = compile(reference());
  const b = compile(edited);
  assert.notDeepEqual(beatsOf(a, "boss"), beatsOf(b, "boss"));
  for (const id of ["path", "talk", "grief", "gone", "bub", "ten"]) assert.deepEqual(beatsOf(a, id), beatsOf(b, id), id);
});

test("generated beats: <macroId>_<n> ids, the macro's path, expandedFrom; no macros left", () => {
  const c = compile(reference());
  assert.ok(!hasMacros(c.story));
  for (const id of ["boss", "path", "grief"]) {
    const beats = beatsOf(c, id);
    assert.ok(beats.length > 3, id);
    beats.forEach((b, k) => assert.equal(b.id, `${id}_${k + 1}`));
    assert.ok(beats.every((b) => b.path === beats[0].path && /^scenes\[\d\]\.beats\[\d\]$/.test(b.path)));
  }
  // A macro without an id gets <macro><beat index>.
  assert.ok(c.expansions.some((x) => x.id === "exit4" && x.macro === "exit"));
});

test("references to a macro are rewritten to the beats that carry its anchors", () => {
  const c = compile(reference());
  const s4 = c.story.scenes[3];
  const ids = new Set(s4.beats.map((b) => b.id));
  const end = s4.beats.find((b) => b.id === "end_1"); // @defeat after "boss"
  assert.ok(end.at.after && ids.has(end.at.after) && end.at.after.startsWith("boss_"));
  const anchors = c.expansions.find((x) => x.id === "boss").anchors;
  assert.match(anchors.finisher, /^boss_\d+\.hit$/);
  assert.match(anchors.ko, /^boss_\d+\.start$/);
  // {"on": "<macro>.<anchor>"} resolves too.
  const s = story(["stickman", "slim"], [
    { id: "f", at: 0.3, macro: "fight", params: { sides: ["a", "b"], winner: "a", exchanges: 3 } },
    { at: { on: "f.finisher" }, who: "world", do: "flash", params: { color: "#ffffff" } },
  ]);
  const flash = compile(s).story.scenes[0].beats.find((b) => b.do === "flash");
  assert.match(flash.at.on, /^f_\d+\.hit$/);
  assert.equal(validate(s, catalog).ok, true);
});

test("a story without macros compiles to the same beats; v1 scripts are untouched", () => {
  const plain = load("../../scripts/samples/s5_scene1.json");
  const strip = (s) => s.scenes.map((sc) => sc.beats.map(({ path, ...b }) => b));
  const hasMacro = plain.scenes.some((s) => s.beats.some((b) => b.macro));
  if (!hasMacro) assert.deepEqual(strip(compile(plain).story), plain.scenes.map((s) => s.beats));
  const v1 = load("../../scripts/samples/m3_duel.json");
  assert.equal(compileScript(v1, catalog).script, v1);
});

test("eject: the macro's beats written out validate and play the same", () => {
  const s = reference();
  for (const id of ["boss", "path", "grief", "talk"]) {
    const out = ejectMacro(s, id, catalog);
    assert.ok(out, id);
    const r = validate(out, catalog);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.errors)}`);
    // Same beats at the same times (the ejected beats are no longer indented under a macro line).
    const timeline = (t) => t.split("\n").filter((l) => !l.includes("@")).map((l) => l.replace(/\s+/g, " "));
    assert.deepEqual(timeline(r.timeline), timeline(validate(s, catalog).timeline), id);
  }
  assert.equal(ejectMacro(s, "nope", catalog), null);
});

test("macro checks: unknown macros, bad params and anchors are caught before compiling", () => {
  const s = normalize(story(["stickman", "slim"], [{ id: "x", at: 0, macro: "juggle", params: {} }]));
  assert.deepEqual(macroIssues(s, catalog, moves).map((i) => i.code), ["E_MACRO_UNKNOWN"]);
  const cases = [
    [{ id: "f", at: 0, macro: "fight", params: { sides: ["a", "b"], winner: "c" } }, "E_MACRO_PARAM"],
    [{ id: "f", at: 0, macro: "fight", params: { sides: ["a", "b"] } }, "E_MACRO_PARAM"],
    [{ id: "f", at: 0, macro: "fight", params: { sides: ["a", "b"], winner: "a", finisher: "wave" } }, "E_MACRO_PARAM"],
    [{ id: "g", at: 0, macro: "gauntlet", params: { hero: "a", opponents: ["a", "b"] } }, "E_MACRO_PARAM"],
    [{ id: "d", at: 0, macro: "dialogue", params: { lines: [["a", "Hi", "grumpy"]] } }, "E_MACRO_PARAM"],
    [{ id: "t", at: 0, macro: "travel", params: { who: ["a"], to: { near: "zz" } } }, "E_OBJECT_UNKNOWN"],
    [{ id: "w", at: 0, who: "a", do: "wave", to: { x: 100 } }, "E_MOVE_PARAM"],
  ];
  for (const [beat, code] of cases) {
    const issues = macroIssues(normalize(story(["stickman", "slim"], [beat])), catalog, moves);
    assert.ok(issues.some((i) => i.code === code), `${JSON.stringify(beat)} → ${issues.map((i) => i.code)}`);
  }
  const anchor = story(["stickman", "slim"], [
    { id: "d", at: 0, macro: "dialogue", params: { lines: [["a", "Hi"], ["b", "Yo"]] } },
    { at: { on: "d.line3" }, who: "a", do: "wave" },
  ]);
  assert.deepEqual(macroIssues(normalize(anchor), catalog, moves).map((i) => i.code), ["E_REF_ANCHOR"]);
  anchor.scenes[0].beats[1].at.on = "d.line2";
  assert.deepEqual(macroIssues(normalize(anchor), catalog, moves), []);
});

test("compileScript and ejectMacro keep a version 3 script at version 3 (no internal v3 flag)", () => {
  const v3 = { version: 3, meta: { title: "t", format: "landscape", seed: 1, audience: "kids" }, cast: [{ id: "a", name: "A", body: "kid", color: "#3fd8ff" }, { id: "b", name: "B", body: "kid", color: "#ffb0d0" }],
    locations: [{ id: "p", theme: "city_park" }], scenes: [{ id: "s", location: "p", cast: [{ id: "a", x: 1200 }, { id: "b", x: 1500 }], beats: [{ id: "chat", at: 0, macro: "dialogue", params: { lines: [["a", "Hi there."], ["b", "Hello!"]] } }] }] };
  const out = compileScript(v3, catalog).script;
  assert.equal(out.version, 3);
  assert.equal("v3" in out, false);
  assert.deepEqual(validate(out, catalog).errors, []);
  const ej = ejectMacro(v3, "chat", catalog);
  assert.equal(ej.version, 3);
  assert.equal("v3" in ej, false);
});
