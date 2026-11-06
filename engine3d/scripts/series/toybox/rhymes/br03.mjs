// Builds ../br03_five_little_ducks.json: Five Little Ducks Go Splash (original lyrics and an original tune, not
// the modern "Five Little Ducks" song). Counting down 5 to 0: one duck at a time swims off to play behind the
// reeds, the tracker empties and a finger folds; Mother Duck calls and all five come back.
// Run: node br03.mjs (then tools/sung_durs.mjs on the json, and this again).
import {
  DEFAULT_CAM, say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects,
  word, unword, yourTurn, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// Original tune in C major, 4/4 at 112 (one note per syllable; ":2" two beats, ":0.5" half a beat).
const T = {
  splash: "C4 C4:0.5 D4:0.5 E4 G4 C5 C5 G4:2", //           Five lit-tle ducks go splash, splash, splash,
  paddle: "A4:0.5 A4:0.5 G4:0.5 G4:0.5 E4 G4:0.5 G4:0.5 F4 E4:0.5 D4:0.5 C4:2", // Pad-dle in the pond with a dip and a dash.
  off: "E4 E4:0.5 F4:0.5 G4 G4 A4 B4 C5:2", //               One lit-tle duck swam off to play,
  now: "C5:0.5 A4:0.5 G4 E4 G4 D4:0.5 D4:0.5 E4 C4:2", //   Now four lit-tle ducks, hip hip hoo-ray!
  mother: "G4:0.5 G4:0.5 A4 G4 C5 C5 C5:2", //              Moth-er Duck called, "Quack, quack, quack!"
  back: "G4:0.5 A4:0.5 G4 E4 G4 D4:0.5 E4:0.5 D4 C4:2", //  And five lit-tle ducks came swim-ming back!
};
const L = {
  splash: (n) => `${n} little ${n === "One" ? "duck goes" : "ducks go"} splash, splash, splash,`,
  paddle: "Paddle in the pond with a dip and a dash.",
  off: "One little duck swam off to play,",
  now: (n) => (n === "no" ? "Now no little ducks... where did they go?" : `Now ${n} little ${n === "one" ? "duck" : "ducks"}, hip hip hooray!`),
  mother: "Mother Duck called, quack, quack, quack!",
  back: "And five little ducks came swimming back!",
};
const NUM = ["zero", "one", "two", "three", "four", "five"];
const Cap = (s) => s[0].toUpperCase() + s.slice(1);
const FINGERS = ["thumb", "index", "middle", "ring", "pinky"]; // finger k+1 is up while the count is > k

// The pond: a pool of water in the teaching area (in front of the stage's own pond), reeds left and right.
const FLOAT = -0.12; // a floating duck sinks a little, so the water line is on its body
const HIDE_Y = -1.35; // sunk below the floor behind the reeds: out of sight
const REEDS = { L: [-3.45, 0, -1.65], R: [3.45, 0, -1.65] };
const behind = (s) => [REEDS[s][0], FLOAT, REEDS[s][2] - 0.55];
const sunk = (s) => [REEDS[s][0], HIDE_Y, REEDS[s][2] - 0.55];
const peekAt = (s) => [REEDS[s][0] * 0.7, FLOAT, REEDS[s][2] - 0.15];
const ROW = [-2.4, -1.2, 0, 1.2, 2.4];
const rowAt = (i) => [ROW[i], FLOAT, -0.45 + (i % 2) * 0.25];
const MOTHER = [4.35, 0, 1.25];
const ROBO = [-4.45, 0, 1.3];

const D = [1, 2, 3, 4, 5].map((n, i) => ({ id: `duck${n}`, i, side: ROW[i] < 0 ? "L" : "R" }));
const LEAVE = [D[4], D[0], D[3], D[1], D[2]]; // who swims off in the verses for 5, 4, 3, 2, 1
const PEEK = new Set([4, 2]); // verses with a peekaboo round (verse 1 ends in the "where did they go?" moment)

const objects = [
  { id: "pool_bank", kind: "shape", shape: "disc", color: "sand", material: "matte", at: [0, 0.003, -0.7], scale: [11, 0.03, 5.4] },
  { id: "pool", kind: "shape", shape: "disc", color: "pond", material: "glossy", at: [0, 0.006, -0.7], scale: [10, 0.04, 4.6] },
  { id: "pad_a", kind: "prop", model: "lily_pad", at: [-1.8, 0.012, -1.75], size: 1.1, rotation: [0, 30, 0] },
  { id: "pad_b", kind: "prop", model: "lily_pad", at: [1.75, 0.012, 0.95], size: 0.9, rotation: [0, -50, 0] },
  { id: "reeds_l", kind: "prop", model: "pond_reeds", at: REEDS.L, rotation: [0, 12, 0] },
  { id: "reeds_r", kind: "prop", model: "pond_reeds", at: REEDS.R, rotation: [0, -12, 0] },
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, 35, 0], feeling: "happy" },
  { id: "mother", kind: "critter", species: "duck", color: "white", size: 1.4, at: MOTHER, rotation: [0, -38, 0], feeling: "happy" },
];
for (const d of D) {
  objects.push({ id: d.id, kind: "critter", species: "duck", size: 0.8, at: rowAt(d.i), rotation: [0, d.i < 2 ? 12 : d.i > 2 ? -12 : 0, 0], hidden: true });
  objects.push({ id: `rip_${d.id}`, kind: "prop", model: "splash_ripples", parent: d.id, at: [0, 0.13, 0], size: 0.9, hidden: true });
}
objects.push({ id: "confetti", kind: "confetti", at: [0, 3.2, 1] });
// HUD: five duck slots (top left), the counting hand (bottom right), the 3-2-1 countdown and the number bubble.
objects.push(...trackerObjects(5));
D.forEach((d, i) => objects.push({ id: `mini${i + 1}`, kind: "critter", species: "duck", hud: true, parent: `slot${i + 1}`, at: [0, -0.4, 0.3], size: 0.46, hidden: true, rotation: [0, -12, 0] }));
objects.push({ id: "fingers", kind: "prop", model: "hand", hud: true, at: [7.05, -3.35, 0.5], size: 1.65, hidden: true });
objects.push(...countdownObjects());
const bubble = bubbleObjects(NUM.map((w, n) => ({ id: `n${n}`, text: String(n), color: "orange" })));
for (const o of bubble) if (o.kind === "letter") o.size = 0.62, o.at = [0, -0.42, 0.18];
objects.push(...bubble);

const cast = { mother: { voice: "soft", pitch: 0.9, speed: 0.92 } };
D.forEach((d, i) => (cast[d.id] = { voice: "squeaky", pitch: [1.0, 1.15, 1.3, 1.1, 1.2][i], speed: 1.05 }));

// ---- helpers ---------------------------------------------------------------------------------------------------
const splash = (id, at, sound = "splash") => [
  { do: "pop", target: `rip_${id}`, at, dur: 0.3, sound },
  { do: "grow", target: `rip_${id}`, to: 1.5, at: at + 0.25, dur: 0.5 },
  { do: "hide", target: `rip_${id}`, at: at + 0.7, dur: 0.25 },
];
const fold = (k, at, dur = 0.35) => ({ do: "turn", target: `fingers#${FINGERS[k]}`, to: [80, 0, 0], at, dur });
const unfold = (k, at, dur = 0.35) => ({ do: "turn", target: `fingers#${FINGERS[k]}`, to: [0, 0, 0], at, dur });
/** Robo counts the given ducks ("One, two, three!"), each hopping with a pop on its number. */
const countLine = (ducks, at0 = 0.2, gap = 0.62) => [
  say(`${ducks.map((_, k) => Cap(NUM[k + 1])).join(", ")}!`, { at: at0 }),
  ...ducks.flatMap((d, k) => [{ do: "hop", target: d.id, at: at0 + 0.15 + k * gap, height: 0.3, sound: "pop" }, { do: "feel", target: d.id, feeling: "joyful", at: at0 + 0.15 + k * gap }]),
];

const scenes = [];

// 0:00 The hook: five ducks splash into the pond one after another, "Count with me!", the tracker fills.
scenes.push({ id: "hello", title: "Splash! Count with me", beats: [
  beat("h1", 3.2, [
    { do: "camera", position: [0, 3.2, 12.5], lookAt: [0, 1.0, -0.8], fov: 40, dur: 0 },
    { do: "camera", ...DEFAULT_CAM, dur: 3.0 },
    D.map((d, k) => [{ do: "drop", target: d.id, to: rowAt(d.i), height: 3.5, at: 0.1 + k * 0.35, dur: 0.7, sound: false }, ...splash(d.id, 0.75 + k * 0.35, k % 2 ? false : "splash")]),
    say("Splash! Five little ducks! Count with me!", { at: 0.3 }),
    { do: "clip", target: "robo", clip: "Jump", at: 0.2 },
  ]),
  beat("h2", 3.4, [
    countLine(D, 0.15, 0.6),
    D.map((d, k) => [{ do: "pop", target: `slot${k + 1}`, at: 0.3 + k * 0.6, dur: 0.3, sound: false }, { do: "pop", target: `mini${k + 1}`, at: 0.4 + k * 0.6, dur: 0.35, sound: false }]),
    { do: "clip", target: "robo", clip: "Yes", at: 0.3 },
  ]),
  beat("h3", 2.8, [
    say("And Mother Duck is watching! Quack!", { at: 0.1 }),
    { do: "shot", target: ["mother", "duck5"], framing: "medium", yaw: -12, dur: 1.2 },
    { do: "nod", target: "mother", at: 0.9 }, { do: "wiggle", target: "mother", at: 1.4, deg: 8, dur: 0.8 },
    { do: "say", who: "mother", text: "Quack!", at: "after" },
  ]),
]});

// One verse per count: count and fingers, the sung verse (a duck swims off to play), peekaboo, your turn.
const shotYaw = [0, -16, 14, -10, 18];
LEAVE.forEach((leaver, v) => {
  const n = 5 - v; // ducks at the start of this verse
  const present = D.filter((d) => !LEAVE.slice(0, v).includes(d)).sort((a, b) => a.i - b.i);
  const left = present.filter((d) => d !== leaver);
  const nextWord = n - 1 === 0 ? "no" : NUM[n - 1];

  // Count the ducks (verse 5 was counted in the hook), then hold up n fingers.
  const countBeats = [];
  if (n < 5) countBeats.push(
    beat(`c${n}a`, 1.3 + n * 0.62 + 1.4, [
      say(["", "Count with me!", "Let's count!", "Count again!", "Let's count!"][n], { at: 0.1 }),
      { do: "shot", target: present.map((d) => d.id), framing: "wide", yaw: shotYaw[v], height: 14, dur: 1.2 },
      { do: "look", target: "robo", at: 0.2, to: present[Math.floor(present.length / 2)].id },
      countLine(present, 1.3),
      ...word(`n${n}`, 1.45 + (n - 1) * 0.62),
      say(`${Cap(NUM[n])} little ${n === 1 ? "duck" : "ducks"}!`, { at: "after" }),
      { do: "look", target: "robo", at: 1.4 + n * 0.62, to: "ahead" },
    ]),
  );
  else countBeats.push(
    beat(`c${n}c`, 2.6, [
      say("Five little ducks! Hold up five fingers!", { at: 0.1 }),
      ...word(`n${n}`, 0.2),
      { do: "pop", target: "fingers", at: 0.4, dur: 0.4, sound: "pop" },
      { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
      { do: "look", target: "robo", at: 0.2, to: [0, 1.6, 9] },
    ]),
    beat(`c${n}d`, 2.0, [
      { do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.0, volume: 0.5 },
      { do: "wiggle", target: "fingers", at: 0.2, deg: 10, dur: 1.4 },
      say("Five fingers! Great!", { at: 1.1 }),
      { do: "look", target: "robo", at: 1.4, to: "ahead" },
    ]),
  );
  scenes.push({ id: `count${n}`, title: `${Cap(NUM[n])} little ducks`, beats: countBeats });

  // The sung verse.
  const s = leaver.side;
  const sideReeds = s === "L" ? "reeds_l" : "reeds_r";
  scenes.push({ id: `song${n}`, title: `Sing: ${NUM[n]} little ducks`, music: false, beats: [
    beat(`s${n}a`, tuneDur(T.splash), sung(L.splash(Cap(NUM[n])), T.splash, [
      ...unword(`n${n}`, 0.05),
      { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
      { do: "shot", target: present.map((d) => d.id), framing: "wide", yaw: -shotYaw[v], height: 10, dur: 2 },
      ...[5, 6, 7].flatMap((k, j) => present.map((d, q) => ({ do: "hop", target: d.id, at: onBeat(k) + q * 0.04, height: 0.22, dur: 0.38 })).concat(splash(present[(j * 2) % present.length].id, onBeat(k) + 0.05, j === 0 ? "splash" : false))),
    ])),
    beat(`s${n}b`, tuneDur(T.paddle), sung(L.paddle, T.paddle, [
      ...present.map((d, q) => ({ do: "turn", target: d.id, to: [0, q % 2 ? 30 : -30, 0], at: onBeat(0.5), dur: 0.5 })),
      ...present.map((d, q) => ({ do: "turn", target: d.id, to: [0, q % 2 ? -30 : 30, 0], at: onBeat(3), dur: 0.5 })),
      ...present.map((d) => ({ do: "wiggle", target: d.id, at: onBeat(5), deg: 10, dur: 0.8 })),
      ...present.map((d) => ({ do: "turn", target: d.id, to: [0, 0, 0], at: onBeat(6.5), dur: 0.5 })),
      { do: "orbit", around: [0, 0.6, -0.3], degrees: v % 2 ? -16 : 16, dur: 4 },
    ])),
    beat(`s${n}c`, tuneDur(T.off), sung(L.off, T.off, [
      { do: "camera", ...DEFAULT_CAM, dur: 1.2 },
      { do: "hop", target: leaver.id, at: onBeat(0), height: 0.3, dur: 0.4 },
      { do: "feel", target: leaver.id, feeling: "joyful", at: onBeat(0) },
      { do: "path", target: leaver.id, points: [rowAt(leaver.i), [(rowAt(leaver.i)[0] + behind(s)[0]) / 2, FLOAT, -0.6], peekAt(s), behind(s)], dur: onBeat(6.5) - onBeat(1), at: onBeat(1), face: true },
      { do: "look", target: "mother", at: onBeat(1.5), to: leaver.id },
      { do: "nod", target: "mother", at: onBeat(3) },
      { do: "look", target: "robo", at: onBeat(1.5), to: sideReeds },
      ...left.map((d) => ({ do: "look", target: d.id, at: onBeat(2), to: sideReeds })),
    ])),
    beat(`s${n}d`, tuneDur(T.now), sung(L.now(nextWord), T.now, [
      { do: "wiggle", target: `${sideReeds}#reed_tall`, at: 0.2, deg: 8, dur: 0.8 },
      ...left.map((d) => ({ do: "look", target: d.id, at: 0.2, to: "ahead" })),
      { do: "look", target: "mother", at: 0.3, to: "ahead" },
      { do: "look", target: "robo", at: 0.3, to: "ahead" },
      n > 1 ? left.flatMap((d) => [{ do: "hop", target: d.id, at: onBeat(5), height: 0.3, dur: 0.4 }, { do: "hop", target: d.id, at: onBeat(6), height: 0.3, dur: 0.4 }]) : [
        { do: "feel", target: "robo", feeling: "surprised", at: onBeat(5) }, { do: "clip", target: "robo", clip: "Yes", at: onBeat(5) },
      ],
      n > 1 ? { do: "clip", target: "robo", clip: "Jump", at: onBeat(6) } : null,
    ])),
  ]});

  // Peekaboo: where did one go? The duck pops out beside the reeds and goes back to play.
  if (PEEK.has(n)) scenes.push({ id: `peek${n}`, title: "Where did one go? Peekaboo!", beats: [
    beat(`p${n}a`, 2.4, [
      say("Where did one go?", { at: 0.15 }),
      { do: "move", target: leaver.id, to: sunk(s), at: 0.05, dur: 0.3 },
      { do: "shot", target: sideReeds, framing: "medium", yaw: s === "L" ? 22 : -22, height: 16, pad: 0.35, dur: 1.2 },
      { do: "look", target: "robo", at: 0.2, to: sideReeds }, { do: "clip", target: "robo", clip: "Yes", at: 0.3 },
    ]),
    beat(`p${n}b`, 2.4, [
      say("Shh... let's say peekaboo!", { at: 0.1 }),
      { do: "wiggle", target: `${sideReeds}#reed_tall`, at: 0.4, deg: 10, dur: 1.2 },
      { do: "sound", sound: "tick", at: 1.4, volume: 0.5 },
    ]),
    beat(`p${n}c`, 2.8, [
      say("Peekaboo!", { at: 0.05, caption: false }),
      { do: "turn", target: leaver.id, to: [0, s === "L" ? 25 : -25, 0], at: 0.3, dur: 0.2 },
      { do: "path", target: leaver.id, points: [sunk(s), behind(s), peekAt(s)], at: 0.45, dur: 0.5 },
      ...splash(leaver.id, 0.9),
      { do: "feel", target: leaver.id, feeling: "joyful", at: 0.9 },
      { do: "say", who: leaver.id, text: "Peekaboo! I'm playing hide and seek!", at: 1.0 },
      { do: "caption", text: "PEEKABOO!", style: "label", at: 0.95, dur: 1.6 },
      { do: "look", target: leaver.id, at: 0.9, to: [0, 1.6, 9] },
    ]),
    beat(`p${n}d`, 2.4, [
      say("There you are! Have fun playing, little duck!", { at: 0.1 }),
      { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
      { do: "path", target: leaver.id, points: [peekAt(s), behind(s), sunk(s)], at: 1.3, dur: 0.8 },
      { do: "camera", ...DEFAULT_CAM, at: 0.8, dur: 1.4 },
    ]),
  ]});

  // Your turn: how many now? Fold one finger, the tracker slot empties.
  const turn = yourTurn({
    id: `turn${n}`,
    ask: n - 1 === 0 ? "How many ducks now?" : `How many ducks now? Hold up ${NUM[n - 1]} fingers!`,
    answer: n - 1 === 0 ? "Zero! No little ducks!" : `${Cap(NUM[n - 1])}!`,
    praise: ["Yes! Zero! Make a little fist!", "Yes! Just one!", "Good counting!", "That's right!", "Yes! Well done!"][n - 1],
    wordId: `n${n - 1}`,
    look: "robo",
    extra: [{ do: "hide", target: `mini${n}`, at: 0.2, dur: 0.35 }, { do: "wiggle", target: `slot${n}`, at: 0.3, deg: 10, dur: 0.8 }, { do: "sound", sound: "whoosh", at: 0.2, volume: 0.4 }],
  });
  if (!PEEK.has(n)) turn[0].do.push({ do: "move", target: leaver.id, to: sunk(s), at: 0.05, dur: 0.3 });
  turn[0].do.push(fold(n - 1, 0.9), { do: "sound", sound: "squeak", at: 0.9, volume: 0.4 });
  if (n === 1) turn[2].do.push({ do: "feel", target: "robo", feeling: "happy", at: 0.1 });
  scenes.push({ id: `turn${n}`, title: `How many now?`, beats: turn });
});

// Zero: Mother Duck calls, the child helps, and all five come back counting up.
const RETURN = [D[0], D[1], D[2], D[3], D[4]];
scenes.push({ id: "mother", title: "Mother Duck calls", beats: [
  beat("m1", 2.6, [
    say("Oh! The pond is empty! Who can call the ducks?", { at: 0.1 }),
    { do: "shot", target: ["reeds_l", "reeds_r"], framing: "wide", height: 12, dur: 1.4 },
    { do: "look", target: "robo", at: 0.2, to: "reeds_r" },
  ]),
  beat("m2", 2.8, [
    say("Mother Duck can!", { at: 0.1 }),
    { do: "path", target: "mother", points: [MOTHER, [3.6, 0, 1.75], [2.7, 0, 2.2]], at: 0.3, dur: 1.6, face: true },
    { do: "turn", target: "mother", to: [0, -10, 0], at: 2.0, dur: 0.4 },
    { do: "shot", target: "mother", framing: "medium", yaw: -10, at: 0.6, dur: 1.4 },
    { do: "feel", target: "mother", feeling: "joyful", at: 1.2 },
  ]),
]});
scenes.push({ id: "call", title: "Quack, quack, quack!", music: false, beats: [
  beat("k1", tuneDur(T.mother), sung(L.mother, T.mother, [
    ...[4, 5, 6].map((k) => ({ do: "hop", target: "mother", at: onBeat(k), height: 0.2, dur: 0.38 })),
    { do: "wiggle", target: "mother", at: onBeat(3), deg: 10, dur: 1.4 },
  ])),
  beat("k2", 2.4, [
    { do: "say", who: "mother", text: "Quack, quack, quack! Come back, little ducks!", at: 0.1 },
    { do: "nod", target: "mother", at: 0.3 },
  ]),
  beat("k3", 2.4, [
    say("Help her call! Say quack, quack!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "camera", ...DEFAULT_CAM, dur: 1.2 },
  ]),
  beat("k4", 2.0, [
    { do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.0, volume: 0.5 },
    { do: "wiggle", target: "reeds_l#reed_tall", at: 0.3, deg: 10, dur: 1.2 }, { do: "wiggle", target: "reeds_r#reed_tall", at: 0.5, deg: 10, dur: 1.2 },
  ]),
  beat("k5", 5.3, [
    say("Here they come! One, two, three, four, five!", { at: 0.1 }),
    RETURN.map((d, k) => [
      { do: "path", target: d.id, points: [sunk(d.side), behind(d.side), peekAt(d.side), rowAt(d.i)], at: 0.9 + k * 0.62, dur: 1.4 },
      ...splash(d.id, 1.05 + k * 0.62, k % 2 ? false : "splash"),
      { do: "pop", target: `mini${k + 1}`, at: 1.0 + k * 0.62, dur: 0.35, sound: "ding" },
      unfold(k, 1.0 + k * 0.62),
      { do: "feel", target: d.id, feeling: "joyful", at: 1.3 + k * 0.62 },
      { do: "turn", target: d.id, to: [0, 0, 0], at: 2.4 + k * 0.62, dur: 0.4 },
    ]),
    { do: "turn", target: "mother", to: [0, -30, 0], at: 0.3, dur: 0.5 },
  ]),
  beat("k6", tuneDur(T.back), sung(L.back, T.back, [
    ...D.map((d, k) => ({ do: "hop", target: d.id, at: onBeat(1) + k * 0.12, height: 0.3, dur: 0.4 })),
    ...word("n5", 0.2),
    { do: "burst", target: "confetti", at: onBeat(6), dur: 2.2, sound: false },
    { do: "sound", sound: "crowd_cheer", at: onBeat(6), volume: 0.45 },
    { do: "clip", target: "robo", clip: "Jump", at: onBeat(5) },
  ])),
  beat("k7", 2.6, [
    ...unword("n5", 0),
    say("Hooray! Five little ducks, back with Mother Duck!", { at: 0.1 }),
    { do: "shot", target: ["mother", "duck3", "duck5"], framing: "wide", yaw: -14, dur: 1.4 },
    ...D.map((d, k) => ({ do: "wiggle", target: d.id, at: 0.3 + k * 0.15, deg: 10, dur: 0.8 })),
  ]),
]});

// Recap: a fast countdown on the fingers, then a point-to-it quiz (big Mother Duck or a little duck).
const MQ = [2.7, 0, 2.2];
scenes.push({ id: "quiz", title: "Count down fast!", beats: [
  beat("q1", 2.4, [
    say("Now count down fast with me!", { at: 0.1 }),
    { do: "camera", ...DEFAULT_CAM, dur: 1.2 },
    { do: "wiggle", target: "fingers", at: 0.4, deg: 10, dur: 1 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
  ]),
  beat("q2", 4.4, [
    say("Five, four, three, two, one, zero!", { at: 0.15 }),
    ...[4, 3, 2, 1, 0].flatMap((k, j) => [fold(k, 0.75 + j * 0.62, 0.25), { do: "hop", target: D[4 - j].id, at: 0.75 + j * 0.62, height: 0.3, sound: "pop" }]),
    { do: "pop", target: "bubble", at: 3.8, dur: 0.3, sound: false }, { do: "show", target: "w_n0", at: 3.85, dur: 0.25 },
  ]),
  beat("q3", 2.6, [
    say("Zero! Now open up: five again!", { at: 0.1 }),
    ...[0, 1, 2, 3, 4].map((k) => unfold(k, 1.0 + k * 0.12, 0.3)),
    ...unword("n0", 0.8),
    { do: "pop", target: "w_n5", at: 1.4, dur: 0.3, sound: false }, { do: "pop", target: "bubble", at: 1.35, dur: 0.3, sound: false },
    ...D.map((d, k) => ({ do: "hop", target: d.id, at: 1.2 + k * 0.1, height: 0.3 })),
  ]),
  beat("q4", 1.0, [...unword("n5", 0.1), { do: "hide", target: "fingers", at: 0.3, dur: 0.3 }]),
  ...quizRound({
    id: "qa", q: "Which one is Mother Duck? Point to her!", left: "duck3", right: "mother", answer: "mother",
    spots: [[-1.15, 0, 2.3], [1.15, 0, 2.3]], back: { duck3: rowAt(2), mother: MQ },
    answerSay: { who: "mother", text: "Quack! That's me!" }, yes: "Yes! Big Mother Duck!",
  }),
]});

// Last chorus with everyone, then bye-bye.
scenes.push({ id: "finale", title: "Everybody splash!", music: false, beats: [
  beat("z0", 2.0, [say("Everybody sing!", { at: 0.1 }), { do: "camera", position: [0, 2.7, 11], lookAt: [0, 1.1, -0.6], fov: 40, dur: 1.8 }, { do: "clip", target: "robo", clip: "Dance", at: 0.1 }]),
  beat("z1", tuneDur(T.splash), sung(L.splash("Five"), T.splash, [
    ...[5, 6, 7].flatMap((k, j) => D.map((d, q) => ({ do: "hop", target: d.id, at: onBeat(k) + q * 0.04, height: 0.25, dur: 0.38 })).concat(splash(D[j * 2].id, onBeat(k) + 0.05, "splash"))),
    { do: "hop", target: "mother", at: onBeat(6), height: 0.25 },
  ])),
  beat("z2", tuneDur(T.paddle), sung(L.paddle, T.paddle, [
    ...D.map((d) => ({ do: "wiggle", target: d.id, at: onBeat(1), deg: 10, dur: 1 })),
    { do: "orbit", around: [0, 0.6, 0], degrees: 14, dur: 4 },
    { do: "burst", target: "confetti", at: onBeat(6), dur: 2.4, sound: false },
  ])),
  beat("z3", 3.2, [
    say("Bye-bye, little ducks! See you at the pond!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "say", who: "mother", text: "Quack! Bye-bye!", at: "after" },
    ...D.map((d, k) => ({ do: "wiggle", target: d.id, at: 0.4 + k * 0.1, deg: 8, dur: 1.5 })),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.4 },
    { do: "camera", position: [0, 3.6, 14], lookAt: [0, 1.3, -1], fov: 40, dur: 3 },
  ]),
]});

const description = "Count down from 5 to 0 with Robo and five little ducks! The ducks splash into the pond, then one by one each little duck swims off to play hide and seek behind the reeds. Count the ducks, hold up your fingers, say peekaboo when a duck pops out, and watch the duck tracker empty. When the pond is empty, Mother Duck calls \"Quack, quack, quack!\" and all five ducks come swimming back. Then a fast countdown and a point-to-it game.";
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Five Little Ducks Go Splash", episode: "br03", seed: 303, skills: ["count_to_5_prek", "number_order_prek"], cast,
    youtube: {
      title: "Five Little Ducks Go Splash 🦆 Count Down 5 to 0 for Toddlers | Toy Box Friends",
      description: `${description}\n\nYour child learns: counting down 5, 4, 3, 2, 1, 0; how many are left when one goes away; showing a number on their fingers; zero means none.\n\nSing at home: hold up five fingers and fold one down for each little duck that swims off to play, then count them all back up when Mother Duck calls. The lyrics and the tune are original, written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["five little ducks", "counting down for toddlers", "count down from 5", "number songs", "nursery rhymes", "baby songs", "toddler learning", "counting songs for kids", "finger counting", "peekaboo", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "ducks", title: "FIVE LITTLE DUCKS", subtitle: "Count down 5 to 0!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "pond",
        camera: { position: [0.5, 1.7, 7.8], lookAt: [1.05, 0.6, -0.4], fov: 36 },
        objects: [
          { id: "pool", kind: "shape", shape: "disc", color: "pond", material: "glossy", at: [2.2, 0.006, -0.6], scale: [8, 0.04, 4.2] },
          { id: "reeds", kind: "prop", model: "pond_reeds", at: [4.6, 0, -1.6], rotation: [0, -15, 0] },
          { id: "mother", kind: "critter", species: "duck", color: "white", size: 1.35, at: [3.75, 0, 0.75], rotation: [0, -30, 0], feeling: "joyful" },
          ...[[1.0, -0.6], [1.75, 0.15], [2.5, -0.55], [3.1, 1.2], [2.25, 1.0]].map(([x, z], k) => ({ id: `d${k}`, kind: "critter", species: "duck", size: 0.75, at: [x, -0.1, z], rotation: [0, -10 - k * 4, 0], feeling: k % 2 ? "happy" : "joyful" })),
          { id: "rip", kind: "prop", model: "splash_ripples", at: [1.75, 0.03, 0.15], size: 1 },
        ] },
      { name: "peekaboo", title: "PEEKABOO DUCK!", subtitle: "Count with me!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "pond",
        camera: { position: [1.6, 1.25, 5.2], lookAt: [2.0, 0.75, -0.2], fov: 36 },
        objects: [
          { id: "pool", kind: "shape", shape: "disc", color: "pond", material: "glossy", at: [2.2, 0.006, -0.4], scale: [7, 0.04, 4] },
          { id: "reeds", kind: "prop", model: "pond_reeds", at: [2.45, 0, -0.7], size: 1.1 },
          { id: "duck", kind: "critter", species: "duck", size: 0.95, at: [3.45, -0.1, -0.15], rotation: [0, -25, 0], feeling: "joyful" },
          { id: "rip", kind: "prop", model: "splash_ripples", at: [3.45, 0.03, -0.15], size: 1.1 },
          { id: "bubble", kind: "prop", model: "word_bubble", at: [3.95, 1.7, 0.3], size: 0.8 },
          { id: "five", kind: "letter", text: "5", color: "orange", parent: "bubble", at: [0, -0.2, 0.12], size: 0.34 },
        ] },
    ],
  }),
  stage: { preset: "pond" },
  camera: DEFAULT_CAM,
  objects,
  scenes,
};
writeRhyme(script, "five_little_ducks");
