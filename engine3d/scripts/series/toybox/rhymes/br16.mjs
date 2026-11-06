// Builds ../br16_mary_little_lamb.json: Mary Had a Little Lamb. The traditional verses (public domain: the lamb,
// everywhere that Mary went, it followed her to school, it made the children laugh and play) and four short
// original verses at school: the slide, a picture book, the paint table and lunch. Each time the lamb hides behind
// a school thing: it peeks out, the child counts down 3-2-1 and finds it. Also "Is it white?" (twice) and counting
// the lamb's hops and steps. Teaches following, school things and the colour white. Mary is Pip's toddler body in
// a dress, the lamb, the schoolhouse and the cloth table are in catalog/models/rhymes_br16.json.
// Run: node br16.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, fillSlot, showTracker, yourTurn, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// Mary Had a Little Lamb (traditional tune, public domain), in C. One note per syllable.
const T = {
  a: "E4 D4 C4 D4 E4 E4 E4:2", //                 Ma-ry had a lit-tle lamb,
  b: "D4 D4 D4:2 E4 G4 G4:2", //                  Lit-tle lamb, lit-tle lamb,
  c: "E4 D4 C4 D4 E4 E4 E4", //                   Ma-ry had a lit-tle lamb,
  d: "E4 D4 D4 E4 D4 C4:3", //                    Its fleece was white as snow.
  a8: "E4:0.5 E4:0.5 D4 C4 D4 E4 E4 E4:2", //     It fol-lowed her to school one day,
  c8: "E4:0.5 E4:0.5 D4 C4 D4 E4 E4 E4", //       It fol-lowed her to school one day,
};
// Sung lines end in a comma or a full stop (a "!" makes the voice much slower).
const V = {
  lamb: [["Mary had a little lamb,", T.a], ["Little lamb, little lamb,", T.b], ["Mary had a little lamb,", T.c], ["Its fleece was white as snow.", T.d]],
  went: [["Everywhere that Mary went,", T.a], ["Mary went, Mary went,", T.b], ["Everywhere that Mary went,", T.c], ["The lamb was sure to go.", T.d]],
  school: [["It followed her to school one day,", T.a8], ["School one day, school one day,", T.b], ["It followed her to school one day,", T.c8], ["And made the children play.", T.d]],
  // Original verses on the same tune (7, 6, 7, 6 syllables).
  slide: [["Mary climbed up on the slide,", T.a], ["On the slide, on the slide,", T.b], ["Up the ladder, down the slide,", T.c], ["The lamb went whee, whee, whee.", T.d]],
  book: [["Mary read a picture book,", T.a], ["Picture book, picture book,", T.b], ["Mary read a picture book,", T.c], ["The lamb sat down to look.", T.d]],
  paint: [["Mary painted with a brush,", T.a], ["With a brush, with a brush,", T.b], ["Red and yellow, blue and swish,", T.c], ["The lamb said baa, baa, baa.", T.d]],
  lunch: [["Mary ate her lunch at school,", T.a], ["Lunch at school, lunch at school,", T.b], ["Mary ate her lunch at school,", T.c], ["The lamb said yum, yum, yum.", T.d]],
  play: [["It made the children laugh and play,", T.a8], ["Laugh and play, laugh and play,", T.b], ["It made the children laugh and play,", T.c8], ["To see a lamb at school.", T.d]],
};

// ---- Layout (garden stage: a school yard) ----------------------------------------------------------------------
const r2 = (v) => Math.round(v * 100) / 100;
const add = (p, d) => p.map((v, i) => r2(v + d[i]));
const ROBO = [-5.6, 0, -0.9];
const SCHOOL = [0.2, 0, -4.6];
const SCHOOL_SIZE = 1.5;
const MARY_SIZE = 0.85;
const LAMB_SIZE = 0.75;
const SINK = -0.9; // a hidden lamb's y: below the floor, behind its cover
const DOOR = [0.2, 0, -2.6]; // in front of the school door

// The four school things, left to right. hide: the lamb's hiding spot (sunk), peek: where it peeks out,
// mary/lamb: where they stand for the verse.
const SLIDE = [-3.6, 0, -1.1];
const SLIDE_SIZE = 1.2;
const BUSH = [-4.25, 0, -2.05];
const SHELF = [-1.35, 0, -1.5];
const PAINT = [1.75, 0, -1.3];
const LUNCH = [4.0, 0, -1.2];
const ITEMS = [
  { id: "slide", word: "SLIDE", cover: "bush1", at: SLIDE, hide: add(BUSH, [0, SINK, -0.45]), peek: add(BUSH, [0.15, 0.7, -0.45]), mary: [-2.4, 0, 0.15], lamb: [-1.65, 0, 0.3], yaw: 45,
    where: "To the slide! Where is the lamb?", clue: "White ears! Behind the bush?" },
  { id: "book", word: "BOOK", cover: "shelf", at: SHELF, hide: add(SHELF, [0, SINK, -0.5]), peek: add(SHELF, [-0.68, 0, -0.45]), mary: [-0.6, 0, -0.3], lamb: [0.15, 0, -0.2], yaw: 6,
    where: "To the books! Where is the lamb?", clue: "A white tail! Behind the books?" },
  { id: "paint", word: "PAINT", cover: "ptable", at: PAINT, hide: add(PAINT, [0, SINK, -0.68]), peek: add(PAINT, [0.5, 0.42, -0.68]), mary: [1.35, 0, -0.25], lamb: [2.1, 0, -0.15], yaw: -6,
    where: "To the paint table! Where is the lamb?", clue: "A woolly head! Behind the table?" },
  { id: "lunch", word: "LUNCH", cover: "ltable", at: LUNCH, hide: add(LUNCH, [0, SINK, -0.65]), peek: add(LUNCH, [0.45, 0.42, -0.65]), mary: [3.2, 0, -0.1], lamb: [3.95, 0, 0.05], yaw: 10,
    where: "Lunch time! Where is the lamb?", clue: "A hungry lamb! Behind the table?" },
];
const I = Object.fromEntries(ITEMS.map((x) => [x.id, x]));

const CAM = { position: [0, 2.3, 10.4], lookAt: [0, 1.15, -1.2], fov: 40 };
const FRONT = { position: [-0.6, 1.45, 6.0], lookAt: [-0.6, 0.65, 0.8], fov: 40 };
const FOLLOW_CAM = { position: [-0.2, 1.7, 7.2], lookAt: [-0.2, 0.6, 0.8], fov: 40 };
const SCHOOL_CAM = { position: [0.2, 2.0, 5.2], lookAt: [0.2, 1.6, -3.2], fov: 42 };

// ---- Objects ---------------------------------------------------------------------------------------------------
const MARY0 = [-0.3, 0, 1.2];
const HOP_AT = [[1.0, 0, 1.1], [1.75, 0, 1.1], [2.5, 0, 1.1]]; // the lamb's three counted hops
const LAMB0 = [-0.3, 0, 0.55]; // right behind Mary at the start
const objects = [
  { id: "school", kind: "prop", model: "schoolhouse", at: SCHOOL, size: SCHOOL_SIZE },
  // The sign over the door (the sign board's front is at z 0.73, centre y 1.52 in the model; size 1.5).
  { id: "sign", kind: "letter", text: "SCHOOL", color: "red", at: [SCHOOL[0], r2(1.52 * SCHOOL_SIZE - 0.06), r2(SCHOOL[2] + 0.76 * SCHOOL_SIZE)], size: 0.13 },
  ...[-5.1, -4.1, -3.1, 3.3, 4.3, 5.3].map((x, i) => ({ id: `fence${i + 1}`, kind: "prop", model: "fence", at: [x, 0, -3.7] })),
  { id: "tree1", kind: "prop", model: "tree", at: [-6.0, 0, -3.2], size: 1.5 },
  { id: "tree2", kind: "prop", model: "tree", at: [6.1, 0, -3.0], size: 1.4 },
  { id: "flower1", kind: "prop", model: "flower", at: [-2.2, 0, -2.6], size: 0.55 },
  { id: "flower2", kind: "prop", model: "flower", color: "yellow", at: [2.6, 0, -2.5], size: 0.5 },
  { id: "flower3", kind: "prop", model: "flower", color: "purple", at: [5.2, 0, -1.6], size: 0.55 },
  { id: "cloud1", kind: "prop", model: "cloud", at: [-3.8, 4.6, -5.5], size: 1.3 },
  { id: "cloud2", kind: "prop", model: "cloud", at: [4.2, 4.9, -6.0], size: 1.1 },
  // The slide (chute toward +x) and the bush behind its ladder.
  { id: "slide", kind: "prop", model: "slide", at: SLIDE, size: SLIDE_SIZE },
  { id: "bush1", kind: "prop", model: "bush", at: BUSH, size: 0.95 },
  // The bookshelf.
  { id: "shelf", kind: "prop", model: "shelf", at: I.book.at, size: 1.1 },
  // The paint table: pots, a brush, a paper with paint splashes that pop on.
  { id: "ptable", kind: "prop", model: "cloth_table", color: "sky", at: I.paint.at },
  { id: "pots", kind: "prop", model: "paint_pots", at: add(I.paint.at, [-0.15, 0.66, 0.1]), size: 1.0 },
  { id: "brush", kind: "prop", model: "paintbrush", at: add(I.paint.at, [-0.5, 0.66, 0.05]), size: 0.55, rotation: [0, 0, 12] },
  { id: "paper", kind: "shape", shape: "plate", color: "white", material: "matte", at: add(I.paint.at, [0.15, 1.02, -0.3]), size: 0.66, rotation: [90, 0, 0] },
  ...[["red", -0.14, 0.1], ["yellow", 0.12, 0.13], ["blue", 0, -0.12]].map(([c, x, y], k) => ({ id: `splat${k + 1}`, kind: "prop", model: "paint_splash", color: c, at: add(I.paint.at, [0.15 + x, 1.02 + y, -0.27]), size: 0.2, hidden: true })),
  // The lunch table: a lunchbox, a sandwich and an apple.
  { id: "ltable", kind: "prop", model: "cloth_table", color: "yellow", at: I.lunch.at },
  { id: "lunchbox", kind: "prop", model: "lunchbox", at: add(I.lunch.at, [-0.32, 0.66, 0]), size: 1.2 },
  { id: "sandwich", kind: "prop", model: "sandwich", at: add(I.lunch.at, [0.3, 0.66, 0.05]), size: 0.6, hidden: true },
  { id: "apple", kind: "prop", model: "apple", at: add(I.lunch.at, [0.08, 0.66, 0.12]), size: 0.32 },
  // The big picture book (pops in for the book verse).
  { id: "bigbook", kind: "prop", model: "book", at: [-0.15, 0, 0.45], size: 1.3, rotation: [0, 0, 0], hidden: true },
  // The cast.
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, 30, 0], feeling: "happy" },
  { id: "mary", kind: "critter", species: "mary", at: [-2.4, 0, 1.2], rotation: [0, 90, 0], size: MARY_SIZE, feeling: "happy" },
  { id: "lamb", kind: "critter", species: "lamb", at: [-2.4, 0, 0.55], rotation: [0, 90, 0], size: LAMB_SIZE, feeling: "happy" },
  // Classmates who come out of the school to play (hidden until then).
  { id: "pip", kind: "critter", species: "toddler", at: add(DOOR, [0, 0, -0.4]), size: 0.85, feeling: "happy", hidden: true },
  { id: "bunny", kind: "critter", species: "bunny", at: add(DOOR, [0.3, 0, -0.4]), size: 0.75, feeling: "happy", hidden: true },
  // Counting numbers (hops in the follow verse; steps up the slide ladder, in a row in the sky over the slide, square to the slide camera at yaw 40).
  ...HOP_AT.map((p, k) => ({ id: `hop${k + 1}`, kind: "letter", text: String(k + 1), color: "orange", at: add(p, [0, 1.1, 0]), size: 0.42, hidden: true })),
  ...[1, 2, 3, 4].map((n) => ({ id: `step${n}`, kind: "letter", text: String(n), color: "orange", at: [r2(SLIDE[0] - 1.1 + (n - 1) * 0.5), 2.1, r2(SLIDE[2] + 0.9 - (n - 1) * 0.42)], size: 0.36, rotation: [0, 40, 0], hidden: true })),
  // Quiz: a pink pig to stand next to the white lamb (hidden until the quiz).
  { id: "q_pig", kind: "critter", species: "pig", at: [1.1, 0, 2.4], size: 0.7, rotation: [0, -10, 0], hidden: true },
  { id: "confetti", kind: "confetti", at: [0, 3.4, 0.5] },
];
// HUD: four school-thing slots (slide, book, paint, lunch), "?" on lunch, the 3-2-1 countdown, the word bubble.
objects.push(...trackerObjects(4, { colors: ["yellow", "blue", "pink", "green"] }));
objects.push(
  { id: "mini1", kind: "prop", model: "slide", hud: true, parent: "slot1", at: [0, -0.32, 0.3], size: 0.42, rotation: [10, -20, 0], hidden: true },
  { id: "mini2", kind: "prop", model: "book", hud: true, parent: "slot2", at: [0, -0.3, 0.3], size: 1.0, rotation: [0, -15, 0], hidden: true },
  { id: "mini3", kind: "prop", model: "paint_pots", hud: true, parent: "slot3", at: [0, -0.12, 0.3], size: 1.35, rotation: [40, 0, 0], hidden: true },
  { id: "mini4", kind: "prop", model: "lunchbox", hud: true, parent: "slot4", at: [0, -0.26, 0.3], size: 1.2, rotation: [15, -20, 0], hidden: true },
  { id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot4", at: [0, -0.26, 0.2], size: 0.42, hidden: true },
);
objects.push(...countdownObjects());
objects.push(...bubbleObjects([
  { id: "lamb", text: "LAMB", color: "ink" }, { id: "white", text: "WHITE", color: "sky" }, { id: "follow", text: "FOLLOW", color: "purple" },
  { id: "school", text: "SCHOOL", color: "red" }, { id: "baa", text: "BAA!", color: "ink" }, { id: "ding", text: "DING!", color: "gold" },
  ...ITEMS.map((x) => ({ id: x.id, text: x.word, color: "orange" })), { id: "yum", text: "YUM!", color: "green" },
]));
// WHITE must read on the white bubble: a soft outline colour is not available, so use ink for it.
objects.find((o) => o.id === "w_white").color = "ink";

const cast = {
  mary: { voice: "squeaky", pitch: 1.25, speed: 1.0 },
  lamb: { voice: "soft", pitch: 1.3, speed: 1.0 },
  pip: { voice: "squeaky", pitch: 1.15, speed: 1.0 },
  bunny: { voice: "soft", pitch: 1.3, speed: 1.0 },
};

// ---- Helpers ---------------------------------------------------------------------------------------------------
const hop = (target, at, height = 0.2, dur = 0.38) => ({ do: "hop", target, at: r2(at), height, dur });
const front = (target, at, dur = 0.3) => ({ do: "turn", target, to: [0, 0, 0], at: r2(at), dur });
const face = (target, yaw, at, dur = 0.3) => ({ do: "turn", target, to: [0, yaw, 0], at: r2(at), dur });
const marySay = (text, at = 0.1) => ({ do: "say", who: "mary", text, at });
const baa = (at = 0.1, text = "Baa!") => ({ do: "say", who: "lamb", text, at });
/** Walk along points (a path, little step hops), then face the front. */
function walk(target, points, at, dur, { height = 0.06, gap = 0.3, turnFront = true } = {}) {
  const out = [{ do: "path", target, points, at: r2(at), dur, face: true }];
  for (let t = at; t < at + dur - 0.15; t += gap) out.push(hop(target, t, height, gap * 0.9));
  if (turnFront) out.push(front(target, at + dur + 0.05));
  return out;
}
const lambWalk = (points, at, dur, o = {}) => walk("lamb", points, at, dur, { height: 0.12, gap: 0.32, ...o });
const maryWalk = (points, at, dur, o = {}) => walk("mary", points, at, dur, o);
const fill = (i, mini, at) => fillSlot(i, mini, at);
/** A sung verse: four beats; extra[k] = actions for line k (timed on the tune's beats with onBeat). */
const verse = (pre, lines, extra = []) => lines.map(([text, tune], k) => beat(`${pre}${k + 1}`, tuneDur(tune), sung(text, tune, extra[k] ?? [])));
/** The lamb hops on the given tune beats (a sung line). */
const lambHops = (beats, h = 0.18) => beats.map((k) => hop("lamb", onBeat(k), h, 0.36));
/** Mary sways along (a little wiggle every two tune beats). */
const sway = (n = 4) => Array.from({ length: n }, (_, k) => ({ do: "wiggle", target: "mary", at: r2(onBeat(k * 2)), deg: 6, dur: 0.8 }));

const scenes = [];
// Where the lamb and Mary are, so each walk starts from the right place.
let lambAt = LAMB0;
let maryAt = MARY0;

// 0:00 The hook: Mary walks in, "Where is the lamb?", it hops out from behind her. Four slots, lunch teased.
scenes.push({ id: "hello", title: "Where is the lamb?", beats: [
  beat("h1", 2.6, [
    { do: "camera", position: [-0.9, 1.3, 5.2], lookAt: [-0.9, 0.7, 0.8], fov: 40, dur: 0 },
    { do: "camera", ...FRONT, dur: 2.6 },
    say("Where is the lamb?", { at: 0.15 }),
    maryWalk([[-2.4, 0, 1.2], MARY0], 0.05, 1.6),
    lambWalk([[-2.4, 0, 0.55], LAMB0], 0.05, 1.6, { height: 0.08 }),
    { do: "look", target: "robo", at: 0.3, to: "mary" },
  ]),
  beat("h2", 2.6, [
    lambWalk([LAMB0, [0.3, 0, 0.9], [0.5, 0, 1.25]], 0.05, 0.75, { height: 0.14 }),
    baa(0.6),
    word("baa", 0.65), { do: "sound", sound: "boing", at: 0.1, volume: 0.6 },
    { do: "feel", target: "lamb", feeling: "joyful", at: 0.7 },
    face("mary", 40, 0.7), { do: "feel", target: "mary", feeling: "joyful", at: 0.8 },
    say("Peekaboo, little lamb!", { at: "after" }),
    { do: "clip", target: "robo", clip: "Jump", at: 1.1 },
  ]),
  beat("h3", 2.4, [
    unword("baa", 0),
    marySay("I'm Mary! This is my lamb!", 0.1),
    front("mary", 0.2), hop("lamb", 1.2, 0.25),
    word("lamb", 0.4),
  ]),
  beat("h4", 2.6, [
    unword("lamb", 0),
    say("Find the lamb at school!", { at: 0.1 }),
    showTracker(3, 0.4),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
  beat("h5", 2.2, [
    say("And last, lunch!", { at: 0.1 }),
    { do: "pop", target: "slot4", at: 0.2, dur: 0.4, sound: "magic_sparkle" }, { do: "pop", target: "qmark", at: 0.4, dur: 0.4, sound: false },
    { do: "grow", target: "slot4", to: 1.2, at: 1.0, dur: 0.3 }, { do: "grow", target: "slot4", to: 1, at: 1.4, dur: 0.3 },
  ]),
]});
lambAt = [0.5, 0, 1.25];

// The first verse: the lamb, white as snow. Then "Is it white?"
scenes.push({ id: "lamb_song", title: "Mary had a little lamb", music: false, beats: [
  beat("v0", 1.8, [say("Let's sing!", { at: 0.1 }), { do: "camera", ...FRONT, dur: 1 }, { do: "clip", target: "robo", clip: "Dance", at: 0.2 }]),
  ...verse("v1_", V.lamb, [
    [sway(), lambHops([1, 3, 5]), { do: "shot", target: ["mary", "lamb"], framing: "medium", yaw: -8, dur: 2 }],
    [lambHops([0, 1, 2, 4, 5]), { do: "feel", target: "lamb", feeling: "joyful", at: 0.3 }, { do: "orbit", around: [0.1, 0.5, 1.2], degrees: 16, dur: 3 }],
    [sway(), { do: "point", target: "mary", to: "lamb", part: "arm_l", at: onBeat(1), dur: 0.4, hold: 1.4 }, { do: "shot", target: "lamb", framing: "medium", yaw: 10, dur: 1.4 }],
    [word("white", onBeat(4)), { do: "spin", target: "lamb", at: onBeat(1), dur: 1 }, { do: "sound", sound: "sparkle", at: onBeat(4), volume: 0.5 }],
  ]),
  beat("v1_5", 0.9, [unword("white", 0.1), { do: "camera", ...FRONT, dur: 1 }]),
]});
scenes.push({ id: "white_q", title: "Is it white?", beats: yourTurn({
  id: "w1", ask: "Is the lamb white? Yes or no?", answer: "Yes! White!", answerWho: "mary",
  praise: "White as snow!", wordId: "white", look: "lamb",
  extra: [{ do: "wiggle", target: "lamb", at: 0.2, deg: 10, dur: 1 }],
})});

// The second verse: everywhere that Mary went, the lamb follows. Then count the lamb's hops.
const W1 = [-2.0, 0, 1.0];
const W2 = [1.4, 0, 1.0];
scenes.push({ id: "follow_song", title: "Everywhere that Mary went", music: false, beats: [
  beat("g0", 2.6, [
    say("The lamb follows Mary!", { at: 0.1 }),
    word("follow", 0.6),
    maryWalk([MARY0, W1], 0.4, 1.6), lambWalk([lambAt, add(W1, [0.75, 0, 0.1])], 0.8, 1.6),
    { do: "camera", ...FOLLOW_CAM, dur: 1.6 },
  ]),
  ...verse("g1_", V.went, [
    [unword("follow", 0.1), maryWalk([W1, W2], 0.2, 2.0), lambWalk([add(W1, [0.75, 0, 0.1]), add(W2, [-0.75, 0, 0.1])], 0.5, 2.0)],
    [face("mary", -70, 0.2), face("lamb", -70, 0.3), lambHops([1, 2, 4, 5], 0.2), { do: "shot", target: ["mary", "lamb"], framing: "medium", yaw: 8, dur: 1.4 }],
    [maryWalk([W2, add(MARY0, [0, 0, -0.2])], 0.2, 1.8), lambWalk([add(W2, [-0.75, 0, 0.1]), add(W2, [-0.3, 0, 0.1]), [0.45, 0, 1.1]], 0.45, 1.8)],
    [lambHops([0, 2, 4], 0.25), { do: "feel", target: "lamb", feeling: "joyful", at: 0.2 }, { do: "camera", ...FRONT, dur: 1.4 }],
  ]),
]});
maryAt = add(MARY0, [0, 0, -0.2]);
lambAt = [0.45, 0, 1.1];
// Count three hops: the lamb hops to the right, a number pops over each landing.
scenes.push({ id: "count_hops", title: "Count the hops", beats: [
  beat("c1", 2.1, [
    say("Count the lamb's hops with me!", { at: 0.1 }),
    lambWalk([lambAt, add(HOP_AT[0], [-0.75, 0, 0])], 0.2, 0.8, { turnFront: false }), face("lamb", 90, 1.1),
    { do: "shot", target: ["lamb", "hop3"], framing: "medium", dur: 1.2 },
  ]),
  beat("c2", 3.4, [
    ...HOP_AT.flatMap((p, k) => [
      { do: "move", target: "lamb", to: p, at: r2(0.2 + k * 0.95), dur: 0.5, ease: "sineInOut" },
      hop("lamb", 0.2 + k * 0.95, 0.45, 0.5),
      { do: "pop", target: `hop${k + 1}`, at: r2(0.65 + k * 0.95), dur: 0.3, sound: "pop" },
      say(["One!", "Two!", "Three!"][k], { at: r2(0.65 + k * 0.95), caption: false }),
    ]),
  ]),
  beat("c3", 2.1, [
    say("Three hops! Yay!", { at: 0.1 }), { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.3 },
    front("lamb", 0.1), baa(0.9, "Baa, baa!"), { do: "feel", target: "lamb", feeling: "joyful", at: 0.4 },
    ...[1, 2, 3].map((n) => ({ do: "hide", target: `hop${n}`, at: 1.6, dur: 0.3 })),
  ]),
]});
lambAt = HOP_AT[2];

// The third verse: to school. The bell rings, the classmates come out to play.
const MS = add(DOOR, [-0.75, 0, 0.75]);
const LS = add(DOOR, [0.6, 0, 0.85]);
const PIP_OUT = add(DOOR, [-0.1, 0, 1.45]);
const BUNNY_OUT = add(DOOR, [0.4, 0, 1.7]);
scenes.push({ id: "school_song", title: "It followed her to school", music: false, beats: [
  beat("s0", 3.0, [
    say("Mary goes to school. Ding, dong!", { at: 0.1 }),
    maryWalk([maryAt, add(MS, [0, 0, 1.2]), MS], 0.2, 1.9), lambWalk([lambAt, add(LS, [0.4, 0, 1.4]), LS], 0.5, 1.9),
    { do: "camera", ...SCHOOL_CAM, dur: 2.2 },
    { do: "turn", target: "school#bell", to: [0, 0, 25], at: 1.8, dur: 0.25 }, { do: "turn", target: "school#bell", to: [0, 0, -25], at: 2.05, dur: 0.3 }, { do: "turn", target: "school#bell", to: [0, 0, 0], at: 2.35, dur: 0.3 },
    { do: "sound", sound: "bell", at: 1.85 }, word("school", 1.9),
  ]),
  ...verse("s1_", V.school, [
    [unword("school", 0.1), lambHops([1, 3, 5]), { do: "shot", target: ["mary", "lamb", "sign"], framing: "medium", dur: 1.6 }],
    [{ do: "wiggle", target: "school#bell", at: onBeat(0), deg: 18, dur: 2 }, { do: "sound", sound: "bell", at: onBeat(0), volume: 0.4 }, lambHops([0, 1, 3, 4], 0.2)],
    [sway(), { do: "camera", ...SCHOOL_CAM, dur: 1.2 }],
    [
      { do: "show", target: "pip", at: 0.1, dur: 0.3 }, { do: "show", target: "bunny", at: 0.2, dur: 0.3 },
      { do: "path", target: "pip", points: [add(DOOR, [0, 0, -0.4]), PIP_OUT], at: 0.3, dur: 1.0, face: true },
      { do: "path", target: "bunny", points: [add(DOOR, [0.3, 0, -0.4]), BUNNY_OUT], at: 0.4, dur: 1.0, face: true },
      front("pip", 1.4), front("bunny", 1.5), hop("pip", 1.6, 0.25), hop("bunny", 1.7, 0.3),
      { do: "feel", target: "pip", feeling: "joyful", at: 1.4 }, { do: "feel", target: "bunny", feeling: "joyful", at: 1.5 },
    ],
  ]),
  beat("s1_5", 1.2, [{ do: "sound", sound: "giggle", at: 0.1, volume: 0.6 }, hop("lamb", 0.2, 0.3), hop("pip", 0.4, 0.2), hop("bunny", 0.5, 0.25)]),
  // A short "your turn": say ding, dong with the bell; then the classmates go back in.
  beat("bt1", 2.2, [say("Your turn! Say ding, dong!", { at: 0.1 }), word("ding", 0.3), { do: "clip", target: "robo", clip: "Wave", at: 0.2 }, { do: "sound", sound: "tick", at: 1.5, volume: 0.5 }]),
  beat("bt2", 2.6, [
    { do: "say", who: "pip", text: "Ding, dong!", at: 0.1 }, hop("pip", 0.15, 0.3),
    { do: "wiggle", target: "school#bell", at: 0.15, deg: 20, dur: 1.2 }, { do: "sound", sound: "bell", at: 0.15, volume: 0.6 },
    say("School time!", { at: "after" }), { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.9 },
  ]),
  beat("bt3", 1.6, [
    unword("ding", 0),
    { do: "path", target: "pip", points: [PIP_OUT, add(DOOR, [0, 0, -0.3])], at: 0.2, dur: 0.9, face: true }, { do: "hide", target: "pip", at: 1.0, dur: 0.3 },
    { do: "path", target: "bunny", points: [BUNNY_OUT, add(DOOR, [0.3, 0, -0.3])], at: 0.3, dur: 0.9, face: true }, { do: "hide", target: "bunny", at: 1.1, dur: 0.3 },
    { do: "camera", ...CAM, dur: 1.6 },
  ]),
]});
maryAt = MS;
lambAt = LS;

// Each school thing: Mary goes there, the lamb hides behind it, peeks, 3-2-1, peekaboo! Then the verse and a game.
function findScene(x, k) {
  const coverAt = objects.find((o) => o.id === x.cover).at;
  const behind = [x.hide[0], 0, x.hide[2]];
  // The lamb walks round the side of the cover to its back, then sinks out of sight.
  const side = [r2(coverAt[0] + (x.id === "slide" ? 1.0 : 0.85)), 0, r2(coverAt[2] - 0.15)];
  return { id: `${x.id}_find`, title: `Where is the lamb? The ${x.id}`, beats: [
    beat(`${x.id}_f1`, 3.0, [
      { do: "shot", target: [x.cover, "mary", x.id === "slide" ? "slide" : x.cover], framing: "wide", yaw: x.yaw, dur: 1.4 },
      say(x.where, { at: 0.2 }),
      maryWalk([maryAt, x.mary], 0.1, 1.7),
      lambWalk([lambAt, side, behind], 0.2, 2.1, { turnFront: false }),
      { do: "move", target: "lamb", to: x.hide, at: 2.35, dur: 0.3 },
      { do: "look", target: "mary", at: 2.0, to: x.cover },
      { do: "look", target: "robo", at: 0.3, to: x.cover },
    ]),
    beat(`${x.id}_f2`, 2.4, [
      front("lamb", 0.05, 0.1),
      { do: "shot", target: [x.cover, "mary"], framing: "medium", yaw: x.yaw, dur: 0.8 },
      { do: "move", target: "lamb", to: x.peek, at: 0.2, dur: 0.35, ease: "backOut" },
      baa(0.45), word("baa", 0.5),
      { do: "wiggle", target: "lamb", at: 0.6, deg: 10, dur: 1 },
      { do: "move", target: "lamb", to: x.hide, at: 1.9, dur: 0.3 },
    ]),
    beat(`${x.id}_f3`, 2.4, [unword("baa", 0), say(x.clue, { at: 0.1 }), { do: "clip", target: "robo", clip: "Yes", at: 0.3 }, { do: "feel", target: "mary", feeling: "surprised", at: 0.3 }]),
    beat(`${x.id}_f4`, 2.6, [countdown(0.15), { do: "wiggle", target: x.cover, at: 0.4, deg: 4, dur: 1.6 }]),
    beat(`${x.id}_f5`, 2.6, [
      { do: "path", target: "lamb", points: [x.hide, [x.hide[0], 1.05, r2(x.hide[2] + 0.5)], [r2((x.hide[0] + x.lamb[0]) / 2), 0.6, r2((x.hide[2] + x.lamb[2]) / 2 + 0.3)], x.lamb], at: 0, dur: 0.85 },
      { do: "sound", sound: "boing", at: 0.05 }, { do: "sound", sound: "ding", at: 0.85 },
      { do: "burst", target: "confetti", at: 0.9, dur: 2.0, sound: false },
      say("Peekaboo! There's the lamb!", { at: 0.95 }),
      { do: "feel", target: "lamb", feeling: "joyful", at: 0.9 }, { do: "feel", target: "mary", feeling: "joyful", at: 1.0 },
      { do: "shot", target: ["mary", "lamb"], framing: "medium", yaw: x.yaw, dur: 0.9, at: 0.9 },
      { do: "clip", target: "robo", clip: "Jump", at: 1.0 },
      { do: "look", target: "mary", at: 1.0, to: "lamb" },
    ]),
  ]};
}

ITEMS.forEach((x, k) => {
  scenes.push(findScene(x, k));
  maryAt = x.mary;
  lambAt = x.lamb;
  const yw = (deg) => ({ do: "shot", target: ["mary", "lamb", x.cover], framing: "medium", yaw: deg, dur: 1.6 });
  let lines;
  let game;
  if (x.id === "slide") {
    // Ladder bottom, platform top and chute end (slide model: ladder x -0.62, platform top y 1.03, chute end x 0.95).
    const S = SLIDE_SIZE;
    const LAD = [r2(SLIDE[0] - 0.62 * S - 0.3), 0, r2(SLIDE[2] + 0.05)];
    const TOP = [r2(SLIDE[0] - 0.45 * S), r2(1.04 * S), SLIDE[2]];
    const END = [r2(SLIDE[0] + 0.95 * S), r2(0.06 * S), SLIDE[2]];
    const OUT = add(END, [0.45, -0.07, 0.2]);
    const climb = (who, at, dur) => [
      { do: "path", target: who, points: [who === "mary" ? x.mary : x.lamb, LAD, add(LAD, [0.2, 0.5 * S, 0]), TOP], at, dur, face: true },
      { do: "turn", target: who, to: [0, 90, 0], at: r2(at + dur), dur: 0.2 },
    ];
    const down = (who, at, dur, to) => [{ do: "path", target: who, points: [TOP, END, to], at, dur }, front(who, at + dur + 0.05)];
    lines = [
      [climb("mary", 0.2, 1.7), { do: "shot", target: ["slide", "mary"], framing: "medium", yaw: 40, dur: 1.4 }],
      [down("mary", 0.2, 1.2, add(OUT, [0.55, 0, 0.5])), { do: "sound", sound: "slide_whistle", at: 0.25, volume: 0.4 }, { do: "feel", target: "mary", feeling: "joyful", at: 0.4 }],
      [climb("lamb", 0.2, 1.7), { do: "look", target: "mary", at: 0.3, to: "lamb" }],
      [down("lamb", onBeat(1), 1.1, OUT), { do: "sound", sound: "slide_whistle", at: onBeat(1), volume: 0.4 }, { do: "feel", target: "lamb", feeling: "joyful", at: onBeat(1) }],
    ];
    maryAt = add(OUT, [0.55, 0, 0.5]);
    lambAt = OUT;
    // Count the lamb's steps up the ladder (four), then whee down again.
    const rung = (n) => add(LAD, [0.08 * n, 0.27 * n * S - 0.02, 0]);
    game = { id: "slide_count", title: "Count the steps", beats: [
      beat("sc1", 2.3, [
        say("Count the lamb's steps!", { at: 0.1 }),
        { do: "path", target: "lamb", points: [OUT, add(OUT, [0, 0, 0.6]), add(LAD, [-0.1, 0, 0.5]), LAD], at: 0.2, dur: 1.6, face: true },
        { do: "turn", target: "lamb", to: [0, 90, 0], at: 1.85, dur: 0.2 },
        { do: "shot", target: ["slide", "step1", "step4"], framing: "medium", yaw: 40, dur: 1.2 },
      ]),
      beat("sc2", 3.6, [1, 2, 3, 4].flatMap((n) => [
        { do: "move", target: "lamb", to: rung(n), at: r2(0.2 + (n - 1) * 0.8), dur: 0.35, ease: "backOut" },
        { do: "pop", target: `step${n}`, at: r2(0.45 + (n - 1) * 0.8), dur: 0.3, sound: "pop" },
        say(["One!", "Two!", "Three!", "Four!"][n - 1], { at: r2(0.45 + (n - 1) * 0.8), caption: false }),
      ])),
      beat("sc3", 2.6, [
        { do: "move", target: "lamb", to: TOP, at: 0.05, dur: 0.3 },
        down("lamb", 0.4, 1.0, OUT), { do: "sound", sound: "slide_whistle", at: 0.4, volume: 0.45 },
        baa(0.5, "Whee!"),
        say("Four steps! Whee!", { at: "after" }),
        ...[1, 2, 3, 4].map((n) => ({ do: "hide", target: `step${n}`, at: 1.6, dur: 0.3 })),
      ]),
      beat("sc4", 1.5, [fill(1, "mini1"), { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.2 }, { do: "camera", ...CAM, dur: 1.4 }]),
    ]};
  } else if (x.id === "book") {
    lines = [
      [{ do: "pop", target: "bigbook", at: 0.2, dur: 0.4, sound: "pop" }, face("mary", 35, 0.3), face("lamb", -35, 0.3), { do: "shot", target: ["mary", "lamb", "bigbook"], framing: "medium", dur: 1.4 }],
      [{ do: "wiggle", target: "bigbook", at: onBeat(0), deg: 6, dur: 1 }, { do: "nod", target: "mary", at: onBeat(3) }],
      [sway(3), { do: "look", target: "lamb", at: 0.2, to: "bigbook" }],
      [{ do: "move", target: "lamb", to: add(x.lamb, [0, -0.08, 0]), at: onBeat(2), dur: 0.3 }, { do: "feel", target: "lamb", feeling: "joyful", at: onBeat(2) }, { do: "nod", target: "lamb", at: onBeat(4) }],
    ];
    game = { id: "book_end", title: "A picture book", beats: [beat("bk1", 2.4, [
      say("A picture book!", { at: 0.1 }), word("book", 0.2),
      { do: "move", target: "lamb", to: x.lamb, at: 0.3, dur: 0.3 }, { do: "look", target: "lamb", at: 0.3, to: "ahead" }, front("mary", 0.4), front("lamb", 0.5),
      { do: "hide", target: "bigbook", at: 1.3, dur: 0.3 }, unword("book", 1.6), fill(2, "mini2", 1.0),
    ])] };
  } else if (x.id === "paint") {
    lines = [
      [face("mary", 160, 0.1), { do: "wiggle", target: "brush", at: onBeat(1), deg: 14, dur: 1.4 }, { do: "shot", target: ["ptable", "mary", "paper"], framing: "medium", yaw: -6, dur: 1.4 }],
      [{ do: "pop", target: "splat1", at: onBeat(0.5), dur: 0.35, sound: "splash" }, { do: "pop", target: "splat2", at: onBeat(3), dur: 0.35, sound: "splash" }, { do: "wiggle", target: "brush", at: onBeat(0), deg: 14, dur: 2 }],
      [{ do: "pop", target: "splat3", at: onBeat(3), dur: 0.35, sound: "splash" }, { do: "wiggle", target: "pots", at: onBeat(1), deg: 6, dur: 1 }],
      [front("mary", 0.1), lambHops([2, 3, 4], 0.22), { do: "feel", target: "lamb", feeling: "joyful", at: onBeat(2) }, { do: "shot", target: ["mary", "lamb"], framing: "medium", yaw: 6, dur: 1.2 }],
    ];
    // "Is it white?" again: is the lamb red? No! Is it white? Yes!
    game = { id: "white_again", title: "Is the lamb white?", beats: [
      beat("wa1", 2.4, [say("Is the lamb red?", { at: 0.1 }), { do: "point", target: "robo", to: "lamb", at: 0.3, dur: 0.4, hold: 1.4 }, { do: "shot", target: ["lamb", "paper"], framing: "medium", dur: 1.2 }, { do: "sound", sound: "tick", at: 1.5, volume: 0.5 }]),
      beat("wa2", 2.6, [marySay("No!", 0.1), { do: "sound", sound: "giggle", at: 0.4, volume: 0.5 }, say("Is it white?", { at: "after" }), word("white", 0.9), { do: "sound", sound: "tick", at: 1.9, volume: 0.5 }]),
      beat("wa3", 2.6, [marySay("Yes! White!", 0.1), hop("lamb", 0.3, 0.3), { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.6 }, unword("white", 1.6), fill(3, "mini3", 1.4), { do: "camera", ...CAM, dur: 1.4, at: 1.2 }]),
    ]};
  } else {
    lines = [
      [{ do: "turn", target: "lunchbox#lid", to: [-100, 0, 0], at: 0.2, dur: 0.5 }, { do: "sound", sound: "pop", at: 0.3 }, { do: "shot", target: ["ltable", "mary", "lamb"], framing: "medium", yaw: 8, dur: 1.4 }],
      [{ do: "pop", target: "sandwich", at: onBeat(0.5), dur: 0.35, sound: "pop" }, sway(3)],
      [{ do: "move", target: "apple", to: add(x.lamb, [0.05, 0.02, 0.5]), at: onBeat(1), dur: 0.7, ease: "sineInOut" }, { do: "look", target: "lamb", at: onBeat(1), to: "apple" }],
      [{ do: "nod", target: "lamb", at: onBeat(1) }, { do: "nod", target: "lamb", at: onBeat(3) }, { do: "sound", sound: "clink", at: onBeat(1), volume: 0.3 }, { do: "feel", target: "lamb", feeling: "joyful", at: onBeat(2) }],
    ];
    game = { id: "lunch_turn", title: "Say yum, yum!", beats: yourTurn({
      id: "ln", ask: "Your turn! Say yum, yum!", answer: "Yum, yum!", answerWho: "mary", praise: "Yummy lunch!", wordId: "yum", slot: 4, mini: "mini4",
      extra: [{ do: "hide", target: "qmark", at: 0.05, dur: 0.2 }, { do: "hide", target: "apple", at: 0.3, dur: 0.3 }, { do: "look", target: "lamb", at: 0.3, to: "ahead" }],
    }) };
  }
  scenes.push({ id: `${x.id}_song`, title: `Sing: the ${x.id}`, music: false, beats: [
    beat(`${x.id}_v0`, 1.4, [unword("baa", 0), word(x.id, 0.15), { do: "sound", sound: "pop", at: 0.15 }, yw(x.yaw)]),
    ...verse(`${x.id}_v`, V[x.id], lines).map((b, j) => (j === 0 ? { ...b, do: [...unword(x.id, 0.3), ...b.do] } : b)),
    beat(`${x.id}_v5`, 0.6, [{ do: "sound", sound: "crowd_cheer", at: 0.05, volume: 0.3 }]),
  ]});
  scenes.push(game);
});

// Recap quiz: point to the white one.
const quizBeats = [
  beat("q0", 1.8, [
    say("Now a quick game!", { at: 0.1 }),
    { do: "camera", ...CAM, dur: 1.4 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
    ...[1, 2, 3, 4].map((n, k) => ({ do: "wiggle", target: `slot${n}`, at: 0.3 + k * 0.2, deg: 10, dur: 0.5 })),
  ]),
  beat("q1p", 1.4, [{ do: "pop", target: "q_pig", at: 0.1, dur: 0.4, sound: "pop" }, lambWalk([lambAt, [-1.1, 0, 2.4]], 0.1, 1.1)]),
  ...quizRound({ id: "q1", q: "Which one is white? Point to it!", left: "lamb", right: "q_pig", answer: "lamb", yes: "Yes! The lamb is white!", answerSay: { who: "lamb", text: "Baa!" } }),
];
quizBeats.push(beat("q3", 1.2, [{ do: "hide", target: "q_pig", at: 0.05, dur: 0.3 }]));
scenes.push({ id: "quiz", title: "Point to it!", beats: quizBeats });
lambAt = [-1.1, 0, 1.6];

// The last verse: it made the children laugh and play. Everyone hops; bye-bye.
const FM = [-0.5, 0, 1.0];
const FL = [0.3, 0, 1.05];
const kids = ["mary", "lamb", "pip", "bunny"];
scenes.push({ id: "finale", title: "Laugh and play!", music: false, beats: [
  beat("e0", 2.8, [
    say("Everybody sing! Laugh and play!", { at: 0.1 }),
    maryWalk([maryAt, add(maryAt, [0, 0, 0.6]), FM], 0.1, 2.0), lambWalk([lambAt, FL], 0.3, 0.8),
    { do: "show", target: "pip", at: 0.1, dur: 0.3 }, { do: "show", target: "bunny", at: 0.2, dur: 0.3 },
    { do: "path", target: "pip", points: [add(DOOR, [0, 0, -0.3]), add(DOOR, [-0.6, 0, 1.6]), [-1.7, 0, 0.6]], at: 0.2, dur: 2.0, face: true }, front("pip", 2.25),
    { do: "path", target: "bunny", points: [add(DOOR, [0.3, 0, -0.3]), add(DOOR, [0.9, 0, 1.6]), [1.3, 0, 0.7]], at: 0.3, dur: 1.9, face: true }, front("bunny", 2.25),
    { do: "camera", ...CAM, dur: 2.2 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
  ]),
  ...verse("e1_", V.play, [
    [kids.map((id, k) => hop(id, onBeat(1 + k), 0.25)), { do: "shot", target: kids, framing: "wide", yaw: -8, dur: 2 }],
    [kids.map((id, k) => hop(id, onBeat(k * 1.2), 0.3)), { do: "sound", sound: "giggle", at: onBeat(1), volume: 0.5 }],
    [{ do: "spin", target: "lamb", at: onBeat(1), dur: 1 }, { do: "spin", target: "bunny", at: onBeat(2), dur: 1 }, sway(3), { do: "orbit", around: [0, 0.6, 1], degrees: 18, dur: 3 }],
    [kids.map((id) => ({ do: "feel", target: id, feeling: "joyful", at: onBeat(1) })), { do: "burst", target: "confetti", at: onBeat(4), dur: 2.4 }, { do: "camera", ...CAM, dur: 1.4 }],
  ]),
  beat("e6", 3.4, [
    say("Bye-bye! See you at school!", { at: 0.2 }),
    marySay("Bye-bye!", 1.6), baa(2.2, "Baa!"),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "wiggle", target: "mary", at: 0.4, deg: 8, dur: 1.6 },
    ...[1, 2, 3, 4].map((n, k) => ({ do: "wiggle", target: `slot${n}`, at: 0.4 + k * 0.3, deg: 12, dur: 0.6 })),
    ...kids.map((id, k) => hop(id, 0.6 + k * 0.3, 0.2)),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.6 },
    { do: "camera", ...CAM, dur: 3.2 },
  ]),
]});

const description = "Sing Mary Had a Little Lamb with Robo, Mary and her little white lamb! The lamb follows Mary everywhere, all the way to school. At school it hides behind the slide, the books, the paint table and the lunch table: watch it peek out, count down 3, 2, 1 and find it. Say \"Is it white? Yes!\", count the lamb's hops and steps, ring the school bell and fill the school tracker, then a quick point-to-it quiz and one last verse with everyone.";
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Mary Had a Little Lamb", episode: "br16", seed: 316, skills: ["count_to_5_prek", "position_words_prek", "listening_prek"], cast,
    youtube: {
      title: "Mary Had a Little Lamb 🐑 Find the Lamb at School | Toy Box Friends",
      description: `${description}\n\nYour child learns: following (the lamb follows Mary), school things (slide, book, paint, lunch), the colour white, and counting to four.\n\nSing at home: walk around the room and let your little one follow you like the lamb, hide a toy and say "Where is the lamb? Peekaboo!", and ask "Is it white?" about things you see. The first verses of Mary Had a Little Lamb (the lamb, everywhere that Mary went, it followed her to school, laugh and play) are traditional public-domain lyrics sung to the traditional public-domain tune; the school verses (the slide, the picture book, the paint table and lunch) are original.\n\n${YT_TAIL}`,
      tags: ["mary had a little lamb", "nursery rhymes", "toddler learning", "baby songs", "peekaboo for babies", "colour white", "school song for kids", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "lamb", title: "MARY'S LAMB", subtitle: "Where is the lamb?", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "garden",
        camera: { position: [0.7, 1.15, 5.3], lookAt: [1.0, 0.85, -0.2], fov: 38 },
        objects: [
          { id: "school", kind: "prop", model: "schoolhouse", at: [2.6, 0, -3.6], size: 1.3 },
          { id: "mary", kind: "critter", species: "mary", at: [1.95, 0, 0.3], size: 1.05, rotation: [0, -15, 0], feeling: "joyful" },
          { id: "lamb", kind: "critter", species: "lamb", at: [3.0, 0, 0.75], size: 1.0, rotation: [0, -30, 0], feeling: "joyful" },
          { id: "robo", kind: "character", character: "robot", at: [4.4, 0, -1.2], rotation: [0, -35, 0], clip: "Wave", feeling: "happy" },
        ] },
      { name: "peekaboo", title: "PEEKABOO!", subtitle: "Find the lamb at school!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "garden",
        camera: { position: [1.6, 1.0, 4.6], lookAt: [1.9, 0.75, 0], fov: 38 },
        objects: [
          { id: "table", kind: "prop", model: "cloth_table", color: "sky", at: [2.3, 0, 0.2], size: 1.1 },
          { id: "pots", kind: "prop", model: "paint_pots", at: [1.85, 0.73, 0.3], size: 1.1 },
          { id: "lamb", kind: "critter", species: "lamb", at: [2.7, 0.35, -0.45], size: 1.0, rotation: [0, -15, 0], feeling: "joyful" },
          { id: "bubble", kind: "prop", model: "word_bubble", at: [3.45, 1.75, 0.1], size: 0.8 },
          { id: "baa", kind: "letter", text: "BAA!", color: "ink", parent: "bubble", at: [0, -0.12, 0.12], size: 0.2 },
          { id: "school", kind: "prop", model: "schoolhouse", at: [3.6, 0, -4.2], size: 1.2 },
        ] },
    ],
  }),
  stage: { preset: "garden" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "mary_little_lamb");
