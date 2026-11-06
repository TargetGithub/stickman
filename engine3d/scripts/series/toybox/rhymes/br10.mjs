// Builds ../br10_rainbow_colours.json: Rainbow Colours Song, original lyrics on an original simple tune. Teaches
// the colours of the rainbow in order; for toddlers six: red, orange, yellow, green, blue, purple (indigo and
// violet joined as purple). Run: node br10.mjs (then tools/sung_durs.mjs on the JSON, then this again).
//
// Plan (specs/baby_rhymes.md): hook = a rainbow paints itself across the sky in the first seconds, then fades so
// we can paint it again one stripe at a time; the chorus names the six colours (a paint drop pops on each). Each
// colour: a magic paintbrush paints its stripe across the sky (strokes drawn with `draw`), "What colour is it?
// Say it!", the colour word pops; "Find something red!" with a choice of two things and a 3-2-1, a paint splash
// marks the right one; the verse; a rainbow stripe fills the tracker and the thing joins a row in the garden.
// The sixth stripe (purple) is the surprise teased in the hook. Recap quiz ("Point to blue!"), last chorus, bye.
import {
  say, beat, sung, onBeat, tuneDur, countdownObjects, trackerObjects, bubbleObjects, countdown,
  showTracker, fillSlot, word, unword, quizRound, rhymeMeta, writeRhyme, YT_TAIL, art,
} from "./kit.mjs";

const r2 = (v) => Math.round(v * 100) / 100;
const hop = (target, at, height = 0.25, dur = 0.4) => ({ do: "hop", target, at, height, dur });

// ---- The tune (original, key of C, one note per syllable) -------------------------------------------------------
// A colour word slot: one note for a one-syllable colour, the same note split in two for "or-ange", "yel-low" and
// "pur-ple" (same beats, so every verse keeps the same rhythm).
const slot = (c, note, beats = 1) => (c.syl === 1 ? `${note}:${beats}` : `${note}:${beats / 2} ${note}:${beats / 2}`);
const T = {
  ch1: "E4 G4:0.5 G4:0.5 A4:0.5 A4:0.5 G4:2", // Red, orange, yellow, green,
  ch2: "G4 A4 G4:0.5 E4:0.5 D4 E4 C4:2", // blue and purple, look and see,
  ch3: "E4:0.5 E4:0.5 G4 G4 A4:0.5 A4:0.5 G4:2", // paint a rainbow in the sky,
  ch4: "F4:0.5 F4:0.5 E4 E4 D4:0.5 D4:0.5 C4:2", // colours shining way up high.
  v1: (c) => `${slot(c, "G4")} ${slot(c, "E4")} G4:0.5 A4:0.5 ${slot(c, "G4", 2)}`, // Red, red, paint it red,
  v2: (c) => `E4 ${slot(c, "F4")} G4 A4:0.5 A4:0.5 G4 E4:2`, // a red stripe across the sky,
  v3: (c) => `F4 F4 E4 ${slot(c, "D4")} E4 F4 G4:2`, // What else is red? Look and see,
  v4_7: "E4 G4 A4:0.5 A4:0.5 G4 E4 C4:2", // a red apple on the tree.
  v4_8: "E4 G4:0.5 G4:0.5 A4:0.5 A4:0.5 G4 E4 C4:2", // a yellow banana for me.
  v4_9: "E4 G4:0.5 G4:0.5 A4:0.5 A4:0.5 A4 G4 E4 C4:2", // a purple butterfly, fly with me.
};
const CHORUS = ["Red, orange, yellow, green,", "blue and purple, look and see,", "paint a rainbow in the sky,", "colours shining way up high."];
const CH_T = [T.ch1, T.ch2, T.ch3, T.ch4];
// Tune beat (from 0) of each colour word in the first two chorus lines.
const CH_K = [[0, 1, 2, 3], [0, 2]];

// ---- The stage --------------------------------------------------------------------------------------------------
// The rainbow: six strokes (outer red to inner purple) on one centre far back in the sky, feet in two clouds.
const RC = [0, 0, -7];
const WIDTH = 0.42;
const ROBO = [-3.6, 0, 1.0];
const SPOTS = { L: [-1.0, 0, 1.5], R: [1.2, 0, 1.5] };
const HOME_Z = -1.4;
// The six colours. thing: what Robo finds; side: where it appears in the find (the other thing on the other side).
const C = [
  { id: "red", word: "RED", wc: "red", syl: 1, r: 4.95, thing: "apple", obj: { kind: "prop", model: "apple", size: 0.95 }, side: "R",
    hello: "Here comes the first stripe!", line4: "a red apple on the tree.", t4: T.v4_7, say: "A red apple!", praise: "Yes! Red!" },
  { id: "orange", word: "ORANGE", wc: "orange", syl: 2, r: 4.55, thing: "orange", obj: { kind: "prop", model: "orange", size: 4.6 }, side: "L",
    hello: "Swish! Another stripe!", line4: "a round orange, one for me.", t4: T.v4_7, say: "An orange orange!", praise: "Orange! Well done!" },
  { id: "yellow", word: "YELLOW", wc: "gold", syl: 2, r: 4.15, thing: "banana", obj: { kind: "prop", model: "banana", size: 4.2 }, side: "R",
    hello: "Swish, swish! A new colour!", line4: "a yellow banana for me.", t4: T.v4_8, say: "A yellow banana!", praise: "Yellow! Super!" },
  { id: "green", word: "GREEN", wc: "green", syl: 1, r: 3.75, thing: "frog", obj: { kind: "critter", species: "frog", size: 1.1 }, side: "L", voice: { voice: "deep", pitch: 1.05, speed: 0.95 }, sound: "Ribbit!",
    hello: "Paint, paint, paint!", line4: "a green froggy, hop with me.", t4: T.v4_7, say: "A green frog!", praise: "Green! Hooray!" },
  { id: "blue", word: "BLUE", wc: "blue", syl: 1, r: 3.35, thing: "birdie", obj: { kind: "critter", species: "chick", color: "blue", size: 1.05 }, side: "R", voice: { voice: "squeaky", pitch: 1.3, speed: 1 }, sound: "Tweet, tweet!",
    hello: "Swish! One more stripe!", line4: "a blue birdie, sing with me.", t4: T.v4_7, say: "A blue birdie!", praise: "Blue! Like the sky!" },
  { id: "purple", word: "PURPLE", wc: "purple", syl: 2, r: 2.95, thing: "butterfly", obj: { kind: "critter", species: "butterfly", size: 1.0 }, side: "L", voice: { voice: "soft", pitch: 1.25, speed: 1 }, sound: "Flutter, flutter!",
    hello: "The surprise colour! Here it comes!", line4: "a purple butterfly, fly with me.", t4: T.v4_9, say: "A purple butterfly!", praise: "Purple! Amazing!" },
];
C.forEach((c, i) => {
  c.i = i;
  c.item = `${c.id}_${c.thing}`;
  c.stripe = `stripe_${c.id}`;
  c.home = [r2(-2.4 + i * 1.1), 0, HOME_Z];
  c.spot = SPOTS[c.side];
  c.other = SPOTS[c.side === "L" ? "R" : "L"];
  c.lines = [`${c.word[0]}${c.word.slice(1).toLowerCase()}, ${c.id}, paint it ${c.id},`, `${art(c.id)} ${c.id} stripe across the sky,`, `What else is ${c.id}? Look and see,`, c.line4];
  c.tunes = [T.v1(c), T.v2(c), T.v3(c), c.t4];
  c.top = [RC[0], RC[1] + c.r, RC[2]];
});
const cap = (w) => w[0].toUpperCase() + w.slice(1);
const Name = (c) => `${c.word[0]}${c.word.slice(1).toLowerCase()}`;
// Points along a stripe's arch, left foot to right foot (relative to RC), and the brush path just in front of it.
const arch = (r, n = 33, dz = 0) => Array.from({ length: n }, (_, k) => {
  const a = Math.PI - (Math.PI * k) / (n - 1);
  return [r2(r * Math.cos(a)), r2(r * Math.sin(a)), dz];
});
const brushAt = (c, f) => {
  const a = Math.PI * (1 - f);
  return [r2(RC[0] + c.r * Math.cos(a)), r2(RC[1] + c.r * Math.sin(a)), r2(RC[2] + 0.35)];
};
// The brush rides the tip of the stroke: `draw` reveals by length with sineInOut, so the brush takes short linear
// moves through the same eased fractions (a `path` runs at an even speed and would run ahead).
const BRUSH_STEPS = 14;
const brushMoves = (c, at0, dur) => Array.from({ length: BRUSH_STEPS }, (_, k) => {
  const f = (1 - Math.cos((Math.PI * (k + 1)) / BRUSH_STEPS)) / 2;
  return { do: "move", target: "brush", to: brushAt(c, f), at: r2(at0 + (k * dur) / BRUSH_STEPS), dur: r2(dur / BRUSH_STEPS), ease: "linear" };
});

// Cameras: the sky (the whole rainbow), the garden row, the default.
const SKY_CAM = { position: [0, 2.2, 9.2], lookAt: [0, 2.5, -5], fov: 42 };
const WIDE_CAM = { position: [0, 2.3, 9.6], lookAt: [0, 1.85, -2.5], fov: 42 };
const CAM = { position: [0, 1.9, 8.2], lookAt: [0, 1.45, -1], fov: 40 }; // this rhyme's default
const FIND_CAM = { position: [-0.6, 1.65, 6.7], lookAt: [-0.6, 1.0, 0], fov: 40 };
// A low camera on the find spot (the thing, its splash and the rainbow behind), from a side.
const spotCam = (c, side) => ({ position: [c.spot[0] + side * 1.8, 1.4, c.spot[2] + 5.0], lookAt: [c.spot[0], 1.1, c.spot[2] - 0.8], fov: 40 });

// ---- Objects ----------------------------------------------------------------------------------------------------
const objects = [
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, 35, 0], feeling: "happy" },
  { id: "tree_l", kind: "prop", model: "tree", at: [-7.8, 0, -4.4], size: 1.7 },
  { id: "tree_r", kind: "prop", model: "tree", at: [7.6, 0, -4.0], size: 1.6 },
  { id: "bush_l", kind: "prop", model: "bush", at: [-6.3, 0, -2.4], size: 1.1 },
  { id: "bush_r", kind: "prop", model: "bush", at: [6.4, 0, -2.0], size: 1.0 },
  { id: "flower1", kind: "prop", model: "flower", color: "pink", at: [-3.4, 0, 2.7], size: 0.7 },
  { id: "flower2", kind: "prop", model: "flower", color: "white", at: [3.6, 0, 2.5], size: 0.65 },
  { id: "flower3", kind: "prop", model: "flower", color: "pink", at: [5.2, 0, 0.6], size: 0.75 },
  { id: "flower4", kind: "prop", model: "flower", color: "white", at: [-5.9, 0, 0.2], size: 0.7 },
  { id: "cloud_l", kind: "prop", model: "cloud", at: [-4.0, 0.45, -6.3], size: 1.45 },
  { id: "cloud_r", kind: "prop", model: "cloud", at: [4.0, 0.45, -6.3], size: 1.45 },
  { id: "cloud_sky", kind: "prop", model: "cloud", at: [6.8, 6.3, -9], size: 1.1 },
];
for (const c of C) objects.push({ id: c.stripe, kind: "stroke", at: RC, points: arch(c.r, 33, c.i * 0.02), smooth: true, width: WIDTH, color: c.id, hidden: true });
// The magic brush (its tip is its main colour) and the paint splash that marks the right thing (both repainted).
objects.push({ id: "brush", kind: "prop", model: "rainbow_brush", color: "red", at: brushAt(C[0], 0), rotation: [0, 0, -150], size: 2.6, hidden: true });
objects.push({ id: "splash", kind: "prop", model: "paint_splash", color: "red", at: [0, 0.95, 0.75], size: 1.1, hidden: true });
// The things: each waits hidden on its find spot; the blue ball is the first other choice.
for (const c of C) objects.push({ id: c.item, ...c.obj, at: c.spot, rotation: [0, c.side === "L" ? 15 : -15, 0], ...(c.obj.kind === "critter" ? { feeling: "happy" } : {}), hidden: true });
objects.push({ id: "blue_ball", kind: "prop", model: "ball", color: "blue", at: C[0].other, size: 0.9, hidden: true });
// Paint drops for the chorus (one per colour, a row in the air).
C.forEach((c, i) => objects.push({ id: `drop_${c.id}`, kind: "prop", model: "paint_drop", color: c.id, at: [-2.5 + i * 1.0, 2.75, 1.2], size: 1.5, hidden: true }));
objects.push({ id: "confetti", kind: "confetti", at: [0, 3.2, 1] });
// HUD: six tracker slots (dark rims, so the colours inside are the only colours), a rainbow stripe in each,
// "?" on the sixth (the surprise colour), the countdown and the word bubble with each colour word.
objects.push(...trackerObjects(6, { colors: ["charcoal"] }));
C.forEach((c, i) => objects.push({ id: `mini_${c.id}`, kind: "prop", model: "rainbow_band", color: c.id, hud: true, parent: `slot${i + 1}`, at: [0, -0.27, 0.15], size: 0.68, hidden: true }));
objects.push({ id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot6", at: [0, -0.26, 0.2], size: 0.42, hidden: true });
objects.push(...countdownObjects());
objects.push(...bubbleObjects(C.map((c) => ({ id: c.id, text: c.word, color: c.wc }))));

// ---- Pieces -----------------------------------------------------------------------------------------------------
const stripesOn = (at0, gap, dur) => C.map((c, k) => ({ do: "draw", target: c.stripe, at: at0 + k * gap, dur }));

// Paint the stripe, ask for its name, the word pops.
function paint(c, prev) {
  return [
    beat(`${c.id}_p1`, 2.9, [
      { do: "camera", ...SKY_CAM, dur: 1.0 },
      prev ? unword(prev.id, 0) : null,
      prev ? null : C.map((x, k) => ({ do: "hide", target: `drop_${x.id}`, at: 0.1 + k * 0.06, dur: 0.3 })),
      { do: "paint", target: "brush", color: c.id, at: 0, dur: 0.05 },
      { do: "move", target: "brush", to: brushAt(c, 0), at: 0, dur: 0.05 },
      { do: "show", target: "brush", at: 0.1, dur: 0.3 },
      ...brushMoves(c, 0.3, 2.2),
      { do: "draw", target: c.stripe, at: 0.3, dur: 2.2 },
      { do: "sound", sound: "whoosh", at: 0.4, volume: 0.6 },
      { do: "sound", sound: "magic_sparkle", at: 2.4, volume: 0.6 },
      { do: "hide", target: "brush", at: 2.55, dur: 0.25 },
      { do: "look", target: "robo", at: 0.2, to: c.top },
      c.id === "purple" ? { do: "hide", target: "qmark", at: 0.3, dur: 0.2 } : null,
      c.id === "purple" ? { do: "wiggle", target: "slot6", at: 0.3, deg: 12, dur: 1 } : null,
      say(c.hello, { at: 0.2 }),
    ]),
    beat(`${c.id}_p2`, 2.2, [
      say("What colour is it? Say it!", { at: 0.1 }),
      { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
      { do: "sound", sound: "tick", at: 1.4, volume: 0.5 },
      { do: "sound", sound: "tick", at: 1.95, volume: 0.5 },
    ]),
    beat(`${c.id}_p3`, 2.2, [
      say(`${Name(c)}! It's ${c.id}!`, { at: 0.1, caption: false }),
      { do: "caption", text: c.word, style: "label", at: 0.1, dur: 1.8 },
      word(c.id, 0.15),
      { do: "sound", sound: "ding", at: 0.15 },
      { do: "point", target: "robo", to: c.top, at: 0.3, dur: 0.45, hold: 1.4 },
    ]),
  ];
}

// "Find something red!": two things, 3-2-1, the right one is marked and a splash of its colour pops behind it.
function find(c) {
  const prev = C[c.i - 1];
  const otherId = prev ? prev.item : "blue_ball";
  const otherWord = prev ? prev.thing : "ball";
  const left = c.side === "L" ? c.item : otherId;
  const right = c.side === "L" ? otherId : c.item;
  const fly = c.id === "purple" || c.id === "blue";
  return [
    beat(`${c.id}_f1`, 2.8, [
      { do: "camera", ...FIND_CAM, dur: 1.0 },
      { do: "look", target: "robo", at: 0.1, to: "ahead" },
      fly ? { do: "show", target: c.item, at: 0.1, dur: 0.3 } : { do: "pop", target: c.item, at: 0.3, dur: 0.4, sound: "pop" },
      fly ? { do: "path", target: c.item, points: [[c.spot[0] + 1.5, 3.2, c.spot[2] - 2], [c.spot[0] + 0.6, 1.6, c.spot[2] - 0.6], c.spot], at: 0.1, dur: 1.1 } : null,
      prev ? { do: "move", target: otherId, to: c.other, at: 0.1, dur: 1.0, ease: "sineInOut" } : { do: "pop", target: "blue_ball", at: 0.5, dur: 0.4, sound: "pop" },
      prev ? { do: "turn", target: otherId, to: [0, c.side === "L" ? -15 : 15, 0], at: 0.1, dur: 0.6 } : null,
      say(`Find something ${c.id}! ${cap(left === c.item ? c.thing : otherWord)} or ${left === c.item ? otherWord : c.thing}?`, { at: 0.6 }),
    ]),
    beat(`${c.id}_f2`, 2.8, [
      ...countdown(0.1),
      { do: "wiggle", target: left, at: 0.2, deg: 8, dur: 0.6 },
      { do: "wiggle", target: right, at: 0.95, deg: 8, dur: 0.6 },
      { do: "wiggle", target: left, at: 1.7, deg: 8, dur: 0.6 },
    ]),
    beat(`${c.id}_f3`, 3.0, [
      { do: "mark", target: c.item, result: "correct", at: 0.1, dur: 2.2 },
      { do: "paint", target: "splash", color: c.id, at: 0, dur: 0.05 },
      { do: "move", target: "splash", to: [c.spot[0], 0.95, c.spot[2] - 0.75], at: 0, dur: 0.05 },
      { do: "pop", target: "splash", at: 0.2, dur: 0.4, sound: "splash" },
      hop(c.item, 0.3, 0.35),
      c.sound ? { do: "say", who: c.item, text: c.sound, at: 0.4 } : null,
      say(`Yes! ${c.say}`, { at: c.sound ? "after" : 0.5 }),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.6 },
      c.obj.kind === "critter" ? { do: "feel", target: c.item, feeling: "joyful", at: 0.3 } : null,
      prev ? { do: "move", target: otherId, to: prev.home, at: 1.9, dur: 1.0, ease: "sineInOut" } : { do: "hide", target: "blue_ball", at: 2.2, dur: 0.3 },
      prev ? { do: "turn", target: otherId, to: [0, 0, 0], at: 2.6, dur: 0.4 } : null,
    ]),
  ];
}

// The verse, then the stripe fills the tracker and the thing goes to its place in the row.
const YAW = [-14, 12, -10, 14, -12, 10];
function verse(c) {
  const [l1, l2, l3, l4] = c.lines;
  const [t1, t2, t3, t4] = c.tunes;
  const crit = c.obj.kind === "critter";
  return [
    beat(`${c.id}_s1`, tuneDur(t1), sung(l1, t1, [
      { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
      { do: "camera", ...SKY_CAM, dur: 1.4 },
      { do: "look", target: "robo", at: 0.2, to: c.top },
      hop(c.item, onBeat(0)), hop(c.item, onBeat(1)), hop(c.item, onBeat(3)),
    ])),
    beat(`${c.id}_s2`, tuneDur(t2), sung(l2, t2, [
      { do: "camera", ...WIDE_CAM, dur: 1.6 },
      { do: "point", target: "robo", to: c.top, at: onBeat(1), dur: 0.45, hold: 1.6 },
      { do: "wiggle", target: c.item, at: onBeat(3), deg: 10, dur: 1 },
    ])),
    beat(`${c.id}_s3`, tuneDur(t3), sung(l3, t3, [
      { do: "camera", ...spotCam(c, Math.sign(YAW[c.i])), dur: 1.4 },
      { do: "look", target: "robo", at: 0.2, to: c.item },
      { do: "wiggle", target: "splash", at: onBeat(3), deg: 8, dur: 0.8 },
      hop(c.item, onBeat(5), 0.3),
    ])),
    beat(`${c.id}_s4`, tuneDur(t4), sung(l4, t4, [
      crit ? { do: "feel", target: c.item, feeling: "joyful", at: onBeat(1) } : null,
      { do: "spin", target: c.item, at: onBeat(2), dur: 1 },
      { do: "orbit", around: [c.spot[0], 0.7, c.spot[2]], degrees: c.side === "L" ? 14 : -14, dur: 3 },
      { do: "clip", target: "robo", clip: "Jump", at: onBeat(5) },
    ])),
    beat(`${c.id}_s5`, 1.6, [
      fillSlot(c.i + 1, `mini_${c.id}`, 0.2),
      { do: "hide", target: "splash", at: 0.1, dur: 0.3 },
      { do: "move", target: c.item, to: c.home, at: 0.5, dur: 1.2, ease: "sineInOut" },
      { do: "turn", target: c.item, to: [0, 0, 0], at: 0.6, dur: 0.6 },
      { do: "look", target: "robo", at: 0.2, to: "ahead" },
      { do: "camera", ...CAM, dur: 1.6 },
    ]),
  ];
}

// The chorus: a paint drop pops on each colour word (pop: first time; hop: the last chorus).
function chorus(id, first) {
  return CHORUS.map((line, n) => beat(`${id}${n + 1}`, tuneDur(CH_T[n]), sung(line, CH_T[n], [
    n === 0 ? { do: "clip", target: "robo", clip: "Dance", at: 0.1 } : null,
    ...(CH_K[n] ?? []).map((k, j) => {
      const c = C[n === 0 ? j : 4 + j];
      return first ? { do: "pop", target: `drop_${c.id}`, at: onBeat(k), dur: 0.35, sound: "bubble_pop" } : hop(`drop_${c.id}`, onBeat(k), 0.3);
    }),
    !first ? (CH_K[n] ?? []).map((k, j) => hop(C[n === 0 ? j : 4 + j].item, onBeat(k), 0.35)) : null,
    n === 2 ? C.map((c, k) => hop(`drop_${c.id}`, onBeat(k * 0.6), 0.2)) : null,
    n === 2 && !first ? { do: "clip", target: "robo", clip: "Jump", at: onBeat(4) } : null,
    n === 3 ? { do: "clip", target: "robo", clip: first ? "Wave" : "Dance", at: 0.2 } : null,
    n === 3 && !first ? C.map((c, k) => hop(c.item, onBeat(k * 0.7), 0.3)) : null,
  ])));
}

// ---- Scenes -----------------------------------------------------------------------------------------------------
const scenes = [];

// 0:00 Hook: a rainbow paints itself across the sky; then it fades so we can paint it again, stripe by stripe.
scenes.push({ id: "hello", title: "A rainbow!", beats: [
  beat("h1", 3.4, [
    { do: "camera", position: [0, 1.6, 13.5], lookAt: [0, 2.9, -4], fov: 44, dur: 0 },
    { do: "camera", ...SKY_CAM, dur: 3.2 },
    ...stripesOn(0.1, 0.3, 1.3),
    { do: "sound", sound: "whoosh", at: 0.1, volume: 0.5 },
    { do: "sound", sound: "magic_sparkle", at: 1.6, volume: 0.7 },
    say("Look! A rainbow!", { at: 0.7 }),
    { do: "look", target: "robo", at: 0.3, to: C[0].top },
    { do: "clip", target: "robo", clip: "Jump", at: 1.0 },
  ]),
  beat("h2", 3.6, [
    say("Red, orange, yellow, green, blue and purple!", { at: 0.1 }),
    ...C.map((c, k) => ({ do: "pop", target: `drop_${c.id}`, at: 0.3 + k * 0.42, dur: 0.35, sound: "bubble_pop" })),
    { do: "point", target: "robo", to: C[2].top, at: 0.3, dur: 0.5, hold: 2.2 },
  ]),
  beat("h3", 2.6, [
    say("Whoosh! Let's paint it again!", { at: 0.1 }),
    ...C.map((c, k) => ({ do: "hide", target: c.stripe, at: 0.2 + k * 0.08, dur: 0.5 })),
    ...C.map((c, k) => ({ do: "hide", target: `drop_${c.id}`, at: 0.3 + k * 0.08, dur: 0.3 })),
    { do: "sound", sound: "whoosh", at: 0.2 },
    { do: "camera", ...CAM, dur: 1.6 },
    { do: "look", target: "robo", at: 0.4, to: "ahead" },
  ]),
  beat("h4", 3.0, [
    say("Six stripes! The last one is a surprise!", { at: 0.1 }),
    ...showTracker(5, 0.2, 0.2),
    { do: "pop", target: "slot6", at: 1.4, dur: 0.4, sound: "magic_sparkle" }, { do: "pop", target: "qmark", at: 1.6, dur: 0.4, sound: false },
    { do: "grow", target: "slot6", to: 1.2, at: 2.1, dur: 0.3 }, { do: "grow", target: "slot6", to: 1, at: 2.5, dur: 0.3 },
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
]});

// The chorus with a paint drop for each colour.
scenes.push({ id: "chorus", title: "Sing: the rainbow song", music: false, beats: [
  ...chorus("c", true),
]});

C.forEach((c, i) => {
  scenes.push({ id: `${c.id}_paint`, title: i === 5 ? "The surprise colour" : "Paint a stripe!", beats: paint(c, C[i - 1]) });
  scenes.push({ id: `${c.id}_find`, title: `Find something ${c.id}!`, beats: find(c) });
  scenes.push({ id: `${c.id}_song`, title: `Sing: ${c.id}`, music: false, beats: verse(c) });
});

// Recap quiz: point to blue (every colour already had its own two-way find).
const bird = C[4], frog = C[3];
const q1 = quizRound({ id: "q1", q: "Point to blue!", left: frog.item, right: bird.item, answer: bird.item, yes: "Yes! Blue! The blue birdie!",
  answerSay: { who: bird.item, text: "Tweet, tweet!" }, back: { [frog.item]: frog.home, [bird.item]: bird.home } });
q1[2].do.push({ do: "point", target: "robo", to: bird.item, at: 0.4, dur: 0.45, hold: 1.4 });
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 2.4, [
    unword("purple", 0),
    say("A whole rainbow! Let's play!", { at: 0.1 }),
    { do: "camera", ...WIDE_CAM, dur: 1.4 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
    { do: "burst", target: "confetti", at: 0.3, dur: 2.2 },
  ]),
  ...q1,
]});

// Last chorus with everyone, then bye-bye.
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("z0", 1.8, [
    say("Everybody sing!", { at: 0.1 }),
    { do: "camera", ...WIDE_CAM, dur: 1.4 },
    ...C.map((c, k) => ({ do: "pop", target: `drop_${c.id}`, at: 0.3 + k * 0.15, dur: 0.35, sound: "bubble_pop" })),
    ...C.filter((c) => c.obj.kind === "critter").map((c) => ({ do: "feel", target: c.item, feeling: "joyful", at: 0.3 })),
  ]),
  ...chorus("z", false),
  beat("z5", 3.2, [
    { do: "burst", target: "confetti", at: 0.1, dur: 2.6 },
    say("Red, orange, yellow, green, blue and purple! Our rainbow!", { at: 0.2 }),
    ...C.map((c, k) => hop(c.item, 0.3 + k * 0.4, 0.35)),
    ...C.map((c, k) => ({ do: "wiggle", target: `slot${k + 1}`, at: 0.3 + k * 0.4, deg: 10, dur: 0.5 })),
    { do: "camera", ...SKY_CAM, dur: 2.4 },
  ]),
  beat("z6", 3.4, [
    say("Bye-bye, rainbow! Bye-bye, friends!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "say", who: frog.item, text: "Ribbit!", at: 1.9, caption: false },
    ...C.map((c, k) => ({ do: "wiggle", target: c.item, at: 0.4 + k * 0.1, deg: 8, dur: 1.5 })),
    ...C.map((c, k) => ({ do: "hide", target: `drop_${c.id}`, at: 0.4 + k * 0.06, dur: 0.3 })),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.8, dur: 2.4 },
    { do: "camera", position: [0, 3.0, 15.5], lookAt: [0, 2.4, -3], fov: 44, dur: 3 },
  ]),
]});

// ---- Meta -------------------------------------------------------------------------------------------------------
const description = "Paint a rainbow with Robo and learn the colours of the rainbow in order! A rainbow paints itself across the sky, then Robo's magic paintbrush paints it again one stripe at a time: red, orange, yellow, green, blue and purple. Say each colour, find something that colour (a red apple, an orange, a yellow banana, a green frog, a blue birdie and a purple butterfly) with a 3, 2, 1 choice, and fill up the rainbow tracker. The last stripe is a surprise colour, then a quick point-to-it quiz and the rainbow song all together.";
const stripeObj = (c, i, at, w = 0.24) => ({ id: `s_${c.id}`, kind: "stroke", at, points: arch(1.55 - i * 0.22, 25, i * 0.01), smooth: true, width: w, color: c.id });
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Rainbow Colours Song", episode: "br10", seed: 310, skills: ["listening_prek", "weather_seasons_1"],
    cast: Object.fromEntries(C.filter((c) => c.voice).map((c) => [c.item, c.voice])),
    youtube: {
      title: "Rainbow Colours Song 🌈 Learn the Colours of the Rainbow for Toddlers | Toy Box Friends",
      description: `${description}\n\nColours in rainbow order: red, orange, yellow, green, blue and purple. A rainbow has seven colours (indigo and violet after blue); for toddlers we sing six and call the last stripe purple.\n\nSing at home: point to something red in your room, then orange, yellow, green, blue and purple, and sing the colours in order. Draw a rainbow together one stripe at a time and name each colour. The Rainbow Colours Song has original lyrics and an original tune written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["rainbow song", "colours of the rainbow", "learn colours for toddlers", "colors for kids", "colour song", "rainbow colours", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "rainbow", title: "RAINBOW COLOURS", subtitle: "Sing the rainbow!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "garden",
        camera: { position: [0.9, 1.3, 6.6], lookAt: [1.9, 1.0, -0.4], fov: 38 },
        objects: [
          ...C.map((c, i) => stripeObj(c, i, [3.4, 0, -1.8], 0.24)),
          { id: "cl", kind: "prop", model: "cloud", at: [2.4, 0.22, -1.5], size: 0.62 },
          { id: "cr", kind: "prop", model: "cloud", at: [4.4, 0.22, -1.5], size: 0.62 },
          { id: "brush", kind: "prop", model: "rainbow_brush", color: "purple", at: [4.75, 1.45, -1.3], rotation: [0, 0, -150], size: 1.1 },
          { id: "frog", kind: "critter", species: "frog", at: [2.6, 0, 0.9], size: 0.62, rotation: [0, -10, 0], feeling: "joyful" },
          { id: "bird", kind: "critter", species: "chick", color: "blue", at: [3.4, 0, 1.05], size: 0.6, rotation: [0, -20, 0], feeling: "joyful" },
          { id: "fly", kind: "critter", species: "butterfly", at: [4.2, 0, 0.85], size: 0.58, rotation: [0, -25, 0], feeling: "happy" },
        ] },
      { name: "red", title: "FIND RED!", subtitle: "Paint the rainbow!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "garden",
        camera: { position: [0.8, 1.2, 5.6], lookAt: [1.4, 0.95, 0], fov: 36 },
        objects: [
          ...C.map((c, i) => stripeObj(c, i, [2.1, 0, -2.2], 0.26)),
          { id: "splash", kind: "prop", model: "paint_splash", color: "red", at: [1.75, 0.55, 0.1], size: 1.0 },
          { id: "apple", kind: "prop", model: "apple", at: [1.75, 0, 0.5], size: 0.72 },
          { id: "ball", kind: "prop", model: "ball", color: "blue", at: [3.0, 0, 0.6], size: 0.6 },
          { id: "bubble", kind: "prop", model: "word_bubble", at: [3.0, 1.9, 0.3], size: 0.9 },
          { id: "redw", kind: "letter", text: "RED", color: "red", parent: "bubble", at: [0, -0.1, 0.12], size: 0.24 },
        ] },
    ],
  }),
  stage: { preset: "garden" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "rainbow_colours");
