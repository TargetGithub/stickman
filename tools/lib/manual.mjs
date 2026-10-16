// Copy-paste workflow (no API key): build self-contained prompts for any chat UI (ChatGPT, Claude.ai,
// Gemini, a local chat app...) and check the pasted replies with the validator. Pure functions;
// tools/manual.mjs is the CLI around them.

import { parseJsonText } from "./llm/index.mjs";
import { validate } from "../../engine/index.js";
import { writerSystem, ideationSystem, critiqueSystem, metadataSystem, writeRequest, ideationRequest, repairRequest, metadataRequest } from "./prompt_pack.mjs";
import { evaluate } from "./pipeline.mjs";

const REPLY_RULE = "Reply with only the JSON object in a single ```json code block. No explanation before or after it.";

const join = (system, request) => `${system.trim()}\n\n---\n\n# Your task\n\n${request.trim()}\n\n${REPLY_RULE}\n`;

/** One prompt that writes a script, ready to paste into a new chat. */
export function manualWritePrompt(catalog, premise, opts) {
  return join(writerSystem(catalog), writeRequest(premise, opts));
}

/** Premise brainstorming prompt (the reply is a JSON list of premises to pick from). */
export function manualIdeasPrompt(catalog, opts, avoid = {}) {
  return join(ideationSystem(catalog), ideationRequest(opts, avoid));
}

/** Critique prompt to send together with the contact sheet image. */
export function manualCritiquePrompt(script, timeline) {
  return join(critiqueSystem(), `The contact sheet image is attached.\n\nTimeline:\n${timeline}\n\nScript:\n${JSON.stringify(script)}\n\nReturn {"score": 1-10, "revise": true|false, "notes": [...]}.`);
}

export function manualMetadataPrompt(script, premiseText, timeline) {
  return join(metadataSystem(), `${metadataRequest(script, { logline: premiseText || script.meta.title }, timeline)}\n\nReturn {"title": "...", "description": "...", "tags": [...]}.`);
}

/**
 * Check a pasted reply.
 * @returns {{ ok: boolean, parsed: boolean, script?, result?, score?, fixPrompt?: string, message: string }}
 */
export function checkReply(text, catalog) {
  let script;
  try {
    script = parseJsonText(text);
  } catch (e) {
    return {
      ok: false,
      parsed: false,
      message: `No JSON object found in the reply (${e.message}).`,
      fixPrompt: `Your reply did not contain a JSON object I could read. ${REPLY_RULE} Send the full script again.\n`,
    };
  }
  const result = validate(script, catalog);
  if (!result.ok) {
    return { ok: false, parsed: true, script, result, message: `${result.errors.length} error(s), ${result.warnings.length} warning(s).`, fixPrompt: `${repairRequest(result).trim()}\n\n${REPLY_RULE}\n` };
  }
  const ev = evaluate(script, catalog);
  return { ok: true, parsed: true, script, result, score: ev, message: `Valid: ${result.durationSec.toFixed(1)} s, score ${ev.score}/100, ${result.warnings.length} warning(s).` };
}
