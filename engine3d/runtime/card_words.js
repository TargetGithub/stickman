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

/**
 * A punctuation mark to emphasize on its own (#144): words "?" or "!" (only punctuation) names the first card
 * word that holds it, and the characters of the mark inside that word.
 * @returns {{ words: [number, number], chars: [number, number] } | null}
 */
export function findMark(text, words) {
  if (typeof words !== "string") return null;
  const mark = words.trim();
  if (!mark || /[\p{L}\p{N}\s]/u.test(mark)) return null;
  const all = cardWords(text);
  for (let i = 0; i < all.length; i++) {
    const c = all[i].indexOf(mark);
    if (c >= 0) return { words: [i, i], chars: [c, c + mark.length - 1] };
  }
  return null;
}

/**
 * The spoken parts of a card (#179): each run of words inside quotation marks (straight " or curly “ ”), as word
 * ranges [start, end] in reading order. An unclosed quote runs to the end of the text.
 * @returns {[number, number][]}
 */
export function findQuotes(text) {
  const words = cardWords(text);
  const out = [];
  let open = -1;
  words.forEach((w, i) => {
    const marks = Array.from(w).filter((c) => c === '"' || c === "\u201c" || c === "\u201d").length;
    if (open < 0 && marks) {
      if (marks >= 2) out.push([i, i]); // "Hi!" on its own
      else open = i;
    } else if (open >= 0 && marks) {
      out.push([open, i]);
      open = -1;
    }
  });
  if (open >= 0) out.push([open, words.length - 1]);
  return out;
}

/**
 * Word colours at rest (#188): text_card `colors` entries { words, color, chars? } -> word index -> [{ from, to,
 * color }] (character ranges, to inclusive; a whole word when chars is left out). words as for emphasize: a phrase,
 * [start, end] or a mark ("?"); chars ([first, last], 1-based) colours letters of a single word.
 * @returns {{ map: Map<number, {from:number,to:number,color:string}[]>, bad: number[] }} bad: entries that matched nothing
 */
export function wordColors(text, entries = []) {
  const all = cardWords(text);
  const map = new Map();
  const bad = [];
  entries.forEach((e, k) => {
    const mark = findMark(text, e?.words);
    const range = mark?.words ?? findWords(text, e?.words);
    if (!range) return bad.push(k);
    for (let i = range[0]; i <= range[1]; i++) {
      const len = all[i].length;
      let [from, to] = mark ? mark.chars : [0, len - 1];
      if (Array.isArray(e.chars)) {
        if (range[0] !== range[1] || e.chars[0] < 1 || e.chars[1] > len || e.chars[1] < e.chars[0]) return bad.push(k);
        [from, to] = [e.chars[0] - 1, e.chars[1] - 1];
      }
      map.set(i, [...(map.get(i) ?? []), { from, to, color: e.color }]);
    }
  });
  return { map, bad };
}
