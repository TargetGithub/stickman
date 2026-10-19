// Story normalization (STORY_SPEC 20, ADR-016). Milestone: S1.
// - normalize(script): any schema-valid script → a v2 story. A v1 script becomes one scene "main"
//   with kind "clip", audience "general" and the `legacy` flag (unscoped RNG streams).
// - flatScene(story, i, catalog): scene i as a v1-shaped script ({ meta, characters, camera, beats }),
//   so the v1 semantic checks, director and world run on it unchanged.

import { STAGE } from "../config.js";

const DEFAULT_TIME = "day";
const DEFAULT_WEATHER = "clear";

/** @returns {object} a v2 story (a new object; the input is not changed) */
export function normalize(script) {
  if (script.version === 2) return { ...script, legacy: false };
  if (script.version === 3) return { ...script, version: 2, legacy: false, v3: true }; // a v2 story with the depth lane (V3.2)
  const meta = script.meta || {};
  return {
    version: 2,
    legacy: true,
    meta: { ...meta, kind: "clip", audience: "general" },
    cast: script.characters.map(({ x, facing, ...c }) => c),
    locations: [{ id: "main", theme: meta.theme ?? "white_stage", ...(meta.stageWidth ? { stageWidth: meta.stageWidth } : {}) }],
    scenes: [{
      id: "main",
      location: "main",
      cast: script.characters.map(({ id, x, facing }) => ({ id, x, facing })),
      camera: script.camera,
      beats: script.beats,
    }],
    audio: script.audio,
  };
}

/** The location a scene uses: a location id, else a theme name (a location with defaults), else null. */
export function resolveLocation(story, scene, catalog) {
  const loc = (story.locations || []).find((l) => l.id === scene.location);
  if (loc) return loc;
  if (catalog.themes[scene.location]) return { id: scene.location, theme: scene.location };
  return null;
}

/** Time of day and weather a scene starts with (scene, then location, then defaults). */
export function sceneLook(scene, location) {
  return {
    time: scene.time ?? location?.time ?? DEFAULT_TIME,
    weather: scene.weather ?? location?.weather ?? DEFAULT_WEATHER,
    ambience: scene.ambience ?? location?.ambience ?? "none",
    ...(scene.grade ? { grade: scene.grade } : {}),
  };
}

/**
 * Scene i as a v1-shaped script. Characters merge the cast definition with the scene placement;
 * state carried over from earlier scenes (hp, prop) is applied by the simulation, not here.
 */
export function flatScene(story, i, catalog) {
  const scene = story.scenes[i];
  const location = resolveLocation(story, scene, catalog);
  const castById = new Map(story.cast.map((c) => [c.id, c]));
  const characters = (scene.cast || []).map((p) => {
    const def = castById.get(p.id) || { id: p.id, color: "#22aaff" };
    const out = { id: p.id, x: p.x, facing: p.facing ?? 1, color: def.color };
    for (const k of ["scale", "hp", "prop", "style", "body", "appearance"]) if (def[k] !== undefined) out[k] = def[k];
    if (p.hp !== undefined) out.hp = p.hp;
    if (p.prop !== undefined) out.prop = p.prop;
    return out;
  });
  const meta = {
    ...story.meta,
    theme: location?.theme ?? "white_stage",
    stageWidth: location?.stageWidth ?? (story.legacy ? story.meta.stageWidth : undefined) ?? STAGE.width,
  };
  if (scene.tail !== undefined) meta.tail = scene.tail;
  if (story.legacy && story.meta.stageWidth === undefined) delete meta.stageWidth;
  return {
    meta,
    characters,
    camera: scene.camera && scene.camera.length ? scene.camera : [{ at: 0, mode: "follow" }],
    beats: scene.beats || [],
    scene,
    location,
    look: sceneLook(scene, location),
    hidden: new Set((scene.cast || []).filter((p) => p.hidden).map((p) => p.id)),
  };
}

/** The transition used at the start of scene i (null before the first scene with none set). */
export function transitionInto(story, i) {
  const scene = story.scenes[i];
  if (scene.transitionIn) return scene.transitionIn;
  if (i > 0 && story.scenes[i - 1].transitionOut) return story.scenes[i - 1].transitionOut;
  return null;
}

/** Default hold length in seconds for a transition (cards read longer). */
export function transitionDuration(t) {
  if (!t || t.type === "cut") return 0;
  if (t.dur !== undefined) return t.dur;
  if (t.type === "card") return t.kind === "title" ? 3 : 2.5;
  return t.type === "dissolve" ? 0.8 : t.type === "fade" ? 1 : 0.7;
}
