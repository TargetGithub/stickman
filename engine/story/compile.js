// Story compiler (STORY_SPEC 11, ADR-014). Milestone: S6.
// compile(story, catalog, moves) expands macro beats and scene macros into ordinary beats and scenes.
// It is pure and deterministic: each macro draws from its own stream deriveRng(seed, "compile:" + macroId),
// so editing one macro never changes another's expansion.
//   - Generated beat ids are "<macroId>_<n>" (n from 1); a macro beat without an id gets "<macro><beat index>".
//   - Every compiled beat carries `path` (the authored beat, or the macro beat it came from) and generated
//     beats carry `expandedFrom` (the macro id), so issues point at what the author wrote.
//   - References to a macro ({"after": "boss"}, {"with": "boss"}, {"on": "boss.finisher"}) are rewritten to the
//     beats that carry those anchors.
//   - Scene macros (fight_card, montage) become several scenes, each with `srcPath` "scenes[i]".
// A story without macros compiles to an equal story (plus paths). v1 (legacy) stories are returned unchanged.

import { deriveRng } from "../math.js";
import { parseAt } from "../director.js";
import { BEAT_MACROS } from "./macros/index.js";
import { SCENE_MACROS } from "./macros/scenes.js";
import { STAGE } from "../config.js";

const MAX_ID = 32;

/** A unique id for a macro beat that has none. */
function macroBeatId(b, bi, used) {
  let id = `${b.macro}${bi}`.slice(0, MAX_ID);
  for (let k = 2; used.has(id); k++) id = `${b.macro}${bi}_${k}`.slice(0, MAX_ID);
  used.add(id);
  return id;
}

/** Anchor string "beat.anchor" → an `at` value, keeping the delay. */
function atFor(anchor, delay) {
  const dot = anchor.lastIndexOf(".");
  const ref = anchor.slice(0, dot);
  const name = anchor.slice(dot + 1);
  const d = delay ? { delay } : {};
  if (name === "end") return { after: ref, ...d };
  if (name === "start") return { with: ref, ...d };
  return { on: anchor, ...d };
}

/** Rewrite an `at` that names a macro to the beat carrying the anchor; other values are returned as they are. */
function rewriteAt(at, anchors) {
  const dep = parseAt(at);
  if (!dep || dep.kind === "abs" || !anchors.has(dep.ref)) return at;
  const map = anchors.get(dep.ref);
  const name = dep.kind === "after" ? "end" : dep.kind === "with" ? "start" : dep.anchor;
  const target = map[name];
  return target ? atFor(target, dep.delay) : at; // unknown anchors are reported by the semantic stage
}

/**
 * The builder context for one macro beat. Builders add beats with ctx.add(beat) (the first beat added gets
 * the macro's `at`) and return { anchors: { start, end, ... } } with "beatId.anchor" strings.
 */
function macroContext({ story, scene, catalog, moves, macroId, path, pos, placements, castById, sets }) {
  const beats = [];
  let n = 0;
  const base = macroId.slice(0, MAX_ID - 4);
  const location = (story.locations || []).find((l) => l.id === scene.location);
  return {
    id: macroId,
    rng: deriveRng(story.meta.seed ?? 1, `compile:${macroId}`),
    catalog,
    moves,
    story,
    scene,
    audience: story.meta.audience ?? "kids",
    stageWidth: location?.stageWidth ?? STAGE.width,
    margin: STAGE.margin,
    pos, // id → estimated x at this point of the scene (updated by builders)
    castById,
    beats,
    /** The placement of a character in this scene (mutable: enter places it at the edge, hidden). */
    placement: (id) => placements.get(id),
    present: (id) => placements.has(id),
    /** Add a set piece to this scene (chase obstacles). */
    addSet: (piece) => sets.push(piece),
    /** Add a beat; returns its generated id. */
    add(beat) {
      const id = `${base}_${++n}`;
      beats.push({ id, ...beat, path, expandedFrom: macroId });
      return id;
    },
    /** Add a beat after another beat ends. */
    after(ref, beat, delay = 0) {
      return this.add({ ...beat, at: delay ? { after: ref, delay: round(delay) } : { after: ref } });
    },
    /** Add a beat that starts with another beat. */
    with(ref, beat, delay = 0) {
      return this.add({ ...beat, at: delay ? { with: ref, delay: round(delay) } : { with: ref } });
    },
  };
}

export const round = (v) => Math.round(v * 100) / 100;

/** Seeded choice from a list. */
export function pick(ctx, list) {
  return list[Math.min(list.length - 1, Math.floor(ctx.rng() * list.length))];
}

/** Display name of a cast member (for generated card text). */
export function nameOf(story, id) {
  return story.cast.find((c) => c.id === id)?.name || id;
}

/** Expand the beat macros of one scene. @returns {{ scene, expansions }} */
function compileScene(story, scene, si, srcPath, catalog, moves, used, only = null) {
  const castById = new Map(story.cast.map((c) => [c.id, c]));
  const placements = new Map((scene.cast || []).map((p) => [p.id, { ...p }]));
  const pos = new Map([...placements.values()].map((p) => [p.id, p.x]));
  const anchors = new Map();
  const ordered = []; // authored beats, with each macro replaced by its expansion in place
  const expansions = [];
  const sets = [];
  (scene.beats || []).forEach((b, bi) => {
    const path = `${srcPath}.beats[${bi}]`;
    if (!b.macro) {
      ordered.push({ ...b, path: b.path ?? path });
      return;
    }
    const macroId = b.id ?? macroBeatId(b, bi, used);
    if (only && macroId !== only) return ordered.push({ ...b, path }); // ejecting one macro: the others stay
    const build = BEAT_MACROS[b.macro];
    const ctx = macroContext({ story, scene, catalog, moves, macroId, path, pos, placements, castById, sets });
    const out = build(ctx, b.params || {});
    if (!ctx.beats.length) return;
    ctx.beats[0] = { ...ctx.beats[0], at: b.at };
    anchors.set(macroId, out.anchors);
    ordered.push(...ctx.beats);
    expansions.push({ scene: si, sceneId: scene.id, macro: b.macro, id: macroId, path, beats: ctx.beats.map((x) => x.id), anchors: out.anchors });
  });
  const fix = (x) => ({ ...x, at: rewriteAt(x.at, anchors) });
  // Macros may chain on each other, so references are rewritten until nothing changes (a macro's first beat
  // can point at another macro).
  let beats = ordered.map(fix);
  for (let k = 0; k < 4 && beats.some((x) => anchors.has(parseAt(x.at)?.ref)); k++) beats = beats.map(fix);
  const camera = (scene.camera || []).map(fix);
  const cast = [...placements.values()];
  const set = sets.length ? { set: [...(scene.set || []), ...sets] } : {};
  return { scene: { ...scene, cast, beats, ...(scene.camera ? { camera } : {}), ...set, srcPath }, expansions };
}

/**
 * @param {object} story  a normalized v2 story (schema-valid, semantically checked)
 * @param {object} catalog
 * @param {Map<string, object>} moves  prepared moves
 * @returns {{ story: object, expansions: object[] }} expansions: [{ scene, macro, id, path, beats, anchors }]
 */
export function compileStory(story, catalog, moves) {
  if (story.legacy) return { story, expansions: [] };
  if (story.compiled) return { story, expansions: story.expansions || [] };
  const used = new Set(story.scenes.flatMap((s) => (s.beats || []).map((b) => b.id).filter(Boolean)));
  const scenes = [];
  const expansions = [];
  // Scene macros first: they produce ordinary scenes, which may contain beat macros (fight rounds use @fight).
  const flat = [];
  story.scenes.forEach((s, si) => {
    const srcPath = `scenes[${si}]`;
    if (!s.macro) return flat.push({ scene: s, srcPath });
    const ctx = { id: s.id, rng: deriveRng(story.meta.seed ?? 1, `compile:${s.id}`), story, catalog, moves, entry: s };
    const made = SCENE_MACROS[s.macro](ctx, s.params || {});
    expansions.push({ scene: si, macro: s.macro, id: s.id, path: srcPath, scenes: made.map((m) => m.id) });
    for (const m of made) flat.push({ scene: m, srcPath, expandedFrom: s.id });
  });
  for (const { scene, srcPath, expandedFrom } of flat) {
    const out = compileScene(story, scene, scenes.length, srcPath, catalog, moves, used);
    scenes.push(expandedFrom ? { ...out.scene, expandedFrom } : out.scene);
    expansions.push(...out.expansions);
  }
  return { story: { ...story, scenes, compiled: true, expansions }, expansions };
}

/** True when a story has macro beats or scene macros. */
export function hasMacros(story) {
  return !story.legacy && story.scenes.some((s) => s.macro || (s.beats || []).some((b) => b.macro));
}

const clean = ({ path, expandedFrom, ...b }) => b;

/**
 * Eject one macro (STORY_SPEC 11.3): the authored story with that macro replaced by what it expands to, so an
 * author can hand-tune the beats. A scene macro becomes its scenes (their own beat macros stay macros).
 * @returns {object|null} the new v2 script, or null when no macro has that id
 */
export function ejectMacro(story, macroId, catalog, moves) {
  const { legacy, ...script } = story;
  const sceneMacro = story.scenes.findIndex((s) => s.macro && s.id === macroId);
  if (sceneMacro >= 0) {
    const s = story.scenes[sceneMacro];
    const made = SCENE_MACROS[s.macro]({ id: s.id, rng: deriveRng(story.meta.seed ?? 1, `compile:${s.id}`), story, catalog, moves, entry: s }, s.params || {});
    return { ...script, scenes: [...story.scenes.slice(0, sceneMacro), ...made, ...story.scenes.slice(sceneMacro + 1)] };
  }
  const used = new Set(story.scenes.flatMap((s) => (s.beats || []).map((b) => b.id).filter(Boolean)));
  for (let si = 0; si < story.scenes.length; si++) {
    const scene = story.scenes[si];
    if (scene.macro) continue;
    const ids = (scene.beats || []).map((b, bi) => (b.macro ? b.id ?? `${b.macro}${bi}` : null));
    if (!ids.includes(macroId)) continue;
    const out = compileScene(story, scene, si, `scenes[${si}]`, catalog, moves, used, macroId);
    const { srcPath, ...rest } = out.scene;
    // A macro without an id gets one, so other beats can keep pointing at its anchors.
    const beats = rest.beats.map(clean);
    return { ...script, scenes: story.scenes.map((s, k) => (k === si ? { ...rest, beats } : s)) };
  }
  return null;
}

/** The compiled story as a plain v2 script (no internal fields), e.g. to print or save. */
export function plainScript(compiled) {
  const { legacy, compiled: _c, expansions, ...script } = compiled;
  return { ...script, scenes: compiled.scenes.map(({ srcPath, expandedFrom, ...s }) => ({ ...s, beats: (s.beats || []).map(clean) })) };
}
