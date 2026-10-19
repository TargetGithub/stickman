// Bundle fixtures for the check pipeline (Node only). A bad fixture (tests/fixtures/bundles/bad/<CODE>.json)
// is a small change to a good bundle folder, so each one shows exactly one problem. Used by the tests and by
// `node tools/bundle.mjs check --fixture <file>`.
//   from     the good bundle folder, next to the fixture's folder ("robo_pals" → ../robo_pals)
//   set      { path: json | null }            whole files replaced (null removes the file)
//   edit     [[path, [key, ...], value]]      one value changed (value null removes the key)
//   copy     [[from, to]]                     a file copied to another path
//   after    edits applied after packing (the hashes no longer match)
//   raw      { path: text | { repeat, times } } unparsed entries added after packing
//   zip      "crc": zip the bundle, then damage one entry's data
//   ctx      { blockSelf: true }               the bundle's hash on the blocklist
//            { flakyEngine: true }             step 12 with an engine whose every other run drifts
//   expect   [{ code, file, path }]           issues that must be reported; the reported codes are exactly these

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readBundleDir, nodeContext, nodeInflate } from "./bundle_node.mjs";
import { parseEntries, packManifest } from "./bundle/manifest.mjs";
import { readZip } from "./bundle/archive.mjs";
import { zip } from "./zip.mjs";
import { createEngine } from "../../engine/index.js";

export const FIXTURES = fileURLToPath(new URL("../../tests/fixtures/bundles/", import.meta.url));

/** A good bundle folder as parsed files. */
export function goodFiles(name, { jsonOnly = false, root = FIXTURES } = {}) {
  const { files, issues } = parseEntries(readBundleDir(join(root, name)).entries.filter((e) => !jsonOnly || e.path.endsWith(".json")));
  if (issues.length) throw new Error(`${name}: ${issues[0].message}`);
  return files;
}

function edit(files, [path, keys, value]) {
  let o = files[path];
  for (const k of keys.slice(0, -1)) o = o[k];
  const last = keys[keys.length - 1];
  if (value === null) delete o[last];
  else o[last] = value;
}

const encode = (rel, v) => new TextEncoder().encode(typeof v === "string" ? v : `${JSON.stringify(v, null, 2)}\n`);

/** Entries, adapter issues and the context for a fixture. */
export async function fixtureInput(fx, { root = FIXTURES } = {}) {
  const files = structuredClone(goodFiles(fx.from, { root }));
  for (const [p, v] of Object.entries(fx.set || {})) (v === null ? delete files[p] : (files[p] = v));
  for (const e of fx.edit || []) edit(files, e);
  for (const [from, to] of fx.copy || []) files[to] = structuredClone(files[from]);
  if (fx.pack !== false) files["bundle.json"] = packManifest(files["bundle.json"], files);
  for (const e of fx.after || []) edit(files, e);
  let entries = Object.entries(files).map(([path, v]) => ({ path, bytes: encode(path, v) }));
  for (const [path, v] of Object.entries(fx.raw || {})) entries.push({ path, bytes: new TextEncoder().encode(typeof v === "string" ? v : v.repeat.repeat(v.times)) });
  let preIssues = [];
  if (fx.zip) {
    const bytes = new Uint8Array(zip(entries.map((e) => ({ name: e.path, data: Buffer.from(e.bytes) }))));
    if (fx.zip === "crc") bytes[30 + (bytes[26] | (bytes[27] << 8)) + 2] ^= 0xff; // inside the first entry's compressed data
    ({ entries, issues: preIssues } = await readZip(bytes, { inflateRaw: nodeInflate }));
  }
  const ctx = nodeContext();
  if (fx.ctx?.flakyEngine) ctx.createEngine = flakyEngine();
  if (fx.ctx?.blockSelf) ctx.blocklist = [{ hash: files["bundle.json"].contentHash, reason: "test fixture" }];
  return { entries, ctx: { ...ctx, preIssues } };
}

/** An engine factory whose second, fourth ... engine moves the camera a little: a stand-in for an engine bug. */
function flakyEngine() {
  let made = 0;
  return (opts) => {
    const e = createEngine(opts);
    if (++made % 2) return e;
    return { ...e, load: (s) => e.load(s), getFrame: (n) => { const f = e.getFrame(n); return { ...f, cam: { ...f.cam, x: f.cam.x + 0.5 } }; } };
  };
}

export const readFixture = (file) => JSON.parse(readFileSync(file, "utf8"));
