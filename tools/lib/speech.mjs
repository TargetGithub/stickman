// Speech sounds (STORY_SPEC 15, ADR-017): language-free babble syllables, one short voiced vowel per
// key "voice:<timbre>:<vowel>:<semitones>". Additive synthesis: harmonics of f0 weighted by two vowel
// formants, with a short envelope and a small pitch glide. Pure and deterministic: same key, same samples.

import { SAMPLE_RATE } from "./synth.mjs";

const TAU = Math.PI * 2;
// First two formants (Hz) per vowel.
const FORMANTS = { a: [800, 1250], e: [480, 1900], i: [320, 2300], o: [520, 900], u: [360, 780] };
// Per timbre: semitone shift, highest harmonic frequency, formant strength, odd-only harmonics.
const TIMBRE = {
  soft: { shift: 0, maxHz: 2600, formant: 1, odd: false, ring: 0 },
  squeaky: { shift: 5, maxHz: 5200, formant: 1.2, odd: false, ring: 0 },
  deep: { shift: -7, maxHz: 3200, formant: 1.1, odd: false, ring: 0 },
  robot: { shift: 0, maxHz: 4200, formant: 0.35, odd: true, ring: 38 },
};
const BASE_HZ = 220; // A3 at pitch 1

const res = (f, center, bw) => 1 / (1 + ((f - center) / bw) ** 2);

/** True for keys this module synthesizes. */
export const isVoiceKey = (key) => key.startsWith("voice:");

/** Mono Float32 samples for one syllable key. */
export function synthVoice(key) {
  const [, timbre = "soft", vowel = "a", semiStr = "0"] = key.split(":");
  const tb = TIMBRE[timbre] || TIMBRE.soft;
  const [f1, f2] = FORMANTS[vowel] || FORMANTS.a;
  const semi = Number(semiStr) + tb.shift;
  const f0 = BASE_HZ * 2 ** (semi / 12);
  const dur = 0.12;
  const n = Math.ceil(dur * SAMPLE_RATE);
  const out = new Float32Array(n);
  const harmonics = [];
  for (let k = 1; k * f0 < tb.maxHz; k++) {
    if (tb.odd && k % 2 === 0) continue;
    const f = k * f0;
    const shape = 1 - tb.formant + tb.formant * (res(f, f1, 110) + 0.7 * res(f, f2, 170));
    harmonics.push({ k, amp: shape / k ** 0.8, phase: 0 });
  }
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t / 0.008) * Math.min(1, (dur - t) / 0.035);
    const glide = 1 + 0.04 * Math.sin(Math.PI * (t / dur)) - 0.03 * (t / dur); // a little rise and fall
    let v = 0;
    for (const h of harmonics) {
      h.phase += (TAU * h.k * f0 * glide) / SAMPLE_RATE;
      v += h.amp * Math.sin(h.phase);
    }
    if (tb.ring) v *= 0.6 + 0.4 * Math.sin(TAU * tb.ring * t);
    out[i] = v * env;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] *= 0.8 / peak;
  return out;
}
