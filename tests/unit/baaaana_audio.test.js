// Baaaana task 10: the new SFX recipes, their catalog entries and the bouncy music mood.
import { test } from "node:test";
import assert from "node:assert/strict";
import { synthesize, RECIPE_KEYS } from "../../tools/lib/synth.mjs";
import { catalog } from "../../catalog/index.js";
import { V2_ENUMS } from "../../engine/validator/v2_names.js";

const NEW = ["giggle", "giggle_crowd", "ooh", "raspberry", "slide_whistle", "squeak", "sprout_spring", "toot", "ding"];

for (const key of NEW) {
  test(`sfx ${key}: a catalog key with a recipe that makes sound, the same every time`, () => {
    assert.ok(catalog.sfxKeys.includes(key) && RECIPE_KEYS.includes(key));
    const a = synthesize(key);
    let peak = 0;
    for (const v of a) peak = Math.max(peak, Math.abs(v));
    assert.ok(peak > 0.5 && a.length > 1000, `${key}: peak ${peak}`);
    assert.deepEqual(synthesize(key).slice(0, 2000), a.slice(0, 2000));
  });
}

test("trumpet and triangle sound their notes; the bouncy mood is a catalog mood", () => {
  assert.equal(catalog.objects.trumpet.use.sfx, "toot");
  assert.equal(catalog.objects.triangle.use.sfx, "ding");
  assert.ok(catalog.musicMoods.bouncy && V2_ENUMS.mood.includes("bouncy"));
  const move = (n) => catalog.moves.find((m) => m.name === n);
  assert.ok(move("play_trumpet").events.some((e) => e.sfx === "toot"));
  assert.ok(move("play_triangle").events.some((e) => e.sfx === "ding"));
});
