// Copy-paste story workflow (STORY_SPEC 18, S8.3): the two-stage pipeline by hand with any chat UI.
// An outline prompt, then one prompt per scene; each reply is checked here (the scene inside the story so
// far) and either saved or answered with a fix prompt for the same chat. Pure functions; tools/manual.mjs
// is the CLI and keeps the state files.

import { parseJsonText } from "./llm/index.mjs";
import { validate } from "../../engine/index.js";
import {
  storyOutlineSystem, storySceneSystem, outlineRequest, outlineRepairRequest, sceneRequest, sceneRepairRequest,
  extendRequest, assembleStory, normalizeScene, checkOutline, MIN_LENGTH,
} from "./story_prompts.mjs";
import { checkSceneInContext, sceneSeconds } from "./story_pipeline.mjs";
import { scoreStory } from "./story_score.mjs";
import { leanOutlinePrompt, leanScenePrompt, leanFixPrompt, leanExtendPrompt, packVersionWarning } from "./lean_prompts.mjs";

const REPLY_RULE = "Reply with only the JSON object in a single ```json code block. No explanation before or after it.";
const join = (system, request) => `${system.trim()}\n\n---\n\n# Your task\n\n${request.trim()}\n\n${REPLY_RULE}\n`;
const parse = (text) => {
  try {
    return { json: parseJsonText(text) };
  } catch (e) {
    return { error: `No JSON object found in the reply (${e.message}).`, fixPrompt: `Your reply did not contain a JSON object I could read. ${REPLY_RULE} Send it again.\n` };
  }
};
const widths = (outline) => Object.fromEntries((outline.locations || []).map((l) => [l.id, l.stageWidth ?? 3200]));

// opts.lean (the pack version) switches every prompt to its lean form for chat projects with the catalog pack.
const leanFix = (r, opts, text) => {
  if (!opts.lean) return r;
  const versionWarning = packVersionWarning(text, opts.lean);
  return { ...r, ...(r.fixPrompt ? { fixPrompt: leanFixPrompt(opts.lean, r.fixPrompt) } : {}), ...(versionWarning ? { versionWarning } : {}) };
};

/** opts: { kind, minLength, format, audience, seed, lean } */
export function manualOutlinePrompt(catalog, premise, opts) {
  if (opts.lean) return leanOutlinePrompt(opts.lean, premise, opts);
  return join(storyOutlineSystem(catalog, opts), outlineRequest(premise, opts));
}

/** @returns {{ ok, outline?, issues?, fixPrompt?, message }} */
export function checkOutlineReply(text, catalog, opts) {
  return leanFix(checkOutlineFull(text, catalog, opts), opts, text);
}

function checkOutlineFull(text, catalog, opts) {
  const p = parse(text);
  if (p.error) return { ok: false, message: p.error, fixPrompt: p.fixPrompt };
  const issues = checkOutline(p.json, catalog, opts);
  if (issues.length) return { ok: false, outline: p.json, issues, message: `${issues.length} problem(s).`, fixPrompt: `${outlineRepairRequest(issues).trim()}\n\n${REPLY_RULE}\n` };
  const total = p.json.scenes.reduce((n, s) => n + s.seconds, 0);
  return { ok: true, outline: p.json, message: `Outline OK: ${p.json.scenes.length} scenes, about ${Math.round(total)} s.` };
}

/** The prompt for scene i, given the scenes saved so far (0..i-1). Throws if earlier scenes are missing or invalid. */
export function manualScenePrompt(catalog, outline, scenes, i, opts) {
  let endState = null;
  if (i > 0) {
    if (scenes.length < i || scenes.slice(0, i).some((s) => !s)) throw new Error(`scenes 1-${i} must be checked first`);
    const r = validate(assembleStory(outline, scenes.slice(0, i), opts), catalog);
    if (!r.ok) throw new Error(`the saved scenes 1-${i} no longer validate: ${r.errors[0]?.code}`);
    endState = r.endState;
  }
  if (opts.lean) return leanScenePrompt(opts.lean, outline, i, { endState, stageWidths: widths(outline), audience: opts.audience });
  return join(storySceneSystem(catalog, opts), sceneRequest(outline, i, { endState, stageWidths: widths(outline) }));
}

/** @returns {{ ok, scene?, result?, fixPrompt?, message }} */
export function checkSceneReply(text, outline, scenes, i, catalog, opts) {
  return leanFix(checkSceneFull(text, outline, scenes, i, catalog, opts), opts, text);
}

function checkSceneFull(text, outline, scenes, i, catalog, opts) {
  const p = parse(text);
  if (p.error) return { ok: false, message: p.error, fixPrompt: p.fixPrompt };
  const scene = normalizeScene(p.json, outline.scenes[i]);
  const c = checkSceneInContext(outline, [...scenes.slice(0, i), scene], i, catalog, opts);
  if (!c.ok) {
    const tail = (c.result.timeline || "").split("\n").slice(-120).join("\n");
    return { ok: false, scene, result: c.result, message: `${c.issues.length} error(s).`, fixPrompt: `${sceneRepairRequest(c.issues, tail).trim()}\n\n${REPLY_RULE}\n` };
  }
  const secs = sceneSeconds(c.result, { scenes: [outline.scenes[i]] })[0]?.seconds ?? 0;
  return { ok: true, scene, result: c.result, message: `Scene ${outline.scenes[i].id} OK: ${secs.toFixed(0)} s (target ${outline.scenes[i].seconds} s), ${c.result.warnings.length} warning(s).` };
}

/** The prompt asking scene i's chat to lengthen it (lean: the pack version, for a chat project). */
export function manualExtendPrompt(seconds, target, lean = null) {
  if (lean) return leanExtendPrompt(lean, seconds, target);
  return `${extendRequest(seconds, target)}\n\n${REPLY_RULE}\n`;
}

/**
 * Assemble every saved scene, validate and score.
 * @returns {{ ok, script, result, score?, short, sceneSeconds, message }}
 */
export function assembleManual(outline, scenes, catalog, opts) {
  const script = assembleStory(outline, scenes, opts);
  const result = validate(script, catalog);
  if (!result.ok) return { ok: false, script, result, short: false, message: `${result.errors.length} error(s): ${[...new Set(result.errors.map((e) => e.code))].join(", ")}` };
  const min = opts.minLength ?? MIN_LENGTH[opts.kind ?? "story"];
  const ev = scoreStory(script, outline, catalog, { minLength: min });
  const secs = sceneSeconds(result, outline);
  const short = result.durationSec < min;
  return { ok: true, script, result, score: ev, short, sceneSeconds: secs, message: `Story OK: ${result.durationSec.toFixed(0)} s (minimum ${min} s), score ${ev.score}/100, ${result.warnings.length} warning(s).` };
}
