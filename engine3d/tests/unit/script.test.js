import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { validateScript } from "../../runtime/validate.js";
import { compileScript, SAY_TAIL } from "../../runtime/compile.js";
import { buildPlan } from "../../runtime/plan.js";

const catalog = loadCatalog3d();
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));

test("the demo script validates and compiles", () => {
  const s = read("../../scripts/count_to_five.json");
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  assert.ok(plan.duration > 25 && plan.duration < 50, String(plan.duration));
  assert.equal(plan.lines.length, 14);
});

test("a measured clip stretches its beat", () => {
  const s = { kind: "video3d", version: 1, scenes: [{ id: "a", beats: [{ dur: 1, do: [{ do: "say", text: "Hi", id: "hi" }] }, { dur: 1, do: [{ do: "sound", sound: "pop" }] }] }] };
  const p = compileScript(s, { catalog, speech: { hi: { dur: 3 } } });
  assert.equal(p.audio.find((a) => a.sound === "pop").t, 3 + SAY_TAIL);
});

test("bad fixtures fail with their expected codes", () => {
  const dir = new URL("../fixtures/bad/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  assert.ok(files.length >= 5);
  for (const f of files) {
    const { expect, script } = read(`../fixtures/bad/${f}`);
    const codes = validateScript(script, catalog).errors.map((e) => e.code);
    for (const c of expect) assert.ok(codes.includes(c), `${f}: wanted ${c}, got ${codes.join(", ")}`);
  }
});

test("the JS scene builds the same plan twice", async () => {
  const url = new URL("../../scenes/vowels.js", import.meta.url).href;
  const a = await buildPlan({ sceneUrl: url, catalog });
  const b = await buildPlan({ sceneUrl: url, catalog });
  assert.deepEqual(a.timeline.toJSON(), b.timeline.toJSON());
  assert.ok(a.hooks.length >= 1);
});
