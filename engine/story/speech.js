// Speech timing (STORY_SPEC 7.1, 15; ADR-017). Milestone: S2.
// One deterministic syllable list per spoken line drives both the mouth flap (renderer) and the
// babble sounds (audio events, synthesized in /tools). No words are spoken: syllables follow the
// vowel groups of the text, with a pitch contour (questions rise, exclamations punch).

import { mulberry32, hash32 } from "../math.js";

const VOWELS = /[aeiouy]+/gi;
const VOWEL_OF = { a: "a", e: "e", i: "i", o: "o", u: "u", y: "i" };
export const SPEECH_VOWELS = ["a", "e", "i", "o", "u"];
export const TIMBRES = ["soft", "squeaky", "deep", "robot", "bark"];

/** Reading time for a bubble in story scripts: 1.2 s + 0.06 s per character, at least 1.5 s. */
export function readingTime(text) {
  return Math.max(1.5, 1.2 + 0.06 * String(text).length);
}

/** A character's voice with defaults (pitch 1, speed 1, timbre soft). */
export function voiceOf(voice) {
  return { pitch: voice?.pitch ?? 1, speed: voice?.speed ?? 1, timbre: voice?.timbre ?? "soft" };
}

/**
 * Syllables for one line: [{ t, dur, vowel, semi, gain }], t in seconds from the line start.
 * semi: semitones from the voice's base pitch (the base is applied by the synthesizer).
 * @param {{ text, dur, bubble?, actor, at }} say  at: a stable number for this line (its video time)
 */
export function syllables(say, voice, seed = 1) {
  const v = voiceOf(voice);
  if (say.bubble === "think") return []; // thoughts are silent
  const groups = String(say.text).match(VOWELS) || ["a"];
  const count = Math.min(30, Math.max(1, groups.length));
  const rng = mulberry32(hash32(`speech:${seed}:${say.actor}:${say.at.toFixed(3)}:${say.text}`));
  const step = 0.13 / v.speed;
  const len = 0.09 / v.speed;
  const room = Math.max(0.2, (say.dur ?? 1.5) - 0.15);
  const n = Math.min(count, Math.max(1, Math.floor(room / step)));
  const question = /\?\s*$/.test(say.text);
  const exclaim = /!\s*$/.test(say.text) || say.bubble === "shout";
  const gain = say.bubble === "whisper" ? 0.45 : exclaim ? 1 : 0.8;
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) : 0;
    let semi = Math.round((rng() - 0.4) * 5);
    if (question && u > 0.7) semi += 4;
    if (!question && u > 0.85 && n > 2) semi -= 2;
    if (exclaim && i === 0) semi += 2;
    const vowel = VOWEL_OF[groups[Math.floor((i * groups.length) / n)][0].toLowerCase()] || "a";
    out.push({ t: i * step + rng() * 0.02, dur: len, vowel, semi, gain });
  }
  return out;
}

/** True while a syllable of the line is sounding at `age` seconds into it (mouth open). */
export function mouthOpenAt(sylls, age) {
  for (const s of sylls) if (age >= s.t && age < s.t + s.dur) return true;
  return false;
}
