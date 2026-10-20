// Mixing v3 audio tracks (ENGINE_V3_SPEC 6, ADR-031): the engine's getAudioTracks() plan rendered into the
// story's music and ambience stems, plus the bus gains and ducking rules for the mixdown. Music tracks are
// generated moods (or the assets/music override, looped), ambience tracks are generated beds; each follows
// its volume and pan keys and fades. Sound-effect hits are already in getAudioEvents().

import { renderMusic } from "./music_gen.mjs";
import { renderAmbience } from "./ambience.mjs";
import { audioTrackGains } from "../../engine/index.js";

const SR = 48000;
const STEP = 240; // samples between gain updates (5 ms)

/** Equal-power pan gains. */
const panLR = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];

/**
 * Add the plan's music and ambience tracks into the stems (in place). Both stems cover the whole video.
 * @param {{ music: Float32Array, ambience: Float32Array }} stems  interleaved stereo at 48 kHz
 * @param {{ musicVolume?: number, ambienceVolume?: number, loadOverride?: (mood) => Float32Array|null }} opts
 */
export function addTrackStems(stems, plan, { seed, catalog, musicVolume = 0.35, ambienceVolume = 0.8, loadOverride = null }) {
  const frames = stems.music.length / 2;
  const info = [];
  for (const tr of plan?.tracks || []) {
    const a = Math.max(0, Math.round(tr.t0 * SR));
    const b = Math.min(frames, Math.round(tr.t1 * SR));
    if (b <= a) continue;
    const len = b - a;
    let src;
    if (tr.kind === "music") {
      const file = loadOverride?.(tr.mood);
      src = file ? loop(file, len) : renderMusic({ mood: tr.mood, catalog, seed: `${seed}:${tr.seed}`, seconds: len / SR, intensity: tr.intensity ?? catalog.musicMoods[tr.mood]?.intensity }).samples;
    } else src = renderAmbience(tr.bed, len / SR, `${seed}:${tr.seed}`);
    const out = tr.kind === "music" ? stems.music : stems.ambience;
    const level = tr.kind === "music" ? musicVolume : ambienceVolume;
    let gl = 0;
    let gr = 0;
    for (let i = 0; i < len; i++) {
      if (i % STEP === 0) {
        const t = (a + i) / SR;
        const g = audioTrackGains.trackGainAt(tr, t) * level;
        const [l, r] = panLR(audioTrackGains.trackPanAt(tr, t));
        gl = g * l * Math.SQRT2;
        gr = g * r * Math.SQRT2;
      }
      out[(a + i) * 2] += (src[i * 2] ?? 0) * gl;
      out[(a + i) * 2 + 1] += (src[i * 2 + 1] ?? 0) * gr;
    }
    info.push({ id: tr.id, kind: tr.kind, from: tr.t0, to: tr.t1 });
  }
  return info;
}

function loop(file, len) {
  const out = new Float32Array(len * 2);
  for (let i = 0; i < len * 2; i++) out[i] = file[i % file.length];
  return out;
}

/** Events with the sfx and voice bus gains applied (video seconds; offset: the rendered range's start). */
export function applyEventBuses(events, plan, offset = 0) {
  if (!plan) return events;
  return events.map((e) => ({ ...e, volume: (e.volume ?? 1) * audioTrackGains.busGainAt(plan, String(e.sfx).startsWith("voice:") ? "voice" : "sfx", e.t + offset) }));
}

/** The stem gain functions for the mixdown: bus gain times ducking, for music and ambience. */
export function stemGains(plan, offset = 0) {
  if (!plan) return {};
  const g = (stem) => (t) => audioTrackGains.busGainAt(plan, stem, t + offset) * audioTrackGains.duckGainAt(plan, stem, t + offset);
  return { musicGain: g("music"), ambienceGain: g("ambience") };
}
