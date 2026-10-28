#!/usr/bin/env node
// Workbook script → one vector PDF per document (WORKBOOK_SPEC 11, ADR-040).
// Usage: node tools/print.mjs <workbook.json> [options]
//   --out-dir out/workbooks   parent folder; output goes to <out-dir>/<slug>/<slug>-<document>.pdf
//   --slug name               output folder and file prefix (default: from the title)
//   --doc ID                  print only this document (repeatable)
//   --size letter|a4          override page.size
//   --png                     also write every page as PNG at 150 dpi (<slug>/png/<document>-<nn>.png)
//   --sheet                   also write a contact sheet of every page per document (<slug>/<document>_sheet.png)
// Exit code 1 when the script does not validate (the issues are printed).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { loadBackend } from "./lib/canvas.mjs";
import { workbookCatalogSync } from "../catalog/index.js";
import { validate, formatIssues, buildWorkbook, drawPage } from "../engine/index.js";

const DPI = 150;

function parseArgs(argv) {
  const a = { file: null, outDir: "out/workbooks", slug: null, docs: [], size: null, png: false, sheet: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--out-dir") a.outDir = argv[++i];
    else if (k === "--slug") a.slug = argv[++i];
    else if (k === "--doc") a.docs.push(argv[++i]);
    else if (k === "--size") a.size = argv[++i];
    else if (k === "--png") a.png = true;
    else if (k === "--sheet") a.sheet = true;
    else if (!k.startsWith("--") && !a.file) a.file = k;
    else throw new Error(`unknown option ${k}`);
  }
  if (!a.file) throw new Error("usage: node tools/print.mjs <workbook.json> [--out-dir DIR] [--doc ID] [--size letter|a4] [--png] [--sheet]");
  return a;
}

export const slugOf = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "workbook";

/** A contact sheet: every page as a thumbnail, four across, on grey. */
async function contactSheet(backend, catalog, pages, path) {
  const tw = 300;
  const k = tw / pages[0].width;
  const th = Math.round(pages[0].height * k);
  const cols = Math.min(4, pages.length);
  const rows = Math.ceil(pages.length / cols);
  const pad = 16;
  const canvas = backend.createCanvas(cols * (tw + pad) + pad, rows * (th + pad) + pad);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#9a9a9a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  pages.forEach((p, i) => {
    ctx.save();
    ctx.translate(pad + (i % cols) * (tw + pad), pad + Math.floor(i / cols) * (th + pad));
    ctx.scale(k, k);
    drawPage(ctx, p, catalog);
    ctx.restore();
  });
  await backend.savePng(canvas, path);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const text = readFileSync(args.file, "utf8");
  const script = JSON.parse(text);
  if (args.size) script.page = { ...(script.page || {}), size: args.size };
  const catalog = workbookCatalogSync();
  const report = validate(script, catalog);
  if (report.warnings.length) console.warn(formatIssues(report.warnings));
  if (!report.ok) {
    console.error(formatIssues(report.errors));
    process.exit(1);
  }
  const built = buildWorkbook(script, catalog);
  const backend = await loadBackend("napi");
  const slug = args.slug || slugOf(script.title);
  const dir = join(args.outDir, slug);
  mkdirSync(dir, { recursive: true });
  const hash = createHash("sha256").update(JSON.stringify(script)).digest("hex").slice(0, 16);
  for (const doc of built.documents) {
    if (args.docs.length && !args.docs.includes(doc.id)) continue;
    const pdf = backend.createPdf({ title: doc.answerKey ? `${doc.title}: Answer Key` : doc.title, subject: `StickMan workbook, grade ${script.grade}`, keywords: `script ${hash}`, creator: "StickMan tools/print.mjs" });
    for (const page of doc.pages) {
      drawPage(pdf.page(page.width, page.height), page, catalog);
      pdf.end();
    }
    const file = join(dir, `${slug}-${doc.id}.pdf`);
    writeFileSync(file, pdf.close());
    console.log(`${file}  (${doc.pages.length} page${doc.pages.length === 1 ? "" : "s"})`);
    if (args.png) {
      mkdirSync(join(dir, "png"), { recursive: true });
      for (const [i, page] of doc.pages.entries()) {
        const k = DPI / 72;
        const canvas = backend.createCanvas(Math.round(page.width * k), Math.round(page.height * k));
        const ctx = canvas.getContext("2d");
        ctx.scale(k, k);
        drawPage(ctx, page, catalog);
        await backend.savePng(canvas, join(dir, "png", `${doc.id}-${String(i + 1).padStart(2, "0")}.png`));
      }
    }
    if (args.sheet) await contactSheet(backend, catalog, doc.pages, join(dir, `${doc.id}_sheet.png`));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
