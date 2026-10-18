// Catalog tables for the story prompts (STORY_SPEC 18, S8.1), generated from the catalog and the validator
// tables so the prompts never drift from the data. Deterministic output (stable order) so prompts cache.

import { movesFor } from "../../engine/sim.js";
import { WORLD_COMMANDS_V2 } from "../../engine/validator/semantic.js";
import { MACRO_PARAMS, MACRO_ANCHORS } from "../../engine/validator/macro_params.js";
import { DEFEAT_STYLES_BY_AUDIENCE, V2_ENUMS } from "../../engine/validator/v2_names.js";

const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

/** What each macro does, in one line (STORY_SPEC 11.4). */
const MACRO_HELP = {
  dialogue: "Characters talk in turn with talk gestures, reading-time pacing, faces and a two-shot. lines: [[who, text<=120, face?, bubble?], ...]",
  activity: "A little game kept in sync (see Activities): the players walk to their places, play, and finish with the ending.",
  walk_together: "Hand in hand (two walkers) or side by side to `to`.",
  travel: "A long walk/run/sneak to `to` with the camera tracking the first walker.",
  enter: "Walks (or runs) in from `side` to `to` (default: its scene x). Place the character in the scene cast with \"hidden\": true.",
  exit: "Walks (or runs) off toward `side` and fades out.",
  fight: "A whole 1v1: opening taunts, exchanges weighted to the winner, a slowmo finisher, the KO (ko: false leaves the loser standing and dizzy, e.g. before @defeat captured).",
  gauntlet: "The hero takes on each opponent in turn (travel run/walk between them, or none: they wait in a ring). Place opponents along the stage in order.",
  brawl: "Two teams; at most two clashes at once; the losing team goes down one by one.",
  chase: "The runner flees, everyone jumps the obstacles, the lead chaser lunges; caught or gets away.",
  defeat: "A stagger and close-up, then the defeat style; `by` reacts. The victim must be standing (not KO'd).",
  grief: "Kneels by `over`, cries for `dur` seconds, sad music, optional rain.",
  fight_card: "SCENE macro: a fight-only video (title, intro, rounds, breathers, finale, end card) from matchups. Written as a scene entry {id, macro, params}.",
  montage: "SCENE macro: 2-8 short clips with quick cuts and one music bed. Written as a scene entry {id, macro, params}.",
};

/** A param schema as a short type string. */
function typeOf(s) {
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

function worldMarkdown() {
  return table(["do", "params (* required)"], Object.entries(WORLD_COMMANDS_V2).map(([name, spec]) => [name, Object.entries(spec).map(([k, s]) => {
    let t = "";
    if (s.enum) t = s.enum.join("/");
    else if (s.min !== undefined) t = `${s.min}-${s.max}`;
    else if (s.text) t = `text<=${s.text}`;
    else if (s.character) t = "id";
    else if (s.characters) t = `[ids <=${s.characters}]`;
    else if (s.theme) t = "theme";
    else if (s.type === "color") t = "#rrggbb";
    return `${k}${s.required ? "*" : ""}${t ? `:${t}` : ""}`;
  }).join(" ") || "-"]));
}

/** Relative luminance below ~0.2 counts as a dark background. */
function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) < 0.2;
}

/** Tables the outline stage needs: bodies, looks, themes, moods, ambience. */
export function outlineCatalogMarkdown(catalog) {
  const bodies = Object.entries(catalog.bodies).map(([n, b]) => [n, b.draw, `${Math.round((b.dims.headR * 2 + b.dims.neck + b.dims.torso + b.dims.thigh + b.dims.shin))} px tall`, b.appearance ? Object.entries(b.appearance).map(([k, v]) => `${k} ${v}`).join(", ") : "-"]);
  const a = catalog.appearance;
  return [
    "### Body plans (cast[].body)",
    table(["body", "drawn as", "height at scale 1", "default look"], bodies),
    "",
    `### Appearance (cast[].appearance): eyes ${a.eyes.join("|")}; brows ${a.brows.join("|")}; mouthStyle ${a.mouthStyle.join("|")}; hair ${a.hair.join("|")} (+ hairColor); outfit ${a.outfit.join("|")} (+ outfitColor); cheeks #rrggbb; accessories {name: "#rrggbb"} from ${a.accessories.join(", ")}. Not together: ${a.conflicts.map((c) => c.join(" + ")).join(", ")}.`,
    `### Voices (cast[].voice): pitch 0.5-2, speed 0.7-1.4, timbre ${V2_ENUMS.timbre.join("|")}`,
    "### Themes (locations[].theme). Character colors must stand out against the background behind the characters:",
    table(["theme", "background", "good character colors"], catalog.themeNames.map((t) => [t, catalog.themes[t].characterBg, isDark(catalog.themes[t].characterBg) ? "bright: light blue, yellow, orange, pink, white" : "strong or dark: red, blue, purple, dark green, black"])),
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

/** Every validator code with what it means (the scene prompt explains all of them; tests keep this complete). */
export const CODE_HELP = {
  E_VERSION: "version is not 1 or 2", E_SCHEMA_TYPE: "wrong JSON type", E_SCHEMA_REQUIRED: "a required field is missing", E_SCHEMA_UNKNOWN_FIELD: "a field that does not exist",
  E_SCHEMA_ENUM: "a value not in the allowed list", E_SCHEMA_RANGE: "a number out of range or a character placed off the stage", E_SCHEMA_PATTERN: "an id or color in the wrong form",
  E_SCHEMA_FORM: "an \"at\" or \"to\" in the wrong form", E_SCHEMA_SIZE: "too many items or the script is too big", E_TEXT_LENGTH: "text too long",
  E_CAST_UNKNOWN: "an id that is not in cast", E_CAST_ABSENT: "a character used in a scene it is not placed in", E_BODY_UNKNOWN: "unknown body plan", E_APPEARANCE: "unknown appearance option, or two things in the same place",
  E_FACE_UNKNOWN: "unknown face", E_LOCATION_UNKNOWN: "a scene location that is neither a location id nor a theme", E_THEME_UNKNOWN: "unknown theme",
  E_OBJECT_UNKNOWN: "unknown object kind or object id", E_OBJECT_STATE: "a state or change the object does not have", E_PROP_UNKNOWN: "unknown prop",
  E_PARTNER_MISSING: "a paired move without a partner in the scene", E_PARTNER_SELF: "a character paired with itself",
  E_MACRO_UNKNOWN: "a macro this engine has no builder for", E_MACRO_PARAM: "macro params missing or wrong (a winner who is not fighting, a finisher that is not an attack)",
  E_ACTIVITY_OBJECT: "an activity object that is not in the scene or that the activity cannot use", E_TRANSITION: "a card without text or an iris without a target",
  E_SCENE_EMPTY: "a scene with no beats and no duration", E_DEFEAT_STYLE: "a defeat style the audience does not allow (ghost is general only)",
  E_REF_CHARACTER: "no such character", E_REF_BEAT: "no such beat (or one in another scene)", E_REF_DUPLICATE: "an id used twice (beat ids are unique across the whole story)",
  E_REF_CYCLE: "beats waiting for each other", E_REF_ANCHOR: "an anchor the beat or macro does not have",
  E_MOVE_UNKNOWN: "unknown move", E_MOVE_TARGET: "a character targeting itself", E_MOVE_OUTCOME: "outcome on a non-attack", E_MOVE_APPROACH: "approach on a non-attack",
  E_MOVE_PARAM: "a param the move does not take (or \"to\" on a move that does not walk)", E_MOVE_NEEDS_PROP: "a move needing a prop the character does not hold",
  E_WORLD_UNKNOWN: "unknown world command", E_WORLD_PARAM: "a world command param missing or wrong", E_WORLD_FIELD: "target/outcome/approach/say on a world beat",
  E_FX_UNKNOWN: "unknown fx", E_CAMERA_START: "the first camera key is not at 0", E_CAMERA_FIELD: "a camera mode missing its target(s), from or x",
  E_TEXT_GLYPH: "characters the fonts cannot draw", E_TEXT_BLOCKED: "a blocked word",
  E_SIM_UNREACHABLE: "an attack too far from its target (use approach run)", E_SIM_APPROACH: "an approach over 3 s (start closer)", E_SIM_DEAD_ACTOR: "a knocked-out character acting",
  E_SIM_UNRESOLVED: "a beat whose anchor never happened", E_SIM_DURATION: "the video too short or too long", E_SIM_PARTNER_UNREACHABLE: "a partner too far to walk to",
  E_SIM_OBJECT_OFFSTAGE: "a ball or vehicle leaving the stage", E_SIM_SCENE_LENGTH: "a scene over 300 s",
  W_ATTACK_NO_TARGET: "an attack without a target", W_CONTRAST: "a color hard to see on the background", W_QUEUE_DRIFT: "a beat started late because its character was busy",
  W_PACING_GAP: "over 2.5 s with nothing happening", W_NO_IMPACT: "no hit lands", W_PACING_MONOTONE: "more than 8 attacks in a row", W_NO_ENDING: "no clear ending",
  W_HEAVY_NO_EMPHASIS: "a heavy hit without emphasis", W_REACH: "sizes too different for the hit", W_NO_PROP: "nothing to pick up or give", W_HIDDEN: "a hidden character acting",
  W_PARTICLE_BUDGET: "too many effects at once", W_DIALOGUE_FAST: "a line too short to read, or talking over itself", W_TEXT_SOFT: "a strong word for the audience",
  W_KIDS_NO_HOPE: "kids: someone vanishes and never returns", W_STORY_SHORT: "a story under 300 s", W_FIGHT_SHORT: "a fight video under 180 s",
  W_SCENE_STATIC: "over 4 s of a scene where nothing moves", W_CAST_UNUSED: "a cast member no scene places",
};

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
