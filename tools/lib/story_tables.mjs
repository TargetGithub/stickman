// Catalog tables for the story prompts (STORY_SPEC 18, S8.1), generated from the catalog (catalog/, with the
// descriptions in catalog/docs) and the validator tables so the prompts never drift from the data.
// Deterministic output (stable order) so prompts cache. The context pack (context_pack.mjs) reuses them.

import { movesFor } from "../../engine/sim.js";
import { WORLD_COMMANDS_V2 } from "../../engine/validator/semantic.js";
import { MACRO_PARAMS, MACRO_ANCHORS } from "../../engine/validator/macro_params.js";
import { DEFEAT_STYLES_BY_AUDIENCE, V2_ENUMS } from "../../engine/validator/v2_names.js";
import { catalogDocs } from "./catalog_files.mjs";

const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

/** What each macro does, in one line (STORY_SPEC 11.4): catalog/docs/macros.json. */
const MACRO_HELP = Object.fromEntries(Object.entries(catalogDocs().macros).map(([k, v]) => [k, v.description]));

/** A param schema as a short type string. */
export function typeOf(s) {
  if (!s) return "?";
  if (s.enum) return s.enum.join("/");
  if (s.type === "integer" || s.type === "number") return `${s.type === "integer" ? "int" : "num"} ${s.minimum ?? ""}-${s.maximum ?? ""}`;
  if (s.type === "boolean") return "bool";
  if (s.type === "array") return `[${s.items?.type === "string" || s.items?.pattern ? "ids" : s.items?.type === "array" ? "lines" : "objects"}${s.maxItems ? ` <=${s.maxItems}` : ""}]`;
  if (s.oneOf) return '{"x"} or {"near","gap"} or {"exit"}';
  if (s.type === "object") return `{${Object.keys(s.properties || {}).join(", ")}}`;
  return s.pattern ? "id" : "string";
}

export function macroMarkdown() {
  const rows = Object.entries(MACRO_PARAMS).map(([name, sch]) => {
    const req = new Set(sch.required || []);
    const params = Object.entries(sch.properties).map(([k, s]) => `${req.has(k) ? `**${k}**` : k}: ${typeOf(s)}`).join("; ");
    const anchors = (MACRO_ANCHORS[name] || []).join(", ") || "-";
    return [`@${name}`, params, anchors, MACRO_HELP[name] || ""];
  });
  return table(["macro", "params (bold = required)", "anchors", "what you get"], rows);
}

/** Moves for story scenes: every move, with what it needs. */
export function storyMoveMarkdown(catalog) {
  const rows = [...movesFor(catalog).values()].filter((d) => !d.flags.partner).map((d) => {
    const notes = [];
    if (d.pair) notes.push(`paired: needs "partner" (they play ${d.pair.partnerMove})`);
    if (d.flags.loop) notes.push(d.params.cycles !== undefined ? "loops: params.cycles" : "loops: params.distance or cycles; or \"to\"");
    if (d.needsProp) notes.push(`needs a ${d.needsProp}`);
    if (d.flags.ranged) notes.push("ranged");
    if (d.flags.defeat) notes.push("defeat style: counts as defeated");
    if (d.flags.hold) notes.push("holds the pose");
    if (d.category === "attack") notes.push("needs target, outcome, approach run");
    return [d.name, d.category, d.duration, notes.join("; ") || "-"];
  });
  return table(["move", "category", "s", "notes"], rows);
}

/** A world command's params as one short string (* required). */
export function worldParamText(spec) {
  return Object.entries(spec).map(([k, s]) => {
    let t = "";
    if (s.enum) t = s.enum.join("/");
    else if (s.min !== undefined) t = `${s.min}-${s.max}`;
    else if (s.text) t = `text<=${s.text}`;
    else if (s.character) t = "id";
    else if (s.characters) t = `[ids <=${s.characters}]`;
    else if (s.theme) t = "theme";
    else if (s.type === "color") t = "#rrggbb";
    return `${k}${s.required ? "*" : ""}${t ? `:${t}` : ""}`;
  }).join(" ") || "-";
}

function worldMarkdown() {
  return table(["do", "params (* required)"], Object.entries(WORLD_COMMANDS_V2).map(([name, spec]) => [name, worldParamText(spec)]));
}

/** Relative luminance below ~0.2 counts as a dark background. */
export function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) < 0.2;
}

/** Character colors that read on a background color. */
export const colorAdvice = (bg) => (isDark(bg) ? "bright: light blue, yellow, orange, pink, white" : "strong or dark: red, blue, purple, dark green, black");

/** Tables the outline stage needs: bodies, looks, themes, moods, ambience. */
export function outlineCatalogMarkdown(catalog) {
  const bodies = Object.entries(catalog.bodies).map(([n, b]) => [n, b.draw, `${Math.round((b.dims.headR * 2 + b.dims.neck + b.dims.torso + b.dims.thigh + b.dims.shin))} px tall`, b.appearance ? Object.entries(b.appearance).map(([k, v]) => `${k} ${v}`).join(", ") : "-"]);
  const a = catalog.appearance;
  return [
    "### Body plans (cast[].body)",
    table(["body", "drawn as", "height at scale 1", "default look"], bodies),
    "",
    `### Appearance (cast[].appearance): eyes ${a.eyes.join("|")}; brows ${a.brows.join("|")}; mouthStyle ${a.mouthStyle.join("|")}; hair ${a.hair.join("|")} (+ hairColor); outfit ${a.outfit.join("|")} (+ outfitColor); cheeks #rrggbb; belly #rrggbb (capsule bodies); slots 0-7 (bracelet gems); accessories {name: "#rrggbb"} from ${a.accessories.join(", ")}. Not together: ${a.conflicts.map((c) => c.join(" + ")).join(", ")}.`,
    `### Voices (cast[].voice): pitch 0.5-2, speed 0.7-1.4, timbre ${V2_ENUMS.timbre.join("|")}`,
    "### Themes (locations[].theme). Character colors must stand out against the background behind the characters:",
    table(["theme", "background", "good character colors"], catalog.themeNames.map((t) => [t, catalog.themes[t].characterBg, colorAdvice(catalog.themes[t].characterBg)])),
    `### Music moods (scene music.mood): ${Object.keys(catalog.musicMoods).join(", ")}`,
    `### Ambience (location or scene ambience): ${V2_ENUMS.ambience.join(", ")}`,
    `### Time / weather: ${V2_ENUMS.time.join(", ")} / ${V2_ENUMS.weather.join(", ")}`,
  ].join("\n");
}

/** Tables the scene stage needs. */
export function sceneCatalogMarkdown(catalog) {
  const objects = Object.entries(catalog.objects).map(([n, o]) => [n, o.behavior, o.states ? o.states.join("/") : "-"]);
  const acts = Object.entries(catalog.activities).map(([n, d]) => [n, d.players[0] === d.players[1] ? d.players[0] : `${d.players[0]}-${d.players[1]}`, (d.objects || []).join(", ") || "-"]);
  return [
    "### Macros (preferred: one macro beat replaces many beats)",
    macroMarkdown(),
    "",
    "### Moves (characters' \"do\")",
    storyMoveMarkdown(catalog),
    "",
    "### World commands (\"who\": \"world\")",
    worldMarkdown(),
    "",
    `### Faces ("face" on a beat or a cast placement): ${Object.keys(catalog.faces).join(", ")}`,
    "### Objects (location/scene \"set\": [{id, object, x, state?, layer?}], or spawn_object)",
    table(["object", "behavior", "states"], objects),
    "### Activities (@activity name; object = a set piece it can use)",
    table(["activity", "players", "objects"], acts),
    `### Beat fx: ${catalog.fxNames.join(", ")}`,
    `### Defeat styles: kids ${DEFEAT_STYLES_BY_AUDIENCE.kids.join(", ")}; general ${DEFEAT_STYLES_BY_AUDIENCE.general.join(", ")}`,
    `### Camera modes (scene camera keys, or shot beats): ${V2_ENUMS.cameraMode.join(", ")}`,
  ].join("\n");
}

/** Every validator code with what it means: catalog/docs/codes.json (the scene prompt explains all of them; tests keep this complete). */
/** Codes only workbook scripts get (WORKBOOK_SPEC 10): the workbook prompt and pack file explain them, not the video ones. */
export const isWorkbookCode = (code) => code === "E_KIND" || /^[EW]_WB_/.test(code);

export const CODE_HELP = Object.fromEntries(Object.entries(catalogDocs().codes).filter(([k]) => !isWorkbookCode(k)).map(([k, v]) => [k, v.meaning]));

export const codesMarkdown = () => Object.entries(CODE_HELP).map(([c, m]) => `${c} (${m})`).join("; ");

/** The audience rules (STORY_SPEC 13) for the prompt. */
export function audienceMarkdown(catalog, audience) {
  const soft = (catalog.softWords || []).filter((w) => w.audiences.includes(audience)).map((w) => `"${w.word}" → "${w.alt}"`).join(", ");
  if (audience === "general") return `Audience: general. All defeat styles are allowed, including ghost. Losses may be permanent. Avoid these words (say the alternative): ${soft}.`;
  return [
    "Audience: KIDS (the default). Family friendly and gore free:",
    `- Defeat styles: ${DEFEAT_STYLES_BY_AUDIENCE.kids.join(", ")} (never ghost). The villain ends knocked out, captured or fleeing; never an execution.`,
    "- A loved character's loss is temporary or hopeful: if someone vanishes, a later scene brings them back with \"return\".",
    "- Revenge becomes rescue or justice in the narration (\"Kai set out to save Pip\").",
    "- Swords, bats and staffs are fine in fights; nobody aims a weapon at someone who cannot fight back (a villain's energy blast at a defenseless friend is allowed as the story's incident).",
    "- Short sentences, simple words, and a clear lesson at the end (friendship, courage, kindness).",
    `- Avoid these words (say the alternative): ${soft}.`,
  ].join("\n");
}
