// Node adapters for the bundle checks (CATALOG_BUNDLE_SPEC 6.1): read a bundle folder or zip from disk,
// the base context (catalog, bundle schemas, catalog version), and pack a folder. The checks themselves
// are pure (tools/lib/bundle/); this file is the only one that touches the file system.

import { readFileSync, readdirSync, lstatSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { inflateRawSync } from "node:zlib";
import { catalog } from "../../catalog/index.js";
import { readBundleSchemas, CATALOG_DIR } from "./catalog_files.mjs";
import { readZip, ARCHIVE_LIMITS } from "./bundle/archive.mjs";
import { parseEntries, packManifest } from "./bundle/manifest.mjs";
import { formatJson } from "./json_format.mjs";
import { checkBundle } from "./bundle/check.mjs";
import { catalogWithBundles } from "./bundle/load.mjs";
import { readStored } from "./bundle_store.mjs";
import { zip } from "./zip.mjs";

const posix = (p) => p.split(sep).join("/");

/** A folder's regular files as entries; symlinks and other non-files are issues (step 1). */
export function readBundleDir(dir) {
  const entries = [];
  const issues = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      const rel = posix(relative(dir, full));
      const st = lstatSync(full);
      if (st.isSymbolicLink()) issues.push({ code: "E_BUNDLE_PATH", file: rel, path: "", message: `'${rel}' is a symbolic link.`, fix: "Put the real file in the bundle." });
      else if (st.isDirectory()) walk(full);
      else if (!st.isFile()) issues.push({ code: "E_BUNDLE_PATH", file: rel, path: "", message: `'${rel}' is not a regular file.`, fix: "Bundles hold regular files only." });
      else if (st.size > ARCHIVE_LIMITS.fileBytes * 4) issues.push({ code: "E_BUNDLE_SIZE", file: rel, path: "", message: `'${rel}' is ${st.size} bytes.`, fix: `Keep each file under ${ARCHIVE_LIMITS.fileBytes} bytes.` });
      else entries.push({ path: rel, bytes: new Uint8Array(readFileSync(full)) });
    }
  };
  walk(dir);
  return { entries, issues };
}

/** Node's inflate with the size cap, so decompression stops at the cap (zip bombs). */
export const nodeInflate = (data, maxBytes) => inflateRawSync(data, { maxOutputLength: Math.max(1, maxBytes) });

/** A folder or a .zip on disk → { entries, issues }. */
export async function readBundlePath(path) {
  if (lstatSync(path).isDirectory()) return readBundleDir(path);
  return readZip(new Uint8Array(readFileSync(path)), { inflateRaw: nodeInflate });
}

/** The base context for checkBundle: the default catalog, the bundle schemas, the catalog's version, the block and allow lists. */
export function nodeContext(extra = {}) {
  const json = (f) => JSON.parse(readFileSync(join(CATALOG_DIR, f), "utf8"));
  const manifest = json("manifest.json");
  return {
    base: catalog, schemas: readBundleSchemas(), catalogFormat: manifest.schemaVersion, catalogVersion: manifest.version, loaded: [],
    blocklist: json("bundle_blocklist.json").blocked, allowlist: json("bundle_allowlist.json").reviewed, ...extra,
  };
}

/**
 * Pack a bundle folder: write files[] and contentHash into bundle.json, and return a zip of the folder.
 * The folder must already parse (step 2); the full check runs separately.
 * @returns {{ manifest, zip: Buffer, issues: object[] }}
 */
export function packBundleDir(dir) {
  const { entries, issues } = readBundleDir(dir);
  const parsed = parseEntries(entries);
  if (issues.length || parsed.issues.length) return { manifest: null, zip: null, issues: [...issues, ...parsed.issues] };
  const manifest = packManifest(parsed.files["bundle.json"] || {}, parsed.files);
  writeFileSync(join(dir, "bundle.json"), formatJson(manifest));
  const again = readBundleDir(dir).entries;
  return { manifest, zip: zip(again.map((e) => ({ name: e.path, data: Buffer.from(e.bytes) }))), issues: [] };
}

/**
 * Check bundle folders or zips and build the engine catalog from them (dependencies first, whatever the
 * order of the paths). Bundles that do not check clean are returned as failures with their issues.
 * @returns {Promise<{ catalog, bundles: object[], failures: Array<{ path, errors }> }>}
 */
export async function loadBundlePaths(paths, extra = {}) {
  const ctx = nodeContext({ determinism: false, ...extra }); // step 12 runs on import; loading for a script needs 1-11 and 14
  const pending = [];
  // A path is a folder or zip; { store: pin } is a bundle in the store (read without the store's import.json).
  for (const path of paths) pending.push(typeof path === "string" ? { path, ...(await readBundlePath(path)) } : { path: `store ${path.store.id} ${path.store.hash}`, ...readStored(path.store) });
  const failures = [];
  for (let progress = true; pending.length && progress;) {
    progress = false;
    for (const p of [...pending]) {
      const r = checkBundle(p.entries, { ...ctx, preIssues: p.issues });
      const waits = !r.ok && r.errors.every((e) => e.code === "E_BUNDLE_DEPENDENCY" && /not loaded/.test(e.message));
      if (waits) continue; // its dependency may be later in the list
      pending.splice(pending.indexOf(p), 1);
      progress = true;
      if (r.ok && !ctx.loaded.some((b) => b.hash === r.bundle.hash)) ctx.loaded.push(r.bundle); // the same bundle twice (a path and the store) loads once
      else if (!r.ok) failures.push({ path: p.path, errors: r.errors });
    }
  }
  for (const p of pending) failures.push({ path: p.path, errors: checkBundle(p.entries, { ...ctx, preIssues: p.issues }).errors });
  return { catalog: catalogWithBundles(ctx.base, ctx.loaded), bundles: ctx.loaded, failures };
}
