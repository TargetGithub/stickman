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

import { readFileSync } from "node:fs";
import { workbookCatalogSync } from "../catalog/index.js";
import { validate, formatIssues } from "../engine/index.js";
import { printWorkbook } from "./lib/print_book.mjs";

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const script = JSON.parse(readFileSync(args.file, "utf8"));
  if (args.size) script.page = { ...(script.page || {}), size: args.size };
  const catalog = workbookCatalogSync();
  const report = validate(script, catalog);
  if (report.warnings.length) console.warn(formatIssues(report.warnings));
  if (!report.ok) {
    console.error(formatIssues(report.errors));
    process.exit(1);
  }
  const { files } = await printWorkbook(script, catalog, args);
  for (const f of files) console.log(`${f.path}  (${f.pages} page${f.pages === 1 ? "" : "s"})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
