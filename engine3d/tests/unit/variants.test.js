import { test } from "node:test";
import assert from "node:assert/strict";
import { applyVariant, expandVariants } from "../../catalog/variants.mjs";

const bear = {
  color: "brown", description: "bear", tags: ["toy"],
  head: { at: [0, 1, 0] }, eyes: { at: [0.1, 0.05, 0.2], size: 0.08, color: "ink" }, mouth: { at: [0, -0.1, 0.3], size: 0.07 },
  parts: [
    { p: "sphere", at: [0, 0.4, 0], s: [0.7, 0.7, 0.6] },
    { p: "sphere", at: [0, 0.3, 0.2], s: [0.4, 0.4, 0.3], c: "sand" },
    { p: "sphere", at: [0, 0.2, -0.3], s: [0.1, 0.1, 0.1], name: "tail", hang: [0, 0, -0.05] },
  ],
};

const cases = [
  { name: "scale multiplies every length", v: { like: "bear", scale: 2 }, check: (m) => {
    assert.deepEqual(m.parts[0].at, [0, 0.8, 0]);
    assert.deepEqual(m.parts[0].s, [1.4, 1.4, 1.2]);
    assert.deepEqual(m.parts[2].hang, [0, 0, -0.1]);
    assert.deepEqual(m.head.at, [0, 2, 0]);
    assert.equal(m.eyes.size, 0.16);
    assert.deepEqual(m.mouth.at, [0, -0.2, 0.6]);
  } },
  { name: "recolor swaps part and main colours", v: { like: "bear", recolor: { sand: "cream", brown: "honey", ink: "navy" } }, check: (m) => {
    assert.equal(m.parts[1].c, "cream");
    assert.equal(m.color, "honey");
    assert.equal(m.eyes.color, "navy");
    assert.equal(m.parts[0].c, undefined);
  } },
  { name: "drop removes named parts", v: { like: "bear", drop: ["tail"] }, check: (m) => assert.equal(m.parts.length, 2) },
  { name: "add appends parts unscaled", v: { like: "bear", scale: 2, add: [{ p: "box", at: [0, 1, 0], s: [0.1, 0.1, 0.1], name: "hat" }] }, check: (m) => {
    assert.equal(m.parts.length, 4);
    assert.deepEqual(m.parts[3].at, [0, 1, 0]);
  } },
  { name: "face objects merge into the base", v: { like: "bear", eyes: { iris: "blue" }, description: "Baby Bear" }, check: (m) => {
    assert.equal(m.eyes.iris, "blue");
    assert.equal(m.eyes.size, 0.08);
    assert.equal(m.description, "Baby Bear");
    assert.equal(m.variantOf, "bear");
  } },
];

for (const c of cases) test(`variant: ${c.name}`, () => c.check(applyVariant(bear, c.v)));

test("variant: base is never changed", () => {
  const before = JSON.stringify(bear);
  applyVariant(bear, { like: "bear", scale: 3, recolor: { sand: "red" }, drop: ["tail"] });
  assert.equal(JSON.stringify(bear), before);
});

test("expandVariants resolves chains and checks bases", () => {
  const models = { critters: { bear: structuredClone(bear), mommy: { like: "bear", scale: 1.2 }, baby: { like: "mommy", scale: 0.5 } }, props: {} };
  expandVariants(models);
  assert.ok(Math.abs(models.critters.baby.head.at[1] - 0.6) < 1e-9);
  assert.equal(models.critters.baby.like, undefined);
  assert.throws(() => expandVariants({ critters: { a: { like: "nope" } }, props: {} }), /unknown base/);
  assert.throws(() => expandVariants({ critters: { a: { like: "b" }, b: { like: "a" } }, props: {} }), /cycle/);
  assert.throws(() => expandVariants({ critters: { bear: structuredClone(bear), x: { like: "bear", drop: ["wing"] } }, props: {} }), /names no part/);
});
