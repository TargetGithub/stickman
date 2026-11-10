// What the voice reads for a `say` with `spoken` (a respelling or IPA phonemes in [[ ]] for Piper). Piper speaks a
// [[ ]] block exactly, but punctuation right after "]]" is lost (no pause) and a colon there is read aloud as
// "colon"; inside the block "," and "." are pauses. So punctuation that follows a block moves into it (":" and
// ";" become a comma pause) and the next word keeps its space. Pure.

/** @param {string} s  the say's spoken text  @returns {string} */
export function normalizeSpoken(s) {
  return String(s)
    .replace(/\s*\]\]\s*([,.;:!?—–]+)/g, (_, p) => `${/[.!?]/.test(p) ? "." : ","} ]]`)
    .replace(/\]\](?=\S)/g, "]] ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Why a spoken text is invalid (a message), or null: 1-400 characters, [[ ]] in pairs, not nested, not empty. */
export function spokenError(sp) {
  if (typeof sp !== "string" || !sp.trim() || sp.length > 400) return "spoken must be 1-400 characters";
  const open = (sp.match(/\[\[/g) ?? []).length;
  if (open !== (sp.match(/\]\]/g) ?? []).length || /\[\[[^\]]*\[\[/.test(sp)) return 'phonemes go in [[ ]] pairs, not nested: "the [[ bəl ]] syllable"';
  if (/\[\[\s*\]\]/.test(sp)) return "empty [[ ]]";
  return null;
}
