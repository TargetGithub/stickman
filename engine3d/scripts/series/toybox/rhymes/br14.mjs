// Builds ../br14_rain_rain_go_away.json: Rain, Rain, Go Away. The traditional rhyme (public domain), sung once
// for each friend (little Robo, Bunny, Ducky and Pip), and after each a short original verse about one piece of
// rain gear: Robo's green hat, Bunny's yellow raincoat, Ducky's blue umbrella (guess its colour before it pops
// open) and Pip's red boots (count the puddles, then splash). At the end the sun comes out and everyone plays.
// Teaches the weather word rain and the colours of rain gear.
// Run: node br14.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  say, beat, sung, onBeat, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, fillSlot, yourTurn, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// Rain, Rain, Go Away (traditional, public domain): the sol-mi playground chant, in C. One note per syllable.
const T = {
  a: "G4 E4 G4:0.5 G4:0.5 E4:2", //                          Rain, rain, go a-way,
  b: "G4:0.5 G4:0.5 E4 E4:0.5 G4:0.5 G4 E4:2", //            Come a-gain an-oth-er day,
  c: "G4:0.5 G4:0.5 E4 E4:0.5 A4:0.5 G4 E4:2", //            Lit-tle Ro-bo wants to play,
  c1: "G4:0.5 G4:0.5 E4 A4 G4 E4:2", //                      Lit-tle Pip wants to play,
};
const TUNES = [T.a, T.b, T.c, T.a];
// The traditional verse with a friend's name. Sung lines end in a comma or full stop (a "!" slows the voice).
const chorus = (name) => ["Rain, rain, go away,", "Come again another day,", `Little ${name} wants to play,`, "Rain, rain, go away."];
// Original verses on the same tune (same syllable counts: 5, 7, 7, 5).
const GEAR = {
  hat: ["Green hat on my head,", "Drip, drop, rain, I'm dry instead,", "Splish and splash and jump ahead,", "Green hat on my head."],
  coat: ["Yellow coat, zip, zip,", "Not a drop and not a drip,", "Button up and hop and skip,", "Yellow coat, zip, zip."],
  umbrella: ["Blue umbrella, pop,", "Over me the raindrops drop,", "Pitter, patter, plip, plop, plop,", "Blue umbrella, pop."],
  boots: ["Red boots, stomp, stomp, stomp,", "In the puddles, jump and romp,", "One, two, three, and splash, splash, splash,", "Red boots, stomp, stomp, stomp."],
  sun: ["Rain, rain, went away,", "Hello, sun, a sunny day,", "All my friends come out to play,", "Splash, splash, hip hooray."],
};

// ---- Layout (garden stage) -------------------------------------------------------------------------------------
const ROBO = [-4.0, 0, 0.5];
const BUNNY = [-1.6, 0, 0.9];
const DUCK = [0.3, 0, 0.8];
const PIP = [2.5, 0, 0.7];
const OFF = (z) => [9.5, 0, z]; // friends wait off the right edge
const PUD = [[-1.3, 0, 2.3], [0.85, 0, 2.55], [2.95, 0, 2.25]];
const SUN_AT = [3.6, 4.1, -3.8];
const STICK_UP = 0.9; // the duck's umbrella stick (size 0.9): its canopy sits 0.9 m up the stick

const CAM = { position: [0, 2.1, 9.6], lookAt: [0, 1.3, -0.4], fov: 40 };
const WIDE = { position: [0, 2.6, 11.6], lookAt: [0, 1.8, -1.0], fov: 40 };
const ROBO_CAM = { position: [-2.6, 1.85, 4.6], lookAt: [-3.8, 1.3, 0.3], fov: 40 };
const BUNNY_CAM = { position: [-2.5, 1.25, 3.7], lookAt: [-1.5, 0.78, 0.8], fov: 40 };
const DUCK_CAM = { position: [0.9, 1.4, 4.6], lookAt: [0.45, 0.95, 0.7], fov: 40 };
const PIP_CAM = { position: [1.6, 1.9, 6.4], lookAt: [1.6, 0.6, 1.5], fov: 40 };
const PUD_CAM = { position: [0.8, 2.6, 6.8], lookAt: [0.8, 0.3, 1.6], fov: 42 };

// ---- Objects --------------------------------------------------------------------------------------------------
const umbrellaSet = (id, color, at, size = 1.3) => [
  { id, kind: "prop", model: "umbrella_stick", color, at, size },
  { id: `${id}_f`, kind: "prop", model: "umbrella_furled", color, parent: id, at: [0, size, 0], size },
  { id: `${id}_c`, kind: "prop", model: "umbrella_canopy", color, parent: id, at: [0, size, 0], size, hidden: true },
];
const objects = [
  { id: "tree", kind: "prop", model: "tree", at: [5.4, 0, -2.6], size: 1.5 },
  { id: "bush", kind: "prop", model: "bush", at: [-5.7, 0, -1.4], size: 0.9 },
  { id: "flower1", kind: "prop", model: "flower", at: [-3.0, 0, -0.9], size: 0.65 },
  { id: "flower2", kind: "prop", model: "flower", color: "yellow", at: [1.6, 0, -1.0], size: 0.6 },
  { id: "flower3", kind: "prop", model: "flower", color: "purple", at: [-0.7, 0, -1.3], size: 0.55 },
  ...umbrellaSet("u1", "pink", [-3.3, 0, -3.0]),
  ...umbrellaSet("u2", "orange", [-0.6, 0, -3.4]),
  ...umbrellaSet("u3", "purple", [4.0, 0, -3.0]),
  { id: "cloud1", kind: "prop", model: "rain_cloud", at: [-1.8, 4.4, -4.2], size: 1.5 },
  { id: "cloud2", kind: "prop", model: "rain_cloud", at: [2.4, 4.7, -4.8], size: 1.3 },
  { id: "sun", kind: "prop", model: "sun", at: SUN_AT, size: 1.0, hidden: true },
  { id: "rays", kind: "prop", model: "sun_rays", parent: "sun", at: [0, 0, -0.2], size: 1.05, hidden: true },
  { id: "rain", kind: "weather", type: "rain", at: [0, 0, -0.4], area: [15, 7], hidden: true },
  { id: "drop1", kind: "shape", shape: "drop", color: "blue", material: "water", at: [ROBO[0], 3.4, ROBO[2]], size: 0.22, hidden: true },
  // puddles, their ripples, splashes and counting numbers
  ...PUD.flatMap((p, i) => [
    { id: `pud${i + 1}`, kind: "prop", model: "puddle", at: p, size: 1.05, rotation: [0, i * 40 - 30, 0], hidden: true },
    { id: `rip${i + 1}`, kind: "shape", shape: "hoop", color: "white", material: "glossy", at: [p[0], 0.02, p[2]], size: 0.35, hidden: true },
    { id: `spl${i + 1}`, kind: "prop", model: "splash_drops", at: [p[0], 0, p[2]], size: 1.1, hidden: true },
    { id: `num${i + 1}`, kind: "letter", text: String(i + 1), color: "orange", at: [p[0], 0.45, p[2] + 0.1], size: 0.42, hidden: true },
  ]),
  // the cast and their rain gear
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, 25, 0], feeling: "happy" },
  { id: "hat", kind: "prop", model: "rain_hat", parent: "robo", at: [0, 2.7, 0], size: 1.5, hidden: true },
  { id: "bunny", kind: "critter", species: "bunny", at: OFF(1.5), size: 1.1, feeling: "happy" },
  { id: "coat", kind: "prop", model: "raincoat", parent: "bunny", at: [0, 0, 0], size: 1.1, hidden: true },
  { id: "duck", kind: "critter", species: "duck", at: OFF(1.6), size: 1.0, feeling: "happy" },
  { id: "dstick", kind: "prop", model: "umbrella_stick", color: "blue", parent: "duck", at: [0.5, 0.5, 0.14], size: 0.9, hidden: true },
  { id: "dfurl", kind: "prop", model: "umbrella_furled", parent: "dstick", at: [0, STICK_UP, 0], size: 0.9, hidden: true },
  { id: "dcan", kind: "prop", model: "umbrella_canopy", color: "blue", parent: "dstick", at: [0, STICK_UP, 0], size: 0.9, hidden: true },
  { id: "pip", kind: "critter", species: "toddler", at: OFF(1.4), size: 1.0, feeling: "happy" },
  { id: "boots", kind: "prop", model: "rain_boots", color: "red", parent: "pip", at: [0, 0, 0], size: 1.0, hidden: true },
  // quiz props (hidden until the quiz)
  { id: "q_hat", kind: "prop", model: "rain_hat", color: "green", at: [-0.65, 1.15, 4.6], size: 1.3, rotation: [18, 0, 0], hidden: true },
  { id: "q_boots", kind: "prop", model: "rain_boots", color: "red", at: [0.65, 0.98, 4.6], size: 1.4, rotation: [10, -25, 0], hidden: true },
  { id: "q_umb", kind: "prop", model: "umbrella", color: "blue", at: [-0.65, 0.86, 4.6], size: 0.55, hidden: true },
  { id: "q_coat", kind: "prop", model: "raincoat", color: "yellow", at: [0.65, 0.92, 4.6], size: 0.68, rotation: [10, 0, 0], hidden: true },
  { id: "confetti", kind: "confetti", at: [0, 3.4, 0.5] },
];
// HUD: four rain-gear slots (hat, coat, umbrella, boots), "?" on the boots, the 3-2-1 countdown, the word bubble.
objects.push(...trackerObjects(4, { colors: ["green", "yellow", "blue", "red"] }));
objects.push(
  { id: "mini1", kind: "prop", model: "rain_hat", color: "green", hud: true, parent: "slot1", at: [0, -0.1, 0.3], size: 0.9, rotation: [25, 0, 0], hidden: true },
  { id: "mini2", kind: "prop", model: "raincoat", color: "yellow", hud: true, parent: "slot2", at: [0, -0.3, 0.3], size: 0.7, hidden: true },
  { id: "mini3", kind: "prop", model: "umbrella", color: "blue", hud: true, parent: "slot3", at: [0, -0.3, 0.3], size: 0.45, hidden: true },
  { id: "mini4", kind: "prop", model: "rain_boots", color: "red", hud: true, parent: "slot4", at: [0, -0.24, 0.3], size: 1.15, rotation: [15, -30, 0], hidden: true },
  { id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot4", at: [0, -0.26, 0.2], size: 0.42, hidden: true },
);
objects.push(...countdownObjects());
objects.push(...bubbleObjects([
  { id: "rain", text: "RAIN", color: "blue" }, { id: "green", text: "GREEN", color: "green" }, { id: "yellow", text: "YELLOW", color: "gold" },
  { id: "blue", text: "BLUE", color: "blue" }, { id: "red", text: "RED", color: "red" }, { id: "three", text: "3", color: "orange" },
  { id: "splash", text: "SPLASH!", color: "teal" }, { id: "sun", text: "SUN", color: "orange" },
]));

const cast = {
  bunny: { voice: "soft", pitch: 1.3, speed: 1.0 },
  duck: { voice: "squeaky", pitch: 1.0, speed: 1.0 },
  pip: { voice: "squeaky", pitch: 1.2, speed: 1.0 },
};

// ---- Helpers --------------------------------------------------------------------------------------------------
const r2 = (v) => Math.round(v * 100) / 100;
const hop = (target, at, height = 0.25, dur = 0.42) => ({ do: "hop", target, at, height, dur });
const front = (target, at) => ({ do: "turn", target, to: [0, 0, 0], at, dur: 0.3 });
/** A soft, friendly thunder rumble (low drum taps) with the rain clouds shivering. */
const rumble = (at) => [
  ...[0, 0.18, 0.34, 0.5].map((k, j) => ({ do: "sound", sound: "drum", at: r2(at + k), volume: 0.32 - j * 0.05 })),
  { do: "wiggle", target: "cloud1", at, deg: 6, dur: 0.8 },
  { do: "wiggle", target: "cloud2", at: at + 0.15, deg: 6, dur: 0.8 },
];
/** Open umbrella `id` (stick with a furled cover and a hidden canopy). */
const openUmb = (id, at, sound = "pop") => [
  { do: "hide", target: `${id}_f`, at, dur: 0.15 },
  { do: "pop", target: `${id}_c`, at: at + 0.05, dur: 0.45, sound },
];
/** Jump into puddle i (1-based) at `at`: the puddle ripples and splashes. */
const splash = (i, at, volume = 0.6) => [
  { do: "pop", target: `spl${i}`, at, dur: 0.25, sound: false },
  { do: "sound", sound: "splash", at, volume },
  { do: "hide", target: `spl${i}`, at: at + 0.45, dur: 0.25 },
  { do: "show", target: `rip${i}`, at, dur: 0.1 },
  { do: "grow", target: `rip${i}`, to: 3.2, at: at + 0.05, dur: 0.8, ease: "quadOut" },
  { do: "hide", target: `rip${i}`, at: at + 0.75, dur: 0.2 },
  { do: "grow", target: `rip${i}`, to: 1, at: at + 0.96, dur: 0.05 },
];
/** Hop from `from` into puddle i and splash (about 0.5 s). */
const hopIn = (who, from, i, at, height = 0.4) => [
  { do: "path", target: who, points: [from, PUD[i - 1]], dur: 0.45, at, face: true },
  hop(who, at, height, 0.45),
  splash(i, at + 0.42),
];
const SUNNY = (at = 0.1) => [
  { do: "hide", target: "rain", at, dur: 0.3 },
  { do: "move", target: "cloud1", to: [-17, 4.6, -4.2], at, dur: 1.6, ease: "sineInOut" },
  { do: "move", target: "cloud2", to: [17, 4.8, -4.8], at, dur: 1.6, ease: "sineInOut" },
  { do: "lights", rig: "soft_day", background: "sky", at, dur: 1.2 },
  { do: "pop", target: "sun", at: at + 0.4, dur: 0.5, sound: "magic_sparkle" },
  { do: "show", target: "rays", at: at + 0.6, dur: 0.5 },
  { do: "spin", target: "rays", axis: "z", turns: 0.25, at: at + 0.6, dur: 2.4, ease: "linear" },
];
/** Four sung beats (lines with their tunes) with extra actions per line. */
const verse = (pre, lines, tunes, extras) => lines.map((l, k) => beat(`${pre}${k + 1}`, 3.2, sung(l, tunes[k], extras[k] ?? [])));
/** Generic sung moves for the traditional verse: rain pops on line 1, the friend hops on line 3. */
const chorusMoves = (who, cam, first = []) => [
  [{ do: "camera", ...cam, dur: 1.0 }, word("rain", onBeat(1)), { do: "clip", target: "robo", clip: "Dance", at: 0.1 }, { do: "look", target: who, at: 0.2, to: [0, 4.5, -2] }, ...first],
  [unword("rain", 0.2), { do: "look", target: who, at: 0.2, to: "ahead" }, { do: "wiggle", target: "cloud1", at: onBeat(1), deg: 8, dur: 0.8 }],
  [{ do: "feel", target: who, feeling: "joyful", at: 0.2 }, hop(who, onBeat(2)), hop(who, onBeat(3.5))],
  [{ do: "wiggle", target: who, at: onBeat(0.5), deg: 8, dur: 1.2 }, { do: "feel", target: who, feeling: "happy", at: onBeat(3) }],
];

// ---- Scenes ---------------------------------------------------------------------------------------------------
const scenes = [];

// 0:00 The hook: a soft rumble, pop, pop, pop! Three umbrellas open, and the rain starts.
scenes.push({ id: "hello", title: "Rumble... pop, pop, pop!", beats: [
  beat("h1", 3.0, [
    { do: "lights", rig: "overcast", background: "rain_sky", at: 0, dur: 0.05 },
    { do: "camera", position: [0.2, 1.6, 4.6], lookAt: [0.2, 1.3, -3.0], fov: 40, dur: 0 },
    rumble(0.05),
    say("Rumble, rumble... pop, pop, pop!", { at: 0.6 }),
    openUmb("u1", 1.15), openUmb("u2", 1.55), openUmb("u3", 1.95),
    { do: "show", target: "rain", at: 0.9, dur: 0.3 },
    { do: "sound", sound: "rain", at: 0.9, volume: 0.45 },
  ]),
  beat("h2", 2.6, [
    { do: "camera", ...CAM, dur: 1.6 },
    say("Uh-oh, rain! Let's sing with our friends!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
    ...["u1_c", "u2_c", "u3_c"].map((t, k) => ({ do: "wiggle", target: t, at: 0.4 + k * 0.3, deg: 8, dur: 0.6 })),
  ]),
  beat("h3", 3.0, [
    say("A hat, a coat, an umbrella... and a surprise!", { at: 0.2 }),
    [1, 2, 3, 4].map((i) => ({ do: "pop", target: `slot${i}`, at: 0.4 + (i - 1) * 0.35, dur: 0.35, sound: "pop" })),
    { do: "pop", target: "qmark", at: 2.0, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot4", at: 2.2, deg: 12, dur: 0.8 },
  ]),
]});

// ---- Verse 1: little Robo, and the green hat. ---------------------------------------------------------------------
scenes.push({ id: "v1_song", title: "Sing: little Robo", music: false, beats: [
  beat("a0", 2.2, [{ do: "camera", ...ROBO_CAM, dur: 1.2 }, say("Robo wants to play! Sing with me!", { at: 0.1 }), { do: "look", target: "robo", at: 0.2, to: [0, 1.6, 9] }]),
  ...verse("s1", chorus("Robo"), TUNES, chorusMoves("robo", ROBO_CAM)),
]});

scenes.push({ id: "v1_hat", title: "A hat for Robo", beats: [
  beat("a1", 2.6, [
    { do: "show", target: "drop1", at: 0.1, dur: 0.15 },
    { do: "move", target: "drop1", to: [ROBO[0], 1.7, ROBO[2]], at: 0.15, dur: 0.55, ease: "quadIn" },
    { do: "hide", target: "drop1", at: 0.7, dur: 0.1 },
    { do: "sound", sound: "splash", at: 0.7, volume: 0.5 },
    { do: "feel", target: "robo", feeling: "surprised", at: 0.72 },
    say("Drip, drop! My head is wet!", { at: 0.8 }),
    { do: "clip", target: "robo", clip: "No", at: 0.9 },
  ]),
  beat("a2", 2.6, [
    say("I need a hat! Look!", { at: 0.1 }),
    { do: "show", target: "hat", at: 0.6, dur: 0.3 },
    { do: "move", target: "hat", to: [0, 1.56, 0], at: 0.9, dur: 0.55, ease: "quadIn" },
    { do: "sound", sound: "land", at: 1.45, volume: 0.5 },
    { do: "sound", sound: "magic_sparkle", at: 1.5, volume: 0.5 },
    { do: "feel", target: "robo", feeling: "joyful", at: 1.5 },
    { do: "clip", target: "robo", clip: "Wave", at: 1.5 },
  ]),
  ...yourTurn({ id: "green", ask: "What colour is my hat? Say green!", answer: "Green!", praise: "Yes! A green hat! Hooray!", wordId: "green", slot: 1, mini: "mini1", look: "robo" }),
]});

scenes.push({ id: "v1_gear", title: "Sing: green hat", music: false, beats: verse("g1", GEAR.hat, TUNES, [
  [{ do: "camera", position: [-2.2, 1.7, 5.6], lookAt: [-3.6, 1.4, 0.2], fov: 40, dur: 1.0 }, { do: "clip", target: "robo", clip: "Dance", at: 0.1 }, word("green", onBeat(1)), { do: "wiggle", target: "hat", at: onBeat(1), deg: 10, dur: 0.8 }],
  [unword("green", 0.2), { do: "look", target: "robo", at: 0.2, to: [-4, 4, 1] }],
  [{ do: "clip", target: "robo", clip: "Wave", at: onBeat(2) }, { do: "sound", sound: "splash", at: onBeat(2.5), volume: 0.4 }, { do: "look", target: "robo", at: 0.2, to: "ahead" }],
  [{ do: "wiggle", target: "hat", at: onBeat(0.5), deg: 10, dur: 1.0 }, { do: "clip", target: "robo", clip: "ThumbsUp", at: onBeat(2) }],
])});

// ---- Verse 2: little Bunny, and the yellow raincoat. ---------------------------------------------------------------
scenes.push({ id: "v2_intro", title: "Who's coming? Bunny!", beats: [
  beat("b1", 3.0, [
    { do: "camera", ...CAM, dur: 1.2 },
    say("Who's coming? Hop, hop... it's Bunny!", { at: 0.2 }),
    { do: "path", target: "bunny", points: [OFF(1.5), [3.5, 0, 1.6], [0.4, 0, 1.4], BUNNY], dur: 2.4, at: 0.2, face: true },
    ...[0, 1, 2, 3, 4].map((k) => hop("bunny", 0.25 + k * 0.48, 0.3, 0.44)),
    front("bunny", 2.65),
  ]),
  beat("b2", 2.6, [
    { do: "camera", ...BUNNY_CAM, dur: 1.2 },
    { do: "feel", target: "bunny", feeling: "surprised", at: 0.1 },
    { do: "say", who: "bunny", text: "Hello! Brr, I'm wet!", at: 0.15 },
    { do: "wiggle", target: "bunny", at: 0.3, deg: 6, dur: 1.2 },
    say("Let's sing for Bunny!", { at: "after" }),
  ]),
]});

scenes.push({ id: "v2_song", title: "Sing: little Bunny", music: false, beats: verse("s2", chorus("Bunny"), TUNES, chorusMoves("bunny", BUNNY_CAM, [{ do: "feel", target: "bunny", feeling: "happy", at: 0.2 }])) });

scenes.push({ id: "v2_coat", title: "A coat for Bunny", beats: [
  beat("c1", 2.6, [
    { do: "camera", position: [-2.35, 1.1, 3.35], lookAt: [-1.5, 0.68, 0.8], fov: 40, dur: 1.0 },
    say("Bunny needs a raincoat! Ta-da!", { at: 0.1 }),
    { do: "show", target: "coat", at: 1.0, dur: 0.5 },
    { do: "sound", sound: "magic_sparkle", at: 1.0, volume: 0.6 },
    { do: "feel", target: "bunny", feeling: "joyful", at: 1.2 },
    { do: "spin", target: "bunny", at: 1.3, dur: 0.8 },
  ]),
  ...yourTurn({ id: "yellow", ask: "What colour is the coat? Say yellow!", answer: "Yellow!", answerWho: "bunny", praise: "Yes! A yellow raincoat!", wordId: "yellow", slot: 2, mini: "mini2" }),
]});

scenes.push({ id: "v2_gear", title: "Sing: yellow coat", music: false, beats: verse("g2", GEAR.coat, TUNES, [
  [{ do: "camera", ...BUNNY_CAM, dur: 1.0 }, word("yellow", onBeat(0.5)), { do: "sound", sound: "whoosh", at: onBeat(3), volume: 0.3 }, { do: "sound", sound: "whoosh", at: onBeat(3.6), volume: 0.3 }],
  [unword("yellow", 0.2), { do: "look", target: "bunny", at: 0.2, to: [-2.4, 3.2, 3.5] }, { do: "wiggle", target: "coat", at: onBeat(2), deg: 6, dur: 0.8 }],
  [{ do: "look", target: "bunny", at: 0.2, to: "ahead" }, hop("bunny", onBeat(2.5)), hop("bunny", onBeat(3.5)), hop("bunny", onBeat(4.5))],
  [{ do: "camera", ...CAM, dur: 1.2 }, { do: "spin", target: "bunny", at: onBeat(1), dur: 0.8 }, { do: "clip", target: "robo", clip: "ThumbsUp", at: onBeat(2) }],
])});

// ---- Verse 3: little Ducky, and the umbrella: what colour? -----------------------------------------------------------
scenes.push({ id: "v3_intro", title: "Ducky's umbrella", beats: [
  beat("d1", 3.0, [
    { do: "show", target: "dstick", at: 0, dur: 0.05 }, { do: "show", target: "dfurl", at: 0, dur: 0.05 },
    say("Quack, quack! Here comes Ducky!", { at: 0.2 }),
    { do: "path", target: "duck", points: [OFF(1.6), [3.6, 0, 1.6], [1.5, 0, 1.3], DUCK], dur: 2.5, at: 0.2, face: true },
    ...[0, 1, 2, 3, 4, 5].map((k) => ({ do: "wiggle", target: "duck", at: 0.25 + k * 0.4, deg: 7, dur: 0.38 })),
    front("duck", 2.75),
    { do: "look", target: "bunny", at: 0.6, to: "duck" },
  ]),
  beat("d2", 2.4, [
    { do: "camera", ...DUCK_CAM, dur: 1.2 },
    { do: "say", who: "duck", text: "Quack! I have an umbrella!", at: 0.15 },
    { do: "wiggle", target: "dstick", at: 0.5, deg: 8, dur: 1.0 },
    { do: "look", target: "bunny", at: 0.3, to: "ahead" },
  ]),
  beat("d3", 2.6, [
    say("What colour is it inside? Guess!", { at: 0.1 }),
    { do: "highlight", target: "dfurl", at: 0.5, dur: 1.8 },
    { do: "look", target: "robo", at: 0.2, to: [0, 1.6, 9] },
  ]),
  beat("d4", 2.7, [countdown(0.15), { do: "wiggle", target: "dfurl", at: 0.3, deg: 8, dur: 2.0 }]),
  beat("d5", 2.8, [
    { do: "hide", target: "dfurl", at: 0.05, dur: 0.15 },
    { do: "pop", target: "dcan", at: 0.1, dur: 0.5, sound: "pop" },
    { do: "sound", sound: "magic_sparkle", at: 0.3, volume: 0.6 },
    word("blue", 0.4),
    say("Pop! It's blue!", { at: 0.4 }),
    { do: "feel", target: "duck", feeling: "joyful", at: 0.3 }, hop("duck", 0.5, 0.25),
    { do: "clip", target: "robo", clip: "Wave", at: 0.5 },
    { do: "look", target: "robo", at: 0.2, to: "duck" },
  ]),
  beat("d6", 2.2, [
    { do: "say", who: "duck", text: "Blue! Quack, quack!", at: 0.1 },
    { do: "look", target: "robo", at: 0.1, to: "ahead" },
    unword("blue", 1.0), fillSlot(3, "mini3", 0.6),
  ]),
]});

scenes.push({ id: "v3_song", title: "Sing: little Ducky", music: false, beats: verse("s3", chorus("Ducky"), TUNES, chorusMoves("duck", DUCK_CAM)) });

scenes.push({ id: "v3_gear", title: "Sing: blue umbrella", music: false, beats: verse("g3", GEAR.umbrella, TUNES, [
  [{ do: "camera", position: [0.6, 2.4, 5.6], lookAt: [0.45, 1.3, 0.6], fov: 40, dur: 1.0 }, word("blue", onBeat(0.5)), { do: "wiggle", target: "dcan", at: onBeat(3.5), deg: 10, dur: 0.6 }, { do: "sound", sound: "pop", at: onBeat(3.5), volume: 0.5 }],
  [unword("blue", 0.2), { do: "look", target: "duck", at: 0.2, to: "dcan" }, ...[1.5, 2.5, 3.5].map((k) => ({ do: "sound", sound: "bubble_pop", at: onBeat(k), volume: 0.4 }))],
  [{ do: "look", target: "duck", at: 0.2, to: "ahead" }, ...[0, 1, 2, 3, 4, 5].map((k) => ({ do: "sound", sound: "bubble_pop", at: onBeat(k * 0.75), volume: 0.35 })), { do: "wiggle", target: "duck", at: onBeat(1), deg: 8, dur: 2.0 }],
  [{ do: "camera", ...CAM, dur: 1.2 }, { do: "wiggle", target: "dcan", at: onBeat(3.5), deg: 10, dur: 0.6 }, { do: "sound", sound: "pop", at: onBeat(3.5), volume: 0.5 }, hop("duck", onBeat(3.5), 0.2)],
])});

// ---- Verse 4: little Pip, count the puddles, red boots and splash! -----------------------------------------------------
scenes.push({ id: "v4_intro", title: "Count the puddles!", beats: [
  beat("p1", 3.0, [
    { do: "camera", ...CAM, dur: 1.0 },
    say("Here comes Pip! Pip loves puddles!", { at: 0.2 }),
    { do: "path", target: "pip", points: [OFF(1.4), [4.6, 0, 1.3], PIP], dur: 2.0, at: 0.2, face: true },
    { do: "sound", sound: "footstep_soft", at: 0.4, volume: 0.45 }, { do: "sound", sound: "footstep_soft", at: 1.2, volume: 0.45 },
    { do: "turn", target: "pip", to: [0, -15, 0], at: 2.25, dur: 0.3 },
    { do: "look", target: "duck", at: 0.6, to: "pip" },
  ]),
  beat("p2", 2.6, [
    { do: "camera", ...PUD_CAM, dur: 1.2 },
    { do: "look", target: "duck", at: 0.2, to: "ahead" },
    say("Look! Puddles! Let's count them!", { at: 0.1 }),
    [1, 2, 3].map((i) => ({ do: "show", target: `pud${i}`, at: 0.5 + (i - 1) * 0.3, dur: 0.4 })),
    [1, 2, 3].map((i) => ({ do: "sound", sound: "bubble_pop", at: 0.5 + (i - 1) * 0.3, volume: 0.45 })),
    { do: "look", target: "pip", at: 0.4, to: "pud2" },
  ]),
  beat("p3", 3.4, [
    say("One... two... three!", { at: 0.2 }),
    [1, 2, 3].flatMap((i) => [
      { do: "pop", target: `num${i}`, at: 0.3 + (i - 1) * 0.85, dur: 0.4, sound: "ding" },
      { do: "show", target: `rip${i}`, at: 0.3 + (i - 1) * 0.85, dur: 0.1 },
      { do: "grow", target: `rip${i}`, to: 3.0, at: 0.35 + (i - 1) * 0.85, dur: 0.8, ease: "quadOut" },
      { do: "hide", target: `rip${i}`, at: 1.05 + (i - 1) * 0.85, dur: 0.2 },
      { do: "grow", target: `rip${i}`, to: 1, at: 1.3 + (i - 1) * 0.85, dur: 0.05 },
    ]),
  ]),
  beat("p4", 2.4, [
    word("three", 0.1),
    say("Three puddles! Clever you!", { at: 0.1 }),
    [1, 2, 3].map((i) => ({ do: "wiggle", target: `num${i}`, at: 0.3 + (i - 1) * 0.2, deg: 12, dur: 0.6 })),
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.4 },
    unword("three", 1.9), [1, 2, 3].map((i) => ({ do: "hide", target: `num${i}`, at: 1.8 + (i - 1) * 0.1, dur: 0.3 })),
  ]),
]});

scenes.push({ id: "v4_song", title: "Sing: little Pip", music: false, beats: verse("s4", chorus("Pip"), [T.a, T.b, T.c1, T.a], chorusMoves("pip", PIP_CAM)) });

scenes.push({ id: "v4_boots", title: "Red boots: the surprise!", beats: [
  beat("k1", 2.8, [
    { do: "camera", position: [2.2, 1.0, 4.4], lookAt: [2.4, 0.5, 0.8], fov: 40, dur: 1.0 },
    say("Pip needs boots for splashing! The surprise!", { at: 0.1 }),
    { do: "hide", target: "qmark", at: 1.2, dur: 0.2 },
    { do: "show", target: "boots", at: 1.4, dur: 0.5 },
    { do: "sound", sound: "magic_sparkle", at: 1.4, volume: 0.6 },
    { do: "feel", target: "pip", feeling: "joyful", at: 1.6 }, hop("pip", 1.9, 0.2),
  ]),
  ...yourTurn({ id: "red", ask: "What colour are the boots? Say red!", answer: "Red!", answerWho: "pip", praise: "Yes! Red boots! Stomp, stomp!", wordId: "red", slot: 4, mini: "mini4",
    extra: [{ do: "burst", target: "confetti", at: 0.4, dur: 2.0, sound: false }] }),
]});

scenes.push({ id: "v4_gear", title: "Sing: red boots", music: false, beats: verse("g4", GEAR.boots, TUNES, [
  [{ do: "camera", ...PIP_CAM, dur: 1.0 }, word("red", onBeat(0.5)), ...[2, 3, 4].map((k) => ({ do: "sound", sound: "step", at: onBeat(k), volume: 0.5 })), ...[2, 3, 4].map((k) => hop("pip", onBeat(k), 0.12, 0.3))],
  [unword("red", 0.2), { do: "look", target: "pip", at: 0.2, to: "pud3" }, hop("pip", onBeat(3), 0.2)],
  [hopIn("pip", PIP, 3, onBeat(0.2)), hopIn("pip", PUD[2], 2, onBeat(1.6)), hopIn("pip", PUD[1], 1, onBeat(3.0)), { do: "look", target: "pip", at: 0.2, to: "ahead" }],
  [front("pip", 0.2), ...[0.5, 1.5, 2.5].map((k) => ({ do: "sound", sound: "step", at: onBeat(k), volume: 0.5 })), ...[0.5, 1.5, 2.5].map((k) => hop("pip", onBeat(k), 0.12, 0.3)),
    { do: "path", target: "pip", points: [PUD[0], [0.6, 0, 1.6], PIP], dur: 1.3, at: onBeat(3.2), face: true }],
])});

// Splash! The child jumps on "splash", and so do Pip, Bunny and Ducky.
scenes.push({ id: "v4_splash", title: "Jump on splash!", beats: [
  beat("x1", 2.6, [
    front("pip", 0.1),
    { do: "camera", ...PUD_CAM, dur: 1.0 },
    say("Your turn! Jump when I say splash!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
    { do: "path", target: "bunny", points: [BUNNY, [-1.6, 0, 1.6]], dur: 0.8, at: 0.6, face: true },
    { do: "path", target: "duck", points: [DUCK, [0.6, 0, 1.7]], dur: 0.8, at: 0.7, face: true },
    { do: "path", target: "pip", points: [PIP, [2.7, 0, 1.5]], dur: 0.8, at: 0.8, face: true },
  ]),
  beat("x2", 2.7, [countdown(0.15), front("bunny", 0.2), front("duck", 0.2), front("pip", 0.2)]),
  beat("x3", 2.8, [
    word("splash", 0.05),
    say("Splash!", { at: 0.05, caption: false }),
    { do: "caption", text: "SPLASH!", style: "title", at: 0.1, dur: 1.4 },
    hopIn("bunny", [-1.6, 0, 1.6], 1, 0.1, 0.45),
    hopIn("duck", [0.6, 0, 1.7], 2, 0.15, 0.4),
    hopIn("pip", [2.7, 0, 1.5], 3, 0.2, 0.5),
    { do: "clip", target: "robo", clip: "Wave", at: 0.15 },
    { do: "sound", sound: "giggle", at: 1.0, volume: 0.5 },
    say("Wheee! What a big splash!", { at: 1.2 }),
  ]),
  beat("x5", 1.6, [
    unword("splash", 0),
    { do: "path", target: "bunny", points: [PUD[0], BUNNY], dur: 0.8, at: 0.1, face: true },
    { do: "path", target: "duck", points: [PUD[1], DUCK], dur: 0.8, at: 0.1, face: true },
    { do: "path", target: "pip", points: [PUD[2], PIP], dur: 0.8, at: 0.1, face: true },
    front("bunny", 0.95), front("duck", 0.95), { do: "turn", target: "pip", to: [0, -15, 0], at: 0.95, dur: 0.3 },
  ]),
]});

// ---- Recap quiz -----------------------------------------------------------------------------------------------
const popPair = (a, b) => [{ do: "pop", target: a, at: 0.3, dur: 0.4, sound: "pop" }, { do: "pop", target: b, at: 0.55, dur: 0.4, sound: "pop" }];
const q1 = quizRound({ id: "q1", q: "Where are the red boots? Point to them!", left: "q_hat", right: "q_boots", answer: "q_boots", spots: [[-0.65, 1.15, 4.6], [0.65, 0.98, 4.6]], yes: "Yes! The red boots! Stomp, stomp!" });
const q2 = quizRound({ id: "q2", q: "Which one is blue? Point to it!", left: "q_umb", right: "q_coat", answer: "q_umb", spots: [[-0.65, 0.86, 4.6], [0.65, 0.92, 4.6]], yes: "Yes! The blue umbrella!" });
q2[0].do.unshift(...popPair("q_umb", "q_coat"), { do: "hide", target: "q_hat", at: 0, dur: 0.3 }, { do: "hide", target: "q_boots", at: 0.05, dur: 0.3 });
// A fixed close camera on the pair instead of the kit's shot (the props float in front of the cast).
const QCAM = { do: "camera", position: [0, 1.35, 6.75], lookAt: [0, 1.17, 4.6], fov: 40, dur: 1.2 };
for (const q of [q1, q2]) q[0].do = [...q[0].do.filter((x) => x.do !== "shot"), QCAM];
q2[3].do.push({ do: "camera", ...CAM, dur: 1.0 }, { do: "hide", target: "q_umb", at: 0.4, dur: 0.3 }, { do: "hide", target: "q_coat", at: 0.45, dur: 0.3 });
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 2.4, [say("Now a quick game!", { at: 0.1 }), { do: "camera", ...CAM, dur: 1.0 }, { do: "clip", target: "robo", clip: "Dance", at: 0.2 }, popPair("q_hat", "q_boots")]),
  ...q1,
  ...q2,
]});

// ---- Finale: the sun comes out, everybody sings and plays, bye-bye. ---------------------------------------------------
scenes.push({ id: "sun", title: "Here comes the sun!", beats: [
  beat("f1", 3.0, [
    { do: "camera", ...WIDE, dur: 1.4 },
    say("Look! The rain is going away!", { at: 0.1 }),
    SUNNY(0.6),
    ...["robo", "bunny", "duck", "pip"].map((w, k) => ({ do: "look", target: w, at: 0.8 + k * 0.1, to: "sun" })),
  ]),
  beat("f2", 2.8, [
    word("sun", 0.1),
    say("Hello, sun! Hooray! Let's play!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
    ...["bunny", "duck", "pip"].map((w, k) => ({ do: "feel", target: w, feeling: "joyful", at: 0.3 + k * 0.1 })),
    ...["robo", "bunny", "duck", "pip"].map((w) => ({ do: "look", target: w, at: 1.2, to: "ahead" })),
    unword("sun", 1.8),
  ]),
]});

scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  ...verse("z", GEAR.sun, TUNES, [
    [{ do: "camera", ...CAM, dur: 1.0 }, { do: "clip", target: "robo", clip: "Dance", at: 0.1 }, ...["u1_c", "u2_c", "u3_c"].map((t, k) => ({ do: "wiggle", target: t, at: onBeat(1 + k), deg: 8, dur: 0.6 }))],
    [{ do: "grow", target: "sun", to: 1.3, at: onBeat(1), dur: 0.6 }, hop("bunny", onBeat(1)), hop("duck", onBeat(2)), hop("pip", onBeat(3))],
    [{ do: "spin", target: "bunny", at: onBeat(1), dur: 0.8 }, { do: "spin", target: "duck", at: onBeat(1.5), dur: 0.8 }, { do: "spin", target: "pip", at: onBeat(2), dur: 0.8 }],
    [hopIn("bunny", BUNNY, 1, onBeat(0.2)), hopIn("duck", DUCK, 2, onBeat(0.4)), hopIn("pip", PIP, 3, onBeat(0.6)), { do: "burst", target: "confetti", at: onBeat(2.5), dur: 2.4 }],
  ]),
  beat("z5", 3.2, [
    { do: "camera", position: [0, 2.2, 9.0], lookAt: [0, 1.1, 0.8], fov: 40, dur: 1.6 },
    ...["bunny", "duck", "pip"].map((w) => front(w, 0.1)),
    say("Bye-bye, rain! Hello, sunshine!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
    ...[1, 2, 3, 4].map((s, k) => ({ do: "wiggle", target: `slot${s}`, at: 0.5 + k * 0.3, deg: 10, dur: 0.5 })),
  ]),
  beat("z6", 3.2, [
    { do: "say", who: "bunny", text: "Bye-bye!", at: 0.1 },
    hop("bunny", 0.2, 0.3), hop("duck", 0.4, 0.3), hop("pip", 0.6, 0.3),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.4 },
    { do: "camera", position: [0, 3.2, 13.5], lookAt: [0, 1.6, -0.6], fov: 40, dur: 3 },
  ]),
]});

// ---- Meta -----------------------------------------------------------------------------------------------------
const description = "Sing Rain, Rain, Go Away with Robo, Bunny, Ducky and Pip! Rumble, rumble, pop, pop, pop: the umbrellas open and the rain comes down. Each friend gets one piece of rain gear: a green hat for Robo, a yellow raincoat for Bunny, a blue umbrella for Ducky (guess the colour before it pops open!) and red boots for Pip. Count the puddles, jump on splash, and sing hello to the sun when the rain goes away.";
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Rain, Rain, Go Away", episode: "br14", seed: 314,
    skills: ["weather_seasons_1", "count_to_5_prek"],
    cast,
    youtube: {
      title: "Rain, Rain, Go Away ☔ Rain Gear Colours Song for Toddlers | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: the weather words rain and sun, the colours green, yellow, blue and red on rain gear (hat, raincoat, umbrella and boots), and counting to three.\n\nSing at home: put on a pretend hat, zip up a pretend coat, guess the umbrella's colour with a 3, 2, 1, and jump when you hear "splash!". Rain, Rain, Go Away is a traditional public-domain rhyme sung to its traditional tune; the verses about the hat, the coat, the umbrella, the boots and the sun are original words written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["rain rain go away", "nursery rhymes", "weather song for kids", "rain song", "colours for toddlers", "learn colors", "umbrella song", "puddles", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "umbrella", title: "RAIN, RAIN!", subtitle: "Go away! Sing along", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "garden",
        lights: { rig: "overcast", background: "rain_sky" },
        camera: { position: [1.9, 1.25, 5.0], lookAt: [2.5, 0.95, 0.2], fov: 38 },
        objects: [
          { id: "duck", kind: "critter", species: "duck", at: [3.0, 0, 0.7], size: 1.0, rotation: [0, -20, 0], feeling: "joyful" },
          { id: "st", kind: "prop", model: "umbrella_stick", color: "blue", parent: "duck", at: [0.5, 0.5, 0.14], size: 0.9 },
          { id: "can", kind: "prop", model: "umbrella_canopy", color: "blue", parent: "st", at: [0, STICK_UP, 0], size: 0.9 },
          { id: "bunny", kind: "critter", species: "bunny", at: [4.5, 0, 0.2], size: 0.95, rotation: [0, -25, 0], feeling: "joyful" },
          { id: "coat", kind: "prop", model: "raincoat", parent: "bunny", at: [0, 0, 0], size: 0.95 },
          { id: "pud", kind: "prop", model: "puddle", at: [3.5, 0, 1.8], size: 1.1 },
          { id: "spl", kind: "prop", model: "splash_drops", at: [3.5, 0, 1.8], size: 0.9 },
          { id: "cloud", kind: "prop", model: "rain_cloud", at: [3.8, 2.6, -1.6], size: 0.9 },
        ] },
      { name: "splash", title: "SPLASH!", subtitle: "Red boots and puddles", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "garden",
        camera: { position: [1.2, 1.3, 5.6], lookAt: [2.0, 0.9, 0.2], fov: 38 },
        objects: [
          { id: "pip", kind: "critter", species: "toddler", at: [2.6, 0.25, 1.0], size: 1.0, rotation: [0, -15, 0], feeling: "joyful" },
          { id: "boots", kind: "prop", model: "rain_boots", color: "red", parent: "pip", at: [0, 0, 0], size: 1.0 },
          { id: "pud", kind: "prop", model: "puddle", at: [2.6, 0, 1.1], size: 1.3 },
          { id: "spl", kind: "prop", model: "splash_drops", at: [2.6, 0, 1.1], size: 1.3 },
          { id: "robo", kind: "character", character: "robot", at: [4.4, 0, -0.2], rotation: [0, -25, 0], clip: "Wave", feeling: "happy" },
          { id: "hat", kind: "prop", model: "rain_hat", color: "green", parent: "robo", at: [0, 1.56, 0], size: 1.5 },
          { id: "sun", kind: "prop", model: "sun", at: [4.6, 3.0, -2.6], size: 0.7 },
          { id: "rays", kind: "prop", model: "sun_rays", parent: "sun", at: [0, 0, -0.2], size: 1.05 },
        ] },
    ],
  }),
  stage: { preset: "garden" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "rain_rain_go_away");
