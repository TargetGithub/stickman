// Catalog bundles in the browser (CATALOG_BUNDLE_SPEC 6, 7): read dropped .zip files, run the same checks as
// `node tools/bundle.mjs check` (steps 1-12 and 14), and build the engine catalog with the bundles added.
// The pipeline is pure (tools/lib/bundle/); this file only supplies the browser's inflate and fetches.

import { readZip } from "../../tools/lib/bundle/archive.mjs";
import { checkBundle } from "../../tools/lib/bundle/check.mjs";
import { catalogWithBundles } from "../../tools/lib/bundle/load.mjs";
import { BUNDLE_SCHEMA_FILES } from "../../tools/lib/bundle/layout.mjs";

/** Deflate-raw with the size cap, through DecompressionStream; stops reading at the cap. */
async function inflateRaw(data, maxBytes) {
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

let contextPromise = null;
/** The bundle schemas and the catalog's format and version, fetched once. */
function context() {
  contextPromise ??= (async () => {
    const at = (p) => new URL(`../../catalog/${p}`, import.meta.url);
    const schemas = Object.fromEntries(await Promise.all(BUNDLE_SCHEMA_FILES.map(async (f) => [f, await (await fetch(at(`schemas/bundle/${f}`))).json()])));
    const manifest = await (await fetch(at("manifest.json"))).json();
    return { schemas, catalogFormat: manifest.schemaVersion, catalogVersion: manifest.version };
  })();
  return contextPromise;
}

/**
 * Check zips (File or Blob objects) against a base catalog, dependencies first whatever the order.
 * @returns {Promise<{ catalog, bundles: object[], results: Array<{ name, ok, bundle, errors, warnings }> }>}
 */
export async function loadBundleZips(zips, base) {
  const ctx = { ...(await context()), base, loaded: [] };
  const pending = [];
  for (const z of zips) {
    const { entries, issues } = await readZip(new Uint8Array(await z.arrayBuffer()), { inflateRaw });
    pending.push({ name: z.name, entries, issues });
  }
  const results = [];
  for (let progress = true; pending.length && progress;) {
    progress = false;
    for (const p of [...pending]) {
      const r = checkBundle(p.entries, { ...ctx, preIssues: p.issues });
      if (!r.ok && r.errors.every((e) => e.code === "E_BUNDLE_DEPENDENCY" && /not loaded/.test(e.message))) continue;
      pending.splice(pending.indexOf(p), 1);
      progress = true;
      if (r.ok) ctx.loaded.push(r.bundle);
      results.push({ name: p.name, ok: r.ok, bundle: r.bundle, errors: r.errors, warnings: r.warnings });
    }
  }
  for (const p of pending) {
    const r = checkBundle(p.entries, { ...ctx, preIssues: p.issues });
    results.push({ name: p.name, ok: false, bundle: r.bundle, errors: r.errors, warnings: r.warnings });
  }
  return { catalog: catalogWithBundles(base, ctx.loaded), bundles: ctx.loaded, results };
}
