// Catalog bundles in the browser (CATALOG_BUNDLE_SPEC 6, 7): read .zip files and the project store, run the
// same checks as `node tools/bundle.mjs check` (steps 1-14; the render checks with the page's canvas), and
// build the engine catalog with the bundles added. The pipeline is pure (tools/lib/bundle/); this file
// supplies the browser's inflate, canvas, clock and fetches. Bundles kept in the browser live in IndexedDB
// (bundle_store.js); the project store (`node tools/bundle.mjs import`) is served at /bundles/.

import { readZip } from "../../tools/lib/bundle/archive.mjs";
import { checkBundle } from "../../tools/lib/bundle/check.mjs";
import { catalogWithBundles } from "../../tools/lib/bundle/load.mjs";
import { BUNDLE_SCHEMA_FILES } from "../../tools/lib/bundle/layout.mjs";

/** Deflate-raw with the size cap, through DecompressionStream; stops reading at the cap. */
export async function inflateRaw(data, maxBytes) {
  const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("larger than it says");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) (out.set(c, at), (at += c.length));
  return out;
}

const catalogUrl = (p) => new URL(`../../catalog/${p}`, import.meta.url);

let contextPromise = null;
/** The bundle schemas, the catalog's format and version, and the block and allow lists, fetched once. */
export function bundleContext() {
  contextPromise ??= (async () => {
    const json = async (p) => (await fetch(catalogUrl(p))).json();
    const schemas = Object.fromEntries(await Promise.all(BUNDLE_SCHEMA_FILES.map(async (f) => [f, await json(`schemas/bundle/${f}`)])));
    const [manifest, block, allow] = await Promise.all([json("manifest.json"), json("bundle_blocklist.json"), json("bundle_allowlist.json")]);
    return { schemas, catalogFormat: manifest.schemaVersion, catalogVersion: manifest.version, blocklist: block.blocked, allowlist: allow.reviewed };
  })();
  return contextPromise;
}

/**
 * The page's canvas and clock for the render checks (steps 12 pixels and 13) and the contact sheet. Every
 * context is CPU-backed (willReadFrequently): Chrome moves a GPU canvas to the CPU after a few pixel reads,
 * and the two rasterize differently, so without it the pixel hashes would depend on the render order.
 */
export const pageIo = () => ({
  createCanvas: (w, h) => {
    const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
    const get = c.getContext.bind(c);
    c.getContext = (type, opts) => get(type, { ...opts, willReadFrequently: true });
    return c;
  },
  now: () => performance.now(),
});

/** Entries of a zip (bytes), with the reader's own issues. */
export const zipEntries = async (bytes) => readZip(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), { inflateRaw });

/** A bundle in the project store (/bundles/<id>/<hash>/) as entries, or null when it is not there. */
export async function storeEntries(pin) {
  const at = (p) => `/bundles/${pin.id}/${pin.hash}/${p}`;
  const res = await fetch(at("bundle.json"));
  if (!res.ok) return null;
  const manifestBytes = new Uint8Array(await res.arrayBuffer());
  let files = [];
  try {
    files = JSON.parse(new TextDecoder().decode(manifestBytes)).files || [];
  } catch {
    return { entries: [{ path: "bundle.json", bytes: manifestBytes }], issues: [] };
  }
  const entries = [{ path: "bundle.json", bytes: manifestBytes }];
  for (const f of files) {
    const r = await fetch(at(f.path));
    if (r.ok) entries.push({ path: f.path, bytes: new Uint8Array(await r.arrayBuffer()) });
  }
  return { entries, issues: [] };
}

/**
 * Check sources ({ name, entries, issues }) against a base catalog, dependencies first whatever the order.
 * @param {{ render?: boolean, determinism?: boolean }} [opts]  render: run steps 12 (pixels) and 13 on the page's canvas
 * @returns {Promise<{ catalog, bundles: object[], results: Array<{ name, ok, bundle, errors, warnings, report, entries }> }>}
 */
export async function checkSources(sources, base, { render = false, determinism = true, loaded = [] } = {}) {
  const ctx = { ...(await bundleContext()), base, loaded: [...loaded], determinism, ...(render ? { render: pageIo() } : {}) };
  const pending = [...sources];
  const results = [];
  for (let progress = true; pending.length && progress;) {
    progress = false;
    for (const p of [...pending]) {
      const r = checkBundle(p.entries, { ...ctx, preIssues: p.issues });
      if (!r.ok && r.errors.every((e) => e.code === "E_BUNDLE_DEPENDENCY" && /not loaded/.test(e.message))) continue;
      pending.splice(pending.indexOf(p), 1);
      progress = true;
      if (r.ok && !ctx.loaded.some((b) => b.hash === r.bundle.hash)) ctx.loaded.push(r.bundle);
      results.push({ name: p.name, ...r, entries: p.entries });
    }
  }
  for (const p of pending) results.push({ name: p.name, ...checkBundle(p.entries, { ...ctx, preIssues: p.issues }), entries: p.entries });
  return { catalog: catalogWithBundles(base, ctx.loaded), bundles: ctx.loaded, results };
}

/** Check zips (File or Blob objects) for the player: steps 1-12 and 14, no render checks. */
export async function loadBundleZips(zips, base) {
  const sources = [];
  for (const z of zips) sources.push({ name: z.name, ...(await zipEntries(await z.arrayBuffer())) });
  return checkSources(sources, base);
}

/** The comparable part of a check result (the same in Node, `bundle.mjs check --json`, and here). */
export const reportSummary = (r) => ({
  hash: r.bundle?.hash ?? null, ok: r.ok,
  errors: r.errors.map((i) => `${i.code} ${i.file} ${i.path}`), warnings: r.warnings.map((i) => `${i.code} ${i.file} ${i.path}`),
  steps: r.report.steps.map((s) => `${s.step}${s.skipped ? " skipped" : ""}`),
});
