#!/usr/bin/env node
// Catalog bundles (docs/CATALOG_BUNDLE_SPEC.md): check and pack. Import, sheet and pack-context are B4/B5.
//
//   node tools/bundle.mjs check <dir|zip> [--dep <dir|zip>]... [--json]
//       steps 1-11 and 14; prints every issue with its fix; exit 1 on errors
//   node tools/bundle.mjs pack <dir> --i-made-this [--out <file.zip>]
//       writes files[] and contentHash into <dir>/bundle.json, zips the folder, then checks the zip

import { writeFileSync } from "node:fs";
import { checkBundle } from "./lib/bundle/check.mjs";
import { readBundlePath, nodeContext, packBundleDir } from "./lib/bundle_node.mjs";

const USAGE = "usage: node tools/bundle.mjs check <dir|zip> [--dep <dir|zip>]... [--json]\n       node tools/bundle.mjs pack <dir> --i-made-this [--out <file.zip>]";
const [cmd, target, ...rest] = process.argv.slice(2);
const opt = (name) => (rest.includes(name) ? rest[rest.indexOf(name) + 1] : null);
const deps = rest.flatMap((a, i) => (a === "--dep" ? [rest[i + 1]] : []));

function print(r, label) {
  const line = (i) => `  ${i.code}  ${i.file}${i.path ? ` ${i.path}` : ""}: ${i.message}${i.fix ? `\n      fix: ${i.fix}` : ""}`;
  console.log(`${label}: ${r.ok ? "ok" : `${r.errors.length} error(s)`}${r.warnings.length ? `, ${r.warnings.length} warning(s)` : ""}${r.bundle ? `  (${r.bundle.id} ${r.bundle.version}, ${r.bundle.hash})` : ""}`);
  for (const i of [...r.errors, ...r.warnings]) console.log(line(i));
  for (const n of r.report.notes) console.log(`  note: ${n}`);
  const ran = r.report.steps.filter((s) => !s.skipped);
  console.log(`  steps: ${ran.map((s) => `${s.step} (${s.ms} ms)`).join(", ")}${r.report.steps.some((s) => s.skipped) ? `; skipped ${r.report.steps.filter((s) => s.skipped).map((s) => s.step).join(", ")}` : ""}`);
}

async function check(path, ctx) {
  const { entries, issues } = await readBundlePath(path);
  return checkBundle(entries, { ...ctx, preIssues: issues });
}

async function withDeps() {
  const ctx = nodeContext();
  for (const d of deps) {
    const r = await check(d, ctx);
    if (!r.ok) {
      print(r, d);
      console.error(`dependency ${d} does not check clean`);
      process.exit(1);
    }
    ctx.loaded.push(r.bundle);
  }
  return ctx;
}

if (cmd === "check" && target) {
  const r = await check(target, await withDeps());
  if (rest.includes("--json")) console.log(JSON.stringify({ ok: r.ok, errors: r.errors, warnings: r.warnings, report: r.report, bundle: r.bundle && { id: r.bundle.id, version: r.bundle.version, hash: r.bundle.hash } }, null, 2));
  else print(r, target);
  process.exit(r.ok ? 0 : 1);
} else if (cmd === "pack" && target) {
  if (!rest.includes("--i-made-this")) {
    console.error("pack: confirm that you made this content, or may share it under the licence in bundle.json, with --i-made-this.");
    process.exit(2);
  }
  const p = packBundleDir(target);
  if (!p.manifest) {
    print({ ok: false, errors: p.issues, warnings: [], report: { steps: [], notes: [] }, bundle: null }, target);
    process.exit(1);
  }
  const out = opt("--out") || `${p.manifest.id}-${p.manifest.version}.zip`;
  writeFileSync(out, p.zip);
  console.log(`packed ${target} → ${out} (${p.zip.length} bytes), contentHash ${p.manifest.contentHash}`);
  const r = await check(out, await withDeps());
  print(r, out);
  process.exit(r.ok ? 0 : 1);
} else {
  console.error(USAGE);
  process.exit(2);
}
