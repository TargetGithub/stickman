// Audio mixing (spec 17.2). Pure functions over Float32 buffers; no I/O.
// Output is interleaved stereo at 48 kHz. Deterministic for the same inputs.

export const SR = 48000;
export const CEILING = 10 ** (-1 / 20); // -1 dBFS
const HEAVY = new Set(["punch_heavy", "kick_heavy", "explosion", "ko", "land_heavy", "shockwave"]);

/** Constant-power pan: pan -1 (left) .. 1 (right) → [left gain, right gain]. */
export function panGains(pan) {
  const a = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
}

/**
 * Sum SFX events into a stereo buffer.
 * @param {Array<{ t, sfx, volume, pan }>} events  t in video seconds
 * @param {(sfx:string, index:number) => Float32Array} sampleFor  mono samples for an event
 */
export function mixEvents(events, durationSec, sampleFor, { gain = 0.9 } = {}) {
  const frames = Math.ceil(durationSec * SR);
  const out = new Float32Array(frames * 2);
  events.forEach((e, k) => {
    const s = sampleFor(e.sfx, k);
    if (!s) return;
    const [l, r] = panGains(e.pan ?? 0);
    const g = (e.volume ?? 1) * gain;
    const start = Math.round(e.t * SR);
    for (let i = 0; i < s.length && start + i < frames; i++) {
      if (start + i < 0) continue;
      out[(start + i) * 2] += s[i] * g * l;
      out[(start + i) * 2 + 1] += s[i] * g * r;
    }
  });
  return out;
}

/**
 * Music level over time (0..1) from cues: start/stop/duck, smoothed over 0.3 s.
 * Without cues, music plays from 0 if present. A `start` cue first means silence until it.
 */
export function musicLevelAt(t, cues, hasMusic) {
  const sorted = [...cues].sort((a, b) => a.t - b.t);
  let level = hasMusic && !(sorted[0]?.cue === "start") ? 1 : 0;
  let from = level;
  let since = -Infinity;
  for (const c of sorted) {
    if (c.t > t) break;
    const target = c.cue === "start" ? 1 : c.cue === "stop" ? 0 : c.volume ?? 0.4;
    from = level;
    level = target;
    since = c.t;
  }
  const u = Math.min(1, (t - since) / 0.3);
  return from + (level - from) * u;
}

/** Duck factor (≤ 1) for music around heavy SFX: -4 dB, 30 ms attack, 350 ms hold, 200 ms release. */
export function duckAt(t, heavyTimes) {
  let g = 1;
  for (const h of heavyTimes) {
    const d = t - h;
    if (d < -0.03 || d > 0.55) continue;
    const depth = 0.63;
    const k = d < 0 ? 1 - (d + 0.03) / 0.03 : d < 0.35 ? 0 : (d - 0.35) / 0.2;
    g = Math.min(g, depth + (1 - depth) * Math.max(0, Math.min(1, k)));
  }
  return g;
}

/**
 * Add looped music (interleaved stereo) under the mix, with cues, ducking and a final fade-out.
 * @param {Float32Array} music  interleaved stereo at SR
 */
export function addMusic(out, music, { volume = 0.35, cues = [], events = [], fadeOut = 1 }) {
  if (!music || music.length < 4) return;
  const frames = out.length / 2;
  const heavy = events.filter((e) => HEAVY.has(e.sfx)).map((e) => e.t);
  const musicFrames = music.length / 2;
  const total = frames / SR;
  for (let i = 0; i < frames; i++) {
    const t = i / SR;
    const level = musicLevelAt(t, cues, true) * duckAt(t, heavy) * Math.min(1, (total - t) / fadeOut) * volume;
    if (level <= 0) continue;
    const m = (i % musicFrames) * 2;
    out[i * 2] += music[m] * level;
    out[i * 2 + 1] += music[m + 1] * level;
  }
}

/**
 * Lookahead peak limiter, in place: the output never exceeds `ceiling`. Gain drops instantly
 * (ahead of the peak by `lookahead`) and recovers over `release`. Returns the deepest reduction (dB).
 */
export function limit(out, { ceiling = CEILING, lookahead = 0.005, release = 0.05 } = {}) {
  const frames = out.length / 2;
  const need = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    const peak = Math.max(Math.abs(out[i * 2]), Math.abs(out[i * 2 + 1]));
    need[i] = peak > ceiling ? ceiling / peak : 1;
  }
  // Sliding minimum over the next `ahead` frames (monotonic deque).
  const ahead = Math.max(1, Math.round(lookahead * SR));
  const target = new Float32Array(frames);
  const dq = new Int32Array(frames + ahead + 1);
  let head = 0;
  let tail = 0;
  let j = 0;
  for (let i = 0; i < frames; i++) {
    while (j < frames && j <= i + ahead) {
      while (tail > head && need[dq[tail - 1]] >= need[j]) tail--;
      dq[tail++] = j++;
    }
    while (dq[head] < i) head++;
    target[i] = need[dq[head]];
  }
  const rel = 1 - Math.exp(-1 / (release * SR));
  let g = 1;
  let deepest = 1;
  for (let i = 0; i < frames; i++) {
    g = target[i] < g ? target[i] : g + (target[i] - g) * rel;
    deepest = Math.min(deepest, g);
    out[i * 2] *= g;
    out[i * 2 + 1] *= g;
  }
  return 20 * Math.log10(deepest);
}

/** Full mix: events (+ optional music) → limited stereo buffer. */
export const SFX_BUS_GAIN = 1.6; // SFX-only mixes are sparse: drive them up and let the limiter hold -1 dBFS

export function mixdown({ events, durationSec, sampleFor, music = null, musicVolume = 0.35, cues = [], sfxGain = SFX_BUS_GAIN }) {
  const out = mixEvents(events, durationSec, sampleFor, { gain: sfxGain });
  if (music) addMusic(out, music, { volume: musicVolume, cues, events });
  const reductionDb = limit(out);
  return { samples: out, reductionDb };
}

/** Story mixes (S7.6): integrated loudness target for YouTube, kids-friendly (no louder than this). */
export const STORY_LUFS = -16;

/**
 * Story mixdown (S7.3, S7.6): SFX and speech, the music bed (ducked under speech and narration, dipped after a
 * sad defeat, and under heavy hits), the ambience bed (a little lower under speech), then the whole mix is
 * levelled to STORY_LUFS and limited at -1 dBFS.
 * @param {{ events, durationSec, sampleFor, music?:Float32Array, ambience?:Float32Array, duck?:Array<[a,b]>, dips?:Array<[a,b]>,
 *           duckAt?:(t:number, duck, dips)=>number, loudness:(buf)=>object, normalize:(buf, target, opts)=>number }} o
 *   loudness/normalize come from tools/lib/loudness.mjs (passed in to keep this module dependency-free)
 */
export function mixdownStory({ events, durationSec, sampleFor, music = null, ambience = null, duck = [], dips = [], storyDuck, normalize, loudness, targetLufs = STORY_LUFS, musicGain = null, ambienceGain = null }) {
  const out = mixEvents(events, durationSec, sampleFor, { gain: 1 });
  const frames = out.length / 2;
  const heavy = events.filter((e) => HEAVY.has(e.sfx)).map((e) => e.t);
  let gm = 1;
  let ga = 1;
  for (let i = 0; i < frames; i++) {
    if (i % 240 === 0) {
      // Gains every 5 ms: smooth enough for ramps of 150 ms and more.
      const t = i / SR;
      const speech = storyDuck ? storyDuck(t, duck, []) : 1;
      gm = speech * (storyDuck ? storyDuck(t, [], dips) : 1) * duckAt(t, heavy) * (musicGain ? musicGain(t) : 1);
      ga = (0.7 + 0.3 * speech) * (ambienceGain ? ambienceGain(t) : 1); // v3 audio tracks: bus gains and duck rules
    }
    if (music && i * 2 < music.length) {
      out[i * 2] += music[i * 2] * gm;
      out[i * 2 + 1] += music[i * 2 + 1] * gm;
    }
    if (ambience && i * 2 < ambience.length) {
      out[i * 2] += ambience[i * 2] * ga;
      out[i * 2 + 1] += ambience[i * 2 + 1] * ga;
    }
  }
  const gainDb = normalize ? normalize(out, targetLufs, { maxGainDb: 18 }) : 0;
  const reductionDb = limit(out);
  return { samples: out, reductionDb, gainDb, loudness: loudness ? loudness(out) : null };
}

/**
 * Spoken dialogue (SPEECH_SPEC 4.6): for every line in `clips`, its babble syllables are replaced by one clip
 * (panned where the first syllable was) and its narration chime is softened. Other lines keep their babble.
 * @param {Array<{ t, sfx, volume, pan, line? }>} events  engine audio events (babble and chimes carry `line`)
 * @param {Map<string, { t:number, sfx:string|null, volume:number }>} clips  line id → clip event (sfx null: babble removed, no clip)
 */
export function swapSpeech(events, clips, { chime = 0.5 } = {}) {
  const out = [];
  const placed = new Set();
  for (const e of events) {
    const c = e.line != null ? clips.get(e.line) : null;
    if (!c) out.push(e);
    else if (e.sfx === "narrate_chime") out.push({ ...e, volume: e.volume * chime });
    else if (!placed.has(e.line)) {
      if (c.sfx) out.push({ t: c.t, sfx: c.sfx, volume: c.volume, pan: e.pan ?? 0, line: e.line });
      placed.add(e.line);
    }
  }
  // Narration has no babble: its clip goes in on its own.
  for (const [line, c] of clips) if (!placed.has(line) && c.sfx) out.push({ t: c.t, sfx: c.sfx, volume: c.volume, pan: 0, line });
  return out.sort((a, b) => a.t - b.t);
}
