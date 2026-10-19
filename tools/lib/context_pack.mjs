// The AI context pack (CATALOG_SPEC 7): compact Markdown files for chat apps with project files (Claude
// Desktop Projects and the like). Tables over JSON, defaults left out, each fact in one file. Rendered from
// the catalog with the same helpers as the prompts (story_tables.mjs), so the pack and the prompts agree.
// Pure: src is readCatalogDir() plus the build's computed facts (good themes, example lengths).

import { movesFor } from "../../engine/sim.js";
import { WORLD_COMMANDS_V2 } from "../../engine/validator/semantic.js";
import { MACRO_PARAMS, MACRO_ANCHORS } from "../../engine/validator/macro_params.js";
import { V2_ENUMS, DEFEAT_STYLES_BY_AUDIENCE } from "../../engine/validator/v2_names.js";
import { LIMITS, LIMITS_V2 } from "../../engine/config.js";
import { typeOf, worldParamText, colorAdvice, audienceMarkdown } from "./story_tables.mjs";

/** Pack files, their tier and their size budget in bytes (a test allows 25% over). */
export const PACK_FILES = {
  "00_start_here.md": { tier: "core", budget: 3000 },
  "01_script_format.md": { tier: "core", budget: 8000 },
  "02_characters.md": { tier: "core", budget: 6000 },
  "03_moves.md": { tier: "reference", budget: 18000 },
  "04_effects_and_sound.md": { tier: "reference", budget: 4000 },
  "05_places_and_objects.md": { tier: "core", budget: 6000 },
  "06_story_tools.md": { tier: "core", budget: 12000 },
  "07_rules_and_codes.md": { tier: "core", budget: 9000 },
  "08_examples.md": { tier: "reference", budget: 12000 },
};

/** World commands by the pack file that lists them (each in one place); the rest go to 06. */
export const WORLD_GROUPS = {
  fx: ["shake", "slowmo", "freeze", "zoom_punch", "flash", "fade", "desaturate", "text_pop", "caption", "explosion", "cut"],
  places: ["set_theme", "set_time", "set_weather", "spawn_prop", "prop_break", "spawn_object", "remove_object", "set_object"],
};
const storyWorld = () => Object.keys(WORLD_COMMANDS_V2).filter((n) => !WORLD_GROUPS.fx.includes(n) && !WORLD_GROUPS.places.includes(n));

const cell = (v) => String(v).replace(/\|/g, "/").replace(/\n/g, " ");
const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
const doc = (title, ...parts) => `# ${title}\n\n${parts.filter(Boolean).join("\n\n").trim()}\n`;
const names = (list) => list.map((e) => e.name);
const kv = (o) => Object.entries(o || {}).map(([k, v]) => `${k}=${v}`).join(" ");

function worldTable(src, list) {
  const d = src.files["docs/world_commands.json"];
  return table(["do", "params (* required)", "what it does"], list.map((n) => [n, worldParamText(WORLD_COMMANDS_V2[n]), d[n].description]));
}

/** Short behaviour notes for a move (the defaults, such as start/end anchors, are left out). */
function moveNotes(d) {
  const f = d.flags || {};
  const n = [];
  if (d.pair) n.push(`paired: partner plays ${d.pair.partnerMove}`);
  if (f.loop) n.push(d.params.cycles !== undefined ? "loop: cycles" : "loop: distance/cycles/to");
  if (d.category === "interaction" || d.category === "defeat") n.push("story only");
  if (f.defeat) n.push("counts as defeated");
  if (f.airborne) n.push("airborne");
  if (f.ranged) n.push(`ranged ${f.ranged[0]}-${f.ranged[1]}px`);
  if (f.guard) n.push(`${f.guard[2]} window`);
  if (f.invulnerable) n.push("evasive");
  if (f.hold) n.push("holds pose");
  if (d.hits.length > 1) n.push(`${d.hits.length} hits`);
  return n.join(", ");
}

function start(src, version) {
  const tiers = Object.entries(PACK_FILES).map(([f, m]) => [f, m.tier, PACK_ABOUT[f]]);
  return doc("Stickman catalog pack", `Catalog version ${version}. Generated from the engine's catalog; when the version in a task differs, ask for the new pack.`,
    src.texts["docs/start.md"], "## The files", table(["file", "tier", "read it for"], tiers),
    "Core files are enough for most tasks; reference files list every move, effect and example.");
}

const PACK_ABOUT = {
  "00_start_here.md": "this overview",
  "01_script_format.md": "the JSON format of clips and stories, the four `at` forms",
  "02_characters.md": "bodies, looks, faces, voices, ready-made characters",
  "03_moves.md": "every move a character can do",
  "04_effects_and_sound.md": "beat fx, screen effects, sounds",
  "05_places_and_objects.md": "themes, time, weather, ambience, objects, props",
  "06_story_tools.md": "macros, activities, defeat styles, music, camera, transitions, audience rules",
  "07_rules_and_codes.md": "validation rules, every validator code with its fix, the checklist",
  "08_examples.md": "a clip, story scenes of each kind, an outline",
};

function characters(src) {
  const { catalog: c, files } = src;
  const height = (b) => Math.round(b.dims.headR * 2 + b.dims.neck + b.dims.torso + b.dims.thigh + b.dims.shin);
  const look = files["characters/appearance.json"];
  const say = (d) => d.replace(/\.$/, "").replace(/^./, (ch) => ch.toLowerCase());
  const opts = Object.entries(look).filter(([k]) => k !== "conflicts").map(([k, list]) => `- **${k}**: ${list.map((o) => `${o.name} = ${say(o.description)}`).join("; ")}`);
  const faces = Object.entries(c.faces).map(([n, f]) => [n, f.description]);
  const fields = ({ body, color, ...rest }) => (Object.keys(rest).length ? `\`${JSON.stringify(rest)}\`` : "-");
  const hard = (p) => c.themeNames.filter((t) => !(src.facts.goodThemes[p.id] || []).includes(t)).join(", ") || "-";
  const presets = src.presets.filter((p) => !p.series).map((p) => [p.id, p.name, p.role, p.cast.body || "stickman", p.cast.color, fields(p.cast), hard(p)]);
  return doc("Characters",
    "A cast entry: `{ \"id\", \"name\", \"body\", \"color\", \"scale\", \"hp\", \"prop\", \"style\", \"appearance\", \"voice\" }` (01_script_format.md). Only id and color are required.",
    "## Body plans (`body`; default stickman)", table(["body", "height px", "default look", "about"], Object.entries(c.bodies).map(([n, b]) => [n, height(b), kv(b.appearance) || "-", b.description])),
    "## Appearance (`appearance`)", opts.join("\n"),
    "hairColor and outfitColor need hair and outfit; cheeks is a color; belly is a patch color (buddy only); accessories map a name to a color: `{\"cape\": \"#d23c3c\"}`. v1 `style` takes headband, scarf, cape, hat or glow colors.",
    `Not together: ${look.conflicts.map((x) => x.join(" + ")).join(", ")}.`,
    "## Faces (`face` on a beat or a scene cast entry)", table(["face", "look"], faces),
    "## Voices (`voice`)", `pitch 0.5-2, speed 0.7-1.4, timbre: ${files["characters/voices.json"].timbres.map((t) => `${t.name} = ${say(t.description)}`).join("; ")}.`,
    "## Ready-made characters (presets)", "Use them as they are (a cast entry with that id, name, body, color and the other fields) or change them. \"hard to see on\": themes where the color is too close to the background.",
    table(["id", "name", "role", "body", "color", "other cast fields", "hard to see on"], presets),
    ...seriesLines(src.presets),
    `Roles: ${names(files["characters/roles.json"].roles).join(", ")}.`);
}

/** Series presets (a `series` field) take one line per series: ids and roles; the cast fields stay in the catalog. */
function seriesLines(presets) {
  const by = {};
  for (const p of presets.filter((x) => x.series)) (by[p.series] ||= []).push(`${p.id} (${p.role})`);
  return Object.entries(by).map(([s, list]) => `Series \`${s}\` presets (cast fields in catalog/characters/presets/<id>.json): ${list.join(", ")}.`);
}

function moves(src) {
  const about = new Map(src.catalog.moves.map((m) => [m.name, m.description])); // prepared moves drop descriptions
  const rows = [...movesFor(src.catalog).values()].filter((d) => !d.flags.partner).map((d) => [d.name, d.category, d.duration, kv(d.params) || "-", d.needsProp || "-", moveNotes(d) || "-", about.get(d.name)]);
  return doc("Moves",
    "A character beat's `do`. Override any param in the beat's `params`. Anchors: attacks have start, windowOpen, hit, end; every other move start, end. Attacks take `target`, `outcome` (hit, whiff, blocked, parried, dodged) and `\"approach\": \"run\"`. needs: the prop kind the character must hold (any = any prop). Story only: version 2 scripts.",
    table(["move", "category", "s", "params", "needs", "notes", "what it does"], rows));
}

function effects(src) {
  const { catalog: c, files } = src;
  const where = { head: "head", hip: "body", feet: "feet", point: "hit point" };
  const beat = c.fxNames.filter((n) => c.fxPresets[n].anchor !== "point" || c.fxPresets[n].trail).map((n) => [n, c.fxPresets[n].trail ? "trail" : where[c.fxPresets[n].anchor] + (c.fxPresets[n].sustain ? ", lingers" : ""), c.fxPresets[n].description]);
  const auto = c.fxNames.filter((n) => c.fxPresets[n].anchor === "point" && !c.fxPresets[n].trail);
  const pops = Object.keys(c.fxPresets).filter((n) => c.fxPresets[n].internal);
  const cats = {};
  for (const s of files["effects/sfx.json"]) (cats[s.category] ||= []).push(s.name);
  return doc("Effects and sound",
    "## Beat fx (`\"fx\": [...]` on a character beat, at most 6)", table(["fx", "where", "what it shows"], beat),
    `Hit effects come by themselves from hits, explosions and props; do not list them: ${auto.join(", ")}.`,
    `Kids audience: comic impact words (${pops.map((n) => n.replace("pop_", "").toUpperCase()).join(", ")}) pop over hits by themselves; scripts never name them.`,
    "## Screen effects (world beats: `\"who\": \"world\"`)", worldTable(src, WORLD_GROUPS.fx),
    "## Sounds", "Sounds play by themselves from moves, hits, objects and cards; scripts never name them.",
    Object.entries(cats).map(([k, v]) => `- ${k}: ${v.join(", ")}`).join("\n"));
}

function places(src) {
  const { catalog: c, files } = src;
  return doc("Places and objects",
    "## Themes (v1 `meta.theme`; v2 `locations[].theme`)", table(["theme", "background", "good character colors", "about"], c.themeNames.map((t) => [t, c.themes[t].characterBg, colorAdvice(c.themes[t].characterBg), c.themes[t].description])),
    `Time: ${V2_ENUMS.time.join(", ")}. Weather: ${V2_ENUMS.weather.join(", ")} (scene or location \`time\`, \`weather\`).`,
    "## Ambience (location or scene `ambience`)", files["world/ambience.json"].beds.map((b) => `- ${b.name}: ${b.description}`).join("\n"),
    "## Objects (location or scene `set`: `[{ \"id\", \"object\", \"x\", \"state\", \"layer\" }]`, or spawn_object)",
    table(["object", "behavior", "states", "about"], Object.entries(c.objects).map(([n, o]) => [n, o.behavior, (o.states || []).join("/") || "-", o.description])),
    "Behaviors: seat (sit on it with `sit` and `object`), holdable (hold as a prop, give, use), ball and floater (fly, set_object), vehicle (ride, set_object toX or exit), breakable (state broken).",
    "## Props (v1 `characters[].prop`; v2 `cast[].prop` takes props and holdables)", table(["prop", "kind", "about"], Object.entries(c.props).map(([n, p]) => [n, p.kind, p.description])),
    `## Extras (location or scene \`extras\`: \`[{ "count": 1-12, "behavior", "layer": "back" }]\`)\nBehaviors: ${V2_ENUMS.extrasBehavior.join(", ")}. Layers: ${V2_ENUMS.layer.join(", ")}.`,
    "## World commands for places and objects", worldTable(src, WORLD_GROUPS.places));
}

function storyTools(src) {
  const { catalog: c, files } = src;
  const mdoc = files["docs/macros.json"];
  const macroRows = Object.entries(MACRO_PARAMS).map(([n, sch]) => {
    const req = new Set(sch.required || []);
    const params = Object.entries(sch.properties).map(([k, s]) => `${req.has(k) ? `**${k}**` : k}: ${typeOf(s)}`).join("; ");
    return [`@${n}`, params, (MACRO_ANCHORS[n] || []).join(", ") || "-", kv(mdoc[n].defaults) || "-", mdoc[n].description];
  });
  const acts = Object.entries(c.activities).map(([n, a]) => [n, a.players[0] === a.players[1] ? a.players[0] : `${a.players[0]}-${a.players[1]}`, (a.objects || []).join(", ") || "-", a.ending, a.description]);
  const cam = files["docs/camera.json"];
  const tr = files["docs/transitions.json"];
  return doc("Story tools",
    "## Macros (one macro beat replaces many beats; prefer them)",
    "A beat macro is `{ \"id\", \"at\", \"macro\", \"params\" }`; a scene macro (fight_card, montage) is a scene entry `{ \"id\", \"macro\", \"params\" }`. Reference a macro like a beat (`{\"after\": \"fight1\"}`) or by its anchors (`{\"on\": \"fight1.finisher\"}`).",
    table(["macro", "params (bold = required)", "anchors", "defaults", "what you get"], macroRows), "One example of each macro is in 08_examples.md.",
    "## Activities (`@activity` name; `object`: a set piece it can use)", table(["activity", "players", "objects", "ends with", "about"], acts),
    `## Defeat styles (\`@defeat\` style, or as moves)\nkids: ${DEFEAT_STYLES_BY_AUDIENCE.kids.join(", ")}; general: ${DEFEAT_STYLES_BY_AUDIENCE.general.join(", ")}. See the defeat moves in 03_moves.md.`,
    "## Music moods (scene `music`: `{ \"mood\", \"intensity\": 0-1 }`)", table(["mood", "feel"], Object.entries(c.musicMoods).map(([n, m]) => [n, m.description])),
    "## Camera (scene `camera` keys, or `shot` world beats)", table(["mode", "needs", "what it frames"], Object.entries(cam.modes).map(([n, m]) => [n, m.needs.join(", ") || "-", m.description])), cam.auto,
    "## Transitions and cards (scene `transitionIn` / `transitionOut`)", table(["type", "what it does"], Object.entries(tr.types).map(([n, t]) => [n, t.description])),
    table(["card kind", "use"], Object.entries(tr.cards).map(([n, t]) => [n, t.description])), tr.rule,
    "## Story world commands", worldTable(src, storyWorld()),
    "## Audience rules", audienceMarkdown(c, "kids"), audienceMarkdown(c, "general"));
}

function rules(src) {
  const codes = Object.entries(src.files["docs/codes.json"]).map(([k, v]) => `- ${k}: ${v.meaning} → ${v.fix}`).join("\n");
  const lim = `Clips: up to ${LIMITS.characters} characters, ${LIMITS.beats} beats, ${LIMITS.minDuration}-${LIMITS.maxDuration} s. Stories: up to ${LIMITS_V2.cast} in the cast, ${LIMITS_V2.onStage} on stage, ${LIMITS_V2.scenes} scenes, ${LIMITS_V2.locations} locations, ${LIMITS_V2.extras} extras, ${LIMITS_V2.beatsPerScene} beats a scene, scenes up to ${LIMITS_V2.sceneMax} s, at most ${LIMITS_V2.maxDuration} s in all.`;
  return doc("Rules and codes", src.texts["docs/rules.md"], "## Limits", lim, "## Validator codes", codes);
}

/** The pack's examples: one clip, one outline, five scenes (examples/index.json `pack`). */
function examples(src) {
  const ix = src.files["examples/index.json"];
  const info = (p) => ix.examples.find((e) => e.path === p);
  const clip = src.examples[ix.pack.clip];
  const outline = src.examples[ix.pack.outline].outline;
  const scenes = ix.pack.scenes.map((s) => [`### ${s.kind}: scene ${s.scene} of "${info(s.story).title}"`, `Shows ${s.shows}.`, `\`\`\`json\n${JSON.stringify(src.examples[s.story].story.scenes.find((x) => x.id === s.scene))}\n\`\`\``].join("\n"));
  const macros = Object.entries(src.files["docs/macros.json"]).map(([n, d]) => {
    const { id, at, ...rest } = d.example; // the id and time are placeholders
    return `- @${n}: \`${JSON.stringify(rest)}\``;
  }).join("\n");
  return doc("Examples",
    "## One of each macro (add an \"id\" and an \"at\" to beat macros)", macros,
    `## A clip: "${info(ix.pack.clip).title}"`, `${info(ix.pack.clip).description}`, `\`\`\`json\n${JSON.stringify(clip)}\n\`\`\``,
    `## An outline: "${outline.title}"`, `\`\`\`json\n${JSON.stringify(outline)}\n\`\`\``,
    "## Scenes (each is one reply in the scene stage)", ...scenes);
}

/**
 * @param {object} src  readCatalogDir() result with `texts` (docs/*.md) and `facts` ({ goodThemes })
 * @param {string} version  the catalog version stamp
 * @returns {Record<string, string>} pack file → Markdown
 */
export function buildPack(src, version) {
  const files = {
    "00_start_here.md": start(src, version),
    "01_script_format.md": doc("Script format", src.texts["docs/format.md"]),
    "02_characters.md": characters(src),
    "03_moves.md": moves(src),
    "04_effects_and_sound.md": effects(src),
    "05_places_and_objects.md": places(src),
    "06_story_tools.md": storyTools(src),
    "07_rules_and_codes.md": rules(src),
    "08_examples.md": examples(src),
  };
  files["project_instructions.md"] = `${src.texts["docs/project_instructions.md"].trim()}\n\nCatalog version ${version}.\n`;
  return files;
}
