import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { assetStatus, assetStatusMd, catalogSets, mapErrors } from "../../tools/lib/assets10k.mjs";

const sets = { characters: new Set(["bear", "fish"]), props: new Set(["book", "rug"]), stages: new Set(["garden"]), features: new Set(["text_card", "move"]) };
const needs = { new: {
  characters: [{ name: "fish", count: 2, ids: ["bb0001", "g10002"], descriptions: ["a fish"] }, { name: "goat", count: 1, ids: ["bb0001"], descriptions: ["a goat"] }],
  props: [{ name: "blanket", count: 1, ids: ["g10002"], descriptions: ["a blanket"] }],
  stages: [], features: [],
} };

test("assetStatus: built, mapped and remaining, and which specs wait", () => {
  const map = { props: { blanket: { use: "rug", how: "a rug with color" } } };
  const st = assetStatus(needs, sets, map);
  assert.deepEqual(st.items.characters.map((x) => x.state), ["built", "remaining"]);
  assert.equal(st.items.props[0].state, "mapped");
  const waiting = st.specs.filter((s) => s.open.length).map((s) => s.id);
  assert.deepEqual(waiting, ["bb0001"]);
  const md = assetStatusMd(st, { specCount: 3, allSpecIds: ["bb0001", "g10002", "g10003"] });
  assert.match(md, /\*\*2 unblocked\*\*/);
  assert.match(md, /bb0001: character `goat`/);
});

const errCases = [
  { map: { props: { x: { use: "nope", how: "something long" } } }, re: /not in the catalog/ },
  { map: { props: { x: { use: "rug" } } }, re: /needs "how"/ },
  { map: { props: { book: { use: "rug", how: "something long" } } }, re: /built now/ },
  { map: { characters: { x: { use: ["bear", "book"], how: "a bear holding a book" } } }, re: null },
];
for (const [i, c] of errCases.entries()) {
  test(`mapErrors case ${i}`, () => {
    const e = mapErrors(c.map, sets);
    if (c.re) assert.match(e.join("\n"), c.re);
    else assert.deepEqual(e, []);
  });
}

test("catalog/asset_map.json maps only onto real catalog entries", () => {
  const map = JSON.parse(readFileSync(new URL("../../catalog/asset_map.json", import.meta.url), "utf8"));
  const errs = mapErrors(map, catalogSets(loadCatalog3d()));
  assert.deepEqual(errs, []);
});
