// Showcase sections (CATALOG_SPEC 8): the generated catalog (catalog/generated/catalog.json) and the engine
// vocabulary turned into cards. Nothing is hard-coded: every entry in the catalog becomes a card, so a new
// move, theme or preset shows up with no page change. Pure; web/showcase.js renders the cards.
//
// Card: { id, name, description, tags, meta?, copy, script?(look) → v2 story, audio? (url) }

import { worldCommandStory, macroStory, cameraStory, transitionStory } from "../../tools/lib/catalog_harness.mjs";
import { moveScript, fxScript, hitsScript, characterScript, faceScript, placeScript, objectScript, activityScript } from "./showcase_scripts.js";

/** The sections in page order (the navigation lists them). */
export const SECTION_IDS = ["characters", "looks", "faces", "moves", "effects", "sounds", "places", "objects", "activities", "macros", "camera", "music", "examples", "rules"];

const kv = (o) => Object.entries(o || {}).map(([k, v]) => `${k} ${typeof v === "object" ? JSON.stringify(v) : v}`).join(", ");
const height = (b) => Math.round(b.dims.headR * 2 + b.dims.neck + b.dims.torso + b.dims.thigh + b.dims.shin);
const card = (o) => ({ tags: [], ...o });

function characters(full) {
  const c = full.catalog;
  const bodies = Object.entries(c.bodies).map(([name, b]) => card({
    id: `body-${name}`, name, description: b.description, tags: b.tags, group: "Body plans",
    meta: `${height(b)} px tall${b.appearance ? ` · default look: ${kv(b.appearance)}` : ""}`,
    copy: { body: name }, script: (look) => characterScript({ ...look, body: name }),
  }));
  const presets = full.presets.map((p) => card({
    id: p.id, name: `${p.name} (${p.id})`, description: p.description, tags: [p.role, ...p.tags], group: "Characters",
    meta: `${p.role} · ${p.cast.body || "stickman"} · good on: ${p.goodThemes.join(", ")}`,
    copy: { id: p.id, name: p.name, ...p.cast }, script: () => characterScript({ body: p.cast.body || "stickman", color: p.cast.color }, p.cast),
  }));
  return { title: "Characters", intro: "Body plans (cast `body`) and ready-made characters (presets): copy a cast entry and change it.", cards: [...bodies, ...presets] };
}

function looks(full) {
  const cards = [];
  const appearance = full.catalog.appearance;
  const lists = ["eyes", "brows", "mouthStyle", "hair", "outfit", "accessories"];
  // Option descriptions live in the docs export of the appearance file (the engine sees names only).
  const described = full.appearance || {};
  for (const k of lists) {
    for (const name of appearance[k]) {
      const look = k === "accessories" ? { accessories: { [name]: "#d23c3c" } } : { [k]: name, ...(k === "hair" && name !== "none" ? { hairColor: "#3a2a1a" } : {}), ...(k === "outfit" && name !== "none" ? { outfitColor: "#2f7fd9" } : {}) };
      cards.push(card({ id: `${k}-${name}`, name: `${k}: ${name}`, description: described[k]?.[name] || `${k} option ${name}`, tags: [k], group: k,
        copy: { appearance: look }, script: (l) => characterScript(l, { appearance: look }) }));
    }
  }
  return { title: "Looks", intro: `Appearance options (cast \`appearance\`). Not together: ${appearance.conflicts.map((x) => x.join(" + ")).join(", ")}.`, cards };
}

function faces(full) {
  return { title: "Faces", intro: "Faces for `face` on a beat, a scene cast entry or a dialogue line.",
    cards: Object.entries(full.catalog.faces).map(([name, f]) => card({ id: name, name, description: f.description, tags: f.tags, copy: { face: name }, crop: 560, script: (look) => faceScript(look, name) })) };
}

function moves(full) {
  const c = full.catalog;
  const cards = c.moves.filter((m) => !m.flags?.partner).map((m) => card({
    id: m.name, name: m.name, description: m.description, tags: m.tags, group: m.category,
    meta: [`${m.category}`, `${m.duration} s`, m.params && Object.keys(m.params).length ? kv(m.params) : null, m.needsProp ? `needs ${m.needsProp}` : null, m.pair ? `paired with ${m.pair.partnerMove}` : null].filter(Boolean).join(" · "),
    copy: { who: "kai", do: m.name, ...(m.category === "attack" ? { target: "vex", outcome: "hit", approach: "run" } : {}), ...(m.pair ? { partner: "pip" } : {}) },
    script: (look) => moveScript(c, m, look),
  }));
  return { title: "Moves", intro: "Every move (a character beat's `do`), playing on the chosen body plan. Attacks hit a partner; paired moves play with one.", cards };
}

function effects(full, vocab) {
  const c = full.catalog;
  const docs = full.docs.world_commands;
  const beat = c.fxNames.filter((n) => c.fxPresets[n].anchor !== "point" || c.fxPresets[n].trail).map((n) => card({
    id: n, name: n, description: c.fxPresets[n].description, tags: c.fxPresets[n].tags, group: "Beat fx",
    meta: `on the ${c.fxPresets[n].trail ? "move (trail)" : { head: "head", hip: "body", feet: "feet" }[c.fxPresets[n].anchor]}`,
    copy: { fx: [n] }, script: (look) => fxScript(c, n, look) }));
  const auto = c.fxNames.filter((n) => c.fxPresets[n].anchor === "point" && !c.fxPresets[n].trail).map((n) => card({
    id: n, name: n, description: c.fxPresets[n].description, tags: c.fxPresets[n].tags, group: "Automatic",
    meta: "spawned by hits, explosions and props", copy: n, script: (look) => hitsScript(look) }));
  const words = Object.keys(c.fxPresets).filter((n) => c.fxPresets[n].internal);
  auto.push(card({ id: "impact_words", name: "impact words", description: `Kids audience: comic words (${words.map((w) => w.replace("pop_", "").toUpperCase()).join(", ")}) pop over hits by themselves.`,
    tags: ["kids", "hit"], group: "Automatic", copy: { meta: { audience: "kids" } }, script: (look) => hitsScript(look, "kids") }));
  const fxCommands = ["shake", "slowmo", "freeze", "zoom_punch", "flash", "fade", "desaturate", "text_pop", "caption", "explosion", "cut"].filter((n) => vocab.worldCommands[n]);
  const world = fxCommands.map((n) => card({ id: `world-${n}`, name: n, description: docs[n].description, tags: ["world", "screen"], group: "Screen effects",
    copy: docs[n].example, script: () => worldCommandStory(n, docs[n].example) }));
  return { title: "Effects", intro: "Beat fx (`\"fx\": [...]` on a character beat), effects the engine adds by itself, and screen effects (world beats).", cards: [...beat, ...auto, ...world] };
}

function sounds(full) {
  return { title: "Sounds", intro: "Sound keys play by themselves from moves, hits, objects and cards. Drop your own file named after a key into assets/sfx/ to replace one.",
    cards: full.sfx.map((s) => card({ id: s.name, name: s.name, description: s.description, tags: [s.category], group: s.category, copy: s.name, audio: `../assets/sfx/generated/${s.name}.wav` })) };
}

function places(full) {
  const c = full.catalog;
  const docs = full.docs.world_commands;
  const themes = c.themeNames.map((t) => card({ id: t, name: t, description: c.themes[t].description, tags: c.themes[t].tags, group: "Themes",
    meta: `background ${c.themes[t].characterBg}`, copy: { id: t, theme: t }, script: (look, opts = {}) => placeScript(look, t, opts.time, opts.weather) }));
  const amb = full.ambience.map((a) => card({ id: `ambience-${a.name}`, name: `ambience: ${a.name}`, description: a.description, tags: ["ambience"], group: "Ambience", copy: { ambience: a.name } }));
  const cmds = ["set_theme", "set_time", "set_weather"].map((n) => card({ id: `world-${n}`, name: n, description: docs[n].description, tags: ["world"], group: "World commands", copy: docs[n].example, script: () => worldCommandStory(n, docs[n].example) }));
  return { title: "Places", intro: "Themes for locations (with time of day and weather), ambience beds, and the world commands that change them.", options: { time: ["day", "dawn", "dusk", "night"], weather: ["clear", "cloudy", "rain", "snow", "wind", "fog"] }, cards: [...themes, ...amb, ...cmds] };
}

function objects(full) {
  const c = full.catalog;
  const docs = full.docs.world_commands;
  const objs = Object.entries(c.objects).map(([n, o]) => card({ id: n, name: n, description: o.description, tags: o.tags, group: o.behavior,
    meta: `${o.behavior}${o.states ? ` · states ${o.states.join("/")}` : ""}`, copy: o.behavior === "holdable" ? { prop: n } : { id: n, object: n, x: 1600 }, script: (look) => objectScript(c, n, look) }));
  const props = Object.entries(c.props).map(([n, p]) => card({ id: `prop-${n}`, name: n, description: p.description, tags: p.tags, group: "v1 props", meta: `prop kind ${p.kind}`, copy: { prop: n }, script: (look) => objectScript(c, n, look, true) }));
  const cmds = ["spawn_object", "set_object", "remove_object", "spawn_prop", "prop_break"].map((n) => card({ id: `world-${n}`, name: n, description: docs[n].description, tags: ["world"], group: "World commands", copy: docs[n].example, script: () => worldCommandStory(n, docs[n].example) }));
  return { title: "Objects", intro: "Set pieces, holdables, balls, floaters, vehicles and breakables (location `set`, `spawn_object`), the v1 props, and the commands that move them.", cards: [...objs, ...props, ...cmds] };
}

function activities(full) {
  const c = full.catalog;
  return { title: "Activities", intro: "Little games kept in sync (`@activity`).",
    cards: Object.entries(c.activities).map(([n, a]) => card({ id: n, name: n, description: a.description, tags: a.tags,
      meta: `players ${a.players[0] === a.players[1] ? a.players[0] : a.players.join("-")}${a.objects ? ` · uses ${a.objects.join(", ")}` : ""}`,
      copy: { id: "play", at: 0, macro: "activity", params: { name: n, with: ["kai", "pip"] } }, script: (look) => activityScript(c, n, look) })) };
}

function macros(full, vocab) {
  const docs = full.docs.macros;
  const world = full.docs.world_commands;
  const story = ["narrate", "title_card", "chapter_card", "time_card", "end_card", "shot", "set_music", "music_cue", "set_appearance", "activity"].filter((n) => world[n]);
  return { title: "Story macros", intro: "One macro beat replaces many beats. Each card plays the macro's example.",
    cards: [
      ...Object.entries(docs).map(([n, d]) => card({ id: n, name: `@${n}`, description: d.description, tags: ["macro"], group: "Macros",
        meta: `anchors: ${(vocab.macroAnchors[n] || ["(scene macro)"]).join(", ")}${Object.keys(d.defaults || {}).length ? ` · defaults: ${kv(d.defaults)}` : ""}`,
        copy: d.example, script: () => macroStory(n, d.example) })),
      ...story.map((n) => card({ id: `world-${n}`, name: n, description: world[n].description, tags: ["world", "story"], group: "Story world commands", copy: world[n].example, script: () => worldCommandStory(n, world[n].example) })),
    ] };
}

function camera(full) {
  const cam = full.docs.camera;
  const tr = full.docs.transitions;
  return { title: "Camera and transitions", intro: `${cam.auto} ${tr.rule}`,
    cards: [
      ...Object.entries(cam.modes).map(([n, m]) => card({ id: n, name: n, description: m.description, tags: ["camera"], group: "Camera modes", meta: m.needs.length ? `needs ${m.needs.join(", ")}` : "", copy: m.example, script: () => cameraStory(m.example) })),
      ...Object.entries(tr.types).map(([n, t]) => card({ id: `transition-${n}`, name: n, description: t.description, tags: ["transition"], group: "Transitions", copy: { transitionIn: t.example }, script: () => transitionStory(t.example) })),
      ...Object.entries(tr.cards).map(([n, t]) => card({ id: `card-${n}`, name: `${n} card`, description: t.description, tags: ["card"], group: "Cards", copy: { transitionIn: t.example }, script: () => transitionStory(t.example) })),
    ] };
}

function music(full) {
  return { title: "Music moods", intro: "Scene `music`: `{ \"mood\", \"intensity\": 0-1 }`. The music is generated by the tools; the clips here come from `npm run catalog:media`.",
    cards: Object.entries(full.catalog.musicMoods).map(([n, m]) => card({ id: n, name: n, description: m.description, tags: m.tags,
      meta: `${m.scale} · ${m.tempo.join("-")} bpm`, copy: { music: { mood: n } }, audio: `../out/catalog_media/moods/${n}.wav` })) };
}

function examples(full) {
  return { title: "Examples", intro: "Example clips and stories (catalog/examples). Open one in the player to scrub through it.",
    cards: full.examples.map((e) => card({ id: e.path.replace(/\.json$/, "").replace("/", "-"), name: e.title, description: e.description, tags: e.tags, group: e.kind,
      meta: `${e.kind} · ${e.seconds} s${e.macros.length ? ` · macros: ${e.macros.join(", ")}` : ""}`, copy: e.path, link: `player.html?src=../catalog/examples/${e.path}`, example: e.path })) };
}

function rules(full, vocab) {
  const codes = Object.entries(full.docs.codes).map(([code, d]) => card({ id: code, name: code, description: `${d.meaning}. Fix: ${d.fix}`, tags: [code.startsWith("W_") ? "warning" : "error"], group: code.startsWith("W_") ? "Warnings" : "Errors", copy: code }));
  const lim = [["Clips", vocab.limits.v1], ["Stories", vocab.limits.v2]].map(([n, l]) => card({ id: `limits-${n.toLowerCase()}`, name: `${n}: limits`, description: kv(l), tags: ["limits"], group: "Limits", copy: l }));
  const soft = full.catalog.softWords.map((w) => `${w.word} → ${w.alt} (${w.audiences.join(", ")})`).join("; ");
  const aud = [card({ id: "audience", name: "Audience rules", description: `Kids (the default): defeat styles ${vocab.defeatStylesByAudience.kids.join(", ")}; a vanished friend comes back with return. General adds ${vocab.defeatStylesByAudience.general.filter((s) => !vocab.defeatStylesByAudience.kids.includes(s)).join(", ")}. Softer words: ${soft}.`, tags: ["audience"], group: "Audience", copy: { meta: { audience: "kids" } } })];
  return { title: "Rules", intro: "What the validator checks: every code with its fix, the limits and the audience rules.", cards: [...aud, ...lim, ...codes] };
}

const BUILDERS = { characters, looks, faces, moves, effects, sounds, places, objects, activities, macros, camera, music, examples, rules };

/**
 * @param {object} full   catalog/generated/catalog.json
 * @param {object} vocab  catalog/generated/engine_vocab.json
 * @returns {Array<{ id, title, intro, options?, cards }>}
 */
export function buildSections(full, vocab) {
  return SECTION_IDS.map((id) => ({ id, ...BUILDERS[id](full, vocab) }));
}
