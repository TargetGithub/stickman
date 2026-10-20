// Public API (spec 15.1). Milestone M5.
//
//   import { createEngine } from "./engine/index.js";
//   const engine = createEngine({ catalog });
//   const result = engine.load(script);          // validates, then simulates the whole script
//   if (result.ok) engine.renderFrame(ctx, n);    // any n in 0..totalFrames-1, any order
//
// The engine never reads the clock, the network or files. Hosts (tools/, web/) own canvases and fonts.

import { validate, buildJsonSchema, WORLD_COMMANDS, formatIssues } from "./validator/index.js";
import { simulate, frameAt, v1MoveNames, movesFor } from "./sim.js";
import { normalize } from "./story/normalize.js";
import { compileStory, ejectMacro as eject, plainScript } from "./story/compile.js";
import { storyToVideo } from "./clock.js";
import { createRenderer, renderFrame as drawFrame } from "./renderer/index.js";
import { collectAudioEvents, collectMusicCues } from "./audio_events.js";
import { collectMusicPlan, collectAmbiencePlan } from "./audio_plan.js";
import { collectAudioTracks, busGainAt, duckGainAt, trackGainAt, trackPanAt } from "./audio_tracks.js";
import { expandScript } from "./templates.js";
import { FPS, FORMATS, ENGINE_VERSION } from "./config.js";

export { validate, formatIssues, ENGINE_VERSION, expandScript };
/** Audio track mixing helpers for tools (V3.8): gains and pans of a getAudioTracks() plan at a video time. */
export const audioTrackGains = { busGainAt, duckGainAt, trackGainAt, trackPanAt };

/** JSON Schema for scripts with this catalog's enums (for LLM structured output). */
export function scriptSchema(catalog) {
  return buildJsonSchema(catalog, v1MoveNames(catalog), Object.keys(WORLD_COMMANDS));
}

/**
 * Expand a story's macros (STORY_SPEC 11, S6). The script should validate first (validate()).
 * @returns {{ script: object, expansions: Array<{ scene, macro, id, path, beats?, scenes?, anchors? }> }}
 *   script: the compiled v2 script (plain beats only); a v1 script comes back unchanged
 */
export function compileScript(script, catalog) {
  if (script?.version !== 2 && script?.version !== 3) return { script, expansions: [] };
  const { story, expansions } = compileStory(normalize(expandScript(script, catalog).script), catalog, movesFor(catalog));
  return { script: plainScript(story), expansions };
}

/** The script with one macro (beat or scene macro id) replaced by its expansion; null if there is no such macro. */
export function ejectMacro(script, macroId, catalog) {
  if (script?.version !== 2 && script?.version !== 3) return null;
  return eject(normalize(script), macroId, catalog, movesFor(catalog));
}

/**
 * @param {{ catalog: object, createCanvas?: (w:number, h:number) => object }} opts
 *   catalog: the catalog (catalog/index.js loads catalog/); the engine never imports it.
 *   createCanvas: optional host canvas factory, used for scratch canvases (dissolve transitions).
 */
export function createEngine(opts) {
  if (!opts || !opts.catalog) throw new Error("createEngine: catalog is required");
  const { catalog } = opts;
  let state = null;

  const loaded = () => {
    if (!state) throw new Error("no script loaded: call load(script) first and check result.ok");
    return state;
  };

  return {
    /**
     * Validate and simulate a script.
     * @returns {{ ok, errors, warnings, timeline, totalFrames, fps, width, height, durationSec }}
     */
    load(script) {
      state = null;
      const format = FORMATS[script?.meta?.format] || FORMATS.landscape;
      const v = validate(script, catalog);
      const base = { errors: v.errors, warnings: v.warnings, timeline: v.timeline, fps: FPS, width: format.width, height: format.height };
      if (!v.ok) return { ok: false, ...base, totalFrames: 0, durationSec: 0 };
      const sim = simulate(script, catalog);
      state = { script, sim, renderer: createRenderer(catalog, sim, { createCanvas: opts.createCanvas }), audio: null };
      return { ok: true, ...base, totalFrames: sim.totalFrames, durationSec: sim.durationSec };
    },

    /** Draw frame n into ctx (a width×height CanvasRenderingContext2D). Pure with respect to (script, n). */
    renderFrame(ctx, n) {
      const s = loaded();
      if (!Number.isInteger(n) || n < 0 || n >= s.sim.totalFrames) throw new RangeError(`frame ${n} is outside 0..${s.sim.totalFrames - 1}`);
      drawFrame(s.renderer, ctx, n);
    },

    /** SFX events [{ t, sfx, volume, pan }] in video seconds (spec 15.4). */
    getAudioEvents() {
      const s = loaded();
      s.audio ??= collectAudioEvents(s.sim);
      return s.audio;
    },

    /** Music cues from world beats [{ t, cue, volume }]. */
    getMusicCues() {
      return collectMusicCues(loaded().sim);
    },

    /** Story scripts (S7): music segments by mood, duck spans and dips; null for v1 scripts. */
    getMusicPlan() {
      return collectMusicPlan(loaded().sim);
    },

    /** Story scripts (S7): ambience beds over time; null for v1 scripts. */
    getAmbiencePlan() {
      return collectAmbiencePlan(loaded().sim);
    },

    /** v3 scripts (V3.8): audio tracks, buses, sfx hits and ducking rules in video seconds; null without tracks. */
    getAudioTracks() {
      return collectAudioTracks(loaded().sim);
    },

    /** Resolved anchors [{ beatId, anchor, t (story s), videoT }]. */
    getAnchors() {
      const s = loaded();
      return s.sim.anchors.map((a) => ({ ...a, videoT: storyToVideo(s.sim.clock, a.t) }));
    },

    /** Per-frame state view (camera, characters, clocks) for tools such as thumbnail scoring. */
    getFrame(n) {
      return frameAt(loaded().sim, n);
    },

    /** Scenes in video order: [{ index, id, theme, startFrame, frames, startT, endT }] (one for v1 scripts). */
    getScenes() {
      return loaded().sim.scenes.map((sc) => ({
        index: sc.index, id: sc.id, theme: sc.theme, startFrame: sc.startFrame, frames: sc.frames,
        startT: sc.startFrame / FPS, endT: (sc.startFrame + sc.frames) / FPS,
      }));
    },

    /** The full simulation event log (hits, moves, world beats, ...), with story and video times. */
    getEvents() {
      return loaded().sim.events;
    },

    getMeta() {
      const s = loaded();
      const m = s.script.meta;
      return {
        title: m.title,
        format: m.format,
        seed: m.seed,
        theme: m.theme ?? s.sim.scenes[0]?.theme ?? "white_stage",
        scenes: s.sim.scenes.length,
        width: s.sim.format.width,
        height: s.sim.format.height,
        fps: FPS,
        totalFrames: s.sim.totalFrames,
        durationSec: s.sim.durationSec,
        engineVersion: ENGINE_VERSION,
      };
    },

    dispose() {
      state = null;
    },
  };
}
