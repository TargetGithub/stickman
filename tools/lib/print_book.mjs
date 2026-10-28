// Print a validated workbook (WORKBOOK_SPEC 11): one vector PDF per document, optional page PNGs and a contact
// sheet per document. Shared by tools/print.mjs, tools/manual.mjs check-workbook --print and generate.mjs --workbook.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { loadBackend } from "./canvas.mjs";
import { buildWorkbook, drawPage } from "../../engine/index.js";

const DPI = 150;

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

/**
 * @param {object} script  a valid workbook;  @param {object} catalog  the workbook catalog
 * @param {{ outDir: string, slug?: string, docs?: string[], png?: boolean, sheet?: boolean }} opts
 * @returns {Promise<{ dir: string, files: { doc: string, path: string, pages: number }[] }>}
 */
export async function printWorkbook(script, catalog, opts) {
  const built = buildWorkbook(script, catalog);
  const backend = await loadBackend("napi");
  const slug = opts.slug || slugOf(script.title);
  const dir = join(opts.outDir, slug);
  mkdirSync(dir, { recursive: true });
  const hash = createHash("sha256").update(JSON.stringify(script)).digest("hex").slice(0, 16);
  const files = [];
  for (const doc of built.documents) {
    if (opts.docs?.length && !opts.docs.includes(doc.id)) continue;
    const pdf = backend.createPdf({ title: doc.answerKey ? `${doc.title}: Answer Key` : doc.title, subject: `StickMan workbook, grade ${script.grade}`, keywords: `script ${hash}`, creator: "StickMan tools/print.mjs" });
    for (const page of doc.pages) {
      drawPage(pdf.page(page.width, page.height), page, catalog);
      pdf.end();
    }
    const path = join(dir, `${slug}-${doc.id}.pdf`);
    writeFileSync(path, pdf.close());
    files.push({ doc: doc.id, path, pages: doc.pages.length });
    if (opts.png) {
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
    if (opts.sheet) await contactSheet(backend, catalog, doc.pages, join(dir, `${doc.id}_sheet.png`));
  }
  return { dir, files };
}
