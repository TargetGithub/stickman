// Workbook prompts (WORKBOOK_SPEC 11): the writer system prompt, the task, the repair message and the
// copy-paste prompt. The system prompt is prompts/workbook.md around the same text as 09_workbooks.md.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { workbookBody } from "./workbook_tables.mjs";
import { catalogDocs, CATALOG_DIR } from "./catalog_files.mjs";

const PROMPTS = fileURLToPath(new URL("../../prompts/", import.meta.url));
const read = (name) => readFileSync(join(PROMPTS, name), "utf8");
const fill = (text, vars) => text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

/** The example workbook the prompt and 09_workbooks.md show (a shapes book, so it never matches a topic too closely). */
export const PROMPT_EXAMPLE = "shapes_with_doopi";

export const REPLY_RULE = "Reply with only the JSON object in a single ```json code block. No explanation before or after it.";

/** The example workbooks in catalog/examples/workbooks/ (name → script), in name order. */
export function workbookExamples(root = CATALOG_DIR) {
  const dir = join(root, "examples/workbooks");
  return Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(dir, f), "utf8"))]));
}

/** The writer's system prompt for a workbook catalog (engine catalog + presets + education). */
export function workbookSystem(wb) {
  const docs = catalogDocs();
  const prose = readFileSync(join(CATALOG_DIR, "docs/workbook.md"), "utf8");
  const example = workbookExamples()[PROMPT_EXAMPLE];
  return fill(read("workbook.md"), { BODY: workbookBody({ wb, docs: docs.workbook_activities, codes: docs.codes, prose, example }) });
}

/** The task: a workbook about a topic for a grade. */
export function workbookRequest({ topic, grade = "k", pages = 10, cast = [], seed = 1, size = "letter" }) {
  return [
    `Write a workbook about: ${topic}`,
    `Grade: ${grade}. Pages in the student book: about ${pages} (a cover is extra). Page size: ${size}.`,
    cast.length ? `Characters to feature: ${cast.join(", ")}.` : "Pick one to three print-approved characters to feature.",
    `Use "seed": ${seed}. Add the answer key document.`,
  ].join("\n");
}

/** The repair message for a failed validation. */
export function workbookRepair(result) {
  const issues = [...result.errors, ...result.warnings].map((i) => `${i.code.startsWith("W_") ? "warning" : "error"} ${i.code} at ${i.path || "(root)"}: ${i.message}${i.fix ? `\n    fix: ${i.fix}` : ""}`).join("\n");
  return fill(read("workbook_repair.md"), { ISSUES: issues || "(none)" });
}

/** One copy-paste prompt: the system text, then the task. */
export function workbookPrompt(wb, task) {
  return `${workbookSystem(wb).trim()}\n\n---\n\n# Your task\n\n${workbookRequest(task).trim()}\n\n${REPLY_RULE}\n`;
}
