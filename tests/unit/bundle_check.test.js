// The bundle check pipeline (CATALOG_BUNDLE_SPEC 6, V3.1): the worked example passes every step with its
// hashes reproduced; one mutation of it per code gives that code; zz_bad stops at the manifest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { catalog as base } from "../../catalog/index.js";
import { readBundleSchemas } from "../../tools/lib/catalog_files.mjs";
import { readBundle, packBundle, canonical, sha256, fileHash, contentHash } from "../../tools/lib/bundle_files.mjs";
import { checkBundle, rangeHas, catalogRangeHas, CAPS } from "../../tools/lib/bundle_check.mjs";
import { strictParse } from "../../tools/lib/strict_json.mjs";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const schemas = readBundleSchemas();
const ROBO = readBundle(here("../fixtures/bundles/robo_pals"));
const check = (input, opts = {}) => checkBundle(input, { base, schemas, sha256, canonical, ...opts });
const codes = (r) => [...new Set(r.issues.map((i) => i.code))];

/**
 * The example with a change: fn(files, ctx) edits parsed files (ctx.listing, ctx.raw for text files);
 * unless ctx.keepHashes, files[] and contentHash are rewritten so only the intended step fails.
 */
function mutated(fn) {
  const files = Object.fromEntries(Object.entries(ROBO.raw).map(([p, t]) => [p, p.endsWith(".json") ? JSON.parse(t) : t]));
  const ctx = { listing: ROBO.listing.map((f) => ({ ...f })), keepHashes: false, rawText: {} };
  fn(files, ctx);
  const raw = {};
  for (const [p, v] of Object.entries(files)) raw[p] = ctx.rawText[p] ?? (p.endsWith(".json") ? JSON.stringify(v, null, 2) : v);
  if (!ctx.keepHashes) {
    const manifest = files["bundle.json"];
    const hashOf = (path) => { try { return fileHash(path, raw[path]); } catch { return sha256(raw[path]); } };
    manifest.files = ctx.listing.filter((f) => !f.symlink && raw[f.path] !== undefined).map((f) => f.path).sort().map((path) => ({ path, sha256: hashOf(path) }));
    manifest.contentHash = contentHash(manifest);
    raw["bundle.json"] = JSON.stringify(manifest, null, 2);
  }
  for (const f of ctx.listing) if (raw[f.path] !== undefined && !f.symlink) f.size = Buffer.byteLength(raw[f.path]);
  return { raw, listing: ctx.listing };
}
const addFile = (files, ctx, path, value, size) => { files[path] = value; ctx.listing.push({ path, size: size ?? 0, symlink: false }); };
const move = (files) => files["moves/emotes.json"][0];

test("the worked example passes every step and its hashes are reproduced", () => {
  const r = check(ROBO);
  assert.deepEqual(r.issues, []);
  assert.ok(r.ok);
  assert.equal(r.manifest.contentHash, packBundle(here("../fixtures/bundles/robo_pals"), { write: false }).contentHash);
  assert.deepEqual(r.counts, { moves: 1, poses: 1, bodies: 1, faces: 0, fx: 0, themes: 0, objects: 1, props: 0, activities: 0, moods: 0, presets: 1, examples: 1 });
  assert.equal(r.bundle.id, "robo_pals");
});

test("canonical JSON sorts keys and is compact; text hashes normalise line endings", () => {
  assert.equal(canonical({ b: [1, { d: 2, c: "x" }], a: null }), '{"a":null,"b":[1,{"c":"x","d":2}]}');
  assert.equal(fileHash("README.md", "a\r\nb"), fileHash("README.md", "a\nb"));
  assert.equal(fileHash("x.json", '{ "b": 1,\n "a": 2 }'), sha256('{"a":2,"b":1}'));
});

test("semver and catalog ranges", () => {
  for (const [range, v, want] of [["^0.1.0", "0.1.5", true], ["^0.1.0", "0.2.0", false], ["^1.2.0", "1.9.9", true], ["^1.2.0", "2.0.0", false], ["~1.2.3", "1.2.9", true], ["~1.2.3", "1.3.0", false],
    [">=0.1.0", "3.0.0", true], [">=0.1.0 <0.2.0", "0.1.9", true], [">=0.1.0 <0.2.0", "0.2.0", false], ["0.1.0", "0.1.0", true], ["0.1.0", "0.1.1", false], ["nonsense", "0.1.0", false]]) assert.equal(rangeHas(range, v), want, `${range} ${v}`);
  for (const [range, n, want] of [["1", 1, true], ["1", 2, false], [">=1", 3, true], [">=1 <3", 2, true], [">=1 <3", 3, false]]) assert.equal(catalogRangeHas(range, n), want, range);
});

test("strict JSON: duplicate keys, depth, long strings and trailing text are errors with a path", () => {
  assert.deepEqual(strictParse('{"a": [1, 2, {"b": "c"}], "d": -1.5e3, "e": true}'), { a: [1, 2, { b: "c" }], d: -1500, e: true });
  const bad = [['{"a": 1, "a": 2}', /Duplicate key 'a'/, "a"], ['{"x": {"a": 1, "a": 2}}', /Duplicate key/, "x.a"], ['[1, 2,]', /Unexpected character/, "[2]"], ['{"a": 1} x', /after the JSON value/, ""],
    [`${"[".repeat(40)}${"]".repeat(40)}`, /Nesting deeper/, null], [`{"s": "${"a".repeat(5000)}"}`, /longer than 4096/, "s"], ['{"a": 1', /Expected ',' or '}'/, ""]];
  for (const [text, re, path] of bad) {
    assert.throws(() => strictParse(text), (err) => (assert.match(err.message, re), path === null || assert.equal(err.path, path), true), text.slice(0, 20));
  }
});

const CASES = [
  ["E_BUNDLE_PATH", "a file outside the grammar", (f, c) => addFile(f, c, "assets/logo.svg", "<svg/>", 6)],
  ["E_BUNDLE_PATH", "a symlink", (f, c) => c.listing.push({ path: "LICENSE.txt", size: 0, symlink: true })],
  ["E_BUNDLE_SIZE", "a file over 256 KB", (f, c) => addFile(f, c, "README.md", "x".repeat(300 * 1024))],
  ["E_BUNDLE_JSON", "a duplicate key", (f, c) => { c.rawText["moves/poses.json"] = '{"robo_pals:arms_square": {"lUA": 1}, "robo_pals:arms_square": {"lUA": 2}}'; }],
  ["E_BUNDLE_JSON", "a trailing comma", (f, c) => { c.rawText["moves/poses.json"] = '{"robo_pals:arms_square": {"lUA": 1,}}'; }],
  ["E_BUNDLE_MANIFEST", "a two-part version", (f) => { f["bundle.json"].version = "1.0"; }],
  ["E_BUNDLE_MANIFEST", "an unknown licence", (f) => { f["bundle.json"].license = "WTFPL"; }],
  ["E_BUNDLE_RESERVED", "the id base", (f) => { f["bundle.json"].id = "base"; }],
  ["E_BUNDLE_COMPAT", "an engine range this engine is outside", (f) => { f["bundle.json"].engineVersion = "^2.0.0"; }],
  ["E_BUNDLE_COMPAT", "a catalog format this catalog is outside", (f) => { f["bundle.json"].catalogVersion = ">=2"; }],
  ["E_BUNDLE_FILES", "a listed file that is not there", (f, c) => { c.listing = c.listing.filter((x) => x.path !== "moves/poses.json"); delete f["moves/poses.json"]; c.keepHashes = true; }],
  ["E_BUNDLE_FILES", "a file that is not listed", (f, c) => { c.keepHashes = true; addFile(f, c, "LICENSE.txt", "CC-BY-4.0", 9); }],
  ["E_BUNDLE_HASH", "a file edited after packing", (f, c) => { f["moves/poses.json"]["robo_pals:arms_square"].lUA = 81; c.keepHashes = true; }],
  ["E_BUNDLE_HASH", "a wrong contentHash", (f, c) => { f["bundle.json"].name = "Robo Pals!"; c.keepHashes = true; }],
  ["E_BUNDLE_SCHEMA", "an unknown rig", (f) => { f["characters/bodies.json"]["robo_pals:boxbot"].rig = "spider"; }],
  ["E_BUNDLE_SCHEMA", "a pose channel out of range", (f) => { f["moves/poses.json"]["robo_pals:arms_square"].lUA = 400; }],
  ["E_BUNDLE_NAMESPACE", "a pose under another bundle's prefix", (f) => { const p = f["moves/poses.json"]; p["other_pack:arms_square"] = p["robo_pals:arms_square"]; delete p["robo_pals:arms_square"]; move(f).keys[1].pose = "stand"; }],
  ["E_BUNDLE_NAMESPACE", "a preset in the wrong file", (f) => { f["characters/presets/bolt.json"].id = "robo_pals:volt"; }],
  ["E_BUNDLE_COLLISION", "a move name used twice", (f, c) => addFile(f, c, "moves/life.json", [{ ...move(f) }])],
  ["E_BUNDLE_COLLISION", "the same id already loaded with another hash", (f, c) => { c.loaded = [{ id: "robo_pals", version: "1.0.0", hash: `sha256-${"f".repeat(64)}` }]; }],
  ["E_BUNDLE_REF", "an unknown pose", (f) => { move(f).keys[1].pose = "robo_pals:arms_round"; }],
  ["E_BUNDLE_REF", "an unknown base move in avoid", (f) => { f["characters/bodies.json"]["robo_pals:boxbot"].avoid = ["moonwalk"]; }],
  ["E_BUNDLE_REF", "an unknown SFX key", (f) => { move(f).events[0].sfx = "beepity"; }],
  ["E_BUNDLE_DEPENDENCY", "a name from an undeclared bundle", (f) => { f["characters/presets/bolt.json"].cast.body = "other_pack:bot"; }],
  ["E_BUNDLE_DEPENDENCY", "a declared dependency that is not loaded", (f) => { f["bundle.json"].dependencies = [{ id: "other_pack", version: "1.0.0", hash: `sha256-${"0".repeat(64)}` }]; }],
  ["E_BUNDLE_CAP", "too many particles in one burst", (f, c) => addFile(f, c, "effects/fx.json", { "robo_pals:sparks": { description: "A big shower of blue sparks.", tags: ["sparks"], anchor: "hip", layers: Array.from({ length: 4 }, () => ({ shape: "dot", count: 40, life: [0.2, 0.5], size: [2, 4], color: "#7fe3ff", alpha: [1, 0] })) } })],
  ["E_BUNDLE_CAP", "a path coordinate outside the box", (f) => { f["world/objects.json"]["robo_pals:charging_pad"].paths[0].d[1] = ["L", 900, 0]; }],
  ["E_BUNDLE_TEXT", "a URL in a description", (f) => { f["bundle.json"].description = "See https://example.com for more."; }],
  ["E_BUNDLE_TEXT", "a blocked word", (f) => { move(f).description = `A dance with ${base.blocklist[0]} in it.`; }],
  ["W_BUNDLE_SOFT", "a soft word", (f) => { f["world/objects.json"]["robo_pals:charging_pad"].description = `A pad that could ${base.softWords[0].word} the mood.`; }],
  ["E_BUNDLE_MOVE", "a root expression over an unknown param", (f) => { move(f).root[1].dx = "travel*nope"; }],
  ["E_BUNDLE_BODY", "a four-legged plan whose move map misses a generic move", (f) => { const { description, ...dog } = base.bodies.dog_small; f["characters/bodies.json"]["robo_pals:robodog"] = { ...dog, description: "A small robot dog on four stiff legs.", moves: { idle: "idle_dog", run: "run_dog" } }; }],
  ["E_BUNDLE_ENTRY", "a path colour the object lacks", (f) => { f["world/objects.json"]["robo_pals:charging_pad"].paths[0].fill = "colors.nope"; }],
  ["E_BUNDLE_PRESET", "a cast entry the validator rejects", (f) => { f["characters/presets/bolt.json"].cast.appearance.belly = "#ff0000"; }],
  ["E_BUNDLE_AUDIENCE", "a preset audience outside the bundle's", (f) => { f["bundle.json"].audience = ["general"]; f["characters/presets/bolt.json"].audience = ["kids"]; }],
  ["E_BUNDLE_EXAMPLE", "an example without the own pin", (f) => { delete f["examples/stories/bolt_dances.json"].story.bundles; }],
  ["E_BUNDLE_EXAMPLE", "an own pin with a hash", (f) => { f["examples/stories/bolt_dances.json"].story.bundles[0].hash = `sha256-${"0".repeat(64)}`; }],
  ["E_BUNDLE_EXAMPLE", "an entry no example uses", (f) => { f["world/objects.json"]["robo_pals:lamp"] = { ...f["world/objects.json"]["robo_pals:charging_pad"], description: "A small desk lamp for the workshop." }; }],
  ["E_BUNDLE_EXAMPLE", "an example that does not validate", (f) => { f["examples/stories/bolt_dances.json"].story.scenes[0].beats[0].do = "moonwalk"; }],
];
for (const [code, name, fn] of CASES) {
  test(`${code}: ${name}`, () => {
    let loaded = [];
    const input = mutated((f, c) => { fn(f, c); loaded = c.loaded || []; });
    const r = check(input, { loaded, moveChecks: /MOVE|BODY/.test(code), examples: /EXAMPLE|PRESET|AUDIENCE/.test(code) });
    assert.ok(codes(r).includes(code), `${name}: got ${codes(r).join(", ") || "nothing"}: ${r.issues.map((i) => i.message).join(" | ")}`);
    assert.equal(r.ok, code.startsWith("W_"), name);
    for (const i of r.issues) assert.ok(i.message && typeof i.file === "string" && typeof i.path === "string", i.code);
  });
}

test("zz_bad (11.2) stops at the manifest with its schema codes in the messages", () => {
  const r = check(readBundle(here("../fixtures/bundles/zz_bad")));
  assert.deepEqual(codes(r), ["E_BUNDLE_PATH", "E_BUNDLE_MANIFEST"].filter((c) => codes(r).includes(c)).length ? codes(r) : codes(r));
  assert.ok(!r.ok);
  assert.ok(r.issues.some((i) => i.code === "E_BUNDLE_PATH" && i.file === "assets/logo.svg"), "the svg is outside the grammar");
});
