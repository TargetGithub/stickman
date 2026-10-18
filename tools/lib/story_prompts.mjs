// Story prompt pack (STORY_SPEC 18, S8.1): system prompts for the story stages (ideation, outline, scene,
// critique) from prompts/story_*.md and the catalog tables, the per-request messages, and the helpers that
// turn an outline plus scenes into one v2 script. System prompts are byte-stable for a catalog and options,
// so prompt caching hits across the scenes of a story.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PROMPTS_DIR, EXAMPLES_DIR } from "./prompt_pack.mjs";
import { outlineCatalogMarkdown, sceneCatalogMarkdown, codesMarkdown, audienceMarkdown } from "./story_tables.mjs";
import { validate } from "../../engine/index.js";

const read = (name) => readFileSync(join(PROMPTS_DIR, name), "utf8");
const fill = (text, vars) => text.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

/** Minimum length (s) for a kind, as the validator warns (W_STORY_SHORT, W_FIGHT_SHORT). */
export const MIN_LENGTH = { story: 300, fight: 180 };
const SCENE_COUNT = { story: "10-16", fight: "6-10" };
const KIND_RULES = {
  story: "A story has an arc: setup (we meet the friends and come to care about them), an incident (something goes wrong), a journey (obstacles, travel, help along the way), a climax (the big confrontation or challenge) and a resolution (together again, a simple lesson). Mix kinds of scenes: talking, playing, travel, action, feelings; at most half the scenes are fights. The first scene opens with a title card; the last closes with an end card.",
  fight: "A fight video: an intro (the rivalry: taunts and a title card), 3-5 rounds in varied places or against different opponents, each fight a little bigger than the last, breathers between rounds (catching breath, banter, a charge-up, a cheering crowd), a final round against the strongest opponent with a comeback, and a victory with an end card. Fight scenes are about 25-40 s each.",
};

/** Example stories shipped with the prompt pack: [{ name, outline, story }], sorted by file name. */
export function exampleStories() {
  const dir = join(EXAMPLES_DIR, "stories");
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => ({ name: f, ...JSON.parse(readFileSync(join(dir, f), "utf8")) }));
}

const compact = (o) => JSON.stringify(o);

export function storyIdeationSystem(catalog, audience = "kids") {
  return fill(read("story_ideation.md"), { THEMES: catalog.themeNames.join(", "), AUDIENCE: audience === "kids" ? "kids (the default): family friendly, losses are temporary or hopeful" : "general" });
}

export function storyOutlineSystem(catalog, { kind = "story", minLength, audience = "kids" } = {}) {
  const ex = exampleStories().find((e) => e.name.startsWith("rainy")) || exampleStories()[0];
  const holdables = Object.entries(catalog.objects).filter(([, o]) => o.behavior === "holdable").map(([n]) => n);
  return fill(read("story_outline.md"), {
    MIN_LENGTH: String(minLength ?? MIN_LENGTH[kind]),
    KIND: kind === "fight" ? "fight video" : "story",
    SCENE_COUNT: SCENE_COUNT[kind],
    KIND_RULES: KIND_RULES[kind],
    AUDIENCE_RULES: audienceMarkdown(catalog, audience),
    CATALOG: outlineCatalogMarkdown(catalog),
    OBJECTS: Object.entries(catalog.objects).filter(([, o]) => o.behavior !== "holdable").map(([n]) => n).join(", "),
    PROPS: [...Object.keys(catalog.props), ...holdables].join(", "),
    EXAMPLE: "```json\n" + compact(ex.outline) + "\n```",
  });
}

export function storySceneSystem(catalog, { audience = "kids" } = {}) {
  const [arc, slice] = [exampleStories().find((e) => e.name.startsWith("brave")), exampleStories().find((e) => e.name.startsWith("rainy"))];
  const pick = (ex, i) => `From "${ex.outline.title}" (outline scene ${ex.outline.scenes[i].id}: ${ex.outline.scenes[i].summary}):\n\`\`\`json\n${compact(ex.story.scenes[i])}\n\`\`\``;
  const examples = [slice && pick(slice, 0), arc && pick(arc, 2), arc && pick(arc, 3)].filter(Boolean).join("\n\n");
  return fill(read("story_scene.md"), { AUDIENCE_RULES: audienceMarkdown(catalog, audience), CATALOG: sceneCatalogMarkdown(catalog), CODES: codesMarkdown(), EXAMPLES: examples });
}

export const storyCritiqueSystem = () => read("story_critique.md");

/** User message: plan the outline for a premise. */
export function outlineRequest(premise, { kind = "story", minLength, format = "landscape" } = {}) {
  return [
    `Plan the outline of a ${kind === "fight" ? "fight video" : "story"} for this premise:`,
    JSON.stringify(premise, null, 2),
    `Format: ${format}. The scenes' "seconds" must add up to at least ${minLength ?? MIN_LENGTH[kind]} s (aim for about 10% more).`,
    "Return the outline as one JSON object.",
  ].join("\n\n");
}

export function outlineRepairRequest(issues) {
  return `The outline has problems:\n${issues.map((i) => `- ${i}`).join("\n")}\n\nFix them, keep the rest, and return the full outline as one JSON object.`;
}

/** Where everyone stands after the previous scenes (from the dry run's end state). */
function endStateText(endState, outline) {
  if (!endState || !Object.keys(endState).length) return "This is the first scene: everyone starts fresh.";
  const lines = Object.entries(endState).map(([id, s]) => {
    const notes = [`hp ${s.hp}`];
    if (s.defeated) notes.push("DEFEATED (knocked out or vanished): cannot act until \"get_up\" (KO) or \"return\" (vanished/faint)");
    else if (s.hidden) notes.push("not visible (fled, exited or hidden): place with \"hidden\": true and bring in with @enter if needed");
    if (s.prop) notes.push(`holding ${s.prop}`);
    if (s.face && s.face !== "neutral") notes.push(`looked ${s.face}`);
    return `- ${id}: ${notes.join(", ")} (last seen in scene ${s.scene})`;
  });
  const unseen = outline.cast.filter((c) => !endState[c.id]).map((c) => c.id);
  return `State after the previous scenes:\n${lines.join("\n")}${unseen.length ? `\n- not seen yet: ${unseen.join(", ")}` : ""}`;
}

/** User message: write scene i of the outline. */
export function sceneRequest(outline, i, { endState = null, stageWidths = {} } = {}) {
  const s = outline.scenes[i];
  const header = { title: outline.title, logline: outline.logline, cast: outline.cast, locations: outline.locations };
  const all = outline.scenes.map((x, k) => `${k + 1}. ${x.id} (${x.purpose}, ${x.location}, ~${x.seconds} s): ${x.summary}`).join("\n");
  return [
    `Story: ${JSON.stringify(header)}`,
    `All scenes:\n${all}`,
    endStateText(endState, outline),
    `Write scene ${i + 1} of ${outline.scenes.length}: "${s.id}".\n${JSON.stringify(s, null, 2)}`,
    `Stage width at ${s.location}: ${stageWidths[s.location] ?? 3200} px. Target length: about ${s.seconds} s.${i === 0 ? " This is the first scene: open with a title card (transitionIn card, kind title)." : ""}${i === outline.scenes.length - 1 ? " This is the last scene: end with an end_card world beat or a fade transitionOut." : ""} Start every beat id with "${s.id}_".`,
    "Return the scene as one JSON object.",
  ].join("\n\n");
}

/** User message: fix this scene. */
export function sceneRepairRequest(issues, timeline) {
  const text = issues.map((i) => `${i.code.startsWith("W_") ? "warning" : "error"} ${i.code} at ${i.path || "(root)"}: ${i.message}${i.fix ? `\n    fix: ${i.fix}` : ""}`).join("\n");
  return fill(read("story_repair.md"), { ISSUES: text || "(none)", TIMELINE: timeline || "(the story did not get far enough to simulate)" });
}

/** User message: lengthen a scene. */
export function extendRequest(seconds, target) {
  return `The whole story is too short. This scene runs ${seconds.toFixed(0)} s; make it about ${Math.round(target)} s by adding what fits the story (more dialogue lines, a longer activity with "reps" or "dur", a short travel, a reaction, narration). Keep what happens and the beat ids. Return the full scene as one JSON object.`;
}

/** User message: revise a scene after the story critique. */
export function reviseSceneRequest(notes) {
  return `A reviewer watched the story and suggested for this scene:\n${notes.map((n) => `- ${n}`).join("\n")}\n\nApply the changes that make sense, keep what works, and return the full scene as one JSON object.`;
}

export function storyCritiqueRequest(outline, scenes) {
  return `Outline: ${JSON.stringify({ title: outline.title, logline: outline.logline, scenes: outline.scenes.map((s) => ({ id: s.id, purpose: s.purpose, summary: s.summary })) })}\n\nScene lengths: ${scenes.map((s) => `${s.id} ${s.seconds} s`).join(", ")}\n\nReturn {"score": 1-10, "revise": true|false, "notes": ["<scene id>: ...", ...]}.`;
}

// ---- assembling and checking ----

const CAST_FIELDS = ["id", "name", "body", "color", "scale", "hp", "prop", "style", "appearance", "voice"];
const LOC_FIELDS = ["id", "theme", "stageWidth", "time", "weather", "ambience", "set", "extras"];
const only = (o, keys) => Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => keys.includes(k) && v !== undefined && v !== null));

/**
 * One v2 script from an outline and its scenes (written so far).
 * @param {{ seed:number, format?:string, kind?:string, audience?:string }} opts
 */
export function assembleStory(outline, scenes, { seed, format = "landscape", kind = "story", audience = "kids" }) {
  return {
    version: 2,
    meta: { title: String(outline.title || "Untitled").slice(0, 80), format, seed, kind, audience, autoCamera: "story", speakerNames: true, ...(kind === "fight" ? { hpBars: true } : {}) },
    cast: (outline.cast || []).map((c) => only(c, CAST_FIELDS)),
    locations: (outline.locations || []).map((l) => only(l, LOC_FIELDS)),
    scenes,
  };
}

/** Fit a scene reply to its outline entry: its id, and its location when it gave none. */
export function normalizeScene(scene, entry) {
  if (!scene || typeof scene !== "object" || Array.isArray(scene)) return scene;
  const out = { ...scene, id: entry.id };
  if (!out.macro && !out.location) out.location = entry.location;
  return out;
}

const ID = /^[a-z][a-z0-9_]{0,31}$/;

/**
 * Problems with an outline (strings, ready for the repair message). Structural checks here; cast looks,
 * themes, objects and colors through the validator on a skeleton story (scenes with a fixed duration).
 */
export function checkOutline(outline, catalog, { kind = "story", minLength, format = "landscape", audience = "kids" } = {}) {
  const out = [];
  const min = minLength ?? MIN_LENGTH[kind];
  if (!outline || typeof outline !== "object") return ["The reply is not a JSON object."];
  for (const k of ["cast", "locations", "scenes"]) if (!Array.isArray(outline[k]) || !outline[k].length) out.push(`"${k}" must be a non-empty list.`);
  if (out.length) return out;
  const ids = (list, what) => {
    const seen = new Set();
    list.forEach((x, i) => {
      if (!ID.test(String(x?.id))) out.push(`${what}[${i}].id "${x?.id}" must be lowercase letters, digits and _ (start with a letter, max 32).`);
      else if (seen.has(x.id)) out.push(`${what} id "${x.id}" is used twice.`);
      seen.add(x?.id);
    });
    return seen;
  };
  const castIds = ids(outline.cast, "cast");
  const locIds = ids(outline.locations, "locations");
  ids(outline.scenes, "scenes");
  if (outline.cast.length > 16) out.push(`At most 16 cast members (now ${outline.cast.length}).`);
  const moods = Object.keys(catalog.musicMoods || {});
  let total = 0;
  outline.scenes.forEach((s, i) => {
    const p = `scenes[${i}] (${s.id})`;
    if (!locIds.has(s.location) && !catalog.themes[s.location]) out.push(`${p}: location "${s.location}" is not a location id (${[...locIds].join(", ")}).`);
    if (s.mood !== undefined && !moods.includes(s.mood)) out.push(`${p}: mood "${s.mood}" is not one of ${moods.join(", ")}.`);
    if (typeof s.seconds !== "number" || s.seconds < 5 || s.seconds > 300) out.push(`${p}: "seconds" must be a number from 5 to 300.`);
    else total += s.seconds;
    if (!Array.isArray(s.cast) || !s.cast.length) out.push(`${p}: "cast" must list the ids in this scene.`);
    else {
      for (const id of s.cast) if (!castIds.has(id)) out.push(`${p}: "${id}" is not in cast.`);
      if (s.cast.length > 8) out.push(`${p}: at most 8 characters per scene.`);
    }
  });
  if (total < min * 1.05) out.push(`The scenes add up to ${Math.round(total)} s; they need at least ${min} s (aim for ${Math.round(min * 1.1)}). Add scenes or lengthen some.`);
  // About one scene per 40 s (fights: 45 s) at least, so no scene has to drag.
  const fewest = Math.max(2, Math.round(min / (kind === "fight" ? 45 : 40)));
  if (outline.scenes.length < fewest) out.push(`A ${kind} of ${min} s needs at least ${fewest} scenes (${SCENE_COUNT[kind]} is typical); now ${outline.scenes.length}.`);
  const used = new Set(outline.scenes.flatMap((s) => s.cast || []));
  for (const id of castIds) if (!used.has(id)) out.push(`cast member "${id}" is in no scene.`);
  if (out.length) return out;
  // Looks, themes, objects and colors: the validator on a skeleton story.
  const skeleton = assembleStory(outline, outline.scenes.map((s) => {
    const loc = outline.locations.find((l) => l.id === s.location);
    const width = loc?.stageWidth ?? 3200;
    return {
      id: s.id, location: s.location, duration: Math.max(1, Math.min(300, s.seconds)),
      cast: s.cast.map((id, k) => ({ id, x: Math.round(width / 2 - 300 + (600 * k) / Math.max(1, s.cast.length - 1)), facing: k % 2 ? -1 : 1 })),
      beats: [],
    };
  }), { seed: 1, format, kind, audience });
  const r = validate(skeleton, catalog);
  const KEEP = ["W_CONTRAST"];
  for (const i of [...r.errors, ...r.warnings.filter((w) => KEEP.includes(w.code))]) {
    const scene = i.path.match(/^scenes\[(\d+)\]/);
    const where = scene ? `scene ${outline.scenes[+scene[1]]?.id}` : i.path;
    out.push(`${i.code} at ${where}: ${i.message}${i.fix ? ` (${i.fix})` : ""}`);
  }
  return [...new Set(out)];
}
