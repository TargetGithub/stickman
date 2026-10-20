// Speech clips (SPEECH_SPEC 4.3): one WAV per spoken line, cached by a hash of everything that changes the
// sound. A backend (piper.mjs, or a fake in tests) renders the raw line; this module trims it, levels it
// to the speech loudness (shout louder, whisper softer) and stores it as 48 kHz mono 16-bit.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readWav, writeWav } from "../wav.mjs";
import { measureLoudness } from "../loudness.mjs";
import { SR } from "../mixer.mjs";

export const CACHE_DIR = fileURLToPath(new URL("../../../assets/speech/cache/", import.meta.url));
export const SPEECH_LUFS = -16;
export const STYLE_DB = { speech: 0, shout: 2, whisper: -6 };
export const NOISE = { scale: 0.333, w: 0.333 }; // fixed Piper noise: the same text always sounds the same
const POST = 2; // bump when the trim or levelling below changes, so old cache files are not reused

/**
 * @typedef {{ id:string, version:string, render:(jobs:Array<{ line:object, out:string, seed:number }>) => void }} TtsBackend
 *   render writes, for each job, a 16-bit PCM WAV at 48 kHz (mono or stereo) of line.spoken in line.voice to `out`;
 *   seed (from the cache key) makes any randomness in the backend repeatable.
 */

// Voice rate × mood rate stays within this range: slower drags words out, faster slurs them.
export const MIN_RATE = 0.75;
export const MAX_RATE = 1.5;

const sorted = (o) => (o && typeof o === "object" && !Array.isArray(o) ? Object.keys(o).sort().map((k) => [k, sorted(o[k])]) : o);

/**
 * What the backend should render for a line: the character's voice with its mood tone applied
 * (rate × tone.rate, pitch + tone.pitch, the tone's noise and sentence pause, the shout speed-up).
 */
export function renderSettings(line) {
  const v = line.voice;
  const t = line.tone || {};
  return {
    rate: Math.round(Math.max(MIN_RATE, Math.min(MAX_RATE, v.rate * (t.rate ?? 1) * (line.bubble === "shout" ? 1.08 : 1))) * 1000) / 1000,
    pitch: Math.max(-12, Math.min(12, (v.pitch ?? 0) + (t.pitch ?? 0))),
    noise: t.noise ?? NOISE.scale,
    noiseW: NOISE.w,
    pause: t.pause ?? 0,
  };
}

/** sha256 of the settings (keys sorted at every level, so the key does not depend on property order). */
export function cacheKey(backend, line) {
  const v = line.voice;
  const parts = { backend: backend.id, version: backend.version, model: v.model, speaker: v.speaker, rate: v.rate, pitch: v.pitch, filter: v.filter ?? null,
    noise: NOISE, style: line.bubble ?? "speech", text: line.spoken, post: POST, ...(line.tone ? { tone: line.tone } : {}) };
  const canon = JSON.stringify(sorted(parts));
  return createHash("sha256").update(canon).digest("hex");
}

/** Mono copy of interleaved samples. */
function mono(samples, channels) {
  if (channels === 1) return samples;
  const out = new Float32Array(samples.length / channels);
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) s += samples[i * channels + c];
    out[i] = s / channels;
  }
  return out;
}

/** Drop silence (below -50 dBFS) at both ends, keeping 30 ms around the voice. */
export function trimSilence(x) {
  const floor = 10 ** (-50 / 20);
  let a = 0;
  let b = x.length - 1;
  while (a < x.length && Math.abs(x[a]) < floor) a++;
  while (b > a && Math.abs(x[b]) < floor) b--;
  if (a >= x.length) return new Float32Array(0);
  const pad = Math.round(0.03 * SR);
  return x.slice(Math.max(0, a - pad), Math.min(x.length, b + 1 + pad));
}

/** Integrated loudness of a mono clip (tiled to 2 s so short words still fill the 400 ms gating blocks). */
export function clipLoudness(x) {
  const frames = Math.max(x.length, 2 * SR);
  const st = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) st[i * 2] = st[i * 2 + 1] = x.length ? x[i % x.length] : 0;
  return measureLoudness(st).integrated;
}

/** Level a mono clip in place to `target` LUFS, peaks held under -1 dBFS. Returns the gain in dB. */
export function levelClip(x, target) {
  const lufs = clipLoudness(x);
  if (!Number.isFinite(lufs)) return 0;
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const db = Math.min(target - lufs, -1 - 20 * Math.log10(peak || 1e-9));
  const g = 10 ** (db / 20);
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return db;
}

/**
 * Render (or reuse) every line's clip.
 * @param {Array<object>} lines  collectLines(...)
 * @param {TtsBackend} backend
 * @returns {Array<object>}  each line plus { key, file, dur, cached }
 */
export function synthesizeLines(lines, backend, { cacheDir = CACHE_DIR, log = () => {} } = {}) {
  mkdirSync(cacheDir, { recursive: true });
  const keyed = lines.map((line) => {
    const key = cacheKey(backend, line);
    const file = join(cacheDir, `${key}.wav`);
    return { line, key, file, cached: existsSync(file) };
  });
  // One render call for every new clip (the backend batches by voice); duplicates render once.
  const todo = [...new Map(keyed.filter((k) => !k.cached).map((k) => [k.key, k])).values()];
  if (todo.length) {
    log(`  rendering ${todo.length} speech clip(s) with ${backend.id} ${backend.version}`);
    const jobs = todo.map((k) => ({ line: k.line, out: join(cacheDir, `${k.key}.raw.wav`), seed: parseInt(k.key.slice(0, 7), 16) }));
    try {
      backend.render(jobs);
      for (const [i, j] of jobs.entries()) {
        const wav = readWav(j.out);
        if (wav.sampleRate !== SR) throw new Error(`backend ${backend.id} wrote ${wav.sampleRate} Hz; expected ${SR}`);
        const clip = trimSilence(mono(wav.samples, wav.channels));
        levelClip(clip, SPEECH_LUFS + (STYLE_DB[j.line.bubble] ?? 0) + (j.line.tone?.gainDb ?? 0));
        writeWav(`${todo[i].file}.tmp`, clip, SR, 1);
        renameSync(`${todo[i].file}.tmp`, todo[i].file);
      }
    } finally {
      for (const j of jobs) rmSync(j.out, { force: true });
    }
  }
  return keyed.map(({ line, key, file, cached }) => {
    const { samples } = readWav(file);
    const dur = samples.length / SR;
    // A voice can garble a short sentence into seconds of noise: flag clips far longer than their text.
    const s = renderSettings(line);
    const expected = (0.075 * line.spoken.length) / s.rate + s.pause * (line.spoken.split(/[.!?]+\s+/).length - 1);
    const odd = dur > 2 * expected + 0.6;
    if (odd && !cached) log(`warning: "${line.spoken}" (${line.voice.model}) is ${dur.toFixed(1)} s, about ${expected.toFixed(1)} s expected: listen to it`);
    return { ...line, key, file, dur, cached, ...(odd ? { odd: true } : {}) };
  });
}

/**
 * Mixer events for spoken lines: { line → { t, sfx: "tts:<key>", volume } }, t from the sim's say / narrate events.
 * Later bubbles of a multi-bubble line map to sfx null (silence their babble, add nothing).
 */
export function speechClips(spoken, simEvents, { lead = 0.3 } = {}) {
  const at = new Map();
  for (const e of simEvents) {
    if (e.type === "say") at.set(e.beatId, e.videoT);
    if (e.type === "world" && e.do === "narrate") at.set(e.beatId, e.videoT + lead);
  }
  const clips = new Map();
  for (const l of spoken) {
    if (!at.has(l.id)) continue;
    clips.set(l.id, { t: at.get(l.id), sfx: `tts:${l.key}`, volume: 1 });
    // The later bubbles of a line spoken as one clip only lose their babble.
    for (const p of (l.parts ?? []).slice(1)) clips.set(p.id, { t: at.get(p.id) ?? at.get(l.id), sfx: null, volume: 0 });
  }
  return clips;
}

/** sampleFor for "tts:<key>" sounds, reading the cache (decoded once). */
export function clipSampler(cacheDir = CACHE_DIR) {
  const seen = new Map();
  return (sfx) => {
    const key = sfx.slice(4);
    if (!seen.has(key)) seen.set(key, readWav(join(cacheDir, `${key}.wav`)).samples);
    return seen.get(key);
  };
}
