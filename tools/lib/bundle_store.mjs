// The Node bundle store (CATALOG_BUNDLE_SPEC 6.3, decision 6): imported bundles live in
// bundles/<id>/<hash>/ at the project root (git-ignored), or in $STICKMAN_BUNDLES. Each folder holds the
// bundle's files as packed (bundle.json, catalog files, examples) plus import.json, the import report.
// Bundles are stored by hash and never edited after import. `npm run serve` serves the same folder at
// /bundles/, so the player and the showcase read what the tools imported.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readBundleDir } from "./bundle_node.mjs";

export const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** The store folder: $STICKMAN_BUNDLES, else <project>/bundles. */
export const storeRoot = () => process.env.STICKMAN_BUNDLES || join(PROJECT_ROOT, "bundles");

/** The folder of one stored bundle. */
export const storePath = (pin, root = storeRoot()) => join(root, pin.id, pin.hash);

/** Is this exact bundle (id and hash) in the store? */
export const inStore = (pin, root = storeRoot()) => existsSync(join(storePath(pin, root), "bundle.json"));

/**
 * Write a checked bundle into the store (its entries as read, plus import.json). An existing folder for the
 * same hash is the same content, so it is replaced as is.
 * @param {{ id, version, hash }} bundle  checkBundle(...).bundle
 * @param {Array<{ path, bytes }>} entries
 * @param {object} report  what to keep in import.json (steps, warnings, checks run)
 */
export function writeToStore(bundle, entries, report, root = storeRoot()) {
  const dir = storePath(bundle, root);
  rmSync(dir, { recursive: true, force: true });
  for (const e of entries) {
    const file = join(dir, e.path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, e.bytes);
  }
  writeFileSync(join(dir, "import.json"), `${JSON.stringify({ id: bundle.id, version: bundle.version, hash: bundle.hash, ...report }, null, 2)}\n`);
  return dir;
}

/** Every stored bundle: [{ id, hash, dir }], sorted. */
export function listStore(root = storeRoot()) {
  if (!existsSync(root)) return [];
  return readdirSync(root).sort().flatMap((id) => {
    const d = join(root, id);
    try {
      return readdirSync(d).sort().filter((h) => existsSync(join(d, h, "bundle.json"))).map((hash) => ({ id, hash, dir: join(d, hash) }));
    } catch {
      return [];
    }
  });
}

/**
 * bundles/index.json: what pages read to list the project store over HTTP (the showcase, the player).
 * Rewritten after every import.
 */
export function writeStoreIndex(root = storeRoot()) {
  const rows = listStore(root).map((b) => {
    const m = JSON.parse(readFileSync(join(b.dir, "bundle.json"), "utf8"));
    return { id: b.id, version: m.version, hash: b.hash, name: m.name, license: m.license };
  });
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "index.json"), `${JSON.stringify({ bundles: rows }, null, 2)}
`);
  return rows;
}

/** A stored bundle's entries, without the store's own import.json. */
export function readStored(pin, root = storeRoot()) {
  const { entries, issues } = readBundleDir(storePath(pin, root));
  return { entries: entries.filter((e) => e.path !== "import.json"), issues };
}
