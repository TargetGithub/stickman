// Automatic workbooks (WORKBOOK_SPEC 11): write a workbook with an LLM, repair it from the validator's issues
// until it validates (or the attempts run out), save the script and print the PDFs. generate.mjs --workbook.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { validate } from "../../engine/index.js";
import { LlmError } from "./llm/index.mjs";
import { workbookSystem, workbookRequest, workbookRepair } from "./workbook_prompts.mjs";
import { printWorkbook, slugOf } from "./print_book.mjs";
import { bookSize } from "./manual_workbook.mjs";

/**
 * @param {{ llm, wb, cfg: { models, effort, maxAttempts }, log(line) }} ctx
 * @param {{ topic, grade, pages, cast, seed, size }} task
 * @returns {Promise<{ script: object|null, result: object|null, attempts: object[] }>}
 */
export async function writeWorkbook(ctx, task) {
  const { llm, wb, cfg } = ctx;
  const M = cfg.models;
  const max = cfg.maxAttempts ?? 3;
  const models = [M.write ?? M.default, ...Array.from({ length: max - 1 }, (_, i) => (i === max - 2 ? M.repairEscalate ?? M.repair ?? M.default : M.repair ?? M.default))];
  const system = workbookSystem(wb);
  const messages = [{ role: "user", content: workbookRequest(task) }];
  const attempts = [];
  for (const [i, model] of models.entries()) {
    let res;
    try {
      res = await llm.json({ model, system, messages, effort: cfg.effort?.[i === 0 ? "write" : "repair"], stage: `workbook#${i + 1}` });
    } catch (e) {
      if (!(e instanceof LlmError) || e.kind === "api") throw e;
      attempts.push({ model, ok: false, failure: e.kind });
      ctx.log(`    attempt ${i + 1} (${model}): ${e.kind}`);
      if (e.text) messages.push({ role: "assistant", content: e.text }, { role: "user", content: "That reply could not be used (not one complete JSON object). Return the full workbook as one JSON object, nothing else." });
      continue;
    }
    const result = validate(res.json, wb);
    attempts.push({ model, ok: result.ok, errors: result.errors.map((x) => x.code), warnings: result.warnings.map((x) => x.code) });
    ctx.log(`    attempt ${i + 1} (${model}): ${result.ok ? "valid" : `${result.errors.length} error(s) [${[...new Set(result.errors.map((x) => x.code))].join(", ")}]`}${result.warnings.length ? `, ${result.warnings.length} warning(s)` : ""}`);
    if (result.ok) return { script: res.json, result, attempts };
    messages.push({ role: "assistant", content: JSON.stringify(res.json) }, { role: "user", content: workbookRepair(result) });
  }
  return { script: null, result: null, attempts };
}

/** Write, save and print one workbook; returns a run record for the review queue. */
export async function runWorkbook(ctx, task, { outDir }) {
  ctx.log(`workbook: "${task.topic}" (grade ${task.grade}, about ${task.pages} pages)`);
  const out = await writeWorkbook(ctx, task);
  if (!out.script) {
    ctx.log("  no valid workbook within the attempts");
    return { kind: "workbook", task, status: "invalid", attempts: out.attempts };
  }
  const slug = slugOf(out.script.title);
  const path = join(outDir, "workbooks", "scripts", `${slug}.json`);
  mkdirSync(join(outDir, "workbooks", "scripts"), { recursive: true });
  writeFileSync(path, JSON.stringify(out.script, null, 2) + "\n");
  const { files } = await printWorkbook(out.script, ctx.wb, { outDir: join(outDir, "workbooks"), slug, sheet: true });
  ctx.log(`  valid: ${bookSize(out.script)}; script ${path}`);
  for (const f of files) ctx.log(`  printed: ${f.path} (${f.pages} pages)`);
  return { kind: "workbook", task, status: "accepted", slug, script: path, pdfs: files.map((f) => f.path), attempts: out.attempts };
}
