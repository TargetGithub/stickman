// A story's music and ambience beds (STORY_SPEC 15, S7.3): the engine's plans (getMusicPlan,
// getAmbiencePlan) rendered into two stereo buffers the length of the video.
//   Music: one render per segment (mood), seeded by the scene that starts it; each segment overlaps its
//   neighbours by half the crossfade and fades with equal power, so the crossfade is centred on the boundary.
//   A file in assets/music/<mood>.(wav|mp3|...) replaces the generated music for that mood (looped).
//   Ambience: one render per bed for the whole video, shaped by a level envelope with 0.8 s crossfades.
// Pure apart from the optional override loader passed in.

import { renderMusic } from "./music_gen.mjs";
import { renderAmbience } from "./ambience.mjs";

const SR = 48000;
const AMB_FADE = 0.8; // s

/** Equal-power fade-in gain for time t across [a, b]. */
const fadeIn = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : t <= a ? 0 : t >= b ? 1 : Math.sin(((t - a) / (b - a)) * (Math.PI / 2)));
const fadeOut = (t, a, b) => (b <= a ? (t < a ? 1 : 0) : t <= a ? 1 : t >= b ? 0 : Math.cos(((t - a) / (b - a)) * (Math.PI / 2)));

/** Gain of one segment at video time t (the crossfades and its volume points). */
export function segmentGain(seg, t, total) {
  const fi = seg.t0 <= 0 ? 0 : seg.fadeIn;
  const fo = seg.t1 >= total ? 0 : seg.fadeOut;
  let g = fadeIn(t, seg.t0 - fi / 2, seg.t0 + fi / 2) * fadeOut(t, seg.t1 - fo / 2, seg.t1 + fo / 2);
  // Volume points (video seconds): each ramps from the previous level over its `fade` (default 1 s).
  let v = 1;
  let prev = 1;
  for (const p of seg.volume || []) {
    if (p.t > t) break;
    const fade = p.fade ?? 1;
    v = fade > 0 ? prev + (p.v - prev) * Math.min(1, (t - p.t) / fade) : p.v;
    prev = p.v;
  }
  return g * v;
}

/** Step intensity points (segment seconds), with the mood's level before the first one, as a linear curve. */
function stepIntensity(points, base) {
  const pts = [...(points || [])].sort((x, y) => x.t - y.t);
  if (!pts.length) return undefined;
  if (pts[0].t > 0) pts.unshift({ t: 0, v: base });
  // Hold each value until just before the next point, so changes land as steps (bar by bar in the generator).
  return pts.flatMap((p, i) => (i ? [{ t: Math.max(pts[i - 1].t, p.t - 0.001), v: pts[i - 1].v }, p] : [p]));
}

/** Loop a decoded override file (interleaved stereo) to `frames`. */
function loopTo(music, frames) {
  const out = new Float32Array(frames * 2);
  const n = music.length / 2;
  for (let i = 0; i < frames; i++) {
    out[i * 2] = music[(i % n) * 2];
    out[i * 2 + 1] = music[(i % n) * 2 + 1];
  }
  return out;
}

/**
 * @param {{ musicPlan, ambiencePlan, seconds:number, seed, catalog, musicVolume?:number, ambienceVolume?:number,
 *           loadOverride?:(mood:string)=>Float32Array|null }} o
 * @returns {{ music: Float32Array, ambience: Float32Array, segments: object[] }}
 */
export function renderScore({ musicPlan, ambiencePlan, seconds, seed, catalog, musicVolume = 0.35, ambienceVolume = 0.8, loadOverride = null }) {
  const frames = Math.round(seconds * SR);
  const music = new Float32Array(frames * 2);
  const ambience = new Float32Array(frames * 2);
  const info = [];
  for (const seg of musicPlan?.segments || []) {
    const fi = seg.t0 <= 0 ? 0 : seg.fadeIn;
    const fo = seg.t1 >= seconds ? 0 : seg.fadeOut;
    const a = Math.max(0, seg.t0 - fi / 2);
    const b = Math.min(seconds, seg.t1 + fo / 2);
    const len = Math.round((b - a) * SR);
    if (len <= 0) continue;
    const file = loadOverride?.(seg.mood);
    const mood = catalog.musicMoods[seg.mood];
    // The generator's clock starts at a; the plan's intensity points start at t0.
    const shifted = (seg.intensity || []).map((p) => ({ t: p.t + (seg.t0 - a), v: p.v }));
    const src = file ? loopTo(file, len) : renderMusic({ mood: seg.mood, catalog, seed: `${seed}:${seg.seed}`, seconds: len / SR, intensity: stepIntensity(shifted, mood.intensity) }).samples;
    const start = Math.round(a * SR);
    for (let i = 0; i < len && start + i < frames; i++) {
      const g = segmentGain(seg, (start + i) / SR, seconds) * musicVolume;
      music[(start + i) * 2] += src[i * 2] * g;
      music[(start + i) * 2 + 1] += src[i * 2 + 1] * g;
    }
    info.push({ mood: seg.mood, from: a, to: b, source: file ? "file" : "generated" });
  }
  // Ambience: each bed's level over time, crossfaded between stretches.
  const names = [...new Set((ambiencePlan || []).flatMap((s) => Object.keys(s.beds)))];
  for (const name of names) {
    const bed = renderAmbience(name, seconds, seed);
    const level = (t) => {
      let v = 0;
      for (const s of ambiencePlan) {
        const l = s.beds[name] ?? 0;
        if (!l) continue;
        v += l * fadeIn(t, s.t0 - AMB_FADE / 2, s.t0 + AMB_FADE / 2) * fadeOut(t, s.t1 - AMB_FADE / 2, s.t1 + AMB_FADE / 2);
      }
      return v;
    };
    let g = 0;
    for (let i = 0; i < frames; i++) {
      if (i % 480 === 0) g = level(i / SR) * ambienceVolume; // every 10 ms is smooth enough
      ambience[i * 2] += bed[i * 2] * g;
      ambience[i * 2 + 1] += bed[i * 2 + 1] * g;
    }
  }
  return { music, ambience, segments: info };
}

/** Music gain under speech and narration (-8 dB) and after a sad defeat (-9 dB), with short ramps. */
export function storyDuck(t, duck, dips) {
  const span = (spans, depth, attack, release) => {
    let g = 1;
    for (const [a, b] of spans) {
      if (t < a - attack || t > b + release) continue;
      const k = t < a ? (a - t) / attack : t > b ? (t - b) / release : 0;
      g = Math.min(g, depth + (1 - depth) * Math.min(1, k));
    }
    return g;
  };
  return span(duck, 0.4, 0.15, 0.4) * span(dips, 0.35, 0.3, 1.5);
}
