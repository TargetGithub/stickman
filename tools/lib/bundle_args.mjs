// `--bundle <dir|zip>` for the command-line tools (CATALOG_BUNDLE_SPEC B3): check the bundles, merge them into
// the catalog, and hand the tool its other arguments. A bundle that does not check clean stops the tool.

import { loadBundlePaths } from "./bundle_node.mjs";

/** argv without the --bundle pairs, and the bundle paths. */
export function splitBundleArgs(argv) {
  const args = [];
  const paths = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--bundle") paths.push(argv[++i]);
    else args.push(argv[i]);
  }
  return { args, paths };
}

/**
 * @param {string[]} argv  the tool's arguments
 * @param {object} base  the default catalog
 * @returns {Promise<{ args: string[], catalog: object, bundles: object[] }>}
 */
export async function catalogFromArgs(argv, base) {
  const { args, paths } = splitBundleArgs(argv);
  if (paths.some((p) => !p)) {
    console.error("--bundle needs a bundle folder or .zip");
    process.exit(2);
  }
  if (!paths.length) return { args, catalog: base, bundles: [] };
  const { catalog, bundles, failures } = await loadBundlePaths(paths, { base });
  if (failures.length) {
    for (const f of failures) {
      console.error(`bundle ${f.path} does not check clean (node tools/bundle.mjs check ${f.path}):`);
      for (const e of f.errors.slice(0, 8)) console.error(`  ${e.code} ${e.file}${e.path ? ` ${e.path}` : ""}: ${e.message}`);
    }
    process.exit(2);
  }
  for (const b of bundles) console.error(`bundle: ${b.id} ${b.version} (${b.hash})`);
  return { args, catalog, bundles };
}

/** Credits for the bundles a script declares (section 8): name, version, author, licence, hash. */
export function bundleCredits(script, bundles) {
  const declared = new Set((script?.bundles || []).map((b) => b.id));
  return bundles.filter((b) => declared.has(b.id)).map((b) => ({
    id: b.id, version: b.version, hash: b.hash, name: b.manifest.name, author: b.manifest.author.name, license: b.manifest.license,
  }));
}
