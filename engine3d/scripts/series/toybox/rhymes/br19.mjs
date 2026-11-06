// Builds ../br19_once_i_caught_a_fish.json: 1, 2, 3, 4, 5, Once I Caught a Fish Alive at the seaside. The first
// four lines are traditional (public domain); the biting lines are replaced by a gentle original ending: "Why did
// you let it go? It wanted to swim home, you know. Which way did it swim? To the left, to the right, with a wiggly
// fin." Teaches counting 1-10 (count to five, then to ten, on two HUD hands; a bubble rises out of the sea on every
// number and a ten-bubble tracker fills) and left and right (the fish swims left or right, the child points, 3-2-1,
// a LEFT or RIGHT arrow pops). The fish is never hurt: it hops into Robo's soft net, says hello, and is let go to
// swim home to its family.
// New models: catalog/models/rhymes_br19.json (fishing_net, bubble, arrow_icon).
// Run: node br19.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, showTracker, fillSlot, yourTurn, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// The tune: a simple counting melody in C in the style of the traditional one (one note per syllable; sung lines end
// in a comma or a full stop, never "!").
const T = {
  l1: "C4 D4 E4 F4 G4:2", //                                   One, two, three, four, five,
  l2: "A4 A4 G4 E4 F4 D4 C4:2", //                             Once I caught a fish a-live.
  l3: "G4 A4:0.5 A4:0.5 B4 C5 C5:2", //                        Six, se-ven, eight, nine, ten,
  l4: "C5 A4 G4 E4 F4 D4 C4:2", //                             Then I let it go a-gain.
  l5: "E4 E4 F4 G4 A4 G4:2", //                                Why did you let it go?
  l6: "A4 A4:0.5 A4:0.5 G4 E4 F4 D4 C4:2", //                  It want-ed to swim home, you know.
  l7: "E4 F4 G4 A4 G4:2", //                                   Which way did it swim?
  l8: "G4:0.5 G4:0.5 A4 G4:0.5 G4:0.5 E4 F4:0.5 F4:0.5 E4:0.5 D4:0.5 C4:2", // To the left, to the right, with a wig-gly fin.
  c5: "C4 D4 E4 F4 G4:2", //                                   One, two, three, four, five.
  c10: "C4 D4 E4 F4 G4 A4 B4:0.5 B4:0.5 C5 D5 E5:2", //        One ... se-ven ... ten.
};
const L = {
  l1: "One, two, three, four, five,",
  l2: "Once I caught a fish alive.",
  l3: "Six, seven, eight, nine, ten,",
  l4: "Then I let it go again.",
  l5: "Why did you let it go?",
  l6: "It wanted to swim home, you know.",
  l7: "Which way did it swim?",
  l8: "To the left, to the right, with a wiggly fin.",
  c5: "One, two, three, four, five.",
  c10: "One, two, three, four, five, six, seven, eight, nine, ten.",
};
/** Tune beat where count k (0-based) starts in c10 ("seven" is two half notes, so the beats stay whole). */
const cb = (k) => k;

// ---- Layout ---------------------------------------------------------------------------------------------------

const SHORE_Z = -0.7; // the sea starts here and runs back
const LANE_Z = -1.9; // where the fish swims
const SWIM_Y = -0.33; // fish origin while swimming: half its body above the water
const FISH_SIZE = 0.7;
const CAM = { position: [0, 2.0, 8.6], lookAt: [0, 0.95, -0.8], fov: 40 };
const VCAM = [
  [0, 2.0, 8.6], [1.6, 1.8, 8.2], [-1.5, 2.3, 8.4], [0.9, 1.6, 7.9], [-0.8, 2.6, 8.8], [1.8, 2.2, 8.4],
].map((p) => ({ position: p, lookAt: [p[0] * 0.15, 0.95, -0.8], fov: 40 }));
const NET_CAM = { position: [-0.6, 1.75, 5.9], lookAt: [-1.2, 0.8, -0.7], fov: 40 };
const ROBO = [-2.5, 0, 0.55];
const NET = [-1.45, 0, -0.45];
const ROBO_GAME = [-3.4, 0, 1.3]; // Robo's spot from the which-way game on
const NET_SIZE = 1.25;
const NET_YAW = 160;
// The net's hoop centre in the world, and where the fish's origin sits when it is in the net.
const HOOP = [
  NET[0] + Math.sin((NET_YAW * Math.PI) / 180) * 0.38 * NET_SIZE,
  0.92 * NET_SIZE,
  NET[2] + Math.cos((NET_YAW * Math.PI) / 180) * 0.38 * NET_SIZE,
].map((v) => Math.round(v * 100) / 100);
const IN_NET = [HOOP[0], Math.round((HOOP[1] - 0.6 * FISH_SIZE - 0.04) * 100) / 100, HOOP[2]];
const MID = [0.6, SWIM_Y, LANE_Z];
const START = [1.6, SWIM_Y - 0.5, LANE_Z]; // the fish waits underwater for the hook
const LEFT = [-2.4, SWIM_Y, LANE_Z - 0.2];
const RIGHT = [3.6, SWIM_Y, LANE_Z - 0.2];
const HOME = [4.4, SWIM_Y, -5.2]; // the fish family, far out to the right
const DEEP = (p) => [p[0], -1.6, p[2]]; // under the sea: hidden
const FACE_R = [0, 90, 0];
const FACE_L = [0, -90, 0];
const FINGERS = ["index", "middle", "ring", "pinky", "thumb"];
const BUB_COLORS = ["sky", "teal", "blue", "mint", "sky", "teal", "blue", "mint", "sky", "gold"];
/** Where the five pop-game bubbles float, over the sea. */
const POPS = [[-1.6, 1.3, -1.4], [-0.7, 1.75, -1.6], [0.2, 1.4, -1.3], [1.1, 1.85, -1.6], [2.0, 1.35, -1.4]];
const NUM = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

// ---- Objects --------------------------------------------------------------------------------------------------

const objects = [
  // The sea: shiny water behind a pale foam line, waves drifting along.
  { id: "sea", kind: "shape", shape: "plate", color: "pond", material: "glossy", at: [0, 0.012, SHORE_Z - 7], scale: [44, 1, 14] },
  { id: "foam", kind: "shape", shape: "plate", color: "white", material: "matte", at: [0, 0.016, SHORE_Z + 0.05], scale: [44, 1, 0.16] },
  ...[-1.3, -2.9, -4.6].map((z, k) => ({ id: `wave${k}`, kind: "flow", at: [0, 0.05, z], points: [[-14, 0, 0], [14, 0, 0]], count: 16, speed: 0.35 + k * 0.08, size: 0.07, color: "white" })),
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, 22, 0], feeling: "happy" },
  { id: "net", kind: "prop", model: "fishing_net", at: NET, size: NET_SIZE, rotation: [0, NET_YAW, 0] },
  { id: "fish", kind: "critter", species: "fish", at: START, size: FISH_SIZE, rotation: FACE_R, feeling: "happy" },
  { id: "fish_mum", kind: "critter", species: "fish", color: "blue", at: DEEP(HOME), size: 0.75, rotation: FACE_L, feeling: "happy", hidden: true },
  { id: "fish_baby", kind: "critter", species: "fish", color: "pink", at: DEEP([HOME[0] + 0.9, 0, HOME[2] + 0.2]), size: 0.45, rotation: FACE_L, feeling: "happy", hidden: true },
  { id: "splash", kind: "prop", model: "splash_drops", color: "sky", at: DEEP(MID), size: 2.0, hidden: true },
  { id: "splash2", kind: "prop", model: "splash_drops", color: "sky", at: DEEP(MID), size: 1.7, hidden: true },
  // Beach dressing, out of the play area.
  { id: "palm_l", kind: "prop", model: "palm_tree", at: [-6.4, 0, 0.2], size: 1.6, rotation: [0, 30, 0] },
  { id: "palm_r", kind: "prop", model: "palm_tree", at: [6.8, 0, -0.1], size: 1.8, rotation: [0, -150, 0] },
  { id: "bucket", kind: "prop", model: "bucket", at: [-3.9, 0, 1.6], size: 1.0, rotation: [0, 20, 0] },
  { id: "rock_r", kind: "prop", model: "rock", at: [4.6, 0, 1.2], size: 1.0 },
  { id: "boat", kind: "prop", model: "boat", at: [-3.5, -0.1, -10.5], size: 1.5 },
  { id: "cloud1", kind: "prop", model: "cloud", at: [-4.2, 5.4, -12], size: 1.5 },
  { id: "cloud2", kind: "prop", model: "cloud", at: [4.6, 6.0, -13], size: 1.7 },
  { id: "confetti", kind: "confetti", at: [0.2, 3.4, 0.6] },
];
// Ten counting bubbles in the sea, waiting underwater.
NUM.forEach((_, i) => objects.push({ id: `bub${i + 1}`, kind: "prop", model: "bubble", color: BUB_COLORS[i], at: DEEP(MID), size: 0.46, hidden: true }));
// HUD: the ten-bubble tracker (top left), "?" on the tenth; the two counting hands (bottom right); LEFT and RIGHT
// arrows at the sides; the 3-2-1 countdown; the word bubble.
objects.push(...trackerObjects(10, { colors: BUB_COLORS.map((c) => (c === "gold" ? "orange" : "blue")), x0: -7.35, step: 0.66, size: 0.56, y: 3.9 }));
NUM.forEach((_, i) => objects.push({ id: `mini${i + 1}`, kind: "prop", model: "bubble", color: BUB_COLORS[i], hud: true, parent: `slot${i + 1}`, at: [0, 0, 0.25], size: 0.4, hidden: true }));
objects.push({ id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot10", at: [0, -0.2, 0.2], size: 0.32, hidden: true });
objects.push({ id: "hand1", kind: "prop", model: "hand", hud: true, at: [5.2, -3.6, 0.5], size: 2.1, hidden: true });
objects.push({ id: "hand2", kind: "prop", model: "hand", hud: true, at: [7.0, -3.6, 0.5], size: 2.1, hidden: true });
objects.push({ id: "arrow_l", kind: "prop", model: "arrow_icon", color: "green", hud: true, at: [-5.9, 0.5, 0.5], size: 1.7, rotation: [0, 0, 180], hidden: true });
objects.push({ id: "arrow_r", kind: "prop", model: "arrow_icon", color: "orange", hud: true, at: [5.9, 0.5, 0.5], size: 1.7, hidden: true });
// LEFT / RIGHT labels on white cards under the arrows (the card pops and hides; its word rides on it).
objects.push({ id: "lbl_l", kind: "shape", shape: "rectangle", color: "white", hud: true, at: [-5.9, -1.5, 0.4], size: 1.35, hidden: true });
objects.push({ id: "lbl_l_txt", kind: "letter", text: "LEFT", color: "green", hud: true, parent: "lbl_l", at: [0, 0.1, 0.6], size: 0.3 });
objects.push({ id: "lbl_r", kind: "shape", shape: "rectangle", color: "white", hud: true, at: [5.9, -1.5, 0.4], size: 1.35, hidden: true });
objects.push({ id: "lbl_r_txt", kind: "letter", text: "RIGHT", color: "orange", hud: true, parent: "lbl_r", at: [0, 0.1, 0.6], size: 0.26 });
objects.push(...countdownObjects());
objects.push(...bubbleObjects([
  { id: "splash", text: "SPLASH!", color: "blue" },
  { id: "five", text: "FIVE", color: "ink" },
  { id: "ten", text: "TEN", color: "ink" },
  { id: "hello", text: "HELLO!", color: "ink" },
  { id: "bye", text: "BYE-BYE!", color: "ink" },
  { id: "home", text: "HOME", color: "ink" },
]));

const cast = {
  fish: { voice: "squeaky", pitch: 1.2, speed: 1.0 },
  fish_mum: { voice: "soft", pitch: 1.0, speed: 0.95 },
  fish_baby: { voice: "squeaky", pitch: 1.3, speed: 1.0 },
};

// ---- Helpers --------------------------------------------------------------------------------------------------

/** Finger k (0-9) of the two counting hands. */
const finger = (k) => `hand${k < 5 ? 1 : 2}#${FINGERS[k % 5]}`;
const foldAll = (at, dur = 0.25) => Array.from({ length: 10 }, (_, k) => ({ do: "turn", target: finger(k), to: [80, 0, 0], at, dur }));
const up = (k, at) => ({ do: "turn", target: finger(k), to: [0, 0, 0], at, dur: 0.2 });
/** Bubble k (1-10) rises out of the sea at x and floats away. */
const rise = (k, x, at) => [
  { do: "move", target: `bub${k}`, to: [x, 0.25, LANE_Z + 0.1], at: Math.max(0, at - 0.03), dur: 0.01 },
  { do: "pop", target: `bub${k}`, at, dur: 0.3, sound: "bubble_pop" },
  { do: "move", target: `bub${k}`, to: [x + 0.15, 2.3, LANE_Z + 0.1], at: at + 0.05, dur: 1.4, ease: "quadOut" },
  { do: "hide", target: `bub${k}`, at: at + 1.35, dur: 0.2 },
];
/** A splash (prop id) at p on the water. */
const splashAt = (id, p, at) => [
  { do: "move", target: id, to: [p[0], 0.02, p[2]], at: Math.max(0, at - 0.03), dur: 0.01 },
  { do: "pop", target: id, at, dur: 0.3, sound: "splash" },
  { do: "hide", target: id, at: at + 0.6, dur: 0.25 },
];
/** The fish leaps out of the water from a to b (both on the water line), up to height h. */
const leap = (a, b, at, dur = 1.1, h = 1.5) => [
  { do: "path", target: "fish", points: [a, [a[0] * 0.7 + b[0] * 0.3, h * 0.8, a[2] * 0.7 + b[2] * 0.3], [(a[0] + b[0]) / 2, h, (a[2] + b[2]) / 2], [a[0] * 0.3 + b[0] * 0.7, h * 0.8, a[2] * 0.3 + b[2] * 0.7], b], at, dur },
  { do: "spin", target: "fish", at: at + 0.1, dur: dur * 0.8 },
];
/** The fish swims along the water to p, facing where it goes. */
const swim = (p, at, dur = 1.4) => ({ do: "path", target: "fish", points: [p], at, dur, face: true });

// ---- Scenes ---------------------------------------------------------------------------------------------------

const scenes = [];

// 0:00 The hook: a fish jumps out of the sea. Splash! Then the ten-bubble tracker and the net.
scenes.push({ id: "hello", title: "Splash! A fish!", beats: [
  beat("h1", 3.2, [
    { do: "camera", position: [1.3, 1.3, 5.0], lookAt: [1.0, 0.75, LANE_Z], fov: 40, dur: 0 },
    foldAll(0, 0),
    leap(START, MID, 0.1, 1.3, 1.7),
    splashAt("splash", [1.6, 0, LANE_Z], 0.2),
    splashAt("splash2", MID, 1.35),
    say("Splash!", { at: 0.3 }),
    word("splash", 0.35),
    { do: "turn", target: "fish", to: FACE_R, at: 1.5, dur: 0.3 },
    { do: "say", who: "fish", text: "Hello!", at: 2.1 },
    { do: "clip", target: "robo", clip: "Jump", at: 0.5 },
  ]),
  beat("h2", 3.2, [
    unword("splash", 0),
    { do: "camera", ...CAM, dur: 1.4 },
    say("A little fish! Let's count to ten with fish bubbles!", { at: 0.1 }),
    showTracker(10, 0.5, 0.14),
    ...[1, 2, 3].map((k) => rise(k, MID[0] + (k - 2) * 0.35, 0.8 + k * 0.25)),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
  beat("h3", 2.6, [
    say("Bubble number ten is a golden surprise!", { at: 0.1 }),
    { do: "pop", target: "qmark", at: 0.4, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot10", at: 0.7, deg: 12, dur: 1 },
    { do: "grow", target: "slot10", to: 1.25, at: 1.3, dur: 0.3 }, { do: "grow", target: "slot10", to: 1, at: 1.7, dur: 0.3 },
  ]),
  beat("h4", 3.4, [
    { do: "camera", ...NET_CAM, dur: 1.2 },
    say("This is my soft net. We catch gently, and then we let go!", { at: 0.1 }),
    { do: "wiggle", target: "net", at: 0.6, deg: 6, dur: 1.2 },
    { do: "look", target: "robo", at: 0.3, to: "net" },
    { do: "look", target: "robo", at: 2.6, to: "ahead" },
  ]),
]});

// Count to five on one hand; a bubble rises from the sea and a tracker bubble fills on every number.
scenes.push({ id: "count5", title: "Count to five", music: false, beats: [
  beat("c5_1", 2.4, [
    { do: "camera", ...VCAM[1], dur: 1.2 },
    swim([MID[0] - 0.4, SWIM_Y, LANE_Z], 0.2, 1.2),
    say("Count to five! Hold up your fingers!", { at: 0.1 }),
    { do: "pop", target: "hand1", at: 0.4, dur: 0.35, sound: false },
    { do: "turn", target: "fish", to: FACE_R, at: 1.5, dur: 0.3 },
  ]),
  beat("c5_2", tuneDur(T.c5), [
    say(L.c5, { tune: T.c5, at: 0.1, caption: false }),
    ...Array.from({ length: 5 }, (_, k) => [
      { do: "caption", text: String(k + 1), style: "count", at: onBeat(k), dur: 0.42 },
      up(k, onBeat(k)),
      rise(k + 1, MID[0] - 1.2 + k * 0.5, onBeat(k)),
      fillSlot(k + 1, `mini${k + 1}`, onBeat(k) + 0.05),
    ]),
    { do: "hop", target: "fish", at: onBeat(4), height: 0.25 },
  ]),
  ...yourTurn({ id: "c5_t", ask: "Your turn! Show me five fingers!", answer: "Five fingers!", praise: "High five!", wordId: "five",
    extra: [{ do: "hide", target: "hand1", at: 0.4, dur: 0.25 }] }),
  // Pop the bubbles: five bubbles float over the sea, 3-2-1, pop them one by one and count.
  beat("pop1", 2.8, [
    { do: "camera", ...VCAM[4], dur: 1.2 },
    say("Five bubbles! Clap to pop them!", { at: 0.1 }),
    ...POPS.map((p, k) => [
      { do: "move", target: `bub${k + 1}`, to: [p[0], 0.2, p[2]], at: 0.2, dur: 0.01 },
      { do: "pop", target: `bub${k + 1}`, at: 0.3 + k * 0.2, dur: 0.3, sound: "bubble_blow" },
      { do: "move", target: `bub${k + 1}`, to: p, at: 0.35 + k * 0.2, dur: 1.2, ease: "quadOut" },
    ]),
  ]),
  beat("pop2", 2.6, [...countdown(0.1), ...POPS.map((_, k) => ({ do: "wiggle", target: `bub${k + 1}`, at: 0.2 + k * 0.3, deg: 10, dur: 0.6 }))]),
  beat("pop3", 3.4, [
    say("Pop! Pop! Pop! Pop! Pop!", { at: 0.1, caption: false }),
    ...POPS.map((_, k) => [
      { do: "hide", target: `bub${k + 1}`, at: 0.2 + k * 0.55, dur: 0.12 },
      { do: "sound", sound: "bubble_pop", at: 0.2 + k * 0.55 },
      { do: "caption", text: String(k + 1), style: "count", at: 0.2 + k * 0.55, dur: 0.45 },
    ]),
    { do: "hop", target: "fish", at: 2.6, height: 0.3 },
  ]),
  beat("pop4", 1.8, [say("Five pops! Hooray!", { at: 0.1 }), { do: "clip", target: "robo", clip: "Jump", at: 0.2 }]),
]});

// Sing: one to five, once I caught a fish alive: the fish hops into the soft net and says hello.
scenes.push({ id: "sing1", title: "Once I caught a fish alive", music: false, beats: [
  beat("s1_1", tuneDur(T.l1), sung(L.l1, T.l1, [
    { do: "camera", ...VCAM[2], dur: 1.0 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    ...Array.from({ length: 5 }, (_, k) => ({ do: "wiggle", target: `slot${k + 1}`, at: onBeat(k), deg: 12, dur: 0.4 })),
    { do: "hop", target: "fish", at: onBeat(1), height: 0.2 }, { do: "hop", target: "fish", at: onBeat(3), height: 0.2 },
  ])),
  beat("s1_2", tuneDur(T.l2), sung(L.l2, T.l2, [
    { do: "camera", ...NET_CAM, dur: 1.0 },
    { do: "wiggle", target: "net", at: onBeat(0), deg: 8, dur: 0.8 },
    leap([MID[0] - 0.4, SWIM_Y, LANE_Z], IN_NET, onBeat(1), 1.2, 1.6),
    splashAt("splash", [MID[0] - 0.4, 0, LANE_Z], onBeat(1) + 0.05),
    { do: "turn", target: "fish", to: FACE_R, at: onBeat(1) + 1.25, dur: 0.2 },
    { do: "wiggle", target: "net", at: onBeat(4), deg: 6, dur: 0.8 },
    { do: "sound", sound: "boing", at: onBeat(3.5), volume: 0.5 },
  ])),
  beat("s1_3", 3.2, [
    say("Got you, gently! Hello, little fish!", { at: 0.1 }),
    { do: "feel", target: "fish", feeling: "joyful", at: 0.3 },
    { do: "say", who: "fish", text: "Blub blub! Hello, Robo!", at: "after" },
    { do: "wiggle", target: "fish", at: 1.6, deg: 12, dur: 1 },
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
  ...yourTurn({ id: "s1_t", ask: "Say hello to the fish! Wave!", answer: "Hello!", answerWho: "fish", praise: "The fish likes you!", wordId: "hello" }),
]});

// Count to ten on two hands; bubbles six to ten fill, the golden tenth one too.
scenes.push({ id: "count10", title: "Count to ten", music: false, beats: [
  beat("c10_1", 2.4, [
    { do: "camera", ...VCAM[3], dur: 1.2 },
    say("Now count to ten! Hold up all your fingers!", { at: 0.1 }),
    foldAll(0.05),
    { do: "pop", target: "hand1", at: 0.4, dur: 0.35, sound: false },
    { do: "pop", target: "hand2", at: 0.5, dur: 0.35, sound: false },
  ]),
  beat("c10_2", tuneDur(T.c10), [
    say(L.c10, { tune: T.c10, at: 0.1, caption: false }),
    ...Array.from({ length: 10 }, (_, k) => [
      { do: "caption", text: String(k + 1), style: "count", at: onBeat(cb(k)), dur: 0.42 },
      up(k, onBeat(cb(k))),
      rise(k + 1, -1.7 + k * 0.42, onBeat(cb(k))),
      k < 5 ? { do: "wiggle", target: `slot${k + 1}`, at: onBeat(cb(k)), deg: 12, dur: 0.4 } : null,
      k >= 5 && k < 9 ? fillSlot(k + 1, `mini${k + 1}`, onBeat(cb(k)) + 0.05) : null,
    ]),
    { do: "hide", target: "qmark", at: onBeat(9) - 0.1, dur: 0.15 },
    { do: "pop", target: "mini10", at: onBeat(9) + 0.05, dur: 0.45, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot10", at: onBeat(9) + 0.1, deg: 14, dur: 1 },
    { do: "burst", target: "confetti", at: onBeat(9) + 0.1, dur: 2, sound: false },
    { do: "wiggle", target: "fish", at: onBeat(9), deg: 12, dur: 0.8 },
  ]),
  ...yourTurn({ id: "c10_t", ask: "Your turn! Show me ten fingers!", answer: "Ten! Wiggle them!", praise: "Ten fingers! Hooray!", wordId: "ten",
    extra: [{ do: "hide", target: "hand1", at: 0.4, dur: 0.25 }, { do: "hide", target: "hand2", at: 0.45, dur: 0.25 }] }),
]});

// Sing: six to ten, then I let it go again: the fish hops out of the net into the sea. Wave bye-bye.
scenes.push({ id: "sing2", title: "Then I let it go again", music: false, beats: [
  beat("s2_1", tuneDur(T.l3), sung(L.l3, T.l3, [
    { do: "camera", ...NET_CAM, dur: 1.0 },
    ...Array.from({ length: 5 }, (_, k) => ({ do: "wiggle", target: `slot${k + 6}`, at: onBeat(k), deg: 12, dur: 0.4 })),
    { do: "wiggle", target: "fish", at: onBeat(0.5), deg: 10, dur: 0.8 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
  ])),
  beat("s2_2", tuneDur(T.l4), sung(L.l4, T.l4, [
    { do: "camera", ...CAM, dur: 1.2 },
    { do: "wiggle", target: "net", at: onBeat(0.5), deg: 8, dur: 0.8 },
    leap(IN_NET, MID, onBeat(1), 1.2, 1.6),
    splashAt("splash", MID, onBeat(1) + 1.2),
    { do: "turn", target: "fish", to: FACE_R, at: onBeat(1) + 1.3, dur: 0.2 },
    { do: "feel", target: "fish", feeling: "joyful", at: onBeat(3) },
  ])),
  ...yourTurn({ id: "s2_t", ask: "Let it go! Wave bye-bye to the fish!", answer: "Bye-bye! Thank you!", answerWho: "fish", praise: "So kind and gentle!", wordId: "bye" }),
]});

// Sing (original): why did you let it go? It wanted to swim home: the fish family pops up far out to the right.
scenes.push({ id: "home", title: "It wanted to swim home", music: false, beats: [
  beat("s3_1", tuneDur(T.l5), sung(L.l5, T.l5, [
    { do: "camera", ...VCAM[4], dur: 1.0 },
    { do: "look", target: "robo", at: 0.2, to: "fish" },
    { do: "wiggle", target: "fish", at: onBeat(3), deg: 10, dur: 0.8 },
  ])),
  beat("s3_2", tuneDur(T.l6), sung(L.l6, T.l6, [
    { do: "camera", position: [2.0, 1.7, 3.6], lookAt: [3.4, 0.25, -4.2], fov: 40, dur: 1.2 },
    { do: "move", target: "fish_mum", to: HOME, at: 0.15, dur: 0.01 },
    { do: "show", target: "fish_mum", at: 0.2, dur: 0.3 },
    { do: "move", target: "fish_baby", to: [HOME[0] + 0.9, SWIM_Y + 0.05, HOME[2] + 0.2], at: 0.15, dur: 0.01 },
    { do: "show", target: "fish_baby", at: 0.3, dur: 0.3 },
    { do: "hop", target: "fish_mum", at: onBeat(2), height: 0.3 },
    { do: "hop", target: "fish_baby", at: onBeat(2.5), height: 0.3 },
    swim([3.2, SWIM_Y, -4.4], onBeat(3), 1.6),
    { do: "look", target: "robo", at: 0.2, to: "ahead" },
  ])),
  beat("s3_3", 3.0, [
    say("Home to Mummy Fish and Baby Fish!", { at: 0.1 }),
    word("home", 0.2),
    { do: "turn", target: "fish", to: FACE_R, at: 0.1, dur: 0.3 },
    { do: "say", who: "fish_baby", text: "Yay!", at: 1.9 },
    { do: "wiggle", target: "fish_mum", at: 1.0, deg: 10, dur: 1 },
    { do: "hop", target: "fish_baby", at: 1.9, height: 0.3 },
  ]),
]});

// Sing (original): which way did it swim? To the left, to the right: the arrows show which way is which.
scenes.push({ id: "whichway", title: "To the left, to the right", music: false, beats: [
  beat("s4_0", 1.6, [
    unword("home", 0),
    { do: "camera", ...CAM, dur: 1.2 },
    swim(MID, 0.1, 1.4),
    // The net is put away and Robo steps back to the left, so the fish has room to swim both ways.
    { do: "hide", target: "net", at: 0.1, dur: 0.4 },
    { do: "clip", target: "robo", clip: "Walking", at: 0.1 },
    { do: "move", target: "robo", to: ROBO_GAME, at: 0.1, dur: 1.3 },
    { do: "clip", target: "robo", clip: "Idle", at: 1.4 },
  ]),
  beat("s4_1", tuneDur(T.l7), sung(L.l7, T.l7, [
    { do: "turn", target: "fish", to: [0, 0, 0], at: 0.1, dur: 0.3 },
    { do: "wiggle", target: "fish", at: onBeat(2), deg: 10, dur: 0.8 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
  ])),
  beat("s4_2", tuneDur(T.l8), sung(L.l8, T.l8, [
    swim([MID[0] - 1.6, SWIM_Y, LANE_Z], onBeat(0), 1.0),
    { do: "pop", target: "arrow_l", at: onBeat(0.5), dur: 0.35, sound: "pop" }, { do: "show", target: "lbl_l", at: onBeat(1), dur: 0.25 },
    swim([MID[0] + 1.6, SWIM_Y, LANE_Z], onBeat(2), 1.2),
    { do: "pop", target: "arrow_r", at: onBeat(2.5), dur: 0.35, sound: "pop" }, { do: "show", target: "lbl_r", at: onBeat(3), dur: 0.25 },
    swim(MID, onBeat(4.2), 1.0),
    { do: "turn", target: "fish", to: [0, 0, 0], at: onBeat(5.5), dur: 0.3 },
    { do: "wiggle", target: "fish#tail", at: onBeat(5), deg: 30, dur: 1.2 },
  ])),
  beat("s4_3", 3.4, [
    say("This way is left! And this way is right!", { at: 0.1 }),
    { do: "wiggle", target: "arrow_l", at: 0.3, deg: 12, dur: 0.9 }, { do: "grow", target: "arrow_l", to: 1.2, at: 0.3, dur: 0.3 }, { do: "grow", target: "arrow_l", to: 1, at: 1.1, dur: 0.3 },
    { do: "wiggle", target: "arrow_r", at: 1.9, deg: 12, dur: 0.9 }, { do: "grow", target: "arrow_r", to: 1.2, at: 1.9, dur: 0.3 }, { do: "grow", target: "arrow_r", to: 1, at: 2.7, dur: 0.3 },
  ]),
  beat("s4_w1", 2.6, [
    say("Wiggle your hand like a fish! Wiggle, wiggle!", { at: 0.1 }),
    { do: "wiggle", target: "fish#tail", at: 0.3, deg: 35, dur: 2.2 },
    { do: "spin", target: "fish", at: 1.2, dur: 1.0 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
  ]),
  beat("s4_w2", 2.0, [
    { do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 },
    { do: "wiggle", target: "fish", at: 0.2, deg: 12, dur: 1.6 },
    say("Swish, swish!", { at: 0.6 }),
  ]),
  beat("s4_4", 0.8, [
    { do: "hide", target: "arrow_l", at: 0.1, dur: 0.25 }, { do: "hide", target: "lbl_l", at: 0.1, dur: 0.2 },
    { do: "hide", target: "arrow_r", at: 0.15, dur: 0.25 }, { do: "hide", target: "lbl_r", at: 0.15, dur: 0.2 },
  ]),
]});

// The which-way game: the fish swims, "Left or right? Point!", 3-2-1, the arrow pops.
const ROUNDS = [
  { dir: "left", to: LEFT, cam: VCAM[0] },
  { dir: "right", to: RIGHT, cam: VCAM[1] },
  { dir: "left", to: LEFT, cam: VCAM[2] },
];
ROUNDS.forEach((r, i) => {
  const L1 = r.dir === "left";
  const arrow = L1 ? "arrow_l" : "arrow_r";
  const lbl = L1 ? "lbl_l" : "lbl_r";
  scenes.push({ id: `way${i + 1}`, title: `Which way? ${L1 ? "Left" : "Right"}!`, beats: [
    beat(`w${i + 1}a`, 2.8, [
      { do: "camera", ...r.cam, dur: 1.0 },
      say(i === 0 ? "Watch the fish! Which way does it swim?" : "Watch! Which way now?", { at: 0.1 }),
      swim(r.to, 0.6, 1.8),
      { do: "sound", sound: "whoosh", at: 0.7, volume: 0.4 },
      { do: "wiggle", target: "fish#tail", at: 0.7, deg: 30, dur: 1.6 },
    ]),
    beat(`w${i + 1}b`, 2.8, [
      say("Left or right? Point!", { at: 0.1 }),
      { do: "turn", target: "fish", to: [0, 0, 0], at: 0.1, dur: 0.3 },
      { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    ]),
    beat(`w${i + 1}c`, 2.6, [...countdown(0.1), { do: "wiggle", target: "fish", at: 0.4, deg: 8, dur: 1.6 }]),
    beat(`w${i + 1}d`, 3.0, [
      { do: "pop", target: arrow, at: 0.1, dur: 0.35, sound: "ding" }, { do: "show", target: lbl, at: 0.2, dur: 0.25 },
      say(L1 ? "Left! The fish swam to the left!" : "Right! The fish swam to the right!", { at: 0.2 }),
      { do: "hop", target: "fish", at: 0.5, height: 0.3 },
      { do: "sound", sound: "splash", at: 0.9, volume: 0.4 },
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.6 },
    ]),
    beat(`w${i + 1}e`, 0.9, [
      { do: "hide", target: arrow, at: 0.2, dur: 0.25 }, { do: "hide", target: lbl, at: 0.2, dur: 0.2 },
    ]),
  ]});
});

// Recap quiz: which fish is on the left? Mummy Fish swims over to play.
const QL = [0.3, SWIM_Y, LANE_Z + 0.1];
const QR = [2.9, SWIM_Y, LANE_Z + 0.1];
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 2.8, [
    { do: "camera", ...CAM, dur: 1.2 },
    say("Mummy Fish wants to play! Point to it!", { at: 0.1 }),
    swim(QL, 0.2, 1.6),
    { do: "path", target: "fish_mum", points: [[2.6, SWIM_Y, -3.0], QR], at: 0.2, dur: 2.2, face: true },
  ]),
  ...quizRound({ id: "q1", q: "Which fish is on the left?", left: "fish", right: "fish_mum", answer: "fish", spots: [QL, QR], yes: "Yes! The orange fish is on the left!" }),
  ...quizRound({ id: "q2", q: "And which fish is on the right?", left: "fish", right: "fish_mum", answer: "fish_mum", spots: [QL, QR], yes: "Yes! Mummy Fish is on the right!" }),
]});

// Count all the bubbles: the tracker wiggles one by one, sung up the scale; how many? Ten!
scenes.push({ id: "recount", title: "Count all the bubbles", music: false, beats: [
  beat("rc1", 2.2, [
    say("Let's count all our bubbles!", { at: 0.1 }),
    { do: "camera", ...CAM, dur: 1.2 },
    foldAll(0.05, 0),
    { do: "pop", target: "hand1", at: 0.4, dur: 0.35, sound: false },
    { do: "pop", target: "hand2", at: 0.5, dur: 0.35, sound: false },
  ]),
  beat("rc2", tuneDur(T.c10), [
    say(L.c10, { tune: T.c10, at: 0.1, caption: false }),
    ...Array.from({ length: 10 }, (_, k) => [
      { do: "caption", text: String(k + 1), style: "count", at: onBeat(cb(k)), dur: 0.42 },
      up(k, onBeat(cb(k))),
      { do: "grow", target: `slot${k + 1}`, to: 1.3, at: onBeat(cb(k)), dur: 0.15 },
      { do: "grow", target: `slot${k + 1}`, to: 1, at: onBeat(cb(k)) + 0.3, dur: 0.2 },
      { do: "sound", sound: "bubble_pop", at: onBeat(cb(k)), volume: 0.5 },
    ]),
  ]),
  beat("rc3", 2.4, [
    say("Ten bubbles! You counted to ten!", { at: 0.1 }),
    { do: "hide", target: "hand1", at: 1.6, dur: 0.25 }, { do: "hide", target: "hand2", at: 1.65, dur: 0.25 },
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.3 },
    { do: "sound", sound: "sparkle", at: 0.2, volume: 0.6 },
  ]),
]});

// Last chorus: the whole song, then bye-bye.
const chorus = [
  ["z1", "l1", (a) => [...Array.from({ length: 5 }, (_, k) => ({ do: "wiggle", target: `slot${k + 1}`, at: onBeat(k), deg: 12, dur: 0.4 })), { do: "clip", target: "robo", clip: "Dance", at: 0.1 }]],
  ["z2", "l2", () => [leap(QL, [-0.4, SWIM_Y, LANE_Z], onBeat(1), 1.1, 1.3), splashAt("splash", [-0.4, 0, LANE_Z], onBeat(1) + 1.1)]],
  ["z3", "l3", () => Array.from({ length: 5 }, (_, k) => ({ do: "wiggle", target: `slot${k + 6}`, at: onBeat(k), deg: 12, dur: 0.4 }))],
  ["z4", "l4", () => [{ do: "hop", target: "fish_mum", at: onBeat(2), height: 0.3 }, { do: "hop", target: "fish", at: onBeat(3), height: 0.3 }]],
  ["z5", "l5", () => [{ do: "turn", target: "fish", to: [0, 0, 0], at: 0.2, dur: 0.3 }, { do: "wiggle", target: "fish", at: onBeat(2), deg: 10, dur: 0.8 }]],
  ["z6", "l6", () => [{ do: "show", target: "fish_baby", at: 0.1, dur: 0.2 }, { do: "hop", target: "fish_baby", at: onBeat(3), height: 0.3 }]],
  ["z7", "l7", () => [{ do: "wiggle", target: "fish#tail", at: onBeat(1), deg: 30, dur: 1.2 }]],
  ["z8", "l8", () => [
    swim([-1.8, SWIM_Y, LANE_Z], onBeat(0), 1.0), { do: "pop", target: "arrow_l", at: onBeat(0.5), dur: 0.35, sound: "pop" },
    swim([1.0, SWIM_Y, LANE_Z], onBeat(2), 1.2), { do: "pop", target: "arrow_r", at: onBeat(2.5), dur: 0.35, sound: "pop" },
    { do: "burst", target: "confetti", at: onBeat(5), dur: 2.4 },
  ]],
];
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("z0", 1.8, [
    say("Everybody sing!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    { do: "camera", position: [0.2, 2.1, 8.8], lookAt: [0, 0.95, -0.8], fov: 40, dur: 1.6 },
    { do: "path", target: "fish_mum", points: [[2.8, SWIM_Y, -2.8]], at: 0.2, dur: 1.4, face: true },
    { do: "move", target: "fish_baby", to: [3.8, SWIM_Y + 0.05, -2.6], at: 0.1, dur: 0.01 },
  ]),
  ...chorus.map(([id, k, f]) => beat(id, tuneDur(T[k]), sung(L[k], T[k], f()))),
  beat("z9", 3.4, [
    { do: "hide", target: "arrow_l", at: 0.1, dur: 0.25 }, { do: "hide", target: "arrow_r", at: 0.1, dur: 0.25 },
    swim([0.4, SWIM_Y, LANE_Z], 0.1, 0.8),
    { do: "turn", target: "fish", to: [0, 0, 0], at: 1.0, dur: 0.3 },
    say("Bye-bye, little fish! Bye-bye, friends!", { at: 0.2 }),
    { do: "say", who: "fish", text: "Blub blub, bye-bye!", at: "after" },
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "wiggle", target: "fish_mum", at: 0.5, deg: 8, dur: 1.5 }, { do: "hop", target: "fish_baby", at: 1.2, height: 0.3 },
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.6 },
    { do: "camera", position: [0.0, 2.6, 11], lookAt: [0.0, 1.1, -0.8], fov: 40, dur: 3.2 },
  ]),
]});

// ---- Meta -----------------------------------------------------------------------------------------------------

const description = "Count to ten with a little fish at the seaside! Sing 1, 2, 3, 4, 5, Once I Caught a Fish Alive with Robo: a fish jumps out of the sea, splash! We count to five and then to ten on our fingers while bubbles float up out of the water and the ten-bubble tracker fills. The fish hops into Robo's soft net to say hello, and then we let it go again and wave bye-bye. It swims home to Mummy Fish and Baby Fish. Then play the which-way game: the fish swims to the left or to the right, point and count 3, 2, 1! A gentle ending: no one gets hurt, and the fish swims home.";
const thumbSea = [
  { id: "sea", kind: "shape", shape: "plate", color: "pond", material: "glossy", at: [0, 0.012, -6], scale: [30, 1, 11] },
  { id: "foam", kind: "shape", shape: "plate", color: "white", material: "matte", at: [0, 0.016, -0.55], scale: [30, 1, 0.14] },
];
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "1, 2, 3, 4, 5, Once I Caught a Fish Alive", episode: "br19", seed: 319,
    skills: ["count_to_10_k", "count_to_5_prek", "position_words_prek"],
    cast,
    youtube: {
      title: "1, 2, 3, 4, 5, Once I Caught a Fish Alive 🐟 Count to 10, Left and Right | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: counting from 1 to 10 on their fingers (to five on one hand, to ten on two), the numbers in order, and left and right.\n\nSing at home: hold up a finger for each number, wiggle your hand like a fish, and when the fish swims away, point and say "left!" or "right!" together. Then wave bye-bye as you let your pretend fish go. The first four lines are the traditional public-domain rhyme; the gentle ending (the fish swims home, to the left and to the right) is original, written for Toy Box Friends in place of the old finger-biting lines.\n\n${YT_TAIL}`,
      tags: ["once i caught a fish alive", "1 2 3 4 5 once i caught a fish alive", "counting to 10", "count to ten", "left and right for kids", "nursery rhymes", "numbers for toddlers", "fish song", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "splash", title: "1, 2, 3, 4, 5!", subtitle: "Once I caught a fish alive", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "beach",
        camera: { position: [1.4, 1.4, 6.0], lookAt: [2.0, 0.9, -0.8], fov: 38 },
        objects: [
          ...thumbSea,
          { id: "fish", kind: "critter", species: "fish", at: [3.5, 1.0, -1.4], size: 0.85, rotation: [0, 60, 20], feeling: "joyful" },
          { id: "splash", kind: "prop", model: "splash_drops", color: "sky", at: [3.2, 0.02, -1.4], size: 1.8 },
          { id: "robo", kind: "character", character: "robot", at: [4.9, 0, 0.3], rotation: [0, -30, 0], clip: "Wave", feeling: "happy" },
          { id: "net", kind: "prop", model: "fishing_net", at: [4.2, 0, 0.9], size: 1.1, rotation: [0, 200, 0] },
          { id: "b1", kind: "prop", model: "bubble", color: "sky", at: [2.7, 1.6, -1.2], size: 0.32 },
          { id: "b2", kind: "prop", model: "bubble", color: "teal", at: [3.0, 2.05, -1.1], size: 0.24 },
          { id: "b3", kind: "prop", model: "bubble", color: "mint", at: [4.2, 1.85, -1.3], size: 0.28 },
        ] },
      { name: "leftright", title: "LEFT OR RIGHT?", subtitle: "Count to 10 with Fish!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "beach",
        camera: { position: [1.6, 1.3, 6.0], lookAt: [2.2, 0.8, -0.8], fov: 38 },
        objects: [
          ...thumbSea,
          { id: "fish", kind: "critter", species: "fish", at: [3.6, -0.25, -1.4], size: 0.9, rotation: [0, -20, 0], feeling: "joyful" },
          { id: "fish_mum", kind: "critter", species: "fish", color: "blue", at: [5.2, -0.3, -2.0], size: 0.8, rotation: [0, -40, 0], feeling: "happy" },
          { id: "al", kind: "prop", model: "arrow_icon", color: "green", at: [3.4, 1.55, -1.0], size: 0.85, rotation: [0, 0, 180] },
          { id: "ar", kind: "prop", model: "arrow_icon", color: "orange", at: [4.8, 1.55, -1.0], size: 0.85 },
          { id: "b1", kind: "prop", model: "bubble", color: "sky", at: [4.1, 0.75, -1.3], size: 0.26 },
        ] },
    ],
  }),
  stage: { preset: "beach" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "once_i_caught_a_fish");
