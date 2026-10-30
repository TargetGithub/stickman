// The music bed for a 3D script: meta.music for the whole episode, or per scene with an optional `music`
// (a mood from catalog/story/music_moods.json, or false for none) and `musicGain`. A scene without them
// falls back to the episode's mood and gain. Changes crossfade over XFADE seconds centred on the scene start:
// equal-power between different moods (or into silence), linear for a gain change within one mood.

import { renderMusic } from "../../../tools/lib/music_gen.mjs";
import { SR } from "../../../tools/lib/mixer.mjs";

export const XFADE = 2;

/**
 * Which mood plays when: segments [{ start, end, mood (null = none), gain }], neighbours with the same mood
 * and gain merged.
 * @param {Array<{ id:string, start:number }>} planScenes  the compiled plan's scenes (runtime/compile.js)
 * @param {Array<{ id:string, music?:string|false, musicGain?:number }>} scriptScenes  the script's scenes
 * @param {{ music:string|null, musicGain:number, duration:number }} episode
 */
export function musicTimeline(planScenes, scriptScenes = [], { music, musicGain, duration }) {
  const byId = new Map((scriptScenes ?? []).map((s) => [s.id, s]));
  const segs = [];
  (planScenes?.length ? planScenes : [{ id: null, start: 0 }]).forEach((p, i, all) => {
    const s = byId.get(p.id) ?? {};
    const mood = s.music === false ? null : (s.music ?? music ?? null);
    const seg = { start: p.start, end: all[i + 1]?.start ?? duration, mood, gain: mood ? (s.musicGain ?? musicGain) : 0 };
    const prev = segs[segs.length - 1];
    if (prev && prev.mood === seg.mood && prev.gain === seg.gain) prev.end = seg.end;
    else segs.push(seg);
  });
  segs[0].start = 0;
  return segs;
}

const ramp = (t, at, xfade) => Math.min(1, Math.max(0, (t - (at - xfade / 2)) / xfade));

/** The gain of `mood` at time t: each of its segments fades in at its start and out at its end. */
export function moodGainAt(segs, mood, t, xfade = XFADE) {
  let g = 0;
  segs.forEach((s, i) => {
    if (s.mood !== mood) return;
    const prev = segs[i - 1];
    const next = segs[i + 1];
    let w = 1;
    if (prev) {
      const x = ramp(t, s.start, xfade);
      w *= prev.mood === mood ? x : Math.sin((x * Math.PI) / 2);
    }
    if (next) {
      const x = ramp(t, s.end, xfade);
      w *= next.mood === mood ? 1 - x : Math.cos((x * Math.PI) / 2);
    }
    g += s.gain * w;
  });
  return g;
}

/** Errors { code, path, message } for scene music fields (the runtime validator ignores unknown scene keys). */
export function checkSceneMusic(script, moods) {
  const errors = [];
  (script?.scenes ?? []).forEach((s, i) => {
    if (s.music != null && s.music !== false && !moods.includes(s.music)) errors.push({ code: "E3D_MUSIC", path: `scenes[${i}].music`, message: `unknown music mood "${s.music}" (known: ${moods.join(", ")})` });
    if (s.musicGain != null && !(typeof s.musicGain === "number" && s.musicGain >= 0 && s.musicGain <= 1)) errors.push({ code: "E3D_RANGE", path: `scenes[${i}].musicGain`, message: "musicGain must be 0-1" });
  });
  return errors;
}

/**
 * Render the bed: one procedural track per mood over the whole episode (so a mood that comes back picks up
 * where it would be), each scaled by its gain curve (computed every 10 ms, linear between).
 * @returns {Float32Array|null}  interleaved stereo at SR, or null when no scene has music
 */
export function renderMusicBed(segs, { catalog, seed, duration, xfade = XFADE }) {
  const moods = [...new Set(segs.map((s) => s.mood).filter(Boolean))];
  if (!moods.length) return null;
  const frames = Math.max(1, Math.round(duration * SR));
  let bed = null;
  for (const mood of moods) {
    const m = renderMusic({ mood, catalog, seed, seconds: duration }).samples;
    const step = SR / 100;
    const ctl = Float64Array.from({ length: Math.ceil(frames / step) + 2 }, (_, k) => moodGainAt(segs, mood, (k * step) / SR, xfade));
    for (let i = 0; i < frames; i++) {
      const k = Math.floor(i / step);
      const g = ctl[k] + (ctl[k + 1] - ctl[k]) * ((i - k * step) / step);
      m[i * 2] *= g;
      m[i * 2 + 1] *= g;
    }
    if (!bed) bed = m;
    else for (let i = 0; i < bed.length; i++) bed[i] += m[i];
  }
  return bed;
}
