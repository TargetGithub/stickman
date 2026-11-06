import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";

// Every Toybox 10K model file (catalog/models/tk_*.json): loads, is described and tagged, uses known shapes and
// colours, and every critter has a face rig (eyes and a head) so feelings, looks and talking work.
const catalog = loadCatalog3d();
const dir = new URL("../../catalog/models/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.startsWith("tk_") && f.endsWith(".json"));

test("10K model files exist", () => assert.ok(files.length >= 6));

for (const f of files) {
  const raw = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  test(`10K models in ${f}`, () => {
    for (const kind of ["critters", "props"]) {
      for (const name of Object.keys(raw[kind] ?? {})) {
        const m = catalog[kind][name];
        assert.ok(m, `${name} loads`);
        assert.ok(m.description?.length > 20, `${name} has a description`);
        assert.ok(m.tags?.length, `${name} has tags`);
        assert.doesNotMatch(m.description, /\bbloody\b|\bgore\b|\bweapon/i, `${name} description`);
        for (const p of m.parts) {
          assert.ok(catalog.shapes[p.p], `${name}: unknown shape ${p.p}`);
          if (p.c) assert.ok(catalog.colors[p.c], `${name}: unknown colour ${p.c}`);
          if (p.m) assert.ok(catalog.materials[p.m], `${name}: unknown material ${p.m}`);
        }
        if (kind === "critters" && name !== "village_children") {
          // A mouth is optional where the base animal has none (duck, fox, penguin): talking adds a talk mouth.
          assert.ok(m.eyes && m.head?.at, `${name} has eyes and a head`);
        }
      }
    }
  });
}

test("10K stages keep their set behind the teaching area", () => {
  const raw = JSON.parse(readFileSync(new URL("../../catalog/stages/tk_stages.json", import.meta.url), "utf8"));
  for (const [name, s] of Object.entries(raw.stages)) {
    assert.ok(catalog.stages[name]?.description, name);
    for (const o of s.set ?? []) if (o.parent == null) assert.ok(o.at[2] < -2, `${name}: ${o.id} at z ${o.at[2]}`);
  }
});
