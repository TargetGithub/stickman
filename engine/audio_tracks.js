// Audio tracks (ENGINE_V3_SPEC 6 `audio.tracks`, ADR-031). Milestone: V3.8.
// A version 3 script may add tracks next to the story's own music and ambience: music (a mood), ambience (a
// bed), sound effects at times or markers, and buses (a keyed gain on the music, ambience, sfx or voice mix),
// each with volume and pan as numbers or keys, plus ducking rules. The engine only says what plays when, in
// video seconds (ADR-017); tools/lib/track_mix.mjs renders and mixes it. Pure.

import { FPS } from "./config.js";
import { storyToVideo } from "./clock.js";
import { sampleTrack } from "./timeline.js";

export const BUSES = ["music", "ambience", "sfx", "voice"];
const HIT_SPAN = 0.25; // s an sfx hit counts as sounding, for ducking
const DEFAULT_DUCK = { db: -8, attack: 0.15, release: 0.4 };

/** Video seconds of each scene's start (story time `t` into scene i → video time). */
function sceneClock(sim) {
  const byId = new Map();
  for (const sc of sim.scenes || []) {
    byId.set(sc.id, { t0: sc.startFrame / FPS, t1: (sc.startFrame + sc.frames) / FPS, storyStart: sc.storyStart ?? 0 });
  }
  const at = (scene, t) => {
    const s = scene ? byId.get(scene) : null;
    if (!scene) return t;
    if (!s) return null;
    return storyToVideo(sim.clock, s.storyStart + t);
  };
  return { byId, at };
}

/** A volume or pan given as a number or keys, as keys in video seconds from base. */
const keysOf = (v, base, fallback) => (v === undefined ? [{ t: base, v: fallback }] : typeof v === "number" ? [{ t: base, v }] : v.map((k) => ({ ...k, t: base + k.t })));

/**
 * The audio track plan of a v3 script, or null without tracks.
 * @returns {{ tracks: object[], buses: Record<string, Array<{ t0, t1, keys }>>, sfx: object[], duck: object[], markers: Map }|null}
 */
export function collectAudioTracks(sim) {
  const audio = sim.story?.audio;
  if (!sim.story?.v3 || !audio || (!audio.tracks?.length && !audio.duck?.length)) return null;
  const total = sim.totalFrames / FPS;
  const clock = sceneClock(sim);
  const markers = new Map();
  for (const m of audio.markers || []) {
    const t = clock.at(m.scene, m.t);
    if (t !== null) markers.set(m.id, t);
  }
  const tracks = [];
  const buses = Object.fromEntries(BUSES.map((b) => [b, []]));
  const sfx = [];
  for (const tr of audio.tracks || []) {
    const span = tr.scene ? clock.byId.get(tr.scene) : { t0: 0, t1: total };
    if (!span) continue;
    const base = tr.scene ? span.t0 : 0;
    const t0 = base + (tr.from ?? 0);
    const t1 = Math.min(span.t1, tr.to !== undefined ? base + tr.to : span.t1);
    const volume = keysOf(tr.volume, base, 1);
    const pan = keysOf(tr.pan, base, 0);
    if (tr.kind === "bus") buses[tr.bus].push({ t0, t1, keys: volume });
    else if (tr.kind === "sfx") {
      for (const a of tr.at || []) {
        const t = typeof a === "number" ? clock.at(tr.scene, a) : markers.get(a.marker);
        if (t === null || t === undefined) continue;
        const when = t + (a.delay ?? 0);
        sfx.push({ t: when, sfx: tr.sfx, volume: clampV(sampleTrack(volume, when)), pan: sampleTrack(pan, when), track: tr.id });
      }
    } else tracks.push({ id: tr.id, kind: tr.kind, mood: tr.mood, bed: tr.bed, t0, t1, fadeIn: tr.fadeIn ?? 0.5, fadeOut: tr.fadeOut ?? 0.8, volume, pan, intensity: tr.intensity ?? null, seed: `track:${tr.id}` });
  }
  sfx.sort((a, b) => a.t - b.t);
  const duck = (audio.duck || []).map((r) => ({ ...DEFAULT_DUCK, ...r, spans: duckSpans(r.under, sim, tracks, sfx) }));
  return { tracks, buses, sfx, duck, markers };
}

const clampV = (v) => Math.max(0, Math.min(2, v));

/** When the thing a rule ducks under is sounding: voice (speech and narration), sfx hits, or a track. */
function duckSpans(under, sim, tracks, sfx) {
  if (under === "voice") {
    return sim.events.filter((e) => (e.type === "say" && e.bubble !== "think") || (e.type === "world" && e.do === "narrate")).map((e) => [e.videoT, e.videoT + (e.dur ?? 3)]);
  }
  if (under === "sfx") return sfx.map((e) => [e.t, e.t + HIT_SPAN]);
  const tr = tracks.find((t) => t.id === under);
  if (tr) return [[tr.t0, tr.t1]];
  return sfx.filter((e) => e.track === under).map((e) => [e.t, e.t + HIT_SPAN]);
}

/** A bus's gain at video time t (1 outside its keyed spans; spans multiply). */
export function busGainAt(plan, bus, t) {
  let g = 1;
  for (const s of plan?.buses?.[bus] || []) if (t >= s.t0 && t < s.t1) g *= clampV(sampleTrack(s.keys, t));
  return g;
}

/** The ducking gain on a stem (music or ambience) at t: each rule ramps down by its db while its spans sound. */
export function duckGainAt(plan, stem, t) {
  let g = 1;
  for (const r of plan?.duck || []) {
    if (r.duck !== stem) continue;
    let depth = 0;
    for (const [a, b] of r.spans) {
      if (t < a - r.attack || t > b + r.release) continue;
      const k = t < a ? 1 - (a - t) / r.attack : t > b ? 1 - (t - b) / r.release : 1;
      depth = Math.max(depth, Math.max(0, Math.min(1, k)));
    }
    g *= 10 ** ((r.db * depth) / 20);
  }
  return g;
}

/** A music or ambience track's gain at t: its volume keys with its fades (0 outside the track). */
export function trackGainAt(track, t) {
  if (t < track.t0 || t >= track.t1) return 0;
  const fi = track.fadeIn > 0 ? Math.min(1, (t - track.t0) / track.fadeIn) : 1;
  const fo = track.fadeOut > 0 ? Math.min(1, (track.t1 - t) / track.fadeOut) : 1;
  return clampV(sampleTrack(track.volume, t)) * fi * fo;
}

/** A track's pan at t (-1 left to 1 right). */
export const trackPanAt = (track, t) => Math.max(-1, Math.min(1, sampleTrack(track.pan, t)));
