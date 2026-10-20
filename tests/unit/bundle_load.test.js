// Loading bundles for scripts (CATALOG_BUNDLE_SPEC 7, B3): dependencies, the combination check, the
// validator against a merged catalog, and same frames twice.

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBundle } from "../../tools/lib/bundle/check.mjs";
import { packManifest } from "../../tools/lib/bundle/manifest.mjs";
import { catalogWithBundles, combinationFailures } from "../../tools/lib/bundle/load.mjs";
import { simHash } from "../../tools/lib/bundle/determinism.mjs";
import { loadBundlePaths, nodeContext } from "../../tools/lib/bundle_node.mjs";
import { splitBundleArgs, bundleCredits } from "../../tools/lib/bundle_args.mjs";
import { validate, createEngine } from "../../engine/index.js";
import { catalog as base } from "../../catalog/index.js";
import { FIXTURES, goodFiles } from "../helpers/bundle_fixtures.js";

const entriesOf = (files) => Object.entries(files).map(([path, v]) => ({ path, bytes: new TextEncoder().encode(typeof v === "string" ? v : JSON.stringify(v)) }));
const pin = (b) => ({ id: b.id, version: b.version, hash: b.hash });

/** robo_pals under another id: the same entries, renamed, packed. */
function twin(id) {
  const files = JSON.parse(JSON.stringify(goodFiles("robo_pals")).replaceAll("robo_pals", id));
  files["bundle.json"] = packManifest({ ...files["bundle.json"], name: "Robo Twins" }, files);
  return files;
}
const check = (files, extra = {}) => checkBundle(entriesOf(files), { ...nodeContext(), determinism: false, ...extra });
const robo = () => check(goodFiles("robo_pals")).bundle;

/** The bolt story with its own pin. */
function boltStory(bundles) {
  const s = structuredClone(goodFiles("robo_pals")["examples/stories/bolt_dances.json"].story);
  return { ...s, bundles };
}

test("loadBundlePaths: the worked example becomes part of the catalog, and the bolt story validates against it", async () => {
  const { catalog, bundles, failures } = await loadBundlePaths([`${FIXTURES}robo_pals`]);
  assert.deepEqual(failures, []);
  assert.deepEqual(catalog.bundles.map((b) => b.id), ["robo_pals"]);
  assert.deepEqual(catalog.bundleCombos, []);
  const r = validate(boltStory([pin(bundles[0])]), catalog);
  assert.deepEqual(r.errors, []);
  assert.equal(validate(boltStory([pin(bundles[0])]), base).errors[0].code, "E_BUNDLE_MISSING");
});

test("a bundle that depends on another: checked with the dependency loaded, declared together in scripts", () => {
  const dep = robo();
  const files = twin("robo_hats");
  files["characters/bodies.json"] = {}; // robo_hats only adds a face, and uses robo_pals's body plan
  delete files["characters/bodies.json"];
  files["characters/faces.json"] = { "robo_hats:beep": { description: "A robot face with a wide happy screen.", tags: ["robot"], eyes: "wide", brows: null, mouth: "grin" } };
  const story = files["examples/stories/bolt_dances.json"].story;
  story.cast[1].body = "robo_pals:boxbot";
  story.scenes[0].beats[0].params.lines[0][2] = "robo_hats:beep";
  story.bundles.push(pin(dep));
  files["characters/presets/bolt.json"].cast.body = "robo_pals:boxbot";
  files["bundle.json"] = packManifest({ ...files["bundle.json"], dependencies: [pin(dep)] }, files);
  const alone = check(files);
  assert.ok(alone.errors.some((e) => e.code === "E_BUNDLE_DEPENDENCY" && /not loaded/.test(e.message)), JSON.stringify(alone.errors));
  const r = check(files, { loaded: [dep] });
  assert.deepEqual(r.errors.filter((e) => e.code !== "E_BUNDLE_EXAMPLE" || !/do not use/.test(e.message)), [], "only unused own entries may remain");
  const hats = { ...r.bundle };
  const cat = catalogWithBundles(base, [dep, hats]);
  const s = boltStory([pin(hats)]);
  s.cast[1].body = "robo_pals:boxbot";
  s.scenes[0].beats[1].do = "robo_hats:robot_dance";
  s.locations[0].set[0].object = "robo_hats:charging_pad";
  const missingDep = validate(s, cat);
  assert.ok(missingDep.errors.some((e) => e.code === "E_BUNDLE_DEPENDENCY"), JSON.stringify(missingDep.errors));
  assert.deepEqual(validate({ ...s, bundles: [pin(hats), pin(dep)] }, cat).errors, []);
});

test("the combination check: bundles that do not depend on each other run each other's moves on their body plans", () => {
  const a = robo();
  const b = check(twin("robo_twin")).bundle;
  assert.ok(b, "the twin checks clean");
  assert.deepEqual(catalogWithBundles(base, [a, b]).bundleCombos, [], "the real runner finds nothing wrong");
  const calls = [];
  const broken = (def, moves, cat, { plans }) => (calls.push(`${def.name} on ${plans[0]}`), def.name === "robo_twin:robot_dance" && plans[0] === "robo_pals:boxbot" ? ["robo_pals:boxbot: a joint becomes NaN"] : []);
  const merged = catalogWithBundles(base, [a, b], { run: broken });
  assert.deepEqual(calls.sort(), ["robo_pals:robot_dance on robo_twin:boxbot", "robo_twin:robot_dance on robo_pals:boxbot"]);
  assert.deepEqual(merged.bundleCombos, [{ bundles: ["robo_twin", "robo_pals"], move: "robo_twin:robot_dance", body: "robo_pals:boxbot", message: "robo_pals:boxbot: a joint becomes NaN" }]);
  const story = boltStory([pin(a), pin(b)]);
  const r = validate(story, merged);
  assert.deepEqual(r.errors.map((e) => e.code), ["E_BUNDLE_COMBO"]);
  assert.match(r.errors[0].message, /robo_twin:robot_dance.*robo_pals:boxbot/);
  assert.deepEqual(validate(boltStory([pin(a)]), merged).errors, [], "a script with only one of them is fine");
  assert.deepEqual(combinationFailures([a], merged), []);
});

test("same script, same bundle hash: same frames, in fresh engines", async () => {
  const { catalog, bundles } = await loadBundlePaths([`${FIXTURES}robo_pals`]);
  const s = boltStory([pin(bundles[0])]);
  const h1 = simHash(s, catalog);
  const h2 = simHash(s, (await loadBundlePaths([`${FIXTURES}robo_pals`])).catalog);
  assert.match(h1, /^sha256-/);
  assert.equal(h1, h2);
  const e = createEngine({ catalog });
  const r = e.load(s);
  assert.ok(r.ok && r.totalFrames > 300);
  assert.ok(e.getFrame(200).chars.some((c) => c.id === "bolt"));
});

test("--bundle arguments and credits", () => {
  assert.deepEqual(splitBundleArgs(["a.json", "--bundle", "x", "--json", "--bundle", "y.zip"]), { args: ["a.json", "--json"], paths: ["x", "y.zip"] });
  const b = robo();
  assert.deepEqual(bundleCredits({ bundles: [pin(b)] }, [b]), [{ id: "robo_pals", version: "1.0.0", hash: b.hash, name: "Robo Pals", author: "Example Author", license: "CC-BY-4.0" }]);
  assert.deepEqual(bundleCredits({}, [b]), []);
});
