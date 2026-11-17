import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildKidsCatalog, PART_SHAPES } from "../../tools/lottie3d_catalog.mjs";

const repo = new URL("../../", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, repo), "utf8"));
const engine = () => ({
  colors: read("engine3d/catalog/colors.json").colors,
  materials: read("engine3d/catalog/materials.json").materials,
  stages: read("engine3d/catalog/stages.json").stages,
  lights: read("engine3d/catalog/stages.json").lights,
  models: read("engine3d/catalog/models.json"),
  characters: read("engine3d/catalog/characters.json").characters,
  actions: read("engine3d/catalog/actions.json").actions,
});
const allow = () => read("lottie3d/catalog/kids_allow.json");

test("kids.json is up to date with engine3d/catalog and the allowlist", () => {
  const { catalog } = buildKidsCatalog({ allow: allow(), engine: engine() });
  assert.deepEqual(read("lottie3d/catalog/kids.json"), catalog, "run npm run lottie3d:catalog");
});

test("capabilities come from the model", () => {
  const { catalog } = buildKidsCatalog({ allow: allow(), engine: engine() });
  assert.deepEqual(catalog.models.duck.caps, ["body", "face"]);
  assert.deepEqual(catalog.models.ball.caps, ["body"]);
  assert.deepEqual(catalog.models.stick.caps, ["body", "limbs", "joints"]);
  assert.ok(catalog.models.robot.caps.includes("clips"));
  for (const m of Object.values(catalog.models)) for (const p of m.parts ?? []) assert.ok(PART_SHAPES.includes(p.p));
});

const bad = [
  ["an unknown stage", (a) => { a.stages.mars = { label: "Mars" }; }, /stages\.mars/],
  ["an unknown critter", (a) => { a.models.dragon = { from: "critters", label: "Dragon" }; }, /models\.dragon/],
  ["a move with no description", (a) => { a.moves.fly = { engine3d: null, needs: "body", options: {} }; }, /moves\.fly: needs a description/],
  ["a missing engine3d action", (a) => { a.moves.hop.engine3d = "boing"; }, /moves\.hop: engine3d action "boing"/],
];
for (const [name, mutate, re] of bad) {
  test(`the catalog build fails on ${name}`, () => {
    const a = allow();
    mutate(a);
    assert.throws(() => buildKidsCatalog({ allow: a, engine: engine() }), re);
  });
}
