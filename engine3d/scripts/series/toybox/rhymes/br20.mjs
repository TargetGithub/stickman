// Builds ../br20_opposites_hop.json: Opposites Hop, an original song with an original bouncy tune. Four pairs of
// opposites, one per verse, each shown by a pair of things in the playroom: a huge ball and a tiny ball bounce (big
// and small), a balloon floats up and a rock drops down (up and down), a drum booms and a little bell tings (loud and
// quiet, the drum kept gentle in volume) and Bunny hops fast while Turtle walks slow (fast and slow). Robo hosts;
// Pip the toddler (catalog/models/rhymes_br04.json) shows each opposite with its body (arms up big, curled small,
// reach up, touch toes, a finger on the lips for quiet) and answers "show the opposite" (Robo says big, Pip says
// small). Interactions: "Which ball is big?" point-to-it with 3-2-1, show the opposite after every verse, a freeze
// game ("Hop, hop, hop... Freeze!"), a recap quiz, and the "Opposites hop" chorus with everyone hopping.
// New models: catalog/models/rhymes_br20.json (four paired HUD icons for the tracker).
// Run: node br20.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, showTracker, fillSlot, yourTurn, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// ---- The tune (original, key of C, one note per syllable; sung lines end in a comma or a full stop) -------------
const T = {
  c1: "G4 G4 E4:0.5 E4:0.5 G4 C5:2", //            Hop, hop, op-po-sites hop,
  c2: "A4 A4 G4 G4 F4 F4 E4:2", //                 Big and small and up and down,
  c3: "D4 D4 E4:0.5 E4:0.5 F4 F4 G4:2", //         Loud and qui-et, fast and slow,
  c4: "G4 G4 E4 E4 D4 D4 C4:2", //                 Hop and stop and hop, hop, hop.
  a: "C4 E4 G4:0.5 G4:0.5 C5 C5 C5:2", //          Big ball boun-ces, boom, boom, boom,
  b: "A4 F4 E4:0.5 E4:0.5 D4 D4 D4:2", //          Small ball boun-ces, bip, bip, bip.
  c: "E4 E4 G4:2 E4 E4 G4:2", //                   Big and small, big and small,
  d: "A4 A4 G4 G4 F4 D4 C4:2", //                  Stretch up big and curl up small.
};
const CHORUS = ["Hop, hop, opposites hop,", "Big and small and up and down,", "Loud and quiet, fast and slow,", "Hop and stop and hop, hop, hop."];

// ---- Layout ---------------------------------------------------------------------------------------------------
const CAM = { position: [0, 2.0, 9.0], lookAt: [0, 1.1, -0.2], fov: 40 };
const WIDE = { position: [0, 2.3, 9.8], lookAt: [0, 1.0, -0.4], fov: 40 };
const ROBO = [-2.75, 0, 0.3];
const PIP = [2.8, 0, 0.4];
const PIP_YAW = -32;
const L = [-1.1, 0, 0.9];
const R = [1.1, 0, 0.9];
const UNDER = (p) => [p[0], -2.4, p[2]]; // hidden objects wait below the floor
const PARK = {
  big: [-1.0, 0, -3.6], small: [0.15, 0, -2.9],
  balloon: [3.6, 0, -2.4], rock: [0.95, 0, -2.4],
  drum: [-2.2, 0, -2.6], bell: [2.0, 0, -2.7],
};
const BIG = 1.7; // the huge ball's size (1.36 m across)
const SMALL = 0.38; // the tiny ball's size (0.3 m across)
const DRUM_SIZE = 1.15;
const SKIN_Y = 0.415 * DRUM_SIZE;
const BUNNY_IN = [-7.4, 0, 1.4];
const TURTLE_IN = [5.8, 0, 1.5];
const BUNNY_AT = [-1.15, 0, 1.2];
const TURTLE_AT = [1.2, 0, 1.25];

// ---- Pip's poses (from br04: absolute angles from a small IK solve on the toddler model) ----------------------
const ARM_REST = [0, 0, 8];
const POSES = {
  rest: { hip: 0, arm: ARM_REST, fore: [0, 0, 0] },
  yay: { hip: -6, arm: [0, 0, 150], fore: [0, 0, 25] }, // arms up: big, up, hooray
  knees: { hip: 45, arm: [-19, -7, 0], fore: [-32, 1, -30] }, // curled down: small
  toes: { hip: 85, arm: [-50, -11, -15], fore: [-40, 0, 0] }, // touch your toes: down
  mouth: { hip: 0, arm: [-80, -1, -14], fore: [-58, 5, -42], one: true }, // a finger on the lips: shh, quiet
  wave: { hip: 0, arm: [0, 0, 140], fore: [0, 0, 35], one: true },
};
const off = (a, rest = ARM_REST) => a.map((v, i) => v - rest[i]);
const mir = (a) => [a[0], -a[1], -a[2]];
/** Pip takes a pose at `at` over `dur` seconds. */
function pose(name, at = 0.1, dur = 0.3) {
  const p = POSES[name];
  const r = p.one ? POSES.rest : p;
  return [
    { do: "turn", target: "pip#head", to: [p.hip, 0, 0], at, dur },
    { do: "turn", target: "pip#arm_l", to: off(p.arm), at, dur },
    { do: "turn", target: "pip#fore_l", to: p.fore, at, dur },
    { do: "turn", target: "pip#arm_r", to: mir(off(r.arm)), at, dur },
    { do: "turn", target: "pip#fore_r", to: mir(r.fore), at, dur },
  ];
}

// ---- Objects --------------------------------------------------------------------------------------------------
const PAIRS = [
  { a: "big", b: "small", A: "BIG", B: "SMALL", icon: "opp_icon_big_small", color: "orange" },
  { a: "up", b: "down", A: "UP", B: "DOWN", icon: "opp_icon_up_down", color: "green" },
  { a: "loud", b: "quiet", A: "LOUD", B: "QUIET", icon: "opp_icon_loud_quiet", color: "pink" },
  { a: "fast", b: "slow", A: "FAST", B: "SLOW", icon: "opp_icon_fast_slow", color: "blue" },
];
const SLOT_COLS = PAIRS.map((p) => p.color);

const objects = [
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, 25, 0], feeling: "happy" },
  { id: "pip", kind: "critter", species: "toddler", at: PIP, rotation: [0, PIP_YAW, 0], size: 1.0, feeling: "happy" },
  // Pair 1 is out from the first second: the huge ball and the tiny ball.
  { id: "big_ball", kind: "prop", model: "ball", color: "red", at: L, size: BIG },
  { id: "small_ball", kind: "prop", model: "ball", color: "blue", at: R, size: SMALL },
  // Pairs 2-4 wait under the floor.
  { id: "balloon", kind: "prop", model: "balloon", color: "green", at: UNDER(L), size: 1.0, hidden: true },
  { id: "rock", kind: "prop", model: "rock", at: UNDER(R), size: 1.1, rotation: [0, -20, 0], hidden: true },
  { id: "arrow_up", kind: "shape", shape: "arrow", color: "green", at: [-0.42, 1.55, 0.9], size: 0.85, rotation: [0, 0, 90], hidden: true },
  { id: "arrow_down", kind: "shape", shape: "arrow", color: "orange", at: [0.42, 1.35, 0.9], size: 0.85, rotation: [0, 0, -90], hidden: true },
  { id: "drum", kind: "prop", model: "drum", at: UNDER(L), size: DRUM_SIZE, rotation: [0, 15, 0], hidden: true },
  { id: "sticks", kind: "prop", model: "drum_sticks", parent: "drum", at: [0, SKIN_Y, 0], size: DRUM_SIZE, hidden: true },
  { id: "bell", kind: "prop", model: "bell", at: UNDER(R), size: 1.1, rotation: [0, -15, 0], hidden: true },
  { id: "bunny", kind: "critter", species: "bunny", at: BUNNY_IN, size: 0.85, rotation: [0, 90, 0], hidden: true },
  { id: "turtle", kind: "critter", species: "turtle", at: TURTLE_IN, size: 0.95, rotation: [0, -90, 0], hidden: true },
  // Playroom dressing at the back.
  { id: "toybox", kind: "prop", model: "toy_box", at: [-6.4, 0, -4.2], size: 1.1, rotation: [0, 20, 0] },
  { id: "shelf", kind: "prop", model: "shelf", at: [6.1, 0, -3.8], size: 1.1, rotation: [0, -20, 0] },
  { id: "confetti", kind: "confetti", at: [0, 3.4, 0.8] },
];
// HUD: four tracker slots with paired icons (a "?" on the fourth), the 3-2-1 countdown, the word bubble.
objects.push(...trackerObjects(4, { colors: SLOT_COLS }));
PAIRS.forEach((p, i) => objects.push({ id: `mini${i + 1}`, kind: "prop", model: p.icon, color: "cream", hud: true, parent: `slot${i + 1}`, at: [0, -0.02, 0.15], size: 0.64, hidden: true }));
objects.push({ id: "qmark", kind: "letter", text: "?", color: "blue", hud: true, parent: "slot4", at: [0, -0.24, 0.2], size: 0.42, hidden: true });
objects.push(...countdownObjects());
objects.push(...bubbleObjects([
  ...PAIRS.flatMap((p) => [{ id: p.a, text: p.A, color: "red" }, { id: p.b, text: p.B, color: "blue" }]),
  { id: "hop", text: "HOP!", color: "green" }, { id: "freeze", text: "FREEZE!", color: "purple" },
]));

const cast = {
  pip: { voice: "squeaky", pitch: 1.2, speed: 1 },
  bunny: { voice: "squeaky", pitch: 1.3, speed: 1.1 },
  turtle: { voice: "deep", pitch: 0.95, speed: 0.85 },
};

// ---- Helpers --------------------------------------------------------------------------------------------------
const pipSay = (text, at = 0.1, o = {}) => ({ do: "say", who: "pip", text, at, ...o });
/** Swap the word in the (open) bubble from a to b. */
const swap = (a, b, at) => [{ do: "hide", target: `w_${a}`, at, dur: 0.15 }, { do: "show", target: `w_${b}`, at: at + 0.12, dur: 0.2 }, { do: "wiggle", target: "bubble", at: at + 0.1, deg: 8, dur: 0.5 }];
/** Bring a hidden object up at `to` with a pop. */
const pop = (id, to, at, sound = "pop") => [{ do: "move", target: id, to, at: Math.max(0, at - 0.02), dur: 0.01 }, { do: "pop", target: id, at, dur: 0.4, sound }];
/** The huge ball bounces (a slow, heavy boing) and the tiny ball bounces (quick little bips). */
const bigBounce = (at, h = 0.55, sound = "ball_bounce") => ({ do: "hop", target: "big_ball", at, height: h, dur: 0.6, sound });
const smallBounces = (at, n = 3, gap = 0.28, sound = true) => Array.from({ length: n }, (_, k) => ({ do: "hop", target: "small_ball", at: at + k * gap, height: 0.3, dur: 0.24, ...(sound && k === 0 ? { sound: "bubble_pop" } : {}) }));
/** Two quick taps of the drum sticks (gentle drum sounds). */
const taps = (at, n = 2, gap = 0.24, vol = 0.45) => Array.from({ length: n }, (_, k) => {
  const s = k % 2 ? "sticks#stick_r" : "sticks#stick_l";
  const t = at + k * gap;
  return [
    { do: "turn", target: s, to: [-28, 0, 0], at: t, dur: 0.08 },
    { do: "turn", target: s, to: [0, 0, 0], at: t + 0.09, dur: 0.08 },
    vol ? { do: "sound", sound: "drum", at: t + 0.16, volume: vol } : null,
  ];
});
const boom = (at, n = 2) => [...taps(at, n), { do: "grow", target: "drum", to: 1.08, at: at + 0.15, dur: 0.12 }, { do: "grow", target: "drum", to: 1, at: at + 0.3, dur: 0.25 }];
const ting = (at, vol = 0.28) => [{ do: "turn", target: "bell#bell", to: [0, 0, 14], at, dur: 0.2 }, { do: "turn", target: "bell#bell", to: [0, 0, -10], at: at + 0.22, dur: 0.25 }, { do: "turn", target: "bell#bell", to: [0, 0, 0], at: at + 0.5, dur: 0.25 }, { do: "sound", sound: "bell", at: at + 0.1, volume: vol }];
/** Bunny hops quickly along points (a hop per leg). */
const bunnyRun = (at, pts, legDur = 0.32) => [
  { do: "path", target: "bunny", points: pts, at, dur: legDur * (pts.length - 1), face: true },
  ...pts.slice(1).map((_, k) => ({ do: "hop", target: "bunny", at: at + k * legDur, height: 0.3, dur: legDur * 0.95 })),
];
const roboJump = (at) => ({ do: "clip", target: "robo", clip: "Jump", at });
const allHop = (at, h = 0.3, who = ["pip"]) => who.map((id, k) => ({ do: "hop", target: id, at: at + k * 0.05, height: id === "turtle" ? 0.12 : h, dur: 0.4 }));

const scenes = [];

// 0:00 The hook: the huge ball and the tiny ball bounce: "Big! Small!", then the tracker and the speedy-friend tease.
scenes.push({ id: "hello", title: "Big! Small!", beats: [
  beat("h1", 3.0, [
    { do: "camera", position: [0, 1.45, 6.9], lookAt: [0, 0.8, 0.9], fov: 40, dur: 0 },
    bigBounce(0.1), say("Big!", { at: 0.15 }), word("big", 0.15),
    smallBounces(1.25, 4, 0.26), say("Small!", { at: 1.25 }), swap("big", "small", 1.2),
    { do: "feel", target: "pip", feeling: "joyful", at: 0.5 },
  ]),
  beat("h2", 3.2, [
    say("Big and small are opposites! Let's hop!", { at: 0.1 }),
    unword("small", 0.2),
    { do: "camera", ...CAM, dur: 1.4 },
    roboJump(1.9), { do: "hop", target: "pip", at: 2.0, height: 0.35, sound: "boing" },
    bigBounce(2.1, 0.35, false), smallBounces(2.1, 3, 0.25, false),
  ]),
  beat("h3", 2.8, [
    say("Let's find four opposites!", { at: 0.1 }),
    showTracker(4, 0.4, 0.25),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
  ]),
  beat("h4", 2.8, [
    say("And a speedy friend comes at the end!", { at: 0.1 }),
    { do: "pop", target: "qmark", at: 0.5, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot4", at: 0.8, deg: 12, dur: 1 },
    { do: "grow", target: "slot4", to: 1.25, at: 1.3, dur: 0.3 }, { do: "grow", target: "slot4", to: 1, at: 1.7, dur: 0.3 },
    { do: "look", target: "pip", at: 0.4, to: [0, 1.6, 9] },
  ]),
]});

// The chorus: everyone hops on the beat; "stop" freezes for a moment.
const chorus = (id, who, extra = [[], [], [], []]) => [
  beat(`${id}1`, tuneDur(T.c1), sung(CHORUS[0], T.c1, [
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    ...[0, 1, 4].flatMap((k) => allHop(onBeat(k), 0.32, who)),
    ...extra[0],
  ])),
  beat(`${id}2`, tuneDur(T.c2), sung(CHORUS[1], T.c2, [
    pose("yay", onBeat(0), 0.3), pose("knees", onBeat(2), 0.3), pose("yay", onBeat(4), 0.3), pose("toes", onBeat(5.5), 0.35), pose("rest", onBeat(7), 0.3),
    bigBounce(onBeat(0), 0.4, false), smallBounces(onBeat(2), 2, 0.25, false),
    ...extra[1],
  ])),
  beat(`${id}3`, tuneDur(T.c3), sung(CHORUS[2], T.c3, [
    pose("wave", onBeat(0), 0.3), pose("mouth", onBeat(1.5), 0.3), pose("rest", onBeat(4), 0.3),
    ...[4, 4.5, 5].flatMap((k) => allHop(onBeat(k), 0.22, who)),
    ...extra[2],
  ])),
  beat(`${id}4`, tuneDur(T.c4), sung(CHORUS[3], T.c4, [
    ...allHop(onBeat(0), 0.32, who),
    { do: "clip", target: "robo", clip: "Idle", at: onBeat(1.8) }, // "stop": freeze
    { do: "feel", target: "pip", feeling: "surprised", at: onBeat(2) },
    { do: "feel", target: "pip", feeling: "joyful", at: onBeat(3.8) },
    roboJump(onBeat(4)),
    ...[4, 5, 6].flatMap((k) => allHop(onBeat(k), 0.35, who)),
    ...extra[3],
  ])),
];
scenes.push({ id: "chorus1", title: "Sing: Opposites hop", music: false, beats: [
  beat("c0", 1.8, [say("Sing and hop with me!", { at: 0.1 }), { do: "shot", target: ["robo", "pip"], framing: "wide", yaw: 6, height: 9, dur: 1.4 }]),
  ...chorus("c", ["pip"]),
]});

// ---- Pair 1: big and small ------------------------------------------------------------------------------------
scenes.push({ id: "big_small", title: "Which ball is big?", beats: [
  ...quizRound({ id: "p1q", q: "Which ball is big? Point to it!", left: "big_ball", right: "small_ball", answer: "big_ball",
    spots: [[-1.0, 0, 1.3], [1.0, 0, 1.6]], yes: "Yes! The big ball! Big!" }),
  beat("p1r", 2.6, [
    word("big", 0.1), bigBounce(0.2),
    say("Big! And this one is small!", { at: 0.1 }),
    swap("big", "small", 1.1), smallBounces(1.2, 4, 0.24),
    { do: "point", target: "robo", to: "small_ball", at: 1.2, hold: 1.0 },
  ]),
  beat("p1s", 1.2, [unword("small", 0)]),
]});
scenes.push({ id: "sing1", title: "Sing: big and small", music: false, beats: [
  beat("s1a", tuneDur(T.a), sung("Big ball bounces, boom, boom, boom,", T.a, [
    { do: "shot", target: "big_ball", framing: "medium", yaw: 14, height: 8, dur: 1.2 },
    ...[4, 5, 6].map((k) => bigBounce(onBeat(k), 0.5, k === 4 ? "ball_bounce" : false)),
  ])),
  beat("s1b", tuneDur(T.b), sung("Small ball bounces, bip, bip, bip.", T.b, [
    { do: "shot", target: ["small_ball", "pip"], framing: "medium", yaw: -12, height: 10, dur: 1.2 },
    ...[4, 5, 6].map((k) => ({ do: "hop", target: "small_ball", at: onBeat(k), height: 0.32, dur: 0.3, ...(k === 4 ? { sound: "bubble_pop" } : {}) })),
  ])),
  beat("s1c", tuneDur(T.c), sung("Big and small, big and small,", T.c, [
    { do: "camera", ...CAM, dur: 1.2 },
    bigBounce(onBeat(0), 0.4, false), smallBounces(onBeat(2), 2, 0.25, false), bigBounce(onBeat(4), 0.4, false), smallBounces(onBeat(6), 2, 0.25, false),
    pose("yay", onBeat(0)), pose("knees", onBeat(2)), pose("yay", onBeat(4)), pose("knees", onBeat(6)),
  ])),
  beat("s1d", tuneDur(T.d), sung("Stretch up big and curl up small.", T.d, [
    { do: "shot", target: "pip", framing: "medium", yaw: -20, height: 8, dur: 1.2 },
    pose("yay", onBeat(0), 0.4), pose("knees", onBeat(4), 0.4), pose("rest", onBeat(7.5), 0.4),
    { do: "feel", target: "pip", feeling: "joyful", at: onBeat(1) },
  ])),
]});
scenes.push({ id: "turn1", title: "Your turn: say the opposite", beats: yourTurn({
  id: "t1", ask: "I say big! You say...?", answer: "Small!", answerWho: "pip", praise: "Yes! Big and small!", wordId: "big", slot: 1, mini: "mini1",
  extra: [
    { do: "camera", ...CAM, dur: 1.0 },
    { do: "path", target: "big_ball", points: [[-1.0, 0, 1.3], [-1.0, 0, -1.2], PARK.big], at: 0.3, dur: 1.2 },
    { do: "path", target: "small_ball", points: [[1.0, 0, 1.6], [0.6, 0, -0.6], PARK.small], at: 0.3, dur: 1.2 },
  ],
}) });
// A small Pip curl on "Small!".
scenes.at(-1).beats[2].do.push(...pose("knees", 0.15, 0.3), ...pose("rest", 1.4, 0.3));

// ---- Pair 2: up and down --------------------------------------------------------------------------------------
const BALLOON_UP = [L[0], 1.15, L[2]];
const ROCK_HIGH = [R[0], 2.4, R[2]];
scenes.push({ id: "up_down", title: "Up and down", beats: [
  beat("p2a", 3.0, [
    { do: "shot", target: ["robo", "pip"], framing: "wide", yaw: -8, height: 9, dur: 1.0 },
    pop("balloon", L, 0.2),
    { do: "move", target: "balloon", to: BALLOON_UP, at: 0.7, dur: 1.6, ease: "sineInOut" },
    say("Look! The balloon goes up, up, up!", { at: 0.1 }),
    word("up", 0.9), { do: "pop", target: "arrow_up", at: 1.0, dur: 0.35, sound: "whoosh" },
    { do: "look", target: "robo", at: 0.8, to: "balloon" }, { do: "look", target: "pip", at: 0.8, to: "balloon" },
    pose("yay", 1.1, 0.4),
  ]),
  beat("p2b", 3.0, [
    swap("up", "down", 0.2),
    pop("rock", ROCK_HIGH, 0.25, false),
    { do: "drop", target: "rock", to: R, height: 2.4, at: 0.5, dur: 0.8, sound: "land" },
    say("And the rock goes down! Plop!", { at: 0.1 }),
    { do: "pop", target: "arrow_down", at: 0.6, dur: 0.35, sound: false },
    { do: "look", target: "robo", at: 0.4, to: "rock" }, { do: "look", target: "pip", at: 0.4, to: "rock" },
    pose("toes", 0.7, 0.4), pose("rest", 2.3, 0.4),
    { do: "feel", target: "pip", feeling: "surprised", at: 1.1 },
  ]),
  beat("p2c", 2.4, [
    say("Up and down! Opposites!", { at: 0.1 }),
    { do: "wiggle", target: "arrow_up", at: 0.2, deg: 10, dur: 0.6 }, { do: "wiggle", target: "arrow_down", at: 0.9, deg: 10, dur: 0.6 },
    unword("down", 1.7),
    { do: "feel", target: "pip", feeling: "joyful", at: 0.3 },
    { do: "look", target: "robo", at: 0.2, to: "ahead" }, { do: "look", target: "pip", at: 0.2, to: "ahead" },
  ]),
]});
scenes.push({ id: "sing2", title: "Sing: up and down", music: false, beats: [
  beat("s2a", tuneDur(T.a), sung("Up, up, up the balloon goes,", T.a, [
    { do: "shot", target: ["balloon", "arrow_up"], framing: "medium", yaw: 12, height: 6, dur: 1.2 },
    { do: "move", target: "balloon", to: [L[0], 1.7, L[2]], at: onBeat(0), dur: 2.4, ease: "sineInOut" },
    { do: "wiggle", target: "balloon", at: onBeat(3), deg: 8, dur: 1.2 },
  ])),
  beat("s2b", tuneDur(T.b), sung("Down, down, down, the rock goes plop.", T.b, [
    { do: "shot", target: ["rock", "arrow_down"], framing: "medium", yaw: -12, height: 12, dur: 1.2 },
    pop("rock", ROCK_HIGH, 0.08, false),
    { do: "drop", target: "rock", to: R, height: 2.4, at: onBeat(4), dur: 0.8, sound: "land" },
    { do: "wiggle", target: "arrow_down", at: onBeat(0), deg: 10, dur: 1 },
  ])),
  beat("s2c", tuneDur(T.c), sung("Up and down, up and down,", T.c, [
    { do: "camera", ...CAM, dur: 1.2 },
    { do: "move", target: "balloon", to: [L[0], 0.9, L[2]], at: onBeat(2), dur: 0.9, ease: "sineInOut" },
    { do: "move", target: "balloon", to: [L[0], 1.6, L[2]], at: onBeat(4), dur: 0.9, ease: "sineInOut" },
    pose("yay", onBeat(0)), pose("toes", onBeat(2)), pose("yay", onBeat(4)), pose("toes", onBeat(6)),
    { do: "point", target: "robo", to: [ROBO[0] + 0.4, 3.4, ROBO[2] + 0.6], at: onBeat(0), hold: 0.8, look: false },
    { do: "point", target: "robo", to: [ROBO[0] + 0.9, 0.1, ROBO[2] + 0.9], at: onBeat(2), hold: 0.8, look: false },
  ])),
  beat("s2d", tuneDur(T.d), sung("Reach up high and touch your toes.", T.d, [
    { do: "shot", target: "pip", framing: "medium", yaw: -20, height: 8, dur: 1.2 },
    { do: "hide", target: "arrow_up", at: 0.1, dur: 0.25 }, { do: "hide", target: "arrow_down", at: 0.15, dur: 0.25 },
    pose("yay", onBeat(0), 0.4), pose("toes", onBeat(4), 0.45), pose("rest", onBeat(7.5), 0.4),
  ])),
]});
scenes.push({ id: "turn2", title: "Your turn: say the opposite", beats: yourTurn({
  id: "t2", ask: "I say up! You say...?", answer: "Down!", answerWho: "pip", praise: "Yes! Up and down!", wordId: "up", slot: 2, mini: "mini2",
  extra: [
    { do: "camera", ...CAM, dur: 1.0 },
    { do: "path", target: "balloon", points: [[L[0], 1.6, L[2]], [1.5, 1.5, -0.6], [PARK.balloon[0], 0.5, PARK.balloon[2]]], at: 0.3, dur: 1.2 },
    { do: "path", target: "rock", points: [R, [1.0, 0, -0.8], PARK.rock], at: 0.3, dur: 1.2 },
  ],
}) });
scenes.at(-1).beats[2].do.push(...pose("toes", 0.15, 0.35), ...pose("rest", 1.4, 0.35));

// ---- The freeze game ------------------------------------------------------------------------------------------
const hopRun = (at0, dur, gap = 0.5) => {
  const out = [];
  for (let t = at0; t < at0 + dur - 0.3; t += gap) out.push({ do: "hop", target: "pip", at: Math.round(t * 100) / 100, height: 0.3, dur: 0.4 });
  return out;
};
scenes.push({ id: "freeze", title: "Freeze game!", beats: [
  beat("f1", 2.6, [
    say("Freeze game! Hop, hop, hop!", { at: 0.1 }), word("hop", 0.3),
    { do: "shot", target: ["robo", "pip"], framing: "wide", yaw: 10, height: 10, dur: 1.2 },
    { do: "clip", target: "robo", clip: "Jump", at: 1.3 }, hopRun(1.2, 1.4),
    { do: "feel", target: "pip", feeling: "joyful", at: 0.3 },
  ]),
  beat("f2", 2.2, [
    say("Hop, hop, hop...", { at: 0.1 }),
    roboJump(0.1), roboJump(1.1), hopRun(0.1, 2.1),
  ]),
  beat("f3", 2.4, [
    say("Freeze!", { at: 0.05 }), swap("hop", "freeze", 0.05),
    { do: "clip", target: "robo", clip: "Idle", at: 0.05 },
    { do: "sound", sound: "slide_whistle", at: 0.1, volume: 0.4 },
    pose("yay", 0.1, 0.2), { do: "feel", target: "pip", feeling: "surprised", at: 0.1 },
    { do: "feel", target: "robo", feeling: "surprised", at: 0.1 },
    say("Shh... stay still...", { at: 1.0, speed: 0.85 }),
  ]),
  beat("f4", 1.8, [{ do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 }]),
  beat("f5", 2.6, [
    say("Hop again! Hop, hop!", { at: 0.1 }), swap("freeze", "hop", 0.1),
    pose("rest", 0.2, 0.3), { do: "feel", target: "pip", feeling: "joyful", at: 0.2 }, { do: "feel", target: "robo", feeling: "happy", at: 0.2 },
    roboJump(0.6), roboJump(1.6), hopRun(0.6, 2.0),
  ]),
  beat("f6", 2.4, [
    say("Freeze!", { at: 0.05 }), swap("hop", "freeze", 0.05),
    { do: "clip", target: "robo", clip: "Idle", at: 0.05 },
    { do: "sound", sound: "slide_whistle", at: 0.1, volume: 0.4 },
    pose("knees", 0.1, 0.2), { do: "feel", target: "pip", feeling: "surprised", at: 0.1 },
    { do: "sound", sound: "tick", at: 1.1, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.9, volume: 0.5 },
  ]),
  beat("f7", 2.4, [
    say("Great freezing! Hooray!", { at: 0.1 }), unword("freeze", 0.2),
    pose("yay", 0.3, 0.35), pose("rest", 1.8, 0.35), { do: "feel", target: "pip", feeling: "joyful", at: 0.3 },
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.4 },
  ]),
]});

// ---- Pair 3: loud and quiet -----------------------------------------------------------------------------------
scenes.push({ id: "loud_quiet", title: "Loud and quiet", beats: [
  beat("p3a", 3.0, [
    { do: "camera", position: [-0.6, 1.7, 7.4], lookAt: [-0.3, 0.8, 0.8], fov: 40, dur: 1.0 },
    pop("drum", L, 0.2), { do: "show", target: "sticks", at: 0.2, dur: 0.3 },
    say("The drum is loud! Boom, boom!", { at: 0.1 }),
    word("loud", 0.9), boom(1.3, 2), boom(1.9, 2),
    pose("wave", 1.3, 0.3),
  ]),
  beat("p3b", 3.0, [
    swap("loud", "quiet", 0.2),
    pop("bell", R, 0.2, false),
    say("The bell is quiet... ting.", { at: 0.1, speed: 0.85 }),
    ting(1.6), pose("mouth", 0.6, 0.35),
    { do: "look", target: "pip", at: 0.4, to: "bell" },
    { do: "feel", target: "pip", feeling: "happy", at: 0.5 },
  ]),
  beat("p3c", 2.4, [
    say("Loud and quiet! Opposites!", { at: 0.1 }),
    boom(0.3, 1), ting(1.0, 0.22),
    unword("quiet", 1.7), pose("rest", 1.6, 0.35),
    { do: "look", target: "pip", at: 0.2, to: "ahead" },
  ]),
]});
scenes.push({ id: "sing3", title: "Sing: loud and quiet", music: false, beats: [
  beat("s3a", tuneDur(T.a), sung("The loud drum goes boom, boom, boom,", T.a, [
    { do: "shot", target: ["drum", "robo"], framing: "medium", yaw: 0, height: 10, dur: 1.2 },
    ...[4, 5, 6].map((k) => boom(onBeat(k), 1)),
  ])),
  beat("s3b", tuneDur(T.b), sung("Quiet bell goes ting, ting, ting.", T.b, [
    { do: "shot", target: ["bell", "pip"], framing: "medium", yaw: -14, height: 8, dur: 1.2 },
    ...[4, 5, 6].map((k) => ting(onBeat(k), 0.2)),
    pose("mouth", onBeat(0), 0.35),
  ])),
  beat("s3c", tuneDur(T.c), sung("Loud, then quiet, shh, shh,", T.c, [
    { do: "camera", ...CAM, dur: 1.2 },
    boom(onBeat(0), 2), ting(onBeat(2.2), 0.2), boom(onBeat(4), 2), ting(onBeat(6.2), 0.2),
    pose("wave", onBeat(0.2)), pose("mouth", onBeat(4.8)),
  ])),
  beat("s3d", tuneDur(T.d), sung("Clap it loud, then whisper low.", T.d, [
    { do: "shot", target: ["robo", "drum"], framing: "medium", yaw: 14, height: 8, dur: 1.2 },
    { do: "clip", target: "robo", clip: "Yes", at: onBeat(0) },
    { do: "sound", sound: "block", at: onBeat(1), volume: 0.5 }, { do: "sound", sound: "block", at: onBeat(1.5), volume: 0.5 },
    pose("rest", onBeat(0), 0.3), pose("mouth", onBeat(5), 0.35),
  ])),
]});
scenes.push({ id: "turn3", title: "Your turn: say the opposite", beats: yourTurn({
  id: "t3", ask: "I say loud! You say...?", answer: "Quiet.", answerWho: "pip", praise: "Yes! Loud and quiet!", wordId: "loud", slot: 3, mini: "mini3",
  extra: [
    { do: "camera", ...CAM, dur: 1.0 },
    { do: "path", target: "drum", points: [L, [-1.8, 0, -1.2], PARK.drum], at: 0.3, dur: 1.1 },
    { do: "path", target: "bell", points: [R, [1.7, 0, -1.2], PARK.bell], at: 0.3, dur: 1.1 },
  ],
}) });
scenes.at(-1).beats[2].do.push(...pose("mouth", 0.1, 0.3), ...pose("rest", 1.5, 0.3));
scenes.at(-1).beats[2].do[0].speed = 0.85;

// ---- Pair 4: fast and slow (the speedy friend) ----------------------------------------------------------------
scenes.push({ id: "fast_slow", title: "Fast and slow", beats: [
  beat("p4a", 3.2, [
    { do: "camera", position: [0, 1.8, 8.4], lookAt: [0, 0.8, 0.8], fov: 40, dur: 0.8 },
    say("Who is the speedy friend?", { at: 0.1 }),
    { do: "hide", target: "qmark", at: 1.3, dur: 0.2 }, { do: "wiggle", target: "slot4", at: 1.3, deg: 12, dur: 0.8 },
    { do: "show", target: "bunny", at: 1.4, dur: 0.01 },
    bunnyRun(1.4, [BUNNY_IN, [-5.0, 0, 1.6], [-3.4, 0, 1.4], [-2.1, 0, 1.3], BUNNY_AT], 0.3),
    { do: "turn", target: "bunny", to: [0, 10, 0], at: 2.7, dur: 0.3 },
  ]),
  beat("p4b", 2.8, [
    { do: "say", who: "bunny", text: "Hi! I'm Bunny! I'm fast!", at: 0.1 },
    word("fast", 0.2), { do: "feel", target: "bunny", feeling: "joyful", at: 0.2 },
    { do: "hop", target: "bunny", at: 0.3, height: 0.3, dur: 0.28 }, { do: "hop", target: "bunny", at: 0.62, height: 0.3, dur: 0.28 },
    say("Fast!", { at: "after" }),
    { do: "look", target: "robo", at: 0.2, to: "bunny" }, { do: "look", target: "pip", at: 0.2, to: "bunny" },
  ]),
  beat("p4c", 4.4, [
    swap("fast", "slow", 0.1),
    { do: "show", target: "turtle", at: 0.1, dur: 0.01 },
    { do: "move", target: "turtle", to: TURTLE_AT, at: 0.1, dur: 4.0, ease: "linear" },
    say("And here comes Turtle... slow... slow...", { at: 0.4, speed: 0.85 }),
    { do: "shot", target: ["bunny", "turtle"], framing: "wide", yaw: 0, height: 10, at: 0.3, dur: 3.0 },
    { do: "look", target: "robo", at: 0.4, to: "turtle" }, { do: "look", target: "pip", at: 0.3, to: "turtle" },
    { do: "turn", target: "turtle", to: [0, -20, 0], at: 4.0, dur: 0.4 },
  ]),
  beat("p4d", 2.8, [
    { do: "say", who: "turtle", text: "Hello! I'm Turtle. I'm slow.", at: 0.1 },
    { do: "feel", target: "turtle", feeling: "joyful", at: 0.2 }, { do: "nod", target: "turtle", at: 0.4 },
    say("Fast and slow! Opposites!", { at: "after" }), unword("slow", 2.2),
    { do: "look", target: "pip", at: 0.2, to: "ahead" },
  ]),
]});
const BUNNY_LOOP = [BUNNY_AT, [-2.0, 0, 2.2], [-0.2, 0, 2.4], [0.0, 0, 1.0], [-1.6, 0, 0.4], BUNNY_AT];
scenes.push({ id: "sing4", title: "Sing: fast and slow", music: false, beats: [
  beat("s4a", tuneDur(T.a), sung("Bunny hops so fast, fast, fast,", T.a, [
    { do: "shot", target: ["bunny"], framing: "wide", yaw: 10, height: 12, dur: 1.2 },
    bunnyRun(onBeat(2), BUNNY_LOOP, 0.34),
    { do: "turn", target: "bunny", to: [0, 10, 0], at: onBeat(2) + 1.75, dur: 0.3 },
    { do: "sound", sound: "boing", at: onBeat(2), volume: 0.5 },
  ])),
  beat("s4b", tuneDur(T.b), sung("Turtle walks so slow, slow, slow.", T.b, [
    { do: "shot", target: "turtle", framing: "medium", yaw: -16, height: 10, dur: 1.2 },
    { do: "move", target: "turtle", to: [TURTLE_AT[0] - 0.35, 0, TURTLE_AT[2] + 0.1], at: onBeat(0), dur: 3.4, ease: "linear" },
    { do: "nod", target: "turtle", at: onBeat(4) },
  ])),
  beat("s4c", tuneDur(T.c), sung("Fast and slow, fast and slow,", T.c, [
    { do: "camera", ...CAM, dur: 1.2 },
    ...[0, 0.5, 1].map((k) => ({ do: "hop", target: "bunny", at: onBeat(k), height: 0.3, dur: 0.28 })),
    { do: "hop", target: "turtle", at: onBeat(2), height: 0.1, dur: 1.0 },
    ...[4, 4.5, 5].map((k) => ({ do: "hop", target: "bunny", at: onBeat(k), height: 0.3, dur: 0.28 })),
    { do: "hop", target: "turtle", at: onBeat(6), height: 0.1, dur: 1.0 },
    ...[0, 0.5, 1, 4, 4.5, 5].map((k) => ({ do: "hop", target: "pip", at: onBeat(k), height: 0.25, dur: 0.3 })),
  ])),
  beat("s4d", tuneDur(T.d), sung("Hop like Bunny, here we go.", T.d, [
    { do: "shot", target: ["bunny", "turtle", "pip"], framing: "wide", yaw: -10, height: 10, dur: 1.2 },
    ...[0, 1, 2, 3, 4, 5, 6].flatMap((k) => [{ do: "hop", target: "bunny", at: onBeat(k), height: 0.3, dur: 0.3 }, { do: "hop", target: "pip", at: onBeat(k) + 0.05, height: 0.28, dur: 0.35 }]),
    roboJump(onBeat(4)),
  ])),
]});
scenes.push({ id: "turn4", title: "Your turn: say the opposite", beats: yourTurn({
  id: "t4", ask: "I say fast! You say...?", answer: "Slow!", answerWho: "turtle", praise: "Yes! Fast and slow!", wordId: "fast", slot: 4, mini: "mini4",
  extra: [{ do: "camera", ...CAM, dur: 1.0 }],
}) });

// ---- Recap quiz -----------------------------------------------------------------------------------------------
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 2.2, [say("Opposites game! Point to it!", { at: 0.1 }), { do: "clip", target: "robo", clip: "Wave", at: 0.2 }, { do: "move", target: "bunny", to: [-2.0, 0, -1.3], dur: 1.0 }, { do: "move", target: "turtle", to: [2.0, 0, -1.2], dur: 2.1 }]),
  ...quizRound({ id: "q1", q: "Which one goes up? The balloon or the rock?", left: "balloon", right: "rock", answer: "balloon",
    spots: [[-1.1, 0.6, 1.5], [1.1, 0, 1.6]], back: { balloon: [PARK.balloon[0], 0.5, PARK.balloon[2]], rock: PARK.rock }, yes: "Yes! The balloon goes up!" }),
  ...quizRound({ id: "q2", q: "Who is slow? Bunny or Turtle?", left: "bunny", right: "turtle", answer: "turtle",
    spots: [[-1.1, 0, 1.6], [1.1, 0, 1.6]], answerSay: { who: "turtle", text: "Slow and steady! That's me." }, yes: "Yes! Turtle is slow!" }),
]});
// Turn the friends to face the camera once they reach their spots.
for (const b of scenes.at(-1).beats) if (b.id === "q2a") b.do.push({ do: "turn", target: "bunny", to: [0, 10, 0], at: 1.05, dur: 0.3 }, { do: "turn", target: "turtle", to: [0, -10, 0], at: 1.05, dur: 0.3 });

// ---- Finale: everybody hops the chorus, then bye-bye ----------------------------------------------------------
const EVERY = ["pip", "bunny", "turtle"];
scenes.push({ id: "finale", title: "Everybody hop!", music: false, beats: [
  beat("z0", 2.4, [
    say("Everybody hop and sing!", { at: 0.1 }),
    { do: "camera", ...WIDE, dur: 1.8 },
    { do: "move", target: "bunny", to: [-1.4, 0, 1.6], dur: 1.0 }, { do: "move", target: "turtle", to: [1.4, 0, 1.7], dur: 1.6 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
  ]),
  ...chorus("z", EVERY, [
    [{ do: "orbit", around: [0, 0.8, 0.8], degrees: 12, dur: 4 }, bigBounce(onBeat(0), 0.5), bigBounce(onBeat(4), 0.5, false)],
    [{ do: "wiggle", target: "balloon", at: onBeat(1), deg: 10, dur: 1.2 }, { do: "hop", target: "bunny", at: onBeat(3), height: 0.3, dur: 0.3 }],
    [boom(onBeat(0), 2), ting(onBeat(1.5), 0.22)],
    [{ do: "burst", target: "confetti", at: onBeat(4), dur: 2.6, sound: false }, { do: "sound", sound: "crowd_cheer", at: onBeat(4), volume: 0.35 }, ...[4, 5, 6].map((k) => smallBounces(onBeat(k), 1, 0.2, false))],
  ]),
  beat("z5", 3.6, [
    say("Bye-bye! Big hop, small hop, bye-bye!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    pose("wave", 0.3, 0.35),
    { do: "hop", target: "bunny", at: 0.6, height: 0.3, dur: 0.3 }, { do: "hop", target: "bunny", at: 0.95, height: 0.3, dur: 0.3 },
    { do: "nod", target: "turtle", at: 0.8 },
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.8, dur: 2.6 },
    { do: "camera", position: [0, 2.9, 12.4], lookAt: [0, 1.2, -0.4], fov: 40, dur: 3.2 },
  ]),
]});

// ---- Meta -----------------------------------------------------------------------------------------------------
const description = "Hop and sing the opposites with Robo and Pip! A huge ball and a tiny ball bounce: big and small. A balloon floats up and a rock drops down: up and down. A drum goes boom and a little bell goes ting: loud and quiet. Bunny hops fast and Turtle walks slow: fast and slow. Point to the big ball, say the opposite (Robo says big, you say small!), play the hop-and-freeze game, fill the opposites tracker and hop along to the Opposites Hop chorus.";
const thumbBalls = [
  { id: "big", kind: "prop", model: "ball", color: "red", at: [3.75, 0, 0.1], size: 1.35 },
  { id: "small", kind: "prop", model: "ball", color: "blue", at: [4.4, 0, 1.55], size: 0.4 },
];
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Opposites Hop", episode: "br20", seed: 320,
    skills: ["opposites_k", "position_words_prek", "listening_prek"],
    cast,
    youtube: {
      title: "Opposites Hop 🐰 Big and Small, Fast and Slow Song for Toddlers | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: four pairs of opposites (big and small, up and down, loud and quiet, fast and slow), listening and answering with the opposite word, and moving with a song (stretch up big, curl up small, hop and freeze).\n\nSing at home: stretch up tall for big and curl up tiny for small, reach up high and touch your toes, clap loudly and then whisper, and hop fast like Bunny and walk slowly like Turtle. Play the freeze game together: hop, hop, hop... freeze! Then take turns: you say "big", your toddler says "small". Opposites Hop is an original song with original words and an original tune, written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["opposites song", "opposites for toddlers", "big and small", "fast and slow", "up and down", "loud and quiet", "freeze game", "toddler learning", "baby songs", "nursery rhymes", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "big_small", title: "OPPOSITES HOP", subtitle: "Big and small!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.4, 1.35, 6.4], lookAt: [2.4, 0.85, -0.2], fov: 38 },
        objects: [
          ...thumbBalls,
          { id: "robo", kind: "character", character: "robot", at: [6.0, 0, -1.1], rotation: [0, -30, 0], clip: "Wave", feeling: "happy" },
          { id: "bunny", kind: "critter", species: "bunny", at: [4.95, 0, 1.6], size: 0.6, rotation: [0, -25, 0], feeling: "joyful" },
        ] },
      { name: "fast_slow", title: "FAST OR SLOW?", subtitle: "Up, down, loud, quiet!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.4, 1.3, 6.2], lookAt: [2.4, 0.8, -0.2], fov: 38 },
        objects: [
          { id: "bunny", kind: "critter", species: "bunny", at: [3.7, 0.3, 1.0], size: 0.8, rotation: [0, 10, 0], feeling: "joyful" },
          { id: "turtle", kind: "critter", species: "turtle", at: [5.0, 0, 1.2], size: 0.9, rotation: [0, -30, 0], feeling: "happy" },
          { id: "balloon", kind: "prop", model: "balloon", color: "green", at: [5.1, 0.25, -1.6], size: 1.0 },
          { id: "drum", kind: "prop", model: "drum", at: [5.9, 0, -0.8], size: 1.1, rotation: [0, -20, 0] },
        ] },
    ],
  }),
  stage: { preset: "playroom" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "opposites_hop");
