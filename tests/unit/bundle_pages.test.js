// Bundles in the showcase, the context pack and the lean prompts (CATALOG_BUNDLE_SPEC B5). The pages
// themselves are checked in the browser; this checks the data they are built from.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSections } from "../../web/lib/showcase_data.js";
import { withBundles, markBundleCards } from "../../web/lib/showcase_bundles.js";
import { checkBundle } from "../../tools/lib/bundle/check.mjs";
import { catalogWithBundles } from "../../tools/lib/bundle/load.mjs";
import { bundleContextPack, CONTEXT_BUDGET, pinsLine } from "../../tools/lib/bundle/context.mjs";
import { packManifest } from "../../tools/lib/bundle/manifest.mjs";
import { readBundleDir, nodeContext } from "../../tools/lib/bundle_node.mjs";
import { withBundleLine, leanWritePrompt } from "../../tools/lib/lean_prompts.mjs";
import { validate } from "../../engine/index.js";
import { FIXTURES, goodFiles } from "../helpers/bundle_fixtures.js";

const read = (p) => JSON.parse(readFileSync(new URL(`../../catalog/generated/${p}`, import.meta.url), "utf8"));
const FULL = read("catalog.json");
const VOCAB = read("engine_vocab.json");
const result = checkBundle(readBundleDir(`${FIXTURES}robo_pals`).entries, { ...nodeContext(), determinism: false });
const robo = result.bundle;
const merged = catalogWithBundles(FULL.catalog, [robo]);

test("showcase: with the Bundles switch, every entry the bundle adds gets a card in its section, marked, with a preview that validates", () => {
  const full = { ...withBundles(FULL, [robo], [result]), catalog: merged };
  const sections = markBundleCards(buildSections(full, VOCAB), [robo]);
  const card = (section, id) => sections.find((s) => s.id === section).cards.find((c) => c.id === id);
  const want = [["characters", "body-robo_pals:boxbot"], ["characters", "robo_pals:bolt"], ["moves", "robo_pals:robot_dance"], ["objects", "robo_pals:charging_pad"], ["examples", "robo_pals-stories-bolt_dances"]];
  for (const [s, id] of want) {
    const c = card(s, id);
    assert.ok(c, `${s}/${id}`);
    assert.match(c.meta, /from Robo Pals 1\.0\.0/);
    assert.ok(c.tags.includes("bundle"));
    const r = validate(c.script({ body: "stickman", color: "#2f7fd9" }), merged);
    assert.deepEqual(r.errors, [], `${s}/${id}`);
  }
  assert.ok(card("characters", "robo_pals:bolt").meta.includes("good on: white_stage"));
  const plain = buildSections(FULL, VOCAB);
  assert.deepEqual(markBundleCards(plain, []), plain.map((s) => ({ ...s, cards: [...s.cards] })), "no bundles: the sections are unchanged");
});

test("showcase: bundle music moods point at a safe clip name and say there is no browser preview", () => {
  const files = structuredClone(goodFiles("robo_pals"));
  const mood = structuredClone(FULL.catalog.musicMoods.playful);
  files["story/music_moods.json"] = { moods: { "robo_pals:beeps": mood } };
  const m = catalogWithBundles(FULL.catalog, [{ ...robo, files }]);
  const s = markBundleCards(buildSections({ ...FULL, catalog: m }, VOCAB), [{ ...robo, files }]).find((x) => x.id === "music");
  const c = s.cards.find((x) => x.id === "robo_pals:beeps");
  assert.match(c.audio, /moods\/robo_pals__beeps\.wav$/);
  assert.match(c.description, /No preview is generated in the browser/);
});

test("context pack: the bundles line with the hash, every entry, under 6 KB", () => {
  const text = bundleContextPack(robo, merged, result.report);
  assert.ok(Buffer.byteLength(text) <= CONTEXT_BUDGET, `${Buffer.byteLength(text)} bytes`);
  assert.ok(text.includes(`"bundles": ${pinsLine(robo)}`) && text.includes(robo.hash));
  for (const name of ["robo_pals:boxbot", "robo_pals:bolt", "robo_pals:robot_dance", "robo_pals:charging_pad"]) assert.ok(text.includes(name), name);
  assert.doesNotMatch(text, /keys|"t":/, "no keyframes");
});

test("context pack: a bundle near every cap stays within 7.5 KB and names what it leaves out", () => {
  const files = structuredClone(goodFiles("robo_pals"));
  const dance = files["moves/emotes.json"][0];
  files["moves/emotes.json"] = Array.from({ length: 64 }, (_, i) => ({ ...structuredClone(dance), name: `robo_pals:dance${i}` }));
  const pad = files["world/objects.json"]["robo_pals:charging_pad"];
  files["world/objects.json"] = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`robo_pals:pad${i}`, pad]));
  files["bundle.json"] = packManifest(files["bundle.json"], files);
  const big = { ...robo, files, manifest: files["bundle.json"], hash: files["bundle.json"].contentHash };
  const text = bundleContextPack(big, catalogWithBundles(FULL.catalog, [big]), {});
  assert.ok(Buffer.byteLength(text) <= 7.5 * 1024, `${Buffer.byteLength(text)} bytes`);
  assert.match(text, /## Also in this bundle/);
  assert.ok(text.includes(big.hash));
});

test("lean prompts name the attached bundle packs and the bundles line on their second line", () => {
  const text = withBundleLine(leanWritePrompt("1-abc", { title: "T", logline: "L" }, { format: "landscape", length: 30, seed: 1 }), [robo]);
  const lines = text.split("\n");
  assert.match(lines[0], /^Use the Stickman catalog files/);
  assert.match(lines[1], /bundle_robo_pals\.md.*"bundles": \[\{"id":"robo_pals","version":"1\.0\.0","hash":"sha256-/);
  assert.equal(withBundleLine("x\ny", []), "x\ny");
});
