// The bundle check pipeline (CATALOG_BUNDLE_SPEC 6, B2): one fixture per code, the worked example packs and
// checks clean (folder and zip), the codes table matches what the pipeline can report, and the merge.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkBundle } from "../../tools/lib/bundle/check.mjs";
import { BUNDLE_CODES } from "../../tools/lib/bundle/codes.mjs";
import { packManifest, contentHashOf, inRange, inCatalogRange } from "../../tools/lib/bundle/manifest.mjs";
import { readZip } from "../../tools/lib/bundle/archive.mjs";
import { MOVE_GROUPS, catalogFragment } from "../../tools/lib/bundle/layout.mjs";
import { readBundleDir, nodeContext, nodeInflate } from "../../tools/lib/bundle_node.mjs";
import { mergeBundles } from "../../catalog/merge.js";
import { MOVE_FILES, catalog as base } from "../../catalog/index.js";
import { zip } from "../../tools/lib/zip.mjs";
import { FIXTURES, goodFiles, fixtureInput, readFixture } from "../helpers/bundle_fixtures.js";

const BAD = `${FIXTURES}bad/`;
const fixtures = readdirSync(BAD).filter((f) => f.endsWith(".json")).sort();
const key = (i) => `${i.code} ${i.file} ${i.path}`;

for (const f of fixtures) {
  const fx = readFixture(`${BAD}${f}`);
  test(`bundle fixture ${f}: ${fx.why}`, async () => {
    const { entries, ctx } = await fixtureInput(fx);
    const r = checkBundle(entries, ctx);
    const all = [...r.errors, ...r.warnings];
    const want = new Set(fx.expect.map((e) => e.code));
    const got = new Set(all.map((i) => i.code).filter((c) => c !== "W_BUNDLE_UNREVIEWED" || want.has(c)));
    assert.deepEqual([...got].sort(), [...want].sort(), all.map(key).join("\n"));
    for (const e of fx.expect) assert.ok(all.some((i) => i.code === e.code && i.file === e.file && i.path === e.path), `missing ${key(e)}; got\n${all.map(key).join("\n")}`);
    for (const i of all) assert.ok(i.message && typeof i.fix === "string", key(i));
  });
}

test("every bundle code has a fixture named after it, and every fixture's code is in the table", () => {
  assert.deepEqual(fixtures.map((f) => f.replace(".json", "")), Object.keys(BUNDLE_CODES).sort());
});

test("every code the pipeline can report is in the codes table", () => {
  const dir = fileURLToPath(new URL("../../tools/lib/bundle/", import.meta.url));
  const text = readdirSync(dir).filter((f) => f.endsWith(".mjs") && f !== "codes.mjs").map((f) => readFileSync(dir + f, "utf8")).join("\n") + readFileSync(fileURLToPath(new URL("../../tools/lib/bundle_node.mjs", import.meta.url)), "utf8");
  const used = new Set(text.match(/\b[EW]_BUNDLE_[A-Z]+\b/g));
  assert.deepEqual([...used].sort(), Object.keys(BUNDLE_CODES).sort());
});

test("the worked example robo_pals packs to its committed manifest and checks clean", async () => {
  const files = goodFiles("robo_pals");
  assert.deepEqual(packManifest(files["bundle.json"], files), files["bundle.json"], "run: node tools/bundle.mjs pack tests/fixtures/bundles/robo_pals --i-made-this");
  const r = checkBundle(readBundleDir(`${FIXTURES}robo_pals`).entries, nodeContext());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings.map((w) => w.code), ["W_BUNDLE_UNREVIEWED"]);
  assert.deepEqual(r.report.steps.filter((s) => s.skipped), []);
  assert.deepEqual(r.report.counts, { pose: 1, move: 1, body: 1, preset: 1, object: 1 });
  assert.ok(r.report.goodThemes["robo_pals:bolt"].length > 0);
  assert.equal(r.bundle.hash, files["bundle.json"].contentHash);
  const allowed = checkBundle(readBundleDir(`${FIXTURES}robo_pals`).entries, { ...nodeContext(), allowlist: [{ hash: r.bundle.hash }] });
  assert.deepEqual([...allowed.errors, ...allowed.warnings], []);
});

test("the same bundle as a zip gives the same result", async () => {
  const { entries } = readBundleDir(`${FIXTURES}robo_pals`);
  const bytes = new Uint8Array(zip(entries.map((e) => ({ name: e.path, data: Buffer.from(e.bytes) }))));
  const z = await readZip(bytes, { inflateRaw: nodeInflate });
  assert.deepEqual(z.issues, []);
  const r = checkBundle(z.entries, nodeContext());
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.equal(r.bundle.hash, goodFiles("robo_pals")["bundle.json"].contentHash);
});

test("the invalid bundle zz_bad (11.2) stops at step 1 on its SVG file", () => {
  const r = checkBundle(readBundleDir(`${FIXTURES}zz_bad`).entries, nodeContext());
  assert.deepEqual(r.errors.map(key), ["E_BUNDLE_PATH assets/logo.svg "]);
});

test("the 11.2 table: zz_bad's later problems once the earlier ones are fixed", async () => {
  const files = structuredClone(goodFiles("zz_bad", { jsonOnly: true })); // without assets/logo.svg (step 1)
  const codesOf = (fs, ctx = nodeContext()) => {
    fs["bundle.json"] = packManifest(fs["bundle.json"], fs);
    const r = checkBundle(Object.entries(fs).map(([path, v]) => ({ path, bytes: new TextEncoder().encode(JSON.stringify(v)) })), ctx);
    return [...r.errors, ...r.warnings].map(key).filter((k) => !k.startsWith("W_BUNDLE_UNREVIEWED"));
  };
  assert.deepEqual(codesOf(structuredClone(files)), ["E_BUNDLE_MANIFEST bundle.json version", "E_BUNDLE_MANIFEST bundle.json license"]);
  Object.assign(files["bundle.json"], { version: "1.0.0", license: "CC-BY-4.0" });
  assert.deepEqual(codesOf(structuredClone(files)), ["E_BUNDLE_FILES examples/index.json "]);
  files["examples/index.json"] = { examples: [{ path: "clips/punch.json", kind: "clip", title: "Punch", description: "Shows the mega punch on a training dummy.", tags: ["fight"] }] };
  files["examples/clips/punch.json"] = { version: 1, meta: { title: "Punch", format: "landscape", seed: 1 }, characters: [{ id: "a", x: 1000, facing: 1, color: "#3fd8ff" }], camera: [{ at: 0, mode: "follow" }], beats: [] };
  assert.deepEqual(codesOf(structuredClone(files)), [
    "E_BUNDLE_SCHEMA moves/unarmed.json [0].description",
    "E_BUNDLE_SCHEMA world/themes.json zz_bad:forest.sky.top",
    "E_BUNDLE_SCHEMA world/themes.json zz_bad:forest.layers[0].spacing",
    "E_BUNDLE_SCHEMA world/themes.json zz_bad:forest.layers[1].kind",
  ]);
  files["moves/unarmed.json"][0].description = "A huge, slow punch.";
  Object.assign(files["world/themes.json"]["zz_bad:forest"], { sky: { top: "#87ceeb", bottom: "#cfe8ff" }, layers: [{ ...files["world/themes.json"]["zz_bad:forest"].layers[0], spacing: 300 }] });
  assert.deepEqual(codesOf(structuredClone(files)), ["E_BUNDLE_NAMESPACE moves/unarmed.json [1].name"]);
  files["moves/unarmed.json"].pop();
  const later = codesOf(structuredClone(files));
  for (const k of ["E_BUNDLE_REF moves/unarmed.json [0].keys[1].pose", "E_BUNDLE_TEXT effects/fx.json zz_bad:blink.layers[0].text", "W_BUNDLE_REVIEW effects/fx.json zz_bad:blink"]) assert.ok(later.includes(k), `${k}\n${later.join("\n")}`);
  files["moves/unarmed.json"][0].keys[1].pose = "punchExtend";
  const last = codesOf(structuredClone(files));
  assert.ok(last.some((k) => k.startsWith("E_BUNDLE_MOVE moves/unarmed.json [0]")), last.join("\n"));
});

test("version ranges", () => {
  const cases = [["^0.1.0", "0.1.5", true], ["^0.1.0", "0.2.0", false], ["^1.2.3", "1.9.0", true], ["^1.2.3", "2.0.0", false], ["~1.2.3", "1.2.9", true], ["~1.2.3", "1.3.0", false],
    [">=0.1.0", "9.0.0", true], [">=0.1.0 <0.2.0", "0.2.0", false], ["0.1.0", "0.1.0", true], ["0.1.0", "0.1.1", false], ["^0.0.3", "0.0.4", false]];
  for (const [r, v, ok] of cases) assert.equal(inRange(r, v), ok, `${r} ${v}`);
  assert.ok(inCatalogRange("1", 1) && !inCatalogRange("2", 1) && inCatalogRange(">=1", 3) && !inCatalogRange(">=1 <3", 3));
});

test("contentHash pins the manifest and every file", () => {
  const files = goodFiles("robo_pals");
  const m = files["bundle.json"];
  assert.equal(contentHashOf(m), m.contentHash);
  assert.notEqual(contentHashOf({ ...m, name: "Robo Pals 2" }), m.contentHash);
  assert.match(m.contentHash, /^sha256-[0-9a-f]{64}$/);
});

test("MOVE_GROUPS is the catalog's move file order without defeat", () => {
  assert.deepEqual(MOVE_GROUPS, MOVE_FILES.filter((f) => f !== "defeat"));
});

test("mergeBundles adds entries in ascending id order and leaves the base unchanged", () => {
  const frag = catalogFragment(goodFiles("robo_pals"));
  const other = { id: "acme", version: "1.0.0", hash: "sha256-" + "1".repeat(64), entries: { themes: { "acme:moon": base.themes.white_stage } } };
  const m = mergeBundles(base, [{ id: "robo_pals", version: "1.0.0", hash: "sha256-" + "2".repeat(64), entries: frag }, other]);
  assert.deepEqual(m.bundles.map((b) => b.id), ["acme", "robo_pals"]);
  assert.ok(m.bodies["robo_pals:boxbot"] && m.bodyNames.includes("robo_pals:boxbot") && m.themeNames.at(-1) === "acme:moon");
  assert.equal(m.moves.at(-1).name, "robo_pals:robot_dance");
  assert.ok(!base.bodies["robo_pals:boxbot"] && !base.bundles, "base is not changed");
  assert.throws(() => mergeBundles(base, [{ ...other, entries: { themes: { white_stage: {} } } }]), /already there/);
});

test("a bundle near every cap checks in under 2 s", () => {
  const files = structuredClone(goodFiles("robo_pals"));
  const dance = files["moves/emotes.json"][0];
  files["moves/emotes.json"] = Array.from({ length: 64 }, (_, i) => ({ ...structuredClone(dance), name: `robo_pals:dance${i}` }));
  files["moves/poses.json"] = Object.fromEntries(Array.from({ length: 128 }, (_, i) => [i ? `robo_pals:pose${i}` : "robo_pals:arms_square", { lUA: 80, lFA: 90, rUA: -80 + (i % 40), rFA: 90 }]));
  const body = files["characters/bodies.json"]["robo_pals:boxbot"];
  files["characters/bodies.json"] = Object.fromEntries(Array.from({ length: 4 }, (_, i) => [i ? `robo_pals:bot${i}` : "robo_pals:boxbot", { ...body, dims: { ...body.dims, torso: 50 + i * 10 } }]));
  const pad = files["world/objects.json"]["robo_pals:charging_pad"];
  const d = [["M", -80, 0], ...Array.from({ length: 123 }, (_, i) => ["L", -80 + i, -(i % 18)]), ["Z"]]; // 32 objects × 125 = 4,000 commands
  files["world/objects.json"] = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [i ? `robo_pals:pad${i}` : "robo_pals:charging_pad", { ...pad, paths: [{ d, fill: "colors.base" }] }]));
  files["bundle.json"] = packManifest(files["bundle.json"], files);
  const entries = Object.entries(files).map(([path, v]) => ({ path, bytes: new TextEncoder().encode(JSON.stringify(v)) }));
  const t = performance.now();
  const r = checkBundle(entries, nodeContext());
  const ms = performance.now() - t;
  assert.ok(r.report.steps.every((s) => !s.skipped), JSON.stringify(r.errors.slice(0, 3)));
  assert.ok(ms < 2000, `${ms.toFixed(0)} ms`);
});

test("the check pipeline is browser-safe: no node: imports and no catalog loader, transitively", () => {
  const seen = new Set();
  const walk = (url) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const text = readFileSync(fileURLToPath(url), "utf8");
    for (const [, spec] of text.matchAll(/^(?:import|export)\s[^;]*?from\s+"([^"]+)"/gm)) {
      assert.ok(!spec.startsWith("node:"), `${url.pathname} imports ${spec}`);
      const next = new URL(spec, url);
      assert.ok(!next.pathname.endsWith("/catalog/index.js"), `${url.pathname} imports the catalog loader`);
      walk(next);
    }
  };
  walk(new URL("../../tools/lib/bundle/check.mjs", import.meta.url));
  walk(new URL("../../tools/lib/bundle/archive.mjs", import.meta.url));
  assert.ok(seen.size > 10);
});

test("2 MB of bundle files are checked (and refused) in under 2 s", () => {
  const files = structuredClone(goodFiles("robo_pals"));
  const dance = files["moves/emotes.json"][0];
  const big = Array.from({ length: 340 }, (_, i) => ({ ...structuredClone(dance), name: `robo_pals:big${i}` }));
  for (const g of ["movement", "unarmed", "armed", "defensive", "reactions", "utility", "life", "interactions"]) files[`moves/${g}.json`] = big.map((m) => ({ ...m, name: `${m.name}_${g}` }));
  files["bundle.json"] = packManifest(files["bundle.json"], files);
  const entries = Object.entries(files).map(([path, v]) => ({ path, bytes: new TextEncoder().encode(JSON.stringify(v)) }));
  const total = entries.reduce((s, e) => s + e.bytes.length, 0);
  assert.ok(total > 1.6e6 && total < 2 * 1024 * 1024, `${total} bytes`);
  const t = performance.now();
  const r = checkBundle(entries, nodeContext());
  const ms = performance.now() - t;
  assert.ok(r.errors.some((e) => e.code === "E_BUNDLE_SCHEMA"), "refused by the schemas (64 moves per file)");
  assert.ok(ms < 2000, `${ms.toFixed(0)} ms`);
});
