// Validation for the word and letter actions (director_letters.js): vowel_mark, stress, turn_page, retext and
// split. validate.js calls checkLetterAction for every action with a target. Pure.

const isNum = (v, lo, hi) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/**
 * @param {object} a  the action; @param {string} p  its path; @param {object} o  its target object
 * @param {{ err: Function, ids: Map, catalog: object, name: Function }} k
 */
export function checkLetterAction(a, p, o, { err, ids, catalog, name }) {
  if (a.do === "vowel_mark") {
    if (o.kind !== "letter") err("E3D_TARGET_KIND", `${p}.target`, `vowel_mark needs a letter word, "${a.target}" is a ${o.kind}`);
    const n = String(o.text ?? "").length;
    const group = ["underline", "bracket", "circle"].includes(a.mark);
    const most = group ? 12 : 3;
    if (!a.clear && (!Array.isArray(a.chars) || !a.chars.length || a.chars.length > most || a.chars.some((c) => !Number.isInteger(c) || c < 1 || c > n))) err("E3D_CHARS", `${p}.chars`, `chars must be 1-${most} character numbers 1-${n}`);
    if (a.mark != null && !["long", "short", "underline", "bracket", "circle"].includes(a.mark)) err("E3D_MARK", `${p}.mark`, "mark must be long (a bar), short (a cup), underline, bracket or circle");
    name(catalog.colors, a.color, "E3D_COLOR", `${p}.color`, "color");
  }
  if (a.do === "turn_page" && !ids.has(`${a.target}_leaf1`)) err("E3D_TARGET_KIND", `${p}.target`, `turn_page needs a book with at least two spreads, "${a.target}" is not one`);
  if (a.do === "retext") {
    const real = o.kind === "group" ? ids.get(`${a.target}_text`) : o;
    if (!real || !["letter", "text_card"].includes(real.kind)) err("E3D_TARGET_KIND", `${p}.target`, `retext needs a letter word, a text_card or a card with text, "${a.target}" is a ${o.kind}`);
    else if (typeof a.text !== "string" || !a.text.trim()) err("E3D_TEXT", `${p}.text`, "retext needs text");
    else if (real.kind === "letter" && a.text.length > 24) err("E3D_TEXT", `${p}.text`, "a letter word is 1-24 characters");
    else if (real.kind === "text_card" && a.text.length > 300) err("E3D_TEXT", `${p}.text`, "a text card holds 1-300 characters");
  }
  if (a.do === "split") {
    if (o.kind !== "letter") err("E3D_TARGET_KIND", `${p}.target`, `split needs a letter word, "${a.target}" is a ${o.kind}`);
    const n = String(o.text ?? "").length;
    if (!Array.isArray(a.after) || a.after.some((c) => !Number.isInteger(c) || c < 1 || c >= n)) err("E3D_SPLIT", `${p}.after`, `after must be a list of character numbers 1-${n - 1} (split after them; [] joins the word)`);
    if (a.gap != null && !isNum(a.gap, 0, 5)) err("E3D_RANGE", `${p}.gap`, "gap must be 0-5 m");
  }
  if (a.do === "stress") {
    if (o.kind !== "letter") err("E3D_TARGET_KIND", `${p}.target`, `stress needs a letter word, "${a.target}" is a ${o.kind}`);
    const n = Array.from(String(o.text ?? "")).length;
    if (a.chars != null && (!Array.isArray(a.chars) || !a.chars.length || a.chars.some((c) => !Number.isInteger(c) || c < 1 || c > n))) err("E3D_CHARS", `${p}.chars`, `chars must be character numbers 1-${n} (the stressed syllable)`);
    if (a.count != null && !(Number.isInteger(a.count) && a.count >= 1 && a.count <= 6)) err("E3D_RANGE", `${p}.count`, "count must be 1-6 rings");
    if (a.dur != null && !isNum(a.dur, 0.3, 6)) err("E3D_RANGE", `${p}.dur`, "dur must be 0.3-6 s");
    if (a.grow != null && typeof a.grow !== "boolean") err("E3D_RANGE", `${p}.grow`, "grow must be true or false");
    name(catalog.colors, a.color, "E3D_COLOR", `${p}.color`, "color");
  }
}
