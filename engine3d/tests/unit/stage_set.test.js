// Stage presets with set dressing (classroom, lab, forest, pond): every set piece is a valid object, stays
// behind the teaching area, joins the plan with a set_ id, and a script can turn the set off.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";
import { stageSet } from "../../runtime/stage_set.js";

const catalog = loadCatalog3d();
const script = (stage, objects = []) => ({ kind: "video3d", version: 1, stage, objects, scenes: [{ id: "s", beats: [{ dur: 1, do: [] }] }] });

test("batch 3 stages exist with descriptions and tags", () => {
  for (const name of ["classroom", "lab", "forest", "pond"]) {
    const s = catalog.stages[name];
    assert.ok(s, name);
    assert.ok(s.description && s.tags?.length, `${name} needs a description and tags`);
    assert.ok(catalog.lights[s.lights], `${name}: light rig ${s.lights}`);
    for (const k of ["background", "floor"]) assert.ok(catalog.colors[s[k]], `${name}.${k}`);
  }
});

for (const [name, preset] of Object.entries(catalog.stages)) {
  if (!preset.set) continue;
  test(`stage ${name}: set pieces validate and stay behind the teaching area`, () => {
    // Validate the set as a script's own objects (ids without the prefix), so every field is checked.
    const v = validateScript(script({ preset: name, set: [] }, preset.set), catalog);
    assert.deepEqual(v.errors, []);
    assert.deepEqual(v.warnings, []);
    for (const o of preset.set) {
      assert.ok(o.at[2] < -2.4, `${name}/${o.id} at z ${o.at[2]} is in the teaching area`);
    }
    const plan = compileScript(script({ preset: name }), { catalog });
    const ids = plan.objects.map((o) => o.id);
    assert.deepEqual(ids, preset.set.map((o) => `set_${o.id}`));
  });
}

test("a script can target set pieces, and stage.set [] turns them off", () => {
  const s = script({ preset: "classroom" });
  s.scenes[0].beats[0].do.push({ do: "shot", target: "set_board", framing: "wide" });
  assert.deepEqual(validateScript(s, catalog).errors, []);
  assert.equal(compileScript(script({ preset: "classroom", set: [] }), { catalog }).objects.length, 0);
  assert.equal(stageSet({ preset: "playroom" }, catalog).length, 0);
});

test("script ids may not use the set_ prefix", () => {
  const codes = validateScript(script({ preset: "studio" }, [{ id: "set_ball", kind: "shape", shape: "sphere" }]), catalog).errors.map((e) => e.code);
  assert.ok(codes.includes("E3D_ID"));
});
