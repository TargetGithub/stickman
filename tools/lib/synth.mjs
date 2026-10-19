// Deterministic procedural SFX (spec 17.3, ADR-007). Pure functions → Float32Array mono at 48 kHz.
// Every required SFX key has a recipe built from a few primitives: pitched sine sweeps, filtered
// noise, envelopes and partial stacks. Same key → same samples, always.

import { mulberry32, hash32 } from "../../engine/math.js";

export const SAMPLE_RATE = 48000;
const TAU = Math.PI * 2;

const buf = (seconds) => new Float32Array(Math.ceil(seconds * SAMPLE_RATE));

/** Exponential decay envelope value at time t (s), reaching ~1% after `decay` seconds. */
const expEnv = (t, decay) => Math.exp((-4.6 * t) / decay);
/** Attack/decay envelope: linear rise over `attack`, then exponential decay. */
const adEnv = (t, attack, decay) => (t < attack ? t / attack : expEnv(t - attack, decay));

/** Sine with a pitch sweep f0 → f1 (exponential) over `sweep` seconds. */
function sweepSine(out, { f0, f1, sweep, gain = 1, attack = 0.002, decay = 0.2, start = 0, vibrato = 0, vibratoRate = 0 }) {
  let phase = 0;
  const s0 = Math.floor(start * SAMPLE_RATE);
  for (let i = s0; i < out.length; i++) {
    const t = (i - s0) / SAMPLE_RATE;
    const u = Math.min(1, t / sweep);
    let f = f0 * (f1 / f0) ** u;
    if (vibrato) f *= 1 + vibrato * Math.sin(TAU * vibratoRate * t);
    phase += (TAU * f) / SAMPLE_RATE;
    out[i] += Math.sin(phase) * gain * adEnv(t, attack, decay);
  }
}

/** Filtered noise burst: one-pole low-pass (cutoff Hz, may sweep) and optional high-pass. */
function noise(out, rng, { gain = 1, attack = 0.001, decay = 0.1, lp0 = 8000, lp1 = lp0, hp = 0, start = 0, len = Infinity, am = 0, amRate = 0 }) {
  let low = 0;
  let prev = 0;
  let high = 0;
  const s0 = Math.floor(start * SAMPLE_RATE);
  const end = Math.min(out.length, s0 + Math.floor(len * SAMPLE_RATE));
  for (let i = s0; i < end; i++) {
    const t = (i - s0) / SAMPLE_RATE;
    const u = Math.min(1, t / Math.max(decay, 1e-3));
    const cutoff = lp0 + (lp1 - lp0) * u;
    const a = 1 - Math.exp((-TAU * cutoff) / SAMPLE_RATE);
    low += a * (rng() * 2 - 1 - low);
    let v = low;
    if (hp > 0) {
      const b = Math.exp((-TAU * hp) / SAMPLE_RATE);
      high = b * (high + v - prev);
      prev = v;
      v = high;
    }
    const mod = am ? 1 - am + am * (0.5 + 0.5 * Math.sin(TAU * amRate * t + rng() * 0.2)) : 1;
    out[i] += v * gain * adEnv(t, attack, decay) * mod;
  }
}

/** Stack of decaying sine partials (bells, metal). */
function partials(out, freqs, { gain = 1, decay = 0.5, attack = 0.001, start = 0 }) {
  freqs.forEach((f, k) => sweepSine(out, { f0: f, f1: f, sweep: 1, gain: gain / (k + 1), attack, decay: decay / (1 + k * 0.35), start }));
}

/** Soft saturation for weight. */
function drive(out, amount) {
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * amount) / Math.tanh(amount);
}

function normalize(out, peak = 0.89) {
  let m = 0;
  for (const v of out) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < out.length; i++) out[i] *= peak / m;
  return out;
}

const RECIPES = {
  whoosh: (o, r) => noise(o, r, { gain: 1, attack: 0.12, decay: 0.15, lp0: 600, lp1: 3500, hp: 200 }),
  punch_light: (o, r) => { sweepSine(o, { f0: 170, f1: 60, sweep: 0.06, decay: 0.08 }); noise(o, r, { gain: 0.5, decay: 0.03, lp0: 4000 }); },
  punch_heavy: (o, r) => { sweepSine(o, { f0: 130, f1: 40, sweep: 0.12, decay: 0.18 }); noise(o, r, { gain: 0.7, decay: 0.07, lp0: 2500, lp1: 600 }); drive(o, 2.2); },
  kick_light: (o, r) => { sweepSine(o, { f0: 150, f1: 55, sweep: 0.08, decay: 0.1 }); noise(o, r, { gain: 0.45, decay: 0.04, lp0: 3000 }); },
  kick_heavy: (o, r) => { sweepSine(o, { f0: 110, f1: 35, sweep: 0.15, decay: 0.25 }); noise(o, r, { gain: 0.7, decay: 0.09, lp0: 2000, lp1: 400 }); drive(o, 2.5); },
  block: (o, r) => { partials(o, [620, 930], { decay: 0.07 }); noise(o, r, { gain: 0.6, decay: 0.02, lp0: 6000, hp: 800 }); },
  parry: (o, r) => { partials(o, [1800, 2710, 3640, 4990], { decay: 0.45 }); noise(o, r, { gain: 0.3, decay: 0.02, hp: 2000 }); },
  slash: (o, r) => noise(o, r, { gain: 1, attack: 0.03, decay: 0.12, lp0: 9000, lp1: 2500, hp: 1500 }),
  sword_clash: (o, r) => { partials(o, [1300, 2140, 3170, 4400, 5900], { decay: 0.7 }); noise(o, r, { gain: 0.6, decay: 0.05, hp: 1500 }); },
  land: (o, r) => { sweepSine(o, { f0: 95, f1: 50, sweep: 0.08, decay: 0.12 }); noise(o, r, { gain: 0.5, decay: 0.08, lp0: 900 }); },
  land_heavy: (o, r) => { sweepSine(o, { f0: 75, f1: 30, sweep: 0.2, decay: 0.32 }); noise(o, r, { gain: 0.8, decay: 0.25, lp0: 700, lp1: 200 }); drive(o, 2); },
  explosion: (o, r) => { noise(o, r, { gain: 1, attack: 0.005, decay: 1.1, lp0: 3000, lp1: 250 }); sweepSine(o, { f0: 70, f1: 30, sweep: 0.6, decay: 0.9, gain: 0.8 }); drive(o, 3); },
  energy_charge: (o) => sweepSine(o, { f0: 180, f1: 820, sweep: 1.0, attack: 0.3, decay: 0.8, vibrato: 0.04, vibratoRate: 9 }),
  energy_fire: (o, r) => { sweepSine(o, { f0: 950, f1: 180, sweep: 0.35, decay: 0.35 }); noise(o, r, { gain: 0.4, decay: 0.25, lp0: 5000, hp: 600 }); },
  shockwave: (o, r) => { sweepSine(o, { f0: 130, f1: 28, sweep: 0.5, decay: 0.6 }); noise(o, r, { gain: 0.6, attack: 0.01, decay: 0.5, lp0: 1200, lp1: 150 }); drive(o, 2); },
  ko: (o, r) => { sweepSine(o, { f0: 90, f1: 40, sweep: 0.2, decay: 0.3 }); partials(o, [220, 331, 442, 663], { gain: 0.8, decay: 1.6, start: 0.02 }); noise(o, r, { gain: 0.3, decay: 0.1, lp0: 1500 }); },
  bell: (o) => partials(o, [880, 1320, 1765, 2640], { decay: 1.3 }),
  pop: (o) => sweepSine(o, { f0: 380, f1: 950, sweep: 0.04, decay: 0.05 }),
  boing: (o) => sweepSine(o, { f0: 210, f1: 170, sweep: 0.5, decay: 0.5, vibrato: 0.35, vibratoRate: 14 }),
  slip: (o, r) => noise(o, r, { gain: 1, attack: 0.02, decay: 0.28, lp0: 7000, lp1: 1200, hp: 900 }),
  crowd_cheer: (o, r) => { noise(o, r, { gain: 1, attack: 0.5, decay: 1.6, lp0: 2200, hp: 300, am: 0.45, amRate: 7 }); noise(o, r, { gain: 0.5, attack: 0.6, decay: 1.4, lp0: 900, hp: 150, am: 0.3, amRate: 3.3 }); },
  crowd_gasp: (o, r) => noise(o, r, { gain: 1, attack: 0.08, decay: 0.45, lp0: 1800, lp1: 700, hp: 250 }),
  // Objects (S4).
  bubble_blow: (o, r) => noise(o, r, { gain: 0.8, attack: 0.08, decay: 0.35, lp0: 1400, lp1: 900, hp: 300, am: 0.3, amRate: 11 }),
  bubble_pop: (o) => { sweepSine(o, { f0: 900, f1: 1800, sweep: 0.025, decay: 0.04, gain: 0.8 }); sweepSine(o, { f0: 2400, f1: 2400, sweep: 1, decay: 0.03, gain: 0.3 }); },
  racket_hit: (o, r) => { sweepSine(o, { f0: 520, f1: 380, sweep: 0.05, decay: 0.08 }); noise(o, r, { gain: 0.5, decay: 0.03, lp0: 5000, hp: 1200 }); },
  ball_bounce: (o) => sweepSine(o, { f0: 220, f1: 140, sweep: 0.06, decay: 0.09 }),
  door_open: (o, r) => { sweepSine(o, { f0: 320, f1: 520, sweep: 0.5, decay: 0.55, gain: 0.5, vibrato: 0.05, vibratoRate: 23 }); noise(o, r, { gain: 0.3, decay: 0.2, lp0: 1200, start: 0.42 }); },
  car_pass: (o, r) => { sweepSine(o, { f0: 90, f1: 70, sweep: 1.2, attack: 0.4, decay: 0.9, gain: 0.7 }); noise(o, r, { gain: 0.6, attack: 0.5, decay: 0.8, lp0: 700, lp1: 400 }); },
  // Story narration (S2): a soft two-note "page" chime.
  narrate_chime: (o) => { partials(o, [1318.5, 2637, 3955], { gain: 0.7, decay: 0.9, attack: 0.01 }); partials(o, [1975.5, 3951], { gain: 0.6, decay: 0.8, attack: 0.01, start: 0.11 }); },
  // Defeat styles and activities (S5): a rising twinkle, a metal cage landing, a soft ball kick.
  sparkle: (o) => { for (let k = 0; k < 5; k++) partials(o, [1400 + k * 260, 2800 + k * 520], { gain: 0.35, decay: 0.25, attack: 0.005, start: k * 0.09 }); },
  clang: (o, r) => { partials(o, [310, 467, 733, 1120], { gain: 0.8, decay: 0.9, attack: 0.002 }); noise(o, r, { gain: 0.5, decay: 0.05, lp0: 4000 }); },
  ball_kick: (o, r) => { sweepSine(o, { f0: 160, f1: 70, sweep: 0.06, decay: 0.1 }); noise(o, r, { gain: 0.4, decay: 0.04, lp0: 2000 }); },
  step: (o, r) => { sweepSine(o, { f0: 120, f1: 80, sweep: 0.03, decay: 0.05, gain: 0.7 }); noise(o, r, { gain: 0.35, decay: 0.025, lp0: 2500 }); },
  // Story sounds (S7): footsteps by weight, feelings, magic, cards and cartoon impacts (kids).
  footstep_soft: (o, r) => { sweepSine(o, { f0: 105, f1: 72, sweep: 0.04, decay: 0.05, gain: 0.55 }); noise(o, r, { gain: 0.3, decay: 0.03, lp0: 1500 }); },
  footstep_hard: (o, r) => { sweepSine(o, { f0: 140, f1: 65, sweep: 0.06, decay: 0.08 }); noise(o, r, { gain: 0.45, decay: 0.045, lp0: 3200 }); partials(o, [880], { gain: 0.12, decay: 0.03 }); },
  sad_sting: (o) => { [440, 349.2, 293.7].forEach((f, k) => partials(o, [f, f * 2, f * 3], { gain: 0.7, decay: 1.3, attack: 0.02, start: k * 0.32 })); },
  heartbeat: (o) => { sweepSine(o, { f0: 70, f1: 42, sweep: 0.08, decay: 0.16 }); sweepSine(o, { f0: 62, f1: 40, sweep: 0.08, decay: 0.14, gain: 0.75, start: 0.24 }); },
  magic_sparkle: (o, r) => { for (let k = 0; k < 8; k++) partials(o, [1200 + k * 280, 2400 + k * 560], { gain: 0.3, decay: 0.3, attack: 0.004, start: k * 0.07 }); noise(o, r, { gain: 0.12, attack: 0.2, decay: 0.6, lp0: 9000, hp: 5000 }); },
  gasp: (o, r) => noise(o, r, { gain: 1, attack: 0.12, decay: 0.22, lp0: 1200, lp1: 3000, hp: 600 }),
  laugh_small: (o, r) => { for (let k = 0; k < 3; k++) { sweepSine(o, { f0: 330 - k * 15, f1: 300 - k * 15, sweep: 0.08, attack: 0.01, decay: 0.07, gain: 0.6, start: k * 0.14 }); noise(o, r, { gain: 0.25, attack: 0.01, decay: 0.06, lp0: 2200, hp: 500, start: k * 0.14, len: 0.1 }); } },
  cry_small: (o) => { sweepSine(o, { f0: 440, f1: 330, sweep: 0.45, attack: 0.05, decay: 0.45, gain: 0.6, vibrato: 0.04, vibratoRate: 7 }); sweepSine(o, { f0: 420, f1: 320, sweep: 0.4, attack: 0.05, decay: 0.4, gain: 0.45, vibrato: 0.04, vibratoRate: 7, start: 0.5 }); },
  // Dog sounds (A1, Becky): a woof is a falling tone with a breathy noise burst; a yap is the same, higher.
  bark: (o, r) => { sweepSine(o, { f0: 520, f1: 290, sweep: 0.13, attack: 0.006, decay: 0.13, gain: 0.7 }); sweepSine(o, { f0: 1040, f1: 580, sweep: 0.13, attack: 0.006, decay: 0.1, gain: 0.25 }); noise(o, r, { gain: 0.5, attack: 0.004, decay: 0.09, lp0: 1600, lp1: 900, hp: 250 }); },
  bark_small: (o, r) => { sweepSine(o, { f0: 980, f1: 640, sweep: 0.08, attack: 0.004, decay: 0.08, gain: 0.6 }); noise(o, r, { gain: 0.35, attack: 0.003, decay: 0.05, lp0: 2600, hp: 500 }); },
  whimper: (o) => { sweepSine(o, { f0: 880, f1: 700, sweep: 0.35, attack: 0.04, decay: 0.35, gain: 0.45, vibrato: 0.03, vibratoRate: 9 }); sweepSine(o, { f0: 820, f1: 640, sweep: 0.3, attack: 0.04, decay: 0.3, gain: 0.35, vibrato: 0.03, vibratoRate: 9, start: 0.4 }); },
  growl_soft: (o, r) => { sweepSine(o, { f0: 115, f1: 105, sweep: 0.7, attack: 0.08, decay: 0.7, gain: 0.45 }); noise(o, r, { gain: 0.4, attack: 0.08, decay: 0.7, lp0: 650, hp: 80, am: 0.8, amRate: 28 }); },
  pant: (o, r) => { for (let k = 0; k < 4; k++) noise(o, r, { gain: 0.35, attack: 0.02, decay: 0.08, lp0: 4200, hp: 1400, start: k * 0.16, len: 0.12 }); },
  card_whoosh: (o, r) => { noise(o, r, { gain: 1, attack: 0.2, decay: 0.3, lp0: 400, lp1: 2600, hp: 150 }); partials(o, [1568, 2349], { gain: 0.15, decay: 0.5, attack: 0.02, start: 0.18 }); },
  bonk: (o) => { partials(o, [520, 1180], { decay: 0.12 }); sweepSine(o, { f0: 300, f1: 180, sweep: 0.06, decay: 0.08, gain: 0.6 }); },
  pow: (o, r) => { sweepSine(o, { f0: 300, f1: 90, sweep: 0.1, decay: 0.15 }); noise(o, r, { gain: 0.6, decay: 0.05, lp0: 3000 }); drive(o, 2); },
  // Doopi & Friends, batch A5: the Gloom Horn, a comic sneeze, the crystal chime.
  gloom_horn: (o, r) => {
    // A low brassy blast on D3 that wobbles, then falls a minor third to B2; a mist hiss underneath.
    for (const [k, g] of [[1, 0.8], [2, 0.45], [3, 0.3], [4, 0.15]]) {
      sweepSine(o, { f0: 146.8 * k, f1: 146.8 * k, sweep: 1, attack: 0.12, decay: 1.4, gain: g, vibrato: 0.018, vibratoRate: 5.5 });
      sweepSine(o, { f0: 146.8 * k, f1: 123.5 * k, sweep: 0.5, attack: 0.05, decay: 1.2, gain: g * 0.9, vibrato: 0.03, vibratoRate: 4.5, start: 0.75 });
    }
    drive(o, 2.2);
    noise(o, r, { gain: 0.25, attack: 0.5, decay: 1.6, lp0: 2400, lp1: 900, hp: 400, start: 0.3 });
  },
  sneeze: (o, r) => {
    // "ah" (rising), "ah" (higher), then a sharp noisy "CHOO" at 0.75 s.
    sweepSine(o, { f0: 300, f1: 360, sweep: 0.2, attack: 0.04, decay: 0.2, gain: 0.45 });
    noise(o, r, { gain: 0.2, attack: 0.05, decay: 0.18, lp0: 1500, hp: 300, len: 0.22 });
    sweepSine(o, { f0: 360, f1: 470, sweep: 0.25, attack: 0.04, decay: 0.25, gain: 0.55, start: 0.32 });
    noise(o, r, { gain: 0.25, attack: 0.05, decay: 0.22, lp0: 1800, hp: 300, start: 0.32, len: 0.28 });
    noise(o, r, { gain: 1, attack: 0.006, decay: 0.16, lp0: 7000, lp1: 2500, hp: 900, start: 0.75 });
    sweepSine(o, { f0: 420, f1: 230, sweep: 0.18, attack: 0.01, decay: 0.2, gain: 0.5, start: 0.77 });
  },
  crystal_chime: (o) => { [1046.5, 1318.5, 1568, 2093].forEach((f, k) => partials(o, [f, f * 2.76, f * 5.4], { gain: 0.6, decay: 1.1, attack: 0.003, start: k * 0.09 })); },
};

const LENGTH = { gloom_horn: 2.4, sneeze: 1.2, crystal_chime: 1.5, whimper: 0.9, growl_soft: 0.9, pant: 0.75, sad_sting: 2.2, heartbeat: 0.6, magic_sparkle: 1.2, gasp: 0.5, laugh_small: 0.6, cry_small: 1.1, card_whoosh: 0.8, narrate_chime: 1.2, car_pass: 1.6, door_open: 0.8, bubble_blow: 0.6, explosion: 1.6, ko: 2.0, bell: 1.6, crowd_cheer: 2.4, energy_charge: 1.2, sword_clash: 1.0, parry: 0.7, boing: 0.7, shockwave: 0.9, land_heavy: 0.6, crowd_gasp: 0.8, sparkle: 0.8, clang: 1.0 };

export const RECIPE_KEYS = Object.keys(RECIPES);

/** Samples for one SFX key (mono Float32, normalized to -1 dBFS). */
export function synthesize(key) {
  const recipe = RECIPES[key];
  if (!recipe) throw new Error(`no SFX recipe for '${key}'`);
  const out = buf(LENGTH[key] ?? 0.45);
  recipe(out, mulberry32(hash32(`sfx:${key}`)));
  // 5 ms fade-out so nothing clicks at the end of the buffer.
  const fade = Math.floor(0.005 * SAMPLE_RATE);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return normalize(out);
}
