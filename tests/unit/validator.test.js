// Validator corpus (M3.7): every fixture in tests/fixtures/{bad,warn} must produce its expected codes;
// good scripts validate with no errors or warnings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { validate, buildJsonSchema, WORLD_COMMANDS } from "../../engine/validator/index.js";
import { checkSchema, jsonSchema } from "../../engine/validator/schema.js";
import { closestMatch } from "../../engine/validator/report.js";
import { movesFor } from "../../engine/sim.js";
import { catalog } from "../../data/index.js";

const dir = (group) => new URL(`../fixtures/${group}/`, import.meta.url);
const load = (url) => JSON.parse(readFileSync(url, "utf8"));
const fixtures = (group) => readdirSync(dir(group)).filter((f) => f.endsWith(".json") && !f.endsWith(".expect.json")).sort();

test("the corpus has at least 30 bad scripts", () => assert.ok(fixtures("bad").length >= 30));

for (const group of ["bad", "warn"]) {
  for (const file of fixtures(group)) {
    test(`${group}/${file}`, () => {
      const expect = load(new URL(file.replace(".json", ".expect.json"), dir(group)));
      const r = validate(load(new URL(file, dir(group))), catalog);
      const codes = [...r.errors, ...r.warnings].map((i) => i.code);
      assert.equal(r.ok, expect.ok, `ok: ${JSON.stringify(r.errors)}`);
      for (const c of expect.codes) assert.ok(codes.includes(c), `expected ${c}, got ${codes.join(", ") || "nothing"}`);
      for (const i of [...r.errors, ...r.warnings]) {
        assert.ok(i.message && i.fix, `${i.code} needs a message and a fix`);
        assert.equal(typeof i.path, "string");
      }
    });
  }
}

test("good scripts validate cleanly and include a timeline", () => {
  for (const url of [new URL("../fixtures/good/minimal.json", import.meta.url), new URL("../../scripts/samples/m3_duel.json", import.meta.url),
    new URL("../fixtures/good/story_min.json", import.meta.url), new URL("../fixtures/good/transitions.json", import.meta.url), new URL("../../scripts/samples/s1_scenes.json", import.meta.url), new URL("../../scripts/samples/s2_dialogue.json", import.meta.url), new URL("../../scripts/samples/s3_bodies.json", import.meta.url), new URL("../../scripts/samples/s4_park.json", import.meta.url), new URL("../../scripts/samples/s5_life.json", import.meta.url), new URL("../../scripts/samples/s5_pairs.json", import.meta.url)]) {
    const r = validate(load(url), catalog);
    assert.deepEqual([...r.errors, ...r.warnings], [], url.pathname);
    assert.match(r.timeline, /video length/);
  }
});

test("schema errors stop before the dry run; issues carry paths", () => {
  const r = validate({ version: 1, meta: { title: "x", format: "landscape", seed: 1 }, characters: [], camera: [], beats: [] }, catalog);
  assert.equal(r.stage, "schema");
  assert.ok(r.errors.some((e) => e.path === "characters" && e.code === "E_SCHEMA_SIZE"));
});

test("a range problem inside the `at` number form is reported as a range error", () => {
  const s = load(new URL("../fixtures/good/minimal.json", import.meta.url));
  s.beats[0].at = -1;
  assert.equal(checkSchema(s)[0].code, "E_SCHEMA_RANGE");
});

test("closest-match suggestions", () => {
  const moves = ["jab", "cross", "front_kick", "taunt", "victory"];
  assert.equal(closestMatch("flying_kick", moves), "front_kick");
  assert.equal(closestMatch("crosss", moves), "cross");
  assert.equal(closestMatch("flurry", moves), null);
});

test("exported JSON Schema is clean and carries catalog enums", () => {
  const moves = movesFor(catalog);
  const s = buildJsonSchema(catalog, [...moves.keys()], Object.keys(WORLD_COMMANDS));
  const text = JSON.stringify(s);
  assert.ok(!text.includes("x-formMessage"), "no checker-only keywords");
  assert.ok(s.properties.beats.items.properties.do.enum.includes("front_kick"));
  assert.ok(s.properties.beats.items.properties.do.enum.includes("slowmo"));
  assert.deepEqual(s.properties.meta.properties.theme.enum, catalog.themeNames);
  assert.ok(JSON.stringify(jsonSchema).includes("x-formMessage"), "the checker's copy keeps its messages");
});
