// Ambience beds (STORY_SPEC 15, S7.4): procedural, seeded, stereo at 48 kHz. Each bed is levelled to
// AMBIENCE_LUFS so they sit far behind dialogue and music.
//   park_birds    a soft breeze and chirps here and there
//   city_traffic  a low rumble with cars swelling past, left to right and back
//   rain          a steady patter with close drops
//   wind          gusts (a low-passed noise whose cutoff and level drift)
//   crowd_murmur  many voices far away (band noise shaped at syllable rate)
//   cave_drip     a quiet room tone and echoing drips

import { mulberry32, hash32 } from "../../engine/math.js";
import { normalizeLoudness } from "./loudness.mjs";

const SR = 48000;
const TAU = Math.PI * 2;
export const AMBIENCE_LUFS = -30;
export const BEDS = ["park_birds", "city_traffic", "rain", "wind", "crowd_murmur", "cave_drip"];

const lp = (hz) => 1 - Math.exp((-TAU * hz) / SR);

/** A smooth random walk in [0, 1] sampled per frame (for gusts and swells). */
function drift(rng, frames, rate) {
  const out = new Float32Array(frames);
  const step = Math.max(1, Math.round(SR / rate));
  let a = rng();
  let b = rng();
  for (let i = 0; i < frames; i++) {
    if (i % step === 0) [a, b] = [b, rng()];
    const u = (i % step) / step;
    out[i] = a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * u));
  }
  return out;
}

/** Add filtered noise to both channels (decorrelated L/R). */
function noiseBed(out, rng, { cutoff, gain, hp = 0, mod = null }) {
  const frames = out.length / 2;
  const c = lp(cutoff);
  const h = hp ? Math.exp((-TAU * hp) / SR) : 0;
  for (let ch = 0; ch < 2; ch++) {
    let y = 0;
    let y2 = 0;
    let hpy = 0;
    let prev = 0;
    for (let i = 0; i < frames; i++) {
      y += c * (rng() * 2 - 1 - y);
      y2 += c * (y - y2);
      let v = y2;
      if (hp) {
        hpy = h * (hpy + v - prev);
        prev = v;
        v = hpy;
      }
      out[i * 2 + ch] += v * gain * (mod ? mod[i] : 1);
    }
  }
}

function chirp(out, rng, t) {
  const start = Math.round(t * SR);
  const notes = 2 + Math.floor(rng() * 4);
  const f0 = 2600 + rng() * 2200;
  const pan = rng() * 2 - 1;
  const [gl, gr] = [Math.cos(((pan + 1) * Math.PI) / 4), Math.sin(((pan + 1) * Math.PI) / 4)];
  let ph = 0;
  for (let k = 0; k < notes; k++) {
    const len = Math.round((0.04 + rng() * 0.05) * SR);
    const off = start + Math.round(k * 0.085 * SR);
    const up = rng() < 0.5;
    for (let i = 0; i < len && off + i < out.length / 2; i++) {
      const u = i / len;
      const f = f0 * (up ? 1 + 0.35 * u : 1.35 - 0.35 * u);
      ph += (TAU * f) / SR;
      const s = Math.sin(ph) * Math.sin(Math.PI * u) * 0.25;
      out[(off + i) * 2] += s * gl;
      out[(off + i) * 2 + 1] += s * gr;
    }
  }
}

function drip(out, rng, t) {
  const start = Math.round(t * SR);
  const f0 = 1400 + rng() * 900;
  for (let echo = 0; echo < 4; echo++) {
    const off = start + Math.round(echo * 0.23 * SR);
    const g = 0.35 * 0.45 ** echo;
    const pan = (echo % 2 ? 1 : -1) * 0.3 * echo;
    let ph = 0;
    const len = Math.round(0.05 * SR);
    for (let i = 0; i < len && off + i < out.length / 2; i++) {
      const u = i / len;
      ph += (TAU * f0 * (1 - 0.45 * u)) / SR;
      const s = Math.sin(ph) * Math.exp(-u * 5) * g;
      out[(off + i) * 2] += s * (1 - pan) * 0.7;
      out[(off + i) * 2 + 1] += s * (1 + pan) * 0.7;
    }
  }
}

const RECIPES = {
  park_birds(out, rng, sec) {
    noiseBed(out, rng, { cutoff: 500, gain: 0.25, mod: drift(rng, out.length / 2, 0.3) });
    for (let t = rng() * 0.8; t < sec - 0.5; t += 0.35 + rng() * 1.6) chirp(out, rng, t);
  },
  city_traffic(out, rng, sec) {
    const frames = out.length / 2;
    noiseBed(out, rng, { cutoff: 180, gain: 1.2 });
    // Cars: a swell every few seconds that moves across.
    for (let t = rng() * 2; t < sec; t += 3 + rng() * 5) {
      const dur = 2.5 + rng() * 2;
      const dir = rng() < 0.5 ? 1 : -1;
      const start = Math.round(t * SR);
      const len = Math.round(dur * SR);
      let y = 0;
      for (let i = 0; i < len && start + i < frames; i++) {
        const u = i / len;
        y += lp(500) * (rng() * 2 - 1 - y);
        const env = Math.sin(Math.PI * u) ** 2 * 0.9;
        const p = dir * (u * 2 - 1);
        out[(start + i) * 2] += y * env * (1 - p) * 0.5;
        out[(start + i) * 2 + 1] += y * env * (1 + p) * 0.5;
      }
    }
  },
  rain(out, rng, sec) {
    noiseBed(out, rng, { cutoff: 5000, hp: 900, gain: 0.5 });
    noiseBed(out, rng, { cutoff: 700, gain: 0.25 });
    for (let t = 0; t < sec; t += 0.02 + rng() * 0.08) {
      const i0 = Math.round(t * SR);
      const ch = rng() < 0.5 ? 0 : 1;
      const amp = 0.2 + rng() * 0.3;
      for (let i = 0; i < 90 && i0 + i < out.length / 2; i++) out[(i0 + i) * 2 + ch] += (rng() * 2 - 1) * amp * Math.exp(-i / 18);
    }
  },
  wind(out, rng) {
    const frames = out.length / 2;
    const gust = drift(rng, frames, 0.25);
    for (let ch = 0; ch < 2; ch++) {
      let y = 0;
      let y2 = 0;
      for (let i = 0; i < frames; i++) {
        const c = lp(180 + 700 * gust[i]);
        y += c * (rng() * 2 - 1 - y);
        y2 += c * (y - y2);
        out[i * 2 + ch] += y2 * (0.4 + 0.8 * gust[i]);
      }
    }
  },
  crowd_murmur(out, rng) {
    const frames = out.length / 2;
    for (let layer = 0; layer < 4; layer++) {
      const syll = drift(rng, frames, 4 + rng() * 3);
      noiseBed(out, rng, { cutoff: 1400, hp: 300, gain: 0.35, mod: syll });
    }
  },
  cave_drip(out, rng, sec) {
    noiseBed(out, rng, { cutoff: 220, gain: 0.25 });
    for (let t = 0.3 + rng(); t < sec - 1; t += 0.8 + rng() * 2.2) drip(out, rng, t);
  },
};

/** A bed for `seconds` (interleaved stereo), levelled to AMBIENCE_LUFS. Same name + seed → same samples. */
export function renderAmbience(name, seconds, seed) {
  const recipe = RECIPES[name];
  if (!recipe) throw new Error(`no ambience bed '${name}'`);
  const frames = Math.max(1, Math.round(seconds * SR));
  const out = new Float32Array(frames * 2);
  recipe(out, mulberry32(hash32(`ambience:${name}:${seed}`)), frames / SR);
  normalizeLoudness(out, AMBIENCE_LUFS, { maxGainDb: 40 });
  return out;
}
