// Expressive speech for `say` (#104): a whole line whispered, shouted or groaned (or said in a mood: happy, sad,
// tired, ...), and one word of a line stressed without cutting the line into pieces. The director only records
// the choice on the line; tools/lib/audio3d.mjs turns it into Piper settings and a stressed-word lift. Pure.

import { wordShare } from "./retain_layout.js";

/** say style → how the voice changes: the speech bubble kind (loudness and colour) and a tone (rate, pitch...). */
export const VOICE_STYLES = {
  whisper: { bubble: "whisper", tone: { rate: 0.92, gainDb: -1 } },
  shout: { bubble: "shout", tone: { pitch: 1, gainDb: 1 } },
  groan: { bubble: "speech", tone: { rate: 0.72, pitch: -3, gainDb: -2, lowpass: 3200, pause: 0.3 } },
};
/** Moods from catalog/story/tts_voices.json that a line may take as its style too. */
export const VOICE_MOODS = ["happy", "laugh", "love", "surprised", "determined", "smug", "sad", "cry", "angry", "scared", "tired", "dizzy", "asleep"];

/** Validator: problems with a say's style and stress, as [field, message] pairs. */
export function voiceStyleErrors(a) {
  const out = [];
  if (a.style != null && !VOICE_STYLES[a.style] && !VOICE_MOODS.includes(a.style)) {
    out.push(["style", `style must be ${Object.keys(VOICE_STYLES).join(", ")} or a mood (${VOICE_MOODS.join(", ")})`]);
  }
  if (a.stress != null) {
    if (typeof a.stress !== "string" || !a.stress.trim() || /\s/.test(a.stress.trim())) out.push(["stress", "stress names one word of the line"]);
    else if (typeof a.text === "string" && wordShare(a.text, a.stress) == null) out.push(["stress", `"${a.stress}" is not a word of "${a.text}"`]);
  }
  return out;
}

/**
 * Where a stressed word falls in its line, as shares of the spoken part of the clip: [start, end] from the
 * word's place among the line's characters (the same reckoning as keyword badges), or null.
 */
export function stressSpan(text, word) {
  const at = wordShare(text, word);
  if (at == null) return null;
  const len = Math.max(1, String(text).length);
  const w = String(word).length / len;
  const s0 = at - 0.25 * w; // wordShare points a quarter of the way into the word
  return [Math.max(0, s0 - 0.03), Math.min(1, s0 + w + 0.05)];
}
