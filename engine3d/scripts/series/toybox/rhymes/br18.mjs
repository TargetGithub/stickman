// Builds ../br18_hey_diddle_diddle.json: Hey Diddle Diddle (traditional, public domain) on a moonlit night, plus
// original verses on the same tune about position words: the cat hides UNDER the table, the cow jumps OVER the
// moon, the little dog runs AROUND the tree, the spoon climbs UP the blocks and the moon comes DOWN to meet it.
// Hook: the cow jumps over the moon in the first second. Interactions: "Over or under?" (a pause, 3-2-1, the
// answer) for the cat and the cow, laugh along with the dog ("Ha ha ha!"), find the spoon (peekaboo behind a
// bush), say the position word (your turn), and a point-to-it recap quiz. Tracker: four night-sky friends (cat,
// cow, dog, dish and spoon), the last slot teased as a surprise.
// New models: catalog/models/rhymes_br18.json (fiddle, dish, spoon_friend, moon_face).
// Run: node br18.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  say, beat, sung, onBeat, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, showTracker, fillSlot, yourTurn, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// Hey Diddle Diddle (traditional, public domain), a 6/8 lilt in C, one note per syllable. Sung lines end in a
// comma or a full stop (a "!" slows the voice).
const T = {
  a: "G4 G4:0.5 A4 G4:0.5 E4:1.5", //                                   Hey, did-dle did-dle,
  b: "G4:0.5 G4 G4:0.5 A4 G4:0.5 E4:1.5", //                            The cat and the fid-dle,
  c: "G4:0.5 C5 B4:0.5 A4 G4:0.5 F4 E4:2", //                           The cow jumped o-ver the moon.
  c8: "G4:0.5 C5 B4:0.5 A4:0.5 A4:0.5 G4:0.5 F4 E4:2", //               The cat hides un-der the ta-ble.
  d: "E4:0.5 F4 F4:0.5 F4 D4:0.5 D4 E4:0.5 F4 G4:1.5", //               The lit-tle dog laughed to see such sport,
  e: "G4:0.5 G4:0.5 A4 G4:0.5 F4 E4:0.5 D4 E4:0.5 C4:2", //             And the dish ran a-way with the spoon.
};
const TRAD = [
  ["Hey diddle diddle,", T.a], ["The cat and the fiddle,", T.b], ["The cow jumped over the moon.", T.c],
  ["The little dog laughed to see such sport,", T.d], ["And the dish ran away with the spoon.", T.e],
];
// Original verses (same tune): the first two lines stay, the last three teach a position word.
const VERSE = {
  under: [["The cat hides under the table.", T.c8], ["Under, under, where is the kitty?", T.d], ["Peekaboo, she's under the table.", T.e]],
  over: [["The cow jumped over the moon.", T.c], ["Over, over, the cow jumps over,", T.d], ["She jumped right over the big round moon.", T.e]],
  around: [["The dog runs around the tree.", T.c], ["Around, around, the little dog runs,", T.d], ["Ha ha, ha ha, round and round the tree.", T.e]],
  updown: [["The spoon climbs up, up and up.", T.c], ["Up goes the spoon, down comes the moon,", T.d], ["And the dish ran away with the spoon.", T.e]],
};

// ---- Layout (night stage) -------------------------------------------------------------------------------------

const CAM = { position: [0, 2.0, 8.2], lookAt: [0, 1.25, -0.6], fov: 40 };
const WIDE = { position: [0, 2.5, 10.2], lookAt: [0, 1.5, -0.8], fov: 40 };
const HOOK_CAM = { position: [0.1, 1.9, 6.4], lookAt: [0.1, 1.55, -2.0], fov: 40 };
const COW_CAM = { position: [-0.5, 1.7, 5.6], lookAt: [0.0, 1.35, -2.0], fov: 40 };
const STAIR_CAM = { position: [0.5, 1.9, 6.0], lookAt: [0.6, 1.15, 0.3], fov: 40 };
const MOON_CAM = { position: [1.0, 1.9, 6.3], lookAt: [1.1, 1.35, -0.1], fov: 40 };
const ROBO = [3.45, 0, 0.85];
const TABLE = [-3.1, 0, -0.9];
const UNDER_T = [-3.1, 0, -0.85];
const CAT = [-2.3, 0, 0.9];
const COW_L = [-2.2, 0, -2.2];
const COW_R = [2.1, 0, -2.2];
const MOON_LOW = [0.1, 0.1, -2.4];
const MOON_HIGH = [0.3, 3.0, -2.6];
const MOON_STEP = [1.95, 0.7, -0.25];
const TREE = [3.3, 0, -2.1];
const DOG = [2.4, 0, 1.2];
const BUSH = [-0.55, 0, 0.3];
const SPOON_HIDE = [-0.55, -1.6, -0.1];
const SPOON_PEEK = [-0.55, 0.4, -0.1];
const SPOON_OUT = [-0.35, 0, 0.85];
const SPOON_REST = [-0.3, 0, 1.4];
const DISH_AT = [-1.25, 0, 1.45];
const OFF_R = [7.5, 0, 1.6];
const SINK = (p) => [p[0], -2.2, p[2]];
const CUBE = 0.42;
const STAIR_X = [0.15, 0.6, 1.05];
const STAIR_Z = 0.7;
const r2 = (v) => Math.round(v * 100) / 100;

// ---- Objects --------------------------------------------------------------------------------------------------

const STAIR_COLORS = ["red", "yellow", "blue", "green", "orange", "purple"];
const stairCubes = [];
STAIR_X.forEach((x, col) => { for (let k = 0; k <= col; k++) stairCubes.push({ x, k, id: `cube${stairCubes.length + 1}` }); });

const objects = [
  { id: "sky", kind: "stars", count: 160 },
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, -25, 0], feeling: "happy" },
  { id: "moon", kind: "critter", species: "moon_face", at: MOON_LOW, size: 1.35, feeling: "happy" },
  { id: "table", kind: "prop", model: "table", at: TABLE, size: 1.0, rotation: [0, 15, 0] },
  { id: "tree", kind: "prop", model: "tree", at: TREE, size: 1.1 },
  { id: "bush", kind: "prop", model: "bush", at: BUSH, size: 0.75 },
  { id: "tree_far2", kind: "prop", model: "tree", at: [-6.4, 0, -5.6], size: 1.4 },
  { id: "tree_far", kind: "prop", model: "tree", at: [6.4, 0, -5.0], size: 1.5 },
  { id: "cloud1", kind: "prop", model: "cloud", at: [-4.2, 4.6, -7], size: 1.2 },
  { id: "cloud2", kind: "prop", model: "cloud", at: [4.6, 5.0, -8], size: 1.4 },
  { id: "cat", kind: "critter", species: "cat", at: CAT, size: 0.65, rotation: [0, 25, 0], feeling: "happy" },
  { id: "fiddle", kind: "prop", model: "fiddle", parent: "cat", at: [0.05, 0.19, 0.22], rotation: [0, 0, -45], size: 0.6 },
  { id: "cow", kind: "critter", species: "cow", at: COW_L, size: 0.85, rotation: [0, 60, 0], feeling: "happy" },
  { id: "dog", kind: "critter", species: "dog", at: DOG, size: 0.68, rotation: [0, -20, 0], feeling: "happy" },
  { id: "spoon", kind: "critter", species: "spoon_friend", at: SPOON_HIDE, size: 0.8, hidden: true },
  { id: "dish", kind: "critter", species: "dish", at: SINK(DISH_AT), size: 0.8, hidden: true },
  ...stairCubes.map((c, i) => ({ id: c.id, kind: "shape", shape: "cube", color: STAIR_COLORS[i], at: [c.x, c.k * CUBE, STAIR_Z], size: CUBE, hidden: true })),
  { id: "confetti", kind: "confetti", at: [0, 3.4, 0.6] },
];
// HUD: four tracker slots with the four friends, a "?" on the surprise slot; the 3-2-1 countdown; the word bubble.
const MINI = { at: [0, -0.33, 0.2] };
objects.push(...trackerObjects(4));
objects.push(
  { id: "mini_cat", kind: "critter", species: "cat", hud: true, parent: "slot1", ...MINI, size: 0.5, hidden: true },
  { id: "mini_cow", kind: "critter", species: "cow", hud: true, parent: "slot2", ...MINI, size: 0.45, hidden: true },
  { id: "mini_dog", kind: "critter", species: "dog", hud: true, parent: "slot3", ...MINI, size: 0.5, hidden: true },
  { id: "mini_dish", kind: "critter", species: "dish", hud: true, parent: "slot4", at: [-0.13, -0.33, 0.2], size: 0.55, hidden: true },
  { id: "mini_spoon", kind: "critter", species: "spoon_friend", hud: true, parent: "slot4", at: [0.19, -0.33, 0.25], size: 0.48, hidden: true },
  { id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot4", at: [0, -0.2, 0.2], size: 0.4, hidden: true },
);
objects.push(...countdownObjects());
objects.push(...bubbleObjects([
  { id: "over", text: "OVER" }, { id: "under", text: "UNDER" }, { id: "around", text: "AROUND" },
  { id: "up", text: "UP" }, { id: "down", text: "DOWN" }, { id: "haha", text: "HA HA!" },
]));

const cast = {
  cat: { voice: "squeaky", pitch: 1.15, speed: 1.0 },
  cow: { voice: "deep", pitch: 1.0, speed: 0.95 },
  dog: { voice: "soft", pitch: 1.1, speed: 1.05 },
  spoon: { voice: "squeaky", pitch: 1.25, speed: 1.0 },
  dish: { voice: "soft", pitch: 1.15, speed: 1.0 },
  moon: { voice: "soft", pitch: 0.95, speed: 0.95 },
};

// ---- Helpers --------------------------------------------------------------------------------------------------

/** The cat plays her fiddle: the bow saws back and forth. */
const fiddle = (at, sound = true) => [
  { do: "wiggle", target: "fiddle#bow", at, deg: 16, dur: 1.2 },
  { do: "wiggle", target: "cat", at, deg: 5, dur: 1.2 },
  sound ? { do: "sound", sound: "twang", at: at + 0.1, volume: 0.35 } : null,
];
/** The cow jumps over the moon (left to right or back), an arc through 7 points; ends facing the front. In a sung
 * beat (tail: "next") the landing turn moves to the next beat, since fitSung rescales start times but not path durations. */
let cowAt = COW_L;
function cowJump(at, dur = 1.3, sound = true, tail = "here") {
  const from = cowAt;
  const to = from === COW_L ? COW_R : COW_L;
  cowAt = to;
  const pts = Array.from({ length: 7 }, (_, k) => {
    const t = k / 6;
    return [r2(from[0] + (to[0] - from[0]) * t), r2(2.6 * 4 * t * (1 - t)), r2(from[2] + 0.1 * Math.sin(Math.PI * t))];
  });
  const land = { do: "turn", target: "cow", to: [0, to === COW_R ? -40 : 40, 0], at: tail === "next" ? 0.05 : r2(at + dur + 0.05), dur: 0.35 };
  if (tail === "next") land._next = true;
  return [
    { do: "path", target: "cow", points: pts, at, dur, face: true },
    sound ? { do: "sound", sound: "boing", at, volume: 0.6 } : null,
    sound ? { do: "sound", sound: "whoosh", at: r2(at + dur * 0.35), volume: 0.5 } : null,
    { do: "feel", target: "moon", feeling: "surprised", at: r2(at + 0.2) },
    land,
    { do: "feel", target: "moon", feeling: "joyful", at: tail === "next" ? 0.1 : r2(at + dur + 0.1), ...(tail === "next" ? { _next: true } : {}) },
  ];
}
/** The little dog runs once around the tree and back to his spot (in a sung beat the last turn moves to the next beat). */
function dogAround(at, dur = 2.6, tail = "here") {
  const pts = [DOG];
  for (let k = 0; k <= 8; k++) {
    const a = (k / 8) * 2 * Math.PI; // from the front, round by the right
    pts.push([r2(TREE[0] + 0.85 * Math.sin(a)), 0, r2(TREE[2] + 0.85 * Math.cos(a))]);
  }
  pts.push(DOG);
  const turn = { do: "turn", target: "dog", to: [0, -20, 0], at: tail === "next" ? 0.05 : r2(at + dur + 0.05), dur: 0.3 };
  if (tail === "next") turn._next = true;
  return [{ do: "path", target: "dog", points: pts, at, dur, face: true }, turn];
}
const pop = (id, to, at, sound = "pop") => [{ do: "move", target: id, to, at: Math.max(0, r2(at - 0.02)), dur: 0.01 }, { do: "pop", target: id, at, dur: 0.4, sound }];
/** The traditional verse's opening (lines 1-2) with the cat fiddling. */
const opening = (id, cam) => [
  beat(`${id}1`, 0, sung(TRAD[0][0], TRAD[0][1], [
    cam ? { do: "shot", ...cam, dur: 1.0 } : null,
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    fiddle(onBeat(0.5), false),
  ])),
  beat(`${id}2`, 0, sung(TRAD[1][0], TRAD[1][1], [fiddle(onBeat(0.5), false), { do: "hop", target: "cat", at: onBeat(4), height: 0.2 }])),
];
// Sung beats are created with dur 0 and get their length from the tune here (fitSung refits them later).
const tuneLen = (b) => { const s = b.do.find((x) => x.tune); if (s && !b.dur) b.dur = r2(0.4 + s.tune.trim().split(/\s+/).reduce((n, t) => n + Number(t.split(":")[1] ?? 1), 0) * (60 / 112)); return b; };

// ---- Scenes ---------------------------------------------------------------------------------------------------

const scenes = [];

// 0:00 Hook: the cow jumps over the moon at once; the tracker and the surprise slot.
scenes.push({ id: "hello", title: "Over the moon!", beats: [
  beat("h1", 3.2, [
    { do: "camera", ...HOOK_CAM, dur: 0 },
    cowJump(0.05, 1.25),
    say("Over! The cow jumps over the moon!", { at: 0.3 }),
    word("over", 1.0),
    { do: "feel", target: "moon", feeling: "joyful", at: 0.6 },
    { do: "clip", target: "robo", clip: "Jump", at: 1.2 },
  ]),
  beat("h2", 3.0, [
    unword("over", 0),
    { do: "camera", ...CAM, dur: 1.2 },
    say("Hey diddle diddle! Over, under, up and down!", { at: 0.1 }),
    showTracker(4, 0.4, 0.25),
    fiddle(0.4),
    { do: "hop", target: "dog", at: 1.4, height: 0.3 },
    { do: "feel", target: "moon", feeling: "happy", at: 0.2 },
  ]),
  beat("h3", 2.6, [
    say("And who comes last? A surprise friend!", { at: 0.1 }),
    { do: "pop", target: "qmark", at: 0.5, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot4", at: 0.8, deg: 12, dur: 1 },
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
  ]),
]});

// The traditional rhyme, all together once.
scenes.push({ id: "rhyme", title: "Hey diddle diddle", music: false, beats: [
  ...opening("t", { target: ["cat", "table"], framing: "medium", yaw: 15 }),
  beat("t3", 0, sung(TRAD[2][0], TRAD[2][1], [{ do: "camera", ...COW_CAM, dur: 0.9 }, cowJump(onBeat(2), 1.2, false, "next")])),
  beat("t4", 0, sung(TRAD[3][0], TRAD[3][1], [
    { do: "shot", target: ["dog", "tree"], framing: "medium", yaw: -10, dur: 1.0 },
    { do: "feel", target: "dog", feeling: "joyful", at: onBeat(2) },
    { do: "hop", target: "dog", at: onBeat(3), height: 0.3 }, { do: "hop", target: "dog", at: onBeat(5), height: 0.3 },
    { do: "sound", sound: "giggle", at: onBeat(4), volume: 0.4 },
  ])),
  beat("t5", 0, sung(TRAD[4][0], TRAD[4][1], [
    { do: "camera", ...CAM, dur: 1.0 },
    { do: "wiggle", target: "slot4", at: onBeat(2), deg: 14, dur: 1.2 },
    { do: "grow", target: "slot4", to: 1.25, at: onBeat(5), dur: 0.3 }, { do: "grow", target: "slot4", to: 1, at: onBeat(6), dur: 0.3 },
    { do: "look", target: "robo", at: onBeat(1), to: [-3, 1, -2] }, { do: "look", target: "robo", at: onBeat(5), to: [3, 1, -2] },
    { do: "feel", target: "dog", feeling: "happy", at: onBeat(6) },
  ])),
]});

// Verse 1: the cat goes UNDER the table ("Over or under?").
const catPath = (from, to) => [from, [r2((from[0] + to[0]) / 2), 0, r2((from[2] + to[2]) / 2 + 0.2)], to];
scenes.push({ id: "cat", title: "The cat: under", beats: [
  beat("c1", 2.6, [
    { do: "look", target: "robo", at: 0.1, to: "ahead" },
    { do: "shot", target: ["cat", "table"], framing: "medium", yaw: 12, dur: 1.2 },
    say("Here is the cat with her fiddle!", { at: 0.2 }),
    fiddle(0.9),
    { do: "say", who: "cat", text: "Meow!", at: 1.9 },
  ]),
  beat("c2", 2.8, [
    say("Where will the cat go? Over the table, or under the table?", { at: 0.1 }),
    { do: "wiggle", target: "table", at: 0.6, deg: 5, dur: 0.8 },
    { do: "look", target: "cat", at: 0.6, to: "table" },
  ]),
  beat("c3", 2.6, countdown(0.1)),
  beat("c4", 3.0, [
    { do: "path", target: "cat", points: catPath(CAT, UNDER_T), at: 0.05, dur: 1.0, face: true },
    { do: "turn", target: "cat", to: [0, 20, 0], at: 1.1, dur: 0.3 },
    say("Under! The cat is under the table!", { at: 0.6 }),
    word("under", 0.8),
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 1.0 },
  ]),
]});
scenes.push({ id: "cat_sing", title: "Sing: under the table", music: false, beats: [
  ...opening("cs", { target: ["cat", "table"], framing: "medium", yaw: -15 }).map((b, i) => (i === 0 ? { ...b, do: [...unword("under", 0.1), ...b.do] } : b)),
  beat("cs3", 0, sung(VERSE.under[0][0], VERSE.under[0][1], [{ do: "wiggle", target: "table", at: onBeat(3), deg: 5, dur: 0.7 }, { do: "hop", target: "cat", at: onBeat(5), height: 0.15 }])),
  beat("cs4", 0, sung(VERSE.under[1][0], VERSE.under[1][1], [
    { do: "look", target: "robo", at: onBeat(1), to: [-5, 1, 2] }, { do: "look", target: "robo", at: onBeat(4), to: "table" },
    { do: "shot", target: ["table", "robo"], framing: "wide", dur: 1.2 },
  ])),
  beat("cs5", 0, sung(VERSE.under[2][0], VERSE.under[2][1], [
    { do: "shot", target: ["cat", "table"], framing: "close", yaw: 10, dur: 0.9 },
    { do: "feel", target: "cat", feeling: "joyful", at: onBeat(1) },
    { do: "wiggle", target: "cat", at: onBeat(1), deg: 12, dur: 1.0 },
    { do: "sound", sound: "giggle", at: onBeat(2), volume: 0.4 },
  ])),
]});
scenes.push({ id: "cat_turn", title: "Your turn: under", beats: [
  ...yourTurn({ id: "c5", ask: "Say it with me! Under!", answer: "Under!", answerWho: "cat", praise: "Yes! Under the table!", wordId: "under", slot: 1, mini: "mini_cat" }),
  beat("c6", 1.6, [
    { do: "path", target: "cat", points: catPath(UNDER_T, CAT), at: 0.05, dur: 1.1, face: true },
    { do: "turn", target: "cat", to: [0, 25, 0], at: 1.2, dur: 0.3 },
    { do: "feel", target: "cat", feeling: "happy", at: 0.2 },
  ]),
]});

// Verse 2: the cow jumps OVER the moon ("Over or under?").
scenes.push({ id: "cow", title: "The cow: over", beats: [
  beat("w1", 2.6, [
    { do: "camera", ...COW_CAM, dur: 1.2 },
    say("Here is the cow! Hello, cow!", { at: 0.2 }),
    { do: "say", who: "cow", text: "Moo!", at: 1.7 },
    { do: "hop", target: "cow", at: 1.7, height: 0.2 },
  ]),
  beat("w2", 2.8, [
    say("Will the cow jump over the moon, or under the moon?", { at: 0.1 }),
    { do: "wiggle", target: "moon", at: 0.8, deg: 8, dur: 0.8 },
  ]),
  beat("w3", 2.6, countdown(0.1)),
  beat("w4", 3.0, [
    { do: "camera", ...HOOK_CAM, dur: 0.6 },
    cowJump(0.1, 1.2),
    say("Over! Over the moon!", { at: 0.8 }),
    word("over", 1.0),
    { do: "clip", target: "robo", clip: "Jump", at: 1.2 },
  ]),
]});
scenes.push({ id: "cow_sing", title: "Sing: over the moon", music: false, beats: [
  ...opening("ws", null).map((b, i) => (i === 0 ? { ...b, do: [...unword("over", 0.1), { do: "camera", ...CAM, dur: 1.0 }, ...b.do] } : b)),
  beat("ws3", 0, sung(VERSE.over[0][0], VERSE.over[0][1], [{ do: "camera", ...HOOK_CAM, dur: 0.9 }, cowJump(onBeat(2), 1.2, false, "next")])),
  beat("ws4", 0, sung(VERSE.over[1][0], VERSE.over[1][1], [
    { do: "wiggle", target: "cow", at: onBeat(0.5), deg: 8, dur: 0.8 },
    { do: "feel", target: "moon", feeling: "joyful", at: onBeat(1) },
    cowJump(onBeat(4), 1.1, false, "next"),
  ])),
  beat("ws5", 0, sung(VERSE.over[2][0], VERSE.over[2][1], [
    { do: "camera", ...WIDE, dur: 1.2 },
    cowJump(onBeat(1.5), 1.3, false, "next"),
    { do: "feel", target: "moon", feeling: "happy", at: onBeat(6) },
  ])),
]});
scenes.push({ id: "cow_turn", title: "Your turn: over", beats: [
  ...yourTurn({ id: "w5", ask: "Jump with the cow! Say over!", answer: "Over!", answerWho: "cow", praise: "Great jumping!", wordId: "over", slot: 2, mini: "mini_cow",
    extra: [{ do: "clip", target: "robo", clip: "Jump", at: 0.2 }] }),
]});

// Verse 3: the little dog runs AROUND the tree, and we laugh along.
scenes.push({ id: "dog", title: "The dog: around", beats: [
  beat("d1", 2.6, [
    { do: "camera", ...CAM, dur: 0.8 },
    { do: "shot", target: ["dog", "tree"], framing: "medium", yaw: -8, at: 0.8, dur: 1.0 },
    say("Here is the little dog!", { at: 0.2 }),
    { do: "say", who: "dog", text: "Woof woof!", at: 1.5 },
    { do: "hop", target: "dog", at: 1.5, height: 0.3 },
  ]),
  beat("d2", 3.4, [
    say("He runs around the tree. Around and around!", { at: 0.1 }),
    dogAround(0.3, 2.8),
    word("around", 0.9),
    { do: "look", target: "robo", at: 0.4, to: "tree" },
  ]),
]});
scenes.push({ id: "dog_sing", title: "Sing: around the tree", music: false, beats: [
  ...opening("ds", null).map((b, i) => (i === 0 ? { ...b, do: [...unword("around", 0.1), { do: "look", target: "robo", at: 0.1, to: "ahead" }, { do: "camera", ...CAM, dur: 1.0 }, ...b.do] } : b)),
  beat("ds3", 0, sung(VERSE.around[0][0], VERSE.around[0][1], [{ do: "shot", target: ["dog", "tree"], framing: "wide", yaw: 8, dur: 0.9 }, dogAround(onBeat(1), 1.7, "next")])),
  beat("ds4", 0, sung(VERSE.around[1][0], VERSE.around[1][1], [dogAround(onBeat(0.5), 2.6, "next")])),
  beat("ds5", 0, sung(VERSE.around[2][0], VERSE.around[2][1], [
    { do: "shot", target: ["dog", "tree"], framing: "medium", yaw: 12, dur: 1.0 },
    { do: "feel", target: "dog", feeling: "joyful", at: onBeat(0.5) },
    { do: "wiggle", target: "dog", at: onBeat(0.5), deg: 14, dur: 1.4 },
    { do: "hop", target: "dog", at: onBeat(3), height: 0.25 }, { do: "hop", target: "dog", at: onBeat(4.5), height: 0.25 },
    { do: "sound", sound: "giggle", at: onBeat(1), volume: 0.45 },
  ])),
]});
scenes.push({ id: "dog_turn", title: "Laugh along: ha ha ha", beats: [
  ...yourTurn({ id: "d5", ask: "The little dog laughs! Laugh with him!", answer: "Ha ha ha!", answerWho: "dog", praise: "What a happy laugh!", wordId: "haha", slot: 3, mini: "mini_dog",
    extra: [{ do: "feel", target: "dog", feeling: "happy", at: 0.3 }] }),
]});

// Verse 4: find the spoon (peekaboo), the dish, the spoon climbs UP, the moon comes DOWN.
scenes.push({ id: "spoon", title: "Find the spoon", beats: [
  beat("p1", 2.6, [
    { do: "camera", ...CAM, dur: 0.8 },
    say("Who is the surprise friend? Let's find out!", { at: 0.1 }),
    { do: "hide", target: "qmark", at: 1.2, dur: 0.2 },
    { do: "wiggle", target: "slot4", at: 1.2, deg: 12, dur: 0.8 },
    { do: "shot", target: ["bush", "moon"], framing: "medium", yaw: 6, at: 0.9, dur: 1.2 },
  ]),
  beat("p2", 2.6, [
    { do: "move", target: "spoon", to: SPOON_PEEK, at: 0.0, dur: 0.01 },
    { do: "show", target: "spoon", at: 0.05, dur: 0.01 },
    { do: "sound", sound: "squeak", at: 0.3, volume: 0.6 },
    { do: "wiggle", target: "spoon", at: 0.4, deg: 10, dur: 1.0 },
    say("Look! Someone is peeking! Who is it?", { at: 0.4 }),
    { do: "wiggle", target: "bush", at: 0.3, deg: 4, dur: 0.8 },
  ]),
  beat("p3", 2.6, [countdown(0.1), { do: "move", target: "spoon", to: [SPOON_PEEK[0], -0.4, SPOON_PEEK[2]], at: 0.3, dur: 0.4 }]),
  beat("p4", 3.0, [
    { do: "path", target: "spoon", points: [[SPOON_PEEK[0], -0.4, SPOON_PEEK[2]], [BUSH[0] + 0.55, 0.9, BUSH[2] + 0.1], [BUSH[0] + 0.7, 0, BUSH[2] + 0.5]], at: 0.05, dur: 0.7 },
    { do: "sound", sound: "magic_sparkle", at: 0.6 },
    say("Peekaboo! It's the spoon!", { at: 0.7 }),
    { do: "say", who: "spoon", text: "Tee hee!", at: "after" },
    { do: "feel", target: "spoon", feeling: "joyful", at: 0.8 },
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.9 },
  ]),
  beat("p5", 2.8, [
    pop("dish", DISH_AT, 0.2, "pop"),
    say("And here is the dish!", { at: 0.3 }),
    { do: "say", who: "dish", text: "Hello!", at: "after" },
    { do: "wiggle", target: "dish#arm", at: 1.3, deg: 30, dur: 1.2 },
    { do: "shot", target: ["dish", "spoon"], framing: "medium", dur: 1.0 },
  ]),
  beat("p6", 3.2, [
    say("The spoon wants to climb up! Up, up, up!", { at: 0.1 }),
    { do: "path", target: "spoon", points: [[BUSH[0] + 0.7, 0, BUSH[2] + 0.5], SPOON_OUT], at: 0.1, dur: 0.8, face: true },
    { do: "turn", target: "spoon", to: [0, 20, 0], at: 1.0, dur: 0.3 },
    ...stairCubes.map((c, i) => ({ do: "drop", target: c.id, to: [c.x, c.k * CUBE, STAIR_Z], at: r2(0.5 + i * 0.25), height: 3, dur: 0.6, sound: "block" })),
    { do: "move", target: "moon", to: MOON_HIGH, at: 0.6, dur: 2.2, ease: "sineInOut" },
    { do: "camera", ...STAIR_CAM, at: 0.5, dur: 1.6 },
    word("up", 1.6),
  ]),
]});
const stepTop = (col) => [STAIR_X[col], (col + 1) * CUBE, STAIR_Z];
const climb = (at, gap) => [0, 1, 2].map((col) => ({ do: "path", target: "spoon", points: [col ? stepTop(col - 1) : SPOON_OUT, [r2(STAIR_X[col] - 0.2), r2((col + 1) * CUBE + 0.35), STAIR_Z], stepTop(col)], at: r2(at + col * gap), dur: 0.4 }));
scenes.push({ id: "spoon_sing", title: "Sing: up and down", music: false, beats: [
  ...opening("ps", null).map((b, i) => (i === 0 ? { ...b, do: [...unword("up", 0.1), ...b.do] } : b)),
  beat("ps3", 0, sung(VERSE.updown[0][0], VERSE.updown[0][1], [
    { do: "camera", ...STAIR_CAM, dur: 0.9 },
    ...climb(onBeat(2.5), onBeat(4) - onBeat(2.5)),
    { do: "sound", sound: "squeak", at: onBeat(2.6), volume: 0.4 }, { do: "sound", sound: "squeak", at: onBeat(4.1), volume: 0.4 }, { do: "sound", sound: "squeak", at: onBeat(5.6), volume: 0.4 },
    { do: "turn", target: "spoon", to: [0, 10, 0], at: onBeat(6.5), dur: 0.3 },
  ])),
  beat("ps4", 0, sung(VERSE.updown[1][0], VERSE.updown[1][1], [
    { do: "camera", ...MOON_CAM, dur: 1.0 },
    { do: "hop", target: "spoon", at: onBeat(0.5), height: 0.3 },
    { do: "move", target: "moon", to: MOON_STEP, at: onBeat(3.5), dur: 1.8, ease: "sineInOut" },
    { do: "feel", target: "moon", feeling: "joyful", at: onBeat(5) },
    { do: "look", target: "spoon", at: onBeat(3), to: "moon" },
  ])),
  beat("ps5", 0, sung(VERSE.updown[2][0], VERSE.updown[2][1], [
    { do: "camera", ...CAM, dur: 1.0 },
    { do: "path", target: "spoon", points: [stepTop(2), [1.35, 1.0, 1.1], [1.6, 0, 1.4]], at: 0.15, dur: 0.6 },
    { do: "path", target: "dish", points: [DISH_AT, [0.2, 0, 1.9], [3.0, 0, 2.1], OFF_R], at: onBeat(2), dur: 1.8, face: true },
    { do: "path", target: "spoon", points: [[1.6, 0, 1.4], [3.2, 0, 1.9], OFF_R], at: onBeat(2.6), dur: 1.7, face: true },
    { do: "move", target: "moon", to: MOON_LOW, at: onBeat(4), dur: 1.6, ease: "sineInOut" },
    { do: "feel", target: "moon", feeling: "happy", at: onBeat(4) },
    { do: "look", target: "robo", at: onBeat(3), to: [6, 1, 1.5] },
    ...stairCubes.map((c, i) => ({ do: "hide", target: c.id, at: r2(onBeat(6) + i * 0.08), dur: 0.25 })),
  ])),
]});
scenes.push({ id: "spoon_turn", title: "Your turn: down", beats: [
  beat("p7", 2.4, [
    { do: "look", target: "robo", at: 0.1, to: "ahead" },
    say("Silly dish! Silly spoon! Come back!", { at: 0.1 }),
    { do: "path", target: "dish", points: [OFF_R, [1.0, 0, 2.2], DISH_AT], at: 0.6, dur: 1.4, face: true },
    { do: "path", target: "spoon", points: [OFF_R, [1.4, 0, 2.0], SPOON_REST], at: 0.75, dur: 1.4, face: true },
    { do: "turn", target: "dish", to: [0, 10, 0], at: 2.05, dur: 0.3 }, { do: "turn", target: "spoon", to: [0, -10, 0], at: 2.2, dur: 0.2 },
  ]),
  ...yourTurn({ id: "p9", ask: "Point up high! Where did the spoon climb?", answer: "Up!", answerWho: "spoon", praise: "Yes! Up, up, up!", wordId: "up",
    extra: [{ do: "shot", target: ["moon", "spoon", "dish"], framing: "wide", dur: 1.0 }] }),
  ...yourTurn({ id: "p8", ask: "The moon came... up, or down?", answer: "Down!", answerWho: "moon", praise: "Yes! Down, down, down!", wordId: "down", look: undefined }).map((b) => (b.id === "p8_t4" ? { ...b, do: [...b.do, ...fillSlot(4, "mini_dish", 0.25), { do: "pop", target: "mini_spoon", at: 0.35, dur: 0.45, sound: false }] } : b)),
]});

// Recap quiz: who went over the moon? who hid under the table?
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 2.4, [
    { do: "camera", ...CAM, dur: 1.0 },
    say("A game! Point to it!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
  ]),
  ...quizRound({ id: "q1", q: "Who jumped over the moon? The cow, or the dog?", left: "cow", right: "dog", answer: "cow", spots: [[-0.25, 0, 2.0], [1.5, 0, 2.05]],
    back: { cow: COW_L, dog: DOG }, yes: "Yes! The cow jumped over the moon!" }),
  ...quizRound({ id: "q2", q: "Who hid under the table? The spoon, or the cat?", left: "spoon", right: "cat", answer: "cat", spots: [[-0.25, 0, 2.0], [1.5, 0, 2.05]],
    back: { spoon: SPOON_REST, cat: CAT }, yes: "Yes! The cat hid under the table!" }),
]});
// The cow went back to the left during q1d: keep cowJump's side in step.
scenes[scenes.length - 1].beats.find((b) => b.id === "q1d").do.push({ do: "turn", target: "cow", to: [0, 60, 0], at: 1.0, dur: 0.3 });
cowAt = COW_L;

// Last chorus: the traditional rhyme, everyone dancing, then bye-bye.
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("z0", 1.8, [
    say("Everybody sing!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    { do: "camera", ...WIDE, dur: 1.6 },
  ]),
  ...opening("z", null).map((b, i) => (i === 1 ? { ...b, do: [...b.do, { do: "wiggle", target: "dish", at: 0.3, deg: 10, dur: 1.2 }, { do: "wiggle", target: "spoon", at: 0.5, deg: 10, dur: 1.2 }] } : b)),
  beat("z3", 0, sung(TRAD[2][0], TRAD[2][1], [cowJump(onBeat(2), 1.2, false, "next")])),
  beat("z4", 0, sung(TRAD[3][0], TRAD[3][1], [
    { do: "feel", target: "dog", feeling: "joyful", at: onBeat(1) },
    { do: "hop", target: "dog", at: onBeat(3), height: 0.3 }, { do: "hop", target: "dog", at: onBeat(5), height: 0.3 },
    { do: "hop", target: "cat", at: onBeat(4), height: 0.2 },
  ])),
  beat("z5", 0, sung(TRAD[4][0], TRAD[4][1], [
    { do: "path", target: "dish", points: [DISH_AT, [-0.6, 0, 2.2], [0.4, 0, 1.8], [-0.4, 0, 1.0], DISH_AT], at: onBeat(1), dur: 2.0, face: true },
    { do: "path", target: "spoon", points: [SPOON_REST, [0.4, 0, 1.9], [0.2, 0, 0.9], [-0.8, 0, 1.0], SPOON_REST], at: onBeat(1.3), dur: 2.0, face: true },
    { do: "burst", target: "confetti", at: onBeat(5), dur: 2.6 },
    ...[1, 2, 3, 4].map((k) => ({ do: "wiggle", target: `slot${k}`, at: r2(onBeat(2) + k * 0.2), deg: 10, dur: 0.5 })),
  ])),
  beat("y0", 2.0, [
    say("Again! Jump like the cow!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Jump", at: 0.3 },
    { do: "camera", ...CAM, dur: 1.4 },
  ]),
  ...opening("y", null),
  beat("y3", 0, sung(TRAD[2][0], TRAD[2][1], [cowJump(onBeat(2), 1.2, false, "next"), { do: "clip", target: "robo", clip: "Jump", at: onBeat(2) }])),
  beat("y4", 0, sung(TRAD[3][0], TRAD[3][1], [{ do: "hop", target: "dog", at: onBeat(3), height: 0.3 }, { do: "spin", target: "dog", at: onBeat(5), dur: 0.8 }])),
  beat("y5", 0, sung(TRAD[4][0], TRAD[4][1], [
    { do: "spin", target: "dish", at: onBeat(2), dur: 0.9 }, { do: "spin", target: "spoon", at: onBeat(3), dur: 0.9 },
    { do: "feel", target: "moon", feeling: "joyful", at: onBeat(1) },
    { do: "burst", target: "confetti", at: onBeat(5), dur: 2.4 },
  ])),
  beat("z6", 3.4, [
    { do: "turn", target: "dish", to: [0, 0, 0], at: 0.1, dur: 0.3 }, { do: "turn", target: "spoon", to: [0, 0, 0], at: 0.1, dur: 0.3 },
    say("Bye-bye, friends! Good night, moon!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "feel", target: "moon", feeling: "sleepy", at: 1.4 },
    { do: "wiggle", target: "dish#arm", at: 0.6, deg: 30, dur: 1.5 },
    { do: "wiggle", target: "spoon#arm", at: 0.6, deg: 30, dur: 1.5 },
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.7, dur: 2.5 },
    { do: "camera", position: [0, 3.0, 12.6], lookAt: [0, 1.6, -0.8], fov: 40, dur: 3.2 },
  ]),
]});
for (const sc of scenes) sc.beats.forEach(tuneLen);
{ // Actions marked _next (landings after a jump in a sung beat) start the following beat.
  const all = scenes.flatMap((sc) => sc.beats);
  all.forEach((b, i) => {
    const moved = b.do.filter((x) => x._next);
    if (!moved.length) return;
    b.do = b.do.filter((x) => !x._next);
    for (const x of moved) delete x._next;
    all[i + 1].do.unshift(...moved);
  });
}

// ---- Meta -----------------------------------------------------------------------------------------------------

const description = "Sing Hey Diddle Diddle with Robo on a moonlit night and learn the position words over, under, up, down and around! The cow jumps OVER the moon, the cat hides UNDER the table, the little dog runs AROUND the tree, the spoon climbs UP the blocks and the moon comes DOWN to say hello. Guess \"over or under?\" and count 3, 2, 1, laugh along with the little dog, play peekaboo to find the spoon, and fill the tracker with four night-sky friends: the cat, the cow, the dog, and the dish and the spoon.";
const thumbNight = (moon, extra) => [
  { id: "sky", kind: "stars", count: 120 },
  { id: "moon", kind: "critter", species: "moon_face", ...moon, feeling: "joyful" },
  ...extra,
];
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Hey Diddle Diddle: Over and Under", episode: "br18", seed: 318,
    skills: ["position_words_prek", "opposites_k"],
    cast,
    youtube: {
      title: "Hey Diddle Diddle 🌙 Over, Under, Up and Down Sing-Along for Toddlers | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: the position words over, under, up, down and around, shown with actions they can copy (jump over, crawl under, point up and down, run around), plus listening and joining in with a rhyme.\n\nSing at home: put a toy over a box and under a table and ask "over or under?", point up high and down low as you sing, and pause before "the moon" and "the spoon" so your child can shout the words. The Hey Diddle Diddle verse is a traditional public-domain nursery rhyme; the verses about under, around, up and down are original, written for Toy Box Friends, on the same tune.\n\n${YT_TAIL}`,
      tags: ["hey diddle diddle", "the cow jumped over the moon", "nursery rhymes", "position words", "over and under", "up and down", "prepositions for kids", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "moon", title: "HEY DIDDLE DIDDLE", subtitle: "Over the moon!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "night",
        camera: { position: [2.4, 1.6, 5.4], lookAt: [3.1, 1.45, -0.3], fov: 40 },
        objects: thumbNight({ at: [4.3, 0.0, -0.9], size: 1.25 }, [
          { id: "cow", kind: "critter", species: "cow", at: [4.0, 1.7, -0.4], size: 0.9, rotation: [0, 35, -12], feeling: "joyful" },
          { id: "cat", kind: "critter", species: "cat", at: [5.55, 0, 0.75], size: 0.8, rotation: [0, -30, 0], feeling: "happy" },
          { id: "fiddle", kind: "prop", model: "fiddle", parent: "cat", at: [0.06, 0.23, 0.27], rotation: [0, 0, -45], size: 0.72 },
        ]) },
      { name: "spoon", title: "OVER OR UNDER?", subtitle: "Up and down with the spoon!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "night",
        camera: { position: [2.4, 1.4, 5.4], lookAt: [3.1, 1.15, -0.2], fov: 40 },
        objects: thumbNight({ at: [4.7, 0.9, -1.6], size: 1.1 }, [
          { id: "dish", kind: "critter", species: "dish", at: [3.85, 0, 0.7], size: 1.05, rotation: [0, -10, 0], feeling: "happy" },
          { id: "spoon", kind: "critter", species: "spoon_friend", at: [5.0, 0, 1.0], size: 1.05, rotation: [0, -20, 0], feeling: "happy" },
          { id: "dog", kind: "critter", species: "dog", at: [6.35, 0, 0.1], size: 0.8, rotation: [0, -35, 0], feeling: "joyful" },
        ]) },
    ],
  }),
  stage: { preset: "night" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "hey_diddle_diddle");
