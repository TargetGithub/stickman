// Prompt pack (spec 18.2): assembles the static system prompts from prompts/*.md, the catalog tables
// and the example scripts, and builds the per-request user messages. System prompts are byte-stable
// for a given catalog so prompt caching hits across requests.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogMarkdown, catalogData } from "./prompt_tables.mjs";

export const PROMPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../prompts");
const read = (name) => readFileSync(join(PROMPTS_DIR, name), "utf8");
const fill = (text, vars) => text.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

/** Example scripts shipped with the prompt pack, sorted by file name. */
export function exampleScripts() {
  const dir = join(PROMPTS_DIR, "examples");
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => ({ name: f, text: readFileSync(join(dir, f), "utf8").trim() }));
}

export function writerSystem(catalog) {
  const examples = exampleScripts().map((e) => `${e.name}:\n\`\`\`json\n${e.text}\n\`\`\``).join("\n\n");
  return fill(read("system.md"), { CATALOG: catalogMarkdown(catalog), EXAMPLES: examples });
}

export function ideationSystem(catalog) {
  const d = catalogData(catalog);
  const byCat = {};
  for (const m of d.moves) (byCat[m.category] ??= []).push(m.name);
  return fill(read("ideation.md"), {
    PROPS: d.props.map((p) => p.name).join(", "),
    MOVES: Object.entries(byCat).map(([c, names]) => `${c}: ${names.join(", ")}`).join("; "),
    THEMES: d.themes.join(", "),
  });
}

export const critiqueSystem = () => read("critique.md");
export const metadataSystem = () => read("metadata.md");

const avoidText = (avoid) => {
  const lines = [];
  if (avoid.premises?.length) lines.push(`Avoid repeating these recent videos:\n${avoid.premises.map((p) => `- ${p}`).join("\n")}`);
  if (avoid.themes?.length) lines.push(`These themes were used a lot recently; prefer others: ${avoid.themes.join(", ")}.`);
  if (avoid.palettes?.length) lines.push(`Recent color palettes (pick different ones): ${avoid.palettes.join("; ")}.`);
  return lines.join("\n\n");
};

/** User message for ideation. */
export function ideationRequest({ count, tone, format, length }, avoid) {
  return [
    `Pitch ${count} premise${count === 1 ? "" : "s"}.`,
    `Tone: ${tone || "any mix of epic, comedic and parody"}. Format: ${format}. Target length: about ${length} s each.`,
    avoidText(avoid),
  ].filter(Boolean).join("\n\n");
}

/** User message for writing one script from a premise. */
export function writeRequest(premise, { format, length, seed }) {
  return [
    "Write the script for this premise:",
    JSON.stringify(premise, null, 2),
    `Format: ${format}. Target length: about ${length} s (story time; slowmo adds a little). Use meta.seed ${seed}.`,
    "Return the full JSON script.",
  ].join("\n\n");
}

/** User message asking for a fix after validation failed. */
export function repairRequest(result) {
  const issues = [...result.errors, ...result.warnings].map((i) => `${i.code.startsWith("W_") ? "warning" : "error"} ${i.code} at ${i.path || "(root)"}: ${i.message}${i.fix ? `\n    fix: ${i.fix}` : ""}`).join("\n");
  return fill(read("repair.md"), { ISSUES: issues || "(none)", TIMELINE: result.timeline || "(the script did not get far enough to simulate)" });
}

/** User message when the response could not be used at all (no JSON, cut off). */
export const unusableRequest = (why) => `Your previous response could not be used: ${why}. Return the full script as one JSON object, nothing else.`;

/** User message asking to improve a valid but low-scoring script. */
export function improveRequest(feedback) {
  return `The script is valid but scored low on the automatic quality check:\n${feedback.map((f) => `- ${f}`).join("\n")}\n\nImprove it along these lines, keep the premise, and return the full JSON script.`;
}

/** User message asking for a revision driven by the vision critique. */
export function reviseRequest(notes) {
  return `A reviewer watched a render of this script and suggested:\n${notes.map((n) => `- ${n}`).join("\n")}\n\nApply the changes that make sense, keep what works, and return the full JSON script.`;
}

export function metadataRequest(script, premise, timeline) {
  return `Video title in the script: ${script.meta.title}\nPremise: ${premise.logline}\nFormat: ${script.meta.format}\n\nTimeline:\n${timeline}`;
}
