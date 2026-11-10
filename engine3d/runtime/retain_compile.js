// The retention kit's speaking beats (ENGINE_RETENTION_KIT.md): hook, challenge and call, which chain spoken lines
// with the kit's moves, and say keywords (a badge as each word is spoken). They run inside compile.js, which
// hands them `speak` (a line at a time from the beat start, returning its measured or estimated length) so the
// beat stretches to fit. Pure: no three.js, no I/O, no clocks.

import { ICONS, wordShare } from "./retain_layout.js";

/** Actions compile.js expands here. */
export const RETAIN_MACROS = ["hook", "challenge", "call"];

/**
 * Run one speaking beat.
 * @param {object} a  the action
 * @param {{ d: object, t: number, rel: number, speak: (line: object, rel: number) => number }} k
 *   t: the beat's start; rel: the action's start from it; speak: say a line at rel (seconds from the beat start)
 * @returns {number}  where the action ends, seconds from the beat start
 */
export function runMacro(a, { d, t, rel, speak, audience }) {
  const at = (r) => t + r;
  // A line's spoken form (respelling or [[ IPA ]]) comes from <field>Spoken: questionSpoken, answerSpoken, ...
  const line = (text, who, spoken) => ({ do: "say", text, caption: a.caption !== false, ...(who != null ? { who } : {}), ...(spoken != null ? { spoken } : {}) });

  if (a.do === "hook") {
    // behind may be a named part ("toy_box#lid"): the camera frames its owner and the reveal opens the part.
    const owner = String(a.behind).split("#")[0];
    const isPart = owner !== a.behind;
    const slow = audience === "babies" || a.slow === true;
    d.engage("hook", { at: at(rel) });
    if (a.shot !== false) d.shot({ at: at(rel), target: owner, framing: "close", pad: 0.2, dur: 1.2 });
    const q = speak(line(a.question, a.who, a.questionSpoken), rel + 0.2);
    const reveal = rel + 0.2 + q + (a.reveal ?? 0.6);
    if (a.badge !== false) d.cue("question", { at: at(rel + 0.3), dur: Math.max(1.2, reveal - rel - 0.3) });
    d.wiggle(a.behind, { at: at(rel + 0.6), deg: 8, dur: 0.6 });
    d.sound("squeak", { at: at(rel + 0.65), volume: 0.6 });
    d.wiggle(a.behind, { at: at(rel + 0.6 + Math.max(0.9, Math.min(1.6, q / 2))), deg: 10, dur: 0.6 });
    d.sound("squeak", { at: at(rel + 0.65 + Math.max(0.9, Math.min(1.6, q / 2))), volume: 0.6 });
    revealCover(d, a.behind, a.style ?? (isPart ? "open" : "lift"), at(reveal), { slow, open: a.open });
    d.pop(a.target, { at: at(reveal + 0.25), sound: "magic_sparkle" });
    d.highlight(a.target, { at: at(reveal + 0.3), color: "gold", dur: 2.2 });
    d.sound("ding", { at: at(reveal + 0.35), volume: 0.7 });
    // A part cover (a lid, a door) keeps its owner in the frame, so the box and what peeks out both show.
    if (a.shot !== false) d.shot({ at: at(reveal + 0.2), target: isPart ? owner : a.target, framing: isPart ? "medium" : "wide", pad: 0.6, dur: 1 });
    let end = reveal + 2.2;
    if (a.answer) end = Math.max(end, reveal + 0.9 + speak(line(a.answer, a.who, a.answerSpoken), reveal + 0.9) + 0.35);
    return end;
  }

  if (a.do === "challenge") {
    const q = speak(line(a.prompt, a.who, a.promptSpoken), rel);
    const start = rel + q + 0.3;
    const dur = a.dur ?? 5;
    d.engage("challenge", { at: at(rel) });
    d.options(null, { at: at(start), targets: a.options, dur: dur + 0.3 });
    d.timer(a.timer, { at: at(start), dur, count: a.count ?? 3 });
    const rang = start + 0.3 + dur;
    d.answer(a.answer, { at: at(rang + 0.2), result: "correct", confetti: a.confetti });
    let end = rang + 2.2;
    if (a.praise) end = Math.max(end, rang + 0.9 + speak(line(a.praise, a.who, a.praiseSpoken), rang + 0.9) + 0.35);
    return end;
  }

  if (a.do === "call") {
    const wait = a.wait ?? 2.5;
    const q = speak(line(a.prompt, a.who, a.promptSpoken), rel);
    d.engage("call", { at: at(rel) });
    d.cue(a.cue ?? "hand", { at: at(rel + q + 0.15), dur: wait + 0.1 });
    d.music({ at: at(rel + q), gain: 0.45, dur: 0.4 });
    d.music({ at: at(rel + q + wait), gain: 1, dur: 0.6 });
    const ans = rel + q + 0.3 + wait;
    const len = speak(line(a.answer, a.answerWho ?? a.who, a.answerSpoken), ans);
    d.sound("sparkle", { at: at(ans), volume: 0.6 });
    if (a.reveal != null) {
      if (!d.timeline.valueAt(a.reveal, "visible", at(ans))) d.pop(a.reveal, { at: at(ans + 0.1) });
      else d.highlight(a.reveal, { at: at(ans + 0.1), color: "gold", dur: Math.max(1.5, len) });
    }
    return ans + len + 0.35;
  }
  throw new Error(`unknown kit action "${a.do}"`);
}

/**
 * Take the cover off: lift (rises, spins and floats away), slide (moves aside), tip (tips back and stays) or open
 * (turns a named part such as a lid or a door to `open` degrees, default [-100, 0, 0]). slow (babies): about twice
 * as long, and a lift floats up without spinning.
 */
function revealCover(d, id, style, t, { slow = false, open } = {}) {
  const k = slow ? 2 : 1;
  d.sound("whoosh", { at: t, volume: slow ? 0.5 : 0.7 });
  if (style === "open") return d.turn(id, { at: t, to: open ?? [-100, 0, 0], dur: 0.8 * k, ease: "backOut" });
  const p = d.timeline.valueAt(id, "position", t);
  if (style === "slide") return d.move(id, { at: t, to: [p[0] + 1.7, p[1], p[2]], dur: 0.6 * k, ease: "backOut" });
  if (style === "tip") return d.turn(id, { at: t, by: -50, axis: "x", dur: 0.5 * k, ease: "backOut" });
  d.move(id, { at: t, to: [p[0] + 0.4, p[1] + 2.4, p[2] - 0.6], dur: 0.7 * k, ease: "quadIn" });
  if (!slow) d.spin(id, { at: t, turns: 1, dur: 0.7 });
  return d.hide(id, { at: t + 0.55 * k, dur: 0.25 * k });
}

/**
 * Keyword badges for a spoken line: each word's badge pops when the word is said (its place in the text times the
 * line's length).
 * @param {Record<string, string|object>} keywords  word → icon name, prop name or keyword options
 */
export function sayKeywords(d, { text, keywords, start, dur, catalog }) {
  for (const [word, spec] of Object.entries(keywords)) {
    const share = wordShare(text, word);
    if (share == null) throw new Error(`keyword "${word}" is not in the line "${text}"`);
    const o = typeof spec === "string" ? (ICONS[spec] ? { icon: spec } : catalog.props[spec] ? { model: spec } : catalog.shapes[spec] && spec.length > 4 ? { shape: spec } : { text: spec }) : spec;
    d.keyword(null, { ...o, word, at: start + dur * share });
  }
}
