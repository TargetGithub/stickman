// Music and ambience plans for story scripts (STORY_SPEC 15, S7.3-S7.4). Milestone: S7.
// The engine only says what should play when (video seconds); tools/ renders and mixes it (ADR-017).
//   Music: a scene's `music` ({mood, intensity, volume}; null = silence; missing = keep the previous scene's),
//   then `set_music` beats inside it. Consecutive scenes with the same mood share one segment, so the music
//   plays on through cards and cuts; a mood change crossfades (1.5 s, or the beat's `fade`).
//   A scene starts at the hold (card, transition) before it, so a card already has its scene's music.
//   Duck spans: speech bubbles and narration. Dips: a vanish or ghost defeat (the music drops for a sad sting).
//   Ambience: the scene's (or location's) bed plus weather beds (rain, wind), changing with set_weather.

import { FPS } from "./config.js";
import { narrateDuration } from "./story/timing.js";

const CROSSFADE = 1.5; // s
const SILENCE_FADE = 1; // s
const DIP = 4; // s of quieter music after a sad defeat
const WEATHER_BEDS = { rain: { rain: 1 }, wind: { wind: 0.8 }, snow: { wind: 0.35 } };

/** Video-time span of each scene, from the start of the hold before it to the next scene's hold. */
function sceneSpans(sim) {
  const total = sim.totalFrames / FPS;
  const starts = sim.scenes.map((sc, i) => (i === 0 ? 0 : (sim.scenes[i - 1].startFrame + sim.scenes[i - 1].frames) / FPS));
  return sim.scenes.map((sc, i) => ({ t0: starts[i], t1: starts[i + 1] ?? total, sceneId: sc.id }));
}

/**
 * @returns {{ segments: Array<{ t0, t1, mood, seed, fadeIn, fadeOut, intensity: Array<{t,v}>, volume: Array<{t,v}> }>,
 *             duck: Array<[number, number]>, dips: Array<[number, number]> } | null}  null for v1 scripts
 *   intensity points use segment-relative seconds (the generator's clock); volume points use video seconds.
 */
export function collectMusicPlan(sim) {
  if (!sim.story || sim.story.legacy) return null;
  const spans = sceneSpans(sim);
  const segments = [];
  let open = null;
  const close = (t, fade) => {
    if (!open) return;
    open.t1 = t;
    open.fadeOut = fade;
    segments.push(open);
    open = null;
  };
  const start = (t, mood, fade, sceneId, intensity, volume) => {
    open = { t0: t, t1: t, mood, seed: `${sceneId}:${segments.length}`, fadeIn: fade, fadeOut: 0, intensity: [], volume: [{ t, v: volume ?? 1 }] };
    if (intensity !== undefined && intensity !== null) open.intensity.push({ t: 0, v: intensity });
  };
  const change = (t, spec, fade, sceneId) => {
    const mood = spec === null ? null : spec.mood ?? open?.mood ?? null;
    if (spec !== null && open && mood === open.mood) {
      if (spec.intensity !== undefined) open.intensity.push({ t: t - open.t0, v: spec.intensity });
      if (spec.volume !== undefined) open.volume.push({ t, v: spec.volume, fade });
      return;
    }
    const wasOpen = !!open;
    close(t, mood === null ? SILENCE_FADE : fade);
    if (mood) start(t, mood, wasOpen ? fade : Math.min(fade, 0.5), sceneId, spec.intensity, spec.volume);
  };
  sim.story.scenes.forEach((scene, i) => {
    const span = spans[i];
    if (!span) return;
    if (scene.music !== undefined) change(span.t0, scene.music, CROSSFADE, span.sceneId);
    for (const e of sim.events) {
      if (e.scene !== i || e.type !== "world" || e.do !== "set_music") continue;
      const p = e.params || {};
      change(e.videoT, { ...(p.mood ? { mood: p.mood } : {}), ...(p.intensity !== undefined ? { intensity: p.intensity } : {}), ...(p.volume !== undefined ? { volume: p.volume } : {}) }, p.fade ?? CROSSFADE, span.sceneId);
    }
  });
  close(sim.totalFrames / FPS, 0);
  const duck = [];
  const dips = [];
  for (const e of sim.events) {
    if (e.type === "say" && e.bubble !== "think") duck.push([e.videoT, e.videoT + e.dur]);
    if (e.type === "world" && e.do === "narrate") duck.push([e.videoT, e.videoT + narrateDuration(e.params || {})]);
    if (e.type === "defeat" && (e.move === "vanish" || e.move === "ghost")) dips.push([e.videoT, e.videoT + DIP]);
  }
  return { segments: segments.filter((s) => s.t1 > s.t0 + 0.05), duck, dips };
}

/**
 * @returns {Array<{ t0, t1, beds: Object<string, number> }>|null}  bed name → level (0-1), per stretch of video
 */
export function collectAmbiencePlan(sim) {
  if (!sim.story || sim.story.legacy) return null;
  const out = [];
  sceneSpans(sim).forEach((span, i) => {
    const look = sim.scenes[i].look || {};
    const beds = (weather) => {
      const b = { ...(WEATHER_BEDS[weather] || {}) };
      if (look.ambience && look.ambience !== "none") b[look.ambience] = 1;
      return b;
    };
    let t = span.t0;
    let weather = look.weather;
    for (const e of sim.events) {
      if (e.scene !== i || e.type !== "world" || e.do !== "set_weather" || e.videoT <= t) continue;
      out.push({ t0: t, t1: e.videoT, beds: beds(weather) });
      t = e.videoT;
      weather = e.params.weather;
    }
    out.push({ t0: t, t1: span.t1, beds: beds(weather) });
  });
  return out.filter((s) => s.t1 > s.t0);
}
