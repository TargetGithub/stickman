// Builds ../br02_baa_baa_colours.json: Baa Baa Black Sheep with original colour verses (black, white, red, blue,
// yellow). Run: node br02.mjs (then tools/sung_durs.mjs on the JSON, then this again to fit the sung beats).
//
// Plan (specs/baby_rhymes.md): hook = the black sheep says "Baa!" and the first wool bag pops; each colour: guess the
// colour from the peeking wool ("Which colour is next?"), 3-2-1, the verse (three bags pop on "three bags full"),
// your turn (say the colour), a wool bag fills the tracker (the fifth, a surprise colour in the barn, is teased);
// count the 3 bags; recap quiz with yarn balls ("Point to the red wool!"); last chorus; bye-bye.
import {
  DEFAULT_CAM, say, beat, sung, onBeat, tuneDur, countdownObjects, trackerObjects, countdown, showTracker,
  fillSlot, yourTurn, quizRound, rhymeMeta, writeRhyme, YT_TAIL,
} from "./kit.mjs";

// Baa Baa Black Sheep (traditional, public domain) on the Twinkle melody, key of C, one note per syllable.
const T = {
  baa: "C4 C4 G4 G4 A4:0.5 A4:0.5 A4:0.5 A4:0.5 G4:2", // Baa, baa, black sheep, have you any wool?
  baa2: "C4 C4 G4:0.5 G4:0.5 G4 A4:0.5 A4:0.5 A4:0.5 A4:0.5 G4:2", // Baa, baa, yel-low sheep, ...
  yes: "F4 F4 E4 E4 D4 D4 C4:2", // Yes sir, yes sir, three bags full!
  yes2: "F4 F4 E4:0.5 E4:0.5 E4 D4 D4 C4:2", // Yes, yes, yel-low wool, three bags full!
  one: "G4 G4:0.5 G4:0.5 F4 F4 E4:0.5 E4:0.5 E4:0.5 E4:0.5 D4:2", // One for the master, and one for the dame,
  lane: "G4:0.5 G4:0.5 G4:0.5 G4:0.5 F4:0.5 F4:0.5 F4 E4:0.5 E4:0.5 E4:0.5 E4:0.5 D4:2", // And one for the little boy who lives down the lane.
  lane11: "G4:0.5 G4:0.5 G4:0.5 G4:0.5 F4:0.5 F4:0.5 F4 E4:0.5 E4:0.5 E4 D4:2", // the colour verses' last line (11 syllables)
};
// Tune beat (from 0) of "three", "bags", "full" in the yes line, and of each "one" in the one/lane lines.
const K_THREE = [4, 5, 6];
const K_ONE = [0, 4.5];
const K_LANE = 0.5;

// Layout: two hay bales to hide behind, the barn at the back (the surprise), the verse spot front left with the
// three wool bags to its right.
const BALE = { L: [-1.9, 0, 0.4], R: [1.9, 0, 0.4] };
const SHEEP = 1.2; // sheep size: about 1.4 m to the ear tips
const FRONT = [-0.7, 0, 1.6];
const BAGS = [[0.45, 0, 1.85], [1.1, 0, 1.75], [1.75, 0, 1.85]];
const IN_BARN = [0, 0, -1.2];

// The five sheep in order. bale: where it hides (black starts in front; yellow is the surprise in the barn).
const C = [
  { id: "black", color: "black", word: "BLACK", wc: "black", park: [-4.0, 0, -1.2], voice: { voice: "soft", pitch: 1.1, speed: 0.95 },
    lines: ["Baa, baa, black sheep, have you any wool?", "Yes sir, yes sir, three bags full!", "One for the master, and one for the dame,", "And one for the little boy who lives down the lane."],
    praise: "Yes! Black! Well done!" },
  { id: "white", color: "white", word: "WHITE", wc: "ink", bale: "R", park: [4.3, 0, -1.4], voice: { voice: "soft", pitch: 1.3, speed: 0.95 },
    lines: ["Baa, baa, white sheep, have you any wool?", "Yes, yes, white wool, three bags full!", "One for a snowman, and one for a kite,", "And one for a bunny all fluffy and white."],
    praise: "Hooray! White! Like a fluffy cloud!" },
  { id: "red", color: "red", word: "RED", wc: "red", bale: "L", park: [-3.0, 0, -2.5], voice: { voice: "squeaky", pitch: 1.15, speed: 1 },
    lines: ["Baa, baa, red sheep, have you any wool?", "Yes, yes, red wool, three bags full!", "One for a red hat, and one for a bow,", "And one for a scarf that is red like a rose."],
    praise: "Wow! Red! Super!" },
  { id: "blue", color: "blue", word: "BLUE", wc: "blue", bale: "R", park: [3.2, 0, -2.4], voice: { voice: "deep", pitch: 1.05, speed: 0.95 },
    lines: ["Baa, baa, blue sheep, have you any wool?", "Yes, yes, blue wool, three bags full!", "One for the blue sky, and one for the sea,", "And one for a blanket as blue as can be."],
    praise: "Yay! Blue! Like the sky!" },
  { id: "yellow", color: "yellow", word: "YELLOW", wc: "ink", barn: true, park: [0, 0, 0.1], voice: { voice: "squeaky", pitch: 1.25, speed: 1.05 },
    lines: ["Baa, baa, yellow sheep, have you any wool?", "Yes, yes, yellow wool, three bags full!", "One for the sunshine, and one for a bee,", "And one for a chick that's as yellow as me!"],
    praise: "Amazing! Yellow! Like the sun!" },
];
const name = (c) => `${c.id}_sheep`;
const two = (c) => c.id === "yellow"; // "yel-low": two syllables on the colour word

// ---- Objects ---------------------------------------------------------------------------------------------------
const objects = [
  { id: "robo", kind: "character", character: "robot", at: [-4.7, 0, 0.9], rotation: [0, 35, 0], feeling: "happy" },
  { id: "barn", kind: "prop", model: "barn", at: [0, 0, -1.5] },
  { id: "hay_l", kind: "prop", model: "hay_bale", at: BALE.L, size: 1.3, rotation: [0, 8, 0] },
  { id: "hay_r", kind: "prop", model: "hay_bale", at: BALE.R, size: 1.3, rotation: [0, -8, 0] },
];
for (const c of C) {
  if (c.id === "black") c.start = FRONT;
  else if (c.barn) c.start = IN_BARN;
  else {
    const [x] = BALE[c.bale];
    c.hide = [x, -1.5, -0.35]; // sunk below the floor behind the bale
    c.peek = [x, 0, -0.35]; // standing behind it: the top of the wool and the head show
    c.start = c.hide;
  }
  objects.push({ id: name(c), kind: "critter", species: "sheep", color: c.color, size: SHEEP, at: c.start, ...(c.id === "black" ? { recolor: { charcoal: "grey" } } : {}), rotation: [0, c.bale ? -BALE[c.bale][0] * 6 : 0, 0], feeling: "happy" });
}
// The three wool bags of the verse (repainted, while hidden, to each sheep's colour) and the count numbers.
BAGS.forEach((at, i) => objects.push({ id: `bag${i + 1}`, kind: "prop", model: "wool_bag", color: "black", at, size: 1.25, rotation: [0, -10 + i * 10, 0], hidden: true }));
BAGS.forEach((at, i) => objects.push({ id: `n${i + 1}`, kind: "letter", text: String(i + 1), color: "blue", at: [at[0], 1.1, at[2] + 0.1], size: 0.5, hidden: true }));
// Yarn balls for the recap quiz (a row in front, hidden until then).
const YARN_X = [-2.6, -1.3, 0, 1.3, 2.6];
C.forEach((c, i) => { c.yarnAt = [YARN_X[i], 0, 2.7]; objects.push({ id: `yarn_${c.id}`, kind: "prop", model: "yarn_ball", color: c.color, at: c.yarnAt, size: 1.5, rotation: [0, -20, 0], hidden: true }); });
objects.push({ id: "confetti", kind: "confetti", at: [0, 3.2, 1] });
// HUD: five tracker slots with a mini wool bag each, a "?" teasing the surprise colour, the countdown, the word
// bubble with each colour word and a little yarn ball under it.
objects.push(...trackerObjects(5).map((o) => ({ ...o, recolor: { white: "sky" } }))); // a pale card so the white wool shows
C.forEach((c, i) => objects.push({ id: `mini_${c.id}`, kind: "prop", model: "wool_bag", color: c.color, hud: true, parent: `slot${i + 1}`, at: [0, -0.33, 0.3], size: 0.95, hidden: true }));
objects.push({ id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot5", at: [0, -0.26, 0.2], size: 0.42, hidden: true });
objects.push(...countdownObjects());
objects.push({ id: "bubble", kind: "prop", model: "word_bubble", hud: true, at: [5.6, 2.05, 0], size: 1.75, hidden: true });
for (const c of C) {
  objects.push({ id: `w_${c.id}`, kind: "letter", text: c.word, color: c.wc, hud: true, parent: "bubble", at: [0, 0.14, 0.18], size: c.word.length > 5 ? 0.24 : 0.28, hidden: true });
  objects.push({ id: `wy_${c.id}`, kind: "prop", model: "yarn_ball", color: c.color, hud: true, parent: "bubble", at: [0, -0.36, 0.2], size: 0.95, hidden: true });
}

// The word bubble: the colour word and its yarn ball.
const word = (c, at = 0.2) => [
  { do: "pop", target: "bubble", at, dur: 0.35, sound: false },
  { do: "show", target: `w_${c.id}`, at: at + 0.05, dur: 0.25 },
  { do: "pop", target: `wy_${c.id}`, at: at + 0.12, dur: 0.3, sound: false },
];
const unword = (c, at = 0) => [
  { do: "hide", target: `w_${c.id}`, at, dur: 0.2 },
  { do: "hide", target: `wy_${c.id}`, at, dur: 0.2 },
  { do: "hide", target: "bubble", at: at + 0.05, dur: 0.25 },
];
const hop = (target, at, height = 0.25, dur = 0.4) => ({ do: "hop", target, at, height, dur });
const bagsAway = (at = 0.1) => [1, 2, 3].map((n) => ({ do: "hide", target: `bag${n}`, at: at + (n - 1) * 0.08, dur: 0.25 }));
const paintBags = (c, at = 0) => [1, 2, 3].map((n) => ({ do: "paint", target: `bag${n}`, color: c.color, at, dur: 0.1 }));

// ---- The verse -------------------------------------------------------------------------------------------------
const YAW = { black: -12, white: 14, red: -16, blue: 12, yellow: 0 };
function verse(c, { repeat = false, firstBagShown = false, wordUp = false } = {}) {
  const s = name(c);
  const [l1, l2, l3, l4] = c.lines;
  const tBaa = two(c) ? T.baa2 : T.baa, tYes = two(c) ? T.yes2 : T.yes, tLane = c.id === "black" ? T.lane : T.lane11;
  const beats = [
    beat(`${c.id}_s1`, tuneDur(tBaa), sung(l1, tBaa, [
      { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
      { do: "shot", target: [s, "bag2"], framing: "wide", yaw: YAW[c.id], dur: 2.2 },
      { do: "look", target: "robo", at: 0.2, to: s },
      hop(s, onBeat(0)), hop(s, onBeat(1)),
      { do: "feel", target: s, feeling: "joyful", at: onBeat(6) },
      wordUp ? unword(c, onBeat(1)) : null, // the colour word from the reveal
    ])),
    beat(`${c.id}_s2`, tuneDur(tYes), sung(l2, tYes, [
      { do: "nod", target: s, at: onBeat(0) },
      ...K_THREE.map((k, i) => (i === 0 && firstBagShown
        ? { do: "wiggle", target: "bag1", at: onBeat(k), deg: 12, dur: 0.5 }
        : { do: "pop", target: `bag${i + 1}`, at: onBeat(k), dur: 0.35, sound: "pop" })),
      { do: "feel", target: s, feeling: "happy", at: onBeat(4) },
    ])),
    beat(`${c.id}_s3`, tuneDur(T.one), sung(l3, T.one, [
      { do: "shot", target: ["bag1", "bag2", "bag3", s], framing: "medium", yaw: -YAW[c.id] * 0.6, dur: 2.2 },
      hop("bag1", onBeat(K_ONE[0]), 0.3), hop("bag2", onBeat(K_ONE[1]), 0.3),
      { do: "look", target: s, at: 0.2, to: "bag2" },
    ])),
    beat(`${c.id}_s4`, tuneDur(tLane), sung(l4, tLane, [
      hop("bag3", onBeat(K_LANE), 0.3),
      { do: "look", target: s, at: onBeat(2), to: "ahead" },
      { do: "spin", target: s, at: onBeat(4), dur: 1 },
      { do: "camera", ...DEFAULT_CAM, dur: 2.6 },
    ])),
  ];
  if (repeat) {
    beats.push(
      beat(`${c.id}_s5`, tuneDur(tBaa), sung(l1, tBaa, [{ do: "clip", target: "robo", clip: "Dance", at: 0.1 }, hop(s, onBeat(0)), hop(s, onBeat(1)), { do: "orbit", around: [0.4, 0.7, 1.7], degrees: 14, dur: 3 }])),
      beat(`${c.id}_s6`, tuneDur(tYes), sung(l2, tYes, [...K_THREE.map((k, i) => hop(`bag${i + 1}`, onBeat(k), 0.3)), { do: "clip", target: "robo", clip: "Jump", at: onBeat(5) }])),
    );
  }
  return beats;
}

// Count the three bags (with numbers popping over them).
function countBags(c, id) {
  return [
    beat(`${id}_c1`, 2.2, [
      say("How many bags? Let's count!", { at: 0.1 }),
      { do: "shot", target: ["bag1", "bag2", "bag3"], framing: "medium", height: 12, dur: 1.2 },
      { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    ]),
    beat(`${id}_c2`, 3, [
      say("One... two... three!", { at: 0.2 }),
      ...[0, 1, 2].flatMap((i) => [
        { do: "pop", target: `n${i + 1}`, at: 0.3 + i * 0.75, dur: 0.3, sound: "tick" },
        hop(`bag${i + 1}`, 0.3 + i * 0.75, 0.3),
      ]),
    ]),
    beat(`${id}_c3`, 2.4, [
      say(`Three bags of ${c.id} wool! Thank you, ${c.id} sheep!`, { at: 0.1 }),
      { do: "say", who: name(c), text: "Baa!", at: "after" },
      ...[1, 2, 3].map((n) => ({ do: "hide", target: `n${n}`, at: 1.6, dur: 0.2 })),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.5 },
      { do: "camera", ...DEFAULT_CAM, dur: 1.6 },
    ]),
  ];
}

// "Your turn! Say red!", then the bags go and a mini bag fills the tracker.
function turn(c, i, last = false) {
  const beats = yourTurn({ id: c.id, ask: `Your turn! Say ${c.id}!`, answer: `${c.word[0]}${c.word.slice(1).toLowerCase()}!`, praise: c.praise, slot: i + 1, mini: `mini_${c.id}`, look: name(c),
    extra: [...bagsAway(0.1), last ? { do: "hide", target: "qmark", at: 0.05, dur: 0.2 } : null] });
  // The kit's yourTurn pops the plain word bubble; ours carries a yarn ball too, so add it to the ask beat.
  beats[0].do.push(...word(c, 0.3));
  beats[1].do.push({ do: "wiggle", target: "bubble", at: 0.2, deg: 10, dur: 1.6 }, { do: "hop", target: name(c), at: 0.6, height: 0.2 });
  beats[3].do.unshift(...unword(c, 0));
  return beats;
}

// Find the next sheep: "Which colour is next?" — it peeks over the hay bale, the child names the colour, 3-2-1.
const FIND_ASK = { white: "Which colour is next? Look at the hay!", red: "Who is hiding now? Which colour?", blue: "Another sheep! Which colour is next?" };
function find(c, prev) {
  const s = name(c), bale = c.bale === "L" ? "hay_l" : "hay_r";
  const via = [prev.park[0] < 0 ? -3.1 : 3.1, 0, 1.3];
  const out = [c.hide[0] * 0.75, 1.25, 0.55];
  return [
    beat(`${c.id}_f1`, 2.4, [
      { do: "shot", target: bale, framing: "medium", height: 10, pad: 0.9, dur: 1.4 },
      say(FIND_ASK[c.id], { at: 0.2 }),
      { do: "look", target: "robo", at: 0.2, to: bale },
      { do: "path", target: name(prev), points: [FRONT, via, prev.park], dur: 2, face: true },
      { do: "turn", target: name(prev), to: [0, -prev.park[0] * 6, 0], at: 2.05, dur: 0.3 },
      ...paintBags(c, 0.5),
    ]),
    beat(`${c.id}_f2`, 2.4, [
      { do: "move", target: s, to: c.peek, at: 0.1, dur: 0.4, ease: "backOut" },
      { do: "say", who: s, text: "Baa!", at: 0.45 },
      { do: "wiggle", target: s, at: 0.5, deg: 10, dur: 1.2 },
      { do: "sound", sound: "boing", at: 0.1, volume: 0.6 },
    ]),
    beat(`${c.id}_f3`, 2.6, [
      say("Look at the wool! What colour is it?", { at: 0.1 }),
      { do: "clip", target: "robo", clip: "Yes", at: 0.3 },
      { do: "sound", sound: "tick", at: 1.7, volume: 0.5 },
      { do: "move", target: s, to: c.hide, at: 2.1, dur: 0.35 },
    ]),
    beat(`${c.id}_f4`, 2.6, countdown(0.15)),
    beat(`${c.id}_f5`, 2.8, [
      { do: "path", target: s, points: [c.hide, out, FRONT], dur: 0.8 },
      { do: "turn", target: s, to: [0, 0, 0], at: 0.1, dur: 0.5 },
      { do: "sound", sound: "boing", at: 0.05 },
      { do: "sound", sound: "ding", at: 0.8 },
      { do: "burst", target: "confetti", at: 0.85, dur: 2.2, sound: false },
      { do: "feel", target: s, feeling: "joyful", at: 0.85 },
      { do: "shot", target: s, framing: "medium", dur: 0.9 },
      say(`${c.word[0]}${c.word.slice(1).toLowerCase()}! A ${c.id} sheep!`, { at: 1.0, caption: false }),
      { do: "caption", text: c.word, style: "label", at: 1.0, dur: 1.7 },
      { do: "clip", target: "robo", clip: "Jump", at: 0.9 },
      ...word(c, 1.0),
    ]),
  ];
}

// The surprise: the yellow sheep in the barn.
function findBarn(c, prev) {
  const s = name(c);
  return [
    beat(`${c.id}_f1`, 2.8, [
      { do: "path", target: name(prev), points: [FRONT, [3.1, 0, 1.3], prev.park], dur: 2, face: true },
      { do: "turn", target: name(prev), to: [0, -prev.park[0] * 6, 0], at: 2.05, dur: 0.3 },
      { do: "shot", target: "barn", framing: "medium", dur: 1.4 },
      say("Now the surprise colour! Who is in the barn?", { at: 0.2 }),
      { do: "look", target: "robo", at: 0.2, to: "barn" },
      ...C.slice(0, 4).map((x, k) => ({ do: "look", target: name(x), at: 0.6 + k * 0.1, to: "barn" })),
      ...paintBags(c, 0.5),
    ]),
    beat(`${c.id}_f2`, 2.4, [
      { do: "say", who: s, text: "Baa! Baa!", at: 0.3 },
      { do: "wiggle", target: "barn#door_left", at: 0.3, deg: 10, dur: 1.2 }, { do: "wiggle", target: "barn#door_right", at: 0.35, deg: 10, dur: 1.2 },
      { do: "wiggle", target: "slot5", at: 0.5, deg: 12, dur: 1 },
    ]),
    beat(`${c.id}_f3`, 2.2, [say("Which colour is it? Let's open the doors!", { at: 0.1 }), { do: "clip", target: "robo", clip: "Yes", at: 0.3 }]),
    beat(`${c.id}_f4`, 2.6, countdown(0.15)),
    beat(`${c.id}_f5`, 3.6, [
      { do: "turn", target: "barn#door_left", to: [0, -100, 0], at: 0, dur: 0.9, ease: "backOut" },
      { do: "turn", target: "barn#door_right", to: [0, 100, 0], at: 0, dur: 0.9, ease: "backOut" },
      { do: "sound", sound: "door_open", at: 0 },
      { do: "path", target: s, points: [IN_BARN, [0, 0, 0.5], FRONT], dur: 1.6, at: 0.9, face: true },
      ...[0, 1, 2, 3].map((k) => hop(s, 0.95 + k * 0.4, 0.15, 0.38)),
      { do: "turn", target: s, to: [0, 0, 0], at: 2.55, dur: 0.4 },
      { do: "sound", sound: "ding", at: 2.6 },
      { do: "burst", target: "confetti", at: 2.6, dur: 2.4 },
      { do: "feel", target: s, feeling: "joyful", at: 2.6 },
      { do: "shot", target: s, framing: "medium", at: 1.6, dur: 1.4 },
      say("Yellow! A yellow sheep!", { at: 2.7, caption: false }),
      { do: "caption", text: "YELLOW", style: "label", at: 2.7, dur: 1.6 },
      { do: "sound", sound: "crowd_cheer", at: 2.8, volume: 0.5 },
      ...word(c, 2.7),
    ]),
  ];
}

// ---- Scenes ----------------------------------------------------------------------------------------------------
const scenes = [];
const black = C[0];

// 0:00 Hook: the black sheep says "Baa!" and the first wool bag pops; the tracker appears; the fifth is teased.
scenes.push({ id: "hello", title: "Baa!", beats: [
  beat("h1", 2.8, [
    { do: "camera", position: [0, 3.0, 12.5], lookAt: [0, 1.3, -0.5], fov: 40, dur: 0 },
    { do: "camera", ...DEFAULT_CAM, dur: 2.6 },
    { do: "say", who: name(black), text: "Baa!", at: 0.15 },
    hop(name(black), 0.2, 0.35),
    { do: "pop", target: "bag1", at: 0.8, dur: 0.4, sound: "pop" },
    { do: "sound", sound: "sparkle", at: 0.9, volume: 0.6 },
    say("Wool! A bag of black wool!", { at: 1.2 }),
    { do: "clip", target: "robo", clip: "Jump", at: 1.0 },
  ]),
  beat("h2", 2.8, [
    say("Let's fill our bags with colours of wool!", { at: 0.1 }),
    ...showTracker(4, 0.3),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
  beat("h3", 2.8, [
    say("And one colour is a surprise in the barn!", { at: 0.1 }),
    { do: "pop", target: "slot5", at: 0.2, dur: 0.4, sound: "magic_sparkle" }, { do: "pop", target: "qmark", at: 0.4, dur: 0.4, sound: false },
    { do: "shot", target: "barn", framing: "medium", dur: 1.2 },
    { do: "wiggle", target: "barn#door_left", at: 0.9, deg: 9, dur: 0.8 }, { do: "wiggle", target: "barn#door_right", at: 1.0, deg: 9, dur: 0.8 },
    { do: "grow", target: "slot5", to: 1.2, at: 1.4, dur: 0.3 }, { do: "grow", target: "slot5", to: 1, at: 1.8, dur: 0.3 },
  ]),
  beat("h4", 1.8, [say("Sing with me!", { at: 0.1 }), { do: "camera", ...DEFAULT_CAM, dur: 1.2 }, { do: "clip", target: "robo", clip: "Dance", at: 0.2 }]),
]});

// Black: the traditional verse (with its repeat), count the bags, your turn.
scenes.push({ id: "black_song", title: "Sing: the black sheep", music: false, beats: verse(black, { repeat: true, firstBagShown: true }) });
scenes.push({ id: "black_count", title: "Count the bags", beats: countBags(black, "black") });
scenes.push({ id: "black_turn", title: "Say black!", beats: turn(black, 0) });

// White, red, blue behind the bales; yellow in the barn.
C.slice(1).forEach((c, k) => {
  const i = k + 1;
  const prev = C[i - 1];
  scenes.push({ id: `${c.id}_find`, title: i === 4 ? "The surprise in the barn" : "Which colour is next?", beats: c.barn ? findBarn(c, prev) : find(c, prev) });
  scenes.push({ id: `${c.id}_song`, title: `Sing: the ${c.id} sheep`, music: false, beats: verse(c, { wordUp: true }) });
  scenes.push({ id: `${c.id}_turn`, title: `Say ${c.id}!`, beats: turn(c, i, i === 4) });
});

// Recap quiz with yarn balls and sheep.
const yellow = C[4];
const quizBeats = [
  beat("q0", 3, [
    say("All the wool is yarn now! Let's play!", { at: 0.1 }),
    { do: "path", target: name(yellow), points: [FRONT, [-0.4, 0, 0.9], yellow.park], dur: 1.4, face: true },
    { do: "turn", target: name(yellow), to: [0, 0, 0], at: 1.5, dur: 0.4 },
    { do: "camera", position: [0, 2.4, 10.4], lookAt: [0, 0.9, 0.6], fov: 40, dur: 1.4 },
    ...C.map((c, k) => ({ do: "pop", target: `yarn_${c.id}`, at: 0.9 + k * 0.2, dur: 0.35, sound: "pop" })),
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
  ]),
  ...quizRound({ id: "q1", q: "Point to the red wool!", left: "yarn_blue", right: "yarn_red", answer: "yarn_red", yes: "Yes! The red wool!",
    spots: [[-0.9, 0, 3.0], [0.9, 0, 3.0]], back: { yarn_blue: C[3].yarnAt, yarn_red: C[2].yarnAt } }),
  ...quizRound({ id: "q2", q: "Which sheep is yellow? Point to it!", left: "yellow_sheep", right: "white_sheep", answer: "yellow_sheep",
    answerSay: { who: "yellow_sheep", text: "Baa!" }, yes: "Yes! The yellow sheep!",
    spots: [[-1.1, 0, 1.4], [1.1, 0, 1.4]], back: { yellow_sheep: yellow.park, white_sheep: C[1].park } }),
];
scenes.push({ id: "quiz", title: "Point to it!", beats: quizBeats });

// Last chorus with everyone, then bye-bye.
const all = C.map(name);
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("z1", 1.8, [
    say("Everybody sing!", { at: 0.1 }),
    { do: "camera", position: [0, 2.6, 11], lookAt: [0, 1.1, -0.6], fov: 40, dur: 1.6 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    ...all.map((id, k) => ({ do: "feel", target: id, feeling: "joyful", at: 0.3 + k * 0.1 })),
  ]),
  beat("z2", tuneDur(T.baa), sung(black.lines[0], T.baa, [...all.map((id, k) => hop(id, onBeat(k * 1.5), 0.35)), { do: "clip", target: "robo", clip: "Dance", at: 0.1 }])),
  beat("z3", tuneDur(T.yes), sung(black.lines[1], T.yes, [...C.map((c, k) => hop(`yarn_${c.id}`, onBeat(k), 0.3)), { do: "clip", target: "robo", clip: "Jump", at: onBeat(5) }])),
  beat("z4", 3.4, [
    { do: "burst", target: "confetti", at: 0.1, dur: 2.6 },
    say("Black, white, red, blue, and yellow!", { at: 0.2 }),
    ...all.map((id, k) => hop(id, 0.3 + k * 0.5, 0.35)),
    ...[1, 2, 3, 4, 5].map((n, k) => ({ do: "wiggle", target: `slot${n}`, at: 0.3 + k * 0.5, deg: 10, dur: 0.5 })),
  ]),
  beat("z5", 3.4, [
    say("Bye-bye, sheep! Bye-bye, friends!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "say", who: name(black), text: "Baa!", at: 1.8, caption: false },
    ...all.map((id, k) => ({ do: "wiggle", target: id, at: 0.4 + k * 0.1, deg: 8, dur: 1.5 })),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.8, dur: 2.4 },
    { do: "camera", position: [0, 3.6, 14.5], lookAt: [0, 1.5, -1], fov: 40, dur: 3 },
  ]),
]});

// ---- Meta ------------------------------------------------------------------------------------------------------
const description = "Sing Baa Baa Black Sheep with Robo and learn colours! A black sheep says baa and gives three bags of wool, then more sheep are hiding on the farm: look at the wool peeking over the hay, say which colour it is, count down 3, 2, 1 and see them jump out. Sing a verse for every colour, count the three bags, say the colour on your turn and fill up the wool tracker. A surprise colour waits in the barn, then a quick point-to-it quiz with balls of yarn.";
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Baa Baa Black Sheep: Colour Wool", episode: "br02", seed: 302, skills: ["count_to_5_prek", "listening_prek"],
    cast: Object.fromEntries(C.map((c) => [name(c), c.voice])),
    youtube: {
      title: "Baa Baa Black Sheep 🐑 Learn Colours with Wool for Toddlers | Toy Box Friends",
      description: `${description}\n\nColours: black, white, red, blue and yellow, and counting to three ("three bags full").\n\nSing at home: point to something red, blue or yellow in your room after each verse, count three things together, and ask "What colour is it?". Baa Baa Black Sheep is a traditional public-domain rhyme sung to its traditional tune; the white, red, blue and yellow verses are original lyrics written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["baa baa black sheep", "nursery rhymes", "learn colours for toddlers", "colors for kids", "colour song", "counting to 3", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "colours", title: "BAA BAA COLOURS", subtitle: "Sing the wool colours!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "farm",
        camera: { position: [0.3, 1.4, 7.0], lookAt: [0.9, 0.85, -0.2], fov: 36 },
        objects: [
          { id: "barn", kind: "prop", model: "barn", at: [3.4, 0, -3.2] },
          { id: "black", kind: "critter", species: "sheep", color: "black", at: [2.0, 0, 0.3], size: 1.15, rotation: [0, -10, 0], feeling: "joyful" },
          { id: "red", kind: "critter", species: "sheep", color: "red", at: [3.25, 0, -0.5], size: 1.1, rotation: [0, -20, 0], feeling: "happy" },
          { id: "blue", kind: "critter", species: "sheep", color: "blue", at: [4.35, 0, 0.35], size: 1.1, rotation: [0, -30, 0], feeling: "joyful" },
          { id: "bag_y", kind: "prop", model: "wool_bag", color: "yellow", at: [1.35, 0, 1.6], size: 1.0 },
          { id: "bag_w", kind: "prop", model: "wool_bag", color: "white", at: [2.15, 0, 1.75], size: 1.0 },
          { id: "bag_r", kind: "prop", model: "wool_bag", color: "red", at: [2.95, 0, 1.6], size: 1.0 },
        ] },
      { name: "red", title: "WHAT COLOUR?", subtitle: "Three bags full!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "farm",
        camera: { position: [0.7, 1.2, 5.6], lookAt: [1.1, 0.75, 0], fov: 36 },
        objects: [
          { id: "sheep", kind: "critter", species: "sheep", color: "red", at: [1.85, 0, 0.0], size: 1.25, rotation: [0, 5, 0], feeling: "joyful" },
          { id: "bag1", kind: "prop", model: "wool_bag", color: "red", at: [2.85, 0, 0.6], size: 1.0, rotation: [0, -15, 0] },
          { id: "bag2", kind: "prop", model: "wool_bag", color: "red", at: [3.5, 0, 0.2], size: 1.0 },
          { id: "bag3", kind: "prop", model: "wool_bag", color: "red", at: [3.25, 0, 1.1], size: 1.0, rotation: [0, 15, 0] },
          { id: "bubble", kind: "prop", model: "word_bubble", at: [2.95, 1.9, 0.2], size: 0.9 },
          { id: "redw", kind: "letter", text: "RED", color: "red", parent: "bubble", at: [0, -0.1, 0.12], size: 0.24 },
        ] },
    ],
  }),
  stage: { preset: "farm" },
  camera: DEFAULT_CAM,
  objects,
  scenes,
};
writeRhyme(script, "baa_baa_colours");
