// The catalog loader (CATALOG_SPEC 5): catalog/index.js assembles the engine catalog from catalog/*.json with
// sync or async readers, data/index.js still re-exports it (one release), and the engine never imports either.
// (C1's migration check against the legacy data/*.js copy was retired with data/ in C5.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog, MOVE_FILES, loadCatalog, ENGINE_FILES, fileReader } from "../../catalog/index.js";
import { catalog as viaData } from "../../data/index.js";

test("data/index.js re-exports the catalog/ catalog", () => assert.equal(viaData, catalog));

test("loadCatalog takes sync and async readers and does no I/O itself", async () => {
  const read = fileReader();
  const seen = [];
  const sync = loadCatalog((p) => (seen.push(p), read(p)));
  assert.deepEqual(seen, ENGINE_FILES);
  const viaPromise = await loadCatalog(async (p) => read(p));
  assert.deepStrictEqual(viaPromise, sync);
  assert.deepStrictEqual(sync, catalog);
});

test("the catalog object has today's shape, and the name lists follow their tables", () => {
  const keys = ["poses", "moves", "props", "fxPresets", "fxNames", "themes", "themeNames", "sfxKeys", "blocklist", "softWords", "objects", "faces", "faceNames",
    "bodies", "bodyNames", "appearance", "activities", "activityNames", "macroLines", "musicMoods", "scales", "lights", "lightNames", "cameraMoves", "cameraMoveNames", "textStyles", "textStyleNames", "templates", "templateNames"];
  assert.deepEqual(Object.keys(catalog), keys);
  assert.deepEqual(catalog.themeNames, Object.keys(catalog.themes));
  assert.deepEqual(catalog.fxNames, Object.keys(catalog.fxPresets).filter((n) => !catalog.fxPresets[n].internal));
  assert.ok(catalog.sfxKeys.every((k) => typeof k === "string"));
  for (const k of ["eyes", "brows", "mouthStyle", "hair", "outfit", "accessories"]) assert.ok(catalog.appearance[k].every((n) => typeof n === "string"), k);
  const read = fileReader();
  assert.deepEqual(catalog.moves.map((m) => m.name), MOVE_FILES.flatMap((f) => read(`moves/${f}.json`).map((m) => m.name)));
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
