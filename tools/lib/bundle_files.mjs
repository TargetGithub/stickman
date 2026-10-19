// Bundle files on disk and their hashes (CATALOG_BUNDLE_SPEC 4.1, 4.3; V3.1). Canonical JSON is the
// RFC 8785 form the spec names: keys sorted, no whitespace, JSON.stringify number formatting. README and
// LICENSE are hashed as UTF-8 text with line endings normalised to "\n". Node only (crypto, fs).

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, lstatSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { formatJson } from "./json_format.mjs";

/** The canonical JSON text of a value (sorted keys, compact). */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

/** "sha256-<hex>" of a string (UTF-8). */
export function sha256(text) {
  return `sha256-${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

/** The hash of one bundle file from its text: canonical JSON for .json files, normalised text otherwise. */
export function fileHash(path, text) {
  return sha256(path.endsWith(".json") ? canonical(JSON.parse(text)) : text.replace(/\r\n?/g, "\n"));
}

/** The manifest's contentHash: the canonical manifest without contentHash. */
export function contentHash(manifest) {
  const { contentHash: _drop, ...rest } = manifest;
  return sha256(canonical(rest));
}

const posix = (p) => p.split(sep).join("/");

/** Every entry under a bundle folder except bundle.json: { path, size, symlink }, relative posix paths, sorted. */
export function listBundleFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      const st = lstatSync(full);
      if (st.isSymbolicLink()) out.push({ path: posix(relative(dir, full)), size: 0, symlink: true });
      else if (st.isDirectory()) walk(full);
      else out.push({ path: posix(relative(dir, full)), size: st.size, symlink: false });
    }
  };
  walk(dir);
  return out.filter((f) => f.path !== "bundle.json");
}

/**
 * Read a bundle folder for the checker: raw text per path (bundle.json included) and the listing. Parsing
 * is the checker's job (step 2), so a broken file is reported, not thrown.
 * @returns {{ dir: string, raw: Record<string, string>, listing: Array<{ path, size, symlink }> }}
 */
export function readBundle(dir) {
  const listing = listBundleFiles(dir);
  const raw = { "bundle.json": readFileSync(join(dir, "bundle.json"), "utf8") };
  for (const f of listing) if (!f.symlink && f.size <= 4 * 1024 * 1024) raw[f.path] = readFileSync(join(dir, f.path), "utf8");
  return { dir, raw, listing };
}

/**
 * Write `files` and `contentHash` into a bundle's bundle.json (tools/bundle.mjs pack). Returns the manifest.
 * @param {string} dir
 * @param {{ write?: boolean }} opts  write false only computes
 */
export function packBundle(dir, { write = true } = {}) {
  const { raw, listing } = readBundle(dir);
  const manifest = JSON.parse(raw["bundle.json"]);
  const entries = listing.filter((f) => !f.symlink).map((f) => ({ path: f.path, sha256: fileHash(f.path, raw[f.path]) }));
  const { contentHash: _drop, files: _files, ...rest } = manifest;
  const next = { ...rest, files: entries };
  next.contentHash = contentHash(next);
  if (write) writeFileSync(join(dir, "bundle.json"), formatJson(next));
  return next;
}
