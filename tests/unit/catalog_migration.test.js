// Migration check (CATALOG_SPEC 10-11, C1): the catalog assembled from catalog/*.json equals the frozen
// legacy data/*.js catalog once description and tag fields are set aside. Entries added to catalog/ after
// the migration are left out of the comparison; every legacy entry must be unchanged and in its old order.
// Kept until data/ is retired (C5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { legacy } from "../../data/legacy.js";
import { catalog, MOVE_FILES, loadCatalog, assembleCatalog, ENGINE_FILES, fileReader } from "../../catalog/index.js";
import { catalog as viaData } from "../../data/index.js";
import { convert } from "../../tools/migrate_catalog.mjs";

/** A deep copy without the documentation fields the engine ignores. */
function strip(v) {
  if (Array.isArray(v)) return v.map(strip);
  if (v === null || typeof v !== "object") return v;
  const out = {};
  for (const [k, x] of Object.entries(v)) if (k !== "description" && k !== "tags") out[k] = strip(x);
  return out;
}

const { moveFiles, ...old } = legacy;

/** The catalog limited to the entries the legacy catalog has (newer additions left out). */
function legacyPart(cat) {
  const out = {};
  for (const [key, was] of Object.entries(old)) {
    const now = cat[key];
    if (Array.isArray(was) && was.every((e) => typeof e === "string")) out[key] = now.filter((n) => was.includes(n));
    else if (Array.isArray(was) && was[0]?.name) out[key] = now.filter((e) => was.some((w) => w.name === e.name));
    else if (!Array.isArray(was) && typeof was === "object" && key !== "appearance") out[key] = Object.fromEntries(Object.keys(now).filter((k) => k in was).map((k) => [k, now[k]]));
    else out[key] = now;
  }
  return strip(out);
}

test("the catalog deep-equals the legacy data/ catalog (descriptions, tags and newer entries aside)", () => {
  assert.deepStrictEqual(legacyPart(catalog), old);
});

for (const key of Object.keys(old)) {
  test(`catalog.${key} matches the legacy entry by entry`, () => assert.deepStrictEqual(legacyPart(catalog)[key], old[key]));
}

test("move files keep the legacy order", () => assert.deepEqual(MOVE_FILES, Object.keys(moveFiles)));

test("data/index.js re-exports the catalog/ catalog", () => assert.equal(viaData, catalog));

test("the converter's output assembles to the same engine catalog", () => {
  assert.deepStrictEqual(strip(assembleCatalog(convert(legacy))), legacyPart(catalog));
});

test("loadCatalog takes sync and async readers and does no I/O itself", async () => {
  const read = fileReader();
  const seen = [];
  const sync = loadCatalog((p) => (seen.push(p), read(p)));
  assert.deepEqual(seen, ENGINE_FILES);
  const viaPromise = await loadCatalog(async (p) => read(p));
  assert.deepStrictEqual(viaPromise, sync);
  assert.deepStrictEqual(sync, catalog);
});

test("the engine never imports catalog/ or data/ (ADR-006: the catalog is injected)", async () => {
  const { readdir, readFile } = await import("node:fs/promises");
  const root = new URL("../../engine/", import.meta.url);
  for (const f of (await readdir(root, { recursive: true })).filter((x) => x.endsWith(".js"))) {
    const src = await readFile(new URL(f, root), "utf8");
    for (const m of src.matchAll(/(?:import|export)[^"']*["']([^"']+)["']|import\(\s*["']([^"']+)["']/g)) {
      const spec = m[1] || m[2];
      assert.ok(!/(^|\/)(catalog|data)\//.test(spec), `${f} imports ${spec}`);
    }
  }
});
