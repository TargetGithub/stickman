// Catalog bundles in scripts (CATALOG_BUNDLE_SPEC 7.1, 7.4). Runs right after the schema stage, before
// anything else: the script's `bundles` against the bundles merged into the catalog (catalog.bundles, set
// by the host's loader), namespaced names against the declared bundles, and the loader's combination
// failures (catalog.bundleCombos) for the declared set.
//   E_BUNDLE_MISSING     a declared bundle is not loaded
//   E_BUNDLE_HASH        a bundle with that id is loaded with another hash
//   E_BUNDLE_UNDECLARED  a namespaced name whose bundle the script does not declare
//   E_BUNDLE_DEPENDENCY  a declared bundle's dependency is not declared (with its hash)
//   E_BUNDLE_AUDIENCE    a kids story declares a bundle that does not list kids
//   E_BUNDLE_COMBO       a move of one declared bundle breaks on a body plan of another
//   W_BUNDLE_UNUSED      a declared bundle that no name uses (and no other declared bundle needs)

import { NAMESPACED } from "./v2_names.js";

const issue = (code, path, message, fix) => ({ code, path, message, fix });
const NS = new RegExp(NAMESPACED);
const IMPORT_FIX = "Import it (node tools/bundle.mjs check, then pass --bundle <dir|zip> to the tool) or remove it from \"bundles\".";

/** Every namespaced name in a script with its first path, in document order. */
function namespacedNames(v, path, out) {
  if (typeof v === "string") {
    if (NS.test(v) && !out.has(v)) out.set(v, path);
  } else if (Array.isArray(v)) v.forEach((x, i) => namespacedNames(x, `${path}[${i}]`, out));
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) if (!(path === "" && k === "bundles")) namespacedNames(x, path ? `${path}.${k}` : k, out);
  }
  return out;
}

/**
 * @param {object} script  schema-valid v1 or v2 script
 * @param {object} catalog  catalog.bundles: [{ id, version, hash, audience?, dependencies? }];
 *   catalog.bundleCombos: [{ bundles: [idA, idB], move, body, message }]
 */
export function bundleIssues(script, catalog) {
  const out = [];
  const pins = script.bundles || [];
  const loaded = new Map((catalog.bundles || []).map((b) => [b.id, b]));
  const declared = new Map();
  pins.forEach((p, i) => {
    const path = `bundles[${i}]`;
    if (declared.has(p.id)) return out.push(issue("E_REF_DUPLICATE", `${path}.id`, `The bundle '${p.id}' is declared twice.`, "Declare each bundle once."));
    declared.set(p.id, p);
    const b = loaded.get(p.id);
    if (!b) out.push(issue("E_BUNDLE_MISSING", path, `The bundle '${p.id}' ${p.version} (${p.hash}) is not loaded.`, IMPORT_FIX));
    else if (b.hash !== p.hash) out.push(issue("E_BUNDLE_HASH", `${path}.hash`, `'${p.id}' is loaded as ${b.version} (${b.hash}), but the script pins ${p.version} (${p.hash}).`, "A different hash is different content: load the pinned bundle, or pin the loaded one if you mean it."));
  });
  pins.forEach((p, i) => {
    const b = loaded.get(p.id);
    if (!b || b.hash !== p.hash) return;
    for (const d of b.dependencies || []) {
      const mine = declared.get(d.id);
      if (!mine || mine.hash !== d.hash) out.push(issue("E_BUNDLE_DEPENDENCY", `bundles[${i}]`, `'${p.id}' needs '${d.id}' ${d.version} (${d.hash}), which the script does not declare.`, `Add ${JSON.stringify({ id: d.id, version: d.version, hash: d.hash })} to "bundles".`));
    }
    if (script.version === 2 && (script.meta?.audience ?? "kids") === "kids" && b.audience && !b.audience.includes("kids")) {
      out.push(issue("E_BUNDLE_AUDIENCE", `bundles[${i}]`, `'${p.id}' is not made for kids, and this story is.`, 'Use a bundle that lists "kids", or set meta.audience to "general" if that fits.'));
    }
  });
  const names = namespacedNames(script, "", new Map());
  const used = new Set();
  for (const [name, path] of names) {
    const id = name.slice(0, name.indexOf(":"));
    used.add(id);
    if (!declared.has(id)) out.push(issue("E_BUNDLE_UNDECLARED", path, `'${name}' is from the bundle '${id}', which the script does not declare.`, loaded.has(id) ? `Add ${JSON.stringify({ id, version: loaded.get(id).version, hash: loaded.get(id).hash })} to "bundles".` : `Add '${id}' to "bundles" (its id, version and hash are in the bundle's context pack).`));
  }
  for (const c of catalog.bundleCombos || []) {
    if (c.bundles.every((id) => declared.has(id) && loaded.get(id)?.hash === declared.get(id).hash)) {
      out.push(issue("E_BUNDLE_COMBO", "bundles", `'${c.move}' (${c.bundles[0]}) breaks on the body plan '${c.body}' (${c.bundles[1]}): ${c.message}`, "These two bundles do not work together; use one of them, or ask the authors for versions that do."));
    }
  }
  const needed = new Set(pins.flatMap((p) => (loaded.get(p.id)?.dependencies || []).map((d) => d.id)));
  pins.forEach((p, i) => {
    if (!used.has(p.id) && !needed.has(p.id) && declared.get(p.id) === p) out.push(issue("W_BUNDLE_UNUSED", `bundles[${i}]`, `The script declares '${p.id}' but uses none of its names.`, "Remove it from \"bundles\", or use one of its entries."));
  });
  return out;
}
