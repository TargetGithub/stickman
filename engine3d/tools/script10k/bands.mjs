// Per-band defaults for Toybox 10K scripts (SERIES.md table, GUIDELINES.md, PLAN.md). The Toybox voice is the
// soft timbre at pitch 1.1 and speed 0.97 (Robo's catalog voice); babies are calmer and slower.

/** @typedef {{ audience: string, badge: string, voiceSpeed: number, music: string, musicGain: number,
 *   maxWords: number, tracker: string, timers: boolean, confetti: boolean, playlist: string }} Band */

/** @type {Record<string, Band>} */
export const BANDS = {
  bb: { audience: "babies", badge: "BABY", voiceSpeed: 0.88, music: "lullaby", musicGain: 0.3, maxWords: 7, tracker: "stars", timers: false, confetti: false, playlist: "BABY" },
  pk: { audience: "prek", badge: "PRE-K", voiceSpeed: 0.97, music: "playful", musicGain: 0.22, maxWords: 10, tracker: "train", timers: true, confetti: true, playlist: "PREK" },
  kg: { audience: "k", badge: "KINDERGARTEN", voiceSpeed: 0.97, music: "playful", musicGain: 0.22, maxWords: 12, tracker: "train", timers: true, confetti: true, playlist: "KINDERGARTEN" },
  g1: { audience: "grade1", badge: "GRADE 1", voiceSpeed: 0.97, music: "playful", musicGain: 0.21, maxWords: 12, tracker: "checklist", timers: true, confetti: true, playlist: "GRADE1" },
  g2: { audience: "grade2", badge: "GRADE 2", voiceSpeed: 0.97, music: "happy", musicGain: 0.2, maxWords: 15, tracker: "checklist", timers: true, confetti: true, playlist: "GRADE2" },
  g3: { audience: "grade3", badge: "GRADE 3", voiceSpeed: 0.97, music: "calm", musicGain: 0.2, maxWords: 17, tracker: "checklist", timers: true, confetti: true, playlist: "GRADE3" },
  g4: { audience: "grade4", badge: "GRADE 4", voiceSpeed: 0.97, music: "calm", musicGain: 0.2, maxWords: 19, tracker: "checklist", timers: true, confetti: true, playlist: "GRADE4" },
  g5: { audience: "grade5", badge: "GRADE 5", voiceSpeed: 0.97, music: "calm", musicGain: 0.2, maxWords: 19, tracker: "checklist", timers: true, confetti: true, playlist: "GRADE5" },
};

/** "kg0123" -> "kg"; "g10713" -> "g1". */
export function bandOf(id) {
  const b = /^(bb|pk|kg|g[1-5])\d{4}$/.exec(id)?.[1];
  if (!b) throw new Error(`not a 10K id: ${id}`);
  return b;
}

/** A stable seed from the id (band index * 10000 + slot). */
export function seedOf(id) {
  const b = bandOf(id);
  return (Object.keys(BANDS).indexOf(b) + 1) * 10000 + Number(id.slice(b.length));
}

export const MOODS = ["happy", "playful", "calm", "sad", "tense", "mysterious", "heroic", "battle", "boss", "triumphant", "lullaby", "bouncy"];
const BABY_MOODS = ["lullaby", "calm"];

/**
 * The music bed from a spec's free-text `music` note ("calm glockenspiel lullaby, musicGain 0.3"): the first mood
 * named and the first gain, else the band defaults. Babies only get lullaby or calm.
 * @param {string|undefined} note
 * @param {string} band
 */
export function musicFrom(note, band) {
  const d = BANDS[band];
  const text = String(note ?? "").toLowerCase();
  let mood = MOODS.map((m) => [m, text.search(new RegExp(`\\b${m}\\b`))]).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1])[0]?.[0] ?? d.music;
  if (band === "bb" && !BABY_MOODS.includes(mood)) mood = d.music;
  if (["battle", "boss", "tense", "sad"].includes(mood)) mood = d.music; // never a whole video in these
  const g = Number(/musicgain\s*([0-9.]+)/.exec(text)?.[1] ?? /gain\s*([0-9.]+)/.exec(text)?.[1]);
  const gain = g > 0.05 && g < 0.5 ? g : d.musicGain;
  return { mood, gain };
}
