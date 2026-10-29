#!/usr/bin/env node
// The printables set (docs/PRINTABLES_SPEC.md): every item as a student PDF, an answer-key PDF where the pages have
// answers, a WebP thumbnail of page 1, and one manifest.json for client-side search. Deterministic: the same catalog
// and engine give the same bytes.
// Usage: node tools/printables.mjs [options]
//   --out-dir DIR      where the set goes (default out/printables); for the site: <KidsLearningPlatform>/public/assets/printables
//   --only PREFIX      build only items whose id starts with PREFIX (repeatable); the manifest is not written
//   --check            validate every item and print the counts; write nothing
//   --inventory        write docs/PRINTABLES_INVENTORY.md (every item by category and grade) and stop
//   --thumb-width N    thumbnail width in px (default 240)
//   --quality N        WebP quality 1-100 (default 72)
// Exit code 1 when an item does not validate (the issues are printed).

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { workbookCatalogSync } from "../catalog/index.js";
import { validate, formatIssues, buildWorkbook, drawPage } from "../engine/index.js";
import { loadBackend } from "./lib/canvas.mjs";
import { printablesSet, FEATURED } from "./lib/printables_set.mjs";
import { buildManifest } from "./lib/printables_manifest.mjs";
import { inventoryMarkdown } from "./lib/printables_inventory.mjs";

export const INVENTORY_PATH = "docs/PRINTABLES_INVENTORY.md";

function parseArgs(argv) {
  const a = { outDir: "out/printables", only: [], check: false, inventory: false, thumbWidth: 240, quality: 72 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--out-dir") a.outDir = argv[++i];
    else if (k === "--only") a.only.push(argv[++i]);
    else if (k === "--check") a.check = true;
    else if (k === "--inventory") a.inventory = true;
    else if (k === "--thumb-width") a.thumbWidth = Number(argv[++i]);
    else if (k === "--quality") a.quality = Number(argv[++i]);
    else throw new Error(`unknown option ${k}`);
  }
  return a;
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

/** Every .pdf and .webp under dir (the set's own files), as paths relative to dir. */
function ownFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(pdf|webp)$/.test(name)) out.push(relative(dir, p));
    }
  };
  walk(dir);
  return out;
}

async function printDoc(backend, catalog, doc, meta) {
  const pdf = backend.createPdf(meta);
  for (const page of doc.pages) {
    drawPage(pdf.page(page.width, page.height), page, catalog);
    pdf.end();
  }
  return pdf.close();
}

async function thumbnail(backend, catalog, page, width, quality) {
  const k = width / page.width;
  const canvas = backend.createCanvas(width, Math.round(page.height * k));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(k, k);
  drawPage(ctx, page, catalog);
  return { buf: await canvas.encode("webp", quality), w: canvas.width, h: canvas.height };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const catalog = workbookCatalogSync();
  const all = printablesSet(catalog);
  const items = args.only.length ? all.filter((it) => args.only.some((p) => it.id.startsWith(p))) : all;

  let failed = 0;
  for (const it of items) {
    const r = validate(it.script, catalog);
    if (r.warnings.length) console.warn(`${it.id}:\n${formatIssues(r.warnings)}`);
    if (!r.ok) {
      failed++;
      console.error(`${it.id}:\n${formatIssues(r.errors)}`);
    }
  }
  if (failed) {
    console.error(`${failed} item(s) do not validate; nothing written`);
    process.exit(1);
  }
  if (args.inventory) {
    writeFileSync(INVENTORY_PATH, inventoryMarkdown(all, catalog));
    console.log(`${INVENTORY_PATH}: ${all.length} items`);
    return;
  }
  if (args.check) {
    console.log(`${items.length} items validate`);
    return;
  }

  const backend = await loadBackend("napi");
  const out = args.outDir;
  const manifestPath = join(out, "manifest.json");
  const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
  const entries = [];
  const written = new Set();
  for (const [n, it] of items.entries()) {
    const built = buildWorkbook(it.script, catalog);
    const [student, key] = built.documents;
    const meta = { title: it.title, subject: `${it.description} Grade ${it.grade}.`, keywords: `printable ${it.id}`, creator: "StickMan tools/printables.mjs" };
    mkdirSync(join(out, it.category), { recursive: true });
    const pdf = await printDoc(backend, catalog, student, meta);
    const pdfPath = `${it.category}/${it.id}.pdf`;
    writeFileSync(join(out, pdfPath), pdf);
    written.add(pdfPath);
    let keyPdf = null;
    let keyPath = null;
    if (key.pages.length) {
      keyPdf = await printDoc(backend, catalog, key, { ...meta, title: `${it.title}: Answer Key` });
      keyPath = `${it.category}/${it.id}-answers.pdf`;
      writeFileSync(join(out, keyPath), keyPdf);
      written.add(keyPath);
    }
    mkdirSync(join(out, "thumbs"), { recursive: true });
    const th = await thumbnail(backend, catalog, student.pages[0], args.thumbWidth, args.quality);
    const thumbPath = `thumbs/${it.id}.webp`;
    writeFileSync(join(out, thumbPath), th.buf);
    written.add(thumbPath);
    const hash = createHash("sha256").update(pdf).update(keyPdf || "").update(th.buf).digest("hex").slice(0, 12);
    entries.push({ item: it, files: { pdf: pdfPath, pdfBytes: pdf.length, pages: student.pages.length, key: keyPath, keyBytes: keyPdf?.length || 0, keyPages: key.pages.length, thumb: thumbPath, thumbW: th.w, thumbH: th.h, hash } });
    if ((n + 1) % 25 === 0) console.log(`  ${n + 1}/${items.length}`);
  }
  if (args.only.length) {
    console.log(`${entries.length} items written to ${out} (manifest not updated with --only)`);
    return;
  }

  // Remove files of items that left the set, so the folder holds exactly what the manifest lists.
  for (const f of ownFiles(out)) if (!written.has(f)) unlinkSync(join(out, f)), console.log(`removed ${f}`);

  const strandLabels = Object.fromEntries(Object.entries(catalog.education.skills.strands).map(([id, s]) => [id, s.label]));
  const manifest = buildManifest(entries, { featured: FEATURED, previous, strandLabels });
  const json = JSON.stringify(manifest);
  writeFileSync(manifestPath, json);

  const thumbs = entries.reduce((s, e) => s + statSync(join(out, e.files.thumb)).size, 0);
  console.log(`\n${manifest.count} items, ${entries.reduce((s, e) => s + e.files.pages + e.files.keyPages, 0)} pages`);
  console.log(`PDFs ${mb(manifest.totalBytes)}, thumbnails ${mb(thumbs)}, manifest ${kb(json.length)} (${kb(gzipSync(json).length)} gzipped)`);
  console.log(`total ${mb(manifest.totalBytes + thumbs + json.length)} in ${out}`);
  console.log(`version ${manifest.version}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}
