// Baaaana task 6: crowd kinds and seeded crowd members (engine/story/crowd.js, extras with `crowd`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { crowdMember } from "../../engine/story/crowd.js";
import { planExtras } from "../../engine/story/extras.js";
import { V2_ENUMS } from "../../engine/validator/v2_names.js";

const kind = catalog.crowds.baaaana_crowd;
const crowd = (seed, key = "s:0", n = 30) => Array.from({ length: n }, (_, i) => crowdMember(kind, seed, key, i));

test("the baaaana crowd kind only names things the catalog has", () => {
  for (const b of kind.bodies) assert.ok(catalog.bodies[b], b);
  for (const e of kind.eyes) assert.ok(V2_ENUMS.eyes.includes(e), e);
  for (const m of kind.mouthStyles) assert.ok(V2_ENUMS.mouthStyle.includes(m), m);
  for (const a of [...kind.sprouts, ...kind.accents].map((x) => x.name).concat(Object.keys(kind.always))) assert.ok(catalog.appearance.accessories.includes(a), a);
  assert.ok(kind.description && kind.tags.length);
});

test("members are the same for the same seed and key, and differ for another seed or scene", () => {
  assert.deepEqual(crowd(4), crowd(4));
  assert.notDeepEqual(crowd(4), crowd(5));
  assert.notDeepEqual(crowd(4, "a:0"), crowd(4, "b:0"));
});

const SPREAD = [
  // [what, value of a member, at least this many different values among 30]
  ["body plans", (m) => m.body, 3],
  ["colours", (m) => m.color, 6],
  ["mouths", (m) => m.appearance.mouthStyle, 3],
  ["sprout kinds", (m) => Object.keys(m.appearance.accessories).find((k) => kind.sprouts.some((s) => s.name === k)), 4],
  ["heights", (m) => Math.round(m.scale * 10), 3],
];
for (const [what, val, min] of SPREAD) {
  test(`30 members vary in ${what}`, () => {
    assert.ok(new Set(crowd(11).map(val)).size >= min);
  });
}

test("every member has exactly one sprout, the shared pieces, at most one accent, and a height in range", () => {
  for (const m of crowd(21, "x:0", 200)) {
    const acc = Object.keys(m.appearance.accessories);
    assert.equal(acc.filter((k) => kind.sprouts.some((s) => s.name === k)).length, 1);
    for (const k of Object.keys(kind.always)) assert.ok(acc.includes(k));
    assert.ok(acc.filter((k) => kind.accents.some((a) => a.name === k)).length <= 1);
    assert.ok(m.scale >= kind.scale[0] && m.scale <= kind.scale[1]);
  }
});

test("extras with a crowd get members' looks; plain extras stay faceless and unchanged", () => {
  const scene = { id: "meadow", extras: [{ count: 6, behavior: "cheer", crowd: "baaaana_crowd" }] };
  const xs = planExtras(scene, null, catalog, 3);
  assert.equal(xs.length, 6);
  for (const e of xs) assert.ok(e.look && kind.bodies.includes(e.plan) && kind.colors.includes(e.color));
  const plain = planExtras({ id: "meadow", extras: [{ count: 6, behavior: "cheer" }] }, null, catalog, 3);
  assert.ok(plain.every((e) => !e.look));
  assert.deepEqual(plain.map((e) => e.x), xs.map((e) => e.x), "places come from the same stream");
});
