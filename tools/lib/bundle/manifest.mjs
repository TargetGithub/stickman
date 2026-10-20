// Steps 2-5 (CATALOG_BUNDLE_SPEC 6.2): strict parsing, the manifest schema and reserved ids, version
// compatibility, and the file list with its hashes; plus packManifest, which writes files[] and
// contentHash. Pure.

import { checkValue } from "../../../engine/validator/schema.js";
import { decodeUtf8, parseStrict, canonical, normalizeText, textIssue, BundleJsonError } from "./json.mjs";
import { sha256Tag } from "./sha256.mjs";
import { RESERVED_IDS, isText, isExample, entryList } from "./layout.mjs";

const issue = (code, file, path, message, fix) => ({ code, file, path, message, fix });

/** Step 2: entries → parsed files (JSON values; README/LICENSE as normalized text). */
export function parseEntries(entries) {
  const files = {};
  const issues = [];
  for (const e of entries) {
    try {
      const text = decodeUtf8(e.bytes);
      if (isText(e.path)) {
        const t = normalizeText(text);
        const why = textIssue(t);
        if (why) throw new BundleJsonError(`the text is ${why}`, 0);
        files[e.path] = t;
      } else files[e.path] = parseStrict(text);
    } catch (err) {
      if (!(err instanceof BundleJsonError)) throw err;
      issues.push(issue("E_BUNDLE_JSON", e.path, "", `'${e.path}': ${err.message}.`, isText(e.path) ? "Save it as plain UTF-8 text." : "Write strict JSON: UTF-8 without a BOM, no comments or trailing commas, each key once."));
    }
  }
  return { files, issues };
}

/** The hash of one file's content as the manifest records it (4.1). */
export const fileHash = (rel, value) => sha256Tag(isText(rel) ? value : canonical(value));

/** contentHash: the canonical manifest without contentHash. */
export function contentHashOf(manifest) {
  const { contentHash, ...rest } = manifest;
  return sha256Tag(canonical(rest));
}

/** Pack: the manifest with files[] (sorted by path) and contentHash for these files. */
export function packManifest(manifest, files) {
  const list = Object.keys(files).filter((f) => f !== "bundle.json").sort().map((path) => ({ path, sha256: fileHash(path, files[path]) }));
  const { contentHash, files: _old, ...rest } = manifest;
  const out = { ...rest, files: list };
  return { ...out, contentHash: contentHashOf(out) };
}

/** Step 3: bundle.json against its schema; the id is not reserved or blocked. */
export function checkManifest(manifest, schemas, { blockedIds = [] } = {}) {
  if (manifest === undefined) return [issue("E_BUNDLE_MANIFEST", "bundle.json", "", "The bundle has no bundle.json.", "Add the manifest at the root of the bundle.")];
  const out = checkValue(manifest, schemas["bundle.schema.json"], "", { schemas })
    .map((i) => issue("E_BUNDLE_MANIFEST", "bundle.json", i.path, `${i.code}: ${i.message}`, i.fix));
  if (typeof manifest?.id === "string" && (RESERVED_IDS.includes(manifest.id) || blockedIds.includes(manifest.id))) {
    out.push(issue("E_BUNDLE_RESERVED", "bundle.json", "id", `The bundle id '${manifest.id}' is reserved.`, "Pick another id (lowercase letters, digits and _)."));
  }
  return out;
}

const parseVer = (s) => s.split(".").map(Number);
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Does a semver range (4.2 semverRange) include a version? */
export function inRange(range, version) {
  const v = parseVer(version);
  const m = range.match(/^(\^|~|>=)?(\d+\.\d+\.\d+)(?: <(\d+\.\d+\.\d+))?$/);
  if (!m) return false;
  const lo = parseVer(m[2]);
  if (cmp(v, lo) < 0) return false;
  if (m[3]) return cmp(v, parseVer(m[3])) < 0;
  if (m[1] === ">=") return true;
  if (!m[1]) return cmp(v, lo) === 0;
  const hi = m[1] === "~" ? [lo[0], lo[1] + 1, 0] : lo[0] > 0 ? [lo[0] + 1, 0, 0] : lo[1] > 0 ? [0, lo[1] + 1, 0] : [0, 0, lo[2] + 1];
  return cmp(v, hi) < 0;
}

/** Does catalogVersion ("1", ">=1", ">=1 <3") include a catalog format? */
export function inCatalogRange(range, format) {
  const m = range.match(/^(>=)?(\d+)(?: <(\d+))?$/);
  if (!m) return false;
  return m[1] ? format >= +m[2] && (!m[3] || format < +m[3]) : format === +m[2];
}

/** Step 4. */
export function checkCompat(manifest, { engineVersion, catalogFormat, catalogVersion }) {
  const out = [];
  if (!inRange(manifest.engineVersion, engineVersion)) {
    out.push(issue("E_BUNDLE_COMPAT", "bundle.json", "engineVersion", `This bundle needs engine ${manifest.engineVersion}; this is engine ${engineVersion}.`, "Use an engine version in the range, or ask the author for an updated bundle."));
  }
  if (!inCatalogRange(manifest.catalogVersion, catalogFormat)) {
    out.push(issue("E_BUNDLE_COMPAT", "bundle.json", "catalogVersion", `This bundle needs catalog format ${manifest.catalogVersion}; this catalog is format ${catalogFormat}.`, "Use a catalog of a format in the range, or ask the author for an updated bundle."));
  }
  const notes = [];
  if (manifest.testedWith && catalogVersion && manifest.testedWith !== catalogVersion) notes.push(`tested with catalog ${manifest.testedWith}; this is ${catalogVersion}`);
  return { issues: out, notes };
}

/** Step 5: the files equal manifest.files, every hash matches, required files are there. */
export function checkFiles(manifest, files) {
  const out = [];
  const listed = manifest.files.map((f) => f.path);
  const have = Object.keys(files).filter((f) => f !== "bundle.json");
  const sorted = [...listed].sort();
  if (listed.some((p, i) => p !== sorted[i])) out.push(issue("E_BUNDLE_FILES", "bundle.json", "files", "manifest.files is not sorted by path.", "Run `node tools/bundle.mjs pack` to write files[]."));
  const dup = listed.find((p, i) => listed.indexOf(p) !== i);
  if (dup) out.push(issue("E_BUNDLE_FILES", "bundle.json", "files", `'${dup}' is listed twice.`, "List each file once."));
  for (const p of listed) if (!(p in files)) out.push(issue("E_BUNDLE_FILES", p, "", `'${p}' is listed in the manifest but not in the bundle.`, "Add the file or run `bundle.mjs pack` again."));
  for (const p of have) if (!listed.includes(p)) out.push(issue("E_BUNDLE_FILES", p, "", `'${p}' is in the bundle but not in manifest.files.`, "Remove it or run `bundle.mjs pack` again."));
  if (!have.includes("examples/index.json")) out.push(issue("E_BUNDLE_FILES", "examples/index.json", "", "The bundle has no examples/index.json.", "Add at least one example script and examples/index.json."));
  else if (!have.some(isExample)) out.push(issue("E_BUNDLE_FILES", "examples/", "", "The bundle has no example script.", "Add at least one script under examples/clips/ or examples/stories/."));
  if (!entryList(files).length) out.push(issue("E_BUNDLE_FILES", "", "", "The bundle adds no catalog entry.", "Add at least one pose, move, body plan, face, preset, FX, theme, object, prop, activity or mood."));
  if (out.length) return out;
  for (const f of manifest.files) {
    const h = fileHash(f.path, files[f.path]);
    if (h !== f.sha256) out.push(issue("E_BUNDLE_HASH", f.path, "", `'${f.path}' has hash ${h}, the manifest says ${f.sha256}.`, "The file changed after packing: run `bundle.mjs pack` again (or get an unmodified copy)."));
  }
  const ch = contentHashOf(manifest);
  if (!out.length && ch !== manifest.contentHash) out.push(issue("E_BUNDLE_HASH", "bundle.json", "contentHash", `The manifest hashes to ${ch}, contentHash says ${manifest.contentHash}.`, "The manifest changed after packing: run `bundle.mjs pack` again."));
  return out;
}
