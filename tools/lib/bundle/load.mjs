// Loading checked bundles into one engine catalog (CATALOG_BUNDLE_SPEC 7.2): merge in ascending id order,
// then the combination check (step 4): every move of one bundle on every body plan of another that no single
// import covered. Failures go to catalog.bundleCombos, which the validator reports as E_BUNDLE_COMBO for
// scripts that declare both bundles. Pure and browser-safe.

import { mergeBundles } from "../../../catalog/merge.js";
import { prepareCatalog } from "../../../engine/moves.js";
import { holdableProps } from "../../../engine/objects.js";
import { runMove } from "../move_check.mjs";
import { toMerge } from "./check.mjs";
import { catalogFragment } from "./layout.mjs";

const rigOf = (x) => x?.rig || "humanoid";

/** Does a's import already cover b (b is a dependency of a, so a's step 11 ran on b's entries)? */
const covers = (a, b) => (a.manifest.dependencies || []).some((d) => d.id === b.id && d.hash === b.hash);

/**
 * Move × body plan runs across bundles that no import covered.
 * @param {Array<{ id, hash, manifest, files }>} bundles  checked bundles (checkBundle(...).bundle)
 * @param {object} merged  mergeBundles(base, bundles)
 * @param {{ run?: typeof runMove }} [opts]  the move runner (tests inject one)
 * @returns {Array<{ bundles: [string, string], move: string, body: string, message: string }>}
 */
export function combinationFailures(bundles, merged, { run = runMove } = {}) {
  const out = [];
  if (bundles.length < 2) return out;
  let moves;
  try {
    moves = prepareCatalog(merged.moves, merged.poses, holdableProps(merged));
  } catch (err) {
    return [{ bundles: [bundles[0].id, bundles[1].id], move: "(all)", body: "(all)", message: err.message.split("\n").slice(0, 2).join(" ") }];
  }
  for (const a of bundles) {
    const own = catalogFragment(a.files).moves.filter((m) => !m.flags?.partner);
    for (const b of bundles) {
      if (a === b || covers(a, b) || covers(b, a)) continue;
      for (const [plan, body] of Object.entries(catalogFragment(b.files).bodies)) {
        for (const m of own) {
          if ((m.rig ?? "humanoid") !== rigOf(body)) continue;
          const problems = run(m, moves, merged, { draft: false, plans: [plan] });
          if (problems.length) out.push({ bundles: [a.id, b.id], move: m.name, body: plan, message: problems[0] });
        }
      }
    }
  }
  return out;
}

/**
 * The engine catalog for a set of checked bundles: base + bundles + the combination failures.
 * @param {object} base
 * @param {Array<{ id, version, hash, manifest, files }>} bundles
 */
export function catalogWithBundles(base, bundles, opts = {}) {
  const merged = mergeBundles(base, bundles.map((b) => toMerge(b.manifest, b.hash, b.files)));
  merged.bundleCombos = combinationFailures([...bundles].sort((x, y) => (x.id < y.id ? -1 : 1)), merged, opts);
  return merged;
}
