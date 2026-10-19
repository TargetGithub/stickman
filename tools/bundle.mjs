#!/usr/bin/env node
// Catalog bundles (CATALOG_BUNDLE_SPEC 6 and 10; V3.1).
//   node tools/bundle.mjs check <folder> [--quick] [--json]   steps 1-11: prints issues with fixes; exit 1 on errors
//                                                           --quick skips the move runs and the example dry runs
//   node tools/bundle.mjs pack <folder> --i-made-this         writes files[] and contentHash into bundle.json
//   node tools/bundle.mjs hash <folder>                       prints the contentHash the folder would get
// Bundles travel as folders in V3.1 (zip import is B4); register a folder in catalog/bundles.json to use it.

import { catalog } from "../catalog/index.js";
import { readBundleSchemas } from "./lib/catalog_files.mjs";
import { readBundle, packBundle, canonical, sha256 } from "./lib/bundle_files.mjs";
import { checkBundle } from "./lib/bundle_check.mjs";

const args = process.argv.slice(2);
const cmd = args[0];
const dir = args.slice(1).find((a) => !a.startsWith("--"));
const flag = (f) => args.includes(f);
if (!cmd || !dir || !["check", "pack", "hash"].includes(cmd)) {
  console.error("usage: node tools/bundle.mjs check <folder> [--quick] [--json] | pack <folder> --i-made-this | hash <folder>");
  process.exit(2);
}

if (cmd === "hash") {
  console.log(packBundle(dir, { write: false }).contentHash);
  process.exit(0);
}

if (cmd === "pack") {
  if (!flag("--i-made-this")) {
    console.error("pack needs --i-made-this: you confirm that you made this content, or may share it under the bundle's licence (CATALOG_BUNDLE_SPEC 8).");
    process.exit(2);
  }
  const m = packBundle(dir);
  console.log(`${m.id} ${m.version}: ${m.files.length} files, contentHash ${m.contentHash}`);
  process.exit(0);
}

const input = readBundle(dir);
const r = checkBundle(input, { base: catalog, schemas: readBundleSchemas(), sha256, canonical, moveChecks: !flag("--quick"), examples: !flag("--quick") });
if (flag("--json")) {
  console.log(JSON.stringify({ ok: r.ok, issues: r.issues, counts: r.counts, hash: r.manifest?.contentHash }, null, 2));
} else {
  const errors = r.issues.filter((i) => i.code.startsWith("E_"));
  const warnings = r.issues.filter((i) => i.code.startsWith("W_"));
  console.log(`${r.ok ? "OK" : "INVALID"}: ${r.manifest?.id || dir} ${r.manifest?.version || ""} (${errors.length} error(s), ${warnings.length} warning(s))${flag("--quick") ? " [quick: move runs and examples skipped]" : ""}`);
  for (const i of r.issues) console.log(`  ${i.code} ${i.file}${i.path ? ` ${i.path}` : ""}: ${i.message}${i.fix ? `\n    fix: ${i.fix}` : ""}`);
  if (r.ok) console.log(`  entries: ${Object.entries(r.counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ")}; hash ${r.manifest.contentHash}`);
}
process.exit(r.ok ? 0 : 1);
