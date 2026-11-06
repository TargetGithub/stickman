// Automated QA for a compiled 10K script (GUIDELINES 12): engine validation with the retention lints forced on,
// band rules (babies: no timers, confetti or fast moves), American English and banned words, unknown words on
// screen or in narration, sentence length for the grade, structure the spec promises (hook first, magic moment,
// recap, check, tracker, thumbnails) and the estimated length against the spec target. Errors block a render;
// warnings are read by the author. Framing and accuracy still need eyes: `script10k stills`.

import { readFileSync, existsSync } from "node:fs";
import { validateScript } from "../../runtime/validate.js";
import { compileScript } from "../../runtime/compile.js";
import { US_SPELLING, US_VOCAB } from "../lib/spec10k/usenglish.mjs";
import { BANDS, bandOf } from "./bands.mjs";

const BANNED = ["bloody", "gore", "gory", "gun", "guns", "weapon", "weapons", "kill", "killed", "kills", "corpse", "dead body", "stupid", "shut up", "hate you"];
const INTERACTIVE = new Set(["hook", "challenge", "call", "options", "answer", "timer"]);

let DICT = null;
/** The system word list (macOS /usr/share/dict/words) plus a small list of words it lacks. */
export function dictionary(extra = []) {
  if (!DICT) {
    DICT = new Set();
    for (const f of ["/usr/share/dict/words", "/usr/share/dict/web2a"]) {
      if (existsSync(f)) for (const w of readFileSync(f, "utf8").split("\n")) if (w) DICT.add(w.toLowerCase());
    }
    for (const w of ["robo", "toybox", "okay", "ok", "yay", "hooray", "woohoo", "uh", "oh", "oops", "whee", "boing", "peekaboo", "ta", "da", "mmm", "yum", "yummy", "hmm", "wow", "uh-oh", "bye", "hi", "hello", "goodnight", "grownup", "grown-up", "teddy", "mommy", "daddy", "grandma", "grandpa", "kindergarten", "pre-k", "online", "email", "website", "lowercase", "uppercase", "math", "zee", "nope", "yep", "pom", "eek", "ooh", "aah", "ahh", "shh", "zzz", "tummy", "kiddo", "superstar", "smartypants", "playroom", "selfie", "emoji", "ad", "app", "dino", "dinos", "veggie", "veggies", "sticker", "stickers", "lunchbox", "backpack", "flashlight", "popsicle", "cupcake", "cupcakes", "skateboard", "spaceship", "playground", "sandbox", "teammate", "teammates"]) DICT.add(w);
    const own = new URL("./words.txt", import.meta.url);
    if (existsSync(own)) for (const w of readFileSync(own, "utf8").split("\n")) if (w && !w.startsWith("#")) DICT.add(w.trim().toLowerCase());
  }
  for (const w of extra) DICT.add(w.toLowerCase());
  return DICT;
}

/** Inflected or compound forms of a known word count as known. */
export function knownWord(w, dict) {
  w = w.toLowerCase().replace(/^'+|'+$/g, "").replace(/['’]s$/, "");
  if (!w || /\d/.test(w) || w.length <= 2 || dict.has(w)) return true;
  if (w.includes("-")) return w.split("-").every((p) => knownWord(p, dict));
  const stems = [
    w.replace(/s$/, ""), w.replace(/es$/, ""), w.replace(/ies$/, "y"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"), w.replace(/d$/, ""),
    w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/(.)\1ing$/, "$1"), w.replace(/(.)\1ed$/, "$1"), w.replace(/ied$/, "y"),
    w.replace(/ly$/, ""), w.replace(/ily$/, "y"), w.replace(/er$/, ""), w.replace(/est$/, ""), w.replace(/ier$/, "y"), w.replace(/iest$/, "y"),
    w.replace(/(.)\1er$/, "$1"), w.replace(/(.)\1est$/, "$1"), w.replace(/n't$/, ""), w.replace(/'(ll|re|ve|d|m)$/, ""), w.replace(/ness$/, ""), w.replace(/ful$/, ""),
  ];
  return stems.some((s) => s.length > 1 && s !== w && dict.has(s));
}

/** Every displayed or spoken string of a script with where it is. */
export function scriptTexts(script) {
  const out = [];
  const push = (text, path, kind) => typeof text === "string" && text.trim() && out.push({ text, path, kind });
  (script.objects ?? []).forEach((o, i) => {
    if (o.kind === "letter") push(o.text, `objects[${i}].text`, "screen");
    if (o.kind === "text_card" || o.kind === "callout") push(o.text, `objects[${i}].text`, "screen");
    if (o.kind === "tracker") (o.labels ?? []).forEach((l, j) => push(l, `objects[${i}].labels[${j}]`, "screen"));
  });
  script.scenes.forEach((s, si) => {
    push(s.title, `scenes[${si}].title`, "chapter");
    s.beats.forEach((b, bi) => b.do.forEach((a, ai) => {
      const p = `scenes[${si}].beats[${bi}].do[${ai}]`;
      if (a.do === "say") push(a.text, p, "spoken");
      if (a.do === "caption") push(a.text, p, "screen");
      if (a.do === "hook") { push(a.question, p, "spoken"); push(a.answer, p, "spoken"); }
      if (a.do === "call") { push(a.prompt, p, "spoken"); push(a.answer, p, "spoken"); }
      if (a.do === "challenge") { push(a.prompt, p, "spoken"); push(a.praise, p, "spoken"); }
    }));
  });
  (script.meta?.thumbnails ?? []).forEach((c, i) => { push(c.title, `meta.thumbnails[${i}].title`, "screen"); push(c.subtitle, `meta.thumbnails[${i}].subtitle`, "screen"); });
  push(script.meta?.youtube?.title, "meta.youtube.title", "kit");
  push(script.meta?.youtube?.description, "meta.youtube.description", "kit");
  return out;
}

const sentences = (t) => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

/**
 * @param {object} script  the compiled script
 * @param {object} spec
 * @param {object} lesson
 * @param {object} catalog
 * @param {{ allow?: string[] }} [o]
 */
export function qaScript(script, spec, lesson, catalog, { allow = [] } = {}) {
  const errors = [];
  const warnings = [];
  const E = (code, path, message) => errors.push({ code, path, message });
  const W = (code, path, message) => warnings.push({ code, path, message });
  const band = bandOf(spec.id);
  const B = BANDS[band];

  // 1. The engine validator, retention lints forced on. Warnings stay warnings except the retention ones.
  const v = validateScript(script, catalog, { retention: true });
  for (const e of v.errors) E(e.code, e.path, e.message);
  for (const w of v.warnings) (/^W3D_(HOOK_LATE|TALK_STRETCH|STATIC_CAMERA|TRACKER_UNFILLED)$/.test(w.code) ? E : W)(w.code, w.path, w.message);
  let plan = null;
  if (!v.errors.length) {
    try { plan = compileScript(script, { catalog }); } catch (e) { E("Q_COMPILE", "", e.message); }
  }

  // 2. Words: American English, banned words, unknown words, sentence length.
  const names = new Set([...Object.keys(lesson.cast ?? {}), ...(spec.cast ?? []).map((c) => String(c.who).replace(/^new:/, "")), ...(lesson.allow ?? []), ...allow].flatMap((n) => n.toLowerCase().split(/[_\s]+/)));
  const dict = dictionary([...names]);
  const unknown = new Map();
  for (const { text, path, kind } of scriptTexts(script)) {
    const lower = text.toLowerCase();
    for (const w of lower.match(/[a-z]+/g) ?? []) { const us = US_SPELLING.get(w); if (us) E("Q_US_SPELLING", path, `"${w}" -> "${us}" (American English)`); }
    for (const [b, a] of US_VOCAB) if (new RegExp(`\\b${b}\\b`).test(lower)) W("Q_US_WORD", path, `"${b}" is British; say "${a}" unless it means something else`);
    for (const b of BANNED) if (new RegExp(`\\b${b}\\b`).test(lower)) E("Q_BANNED", path, `banned word "${b}"`);
    // PLAN.md decision 17: "blood" only in science and health (the heart, circulation, body parts).
    if (/\bblood(stream|s)?\b/.test(lower) && !["science", "health"].includes(spec.subject)) E("Q_BANNED", path, `"blood" is allowed only in science and health videos`);
    if (kind === "kit") continue;
    for (const w of text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []) if (!knownWord(w, dict)) unknown.set(w.toLowerCase(), path);
    if (kind === "spoken") for (const s of sentences(text)) {
      const n = s.split(/\s+/).length;
      if (n > B.maxWords + 4) W("Q_LONG_SENTENCE", path, `${n} words (band ${band} keeps sentences to about ${B.maxWords}): "${s}"`);
    }
    if (kind === "spoken" && /[←-⇿☀-➿]|\*|_/.test(text)) W("Q_TTS_SYMBOL", path, `symbols the voice would read oddly: "${text}"`);
  }
  for (const [w, path] of unknown) W("Q_SPELLING", path, `"${w}" is not in the dictionary: check the spelling (or add it to the lesson's "allow")`);

  // 3. Band rules.
  const acts = script.scenes.flatMap((s, si) => s.beats.flatMap((b, bi) => b.do.map((a, ai) => ({ a, path: `scenes[${si}].beats[${bi}].do[${ai}]` }))));
  if (!B.timers) for (const { a, path } of acts) if (a.do === "timer" || a.do === "challenge") E("Q_BABY_TIMER", path, "babies: no timers, tests or countdowns");
  if (!B.confetti) {
    // Soap bubbles are calm and allowed (burst on a bubbles object); confetti is not.
    const kindOf = (id) => (script.objects ?? []).find((o) => o.id === id)?.kind;
    for (const { a, path } of acts) if ((a.do === "burst" && kindOf(a.target) !== "bubbles") || a.confetti) E("Q_BABY_CONFETTI", path, "babies: no confetti (soap bubbles are fine)");
    (script.objects ?? []).forEach((o, i) => o.kind === "confetti" && E("Q_BABY_CONFETTI", `objects[${i}]`, "babies: no confetti"));
    for (const { a, path } of acts) {
      if (a.do === "hop" && ((a.height ?? 0.6) > 0.5 || (a.dur ?? 0.45) < 0.4)) W("Q_BABY_FAST", path, "babies: only gentle hops (height <= 0.5, dur >= 0.4)");
      if (a.do === "spin" && (a.dur ?? 1) / (a.turns ?? 1) < 1.5) W("Q_BABY_FAST", path, "babies: spins slower than one turn in 1.5 s");
      if (a.do === "lights" && (a.dur ?? 1) < 1.5) W("Q_BABY_FLASH", path, "babies: light changes over 1.5 s or more (no flashing)");
    }
  }

  // 4. Structure the spec promises.
  const first = script.scenes[0]?.beats[0]?.do ?? [];
  if (!first.some((a) => a.do === "hook")) E("Q_HOOK_FIRST", "scenes[0].beats[0]", "the first beat must be the hook (the spec's promise in 5-8 s)");
  if (!script.scenes.some((s) => s.beats.some((b) => b.id?.endsWith(".magic")))) E("Q_MAGIC", "scenes", `mark the magical moment's beat with "magic": true (${spec.magical_moment?.id})`);
  if ((script.meta.thumbnails ?? []).length < 2) E("Q_THUMBS", "meta.thumbnails", "2-4 designed thumbnail concepts");
  if (script.scenes.length < 3) E("Q_CHAPTERS", "scenes", "at least 3 chapters");
  script.scenes.forEach((s, i) => !s.title && E("Q_CHAPTERS", `scenes[${i}].title`, "every scene needs a chapter title"));
  const checks = acts.filter(({ a }) => a.do === "challenge" || a.do === "call" || a.do === "options").length;
  if (checks < Math.min(3, spec.check?.questions?.length ?? 1)) W("Q_CHECK", "scenes", `only ${checks} challenges/calls; the spec's check has ${spec.check?.questions?.length} questions`);
  for (const { a, path } of acts) if (a.do === "say" && a.who && !script.objects.some((o) => o.id === a.who)) E("Q_WHO", path, `who "${a.who}" is not an object`);

  // 5. Length and timing on the estimate.
  const info = { band, target: spec.target_length_s };
  if (plan) {
    info.estimate = Math.round(plan.duration);
    info.lines = plan.lines.length;
    info.engagement = plan.engagement.length;
    info.interactions = acts.filter(({ a }) => INTERACTIVE.has(a.do)).length;
    const r = plan.duration / spec.target_length_s;
    info.ratio = Math.round(r * 100) / 100;
    if (r < 0.7 || r > 1.6) E("Q_LENGTH", "", `estimated ${Math.round(plan.duration)} s against the spec's ${spec.target_length_s} s (ratio ${info.ratio}; aim for 0.85-1.35 on the estimate)`);
    else if (r < 0.85 || r > 1.35) W("Q_LENGTH", "", `estimated ${Math.round(plan.duration)} s against the spec's ${spec.target_length_s} s (ratio ${info.ratio})`);
    if (plan.duration > 900) E("Q_LENGTH", "", "over 15 minutes");
    // Recap: each point's content words mostly said in the last 40%.
    const late = plan.lines.filter((l) => l.t >= plan.duration * 0.55).map((l) => l.text.toLowerCase()).join(" ");
    for (const p of spec.recap?.points ?? []) {
      const words = (p.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []).filter((w) => !["that", "this", "with", "from", "when", "they", "them", "have", "each", "what", "your", "into", "then", "there", "their"].includes(w));
      const hit = words.filter((w) => late.includes(w.replace(/s$/, ""))).length;
      if (words.length && hit / words.length < 0.4) W("Q_RECAP", "", `recap point not said near the end: "${p}"`);
    }
  }
  return { ok: errors.length === 0, errors, warnings, info };
}
