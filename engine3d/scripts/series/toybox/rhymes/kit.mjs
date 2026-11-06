// Shared building blocks for the baby & toddler rhymes (br01-br20, specs/baby_rhymes.md). A rhyme generator
// (rhymes/brNN.mjs) imports these, builds its objects and scenes, and calls writeRhyme(). Run a generator with
// node; it rewrites ../brNN_<slug>.json. Then node tools/sung_durs.mjs <that json> and run the generator again,
// so every sung beat is fitted to its spoken line (fitSung).
//
// Conventions (see br01.mjs for a complete example):
// - Robo ("robo") hosts in the toddler voice; every Robo line goes through say().
// - Sung lines: sung(text, tune) — Robo speaks the line normally and a quiet glockenspiel plays one note per
//   syllable (`tune`, one note per syllable). Scenes with sung lines set music: false.
// - HUD: trackerObjects() (top-left row of slots), countdownObjects() (3-2-1), bubbleObjects() (word bubble).
// - Interaction every 10-15 s: countdown(), yourTurn(), quizRound(), "point to it", peekaboo.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const BEAT = 60 / 112; // s, the tune.js default tempo
export const DEFAULT_CAM = { position: [0, 2.1, 9.4], lookAt: [0, 1.35, -0.4], fov: 40 };
export const SLOT_COLORS = ["blue", "orange", "green", "pink", "purple", "yellow", "red", "teal", "lime", "sky"];

/** "a" or "an" before a word. */
export const art = (w) => (/^[aeiou]/i.test(w) ? "an" : "a");
/** A Robo line (captioned). */
export const say = (text, o = {}) => ({ do: "say", who: "robo", text, at: 0.2, caption: true, ...o });
/** A beat: id, seconds, actions (nested arrays and falsy entries are dropped). */
export const beat = (id, dur, actions) => ({ id, dur, do: actions.flat(Infinity).filter(Boolean) });
/** A sung line at 0.1 s plus extra actions. Beat length: tuneDur(tune) before fitting. */
export const sung = (text, tune, extra = []) => [say(text, { tune, at: 0.1 }), ...extra];
/** Seconds into a sung beat when tune beat k starts (before fitting; fitSung rescales these). */
export const onBeat = (k) => 0.1 + k * BEAT;
/** A sung beat's length before fitting: the tune plus a lead and a breath. */
export const tuneDur = (t) => Math.round((0.4 + tuneBeats(t) * BEAT) * 100) / 100;
export const tuneBeats = (t) => t.trim().split(/\s+/).filter((x) => x !== "|").reduce((n, tok) => n + Number(tok.split(":")[1] ?? 1), 0);

// ---- HUD objects -----------------------------------------------------------------------------------------------

/** A row of n tracker slots, top left (ids slot1..slotN), hidden until popped. */
export function trackerObjects(n, { colors = SLOT_COLORS, y = 3.78, x0 = -7.15, step = 0.95, size = 0.78 } = {}) {
  return Array.from({ length: n }, (_, i) => ({ id: `slot${i + 1}`, kind: "prop", model: "tracker_slot", color: colors[i % colors.length], hud: true, at: [x0 + i * step, y, 0], size, hidden: true }));
}
/** The big 3-2-1 countdown (a white disc with orange digits), centre of the screen. */
export function countdownObjects() {
  return [
    { id: "cd_bg", kind: "shape", shape: "circle", color: "white", hud: true, at: [0, -0.2, 1.5], size: 2.7, hidden: true },
    ...["3", "2", "1"].map((n) => ({ id: `cd${n}`, kind: "letter", text: n, color: "orange", hud: true, at: [0, 0.35, 2], size: 1.15, hidden: true })),
  ];
}
/** The word bubble (top right) and one word per entry: words = [{ id, text }] → letter ids w_<id>. */
export function bubbleObjects(words, { at = [5.6, 2.05, 0], size = 1.75 } = {}) {
  return [
    { id: "bubble", kind: "prop", model: "word_bubble", hud: true, at, size, hidden: true },
    ...words.map((w) => ({ id: `w_${w.id}`, kind: "letter", text: w.text, color: w.color ?? "ink", hud: true, parent: "bubble", at: [0, -0.2, 0.18], size: w.text.length > 6 ? 0.24 : w.text.length > 5 ? 0.28 : 0.34, hidden: true })),
  ];
}

// ---- Action groups ---------------------------------------------------------------------------------------------

/** "Three... two... one!" with the HUD countdown and ticks, starting at at0 (lasts about 2.4 s). */
export const countdown = (at0 = 0.4) => [
  say("Three... two... one!", { at: at0, caption: false }),
  { do: "pop", target: "cd_bg", at: at0, dur: 0.3, sound: false },
  { do: "hide", target: "cd_bg", at: at0 + 2.15, dur: 0.2 },
  ...["3", "2", "1"].flatMap((n, i) => [
    { do: "pop", target: `cd${n}`, at: at0 + 0.05 + i * 0.75, dur: 0.3, sound: "tick" },
    { do: "hide", target: `cd${n}`, at: at0 + 0.62 + i * 0.75, dur: 0.12 },
  ]),
];
/** Pop the word bubble with word w_<id>. */
export const word = (id, at = 0.2) => [{ do: "pop", target: "bubble", at, dur: 0.35, sound: false }, { do: "show", target: `w_${id}`, at: at + 0.05, dur: 0.25 }];
/** Hide word w_<id> and the bubble. */
export const unword = (id, at = 0) => [{ do: "hide", target: `w_${id}`, at, dur: 0.2 }, { do: "hide", target: "bubble", at: at + 0.05, dur: 0.25 }];
/** Pop all tracker slots one after another (the hook). */
export const showTracker = (n, at = 0.3, gap = 0.22) => Array.from({ length: n }, (_, i) => ({ do: "pop", target: `slot${i + 1}`, at: at + i * gap, dur: 0.35, sound: "pop" }));
/** Fill slot i (1-based) with the object `mini` (a HUD object parented to it), with a ding and sparkle. */
export const fillSlot = (i, mini, at = 0.25) => [
  { do: "pop", target: mini, at, dur: 0.45, sound: "ding" },
  { do: "wiggle", target: `slot${i}`, at: at + 0.05, deg: 10, dur: 0.8 },
  { do: "sound", sound: "sparkle", at: at + 0.1, volume: 0.6 },
];

/**
 * A "your turn" round (about 8 s): Robo asks, a pause with soft ticks while the child answers, the answer is heard
 * (by `answerWho`, or Robo), praise, and optionally a tracker slot fills.
 * clips: false leaves out Robo's Wave/ThumbsUp clips (when he sits, e.g. in a boat).
 * @param {{ id:string, ask:string, answer:string, answerWho?:string, praise:string, wordId?:string, slot?:number, mini?:string, extra?:object[] }} o
 */
export function yourTurn({ id, ask, answer, answerWho = "robo", praise, wordId, slot, mini, look, extra = [], clips = true }) {
  return [
    beat(`${id}_t1`, 2.2, [say(ask, { at: 0.1 }), clips ? { do: "clip", target: "robo", clip: "Wave", at: 0.2 } : null, look ? { do: "look", target: look, at: 0.1, to: [0, 1.6, 9] } : null, wordId ? word(wordId, 0.3) : null]),
    beat(`${id}_t2`, 2.2, [{ do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 }, wordId ? { do: "wiggle", target: "bubble", at: 0.2, deg: 10, dur: 1.6 } : null]),
    beat(`${id}_t3`, 2.4, [
      answerWho === "robo" ? say(answer, { at: 0.1 }) : { do: "say", who: answerWho, text: answer, at: 0.1 },
      answerWho !== "robo" ? { do: "hop", target: answerWho, at: 0.15, height: 0.35 } : null,
      say(praise, { at: "after" }), clips ? { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.8 } : null,
    ]),
    beat(`${id}_t4`, 1.6, [wordId ? unword(wordId, 0) : null, slot && mini ? fillSlot(slot, mini) : null, look ? { do: "look", target: look, at: 0.2, to: "ahead" } : null, ...extra]),
  ];
}

/**
 * A "point to it" quiz round (about 9 s): two objects step forward, Robo asks, 3-2-1, the right one is marked.
 * @param {{ id:string, q:string, left:string, right:string, answer:string, answerSay?:{who:string,text:string}, back?:Record<string, number[]>, spots?:number[][] }} o
 */
export function quizRound({ id, q, left, right, answer, answerSay, back = {}, spots = [[-1.1, 0, 1.6], [1.1, 0, 1.6]], yes, clips = true }) {
  return [
    beat(`${id}a`, 2.6, [
      { do: "move", target: left, to: spots[0], dur: 1, ease: "sineInOut" },
      { do: "move", target: right, to: spots[1], dur: 1, ease: "sineInOut" },
      { do: "shot", target: [left, right], framing: "medium", dur: 1.2 },
      say(q, { at: 0.5 }),
    ]),
    beat(`${id}b`, 2.8, [...countdown(0.1), { do: "wiggle", target: left, at: 0.2, deg: 8, dur: 0.6 }, { do: "wiggle", target: right, at: 0.95, deg: 8, dur: 0.6 }, { do: "wiggle", target: left, at: 1.7, deg: 8, dur: 0.6 }]),
    beat(`${id}c`, 3, [
      { do: "mark", target: answer, result: "correct", at: 0.1, dur: 2.2 },
      answerSay ? { do: "say", who: answerSay.who, text: answerSay.text, at: 0.3 } : null,
      { do: "wiggle", target: answer, at: 0.3, deg: 12, dur: 1 },
      say(yes ?? `Yes! The ${answer.replace(/_/g, " ")}!`, { at: answerSay ? "after" : 0.4 }),
      clips ? { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.6 } : null,
    ]),
    beat(`${id}d`, 1.2, [
      back[left] ? { do: "move", target: left, to: back[left], dur: 1, ease: "sineInOut" } : null,
      back[right] ? { do: "move", target: right, to: back[right], dur: 1, ease: "sineInOut" } : null,
    ]),
  ];
}

// ---- Fitting and writing ---------------------------------------------------------------------------------------

/**
 * Fit each sung beat to its spoken line (durs: line text → measured seconds, from tools/sung_durs.mjs): the beat
 * lasts the line plus a breath, and actions timed on the tune's beat are scaled to the spoken length.
 */
export function fitSung(scenes, durs) {
  for (const sc of scenes) for (const b of sc.beats) {
    const line = b.do.find((x) => x.do === "say" && x.tune && x.at === 0.1);
    if (!line || durs[line.text] == null) continue;
    const spoken = durs[line.text];
    const k = Math.min(1, spoken / (tuneBeats(line.tune) * BEAT));
    for (const x of b.do) {
      if (x === line) continue;
      if (typeof x.at === "number" && x.at > 0.1) x.at = Math.round((0.1 + (x.at - 0.1) * k) * 100) / 100;
      if ((x.do === "shot" || x.do === "camera" || x.do === "orbit") && typeof x.dur === "number" && x.dur > 0) x.dur = Math.round(Math.max(0.8, x.dur * k) * 100) / 100;
    }
    b.dur = Math.round(Math.max(1.6, 0.1 + spoken + 0.45) * 100) / 100;
  }
  return scenes;
}

const SERIES_DIR = fileURLToPath(new URL("../", import.meta.url));

/** Fit the sung beats (when rhymes/durs/<episode>.json exists) and write ../<episode>_<slug>.json. */
export function writeRhyme(script, slug) {
  const ep = script.meta.episode;
  const durs = new URL(`./durs/${ep}.json`, import.meta.url);
  const fitted = existsSync(durs);
  if (fitted) fitSung(script.scenes, JSON.parse(readFileSync(durs, "utf8")));
  const out = `${SERIES_DIR}${ep}_${slug}.json`;
  writeFileSync(out, `${JSON.stringify(script, null, 1)}\n`);
  const beats = script.scenes.reduce((n, s) => n + s.beats.length, 0);
  console.log(`wrote ${out}: ${script.scenes.length} scenes, ${beats} beats${fitted ? "" : " (sung beats not fitted yet: run tools/sung_durs.mjs, then this again)"}`);
  return out;
}

/** The standard meta for a rhyme (audience babies, toddler Robo, soft music bed). */
export function rhymeMeta({ title, episode, seed, skills, cast = {}, youtube, thumbnails, music = "playful", musicGain = 0.17 }) {
  return { title, series: "toybox", episode, audience: "babies", seed, voice: "soft", voiceSpeed: 0.92, music, musicGain, skills, cast, youtube, thumbnails };
}

/** The standard YouTube description tail. */
export const YT_TAIL = "Made for kids. Toy Box Friends: 3D learning videos for babies, toddlers and preschool.";
