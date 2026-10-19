#!/usr/bin/env node
// Catalog bundles (docs/CATALOG_BUNDLE_SPEC.md). Every command checks first (steps 1-14; the render checks
// need the canvas backend, --no-render skips them and the bundle counts as "not fully checked").
//
//   node tools/bundle.mjs check <dir|zip> [--dep <dir|zip>]... [--no-render] [--json]
//       print every issue with its fix; exit 1 on errors
//   node tools/bundle.mjs check --fixture <tests/fixtures/bundles/bad/CODE.json>
//       build a bad test fixture (a patch over a good bundle) in memory, check it, compare with its expect
//   node tools/bundle.mjs pack <dir> --i-made-this [--out <file.zip>]
//       write files[] and contentHash into <dir>/bundle.json, zip the folder, then check the zip
//   node tools/bundle.mjs import <dir|zip> [--dep <dir|zip>]... [--no-render]
//       check, then keep it in the store: bundles/<id>/<hash>/ ($STICKMAN_BUNDLES to move it); dependencies
//       already in the store are found there
//   node tools/bundle.mjs list
//       the bundles in the store
//   node tools/bundle.mjs sheet <dir|zip> [--out <file.png>]
//       the contact sheet for review: every pose, move, body plan, preset, face, FX, theme, object, prop, activity

import { writeFileSync, readFileSync, statSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { checkBundle } from "./lib/bundle/check.mjs";
import { contactSheet } from "./lib/bundle/render.mjs";
import { catalogWithBundles } from "./lib/bundle/load.mjs";
import { readBundlePath, nodeContext, packBundleDir } from "./lib/bundle_node.mjs";
import { storeRoot, writeToStore, listStore, inStore, readStored } from "./lib/bundle_store.mjs";
import { fixtureInput, readFixture } from "./lib/bundle_fixture.mjs";
import { loadBackend } from "./lib/canvas.mjs";

const USAGE = `usage: node tools/bundle.mjs check <dir|zip> [--dep <dir|zip>]... [--no-render] [--json]
       node tools/bundle.mjs check --fixture <file.json>
       node tools/bundle.mjs pack <dir> --i-made-this [--out <file.zip>]
       node tools/bundle.mjs import <dir|zip> [--dep <dir|zip>]... [--no-render]
       node tools/bundle.mjs list
       node tools/bundle.mjs sheet <dir|zip> [--out <file.png>]`;
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
  if (r.ok && !r.report.fullyChecked) console.log("  not fully checked: the render checks (12 pixels, 13) did not run");
}

/** A bundle is a folder or a zip; anything else gets a plain message instead of a zip error. */
function bundleOrExit(path) {
  let st;
  try {
    st = statSync(path);
  } catch {
    console.error(`'${path}' does not exist.`);
    process.exit(2);
  }
  if (st.isDirectory()) return;
  if (readFileSync(path).subarray(0, 2).toString("latin1") === "PK") return;
  const hint = path.endsWith(".json") ? (path.includes("fixtures/bundles/bad/") ? " This is a test fixture (a patch over a good bundle): use --fixture." : " A bundle is the folder that holds bundle.json, not the file.") : "";
  console.error(`'${path}' is not a bundle: pass a bundle folder or a .zip.${hint}`);
  process.exit(2);
}

let backend = null;
/** The canvas and clock for the render checks, unless --no-render. */
async function renderIo() {
  if (rest.includes("--no-render")) return null;
  backend ??= await loadBackend();
  return { createCanvas: backend.createCanvas, now: () => performance.now() };
}

async function read(path) {
  bundleOrExit(path);
  return readBundlePath(path);
}

/** The context: --dep bundles, then dependencies the bundle declares that are in the store. */
async function contextFor(entries) {
  const ctx = nodeContext();
  for (const d of deps) {
    const { entries: e, issues } = await read(d);
    const r = checkBundle(e, { ...ctx, preIssues: issues, determinism: false });
    if (!r.ok) {
      print(r, d);
      console.error(`dependency ${d} does not check clean`);
      process.exit(1);
    }
    ctx.loaded.push(r.bundle);
  }
  let manifest = null;
  try {
    manifest = JSON.parse(new TextDecoder().decode(entries.find((e) => e.path === "bundle.json")?.bytes));
  } catch {
    // step 2/3 will say what is wrong with it
  }
  for (const pin of Array.isArray(manifest?.dependencies) ? manifest.dependencies : []) {
    if (ctx.loaded.some((b) => b.id === pin?.id) || !pin?.id || !inStore(pin)) continue;
    const stored = readStored(pin);
    const r = checkBundle(stored.entries, { ...ctx, preIssues: stored.issues, determinism: false });
    if (r.ok) ctx.loaded.push(r.bundle);
  }
  return ctx;
}

async function check(path, extra = {}) {
  const { entries, issues } = await read(path);
  const ctx = await contextFor(entries);
  return { r: checkBundle(entries, { ...ctx, preIssues: issues, render: await renderIo(), ...extra }), entries, ctx };
}

if (cmd === "check" && target === "--fixture" && rest[0]) {
  const file = rest[0];
  const fx = readFixture(file);
  const { entries, ctx } = await fixtureInput(fx, { root: dirname(dirname(file)) });
  const r = checkBundle(entries, ctx);
  console.log(`${file}: ${fx.why}`);
  print(r, `  ${fx.from} with this change`);
  const want = [...new Set(fx.expect.map((e) => e.code))].sort();
  const got = [...new Set([...r.errors, ...r.warnings].map((i) => i.code).filter((c) => c !== "W_BUNDLE_UNREVIEWED" || want.includes(c)))].sort();
  const same = JSON.stringify(want) === JSON.stringify(got);
  console.log(`  expected ${want.join(", ")}: ${same ? "matches" : `got ${got.join(", ") || "nothing"}`}`);
  process.exit(same ? 0 : 1);
} else if (cmd === "check" && target) {
  const { r } = await check(target);
  if (rest.includes("--json")) console.log(JSON.stringify({ ok: r.ok, errors: r.errors, warnings: r.warnings, report: r.report, bundle: r.bundle && { id: r.bundle.id, version: r.bundle.version, hash: r.bundle.hash } }, null, 2));
  else print(r, target);
  process.exit(r.ok ? 0 : 1);
} else if (cmd === "import" && target) {
  const { r, entries, ctx } = await check(target);
  print(r, target);
  if (!r.ok) {
    console.error("not imported: fix the errors above first");
    process.exit(1);
  }
  const dir = writeToStore(r.bundle, entries, {
    importedFrom: target, catalogVersion: ctx.catalogVersion, fullyChecked: r.report.fullyChecked, reviewed: !r.warnings.some((w) => w.code === "W_BUNDLE_UNREVIEWED"),
    warnings: r.warnings, steps: r.report.steps, simHashes: r.report.simHashes || {},
  });
  console.log(`imported ${r.bundle.id} ${r.bundle.version} into ${dir}\nscripts declare it with: ${JSON.stringify({ id: r.bundle.id, version: r.bundle.version, hash: r.bundle.hash })}`);
} else if (cmd === "list") {
  const all = listStore();
  if (!all.length) console.log(`no bundles in ${storeRoot()}`);
  for (const b of all) {
    const m = JSON.parse(readFileSync(join(b.dir, "bundle.json"), "utf8"));
    let info = {};
    try {
      info = JSON.parse(readFileSync(join(b.dir, "import.json"), "utf8"));
    } catch {
      // imported by hand: no report
    }
    console.log(`${b.id} ${m.version}  ${b.hash}  ${m.license}${info.reviewed ? "  reviewed" : "  not reviewed"}${info.fullyChecked === false ? "  not fully checked" : ""}`);
  }
} else if (cmd === "sheet" && target) {
  const { r, ctx } = await check(target, { render: null, determinism: false });
  if (!r.ok) {
    print(r, target);
    process.exit(1);
  }
  backend ??= await loadBackend();
  const merged = catalogWithBundles(ctx.base, [...ctx.loaded, r.bundle]);
  const pins = merged.bundles.map(({ id, version, hash }) => ({ id, version, hash }));
  const canvas = contactSheet(r.bundle.files, merged, { createCanvas: backend.createCanvas, now: () => performance.now() }, { title: `${r.bundle.manifest.name} (${r.bundle.id} ${r.bundle.version}, ${r.bundle.manifest.license}) ${r.bundle.hash.slice(0, 19)}`, pins });
  const out = opt("--out") || join("out", "bundles", `${r.bundle.id}-${r.bundle.version}-sheet.png`);
  mkdirSync(dirname(out), { recursive: true });
  await backend.savePng(canvas, out);
  console.log(`wrote ${out}`);
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
  const { r } = await check(out);
  print(r, out);
  process.exit(r.ok ? 0 : 1);
} else {
  console.error(USAGE);
  process.exit(2);
}
