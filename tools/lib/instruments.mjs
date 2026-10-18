// Instrument patches for the music generator (STORY_SPEC 15, S7.2). Pure and deterministic: each note is
// rendered into an interleaved stereo Float32Array at 48 kHz. Bright, soft timbres for a kids audience:
// band-limited oscillators (polyBLEP), plucked strings (Karplus-Strong), FM bells, detuned pads, and drums.

import { mulberry32, hash32 } from "../../engine/math.js";

export const SR = 48000;
const TAU = Math.PI * 2;
export const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

/** polyBLEP correction for a discontinuity at phase 0 (t in [0,1), dt = f / SR). */
function blep(t, dt) {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

/** Band-limited oscillator sample; state { ph } (0..1). shape: saw | pulse (with width) | tri | sine. */
function osc(st, f, shape, width = 0.5) {
  const dt = f / SR;
  const t = st.ph;
  let v;
  if (shape === "sine") v = Math.sin(TAU * t);
  else if (shape === "tri") v = 1 - 4 * Math.abs(t - 0.5);
  else if (shape === "saw") v = 2 * t - 1 - blep(t, dt);
  else {
    // Centred: a pulse narrower than half has a mean of 2w-1, which would be a DC offset.
    v = (t < width ? 1 : -1) + blep(t, dt) - blep((t - width + 1) % 1, dt) - (2 * width - 1);
  }
  st.ph = (t + dt) % 1;
  return v;
}

/** ADSR envelope at time t for a note held `hold` seconds. */
function adsr(t, hold, a, d, s, r) {
  let v;
  if (t < a) v = t / a;
  else if (t < a + d) v = 1 - (1 - s) * ((t - a) / d);
  else v = s;
  if (t > hold) {
    const lvl = hold < a ? hold / a : hold < a + d ? 1 - (1 - s) * ((hold - a) / d) : s;
    v = lvl * Math.max(0, 1 - (t - hold) / r);
  }
  return v;
}

const lpCoef = (hz) => 1 - Math.exp((-TAU * Math.min(hz, SR * 0.45)) / SR);

/** Synth voices: { shape, width, mix: [[shape, ratio, gain], ...], adsr, cutoff, env (filter envelope), vibrato, detune }. */
const SYNTH = {
  square_soft: { shape: "pulse", width: 0.5, adsr: [0.01, 0.15, 0.55, 0.12], cutoff: 3200, vibrato: [0.004, 5.5, 0.2], gain: 0.55 },
  square: { shape: "pulse", width: 0.5, adsr: [0.004, 0.1, 0.6, 0.08], cutoff: 4800, vibrato: [0.003, 6, 0.15], gain: 0.5 },
  toy: { shape: "tri", mix: [["pulse", 1, 0.35]], adsr: [0.003, 0.12, 0.25, 0.08], cutoff: 5200, gain: 0.7 },
  flute: { shape: "sine", mix: [["sine", 2, 0.22], ["sine", 3, 0.06]], adsr: [0.06, 0.2, 0.8, 0.2], cutoff: 6000, vibrato: [0.005, 5, 0.25], breath: 0.04, gain: 0.75 },
  reed: { shape: "pulse", width: 0.25, adsr: [0.03, 0.2, 0.7, 0.12], cutoff: 1900, vibrato: [0.003, 5, 0.3], gain: 0.55 },
  brass: { shape: "saw", adsr: [0.03, 0.18, 0.75, 0.14], cutoff: 1500, env: [3200, 0.09], vibrato: [0.004, 5.5, 0.3], gain: 0.45 },
  soft_bass: { shape: "sine", mix: [["sine", 2, 0.3]], adsr: [0.015, 0.2, 0.85, 0.12], cutoff: 1200, gain: 0.9 },
  bouncy_bass: { shape: "tri", adsr: [0.004, 0.18, 0.35, 0.08], cutoff: 2000, drop: 0.03, gain: 0.95 },
  saw_bass: { shape: "saw", adsr: [0.005, 0.15, 0.7, 0.07], cutoff: 700, env: [1800, 0.06], drive: 1.6, gain: 0.55 },
  pulse_bass: { shape: "pulse", width: 0.3, adsr: [0.005, 0.12, 0.6, 0.06], cutoff: 1100, gain: 0.55 },
  warm_pad: { shape: "saw", detune: [-0.006, 0.007], adsr: [0.45, 0.4, 0.8, 0.6], cutoff: 1700, poles: 2, gain: 0.32 },
  soft_pad: { shape: "tri", detune: [-0.005, 0.005], adsr: [0.5, 0.4, 0.85, 0.7], cutoff: 2600, gain: 0.45 },
  dark_pad: { shape: "saw", detune: [-0.008, 0.006], adsr: [0.5, 0.5, 0.75, 0.7], cutoff: 850, poles: 2, gain: 0.38 },
};
/** FM bells: carrier sine, modulator at `ratio`, index decaying with the note. */
const FM = {
  bell: { ratio: 3.5, index: 1.5, decay: 1.4, gain: 0.45 },
  music_box: { ratio: 5.0, index: 1.6, decay: 1.1, gain: 0.5 },
  glass: { ratio: 2.0, index: 1.4, decay: 1.8, gain: 0.45 },
};
/** Plucked strings: brightness (low-pass in the loop) and loss. */
// excite: one-pole smoothing of the noise burst that starts the string (lower = rounder attack).
const PLUCK = {
  pluck: { bright: 0.5, loss: 0.996, excite: 0.25, gain: 0.75 },
  pluck_high: { bright: 0.6, loss: 0.994, excite: 0.4, gain: 0.5 },
  pluck_dark: { bright: 0.4, loss: 0.995, excite: 0.18, gain: 0.7 },
};

/** Constant-power pan gains. */
function pan(p) {
  const a = ((Math.max(-1, Math.min(1, p)) + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
}

function synthNote(out, n, v) {
  const f = midiHz(n.midi);
  const [a, d, s, r] = v.adsr;
  const len = Math.min(Math.ceil((n.dur + r) * SR), out.length / 2 - Math.round(n.t * SR));
  const start = Math.round(n.t * SR);
  const voices = v.detune ? v.detune.map((dt, k) => ({ f: f * (1 + dt), ph: (k * 0.37) % 1, side: k ? 0.8 : -0.8 })) : [{ f, ph: 0, side: 0 }];
  const extra = (v.mix || []).map(([shape, ratio, gain]) => ({ shape, ratio, gain, ph: 0 }));
  const lp = { a: 0, b: 0 };
  const rng = v.breath ? mulberry32(hash32(`breath:${n.midi}:${n.t}`)) : null;
  const [gl, gr] = pan(n.pan ?? 0);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = adsr(t, n.dur, a, d, s, r);
    if (env <= 0 && t > n.dur) break;
    const vib = v.vibrato && t > v.vibrato[2] ? 1 + v.vibrato[0] * Math.sin(TAU * v.vibrato[1] * t) : 1;
    const drop = v.drop ? 1 + v.drop * Math.exp(-t * 60) : 1;
    let L = 0;
    let R = 0;
    for (const vo of voices) {
      const x = osc(vo, vo.f * vib * drop, v.shape, v.width);
      L += x * (1 - vo.side) * 0.5;
      R += x * (1 + vo.side) * 0.5;
    }
    let m = 0;
    for (const e of extra) m += osc(e, f * e.ratio * vib, e.shape) * e.gain;
    if (rng) m += (rng() * 2 - 1) * v.breath * env;
    const cutoff = v.env ? v.cutoff + (v.env[0] - v.cutoff) * Math.exp(-t / v.env[1]) : v.cutoff;
    const c = lpCoef(cutoff);
    // One- or two-pole low-pass on the (mono-summed) voices; detuned pads keep their stereo spread by mixing back.
    const mono = (L + R) * 0.5 + m;
    lp.a += c * (mono - lp.a);
    let y = lp.a;
    if (v.poles === 2) {
      lp.b += c * (lp.a - lp.b);
      y = lp.b;
    }
    if (v.drive) y = Math.tanh(y * v.drive) / Math.tanh(v.drive);
    const spread = voices.length > 1 ? (L - R) * 0.35 * c : 0;
    const g = env * v.gain * n.vel;
    out[(start + i) * 2] += (y + spread) * g * gl * 1.41;
    out[(start + i) * 2 + 1] += (y - spread) * g * gr * 1.41;
  }
}

function fmNote(out, n, v) {
  const f = midiHz(n.midi);
  const start = Math.round(n.t * SR);
  const len = Math.min(Math.ceil((v.decay + 0.05) * SR), out.length / 2 - start);
  const [gl, gr] = pan(n.pan ?? 0);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.002) * Math.exp((-4.6 * t) / v.decay);
    const idx = v.index * Math.exp((-3 * t) / v.decay);
    pm += (TAU * f * v.ratio) / SR;
    pc += (TAU * f) / SR;
    const y = Math.sin(pc + idx * Math.sin(pm)) * env * v.gain * n.vel;
    out[(start + i) * 2] += y * gl * 1.41;
    out[(start + i) * 2 + 1] += y * gr * 1.41;
  }
}

function pluckNote(out, n, v) {
  const f = midiHz(n.midi);
  const period = Math.max(2, Math.round(SR / f));
  const rng = mulberry32(hash32(`pluck:${n.midi}:${Math.round(n.t * 1000)}`));
  const line = new Float32Array(period);
  let sm = 0;
  let peak = 1e-9;
  for (let i = 0; i < period; i++) {
    sm += v.excite * (rng() * 2 - 1 - sm);
    line[i] = sm;
    peak = Math.max(peak, Math.abs(sm));
  }
  for (let i = 0; i < period; i++) line[i] /= peak;
  const start = Math.round(n.t * SR);
  const len = Math.min(Math.ceil((n.dur + 0.4) * SR), out.length / 2 - start);
  const [gl, gr] = pan(n.pan ?? 0);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const k = i % period;
    const x = line[k];
    const y = (x * v.bright + prev * (1 - v.bright)) * v.loss;
    prev = x;
    line[k] = y;
    const t = i / SR;
    const env = Math.min(1, t / 0.002) * (t > n.dur ? Math.max(0, 1 - (t - n.dur) / 0.4) : 1);
    const s = x * env * v.gain * n.vel;
    out[(start + i) * 2] += s * gl * 1.41;
    out[(start + i) * 2 + 1] += s * gr * 1.41;
  }
}

/** Drum hits: kick, snare, hat, open hat, tom. */
function drumNote(out, n) {
  const start = Math.round(n.t * SR);
  const rng = mulberry32(hash32(`drum:${n.inst}:${Math.round(n.t * 1000)}`));
  const len = { kick: 0.35, snare: 0.25, hat: 0.06, open: 0.3, tom: 0.3 }[n.inst];
  const count = Math.min(Math.ceil(len * SR), out.length / 2 - start);
  const [gl, gr] = pan(n.pan ?? 0);
  let ph = 0;
  let lp = 0;
  let hpPrev = 0;
  let hp = 0;
  for (let i = 0; i < count; i++) {
    const t = i / SR;
    let y = 0;
    if (n.inst === "kick") {
      ph += (TAU * (45 + 85 * Math.exp(-t * 28))) / SR;
      y = (Math.sin(ph) * Math.exp(-t * 11) + (rng() * 2 - 1) * 0.08 * Math.exp(-t * 200)) * 0.75;
    } else if (n.inst === "tom") {
      ph += (TAU * (110 + 60 * Math.exp(-t * 20))) / SR;
      y = Math.sin(ph) * Math.exp(-t * 12) * 0.8;
    } else if (n.inst === "snare") {
      ph += (TAU * 185) / SR;
      lp += 0.3 * (rng() * 2 - 1 - lp);
      y = Math.sin(ph) * 0.35 * Math.exp(-t * 30) + lp * 0.6 * Math.exp(-t * 20);
    } else {
      const noise = rng() * 2 - 1;
      hp = 0.85 * (hp + noise - hpPrev);
      hpPrev = noise;
      lp += 0.55 * (hp - lp); // soften the top: bright, not hissy
      y = lp * (n.inst === "hat" ? 0.2 : 0.16) * Math.exp(-t * (n.inst === "hat" ? 70 : 12));
    }
    const s = y * n.vel * 0.8;
    out[(start + i) * 2] += s * gl * 1.41;
    out[(start + i) * 2 + 1] += s * gr * 1.41;
  }
}

export const DRUMS = ["kick", "snare", "hat", "open", "tom"];
export const PATCHES = [...Object.keys(SYNTH), ...Object.keys(FM), ...Object.keys(PLUCK)];

/** Render one note { inst, t, dur, midi, vel, pan } into an interleaved stereo buffer. */
export function renderNote(out, n) {
  if (n.t * SR >= out.length / 2) return;
  if (DRUMS.includes(n.inst)) drumNote(out, n);
  else if (SYNTH[n.inst]) synthNote(out, n, SYNTH[n.inst]);
  else if (FM[n.inst]) fmNote(out, n, FM[n.inst]);
  else if (PLUCK[n.inst]) pluckNote(out, n, PLUCK[n.inst]);
  else throw new Error(`no instrument '${n.inst}'`);
}

/**
 * A small stereo room (Schroeder: four combs and two all-passes per side), mixed in place.
 * Gives the dry synths some air without washing out the rhythm.
 */
export function addRoom(buf, { wet = 0.16, size = 0.78, damp = 0.35 } = {}) {
  const frames = buf.length / 2;
  const combs = [[1116, 1188, 1277, 1356], [1139, 1211, 1300, 1379]];
  const alls = [[556, 441], [579, 464]];
  for (let ch = 0; ch < 2; ch++) {
    const cb = combs[ch].map((n) => ({ buf: new Float32Array(n), i: 0, lp: 0 }));
    const ab = alls[ch].map((n) => ({ buf: new Float32Array(n), i: 0 }));
    for (let k = 0; k < frames; k++) {
      const x = buf[k * 2 + ch] * 0.2;
      let y = 0;
      for (const c of cb) {
        const o = c.buf[c.i];
        c.lp = o * (1 - damp) + c.lp * damp;
        c.buf[c.i] = x + c.lp * size;
        c.i = (c.i + 1) % c.buf.length;
        y += o;
      }
      for (const a of ab) {
        const o = a.buf[a.i];
        a.buf[a.i] = y + o * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        y = o - y * 0.5;
      }
      buf[k * 2 + ch] += y * wet;
    }
  }
}

/** First-order DC blocker (about 25 Hz) on an interleaved stereo buffer, in place. */
export function dcBlock(buf) {
  const r = 1 - (2 * Math.PI * 25) / SR;
  for (let ch = 0; ch < 2; ch++) {
    let x1 = 0;
    let y1 = 0;
    for (let i = ch; i < buf.length; i += 2) {
      const y = buf[i] - x1 + r * y1;
      x1 = buf[i];
      y1 = y;
      buf[i] = y;
    }
  }
}
