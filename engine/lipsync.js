// Lip-sync (STORY_SPEC 7.1a, ADR-032). Milestone: S2 follow-up.
// Which mouth shape (viseme) a talking character shows at a moment of a spoken line. Pure and
// deterministic: computed at render time from the say event and either
//   - an audio track the host passes to load() (a TTS clip's loudness envelope plus its spoken text), or
//   - the line's babble syllables (engine/story/speech.js), so silent and babble renders still talk.
// The viseme set is catalog data (catalog/characters/visemes.json); "rest" means the face's own mouth.

export const REST = "rest";
export const LEAD = 0.03; // s: mouths move a frame or two before the sound, as animators draw them
const VOICED = 0.15; // envelope level (of the line's loud level) above which the voice sounds
const FILL_GAP = 0.08; // s: quieter gaps shorter than this stay voiced (unvoiced consonants)
const MIN_ISLAND = 0.04; // s: voiced blips shorter than this are dropped
const CONSONANT_K = 0.6; // how far a consonant shape opens, against a vowel's 0.4..1
const ONSET = 0.05; // s a syllable's leading consonant shows before its vowel (babble timing)
const VOWEL = /[aeiouy]/;

/**
 * Grapheme → viseme lookup from the catalog's viseme set.
 * @param {Record<string, { letters?:string[] }>} visemes
 * @returns {{ map: Map<string, string>, longest: number }}
 */
export function visemeTable(visemes) {
  const map = new Map();
  let longest = 1;
  for (const name of Object.keys(visemes || {}).sort()) {
    for (const g of visemes[name].letters || []) {
      map.set(g, name);
      longest = Math.max(longest, g.length);
    }
  }
  return { map, longest };
}

/**
 * One entry per letter of the text (non-letters dropped): { v, vowel, group }.
 * Longest graphemes win ("th" before "t"); a letter with no viseme ("h") takes its neighbour's.
 * group: the index of the vowel group (as speech.js counts them) a vowel letter belongs to, else -1.
 */
export function letterVisemes(text, table) {
  const s = String(text).toLowerCase();
  const out = [];
  let group = -1;
  let inVowels = false;
  for (let i = 0; i < s.length; ) {
    if (!/[a-z]/.test(s[i])) {
      inVowels = false;
      i++;
      continue;
    }
    let len = Math.min(table.longest, s.length - i);
    while (len > 1 && !table.map.has(s.slice(i, i + len))) len--;
    const v = table.map.get(s.slice(i, i + len)) ?? null;
    for (let k = 0; k < len; k++) {
      const vowel = VOWEL.test(s[i + k]);
      if (vowel && !inVowels) group++;
      inVowels = vowel;
      out.push({ v, vowel, group: vowel ? group : -1 });
    }
    i += len;
  }
  // Letters without a shape borrow the one before (or after, at the start).
  for (let i = 0; i < out.length; i++) if (out[i].v === null) out[i].v = out[i - 1]?.v ?? null;
  for (let i = out.length - 1; i >= 0; i--) if (out[i].v === null) out[i].v = out[i + 1]?.v ?? REST;
  return out;
}

/** Sorted copy's q-quantile (0..1). */
function quantile(xs, q) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0;
}

/**
 * Plan for a line with recorded audio: one shape per envelope sample.
 * The voiced samples are spread over the text's letters in order, so pauses in the audio (commas,
 * sentence breaks) close the mouth and the letters after them line up again.
 * @param {{ text:string, env:number[], hz:number }} track  env: loudness (RMS) per 1/hz s
 * @returns {{ kind:"audio", hz:number, frames:Array<{ v:string, k:number }> }}
 */
export function audioPlan(track, table) {
  const hz = track.hz;
  const raw = track.env || [];
  const env = raw.map((_, i) => ((raw[i - 1] ?? raw[i]) + raw[i] + (raw[i + 1] ?? raw[i])) / 3);
  const loud = quantile(env.filter((x) => x > 0), 0.9) || 1;
  const level = env.map((x) => Math.min(1, x / loud));
  const voiced = level.map((x) => x > VOICED);
  // Close short gaps, then drop short islands.
  const runs = (want) => {
    const out = [];
    for (let i = 0; i < voiced.length; ) {
      let j = i;
      while (j < voiced.length && voiced[j] === want) j++;
      if (voiced[i] === want) out.push([i, j]);
      i = Math.max(j, i + 1);
    }
    return out;
  };
  for (const [a, b] of runs(false)) if (a > 0 && b < voiced.length && b - a < FILL_GAP * hz) voiced.fill(true, a, b);
  for (const [a, b] of runs(true)) if (b - a < MIN_ISLAND * hz) voiced.fill(false, a, b);
  const letters = letterVisemes(track.text, table);
  const total = voiced.filter(Boolean).length;
  const frames = [];
  let seen = 0;
  for (let i = 0; i < voiced.length; i++) {
    if (!voiced[i] || !letters.length) {
      frames.push({ v: REST, k: 0 });
      continue;
    }
    const at = letters[Math.min(letters.length - 1, Math.floor(((seen + 0.5) / total) * letters.length))];
    seen++;
    frames.push({ v: at.v, k: at.vowel ? Math.min(1, 0.4 + level[i]) : CONSONANT_K });
  }
  return { kind: "audio", hz, frames };
}

/**
 * Plan for a line without audio, from its babble syllables: each syllable shows its vowel group's shape,
 * led in by the consonant just before that group when it has its own shape (m, f, l, w...).
 * @param {Array<{ t:number, dur:number }>} sylls  syllables(...) of the line
 * @returns {{ kind:"text", keys:Array<{ t0:number, t1:number, v:string, k:number }> }}
 */
export function textPlan(sylls, text, table) {
  const letters = letterVisemes(text, table);
  const groups = [];
  letters.forEach((l, i) => {
    if (l.group < 0 || groups[l.group]) return;
    const before = letters[i - 1];
    groups[l.group] = { v: l.v, onset: before && !before.vowel && before.v !== l.v ? before.v : null };
  });
  const keys = [];
  let end = -Infinity;
  sylls.forEach((s, i) => {
    const g = groups[Math.floor((i * groups.length) / sylls.length)] ?? { v: "A", onset: null };
    if (g.onset) {
      const t0 = Math.max(end, s.t - ONSET);
      if (s.t > t0) keys.push({ t0, t1: s.t, v: g.onset, k: CONSONANT_K });
    }
    keys.push({ t0: s.t, t1: s.t + s.dur, v: g.v, k: 1 });
    end = s.t + s.dur;
  });
  return { kind: "text", keys };
}

/**
 * The shape at `age` seconds into the line.
 * @returns {{ v:string, k:number }}  k: how far the shape opens (0..1)
 */
export function visemeAt(plan, age) {
  const t = age + LEAD;
  if (plan.kind === "audio") return plan.frames[Math.floor(t * plan.hz)] ?? { v: REST, k: 0 };
  for (const key of plan.keys) if (t >= key.t0 && t < key.t1) return { v: key.v, k: key.k };
  return { v: REST, k: 0 };
}
