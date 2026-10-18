// Lean copy-paste prompts (CATALOG_SPEC 7.3): for a chat project that has the catalog pack as project
// knowledge (catalog/generated/context/). They carry no catalog tables or examples: one line naming the
// pack and its version, the files to read, a few reminders, and the same task text as the full prompts.
// Pure functions; tools/manual.mjs reads the version from catalog/manifest.json.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { writeRequest } from "./prompt_pack.mjs";
import { outlineRequest, sceneRequest, extendRequest, KIND_RULES, MIN_LENGTH } from "./story_prompts.mjs";
import { CATALOG_DIR } from "./catalog_files.mjs";

export const REPLY_RULE = "Reply with only the JSON object in a single ```json code block. No explanation before or after it.";

/** The catalog version stamp of the committed pack (catalog/manifest.json). */
export function packVersion(root = CATALOG_DIR) {
  return JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")).version;
}

/** The first line of every lean prompt. */
export const leanHeader = (version, files) =>
  `Use the Stickman catalog files attached to this project (catalog version ${version}).${files ? ` For this task read ${files}.` : ""}`;

const lean = (version, files, notes, request) =>
  [leanHeader(version, files), "# Your task", request.trim(), notes.length ? `Remember:\n${notes.map((n) => `- ${n}`).join("\n")}` : "", REPLY_RULE].filter(Boolean).join("\n\n") + "\n";

const audienceNote = (audience) => (audience === "general"
  ? "Audience: general (06_story_tools.md, audience rules)."
  : "Audience: kids (06_story_tools.md, audience rules): no ghost defeats, a vanished friend comes back with return, short simple words.");

/** A version 1 clip from a premise (the full prompt's task text). */
export function leanWritePrompt(version, premise, opts) {
  return lean(version, "01_script_format.md (version 1), 03_moves.md, 04_effects_and_sound.md, 05_places_and_objects.md and 07_rules_and_codes.md", [
    "A version 1 clip: characters, camera, beats. The first camera key is at 0.",
    "Every attack with a target has \"approach\": \"run\" and an outcome; end with a KO or a victory, then a world fade.",
    "Run the checklist in 07_rules_and_codes.md before you answer.",
  ], writeRequest(premise, opts));
}

/** A story or fight-video outline (stage 1). opts: { kind, minLength, format, audience } */
export function leanOutlinePrompt(version, premise, opts = {}) {
  const kind = opts.kind ?? "story";
  return lean(version, "01_script_format.md (the outline), 02_characters.md, 05_places_and_objects.md and 06_story_tools.md", [
    KIND_RULES[kind],
    audienceNote(opts.audience),
    `The scenes' seconds add up to at least ${opts.minLength ?? MIN_LENGTH[kind]} s. Characters' colors stand out on their themes (\"hard to see on\" in 02_characters.md).`,
  ], outlineRequest(premise, opts));
}

/** One scene (stage 2): the same request as the full scene prompt, with the end state of the scenes before. */
export function leanScenePrompt(version, outline, i, { endState = null, stageWidths = {}, audience = "kids" } = {}) {
  return lean(version, "01, 03, 06, 07 and the scenes in 08", [
    "Prefer macros; arrivals go in the scene cast with \"hidden\": true; attacks need \"approach\": \"run\".",
    audience === "general" ? "Audience: general." : "Audience: kids (06): no ghost; a vanished friend comes back with return.",
  ], sceneRequest(outline, i, { endState, stageWidths }));
}

/** A fix prompt for the same chat: the full fix text with the pack line in front. */
export const leanFixPrompt = (version, fixPrompt) => `${leanHeader(version, "07_rules_and_codes.md for the codes")}\n\n${fixPrompt.trim()}\n`;

/** Ask a scene's chat to make the scene longer. */
export const leanExtendPrompt = (version, seconds, target) => `${leanHeader(version)}\n\n${extendRequest(seconds, target)}\n\n${REPLY_RULE}\n`;

/**
 * The catalog version a reply says it was written against, when it says so ("catalog version 1-abc...").
 * @returns {string | null} a warning when it differs from the current pack
 */
export function packVersionWarning(text, version) {
  const m = String(text).match(/catalog version\s+(\d+-[0-9a-f]{10})/i);
  if (!m || m[1] === version) return null;
  return `The reply was written against catalog version ${m[1]}, but the current pack is ${version}: upload catalog/generated/context/ to the project again (npm run catalog:pack).`;
}
