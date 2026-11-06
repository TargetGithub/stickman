// Builds ../br01_old_macdonald.json. Run: node br01.mjs (written before kit.mjs existed; the later rhymes use
// kit.mjs, which holds the same helpers).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = new URL("../br01_old_macdonald.json", import.meta.url);

// Old MacDonald (traditional, public domain), key of G, in 4/4 at 112 beats a minute (tune.js default).
// ":2" = a two-beat note, ":0.5" half a beat. Lines are spoken normally (the notes follow the syllables); a sung
// beat is fitted to its spoken line (durs/br01.json: line text -> measured clip seconds) and its actions scaled with it.
const T = {
  old: "G4 G4 G4 D4 E4 E4 D4:2", // Old Mac-Don-ald had a farm
  eio: "B4 B4 A4 A4 G4:2", // E-I-E-I-O
  onfarm: "D4:0.5 G4:0.5 G4 G4 D4 E4 E4 D4:2", // And on that farm he had a cow
  here: "D4:0.5 D4:0.5 G4 G4 G4:2 D4:0.5 D4:0.5 G4 G4 G4:2", // With a moo moo here, and a moo moo there
  everywhere: "G4:0.5 G4:0.5 G4 G4:0.5 G4:0.5 G4 G4:0.5 G4:0.5 G4:0.5 G4:0.5 G4 G4", // Here a moo, there a moo, ev-ery-where a moo moo
  full: "G4 G4 G4 D4 E4 E4 D4:2 B4 B4 A4 A4 G4:2",
};
const BEAT = 60 / 112; // s
// Seconds into a sung beat when beat number k (from 0) starts: the say starts at 0.1.
const onBeat = (k) => 0.1 + k * BEAT;
// A sung beat lasts its tune (plus the 0.1 s lead and a breath).
const tuneDur = (t) => Math.round((0.4 + t.split(/\s+/).reduce((n, tok) => n + Number(tok.split(":")[1] ?? 1), 0) * BEAT) * 100) / 100;

const DEFAULT_CAM = { position: [0, 2.1, 9.4], lookAt: [0, 1.35, -0.4], fov: 40 };
const BALE = { L: [-1.9, 0, 0.4], R: [1.9, 0, 0.4] };
const SLOT_COLORS = ["blue", "orange", "green", "pink", "purple", "yellow"];
const slotX = (i) => -7.15 + i * 0.95;

// The five hidden friends, in order, then the barn surprise.
const A = [
  { id: "cow", species: "cow", a: "a", word: "moo", sound: "Moo! Moo!", big: "MOO!", bale: "L", h: 1.15, park: [-2.9, 0, -2.4], voice: { voice: "deep", pitch: 0.9, speed: 0.9 }, praise: "Yay! Great mooing!", clue: "I see two little horns!" },
  { id: "duck", species: "duck", a: "a", word: "quack", sound: "Quack! Quack!", big: "QUACK!", bale: "R", h: 0.9, park: [2.9, 0, -2.4], voice: { voice: "squeaky", pitch: 1.2, speed: 1.05 }, praise: "Wow! Super quacking!", clue: "I see a yellow head!" },
  { id: "pig", species: "pig", a: "a", word: "oink", sound: "Oink! Oink!", big: "OINK!", bale: "L", h: 0.95, park: [-3.9, 0, -2.0], voice: { voice: "squeaky", pitch: 0.95, speed: 1 }, praise: "Yes! Great oinking!", clue: "I see pink ears!" },
  { id: "sheep", species: "sheep", a: "a", word: "baa", sound: "Baa! Baa!", big: "BAA!", bale: "R", h: 1.0, park: [4.0, 0, -1.9], voice: { voice: "soft", pitch: 1.3, speed: 0.95 }, praise: "Hooray! Lovely baa-ing!", clue: "I see fluffy white wool!" },
  { id: "dog", species: "dog", a: "a", word: "woof", sound: "Woof! Woof!", big: "WOOF!", bale: "L", h: 1.0, park: [4.9, 0, -1.2], voice: { voice: "deep", pitch: 1.05, speed: 1.05 }, praise: "Good job! Big woofs!", clue: "I see a waggy tail!" },
];
const HORSE = { id: "horse", species: "horse", a: "a", word: "neigh", sound: "Neigh! Neigh!", big: "NEIGH!", voice: { voice: "deep", pitch: 0.85, speed: 0.95 }, praise: "Amazing! What a big neigh!" };

const objects = [
  { id: "robo", kind: "character", character: "robot", at: [-4.7, 0, 0.9], rotation: [0, 35, 0], feeling: "happy" },
  { id: "barn", kind: "prop", model: "barn", at: [0, 0, -1.5] },
  { id: "horse", kind: "critter", species: "horse", at: [0, 0, -1.2], size: 0.9 },
  { id: "hay_l", kind: "prop", model: "hay_bale", at: BALE.L, size: 1.3, rotation: [0, 8, 0] },
  { id: "hay_r", kind: "prop", model: "hay_bale", at: BALE.R, size: 1.3, rotation: [0, -8, 0] },
];
// Hidden friends start sunk behind their bale (below the floor and behind the hay, so nothing shows).
for (const a of A) {
  const [x] = BALE[a.bale];
  a.hide = [x, 0.05 - a.h, -0.05];
  a.peek = [x, 0.98 - a.h, -0.05];
  a.front = [x * 0.55, 0, 1.75];
  objects.push({ id: a.id, kind: "critter", species: a.species, at: a.hide, rotation: [0, -x * 8, 0] });
}
objects.push({ id: "confetti", kind: "confetti", at: [0, 3.2, 1] });
// HUD: the tracker row (top left), its mini friends, the surprise "?", the countdown and the word bubble.
SLOT_COLORS.forEach((c, i) => objects.push({ id: `slot${i + 1}`, kind: "prop", model: "tracker_slot", color: c, hud: true, at: [slotX(i), 3.78, 0], size: 0.78, hidden: true }));
[...A, HORSE].forEach((a, i) => objects.push({ id: `mini_${a.id}`, kind: "critter", species: a.species, hud: true, parent: `slot${i + 1}`, at: [0, -0.4, 0.3], size: 0.46, hidden: true, rotation: [0, -12, 0] }));
objects.push({ id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot6", at: [0, -0.26, 0.2], size: 0.42, hidden: true });
objects.push({ id: "cd_bg", kind: "shape", shape: "circle", color: "white", hud: true, at: [0, -0.2, 1.5], size: 2.7, hidden: true });
for (const n of ["3", "2", "1"]) objects.push({ id: `cd${n}`, kind: "letter", text: n, color: "orange", hud: true, at: [0, 0.35, 2], size: 1.15, hidden: true });
objects.push({ id: "bubble", kind: "prop", model: "word_bubble", hud: true, at: [5.6, 2.05, 0], size: 1.75, hidden: true });
for (const a of [...A, HORSE]) objects.push({ id: `w_${a.id}`, kind: "letter", text: a.big, color: "ink", hud: true, parent: "bubble", at: [0, -0.2, 0.18], size: a.big.length > 5 ? 0.28 : 0.34, hidden: true });

const cast = Object.fromEntries([...A, HORSE].map((a) => [a.id, a.voice]));

// Helpers.
const art = (w) => (/^[aeiou]/.test(w) ? "an" : "a");
const say = (text, o = {}) => ({ do: "say", who: "robo", text, at: 0.2, caption: true, ...o });
const beat = (id, dur, actions) => ({ id, dur, do: actions.flat().filter(Boolean) });
const sung = (text, tune, extra = []) => [say(text, { tune, at: 0.1 }), ...extra];
const countdown = (at0 = 0.4) => [
  say("Three... two... one!", { at: at0, caption: false }),
  { do: "pop", target: "cd_bg", at: at0, dur: 0.3, sound: false },
  { do: "hide", target: "cd_bg", at: at0 + 2.15, dur: 0.2 },
  ...["3", "2", "1"].flatMap((n, i) => [
    { do: "pop", target: `cd${n}`, at: at0 + 0.05 + i * 0.75, dur: 0.3, sound: "tick" },
    { do: "hide", target: `cd${n}`, at: at0 + 0.62 + i * 0.75, dur: 0.12 },
  ]),
];
const word = (a, at = 0.2) => [{ do: "pop", target: "bubble", at, dur: 0.35, sound: false }, { do: "show", target: `w_${a.id}`, at: at + 0.05, dur: 0.25 }];
const unword = (a, at = 0) => [{ do: "hide", target: `w_${a.id}`, at, dur: 0.2 }, { do: "hide", target: "bubble", at: at + 0.05, dur: 0.25 }];

function verseSong(a, extraOld = []) {
  const W = a.word[0].toUpperCase() + a.word.slice(1);
  return [
    beat(`${a.id}_s1`, tuneDur(T.old), sung("Old MacDonald had a farm,", T.old, [{ do: "clip", target: "robo", clip: "Dance", at: 0.1 }, { do: "shot", target: [a.id, "robo"], framing: "wide", yaw: -10, dur: 2.2 }, ...extraOld])),
    beat(`${a.id}_s2`, tuneDur(T.eio), sung("E-I-E-I-O!", T.eio, [0, 1, 2, 3, 4].map((k) => ({ do: "hop", target: a.id, at: onBeat(k), height: 0.25, dur: 0.4 })))),
    beat(`${a.id}_s3`, tuneDur(T.onfarm), sung(`And on that farm he had ${a.a} ${a.id},`, T.onfarm, [{ do: "shot", target: a.id, framing: "medium", yaw: 15, dur: 2.4 }, { do: "feel", target: a.id, feeling: "joyful", at: 1.6 }])),
    beat(`${a.id}_s4`, tuneDur(T.eio), sung("E-I-E-I-O!", T.eio, [...[0, 1, 2, 3, 4].map((k) => ({ do: "hop", target: a.id, at: onBeat(k), height: 0.25, dur: 0.4 })), { do: "feel", target: a.id, feeling: "happy", at: onBeat(4) }])),
    beat(`${a.id}_s5`, tuneDur(T.here), sung(`With ${art(a.word)} ${a.word} ${a.word} here, and ${art(a.word)} ${a.word} ${a.word} there,`, T.here, [
      ...word(a, 0.15),
      { do: "turn", target: a.id, to: [0, -35, 0], at: onBeat(0.5), dur: 0.4 },
      { do: "hop", target: a.id, at: onBeat(1), height: 0.3, dur: 0.4 }, { do: "hop", target: a.id, at: onBeat(2), height: 0.3, dur: 0.4 },
      { do: "turn", target: a.id, to: [0, 35, 0], at: onBeat(5), dur: 0.4 },
      { do: "hop", target: a.id, at: onBeat(6), height: 0.3, dur: 0.4 }, { do: "hop", target: a.id, at: onBeat(7), height: 0.3, dur: 0.4 },
      { do: "orbit", around: [a.front[0], 0.7, a.front[2]], degrees: 18, dur: 3 },
    ])),
    beat(`${a.id}_s6`, tuneDur(T.everywhere), sung(`Here ${art(a.word)} ${a.word}, there ${art(a.word)} ${a.word}, everywhere ${art(a.word)} ${a.word} ${a.word}!`, T.everywhere, [
      { do: "turn", target: a.id, to: [0, 0, 0], at: 0.1, dur: 0.4 },
      ...[1, 3, 6, 7].map((k) => ({ do: "hop", target: a.id, at: onBeat(k), height: 0.25, dur: 0.4 })),
      { do: "spin", target: a.id, at: onBeat(4), dur: 1 },
      { do: "wiggle", target: "bubble", at: 0.4, deg: 8, dur: 2 },
    ])),
    beat(`${a.id}_s7`, tuneDur(T.full), sung("Old MacDonald had a farm, E-I-E-I-O!", T.full, [
      ...unword(a, 0.1),
      { do: "camera", ...DEFAULT_CAM, dur: 2.6 },
      { do: "clip", target: "robo", clip: "Jump", at: onBeat(11.5) },
      { do: "hop", target: a.id, at: onBeat(12), height: 0.4 },
    ])),
  ];
}

function yourTurn(a, i, last = false) {
  return [
    beat(`${a.id}_t1`, 2.2, [say(`Your turn! Say ${a.word}!`, { at: 0.1 }), { do: "clip", target: "robo", clip: "Wave", at: 0.2 }, { do: "look", target: a.id, at: 0.1, to: [0, 1.6, 9] }, ...word(a, 0.3)]),
    beat(`${a.id}_t2`, 2.2, [{ do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 }, { do: "wiggle", target: "bubble", at: 0.2, deg: 10, dur: 1.6 }]),
    beat(`${a.id}_t3`, 2.4, [{ do: "say", who: a.id, text: `${a.word[0].toUpperCase()}${a.word.slice(1)}!`, at: 0.1 }, { do: "hop", target: a.id, at: 0.15, height: 0.35 }, say(a.praise, { at: "after" }), { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.8 }]),
    beat(`${a.id}_t4`, 1.6, [
      ...unword(a, 0),
      ...(last ? [{ do: "hide", target: "qmark", at: 0.1, dur: 0.2 }] : []),
      { do: "pop", target: `mini_${a.id}`, at: 0.25, dur: 0.45, sound: "ding" },
      { do: "wiggle", target: `slot${i + 1}`, at: 0.3, deg: 10, dur: 0.8 },
      { do: "sound", sound: "sparkle", at: 0.35, volume: 0.6 },
      { do: "look", target: a.id, at: 0.2, to: "ahead" },
    ]),
  ];
}

const scenes = [];

// 0:00 The hook: singing straight away, the farm flies in, the tracker appears, the surprise is teased.
scenes.push({ id: "hello", title: "Sing with Robo", music: false, beats: [
  beat("h1", 3.4, [
    { do: "camera", position: [0, 3.4, 13.5], lookAt: [0, 1.5, -1], fov: 40, dur: 0 },
    { do: "camera", ...DEFAULT_CAM, dur: 3.4 },
    say("Old MacDonald had a farm, E-I-E-I-O!", { tune: T.full, at: 0.15 }),
    { do: "clip", target: "robo", clip: "Jump", at: 0.1 },
    { do: "wiggle", target: "barn#door_left", at: 1.2, deg: 6, dur: 0.6 }, { do: "wiggle", target: "barn#door_right", at: 1.3, deg: 6, dur: 0.6 },
  ]),
  beat("h2", 2.6, [
    say("Five animal friends are hiding! Can you find them?", { at: 0.1 }),
    ...[0, 1, 2, 3, 4].map((i) => ({ do: "pop", target: `slot${i + 1}`, at: 0.3 + i * 0.22, dur: 0.35, sound: "pop" })),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
  beat("h3", 2.8, [
    say("And a BIG surprise is in the barn!", { at: 0.1 }),
    { do: "pop", target: "slot6", at: 0.2, dur: 0.4, sound: "magic_sparkle" }, { do: "pop", target: "qmark", at: 0.4, dur: 0.4, sound: false },
    { do: "shot", target: "barn", framing: "medium", dur: 1.2 },
    { do: "wiggle", target: "barn#door_left", at: 0.9, deg: 9, dur: 0.8 }, { do: "wiggle", target: "barn#door_right", at: 1.0, deg: 9, dur: 0.8 },
    { do: "sound", sound: "squeak", at: 1.0, volume: 0.6 },
    { do: "grow", target: "slot6", to: 1.2, at: 1.4, dur: 0.3 }, { do: "grow", target: "slot6", to: 1, at: 1.8, dur: 0.3 },
  ]),
]});

// Each friend: listen and guess (detective), 3-2-1 reveal, the sung verse, your turn, the tracker fills.
A.forEach((a, i) => {
  const bale = a.bale === "L" ? "hay_l" : "hay_r";
  const intro = i === 0 ? "Listen! Who is hiding behind the hay?" : ["Shh... listen! Who's next?", "Who is hiding now? Listen!", "Listen carefully... who is it?", "One more friend! Listen!"][i - 1];
  scenes.push({ id: `${a.id}_find`, title: `Who says ${a.word}?`, beats: [
    beat(`${a.id}_f1`, 2.2, [
      { do: "shot", target: bale, framing: "medium", height: 10, pad: 0.9, dur: 1.4 },
      say(intro, { at: 0.2 }),
      { do: "look", target: "robo", at: 0.2, to: bale },
      ...(i > 0 ? [{ do: "path", target: A[i - 1].id, points: [A[i - 1].front, [A[i - 1].front[0], 0, 0.2], A[i - 1].park], dur: 1.8, face: true }, { do: "turn", target: A[i - 1].id, to: [0, -A[i - 1].park[0] * 6, 0], at: 1.9, dur: 0.4 }] : []),
    ]),
    beat(`${a.id}_f2`, 2.4, [
      { do: "move", target: a.id, to: a.peek, at: 0.1, dur: 0.35, ease: "backOut" },
      { do: "say", who: a.id, text: a.sound, at: 0.35 },
      ...word(a, 0.4),
      { do: "wiggle", target: a.id, at: 0.5, deg: 10, dur: 1.2 },
    ]),
    beat(`${a.id}_f3`, 2.4, [
      say(`${a.clue} Who says ${a.word}?`, { at: 0.1 }),
      { do: "move", target: a.id, to: a.hide, at: 0.2, dur: 0.3 },
      { do: "clip", target: "robo", clip: "Yes", at: 0.3 },
    ]),
    beat(`${a.id}_f4`, 2.6, [...unword(a, 0), ...countdown(0.15)]),
    beat(`${a.id}_f5`, 2.6, [
      { do: "path", target: a.id, points: [a.hide, [a.hide[0], 1.15, 0.45], a.front], dur: 0.75 },
      { do: "sound", sound: "boing", at: 0.05 },
      { do: "sound", sound: "ding", at: 0.75 },
      { do: "burst", target: "confetti", at: 0.8, dur: 2.2, sound: false },
      { do: "feel", target: a.id, feeling: "joyful", at: 0.8 },
      { do: "shot", target: a.id, framing: "medium", dur: 0.9 },
      say(`It's ${a.a} ${a.id}!`, { at: 0.95, caption: false }),
      { do: "caption", text: a.id.toUpperCase(), style: "label", at: 0.95, dur: 1.6 },
      { do: "clip", target: "robo", clip: "Jump", at: 0.9 },
    ]),
  ]});
  scenes.push({ id: `${a.id}_song`, title: `Sing: the ${a.id}`, music: false, beats: verseSong(a) });
  scenes.push({ id: `${a.id}_turn`, title: `Say ${a.word}!`, beats: yourTurn(a, i) });
});

// The barn surprise: the horse.
const last = A[A.length - 1];
const horseFront = [0, 0, 1.4];
HORSE.front = horseFront;
scenes.push({ id: "horse_find", title: "The surprise in the barn", beats: [
  beat("horse_f1", 2.8, [
    { do: "path", target: last.id, points: [last.front, [last.front[0] + 1.5, 0, 0.6], last.park], dur: 1.8, face: true },
    { do: "turn", target: last.id, to: [0, -25, 0], at: 1.9, dur: 0.4 },
    { do: "shot", target: "barn", framing: "medium", dur: 1.4 },
    say("Now... the BIG surprise! Who is in the barn?", { at: 0.2 }),
    { do: "look", target: "robo", at: 0.2, to: "barn" },
    ...A.map((a, k) => ({ do: "look", target: a.id, at: 0.4 + k * 0.1, to: "barn" })),
  ]),
  beat("horse_f2", 2.4, [
    { do: "say", who: "horse", text: HORSE.sound, at: 0.3 },
    { do: "wiggle", target: "barn#door_left", at: 0.3, deg: 10, dur: 1.2 }, { do: "wiggle", target: "barn#door_right", at: 0.35, deg: 10, dur: 1.2 },
    ...word(HORSE, 0.4),
  ]),
  beat("horse_f3", 2.2, [say("Who says neigh? Let's open the doors!", { at: 0.1 }), { do: "wiggle", target: "slot6", at: 0.3, deg: 12, dur: 1 }]),
  beat("horse_f4", 2.6, [...unword(HORSE, 0), ...countdown(0.15)]),
  beat("horse_f5", 3.4, [
    { do: "turn", target: "barn#door_left", to: [0, -100, 0], at: 0, dur: 0.9, ease: "backOut" },
    { do: "turn", target: "barn#door_right", to: [0, 100, 0], at: 0, dur: 0.9, ease: "backOut" },
    { do: "sound", sound: "door_open", at: 0 },
    { do: "path", target: "horse", points: [[0, 0, -1.2], [0, 0, 0.2], horseFront], dur: 1.6, at: 0.9 },
    ...[0, 1, 2, 3].map((k) => ({ do: "hop", target: "horse", at: 0.95 + k * 0.4, height: 0.12, dur: 0.38 })),
    { do: "sound", sound: "ding", at: 2.5 },
    { do: "burst", target: "confetti", at: 2.5, dur: 2.4 },
    { do: "feel", target: "horse", feeling: "joyful", at: 2.5 },
    { do: "shot", target: "horse", framing: "medium", at: 1.6, dur: 1.4 },
    say("It's a horse!", { at: 2.6, caption: false }),
    { do: "caption", text: "HORSE", style: "label", at: 2.6, dur: 1.6 },
    { do: "sound", sound: "crowd_cheer", at: 2.7, volume: 0.5 },
  ]),
]});
HORSE.a = "a";
scenes.push({ id: "horse_song", title: "Sing: the horse", music: false, beats: verseSong(HORSE) });
scenes.push({ id: "horse_turn", title: "Say neigh!", beats: yourTurn(HORSE, 5, true) });

// Recap quiz: point to it before the countdown ends.
const quiz = [
  { q: "Which one says oink? Point to it!", pair: ["pig", "duck"], right: "pig", sound: "Oink! Oink!" },
  { q: "Who says baa? Point to it!", pair: ["cow", "sheep"], right: "sheep", sound: "Baa!" },
  { q: "Who says woof? Point to it!", pair: ["dog", "horse"], right: "dog", sound: "Woof! Woof!" },
];
const quizBeats = [beat("q0", 2.4, [
  say("You found everyone! Now a quick game.", { at: 0.1 }),
  { do: "camera", ...DEFAULT_CAM, dur: 1.4 },
  { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
  { do: "path", target: "horse", points: [horseFront, [1.2, 0, -0.2], [1.2, 0, -0.6]], dur: 1.6, face: true },
  { do: "turn", target: "horse", to: [0, -20, 0], at: 1.7, dur: 0.4 },
])];
const where = (id) => (id === "horse" ? [1.2, 0, -0.6] : A.find((a) => a.id === id).park);
quiz.forEach((z, k) => {
  const [l, r] = z.pair;
  const spots = { [l]: [-1.1, 0, 1.6], [r]: [1.1, 0, 1.6] };
  quizBeats.push(
    beat(`q${k + 1}a`, 2.6, [
      { do: "move", target: l, to: spots[l], dur: 1, ease: "sineInOut" },
      { do: "move", target: r, to: spots[r], dur: 1, ease: "sineInOut" },
      { do: "turn", target: l, to: [0, 10, 0], dur: 0.6 }, { do: "turn", target: r, to: [0, -10, 0], dur: 0.6 },
      { do: "shot", target: [l, r], framing: "medium", dur: 1.2 },
      say(z.q, { at: 0.5 }),
    ]),
    beat(`q${k + 1}b`, 2.8, [
      ...countdown(0.1),
      { do: "hop", target: l, at: 0.2, height: 0.2 }, { do: "hop", target: r, at: 0.95, height: 0.2 }, { do: "hop", target: l, at: 1.7, height: 0.2 },
    ]),
    beat(`q${k + 1}c`, 3, [
      { do: "mark", target: z.right, result: "correct", at: 0.1, dur: 2.2 },
      { do: "say", who: z.right, text: z.sound, at: 0.3 },
      { do: "hop", target: z.right, at: 0.3, height: 0.4 },
      { do: "feel", target: z.right, feeling: "joyful", at: 0.3 },
      say(`Yes! The ${z.right}!`, { at: "after" }),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.6 },
    ]),
    beat(`q${k + 1}d`, 1.2, [
      { do: "move", target: l, to: where(l), dur: 1, ease: "sineInOut" },
      { do: "move", target: r, to: where(r), dur: 1, ease: "sineInOut" },
      { do: "feel", target: z.right, feeling: "happy", at: 0.6 },
    ]),
  );
});
scenes.push({ id: "quiz", title: "Point to it!", beats: quizBeats });

// Last chorus with everyone, then bye-bye.
const all = [...A.map((a) => a.id), "horse"];
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("z1", 3.4, [
    say("Everybody sing!", { at: 0.1 }),
    say("Old MacDonald had a farm, E-I-E-I-O!", { tune: T.full, at: "after" }),
    { do: "camera", position: [0, 2.6, 11], lookAt: [0, 1.2, -0.8], fov: 40, dur: 2.5 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    ...all.map((id, k) => ({ do: "hop", target: id, at: 0.6 + k * 0.28, height: 0.4 })),
    ...all.map((id, k) => ({ do: "feel", target: id, feeling: "joyful", at: 0.4 + k * 0.1 })),
  ]),
  beat("z2", 2.6, [
    { do: "burst", target: "confetti", at: 0.1, dur: 2.6 },
    say("Moo, quack, oink, baa, woof, and neigh!", { at: 0.2 }),
    ...all.map((id, k) => ({ do: "hop", target: id, at: 0.3 + k * 0.35, height: 0.3 })),
    ...[1, 2, 3, 4, 5, 6].map((n, k) => ({ do: "wiggle", target: `slot${n}`, at: 0.3 + k * 0.35, deg: 10, dur: 0.5 })),
  ]),
  beat("z3", 3.2, [
    say("Bye-bye, friends! See you on the farm!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    ...all.map((id, k) => ({ do: "wiggle", target: id, at: 0.4 + k * 0.1, deg: 8, dur: 1.5 })),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.4 },
    { do: "camera", position: [0, 3.6, 14.5], lookAt: [0, 1.6, -1], fov: 40, dur: 3 },
  ]),
]});

const description = "Sing Old MacDonald Had a Farm with Robo and learn animal sounds! Five animal friends are hiding on the farm: listen to the sound, guess who it is, count down 3, 2, 1, and see them jump out. Then sing each verse together, say the sound on your turn, and fill up the animal tracker. A big surprise is waiting in the barn at the end, then a quick point-to-it quiz.";
const script = {
  kind: "video3d", version: 1, description,
  meta: {
    title: "Old MacDonald Had a Farm", series: "toybox", episode: "br01", audience: "babies", seed: 301,
    voice: "soft", voiceSpeed: 0.92, music: "playful", musicGain: 0.17, skills: ["listening_prek"], cast,
    youtube: {
      title: "Old MacDonald Had a Farm 🐮 Animal Sounds Sing-Along for Toddlers | Toy Box Friends",
      description: `${description}\n\nAnimals and sounds: cow (moo), duck (quack), pig (oink), sheep (baa), dog (woof) and horse (neigh).\n\nSing at home: make the sounds together, then ask "Who says moo?" and let your little one point or answer. Old MacDonald is a traditional public-domain rhyme.\n\nMade for kids. Toy Box Friends: 3D learning videos for babies, toddlers and preschool.`,
      tags: ["old macdonald had a farm", "nursery rhymes", "animal sounds for toddlers", "farm animals", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "farm", title: "OLD MACDONALD", subtitle: "Animal sounds sing-along", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "farm",
        camera: { position: [0.9, 1.5, 7.2], lookAt: [1.6, 1.15, -0.6], fov: 36 },
        objects: [
          { id: "barn", kind: "prop", model: "barn", at: [3.0, 0, -2.6] },
          { id: "horse", kind: "critter", species: "horse", at: [2.3, 0, 0.0], size: 1, rotation: [0, -15, 0], feeling: "joyful" },
          { id: "duck", kind: "critter", species: "duck", at: [3.05, 0, 1.5], size: 0.75, rotation: [0, -15, 0], feeling: "joyful" },
          { id: "cow", kind: "critter", species: "cow", at: [3.95, 0, 0.6], size: 0.95, rotation: [0, -30, 0], feeling: "happy" },
          { id: "robo", kind: "character", character: "robot", at: [4.9, 0, -0.4], rotation: [0, -35, 0], clip: "Wave", feeling: "happy" },
        ] },
      { name: "moo", title: "WHO SAYS MOO?", subtitle: "Guess the farm animal!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "farm",
        camera: { position: [1.4, 1.25, 5.4], lookAt: [1.7, 0.9, 0], fov: 36 },
        objects: [
          { id: "hay", kind: "prop", model: "hay_bale", at: [2.75, 0, 0.7], size: 1.45 },
          { id: "cow", kind: "critter", species: "cow", at: [2.75, 0.02, 0.05], size: 1.2, feeling: "joyful" },
          { id: "bubble", kind: "prop", model: "word_bubble", at: [3.5, 2.0, 0.3], size: 0.95 },
          { id: "moo", kind: "letter", text: "MOO!", color: "ink", parent: "bubble", at: [0, -0.12, 0.12], size: 0.2 },
        ] },
    ],
  },
  stage: { preset: "farm" },
  camera: DEFAULT_CAM,
  objects,
  scenes,
};
// Fit each sung beat to its spoken line: the beat lasts the line plus a breath, and actions timed on the tune's
// beat are scaled to the spoken length.
const DURS = new URL("./durs/br01.json", import.meta.url);
if (existsSync(DURS)) {
  const durs = JSON.parse(readFileSync(DURS, "utf8"));
  for (const sc of scenes) for (const b of sc.beats) {
    const line = b.do.find((x) => x.do === "say" && x.tune);
    if (!line || durs[line.text] == null) continue;
    const span = line.tune.split(/\s+/).reduce((n, tok) => n + Number(tok.split(":")[1] ?? 1), 0) * BEAT;
    const spoken = durs[line.text];
    const k = Math.min(1, spoken / span);
    for (const x of b.do) {
      if (x === line) continue;
      if (typeof x.at === "number" && x.at > 0.1) x.at = Math.round((0.1 + (x.at - 0.1) * k) * 100) / 100;
      if (x.do === "shot" && typeof x.dur === "number") x.dur = Math.round(Math.max(0.8, x.dur * k) * 100) / 100;
    }
    b.dur = Math.round(Math.max(1.6, 0.1 + spoken + 0.45) * 100) / 100;
  }
}
writeFileSync(OUT, `${JSON.stringify(script, null, 1)}\n`);
console.log("wrote", OUT.pathname, scenes.length, "scenes", scenes.reduce((n, s) => n + s.beats.length, 0), "beats");
