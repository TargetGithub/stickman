// The bundle check pipeline (CATALOG_BUNDLE_SPEC 6): steps 1-11 and 14 over a bundle's entries, the
// import result of 6.3. Pure and browser-safe: entries come from an adapter (a folder or a zip read by
// tools/lib/bundle_node.mjs, or a dropped zip in a page), the base catalog and the bundle schemas are
// passed in. Step 12 is the simulation hash (ctx.determinism: false skips it); the pixel hash and step 13
// (render budget) need a canvas backend (B4).
//
// Flow: steps 1-7 run in order and stop at the first that reports an error; steps 8, 9 and 10 then each
// report all their issues; step 11 runs when step 8 passed (with unresolved names the runs would only
// repeat step 8's errors), and its stage runs (pairs, presets, examples) only when the merged moves load;
// step 12 runs when step 11 passed;
// step 14 runs as soon as step 5 passed (the hash is known).

import { ENGINE_VERSION } from "../../../engine/index.js";
import { mergeBundles } from "../../../catalog/merge.js";
import { prepareCatalog } from "../../../engine/moves.js";
import { holdableProps } from "../../../engine/objects.js";
import { checkEntries } from "./archive.mjs";
import { parseEntries, checkManifest, checkCompat, checkFiles } from "./manifest.mjs";
import { checkSchemas, checkNamespace, checkRefs } from "./names.mjs";
import { checkCaps } from "./caps.mjs";
import { checkTexts } from "./text.mjs";
import { checkRules } from "./rules.mjs";
import { checkMoveRuns, checkPairs, checkPresets, checkExamples, exampleScripts } from "./runs.mjs";
import { checkDeterminism, showcaseScripts } from "./determinism.mjs";
import { renderChecks } from "./render.mjs";
import { catalogFragment, entryList } from "./layout.mjs";

const isWarning = (i) => i.code.startsWith("W_");

/** A checked bundle as mergeBundles takes it. */
export const toMerge = (manifest, hash, files) => ({ id: manifest.id, version: manifest.version, hash, audience: manifest.audience, dependencies: manifest.dependencies || [], entries: catalogFragment(files) });
const now = () => globalThis.performance?.now() ?? 0;

/**
 * @param {Array<{ path: string, bytes: Uint8Array }>} entries  the bundle's files (bundle.json included)
 * @param {object} ctx
 * @param {object} ctx.base  the engine catalog the bundle is checked against
 * @param {Record<string, object>} ctx.schemas  bundle schemas by file name (readBundleSchemas)
 * @param {Array<{ id, version, hash, manifest, files }>} [ctx.loaded]  bundles already imported (dependencies)
 * @param {number} [ctx.catalogFormat]  the base catalog's format (manifest.json schemaVersion), default 1
 * @param {string} [ctx.catalogVersion]  the base catalog's version, to compare with testedWith
 * @param {string} [ctx.engineVersion]  default ENGINE_VERSION
 * @param {Array<{ hash: string, id?: string }>} [ctx.blocklist]  blocked bundles (catalog/bundle_blocklist.json, B4)
 * @param {Array<{ hash: string }>} [ctx.allowlist]  reviewed bundles (catalog/bundle_allowlist.json, B4)
 * @param {object[]} [ctx.preIssues]  issues the adapter found while reading (zip, symlinks)
 * @param {boolean} [ctx.determinism]  false skips step 12 (it loads every example and showcase script twice)
 * @param {Function} [ctx.createEngine]  the engine factory for step 12 (tests pass a broken one)
 * @param {{ createCanvas, now }} [ctx.render]  a canvas and a clock: runs 12's pixel hashes and step 13 (render.mjs)
 */
export function checkBundle(entries, ctx) {
  const issues = [...(ctx.preIssues || [])];
  const steps = [];
  const report = { counts: {}, goodThemes: {}, sizes: {}, steps, notes: [] };
  let files = {};
  let manifest = null;
  let hash = null;
  const run = (step, fn) => {
    const t = now();
    const found = fn() || [];
    steps.push({ step, ms: Math.round((now() - t) * 10) / 10 });
    issues.push(...found);
    return !found.some((i) => !isWarning(i));
  };
  const skip = (...list) => list.forEach((step) => steps.push({ step, ms: 0, skipped: true }));
  const result = () => ({
    ok: !issues.some((i) => !isWarning(i)),
    bundle: manifest && hash ? { id: manifest.id, version: manifest.version, hash, manifest, files, entries: catalogFragment(files) } : null,
    errors: issues.filter((i) => !isWarning(i)),
    warnings: issues.filter(isWarning),
    report,
  });

  for (const e of entries) report.sizes[e.path] = e.bytes.length;
  const pathPattern = ctx.schemas["bundle.schema.json"].properties.files.items.properties.path.pattern;
  if (!run(1, () => (issues.length ? [] : checkEntries(entries, pathPattern))) || issues.length) return (skip(2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14), result());
  if (!run(2, () => { const p = parseEntries(entries); files = p.files; return p.issues; })) return (skip(3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14), result());
  manifest = files["bundle.json"];
  // A blocked id is reserved for any other content (5.1); the blocked content itself gets E_BUNDLE_BLOCKED (14).
  const blockedIds = (ctx.blocklist || []).filter((b) => b.id && b.hash !== manifest?.contentHash).map((b) => b.id);
  if (!run(3, () => checkManifest(manifest, ctx.schemas, { blockedIds }))) return (skip(4, 5, 6, 7, 8, 9, 10, 11, 12, 14), result());
  if (!run(4, () => {
    const c = checkCompat(manifest, { engineVersion: ctx.engineVersion ?? ENGINE_VERSION, catalogFormat: ctx.catalogFormat ?? 1, catalogVersion: ctx.catalogVersion });
    report.notes.push(...c.notes);
    return c.issues;
  })) return (skip(5, 6, 7, 8, 9, 10, 11, 12, 14), result());
  if (!run(5, () => checkFiles(manifest, files))) return (skip(6, 7, 8, 9, 10, 11, 12, 14), result());
  hash = manifest.contentHash;
  const blocked = () => {
    const out = [];
    const b = (ctx.blocklist || []).find((x) => x.hash === hash);
    if (b) out.push({ code: "E_BUNDLE_BLOCKED", file: "bundle.json", path: "contentHash", message: `This bundle is blocked${b.reason ? `: ${b.reason}` : ""}.`, fix: "It cannot be imported." });
    else if (!(ctx.allowlist || []).some((x) => x.hash === hash)) out.push({ code: "W_BUNDLE_UNREVIEWED", file: "bundle.json", path: "contentHash", message: "This bundle has not been reviewed.", fix: "It works for your own videos; it is shown with the unreviewed banner until it is on the allow list." });
    return out;
  };
  if (!run(6, () => checkSchemas(files, ctx.schemas))) return (skip(7, 8, 9, 10, 11, 12), run(14, blocked), result());
  if (!run(7, () => checkNamespace(files, manifest, hash, ctx.loaded))) return (skip(8, 9, 10, 11, 12), run(14, blocked), result());
  for (const e of entryList(files)) report.counts[e.kind] = (report.counts[e.kind] || 0) + 1;
  const refsOk = run(8, () => checkRefs(files, manifest, ctx.base, ctx.loaded));
  run(9, () => checkCaps(files));
  run(10, () => checkTexts(files, ctx.base));
  let merged = null;
  let renderScripts = null;
  if (refsOk) {
    const semanticOk = run(11, () => {
      const deps = (ctx.loaded || []).filter((b) => (manifest.dependencies || []).some((d) => d.id === b.id && d.hash === b.hash));
      merged = mergeBundles(ctx.base, [...deps.map((b) => toMerge(b.manifest, b.hash, b.files)), toMerge(manifest, hash, files)]);
      const moveIssues = checkMoveRuns(files, merged);
      let prepared = true;
      try {
        prepareCatalog(merged.moves, merged.poses, holdableProps(merged));
      } catch {
        prepared = false; // a broken bundle move (reported above) stops every script from loading: no stage runs
      }
      if (!prepared) return [...checkRules(files, merged, ctx.base), ...moveIssues];
      const presets = checkPresets(files, merged);
      report.goodThemes = presets.goodThemes;
      return [...checkRules(files, merged, ctx.base), ...moveIssues, ...checkPairs(files, merged), ...presets.issues, ...checkExamples(files, manifest, merged)];
    });
    if (semanticOk && ctx.determinism !== false) {
      run(12, () => {
        const pins = merged.bundles.map(({ id, version, hash: h }) => ({ id, version, hash: h }));
        const scripts = [...exampleScripts(files, manifest), ...showcaseScripts(files, merged, pins)];
        const d = checkDeterminism(scripts, merged, ctx.createEngine);
        report.simHashes = d.hashes;
        renderScripts = scripts;
        return d.issues;
      });
    } else skip(12);
  } else skip(11, 12);
  // 13 (with 12's pixel hashes): only where the host has a canvas; without one the bundle is "not fully checked".
  if (ctx.render && renderScripts) {
    run(13, () => {
      const r = renderChecks(renderScripts, merged, ctx.render);
      report.frameMs = r.report.frameMs;
      return r.issues;
    });
  } else skip(13);
  report.fullyChecked = steps.some((s) => s.step === 13 && !s.skipped);
  run(14, blocked);
  return result();
}
