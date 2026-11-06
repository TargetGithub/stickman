// Builds ../br17_bingo_clap_along.json: B-I-N-G-O (traditional, public domain: "There was a farmer had a dog, and
// Bingo was his name-o. B-I-N-G-O ×3, and Bingo was his name-o") with the classic letter-dropping verses: six
// verses, and in each new verse one more letter is replaced by a clap. Five wooden letter blocks (B I N G O, five
// colours) stand in the farmyard; before each verse one block flips round to show a CLAP icon ("Which letter is
// hiding?" 3-2-1), its tracker slot turns from the letter into a clap, and Pip the toddler (rhymes_br04.json, clap
// poses from br13) claps where the letter was. Bingo is the catalog dog with a collar. We spell B-I-N-G-O with the
// child, bring the letters back, point to G and sing the first verse again.
// The letter runs are not one sung line: each letter is its own short tuned say (one note) on the tune's beat, and a
// clapped letter is silence in the speech plus a clap sound, Pip's clap and the block's CLAP icon pulsing.
// New models: catalog/models/rhymes_br17.json. Run: node br17.mjs, then node tools/sung_durs.mjs on the JSON,
// then this again (see README.md).
import {
  say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, showTracker, fillSlot, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// The traditional B-I-N-G-O melody (public domain), in C, one note per syllable. Sung lines end in a comma or a
// full stop ("!" slows the TTS).
const T = {
  l1: "G4 C5 C5 G4 G4 A4 A4 G4:2", // There was a far-mer had a dog,
  l2: "G4 C5 C5 D5 D5 E5 C5:2", // and Bin-go was his name-o.
  l4: "C5 B4 G4 A4 B4 C5 C5:2", // and Bin-go was his name-o.
};
const L1 = "There was a farmer had a dog,";
const L2 = "and Bingo was his name-o.";
const L4 = L2; // the same words, a different tune
// The three letter runs: B, I, N, G, O on these notes.
const RUNS = [["E5", "E5", "F5", "F5", "F5"], ["D5", "D5", "E5", "E5", "E5"], ["C5", "C5", "D5", "D5", "D5"]];
const LETTERS = ["B", "I", "N", "G", "O"];
const COLS = ["red", "orange", "green", "blue", "purple"];

// ---- Pip's poses (as br13: absolute degrees on the toddler model) ---------------------------------------------
const ARM_REST = [0, 0, 8];
const POSES = {
  rest: { hip: 0, arm: ARM_REST, fore: [0, 0, 0] },
  clap: { hip: 0, arm: [-44, -55, 4], fore: [-95, -3, 3] },
  open: { hip: 0, arm: [-28, -15, 24], fore: [-120, 2, -5] },
  yay: { hip: -6, arm: [0, 0, 150], fore: [0, 0, 25] },
};
const off = (a) => a.map((v, i) => v - ARM_REST[i]);
const mir = (a) => [a[0], -a[1], -a[2]];
function pose(name, at = 0.1, dur = 0.28) {
  const p = POSES[name];
  return [
    { do: "turn", target: "pip#head", to: [p.hip, 0, 0], at, dur },
    { do: "turn", target: "pip#arm_l", to: off(p.arm), at, dur },
    { do: "turn", target: "pip#fore_l", to: p.fore, at, dur },
    { do: "turn", target: "pip#arm_r", to: mir(off(p.arm)), at, dur },
    { do: "turn", target: "pip#fore_r", to: mir(p.fore), at, dur },
  ];
}
/** Pip claps (hands meet with a wooden clap sound) at t; takes 0.3 s. */
const clapAt = (t, sound = true) => [pose("clap", t, 0.1), sound ? { do: "sound", sound: "block", at: t + 0.08, volume: 0.85 } : null, pose("open", t + 0.15, 0.12)];

// ---- The set ---------------------------------------------------------------------------------------------------
const SZ = 1.2; // letter blocks: 0.6 m cubes
const BX = [-1.6, -0.8, 0, 0.8, 1.6];
const BZ = 0.8;
const blockAt = (k) => [BX[k], 0, BZ];
const PIP = [2.75, 0, 1.1];
const BINGO = [-2.6, 0, 1.25];
const CAM = { position: [-0.1, 2.0, 8.4], lookAt: [-0.1, 1.0, -0.2], fov: 40 };
const BLOCK_CAM = { position: [0.35, 1.3, 5.3], lookAt: [0.35, 0.6, 0.6], fov: 40 };
const RUN_CAMS = [
  BLOCK_CAM,
  { position: [-1.6, 1.15, 4.9], lookAt: [0.3, 0.6, 0.7], fov: 40 },
  { position: [2.2, 1.25, 4.9], lookAt: [0.0, 0.6, 0.7], fov: 40 },
];
const BINGO_CAM = { position: [-2.55, 1.2, 4.7], lookAt: [-2.75, 0.75, 0.6], fov: 40 };
const PIP_CAM = { position: [3.2, 1.3, 4.6], lookAt: [2.3, 0.75, 1.0], fov: 40 };
const VERSE_CAMS = [
  CAM,
  { position: [-3.2, 1.7, 7.4], lookAt: [0.2, 0.9, 0.0], fov: 40 },
  { position: [3.0, 1.8, 7.6], lookAt: [-0.4, 0.9, 0.0], fov: 40 },
  { position: [0.0, 1.0, 6.6], lookAt: [0.0, 1.0, -0.2], fov: 40 },
  { position: [-2.4, 2.4, 7.8], lookAt: [0.3, 0.8, 0.0], fov: 40 },
  { position: [2.4, 1.4, 7.0], lookAt: [-0.2, 0.9, 0.0], fov: 40 },
];

// ---- Objects --------------------------------------------------------------------------------------------------
const objects = [
  { id: "robo", kind: "character", character: "robot", at: [-4.7, 0, -0.7], rotation: [0, 28, 0], feeling: "happy" },
  { id: "barn", kind: "prop", model: "barn", at: [0.2, 0, -2.6], size: 0.95 },
  { id: "hay_l", kind: "prop", model: "hay_bale", at: [-4.9, 0, -1.3], rotation: [0, 12, 0], size: 1.1 },
  { id: "hay_r", kind: "prop", model: "hay_bale", at: [4.3, 0, -1.0], rotation: [0, -14, 0], size: 1.1 },
  { id: "pip", kind: "critter", species: "toddler", at: PIP, rotation: [0, -30, 0], size: 1.05, feeling: "happy" },
  { id: "bingo", kind: "critter", species: "dog", at: BINGO, rotation: [0, 22, 0], size: 0.8, feeling: "happy" },
  { id: "collar", kind: "prop", model: "dog_collar", color: "red", parent: "bingo", part: "head", at: [0, -0.27, -0.03] },
  { id: "confetti", kind: "confetti", at: [0, 3.0, 0.6] },
];
LETTERS.forEach((L, k) => {
  objects.push({ id: `blk${k}`, kind: "prop", model: "letter_block", color: COLS[k], at: blockAt(k), size: SZ, hidden: true });
  objects.push({ id: `blk${k}_l`, kind: "letter", text: L, color: COLS[k], parent: `blk${k}`, at: [0, 0.14, 0.335], size: 0.23 });
  objects.push({ id: `blk${k}_c`, kind: "prop", model: "clap_icon", color: "yellow", parent: `blk${k}`, at: [0, 0.3, 0.372], size: 0.46, hidden: true });
});
// HUD: five letter slots (each letter turns into a clap), the countdown and the word bubble.
objects.push(...trackerObjects(5, { colors: COLS }));
LETTERS.forEach((L, k) => {
  objects.push({ id: `sl${k}`, kind: "letter", text: L, color: COLS[k], hud: true, parent: `slot${k + 1}`, at: [0, -0.27, 0.2], size: 0.42 });
  objects.push({ id: `sc${k}`, kind: "prop", model: "clap_icon", color: "yellow", hud: true, parent: `slot${k + 1}`, at: [0, 0.0, 0.16], size: 0.72, hidden: true });
});
objects.push(...countdownObjects());
objects.push(...bubbleObjects([
  ...LETTERS.map((L, k) => ({ id: L.toLowerCase(), text: L, color: COLS[k] })),
  { id: "clap", text: "CLAP", color: "orange" }, { id: "bingo", text: "BINGO", color: "red" },
]));
for (const L of LETTERS) Object.assign(objects.find((o) => o.id === `w_${L.toLowerCase()}`), { size: 0.62, at: [0, -0.48, 0.18] });

const cast = { pip: { voice: "squeaky", pitch: 1.25, speed: 1 }, bingo: { voice: "squeaky", pitch: 1.05, speed: 1.05 } };
const bingoSay = (text, at = 0.1) => ({ do: "say", who: "bingo", text, at });
const HOP = (id, at, height = 0.25) => ({ do: "hop", target: id, at, height, dur: 0.4 });
const bark = (at, volume = 0.8) => ({ do: "sound", sound: "bark_small", at, volume });

/** Flip block k round (a whole turn) so its letter is swapped for the CLAP icon (or back) while it faces away. */
function flip(k, at, toClap = true, dur = 0.9) {
  const mid = at + dur * 0.5;
  return [
    { do: "spin", target: `blk${k}`, turns: 1, at, dur },
    { do: "sound", sound: "whoosh", at, volume: 0.45 },
    { do: "hide", target: toClap ? `blk${k}_l` : `blk${k}_c`, at: mid - 0.04, dur: 0.04 },
    { do: "show", target: toClap ? `blk${k}_c` : `blk${k}_l`, at: mid, dur: 0.04 },
  ];
}

// ---- Verse pieces -------------------------------------------------------------------------------------------------
const G = 0.6; // one letter per tune beat (a little slower than BEAT: the letter clips are up to 0.58 s)
const RUN_T0 = 0.2; // not 0.1: run beats are not fitted (kit fitSung looks for a sung line at 0.1)
/** One B-I-N-G-O run with the first `claps` letters clapped: letters are short tuned says, claps are silence. */
function runBeat(id, notes, claps, cam, extra = []) {
  const dur = Math.round((RUN_T0 + 4 * G + 0.65) * 100) / 100;
  return beat(id, dur, [
    cam ? { do: "camera", ...cam, dur: 0.6 } : null,
    { do: "caption", text: LETTERS.map((L, k) => (k < claps ? "clap" : L)).join(", "), at: RUN_T0, dur: dur - RUN_T0 - 0.1 },
    LETTERS.map((L, k) => {
      const t = Math.round((RUN_T0 + k * G) * 100) / 100;
      return k < claps
        ? [clapAt(t), { do: "grow", target: `blk${k}_c`, to: 1.25, at: t, dur: 0.12 }, { do: "grow", target: `blk${k}_c`, to: 1, at: t + 0.2, dur: 0.15 },
          { do: "wiggle", target: `slot${k + 1}`, at: t, deg: 10, dur: 0.4 }]
        : [say(`${L},`, { at: t, tune: notes[k], caption: false }), HOP(`blk${k}`, t, 0.18), { do: "wiggle", target: `slot${k + 1}`, at: t, deg: 8, dur: 0.4 }];
    }),
    ...extra,
  ]);
}

/** A whole verse: farmer line, Bingo line, three runs, Bingo line. claps = letters clapped (0-5). */
function verse(v, claps, { title, cam = VERSE_CAMS[v % VERSE_CAMS.length], short = false } = {}) {
  return { id: `verse${v}`, title, music: false, beats: [
    beat(`v${v}_1`, tuneDur(T.l1), sung(L1, T.l1, [
      { do: "camera", ...cam, dur: 0.9 },
      { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
      claps > 0 ? pose("open", 0.2, 0.3) : null,
      HOP("bingo", onBeat(7), 0.3),
    ])),
    beat(`v${v}_2`, tuneDur(T.l2), sung(L2, T.l2, [
      HOP("bingo", onBeat(1), 0.3), HOP("bingo", onBeat(2), 0.2),
      { do: "orbit", around: [-0.4, 0.8, 0.5], degrees: v % 2 ? 10 : -10, dur: 2.6 },
    ])),
    ...(short ? [0] : [0, 1, 2]).map((r) => runBeat(`v${v}_r${r}`, RUNS[r], claps, RUN_CAMS[(r + v) % 3])),
    beat(`v${v}_4`, tuneDur(T.l4), sung(L4, T.l4, [
      { do: "camera", ...cam, dur: 0.9 },
      HOP("bingo", onBeat(1), 0.3),
      { do: "feel", target: "bingo", feeling: "joyful", at: onBeat(1) },
      claps > 0 ? pose("rest", onBeat(4), 0.3) : null,
    ])),
  ]};
}

const CLAP_LINES = [
  "We clap for B! Ready? Clap!",
  "Now clap for B and I! Clap, clap!",
  "Three claps now! Clap, clap, clap!",
  "Four claps! Clap, clap, clap, clap!",
  "All claps! No letters! Clap them all!",
];
const HIDE_LINES = ["Uh-oh! Watch the blocks!", "Look! Another letter flips!", "Flip! Which one now?", "One more! Watch!", "The last letter! Flip!"];
const SAYINGS = { B: "B! B is for Bingo!", I: "I! The letter I!", N: "N! The letter N!", G: "G! The letter G!", O: "O! O is round!" };

/** Round k: block k flips to a clap, "Which letter is hiding?" 3-2-1, the answer, slot k turns into a clap. */
function hideRound(k) {
  const L = LETTERS[k];
  const id = `hide${k}`;
  return { id, title: "Which letter is hiding?", beats: [
    beat(`${id}a`, 3.6, [
      { do: "camera", ...RUN_CAMS[k % 3], dur: 1.0 },
      say(HIDE_LINES[k], { at: 0.1 }),
      flip(k, 1.2),
      pose("rest", 0.2, 0.3),
      say("Which letter is hiding?", { at: "after" }),
      { do: "wiggle", target: `blk${k}`, at: 2.3, deg: 8, dur: 1.2 },
      { do: "look", target: "bingo", at: 1.2, to: `blk${k}` },
    ]),
    beat(`${id}c`, 2.8, [...countdown(0.1), { do: "wiggle", target: `slot${k + 1}`, at: 0.2, deg: 10, dur: 2 }]),
    beat(`${id}d`, 2.8, [
      word(L.toLowerCase(), 0.1),
      { do: "sound", sound: "ding", at: 0.15 },
      say(SAYINGS[L], { at: 0.2 }),
      HOP("bingo", 0.3, 0.3), bark(0.35, 0.6),
      { do: "look", target: "bingo", at: 0.2, to: "ahead" },
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.5 },
    ]),
    beat(`${id}e`, 3.6, [
      unword(L.toLowerCase(), 0.05),
      { do: "camera", ...PIP_CAM, dur: 0.9 },
      say(CLAP_LINES[k], { at: 0.1 }),
      { do: "hide", target: `sl${k}`, at: 0.3, dur: 0.15 },
      fillSlot(k + 1, `sc${k}`, 0.4),
      pose("open", 0.6, 0.3),
      Array.from({ length: k + 1 }, (_, j) => clapAt(1.7 + j * 0.42)),
    ]),
  ]};
}

// ---- Scenes ---------------------------------------------------------------------------------------------------
const scenes = [];

// 0:00 The hook: Bingo barks and a big B pops up.
scenes.push({ id: "hello", title: "Woof! B!", beats: [
  beat("h1", 2.6, [
    { do: "camera", ...BINGO_CAM, dur: 0 },
    bark(0.1), bingoSay("Woof!", 0.15),
    HOP("bingo", 0.15, 0.3),
    { do: "pop", target: "blk0", at: 0.5, dur: 0.4, sound: "magic_sparkle" },
    word("b", 0.6),
    say("B! B for Bingo!", { at: 0.75 }),
    { do: "feel", target: "bingo", feeling: "joyful", at: 0.2 },
  ]),
  beat("h2", 3.4, [
    unword("b", 0.05),
    { do: "camera", ...BLOCK_CAM, dur: 0.8 },
    ...[1, 2, 3, 4].map((k, j) => [
      { do: "pop", target: `blk${k}`, at: 0.4 + j * 0.5, dur: 0.3, sound: "pop" },
      say(`${LETTERS[k]},`, { at: 0.45 + j * 0.5, caption: false }),
    ]),
    { do: "caption", text: "B, I, N, G, O", at: 0.4, dur: 2.8 },
    { do: "wiggle", target: "blk0", at: 0.2, deg: 8, dur: 0.5 },
    { do: "turn", target: "bingo", to: [0, 50, 0], at: 0.3, dur: 0.6 },
  ]),
  beat("h3", 3.0, [
    say("B, I, N, G, O spells Bingo!", { at: 0.1 }),
    word("bingo", 0.3),
    HOP("bingo", 1.6, 0.3), bark(1.65, 0.6),
    { do: "clip", target: "robo", clip: "Jump", at: 0.3 },
  ]),
  beat("h4", 3.2, [
    unword("bingo", 0.05),
    { do: "camera", ...CAM, dur: 1.2 },
    say("This puppy is Bingo. Let's sing and clap!", { at: 0.1 }),
    showTracker(5, 0.5),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
    { do: "turn", target: "bingo", to: [0, 22, 0], at: 0.3, dur: 0.5 },
  ]),
  beat("h5", 3.0, [
    say("The letters will turn into claps. Can you clap?", { at: 0.1 }),
    // tease: the last slot shows a clap for a moment
    { do: "hide", target: "sl4", at: 0.5, dur: 0.15 },
    { do: "pop", target: "sc4", at: 0.6, dur: 0.35, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot5", at: 0.8, deg: 12, dur: 1 },
    clapAt(1.2), clapAt(1.65),
    { do: "hide", target: "sc4", at: 2.4, dur: 0.15 },
    { do: "show", target: "sl4", at: 2.55, dur: 0.2 },
  ]),
]});

// Verse 1: all five letters.
scenes.push(verse(1, 0, { title: "Sing: B-I-N-G-O" }));

// Spell B-I-N-G-O with the child: Robo says a letter, the block hops, a pause to say it back.
scenes.push({ id: "spell", title: "Spell it with me!", beats: [
  beat("sp0", 1.9, [
    { do: "camera", ...BLOCK_CAM, dur: 1.0 },
    say("Spell Bingo with me!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
  ]),
  ...LETTERS.map((L, k) => beat(`sp${k + 1}`, 1.6, [
    say(`${L}!`, { at: 0.1, caption: false }),
    { do: "caption", text: L, style: "label", at: 0.1, dur: 1.4, color: COLS[k] },
    HOP(`blk${k}`, 0.1, 0.3), { do: "grow", target: `blk${k}`, to: 1.12, at: 0.1, dur: 0.2 }, { do: "grow", target: `blk${k}`, to: 1, at: 1.0, dur: 0.3 },
    { do: "wiggle", target: `slot${k + 1}`, at: 0.1, deg: 10, dur: 0.6 },
    { do: "sound", sound: "tick", at: 1.1, volume: 0.4 },
  ])),
  beat("sp6", 3.0, [
    { do: "camera", ...BINGO_CAM, dur: 1.0 },
    say("Yay! B, I, N, G, O. Bingo!", { at: 0.1 }),
    bingoSay("Woof, woof!", "after"),
    HOP("bingo", 1.6, 0.35),
    { do: "feel", target: "bingo", feeling: "joyful", at: 0.3 },
    { do: "sound", sound: "crowd_cheer", at: 0.3, volume: 0.3 },
  ]),
]});

// Verses 2-6: before each, one more block flips to a clap.
for (let k = 0; k < 5; k++) {
  scenes.push(hideRound(k));
  scenes.push(verse(k + 2, k + 1, { title: k === 4 ? "Sing: all claps!" : `Sing: clap for ${LETTERS.slice(0, k + 1).join(", ")}` }));
}

// The letters come back.
scenes.push({ id: "back", title: "Letters, come back!", beats: [
  beat("bk1", 2.6, [
    { do: "camera", ...BLOCK_CAM, dur: 1.0 },
    say("Yay! You clapped them all!", { at: 0.1 }),
    { do: "sound", sound: "crowd_cheer", at: 0.2, volume: 0.35 },
    pose("yay", 0.2, 0.3), { do: "feel", target: "pip", feeling: "joyful", at: 0.2 },
    { do: "clip", target: "robo", clip: "Jump", at: 0.3 },
  ]),
  beat("bk2", 2.0, [say("Letters, come back! Ready?", { at: 0.1 }), pose("rest", 0.2, 0.3)]),
  beat("bk3", 2.6, [
    ...countdown(0.1),
  ]),
  beat("bk4", 3.0, [
    ...LETTERS.map((_, k) => flip(k, 0.1 + k * 0.25, false)),
    { do: "burst", target: "confetti", at: 1.3, dur: 2, sound: false },
    say("B, I, N, G, O!", { at: 1.4 }),
    { do: "sound", sound: "sparkle", at: 1.3, volume: 0.6 },
    HOP("bingo", 1.5, 0.35),
  ]),
]});
// Recap quiz: point to G (N beside it).
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  ...quizRound({ id: "q1", q: "Quick game! Which block is G?", left: "blk2", right: "blk3", answer: "blk3", yes: "Yes! G! G for Bingo!",
    spots: [[-0.55, 0, 2.0], [0.55, 0, 2.0]], back: { blk2: blockAt(2), blk3: blockAt(3) } }),
]});

// The finale: verse one again together, then bye-bye.
scenes.push({ id: "finale_intro", title: "Everybody sing!", beats: [
  beat("f0", 2.6, [
    { do: "camera", ...CAM, dur: 1.0 },
    say("Now all the letters! Sing with Bingo!", { at: 0.1 }),
    ...[1, 2, 3, 4, 5].map((s, k) => ({ do: "wiggle", target: `slot${s}`, at: 0.4 + k * 0.2, deg: 10, dur: 0.5 })),
    { do: "clip", target: "robo", clip: "Dance", at: 0.3 },
  ]),
]});
scenes.push(verse(7, 0, { title: "Sing: B-I-N-G-O again", cam: { position: [0.6, 1.6, 7.2], lookAt: [-0.2, 0.9, 0.0], fov: 40 }, short: true }));
scenes.push({ id: "bye", title: "Bye-bye, Bingo!", beats: [
  beat("z1", 2.6, [
    word("bingo", 0.2),
    say("Hooray! Bingo! You did it!", { at: 0.1 }),
    { do: "burst", target: "confetti", at: 0.3, dur: 2.2 },
    pose("yay", 0.3, 0.3), { do: "feel", target: "pip", feeling: "joyful", at: 0.3 },
    HOP("bingo", 0.4, 0.35), bark(0.45, 0.6),
  ]),
  beat("z2", 3.4, [
    unword("bingo", 0),
    say("Bye-bye, Bingo! Bye-bye!", { at: 0.2 }),
    bingoSay("Woof!", "after"),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    pose("rest", 0.2, 0.3),
    clapAt(1.6, false), clapAt(2.0, false),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.8, dur: 2.4 },
    { do: "camera", position: [-0.1, 2.5, 9.6], lookAt: [-0.1, 1.1, -0.6], fov: 40, dur: 3 },
  ]),
]});

// ---- Meta -----------------------------------------------------------------------------------------------------
const description = "Sing B-I-N-G-O with Robo, Pip and Bingo the puppy, and learn the letters B, I, N, G and O! Five wooden letter blocks stand on the farm. In every new verse one letter hides and we clap instead: which letter is hiding? Three, two, one! Spell Bingo together, clap one, two, three, four, five times, bring the letters back and point to G.";
// A little pyramid of blocks for the thumbnails: B I N on the bottom, G O on top; the first `claps` show CLAP.
const blocksFor = (claps, x0, z, size = 0.85) => LETTERS.flatMap((L, k) => {
  const w = size * 0.5 + 0.03;
  const at = k < 3 ? [x0 + k * w, 0, z] : [x0 + (k - 2.5) * w, size * 0.5, z - 0.02];
  return [
    { id: `b${k}`, kind: "prop", model: "letter_block", color: COLS[k], at, size, rotation: [0, [-6, 4, -3, 5, -4][k], 0] },
    k < claps
      ? { id: `b${k}_c`, kind: "prop", model: "clap_icon", color: "yellow", parent: `b${k}`, at: [0, 0.25 * size, 0.31 * size + 0.04], size: 0.42 * size }
      : { id: `b${k}_l`, kind: "letter", text: L, color: COLS[k], parent: `b${k}`, at: [0, 0.117 * size, 0.28 * size], size: 0.19 * size },
  ];
});
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "B-I-N-G-O Clap Along", episode: "br17", seed: 317,
    skills: ["capital_letters_prek", "ab_patterns_prek", "listening_prek"],
    cast,
    youtube: {
      title: "B-I-N-G-O Clap Along 🐶 Learn the Letters B, I, N, G, O | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: the capital letters B, I, N, G and O, spelling a name letter by letter, and keeping a steady beat by clapping in place of a letter (one more clap each verse).\n\nSing at home: sing the letters slowly and hold up a finger for each one. In each new verse, clap instead of the first letter, then the first two, and so on, until the last verse is all claps. Ask "Which letter is hiding?" before you start the next verse. B-I-N-G-O is a traditional public-domain song with its traditional tune; the story, the letter blocks game and the spoken lines are original, written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["bingo", "bingo song", "b i n g o", "bingo was his name o", "nursery rhymes", "clapping song", "abc for toddlers", "letters for toddlers", "spelling song", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "bingo", title: "B-I-N-G-O!", subtitle: "Clap along with Bingo!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "farm",
        camera: { position: [2.7, 1.2, 5.2], lookAt: [2.7, 0.6, 0.6], fov: 36 },
        objects: [
          ...blocksFor(0, 3.3, 0.6),
          { id: "bingo", kind: "critter", species: "dog", at: [4.65, 0, 1.3], size: 0.72, rotation: [0, -30, 0], feeling: "joyful" },
          { id: "collar", kind: "prop", model: "dog_collar", color: "red", parent: "bingo", part: "head", at: [0, -0.27, -0.03] },
        ] },
      { name: "hiding", title: "WHICH LETTER?", subtitle: "Clap for the hiding letters!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "farm",
        camera: { position: [2.7, 1.2, 5.2], lookAt: [2.7, 0.6, 0.6], fov: 36 },
        objects: [
          ...blocksFor(2, 3.3, 0.6),
          { id: "pip", kind: "critter", species: "toddler_hands_on_head", at: [4.5, 0, 1.2], size: 0.8, rotation: [0, -35, 0], feeling: "joyful" },
          { id: "clap", kind: "prop", model: "clap_icon", color: "yellow", at: [3.75, 1.5, 0.5], size: 0.4 },
        ] },
    ],
  }),
  stage: { preset: "farm" },
  camera: CAM,
  objects,
  scenes,
};

writeRhyme(script, "bingo_clap_along");
