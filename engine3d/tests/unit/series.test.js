// Every series script validates, builds a plan of a sensible length, and names only real pre-K..K skills
// (catalog/education/skills.json), so videos can link to the matching printables.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { validateScript } from "../../runtime/validate.js";
import { buildPlan } from "../../runtime/plan.js";

const catalog = loadCatalog3d();
const skills = JSON.parse(readFileSync(new URL("../../../catalog/education/skills.json", import.meta.url), "utf8")).skills;
const dir = new URL("../../scripts/series/toybox/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

test("the toybox series has baby and pre-K episodes", () => {
  assert.ok(files.filter((f) => f.startsWith("bb")).length >= 4);
  assert.ok(files.filter((f) => f.startsWith("pk")).length >= 6);
});

for (const f of files) {
  test(`toybox/${f}`, async () => {
    const script = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    const v = validateScript(script, catalog);
    assert.deepEqual(v.errors, []);
    assert.deepEqual(v.warnings, []);
    assert.equal(script.meta.episode, f.slice(0, 4));
    for (const s of script.meta.skills ?? []) assert.ok(skills[s], `unknown skill ${s}`);
    assert.ok(script.meta.youtube?.title && script.meta.youtube.title.length <= 100, "YouTube titles are at most 100 characters");
    const plan = await buildPlan({ script, catalog });
    assert.ok(plan.duration > 40 && plan.duration < 600, `${plan.duration} s`);
  });
}
