// Copy-paste workbooks (WORKBOOK_SPEC 11): check a pasted reply against the validator; an invalid one gets a fix
// prompt for the same chat. Pure; tools/manual.mjs is the CLI.

import { parseJsonText } from "./llm/index.mjs";
import { validate } from "../../engine/index.js";
import { workbookRepair, REPLY_RULE } from "./workbook_prompts.mjs";

/** Pages and documents of a workbook, for messages. */
export const bookSize = (s) => `${s.documents.length} document(s), ${s.documents.filter((d) => d.pages).reduce((n, d) => n + d.pages.length, 0)} page(s)`;

/** @returns {{ ok: boolean, parsed: boolean, script?, result?, fixPrompt?: string, message: string }} */
export function checkWorkbookReply(text, wb) {
  let script;
  try {
    script = parseJsonText(text);
  } catch (e) {
    return { ok: false, parsed: false, message: `No JSON object found in the reply (${e.message}).`, fixPrompt: `Your reply did not contain a JSON object I could read. ${REPLY_RULE} Send the full workbook again.\n` };
  }
  if (script?.kind !== "workbook") {
    return { ok: false, parsed: true, script, message: "The reply is not a workbook (kind is not \"workbook\").", fixPrompt: `That is not a workbook script. Write it with "kind": "workbook" and "version": 1, as the instructions show. ${REPLY_RULE}\n` };
  }
  const result = validate(script, wb);
  if (!result.ok) return { ok: false, parsed: true, script, result, message: `${result.errors.length} error(s), ${result.warnings.length} warning(s).`, fixPrompt: `${workbookRepair(result).trim()}\n\n${REPLY_RULE}\n` };
  return { ok: true, parsed: true, script, result, message: `Valid: ${bookSize(script)}, ${result.warnings.length} warning(s).` };
}
