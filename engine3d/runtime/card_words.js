// Words of a text card (kind text_card), numbered the same way by the director, the validator and the page:
// split on white space (line breaks included), punctuation stays on its word. emphasize names a phrase by
// its words; the page finds where those words landed after wrapping. Pure: no text metrics here.

/** Most characters and lines a card holds (readable at 720p). */
export const CARD_MAX_CHARS = 300;
export const CARD_MAX_LINES = 6;

/** The card's words in reading order. */
export const cardWords = (text) => String(text ?? "").split(/\s+/).filter(Boolean);

/** Paragraphs (explicit line breaks) as lists of word indices. */
export function cardParagraphs(text) {
  let i = 0;
  return String(text ?? "").split("\n").map((p) => p.split(/\s+/).filter(Boolean).map(() => i++));
}

// Letters and digits only: quotes, commas and apostrophes (straight or curly: can't = can’t = cant) are ignored.
const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Word range [start, end] (inclusive) of a phrase in a card: the first place its words appear in order,
 * ignoring case and punctuation. words: "the big storm" or [start, end] (checked against the card).
 * @returns {[number, number] | null}
 */
export function findWords(text, words) {
  const all = cardWords(text).map(norm);
  if (Array.isArray(words)) {
    const [a, b] = words;
    return Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= a && b < all.length ? [a, b] : null;
  }
  const want = cardWords(words).map(norm).filter(Boolean);
  if (!want.length) return null;
  // Card "words" that are only punctuation (a lone dash or quote) are stepped over, inside a phrase too.
  const idx = all.map((w, i) => (w ? i : -1)).filter((i) => i >= 0);
  for (let i = 0; i + want.length <= idx.length; i++) if (want.every((w, j) => all[idx[i + j]] === w)) return [idx[i], idx[i + want.length - 1]];
  return null;
}
