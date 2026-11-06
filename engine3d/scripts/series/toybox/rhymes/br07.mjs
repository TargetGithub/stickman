// Builds ../br07_itsy_bitsy_spider.json: Itsy Bitsy Spider: Rain and Sun. The traditional verse (public domain)
// plus three original verses: Itsy the friendly spider climbs the water spout, the big green tree and a red
// umbrella; the rain washes her down softly (she slides, smiling: "Wheee!"), the sun dries it up, a grey cloud
// comes, and at the end a rainbow. Teaches the weather words rain, sun, cloud, rainbow and up and down.
// Run: node br07.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  say, beat, sung, onBeat, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, fillSlot, yourTurn, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// The Itsy Bitsy Spider (traditional, public domain), in G. One note per syllable.
const T = {
  climb: "D4:0.5 G4 G4:0.5 G4 A4:0.5 B4 B4:0.5 B4 A4:0.5 G4 A4:0.5 B4 G4:2", //   The it-sy bit-sy spi-der climbed up the wa-ter spout.
  down: "B4:1.5 B4:0.5 C5 D5:1.5 D5 C5:0.5 B4 C5:0.5 D5 B4:2", //                  Down came the rain and washed the spi-der out.
  sun: "G4:1.5 G4:0.5 A4 B4:1.5 B4 A4:0.5 G4 A4:0.5 B4 G4:2", //                   Out came the sun and dried up all the rain,
  again: "D4:0.5 D4:0.5 G4 G4:0.5 G4 A4:0.5 B4 B4:0.5 B4 A4:0.5 G4 A4:0.5 B4 G4:2", // And the it-sy bit-sy spi-der climbed up the spout a-gain.
};
// Verse 1 is the traditional rhyme; verses 2-4 are original words on the same tune (same syllable counts).
const V = [
  ["The itsy bitsy spider climbed up the water spout.", "Down came the rain and washed the spider out.", "Out came the sun and dried up all the rain,", "And the itsy bitsy spider climbed up the spout again."],
  ["The itsy bitsy spider climbed up the big green tree.", "Down came the rain, as wet as wet can be.", "Out came the sun, so yellow and so round,", "And the itsy bitsy spider climbed up, up, off the ground!"],
  ["The itsy bitsy spider climbed up the umbrella.", "Then came a cloud, a fluffy cloud of grey.", "Drip, drop, drip, drop, the spider slid away,", "And the itsy bitsy spider stayed dry and warm today."],
  ["The itsy bitsy spider climbed up the spout once more.", "Down came the rain, and splash! Down to the floor!", "Out came the sun, a rainbow came out too,", "And the itsy bitsy spider climbed up to see the view!"],
];

// ---- Layout (garden stage) -------------------------------------------------------------------------------------
const SX = -0.75; // the water spout, against the house's front wall
const SZ = -0.86;
const CLIMB_Z = -0.32; // the spider climbs in front of the pipe
const SP_LOW = [SX, 0.42, CLIMB_Z];
const SP_TOP = [SX, 1.45, CLIMB_Z];
const SP_BASE = [SX, 0, -0.1];
const OUT = [SX + 0.4, 0, 0.45]; // where the spout washes her out (the puddle)
const TREE = [3.4, 0, -1.5];
const TR_BASE = [3.4, 0, -0.6];
const TR_LOW = [3.4, 0.9, -0.8];
const TR_TOP = [3.4, 3.3, -1.4];
const TR_PATH = [[3.4, 1.45, -0.25], [3.4, 2.2, -0.1], [3.4, 2.95, -0.55]]; // round the front of the crown
const UMB = [1.9, 0, 0.6];
const UM_EDGE0 = [3.05, 0, 0.85];
const UM_PATH = [[2.8, 0.6, 0.8], [2.7, 1.15, 0.75], [2.35, 1.6, 0.68]];
const UM_TOP = [1.95, 1.74, 0.64];
const UM_UNDER = [1.72, 0, 1.15];
const HOME = [0.3, 0, 0.6];
const SUN_AT = [-3.4, 4.0, -3.6];
const STORM_OFF = [9.5, 4.4, -3];
const ROBO = [-4.2, 0, 1.0];

const SPOUT_CAM = { position: [0.5, 1.45, 4.0], lookAt: [-0.6, 1.0, -0.5], fov: 40 };
const TREE_CAM = { position: [2.2, 2.1, 7.2], lookAt: [3.2, 1.75, -1.0], fov: 40 };
const UMB_CAM = { position: [0.9, 1.4, 5.0], lookAt: [2.1, 0.95, 0.5], fov: 40 };
const WIDE = { position: [-0.4, 2.4, 11.2], lookAt: [-0.2, 1.9, -1.0], fov: 40 };
const CAM = { position: [0, 2.1, 9.6], lookAt: [0, 1.4, -0.6], fov: 40 };

// ---- Objects --------------------------------------------------------------------------------------------------
const objects = [
  { id: "house", kind: "prop", model: "house", at: [-1.75, 0, -2.1], size: 2.5 },
  { id: "spout", kind: "prop", model: "water_spout", at: [SX, 0, SZ], size: 0.92 },
  { id: "gush", kind: "prop", model: "spout_gush", parent: "spout", at: [0, 0.14, 0.36], size: 1.2, hidden: true },
  { id: "puddle", kind: "shape", shape: "disc", color: "pond", material: "glossy", at: [SX + 0.3, 0.006, 0.32], scale: [1.6, 0.02, 0.95], hidden: true },
  { id: "tree", kind: "prop", model: "tree", at: TREE, size: 1.5 },
  { id: "umbrella", kind: "prop", model: "umbrella", at: UMB, size: 1.4, rotation: [0, -20, 0] },
  { id: "bush", kind: "prop", model: "bush", at: [5.6, 0, -0.6], size: 0.9 },
  { id: "flower1", kind: "prop", model: "flower", at: [-3.0, 0, -0.4], size: 0.7 },
  { id: "flower2", kind: "prop", model: "flower", color: "yellow", at: [2.4, 0, -0.6], size: 0.6 },
  { id: "flower3", kind: "prop", model: "flower", color: "purple", at: [-2.4, 0, 0.1], size: 0.55 },
  { id: "sun", kind: "prop", model: "sun", at: SUN_AT, size: 1.0 },
  { id: "rays", kind: "prop", model: "sun_rays", parent: "sun", at: [0, 0, -0.2], size: 1.05, hidden: true },
  { id: "cloud1", kind: "prop", model: "cloud", at: [2.2, 4.5, -4.2], size: 1.2 },
  { id: "cloud2", kind: "prop", model: "cloud", at: [-0.6, 4.8, -4.8], size: 0.9 },
  { id: "storm", kind: "prop", model: "rain_cloud", at: STORM_OFF, size: 1.7 },
  { id: "rainbow", kind: "prop", model: "rainbow", at: [0.9, 0.8, -5.6], size: 2.9, hidden: true },
  { id: "rain", kind: "weather", type: "rain", at: [0, 0, -0.4], area: [15, 7], hidden: true },
  { id: "drop1", kind: "shape", shape: "drop", color: "blue", material: "water", at: [0.3, 3.2, 0.72], size: 0.26, hidden: true },
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, 30, 0], feeling: "happy" },
  { id: "spider", kind: "critter", species: "spider", size: 1.0, at: HOME, feeling: "happy" },
  // quiz props (hidden until the quiz)
  { id: "q_sun", kind: "prop", model: "sun", at: [-1.0, 1.35, 3.2], size: 0.5, hidden: true },
  { id: "q_rain", kind: "prop", model: "rain_cloud", at: [1.0, 1.35, 3.2], size: 0.55, hidden: true },
  { id: "q_rainbow", kind: "prop", model: "rainbow", at: [-1.0, 0.85, 3.2], size: 0.6, hidden: true },
  { id: "q_cloud", kind: "prop", model: "cloud", at: [1.0, 1.35, 3.2], size: 0.55, hidden: true },
  { id: "confetti", kind: "confetti", at: [0, 3.4, 0.5] },
];
// HUD: four weather slots (rain, sun, cloud, rainbow), "?" on the rainbow, the counting hand for rain fingers,
// the 3-2-1 countdown and the word bubble.
objects.push(...trackerObjects(4, { colors: ["blue", "orange", "teal", "pink"] }));
objects.push(
  { id: "mini1", kind: "prop", model: "rain_cloud", hud: true, parent: "slot1", at: [0, -0.25, 0.3], size: 0.44, hidden: true },
  { id: "mini2", kind: "prop", model: "sun", hud: true, parent: "slot2", at: [0, -0.25, 0.3], size: 0.42, hidden: true },
  { id: "mini3", kind: "prop", model: "cloud", hud: true, parent: "slot3", at: [0, -0.25, 0.3], size: 0.44, hidden: true },
  { id: "mini4", kind: "prop", model: "rainbow", hud: true, parent: "slot4", at: [0, -0.5, 0.3], size: 0.33, hidden: true },
  { id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot4", at: [0, -0.26, 0.2], size: 0.42, hidden: true },
  { id: "hand", kind: "prop", model: "hand", hud: true, at: [6.9, -3.4, 0.5], size: 1.55, hidden: true },
);
objects.push(...countdownObjects());
const bubble = bubbleObjects([
  { id: "rain", text: "RAIN", color: "blue" }, { id: "sun", text: "SUN", color: "orange" }, { id: "cloud", text: "CLOUD", color: "grey" },
  { id: "rainbow", text: "RAINBOW", color: "purple" }, { id: "up", text: "UP!", color: "green" }, { id: "down", text: "DOWN!", color: "blue" },
]);
for (const o of bubble) if (o.id === "w_rainbow") o.size = 0.25;
objects.push(...bubble);

const cast = { spider: { voice: "squeaky", pitch: 1.2, speed: 1.05 } };

// ---- Helpers --------------------------------------------------------------------------------------------------
const RAINY = (at = 0.1) => [
  { do: "lights", rig: "overcast", background: "rain_sky", at, dur: 0.9 },
  { do: "hide", target: "rays", at, dur: 0.3 },
  { do: "hide", target: "sun", at, dur: 0.6 },
  { do: "show", target: "rain", at: at + 0.3, dur: 0.3 },
  { do: "sound", sound: "rain", at: at + 0.3, volume: 0.45 },
];
const SUNNY = (at = 0.1, stormTo = STORM_OFF) => [
  { do: "hide", target: "rain", at, dur: 0.3 },
  { do: "move", target: "storm", to: stormTo, at, dur: 1.4, ease: "sineInOut" },
  { do: "lights", rig: "soft_day", background: "sky", at, dur: 1.0 },
  { do: "pop", target: "sun", at: at + 0.3, dur: 0.5, sound: "magic_sparkle" },
  { do: "show", target: "rays", at: at + 0.5, dur: 0.5 },
  { do: "spin", target: "rays", axis: "z", turns: 0.25, at: at + 0.5, dur: 2.2, ease: "linear" },
];
const legs = (at, n = 3, gap = 0.4) => Array.from({ length: n }, (_, k) => [
  { do: "wiggle", target: "spider#legs_front", at: at + k * gap, deg: 16, dur: 0.38 },
  { do: "wiggle", target: "spider#legs_back", at: at + k * gap + 0.12, deg: 16, dur: 0.38 },
]);
/** Up the spout from where she stands on the ground (from), at t0; about 2.1 s. */
const upSpout = (from, t0) => [
  from === SP_BASE ? null : { do: "path", target: "spider", points: [from, SP_BASE], dur: 0.5, at: t0, face: true },
  { do: "turn", target: "spider", to: [0, 0, 0], at: t0 + 0.5, dur: 0.2 },
  { do: "move", target: "spider", to: SP_LOW, at: t0 + 0.5, dur: 0.25 },
  { do: "move", target: "spider", to: SP_TOP, at: t0 + 0.78, dur: 1.3, ease: "sineInOut" },
  { do: "sound", sound: "footstep_soft", at: t0 + 0.8, volume: 0.45 },
  legs(t0 + 0.8, 3),
];
/** Washed down the spout and out onto the puddle, smiling (about 1.6 s from t0). */
const washDown = (t0) => [
  { do: "feel", target: "spider", feeling: "joyful", at: t0 },
  { do: "move", target: "spider", to: SP_LOW, at: t0, dur: 0.7, ease: "quadIn" },
  { do: "sound", sound: "slide_whistle", at: t0, volume: 0.35 },
  { do: "show", target: "puddle", at: t0, dur: 0.4 },
  { do: "grow", target: "puddle", to: 1, at: t0, dur: 0.1 },
  { do: "show", target: "gush", at: t0 + 0.55, dur: 0.25 },
  { do: "path", target: "spider", points: [SP_LOW, [SX + 0.1, 0.1, -0.02], OUT], dur: 0.55, at: t0 + 0.72 },
  { do: "sound", sound: "splash", at: t0 + 1.2, volume: 0.6 },
  { do: "spin", target: "spider", at: t0 + 0.75, dur: 0.6 },
];
/** The puddle dries up and the gush stops. */
const dryUp = (at) => [
  { do: "hide", target: "gush", at, dur: 0.3 },
  { do: "grow", target: "puddle", to: 0.05, at: at + 0.3, dur: 1.1 },
  { do: "hide", target: "puddle", at: at + 1.4, dur: 0.15 },
  { do: "sound", sound: "sparkle", at: at + 0.6, volume: 0.5 },
];
/** Up the tree from the ground in front of it (from), at t0; about 2.4 s. */
const upTree = (from, t0) => [
  from === TR_BASE ? null : { do: "path", target: "spider", points: [from, TR_BASE], dur: 0.4, at: t0, face: true },
  { do: "turn", target: "spider", to: [0, 0, 0], at: t0 + 0.4, dur: 0.2 },
  { do: "move", target: "spider", to: TR_LOW, at: t0 + 0.4, dur: 0.7, ease: "sineInOut" },
  { do: "path", target: "spider", points: [TR_LOW, ...TR_PATH, TR_TOP], dur: 1.2, at: t0 + 1.12 },
  legs(t0 + 0.45, 5, 0.38),
];
/** Slide down round the front of the crown to the ground (about 1.4 s). */
const downTree = (t0, to = TR_BASE) => [
  { do: "feel", target: "spider", feeling: "joyful", at: t0 },
  { do: "path", target: "spider", points: [TR_TOP, ...[...TR_PATH].reverse(), [3.4, 0.6, -0.2], to], dur: 1.3, at: t0 },
  { do: "sound", sound: "slide_whistle", at: t0, volume: 0.35 },
  { do: "sound", sound: "land", at: t0 + 1.3, volume: 0.5 },
];

// ---- Scenes ---------------------------------------------------------------------------------------------------
const scenes = [];

// 0:00 The hook: plop! A raindrop lands on Itsy. "Uh-oh! Rain!"
scenes.push({ id: "hello", title: "Uh-oh! Rain!", beats: [
  beat("h1", 2.8, [
    { do: "camera", position: [0.65, 1.0, 3.7], lookAt: [0.3, 0.45, 0.5], fov: 40, dur: 0 },
    { do: "show", target: "drop1", at: 0.15, dur: 0.15 },
    { do: "move", target: "drop1", to: [0.3, 0.64, 0.72], at: 0.2, dur: 0.6, ease: "quadIn" },
    { do: "hide", target: "drop1", at: 0.8, dur: 0.12 },
    { do: "sound", sound: "splash", at: 0.8, volume: 0.6 },
    { do: "grow", target: "spider", to: 0.9, at: 0.8, dur: 0.12 }, { do: "grow", target: "spider", to: 1, at: 0.95, dur: 0.3 },
    { do: "feel", target: "spider", feeling: "surprised", at: 0.82 },
    say("Uh-oh! Rain!", { at: 1.0 }),
    { do: "look", target: "spider", at: 1.0, to: [0.3, 2.2, 3.0] },
    RAINY(1.5),
  ]),
  beat("h2", 2.6, [
    { do: "camera", ...CAM, dur: 1.6 },
    { do: "feel", target: "spider", feeling: "joyful", at: 0.1 },
    { do: "say", who: "spider", text: "Hee hee! Wet!", at: 0.15 },
    { do: "hop", target: "spider", at: 0.3, height: 0.25 },
    say("It's Itsy the spider! Sing with me!", { at: "after" }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.6 },
    { do: "look", target: "spider", at: 0.3, to: "ahead" },
  ]),
  beat("h3", 2.8, [
    SUNNY(0.1),
    say("Rain, sun, cloud... and a surprise!", { at: 0.3 }),
    [1, 2, 3, 4].map((i) => ({ do: "pop", target: `slot${i}`, at: 0.4 + (i - 1) * 0.3, dur: 0.35, sound: "pop" })),
    { do: "pop", target: "qmark", at: 1.8, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot4", at: 2.0, deg: 12, dur: 0.8 },
  ]),
]});

// ---- Verse 1 (traditional): the water spout. Up or down? Then the song; then rain fingers. -----------------
scenes.push({ id: "v1_intro", title: "Up or down?", beats: [
  beat("a1", 2.6, [
    { do: "camera", ...SPOUT_CAM, dur: 1.2 },
    { do: "path", target: "spider", points: [HOME, [-0.2, 0, 0.2], SP_BASE], dur: 1.0, at: 0.1, face: true },
    { do: "turn", target: "spider", to: [0, 0, 0], at: 1.15, dur: 0.3 },
    say("A water spout! Will Itsy go up or down?", { at: 0.2 }),
    { do: "highlight", target: "spout", at: 0.6, dur: 1.6 },
  ]),
  beat("a2", 1.8, [
    { do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 },
    { do: "look", target: "spider", at: 0.2, to: [SX, 2.4, SZ] },
    legs(0.3, 2),
  ]),
  beat("a3", 2.0, [word("up", 0.05), say("Up! Let's sing!", { at: 0.1 }), { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.3 }, { do: "look", target: "spider", at: 0.2, to: "ahead" }]),
]});

scenes.push({ id: "v1_song", title: "Sing: up the water spout", music: false, beats: [
  beat("s1a", 6.0, sung(V[0][0], T.climb, [unword("up", 3.0), upSpout(SP_BASE, onBeat(0.5)), { do: "clip", target: "robo", clip: "Dance", at: 0.1 }])),
  beat("s1b", 6.0, sung(V[0][1], T.down, [
    { do: "move", target: "storm", to: [-0.3, 3.7, -1.6], at: 0.1, dur: 1.2, ease: "sineInOut" },
    RAINY(onBeat(0.5)),
    { do: "feel", target: "spider", feeling: "surprised", at: onBeat(1.5) },
    word("down", onBeat(3)),
    washDown(onBeat(3.5)),
  ])),
  beat("s1w", 1.6, [
    { do: "say", who: "spider", text: "Wheee!", at: 0.1 },
    { do: "turn", target: "spider", to: [0, -15, 0], at: 0.1, dur: 0.3 },
    { do: "hop", target: "spider", at: 0.5, height: 0.2 },
    unword("down", 0.8),
  ]),
  beat("s1c", 6.0, sung(V[0][2], T.sun, [
    { do: "camera", ...WIDE, dur: 1.2 },
    SUNNY(onBeat(0.5)),
    word("sun", onBeat(2)),
    dryUp(onBeat(3)),
    { do: "look", target: "spider", at: onBeat(1), to: "sun" },
    { do: "look", target: "robo", at: onBeat(1), to: "sun" },
  ])),
  beat("s1d", 7.0, sung(V[0][3], T.again, [
    unword("sun", 0.1),
    { do: "camera", ...SPOUT_CAM, dur: 1.2 },
    { do: "look", target: "spider", at: 0.2, to: "ahead" },
    { do: "look", target: "robo", at: 0.2, to: "spider" },
    upSpout(OUT, onBeat(1)),
    word("up", onBeat(2)),
  ])),
]});

// Rain fingers: wiggle your fingers down like rain (the HUD hand wiggles), pitter-patter; slot 1 fills.
const fingers = (at, n = 4) => ["pinky", "ring", "middle", "index", "thumb"].flatMap((f, k) =>
  Array.from({ length: n }, (_, j) => ({ do: "wiggle", target: `hand#${f}`, at: at + k * 0.08 + j * 0.42, deg: 18, dur: 0.4 })));
scenes.push({ id: "v1_fingers", title: "Make rain fingers!", beats: [
  beat("r1", 2.8, [
    unword("up", 0),
    { do: "camera", ...CAM, dur: 1.2 },
    say("Your turn! Make rain with your fingers!", { at: 0.1 }),
    { do: "pop", target: "hand", at: 0.4, dur: 0.4, sound: "pop" },
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
    { do: "move", target: "spider", to: SP_LOW, at: 0.3, dur: 1.2, ease: "sineInOut" },
    { do: "path", target: "spider", points: [SP_LOW, SP_BASE, HOME], dur: 1.0, at: 1.6, face: true },
  ]),
  beat("r2", 3.0, [
    { do: "turn", target: "spider", to: [0, 0, 0], at: 0.1, dur: 0.3 },
    say("Wiggle, wiggle! Pitter, patter!", { at: 0.1 }),
    fingers(0.2, 6),
    RAINY(0.3),
    { do: "look", target: "spider", at: 0.4, to: [0.3, 2.5, 4] },
    { do: "feel", target: "spider", feeling: "joyful", at: 0.4 },
  ]),
  beat("r3", 2.4, [
    word("rain", 0.1),
    say("That's rain! Say rain!", { at: 0.1 }),
    fingers(0.2, 4),
    { do: "look", target: "robo", at: 0.1, to: [0, 1.6, 9] },
  ]),
  beat("r4", 2.0, [{ do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 }, { do: "wiggle", target: "bubble", at: 0.2, deg: 10, dur: 1.4 }]),
  beat("r5", 2.4, [
    say("Rain! Yay! Pitter, patter!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.3 },
    { do: "look", target: "robo", at: 0.2, to: "ahead" },
    { do: "hide", target: "hand", at: 1.6, dur: 0.3 },
  ]),
  beat("r6", 1.8, [unword("rain", 0), fillSlot(1, "mini1", 0.25), SUNNY(0.6), { do: "look", target: "spider", at: 0.3, to: "ahead" }]),
]});

// ---- Verse 2 (original): the big green tree. Sun or rain? ------------------------------------------------------
scenes.push({ id: "v2_intro", title: "Sun or rain?", beats: [
  beat("b1", 2.6, [
    { do: "camera", ...TREE_CAM, dur: 1.4 },
    { do: "path", target: "spider", points: [HOME, [1.8, 0, 0.0], TR_BASE], dur: 1.4, at: 0.1, face: true },
    { do: "turn", target: "spider", to: [0, -10, 0], at: 1.55, dur: 0.3 },
    say("Itsy wants to climb the big green tree!", { at: 0.2 }),
    legs(0.2, 3),
  ]),
  beat("b2", 2.8, [
    { do: "camera", position: [0.8, 2.4, 9.5], lookAt: [0.5, 3.0, -2.0], fov: 42, dur: 1.2 },
    { do: "move", target: "storm", to: [6.2, 4.3, -2.6], at: 0.2, dur: 1.4, ease: "sineInOut" },
    say("Look at the sky! Sun or rain?", { at: 0.2 }),
    { do: "look", target: "robo", at: 0.3, to: "sun" },
    { do: "wiggle", target: "sun", at: 1.2, deg: 10, dur: 0.8 },
    { do: "wiggle", target: "storm", at: 2.0, deg: 10, dur: 0.8 },
  ]),
  beat("b3", 2.0, [{ do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 }, { do: "move", target: "storm", to: [5.4, 4.2, -2.4], at: 0.3, dur: 1.4 }]),
  beat("b4", 2.4, [
    say("A grey cloud... rain is coming!", { at: 0.1 }),
    { do: "look", target: "robo", at: 0.1, to: "storm" },
    { do: "clip", target: "robo", clip: "Yes", at: 0.3 },
  ]),
]});

scenes.push({ id: "v2_song", title: "Sing: up the big green tree", music: false, beats: [
  beat("s2a", 6.0, sung(V[1][0], T.climb, [
    { do: "camera", ...TREE_CAM, dur: 1.0 }, { do: "look", target: "robo", at: 0.2, to: "spider" },
    word("up", onBeat(1)), upTree(TR_BASE, onBeat(0.5)), { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
  ])),
  beat("s2b", 6.0, sung(V[1][1], T.down, [
    unword("up", 0.1),
    { do: "move", target: "storm", to: [3.2, 4.6, -2.2], at: 0.1, dur: 1.2, ease: "sineInOut" },
    RAINY(onBeat(0.5)),
    word("down", onBeat(3)),
    downTree(onBeat(3.5)),
  ])),
  beat("s2w", 1.6, [{ do: "say", who: "spider", text: "Wheee!", at: 0.1 }, { do: "spin", target: "spider", at: 0.2, dur: 0.6 }, unword("down", 0.8)]),
  beat("s2c", 6.0, sung(V[1][2], T.sun, [
    { do: "camera", ...WIDE, dur: 1.2 },
    SUNNY(onBeat(0.3)),
    { do: "grow", target: "sun", to: 1.35, at: onBeat(2), dur: 0.6, ease: "backOut" },
    word("sun", onBeat(2)),
    { do: "look", target: "spider", at: onBeat(1), to: "sun" },
    { do: "look", target: "robo", at: onBeat(1), to: "sun" },
  ])),
  beat("s2d", 7.0, sung(V[1][3], T.again, [
    unword("sun", 0.1),
    { do: "camera", ...TREE_CAM, dur: 1.2 },
    upTree(TR_BASE, onBeat(1)),
    word("up", onBeat(2)),
    { do: "look", target: "spider", at: onBeat(6), to: "sun" },
  ])),
]});

scenes.push({ id: "v2_sun", title: "Say sun!", beats: [
  ...yourTurn({ id: "sun", ask: "Make a big round sun with your arms! Say sun!", answer: "Sun!", praise: "Big and round! Yay!", wordId: "sun", slot: 2, mini: "mini2", look: "robo",
    extra: [{ do: "grow", target: "sun", to: 1, at: 0.4, dur: 0.6 }] }),
].map((b, k) => (k === 0 ? { ...b, do: [...unword("up", 0), { do: "camera", ...CAM, dur: 1.2 }, ...b.do] } : b))});

// ---- Verse 3 (original): the red umbrella and a grey cloud. ------------------------------------------------------
scenes.push({ id: "v3_intro", title: "Up or down? A cloud!", beats: [
  beat("c1", 2.4, [
    { do: "camera", ...TREE_CAM, dur: 1.0 },
    say("Is Itsy going up or down? Watch!", { at: 0.1 }),
    { do: "wiggle", target: "spider", at: 0.4, deg: 10, dur: 1.2 },
    { do: "look", target: "spider", at: 0.3, to: [3.4, 0, 1] },
  ]),
  beat("c2", 2.4, [
    downTree(0.1, TR_BASE),
    word("down", 0.6),
    say("Down! Down, down, down!", { at: 0.4 }),
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.8 },
  ]),
  beat("c3", 2.6, [
    unword("down", 0),
    { do: "camera", ...UMB_CAM, dur: 1.2 },
    { do: "path", target: "spider", points: [TR_BASE, [3.4, 0, 0.6], UM_EDGE0], dur: 1.0, at: 0.2, face: true },
    { do: "turn", target: "spider", to: [0, -40, 0], at: 1.25, dur: 0.3 },
    { do: "look", target: "spider", at: 0.3, to: "ahead" },
    say("A red umbrella! Let's climb!", { at: 0.4 }),
  ]),
  ...yourTurn({ id: "cl", ask: "Look! What's that in the sky? A cloud! Say cloud!", answer: "Cloud!", praise: "Yes! A fluffy grey cloud!", wordId: "cloud" })
    .map((b, k) => (k === 0 ? { ...b, do: [...b.do, { do: "move", target: "storm", to: [4.8, 3.6, -0.6], at: 0.1, dur: 1.4, ease: "sineInOut" }, { do: "camera", position: [1.4, 2.0, 7.8], lookAt: [2.4, 2.1, -0.6], fov: 42, dur: 1.2 }] } : b)),
]});

scenes.push({ id: "v3_song", title: "Sing: up the umbrella", music: false, beats: [
  beat("s3a", 6.0, sung(V[2][0], T.climb, [
    { do: "camera", ...UMB_CAM, dur: 1.0 },
    { do: "turn", target: "spider", to: [0, 0, 0], at: 0.1, dur: 0.3 },
    { do: "path", target: "spider", points: [UM_EDGE0, ...UM_PATH, UM_TOP], dur: 1.9, at: onBeat(0.5) },
    legs(onBeat(0.5), 5, 0.38),
    word("up", onBeat(1)),
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
  ])),
  beat("s3b", 6.0, sung(V[2][1], T.down, [
    unword("up", 0.1),
    { do: "move", target: "storm", to: [1.3, 3.5, 0.0], at: 0.2, dur: 1.4, ease: "sineInOut" },
    { do: "lights", rig: "overcast", background: "rain_sky", at: onBeat(1), dur: 1.0 },
    { do: "hide", target: "rays", at: onBeat(1), dur: 0.3 }, { do: "hide", target: "sun", at: onBeat(1), dur: 0.6 },
    word("cloud", onBeat(1.5)),
    { do: "look", target: "spider", at: onBeat(1), to: "storm" },
    { do: "feel", target: "spider", feeling: "surprised", at: onBeat(2) },
  ])),
  beat("s3c", 6.0, sung(V[2][2], T.sun, [
    unword("cloud", 0.1),
    { do: "show", target: "rain", at: 0.1, dur: 0.3 }, { do: "sound", sound: "rain", at: 0.1, volume: 0.45 },
    ...[0, 1, 2, 3].map((k) => ({ do: "sound", sound: "bubble_pop", at: onBeat(k * 0.75), volume: 0.4 })),
    { do: "feel", target: "spider", feeling: "joyful", at: onBeat(3) },
    { do: "path", target: "spider", points: [UM_TOP, ...[...UM_PATH].reverse(), [2.95, 0.4, 0.88], [2.6, 0, 0.92], UM_UNDER], dur: 1.6, at: onBeat(3) },
    { do: "sound", sound: "slide_whistle", at: onBeat(3), volume: 0.35 },
  ])),
  beat("s3d", 7.0, sung(V[2][3], T.again, [
    { do: "camera", position: [2.4, 1.15, 4.5], lookAt: [1.8, 0.65, 0.9], fov: 40, dur: 1.2 },
    { do: "turn", target: "spider", to: [0, -10, 0], at: 0.1, dur: 0.3 },
    { do: "look", target: "spider", at: 0.4, to: [1.6, 2.5, 0.6] },
    ...[1, 3, 5].map((k) => ({ do: "wiggle", target: "spider", at: onBeat(k), deg: 10, dur: 0.6 })),
    { do: "look", target: "spider", at: onBeat(6), to: "ahead" },
  ])),
]});

scenes.push({ id: "v3_dry", title: "Where is Itsy?", beats: [
  beat("d1", 2.6, [
    { do: "camera", ...UMB_CAM, dur: 1.0 },
    say("Where is Itsy? Under the umbrella!", { at: 0.1 }),
    { do: "highlight", target: "spider", at: 0.9, dur: 1.6 },
    { do: "point", target: "robo", to: "umbrella", at: 0.6, hold: 1.4 },
  ]),
  beat("d2", 2.4, [{ do: "say", who: "spider", text: "I'm dry! Hee hee!", at: 0.1 }, { do: "hop", target: "spider", at: 0.3, height: 0.2 }, { do: "sound", sound: "giggle", at: 1.3, volume: 0.5 }]),
  beat("d3", 2.4, [
    SUNNY(0.1),
    { do: "camera", ...CAM, dur: 1.4 },
    say("Bye-bye, cloud! Hello, sun!", { at: 0.3 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.4 },
  ]),
  beat("d4", 1.8, [fillSlot(3, "mini3", 0.2), say("Cloud!", { at: 0.4, caption: false }), { do: "path", target: "spider", points: [UM_UNDER, [2.1, 0, 1.1], HOME], dur: 1.2, at: 0.3, face: true }]),
]});

// ---- Verse 4 (original): the spout once more, sun or rain?, and the rainbow surprise. -----------------------------
scenes.push({ id: "v4_song", title: "Sing: one more time", music: false, beats: [
  beat("e1", 2.4, [
    { do: "camera", ...SPOUT_CAM, dur: 1.2 },
    say("One more time! Up the water spout!", { at: 0.1 }),
    { do: "path", target: "spider", points: [HOME, [-0.2, 0, 0.2], SP_BASE], dur: 1.0, at: 0.2, face: true },
    { do: "turn", target: "spider", to: [0, 0, 0], at: 1.25, dur: 0.3 },
  ]),
  beat("s4a", 6.0, sung(V[3][0], T.climb, [upSpout(SP_BASE, onBeat(0.5)), word("up", onBeat(1)), { do: "clip", target: "robo", clip: "Dance", at: 0.1 }])),
  beat("s4b", 6.0, sung(V[3][1], T.down, [
    unword("up", 0.1),
    { do: "move", target: "storm", to: [-0.3, 3.7, -1.6], at: 0.1, dur: 1.2, ease: "sineInOut" },
    RAINY(onBeat(0.5)),
    word("down", onBeat(3)),
    washDown(onBeat(3.5)),
  ])),
  beat("s4w", 1.6, [{ do: "say", who: "spider", text: "Splash! Wheee!", at: 0.1 }, { do: "turn", target: "spider", to: [0, -15, 0], at: 0.1, dur: 0.3 }, unword("down", 0.9)]),
  beat("g1", 2.4, [say("What comes next? Sun or rain? Guess!", { at: 0.1 }), { do: "look", target: "robo", at: 0.2, to: [0, 1.6, 9] }, { do: "clip", target: "robo", clip: "Wave", at: 0.3 }]),
  beat("g2", 2.7, countdown(0.15)),
  beat("s4c", 6.0, sung(V[3][2], T.sun, [
    { do: "look", target: "robo", at: 0.1, to: "ahead" },
    { do: "camera", ...WIDE, dur: 1.2 },
    SUNNY(0.1),
    dryUp(onBeat(1)),
    { do: "show", target: "rainbow", at: onBeat(4), dur: 1.0 },
    { do: "sound", sound: "crystal_chime", at: onBeat(4), volume: 0.6 },
    word("rainbow", onBeat(4.5)),
    { do: "look", target: "spider", at: onBeat(4), to: "rainbow" },
    { do: "look", target: "robo", at: onBeat(4), to: "rainbow" },
  ])),
  beat("s4d", 7.0, sung(V[3][3], T.again, [
    unword("rainbow", 0.1),
    { do: "camera", position: [0.2, 2.3, 7.4], lookAt: [-0.1, 1.9, -2.2], fov: 42, dur: 1.4 },
    { do: "look", target: "spider", at: 0.2, to: "ahead" },
    upSpout(OUT, onBeat(1)),
    { do: "look", target: "spider", at: onBeat(6), to: "rainbow" },
    { do: "wiggle", target: "spider#legs_front", at: onBeat(6.5), deg: 20, dur: 0.8 },
  ])),
]});

scenes.push({ id: "v4_rainbow", title: "A rainbow!", beats: [
  beat("f1", 3.0, [
    { do: "camera", position: [0.4, 2.4, 9.8], lookAt: [0.6, 2.2, -3.0], fov: 42, dur: 1.2 },
    say("A rainbow! So many colours!", { at: 0.1 }),
    { do: "highlight", target: "rainbow", at: 0.8, dur: 2.0 },
    { do: "clip", target: "robo", clip: "Jump", at: 0.3 },
  ]),
  beat("f2", 2.4, [word("rainbow", 0.1), say("Say rainbow!", { at: 0.1 }), { do: "look", target: "robo", at: 0.1, to: [0, 1.6, 9] }, { do: "turn", target: "spider", to: [0, 0, 0], at: 0.2, dur: 0.5 }]),
  beat("f3", 2.0, [{ do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 }, { do: "wiggle", target: "bubble", at: 0.2, deg: 10, dur: 1.4 }]),
  beat("f4", 2.6, [
    say("Rainbow! The surprise!", { at: 0.1 }),
    { do: "hide", target: "qmark", at: 0.2, dur: 0.2 },
    fillSlot(4, "mini4", 0.4),
    { do: "burst", target: "confetti", at: 0.5, dur: 2.2, sound: false },
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.4 },
    { do: "look", target: "robo", at: 0.2, to: "ahead" },
  ]),
  beat("f5", 2.4, [
    unword("rainbow", 0),
    say("Rain, sun, cloud, rainbow!", { at: 0.1 }),
    ...[1, 2, 3, 4].map((s, k) => ({ do: "wiggle", target: `slot${s}`, at: 0.2 + k * 0.45, deg: 12, dur: 0.5 })),
    { do: "move", target: "spider", to: SP_TOP, at: 0.3, dur: 0.4 },
    { do: "move", target: "spider", to: SP_LOW, at: 0.8, dur: 1.0, ease: "sineInOut" },
    { do: "path", target: "spider", points: [SP_LOW, SP_BASE, HOME], dur: 0.9, at: 1.5, face: true },
  ]),
]});

// ---- Recap quiz -----------------------------------------------------------------------------------------------
const popPair = (a, b) => [{ do: "pop", target: a, at: 0.3, dur: 0.4, sound: "pop" }, { do: "pop", target: b, at: 0.55, dur: 0.4, sound: "pop" }];
const q1 = quizRound({ id: "q1", q: "Which one makes rain? Point to it!", left: "q_sun", right: "q_rain", answer: "q_rain", spots: [[-1.0, 1.35, 3.2], [1.0, 1.35, 3.2]], yes: "Yes! The rain cloud! Pitter, patter!" });
const q2 = quizRound({ id: "q2", q: "Where is the rainbow? Point to it!", left: "q_rainbow", right: "q_cloud", answer: "q_rainbow", spots: [[-1.0, 0.85, 3.2], [1.0, 1.35, 3.2]], yes: "Yes! The rainbow!" });
q2[0].do.unshift(...popPair("q_rainbow", "q_cloud"), { do: "hide", target: "q_sun", at: 0, dur: 0.3 }, { do: "hide", target: "q_rain", at: 0.05, dur: 0.3 });
q2[3].do.push({ do: "hide", target: "q_rainbow", at: 0.4, dur: 0.3 }, { do: "hide", target: "q_cloud", at: 0.45, dur: 0.3 });
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 2.4, [
    { do: "turn", target: "spider", to: [0, 0, 0], at: 0.1, dur: 0.3 },
    say("Now a quick game!", { at: 0.1 }), { do: "camera", ...CAM, dur: 1.0 }, { do: "clip", target: "robo", clip: "Dance", at: 0.2 }, popPair("q_sun", "q_rain"),
  ]),
  ...q1,
  ...q2,
  beat("q3", 2.4, [
    say("Itsy goes up the spout! Up or down?", { at: 0.1 }),
    { do: "camera", ...SPOUT_CAM, dur: 1.0 },
    upSpout(HOME, 0.2),
  ]),
  beat("q4", 2.0, [{ do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 }, { do: "wiggle", target: "spider", at: 0.3, deg: 10, dur: 1.2 }]),
  beat("q5", 2.4, [word("up", 0.05), say("Up! Clever you!", { at: 0.1 }), { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.3 }, { do: "say", who: "spider", text: "Yay!", at: "after" }]),
]});

// ---- Finale: everybody sings the traditional verse with rain fingers, then bye-bye. -----------------------------
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("z0", 2.0, [
    unword("up", 0),
    say("Everybody sing! Rain fingers ready!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    { do: "move", target: "spider", to: SP_LOW, at: 0.3, dur: 0.9, ease: "sineInOut" },
    { do: "move", target: "spider", to: SP_BASE, at: 1.25, dur: 0.3 },
  ]),
  beat("z1", 6.0, sung(V[0][0], T.climb, [{ do: "camera", ...SPOUT_CAM, dur: 0.8 }, upSpout(SP_BASE, onBeat(0.5)), word("up", onBeat(1))])),
  beat("z2", 6.0, sung(V[0][1], T.down, [
    unword("up", 0.1),
    { do: "move", target: "storm", to: [-0.3, 3.7, -1.6], at: 0.1, dur: 1.2, ease: "sineInOut" },
    RAINY(onBeat(0.5)),
    { do: "pop", target: "hand", at: onBeat(0.5), dur: 0.4, sound: false },
    fingers(onBeat(1), 4),
    washDown(onBeat(3.5)),
  ])),
  beat("z3", 6.0, sung(V[0][2], T.sun, [
    { do: "hide", target: "hand", at: 0.2, dur: 0.3 },
    { do: "camera", ...WIDE, dur: 1.2 },
    SUNNY(onBeat(0.5)),
    dryUp(onBeat(3)),
  ])),
  beat("z4", 7.0, sung(V[0][3], T.again, [
    upSpout(OUT, onBeat(1)),
    { do: "burst", target: "confetti", at: onBeat(5), dur: 2.4 },
    ...[1, 2, 3, 4].map((s, k) => ({ do: "wiggle", target: `slot${s}`, at: onBeat(4) + k * 0.3, deg: 10, dur: 0.5 })),
  ])),
  beat("z5", 3.4, [
    { do: "move", target: "spider", to: SP_LOW, at: 0.1, dur: 0.8, ease: "sineInOut" },
    { do: "path", target: "spider", points: [SP_LOW, SP_BASE, [-0.4, 0, 0.5]], dur: 0.8, at: 0.95, face: true },
    { do: "turn", target: "spider", to: [0, 0, 0], at: 1.8, dur: 0.3 },
    { do: "camera", position: [-0.6, 2.4, 10.5], lookAt: [-0.6, 1.6, -0.8], fov: 40, dur: 2.0 },
    say("Bye-bye, Itsy! Bye-bye, rain!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
  beat("z6", 3.2, [
    { do: "say", who: "spider", text: "Bye-bye!", at: 0.1 },
    { do: "wiggle", target: "spider#legs_front", at: 0.2, deg: 25, dur: 1.4 },
    { do: "hop", target: "spider", at: 0.3, height: 0.25 },
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.4 },
    { do: "camera", position: [-0.4, 3.4, 14], lookAt: [-0.3, 1.8, -1], fov: 40, dur: 3 },
  ]),
]});

// ---- Meta -----------------------------------------------------------------------------------------------------
const description = "Sing The Itsy Bitsy Spider with Robo and Itsy, the friendliest little spider! Itsy climbs up the water spout, the big green tree and a red umbrella. Down comes the rain and she slides down, wheee, then out comes the sun to dry it all up. Make rain with your fingers, guess sun or rain, shout up or down, and wait for the big surprise at the end: a rainbow!";
const itsy = (at, extra = {}) => ({ id: "spider", kind: "critter", species: "spider", at, size: 1.0, feeling: "happy", ...extra });
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Itsy Bitsy Spider: Rain and Sun", episode: "br07", seed: 307,
    skills: ["weather_seasons_1", "position_words_prek"],
    cast,
    youtube: {
      title: "Itsy Bitsy Spider 🕷️ Rain and Sun Weather Song for Toddlers | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: the weather words rain, sun, cloud and rainbow, and the position words up and down.\n\nSing at home: wiggle your fingers down like rain, make a big round sun with your arms, and ask "Up or down?" every time the spider climbs. The first verse of The Itsy Bitsy Spider is a traditional public-domain rhyme sung to its traditional tune; the verses about the tree, the umbrella and the rainbow are original words written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["itsy bitsy spider", "incy wincy spider", "nursery rhymes", "weather song for kids", "rain and sun", "rainbow song", "up and down", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "spout", title: "ITSY BITSY SPIDER", subtitle: "Rain and sun!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "garden",
        camera: { position: [1.6, 1.5, 5.4], lookAt: [2.1, 1.35, -0.6], fov: 38 },
        objects: [
          { id: "house", kind: "prop", model: "house", at: [4.55, 0, -1.9], size: 2.5 },
          { id: "spout", kind: "prop", model: "water_spout", at: [3.55, 0, -0.66], size: 0.92 },
          itsy([3.55, 0.85, -0.12]),
          { id: "storm", kind: "prop", model: "rain_cloud", at: [4.7, 2.75, -0.9], size: 0.9 },
          { id: "umbrella", kind: "prop", model: "umbrella", at: [5.0, 0, 0.7], size: 0.8, rotation: [0, -20, 0] },
        ] },
      { name: "rainbow", title: "RAIN AND SUN!", subtitle: "Up, down and a rainbow", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "garden",
        camera: { position: [1.8, 1.4, 5.6], lookAt: [2.5, 1.5, -1.0], fov: 38 },
        objects: [
          { id: "rainbow", kind: "prop", model: "rainbow", at: [2.8, 0, -3.0], size: 2.2 },
          { id: "sun", kind: "prop", model: "sun", at: [4.4, 2.9, -2.6], size: 0.8 },
          { id: "rays", kind: "prop", model: "sun_rays", parent: "sun", at: [0, 0, -0.2], size: 1.05 },
          itsy([2.7, 0, 0.6], { size: 1.25, rotation: [0, -12, 0] }),
        ] },
    ],
  }),
  stage: { preset: "garden" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "itsy_bitsy_spider");
