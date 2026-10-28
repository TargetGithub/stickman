// Workbook printing with the real canvas backend (WORKBOOK_SPEC 3, 7; integration only): tools/print.mjs
// writes one vector PDF per document, byte-identical on every run, with Andika embedded and no raster images.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBackend } from "../../tools/lib/canvas.mjs";
import { workbookCatalogSync } from "../../catalog/index.js";
import { buildWorkbook, drawPage } from "../../engine/index.js";

const sample = new URL("../fixtures/workbooks/w1_sample.json", import.meta.url).pathname;
const tool = new URL("../../tools/print.mjs", import.meta.url).pathname;

function print(dir, ...extra) {
  const r = spawnSync(process.execPath, [tool, sample, "--out-dir", dir, "--slug", "book", ...extra], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return join(dir, "book");
}

test("print.mjs writes one deterministic vector PDF per document", () => {
  const a = mkdtempSync(join(tmpdir(), "wb-a-"));
  const b = mkdtempSync(join(tmpdir(), "wb-b-"));
  try {
    const da = print(a);
    const db = print(b);
    assert.deepEqual(readdirSync(da).sort(), ["book-answers.pdf", "book-student.pdf"]);
    for (const [file, pages] of [["book-student.pdf", 5], ["book-answers.pdf", 3]]) {
      const pdf = readFileSync(join(da, file));
      assert.ok(pdf.equals(readFileSync(join(db, file))), `${file} is byte-identical`);
      const text = pdf.toString("latin1");
      assert.ok(text.startsWith("%PDF-"));
      assert.ok(text.includes(`/Count ${pages}`), `${file} has ${pages} pages`);
      assert.ok(/\/FontName \/\w+\+Andika/.test(text), "Andika is embedded");
      assert.ok(!text.includes("/Subtype /Image"), "no raster images");
      assert.ok(text.includes("/MediaBox [0 0 612 792]"), "US Letter");
    }
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("--size a4 and --doc pick the page size and the documents", () => {
  const dir = mkdtempSync(join(tmpdir(), "wb-c-"));
  try {
    const d = print(dir, "--size", "a4", "--doc", "answers");
    assert.deepEqual(readdirSync(d), ["book-answers.pdf"]);
    assert.ok(readFileSync(join(d, "book-answers.pdf")).toString("latin1").includes("/MediaBox [0 0 595 842]"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a drawn page is black line art on white, with answers in red only on the key", async () => {
  const backend = await loadBackend();
  const catalog = workbookCatalogSync();
  const { documents } = buildWorkbook(JSON.parse(readFileSync(sample, "utf8")), catalog);
  const census = (page) => {
    const canvas = backend.createCanvas(page.width, page.height);
    drawPage(canvas.getContext("2d"), page, catalog);
    const px = backend.readRGBA(canvas);
    let ink = 0;
    let red = 0;
    let colour = 0;
    for (let i = 0; i < px.length; i += 4) {
      const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
      if (r < 100 && g < 100 && b < 100) ink++;
      else if (r > 180 && g < 90 && b < 90) red++;
      else if (Math.max(r, g, b) - Math.min(r, g, b) > 60) colour++;
    }
    return { ink, red, colour, total: px.length / 4 };
  };
  const student = census(documents[0].pages[2]);
  assert.ok(student.ink > student.total * 0.005, "the page has line art");
  assert.equal(student.red, 0);
  assert.ok(student.colour < student.total * 0.001, `student pages are black and white (${student.colour} coloured px)`);
  const key = census(documents[1].pages[1]);
  assert.ok(key.red > 200, "the key shows the answers in red");
});
