// The bundle store (CATALOG_BUNDLE_SPEC 6.3, B4): bundle.mjs import writes bundles/<id>/<hash>/, tools find a
// script's declared bundles there, and the block and allow lists are catalog files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeToStore, listStore, readStored, inStore, storePath } from "../../tools/lib/bundle_store.mjs";
import { readBundleDir, nodeContext } from "../../tools/lib/bundle_node.mjs";
import { checkBundle } from "../../tools/lib/bundle/check.mjs";
import { catalogFromArgs } from "../../tools/lib/bundle_args.mjs";
import { catalog as base } from "../../catalog/index.js";
import { FIXTURES, goodFiles } from "../helpers/bundle_fixtures.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), "stickman-store-"));

test("writeToStore, listStore, readStored round-trip by hash", () => {
  const root = tmp();
  const { entries } = readBundleDir(`${FIXTURES}robo_pals`);
  const r = checkBundle(entries, { ...nodeContext(), determinism: false });
  const dir = writeToStore(r.bundle, entries, { fullyChecked: false }, root);
  assert.equal(dir, storePath(r.bundle, root));
  assert.ok(inStore(r.bundle, root));
  assert.deepEqual(listStore(root).map((b) => [b.id, b.hash]), [["robo_pals", r.bundle.hash]]);
  const again = checkBundle(readStored(r.bundle, root).entries, { ...nodeContext(), determinism: false });
  assert.equal(again.bundle.hash, r.bundle.hash, "stored files are the bundle as packed");
  assert.equal(JSON.parse(readFileSync(join(dir, "import.json"), "utf8")).hash, r.bundle.hash);
  rmSync(root, { recursive: true });
});

test("bundle.mjs import, then validate finds the declared bundle in the store without --bundle", () => {
  const root = tmp();
  const env = { ...process.env, STICKMAN_BUNDLES: root };
  const imp = spawnSync(process.execPath, ["tools/bundle.mjs", "import", `${FIXTURES}robo_pals`, "--no-render"], { cwd: ROOT, env, encoding: "utf8" });
  assert.equal(imp.status, 0, imp.stdout + imp.stderr);
  const hash = goodFiles("robo_pals")["bundle.json"].contentHash;
  assert.ok(existsSync(join(root, "robo_pals", hash, "bundle.json")));
  const story = structuredClone(goodFiles("robo_pals")["examples/stories/bolt_dances.json"].story);
  story.bundles[0].hash = hash;
  const file = join(root, "bolt.json");
  writeFileSync(file, JSON.stringify(story));
  const v = spawnSync(process.execPath, ["tools/validate.mjs", file], { cwd: ROOT, env, encoding: "utf8" });
  assert.equal(v.status, 0, v.stdout + v.stderr);
  assert.match(v.stdout, /^VALID/);
  const list = spawnSync(process.execPath, ["tools/bundle.mjs", "list"], { cwd: ROOT, env, encoding: "utf8" });
  assert.match(list.stdout, /robo_pals 1\.0\.0 .* CC-BY-4\.0 {2}not reviewed {2}not fully checked/);
  rmSync(root, { recursive: true });
});

test("catalogFromArgs loads a script's declared bundles from the store, once even when also passed", async () => {
  const root = tmp();
  process.env.STICKMAN_BUNDLES = root;
  try {
    const { entries } = readBundleDir(`${FIXTURES}robo_pals`);
    const r = checkBundle(entries, { ...nodeContext(), determinism: false });
    writeToStore(r.bundle, entries, {}, root);
    const script = { bundles: [{ id: r.bundle.id, version: r.bundle.version, hash: r.bundle.hash }] };
    const a = await catalogFromArgs([], base, script);
    assert.deepEqual(a.catalog.bundles.map((b) => b.id), ["robo_pals"]);
    const b = await catalogFromArgs(["--bundle", `${FIXTURES}robo_pals`], base, script);
    assert.equal(b.bundles.length, 1);
  } finally {
    delete process.env.STICKMAN_BUNDLES;
    rmSync(root, { recursive: true });
  }
});

test("the block and allow lists are catalog files, read into the check context; a listed hash is refused", () => {
  const ctx = nodeContext();
  assert.ok(Array.isArray(ctx.blocklist) && Array.isArray(ctx.allowlist));
  const { entries } = readBundleDir(`${FIXTURES}robo_pals`);
  const hash = goodFiles("robo_pals")["bundle.json"].contentHash;
  const blocked = checkBundle(entries, { ...ctx, determinism: false, blocklist: [{ hash, id: "robo_pals", reason: "a test entry", date: "2026-10-18" }] });
  assert.deepEqual(blocked.errors.map((e) => e.code), ["E_BUNDLE_BLOCKED"]);
  const listed = checkBundle(entries, { ...ctx, determinism: false, allowlist: [{ hash, id: "robo_pals", version: "1.0.0", reviewed: "2026-10-18" }] });
  assert.deepEqual([...listed.errors, ...listed.warnings], []);
});
