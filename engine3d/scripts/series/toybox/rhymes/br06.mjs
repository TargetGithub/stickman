// Builds ../br06_row_your_boat.json: Row, Row, Row Your Boat. The traditional verse (public domain) plus four
// original river verses: Robo rows down a river and meets a friend on the bank in each one (Frog, Duck, Turtle,
// Fish). Teaches fast and slow (slow and fast verses take turns: the oars, the boat's bob, the water's flow dots
// and Robo's voice all go slow or fast, with a SLOW / FAST word pop) and river animals ("Who's on the riverbank?"
// guesses with a peek and a 3-2-1 reveal).
// Robo sits in the rowing boat the whole video (Sitting clip), so this rhyme never cues his standing clips (Wave,
// ThumbsUp, Jump, Dance): it uses feel, look and point instead, with its own your-turn and quiz rounds.
// Run: node br06.mjs (then tools/sung_durs.mjs on the json, and this again).
import { readFileSync, existsSync } from "node:fs";
import {
  BEAT, say, beat, sung, onBeat, tuneBeats, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, showTracker, fillSlot, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// The traditional tune (6/8 felt in 4/4 at 112, one note per syllable; ":1.5" a dotted beat).
const T = {
  row: "C4:1.5 C4:1.5 C4 D4:0.5 E4:3", //                     Row, row, row your boat,
  stream: "E4 D4:0.5 E4 F4:0.5 G4:3", //                      Gent-ly down the stream.
  merrily: "C5:0.5 C5:0.5 C5:0.5 G4:0.5 G4:0.5 G4:0.5 E4:0.5 E4:0.5 E4:0.5 C4:0.5 C4:0.5 C4:0.5", // Mer-ri-ly x4
  eight: "C5:0.75 C5:0.75 G4:0.75 G4:0.75 E4:0.75 E4:0.75 C4:0.75 C4:0.75", // the merrily line with 8 syllables
  dream: "G4 F4:0.5 E4 D4:0.5 C4:3", //                       Life is but a dream.
};
const SPEED = { slow: 0.8, mid: 1, fast: 1.2 }; // Robo's voice speed per verse
const ROW_LINE = { slow: "Row... row... row your boat,", mid: "Row, row, row your boat,", fast: "Row, row, row your boat!" };
const TRAD = [ROW_LINE.mid, "Gently down the stream.", "Merrily, merrily, merrily, merrily,", "Life is but a dream."];

// ---- The river ---------------------------------------------------------------------------------------------------
const CAM = { position: [0.4, 2.75, 8.8], lookAt: [0.4, 0.7, -1.0], fov: 40 };
const RIVER_Z = -0.35; // the river runs left-right, z -2.4 .. 1.7
const BOAT_Y = -0.12; // floating: the water line on the hull
const HOME = [0.4, BOAT_Y, -0.15];
const SUNK = -1.4; // under the floor: out of sight
const FLOAT = -0.12;
const LANES = [-1.8, -1.05, 0.75, 1.35];

// Four riverbank friends: where each hides (behind its cover, sunk), peeks and sits after the reveal.
const F = [
  { id: "frog", name: "Frog", species: "frog", size: 0.95, mode: "slow", cover: "reeds_frog", coverPart: "reeds_frog#reed_tall", boatX: -1.0,
    hide: [-4.7, SUNK, -3.55], behind: [-4.7, 0, -3.55], peek: [-4.0, -0.38, -3.3], spot: [-3.5, 0.3, -2.8], rot: [0, 25, 0],
    sound: "Ribbit! Ribbit!", hello: "Ribbit! Hello! I'm Frog!", color: "green" },
  { id: "duck", name: "Duck", species: "duck", size: 0.95, mode: "fast", cover: "reeds_duck", coverPart: "reeds_duck#reed_tall", boatX: 1.7,
    hide: [-1.4, SUNK, -3.65], behind: [-1.4, 0, -3.65], peek: [-0.7, -0.42, -3.4], spot: [-0.9, FLOAT, -1.95], rot: [0, 20, 0],
    sound: "Quack! Quack!", hello: "Quack! Hi! I'm Duck!", color: "orange" },
  { id: "turtle", name: "Turtle", species: "turtle", size: 1.15, mode: "slow", cover: "bush_turtle", coverPart: "bush_turtle", boatX: 4.6,
    hide: [1.7, SUNK, -3.75], behind: [1.7, 0, -3.75], peek: [2.45, -0.3, -3.45], spot: [2.9, 0, -2.52], rot: [0, -10, 0],
    sound: "Slow and steady!", hello: "Hello! I'm Turtle! Slow and steady!", color: "teal" },
  { id: "fish", name: "Fish", species: "fish", size: 0.8, mode: "fast", cover: null, coverPart: null, boatX: 6.2,
    hide: [3.6, SUNK, 0.85], behind: [3.6, -0.9, 0.85], peek: null, spot: [3.4, -0.3, 0.85], rot: [0, 40, 0],
    sound: "Blub! Blub!", hello: "Blub blub! I'm Fish! Splash!", color: "orange" },
];
const FD = Object.fromEntries(F.map((f) => [f.id, f]));

const objects = [
  // The river: a sandy edge, the water and lily pads; grass and flowers on the near bank.
  { id: "riverbank", kind: "shape", shape: "plate", color: "sand", material: "matte", at: [0, 0.004, RIVER_Z], scale: [36, 1, 4.75] },
  { id: "river", kind: "shape", shape: "plate", color: "pond", material: "glossy", at: [0, 0.012, RIVER_Z], scale: [36, 1, 4.1] },
  { id: "pad_a", kind: "prop", model: "lily_pad", at: [-5.6, 0.03, 1.05], size: 0.9, rotation: [0, 30, 0] },
  { id: "pad_b", kind: "prop", model: "lily_pad", at: [-2.6, 0.03, -2.0], size: 0.75, rotation: [0, -40, 0] },
  { id: "pad_c", kind: "prop", model: "lily_pad", at: [5.9, 0.03, 0.7], size: 1.0, rotation: [0, 70, 0] },
  ...[[-6.8, 2.4], [-5.2, 2.9], [5.4, 2.6], [6.9, 2.3], [-3.2, 3.4], [3.6, 3.3]].map(([x, z], k) => ({ id: `grass_n${k}`, kind: "prop", model: "grass", at: [x, 0, z], size: 1.4 })),
  { id: "flower_n1", kind: "prop", model: "flower", color: "pink", at: [-6.2, 0, 2.7], size: 0.7 },
  { id: "flower_n2", kind: "prop", model: "flower", color: "yellow", at: [6.3, 0, 2.9], size: 0.7 },
  // The friends' covers on the far bank, and Frog's log.
  { id: "reeds_frog", kind: "prop", model: "pond_reeds", at: [-4.7, 0, -3.05], rotation: [0, 10, 0] },
  { id: "log", kind: "prop", model: "log", at: [-3.5, 0, -2.8], rotation: [0, 8, 0] },
  { id: "reeds_duck", kind: "prop", model: "pond_reeds", at: [-1.4, 0, -3.15], rotation: [0, -8, 0] },
  { id: "bush_turtle", kind: "prop", model: "bush", at: [1.7, 0, -3.2], size: 1.25 },
  // The boat with Robo sitting in it.
  { id: "boat", kind: "prop", model: "rowing_boat", at: [-10, BOAT_Y, HOME[2]], rotation: [0, 90, 0], size: 1.1 },
  { id: "robo", kind: "character", character: "robot", parent: "boat", at: [0, 0.12, 0], rotation: [0, -72, 0], clip: "Sitting", feeling: "happy" },
];
// The water's flow: white dots drifting left past the boat (slow lanes, fast lanes; one set shows at a time).
for (const [k, z] of LANES.entries()) {
  const pts = [[14, 0, 0], [-14, 0, 0]];
  objects.push({ id: `flow_s${k}`, kind: "flow", at: [0, 0.05, z], points: pts, count: 18, speed: 0.45 + k * 0.05, size: 0.08, color: "white" });
  objects.push({ id: `flow_f${k}`, kind: "flow", at: [0, 0.05, z], points: pts, count: 18, speed: 2.5 + k * 0.2, size: 0.08, color: "white", hidden: true });
}
for (const f of F) {
  objects.push({ id: f.id, kind: "critter", species: f.species, size: f.size, at: f.hide, rotation: f.rot });
}
objects.push({ id: "rip_fish", kind: "prop", model: "splash_ripples", at: [F[3].hide[0], 0.04, F[3].hide[2]], size: 1, hidden: true });
objects.push({ id: "rip_duck", kind: "prop", model: "splash_ripples", parent: "duck", at: [0, 0.13, 0], size: 0.9, hidden: true });
objects.push({ id: "rip_fish2", kind: "prop", model: "splash_ripples", at: [F[3].spot[0], 0.04, F[3].spot[2]], size: 0.9, hidden: true });
objects.push({ id: "confetti", kind: "confetti", at: [0, 3.4, 0.5] });
// HUD: four friend slots (the fourth a "?" until Fish jumps), the 3-2-1 countdown and the word bubble.
objects.push(...trackerObjects(4));
F.forEach((f, i) => objects.push({ id: `mini${i + 1}`, kind: "critter", species: f.species, hud: true, parent: `slot${i + 1}`, at: [0, f.id === "fish" ? -0.3 : -0.4, 0.3], size: f.id === "fish" ? 0.4 : 0.46, rotation: [0, -12, 0], hidden: true }));
objects.push({ id: "q4", kind: "letter", text: "?", color: "purple", hud: true, parent: "slot4", at: [0, -0.2, 0.3], size: 0.5, hidden: true });
objects.push(...countdownObjects());
objects.push(...bubbleObjects([
  { id: "row", text: "ROW!", color: "red" }, { id: "slow", text: "SLOW", color: "blue" }, { id: "fast", text: "FAST!", color: "red" },
  ...F.map((f) => ({ id: f.id, text: f.name.toUpperCase(), color: f.color })),
]));

const cast = {
  frog: { voice: "squeaky", pitch: 1.0, speed: 1.0 },
  duck: { voice: "squeaky", pitch: 1.2, speed: 1.05 },
  turtle: { voice: "deep", pitch: 0.95, speed: 0.85 },
  fish: { voice: "squeaky", pitch: 1.3, speed: 1.05 },
};

// ---- Helpers -----------------------------------------------------------------------------------------------------
const r2 = (x) => Math.round(x * 100) / 100;
const PERIOD = { slow: 1.7, mid: 1.25, fast: 0.55 };
const AMP = { slow: 32, mid: 30, fast: 24 };
/** Rowing strokes from at0 for dur seconds (real time): blades lift and reach forward, then pull back. */
function row(at0, dur, mode = "mid", map = (x) => x) {
  const p = PERIOD[mode];
  const a = AMP[mode];
  const out = [];
  for (let t = at0; t + p <= at0 + dur + 0.05; t += p) {
    out.push({ do: "turn", target: "boat#oar", to: [0, -a, 8], at: r2(map(t)), dur: r2(p * 0.42), ease: "sineInOut" });
    out.push({ do: "turn", target: "boat#oar", to: [0, a, -3], at: r2(map(t + p * 0.45)), dur: r2(p * 0.5), ease: "sineInOut" });
    out.push({ do: "hop", target: "boat", at: r2(map(t + p * 0.5)), height: mode === "fast" ? 0.03 : 0.045, dur: r2(p * 0.45) });
  }
  return out;
}
/** Oars back to rest (stop rowing). */
const rest = (at = 0.1) => ({ do: "turn", target: "boat#oar", to: [0, 0, 0], at, dur: 0.5, ease: "sineInOut" });
/** Show one set of flow lanes and hide the other. */
const flow = (mode, at = 0.1) => [0, 1, 2, 3].flatMap((k) => mode === "fast"
  ? [{ do: "show", target: `flow_f${k}`, at, dur: 0.3 }, { do: "hide", target: `flow_s${k}`, at, dur: 0.3 }]
  : [{ do: "show", target: `flow_s${k}`, at, dur: 0.3 }, { do: "hide", target: `flow_f${k}`, at, dur: 0.3 }]);

// Sung beats: the rowing is laid out over the spoken line, pre-stretched so fitSung lands it in real time.
const DURS_FILE = new URL("./durs/br06.json", import.meta.url);
const DURS = existsSync(DURS_FILE) ? JSON.parse(readFileSync(DURS_FILE, "utf8")) : {};
function sungBeat(id, text, tune, mode, extra = []) {
  const full = tuneBeats(tune) * BEAT;
  const spoken = DURS[text] ?? full;
  const k = Math.min(1, spoken / full);
  const pre = (t) => (t <= 0.1 ? t : 0.1 + (t - 0.1) / k);
  const b = beat(id, r2(0.4 + full), sung(text, tune, [...row(0.1, spoken, mode, pre), ...extra]));
  b.do[0].speed = SPEED[mode];
  return b;
}
const splash = (rip, at, sound = "splash") => [
  { do: "pop", target: rip, at, dur: 0.3, sound },
  { do: "grow", target: rip, to: 1.5, at: at + 0.25, dur: 0.5 },
  { do: "hide", target: rip, at: at + 0.7, dur: 0.25 },
];

/** A your-turn round for Robo in the boat (kit yourTurn without his standing clips). */
function boatTurn({ id, ask, answer, answerWho = "robo", praise, wordId, slot, mini, look, act = [], mode = "mid" }) {
  return [
    beat(`${id}_t1`, 2.4, [say(ask, { at: 0.1 }), { do: "look", target: "robo", at: 0.1, to: [0, 1.6, 9] }, { do: "feel", target: "robo", feeling: "joyful", at: 0.2 }, wordId ? word(wordId, 0.3) : null, row(0.2, 2.2, mode)]),
    beat(`${id}_t2`, 1.9, [{ do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 }, wordId ? { do: "wiggle", target: "bubble", at: 0.2, deg: 10, dur: 1.4 } : null, row(0.1, 1.8, mode), act]),
    beat(`${id}_t3`, 2.4, [
      answerWho === "robo" ? say(answer, { at: 0.1 }) : { do: "say", who: answerWho, text: answer, at: 0.1 },
      answerWho !== "robo" ? { do: "hop", target: answerWho, at: 0.15, height: 0.3 } : null,
      say(praise, { at: "after" }), { do: "feel", target: "robo", feeling: "happy", at: 0.6 },
      look ? { do: "look", target: "robo", at: 0.2, to: look } : null,
    ]),
    beat(`${id}_t4`, 1.6, [wordId ? unword(wordId, 0) : null, slot && mini ? fillSlot(slot, mini) : null, slot === 4 ? { do: "hide", target: "q4", at: 0.15, dur: 0.2 } : null, { do: "look", target: "robo", at: 0.2, to: "ahead" }, row(0.1, 1.5, mode)]),
  ];
}

const scenes = [];

// 0:00 The hook: Robo rows in from the left: "Row with me!", the four friend slots pop, a splash teases the last.
scenes.push({ id: "hello", title: "Row with me!", beats: [
  beat("h1", 3.4, [
    { do: "camera", position: [0, 3.6, 13.5], lookAt: [0, 0.8, -0.8], fov: 40, dur: 0 },
    { do: "camera", ...CAM, dur: 3.2 },
    { do: "move", target: "boat", to: HOME, dur: 3.0, ease: "quadOut" },
    row(0, 3.3, "mid"),
    say("Row with me! Row, row, row!", { at: 0.2 }),
    word("row", 0.7),
    { do: "feel", target: "robo", feeling: "joyful", at: 0.3 },
  ]),
  beat("h2", 3.4, [
    unword("row", 0),
    say("Four friends live on the river! Let's find them!", { at: 0.1 }),
    showTracker(4, 0.4, 0.3),
    { do: "pop", target: "q4", at: 1.4, dur: 0.35, sound: false },
    { do: "look", target: "robo", at: 0.3, to: "reeds_frog" },
    row(0.1, 3.2, "mid"),
  ]),
  beat("h3", 2.8, [
    say("Ooh! Someone splashes at the end!", { at: 0.1 }),
    splash("rip_fish", 0.6),
    { do: "wiggle", target: "slot4", at: 0.4, deg: 12, dur: 1 },
    { do: "look", target: "robo", at: 0.4, to: "rip_fish" },
    { do: "feel", target: "robo", feeling: "surprised", at: 0.6 },
    rest(0.2),
  ]),
]});

// Row your arms with Robo, then the traditional verse.
scenes.push({ id: "arms", title: "Row your arms", beats: [
  beat("a1", 2.6, [
    say("Row your arms with me! Pull... and pull!", { at: 0.1 }),
    { do: "feel", target: "robo", feeling: "joyful", at: 0.2 }, { do: "look", target: "robo", at: 0.1, to: "ahead" },
    { do: "shot", target: "boat", framing: "medium", yaw: 12, height: 10, dur: 1.4 },
    row(0.3, 2.3, "mid"),
  ]),
  beat("a2", 2.2, [
    { do: "sound", sound: "tick", at: 0.4, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.65, volume: 0.5 },
    say("Row, row!", { at: 0.9, caption: true }),
    row(0.1, 2.1, "mid"),
  ]),
  beat("a3", 1.9, [say("Great rowing! Now sing!", { at: 0.1 }), { do: "camera", ...CAM, dur: 1.4 }, row(0.1, 1.8, "mid"), { do: "feel", target: "robo", feeling: "happy", at: 0.3 }]),
]});

const tradVerse = (id, extra = [[], [], [], []]) => [
  sungBeat(`${id}1`, TRAD[0], T.row, "mid", [{ do: "orbit", around: [0.4, 0.6, -0.2], degrees: 14, dur: 4 }, ...extra[0]]),
  sungBeat(`${id}2`, TRAD[1], T.stream, "mid", [{ do: "look", target: "robo", at: onBeat(1), to: [6, 0.2, -0.8] }, ...extra[1]]),
  sungBeat(`${id}3`, TRAD[2], T.merrily, "mid", [
    { do: "look", target: "robo", at: 0.2, to: "ahead" }, { do: "feel", target: "robo", feeling: "joyful", at: 0.3 },
    { do: "shot", target: "boat", framing: "medium", yaw: -14, height: 12, dur: 2 },
    ...[0, 1.5, 3, 4.5].map((k) => ({ do: "wiggle", target: "boat", at: onBeat(k), deg: 4, dur: 0.6 })),
    ...extra[2],
  ]),
  sungBeat(`${id}4`, TRAD[3], T.dream, "mid", [{ do: "feel", target: "robo", feeling: "sleepy", at: onBeat(2) }, { do: "camera", ...CAM, dur: 2.4 }, ...extra[3]]),
];
scenes.push({ id: "song0", title: "Sing: Row, row, row your boat", music: false, beats: tradVerse("s0") });

// One river friend per verse: who's on the riverbank (listen, peek, 3-2-1), fast or slow, the verse, your turn.
const VERSE = {
  frog: { lines: ["Slowly past the frog.", "Ribbit, ribbit, ribbit, ribbit,", "Sitting on a log."],
    turn: { ask: "Your turn! Say ribbit like Frog!", answer: "Ribbit! Ribbit!", praise: "Yes! Frog says ribbit!" } },
  duck: { lines: ["Quickly past the duck!", "Splishy, splashy, splishy, splashy,", "Quack, quack, quack, quack, quack!"],
    turn: { ask: "Your turn! Flap your wings and quack!", answer: "Quack! Quack!", praise: "Yes! Duck says quack!" } },
  turtle: { lines: ["Slowly, turtle, slow.", "Head out, head in, head out, head in,", "Turtle says hello!"],
    turn: { ask: "Your turn! Be a slow turtle! Hide your head...", answer: "Peekaboo! Hello!", praise: "Yes! Slow and steady!" } },
  fish: { lines: ["Quickly, fishy, swim!", "Jumping, jumping, splashing, splashing,", "Wiggle, wiggle fin!"],
    turn: { ask: "Your turn! Swish your hands like a fish!", answer: "Blub, blub! Swish, swish!", praise: "Yes! Fish swims fast!" } },
};
const yawFor = [16, -14, 18, -16];
F.forEach((f, i) => {
  const v = VERSE[f.id];
  const fast = f.mode === "fast";
  // Who's on the riverbank?
  const guess = [
    beat(`g${i}a`, 2.6, [
      say("Who's on the riverbank? Shh! Listen!", { at: 0.1 }),
      { do: "move", target: "boat", to: [f.boatX, BOAT_Y, HOME[2]], dur: 1.8, ease: "quadInOut" },
      row(0, 1.7, "mid"), rest(1.9),
      { do: "shot", target: f.cover ? [f.cover, "boat"] : ["rip_fish", "boat"], framing: "wide", yaw: yawFor[i], height: 12, dur: 1.4 },
      { do: "look", target: "robo", at: 0.4, to: f.cover ?? "rip_fish" },
      { do: "feel", target: "robo", feeling: "surprised", at: 0.4 },
    ]),
    beat(`g${i}b`, 2.6, f.cover ? [
      { do: "wiggle", target: f.coverPart, at: 0.1, deg: 10, dur: 1.2 },
      { do: "move", target: f.id, to: f.behind, at: 0.05, dur: 0.01 },
      { do: "path", target: f.id, points: [f.behind, f.peek], at: 0.3, dur: 0.4 },
      { do: "say", who: f.id, text: f.sound, at: 0.5 },
      { do: "path", target: f.id, points: [f.peek, f.behind], at: 1.9, dur: 0.4 },
      { do: "move", target: f.id, to: f.hide, at: 2.35, dur: 0.01 },
    ] : [
      ...splash("rip_fish", 0.2, "bubble_pop"),
      { do: "say", who: f.id, text: f.sound, at: 0.5 },
      ...splash("rip_fish", 1.3, "bubble_pop"),
    ]),
    beat(`g${i}c`, 3.7, [
      say("Who is it?", { at: 0.1 }),
      ...countdown(1.1),
      { do: "feel", target: "robo", feeling: "happy", at: 0.3 },
      f.cover ? { do: "wiggle", target: f.coverPart, at: 1.2, deg: 8, dur: 1.6 } : { do: "wiggle", target: "rip_fish", at: 1.2, deg: 8, dur: 1 },
    ]),
    beat(`g${i}d`, 3.2, [
      f.cover
        ? { do: "path", target: f.id, points: [f.hide, f.behind, f.peek, f.spot], at: 0.05, dur: 0.9, face: false }
        : { do: "path", target: f.id, points: [f.behind, [f.spot[0] - 0.3, 1.1, f.spot[2]], f.spot], at: 0.05, dur: 0.8, face: false },
      f.cover ? { do: "sound", sound: "boing", at: 0.3, volume: 0.6 } : splash("rip_fish2", 0.8),
      f.id === "duck" ? splash("rip_duck", 0.95) : null,
      { do: "hop", target: f.id, at: 1.0, height: 0.3, sound: "pop" },
      { do: "feel", target: f.id, feeling: "joyful", at: 0.9 },
      { do: "say", who: f.id, text: f.hello, at: 1.1 },
      word(f.id, 1.0),
      { do: "shot", target: [f.id, "boat"], framing: "medium", yaw: yawFor[i] * 0.6, height: 10, dur: 1.2 },
      { do: "look", target: f.id, at: 1.0, to: [0, 1.6, 9] },
      { do: "look", target: "robo", at: 0.9, to: f.id },
      { do: "feel", target: "robo", feeling: "joyful", at: 1.0 },
      { do: "point", target: "robo", to: f.id, at: 1.6, hold: 1.2 },
    ]),
  ];
  scenes.push({ id: `guess_${f.id}`, title: `Who's on the riverbank?`, beats: guess });

  // Fast or slow?
  scenes.push({ id: `speed_${f.id}`, title: fast ? "Row fast!" : "Row slow!", beats: [
    beat(`v${i}a`, 2.8, [
      unword(f.id, 0),
      say(fast ? "Let's row FAST! Fast, fast!" : "Let's row SLOW. Slow... slow...", { at: 0.2, speed: SPEED[f.mode] }),
      word(f.mode, 0.5), flow(f.mode, 0.4),
      { do: "shot", target: [f.id, "boat"], framing: "wide", yaw: -yawFor[i] * 0.5, height: 12, dur: 1.4 },
      { do: "look", target: "robo", at: 0.2, to: "ahead" },
      row(0.4, 2.3, f.mode),
    ]),
    beat(`v${i}b`, 2.6, [
      say(fast ? "Row your arms fast!" : "Row your arms slowly!", { at: 0.1, speed: SPEED[f.mode] }),
      { do: "wiggle", target: "bubble", at: 0.3, deg: 10, dur: 1.4 },
      { do: "feel", target: "robo", feeling: fast ? "joyful" : "happy", at: 0.2 },
      row(0.1, 2.5, f.mode),
    ]),
    beat(`v${i}c`, 0.8, [unword(f.mode, 0), row(0.05, 0.75, f.mode)]),
  ]});

  // The sung verse.
  const extra3 = {
    frog: [0, 1.5, 3, 4.5].flatMap((k) => [{ do: "hop", target: "frog", at: onBeat(k), height: 0.32, dur: 0.4, sound: k === 0 ? "boing" : false }]),
    duck: [...[0, 1.5, 3, 4.5].map((k) => ({ do: "wiggle", target: "duck", at: onBeat(k), deg: 12, dur: 0.5 })), ...splash("rip_duck", onBeat(0.2)), ...splash("rip_duck", onBeat(3.2), false)],
    turtle: [0, 1.5, 3, 4.5].map((k, j) => ({ do: "move", target: "turtle#head", to: j % 2 ? [0, 0, 0] : [0, -0.05, -0.28], at: onBeat(k), dur: 0.5 })),
    fish: [0, 3].flatMap((k) => [
      { do: "path", target: "fish", points: [f.spot, [f.spot[0] + 0.3, 1.1, f.spot[2]], [f.spot[0] + 0.6, f.spot[1], f.spot[2]], f.spot], at: onBeat(k), dur: 1.3 },
      ...splash("rip_fish2", onBeat(k) + 0.7, k ? false : "splash"),
    ]),
  }[f.id];
  const extra4 = {
    frog: [{ do: "point", target: "robo", to: "log", at: onBeat(1), hold: 1.2 }, { do: "wiggle", target: "frog", at: onBeat(2), deg: 10, dur: 0.8 }],
    duck: [0, 1, 2, 3, 4].map((k) => ({ do: "nod", target: "duck", at: onBeat(k * 0.8), dur: 0.35 })),
    turtle: [{ do: "nod", target: "turtle", at: onBeat(1) }, { do: "feel", target: "turtle", feeling: "joyful", at: onBeat(1) }, { do: "turn", target: "turtle", to: [0, 0, 0], at: onBeat(0.5), dur: 0.8 }],
    fish: [{ do: "wiggle", target: "fish", at: onBeat(0.5), deg: 18, dur: 1.2 }, { do: "turn", target: "fish", to: [0, -20, 0], at: onBeat(0.2), dur: 0.5 }],
  }[f.id];
  scenes.push({ id: `song_${f.id}`, title: `Sing: ${f.name}`, music: false, beats: [
    sungBeat(`s${i + 1}a`, ROW_LINE[f.mode], T.row, f.mode, [
      { do: "shot", target: [f.id, "boat"], framing: "wide", yaw: -yawFor[i], height: 10, dur: 1.6 },
      { do: "look", target: "robo", at: 0.2, to: "ahead" },
    ]),
    sungBeat(`s${i + 1}b`, v.lines[0], T.stream, f.mode, [
      { do: "look", target: "robo", at: onBeat(0.5), to: f.id }, { do: "look", target: f.id, at: onBeat(0.5), to: "robo" },
      { do: "orbit", around: [(f.spot[0] + f.boatX) / 2, 0.6, -1], degrees: i % 2 ? -12 : 12, dur: 3 },
    ]),
    sungBeat(`s${i + 1}c`, v.lines[1], T.eight, f.mode, [
      { do: "look", target: f.id, at: 0.2, to: [0, 1.6, 9] },
      { do: "shot", target: f.id, framing: "medium", yaw: -22, height: 10, dur: 1.2 },
      ...extra3,
    ]),
    sungBeat(`s${i + 1}d`, v.lines[2], T.dream, f.mode, [
      { do: "shot", target: [f.id, "boat"], framing: "medium", yaw: -yawFor[i] * 0.4, height: 9, dur: 1.4 },
      ...extra4,
    ]),
  ]});

  // Your turn: the friend's sound or move, then the tracker fills.
  const act = {
    frog: [{ do: "hop", target: "frog", at: 0.4, height: 0.3 }, { do: "hop", target: "frog", at: 1.2, height: 0.3 }],
    duck: [{ do: "wiggle", target: "duck", at: 0.3, deg: 14, dur: 1.4 }],
    turtle: [{ do: "move", target: "turtle#head", to: [0, -0.05, -0.28], at: 0.2, dur: 0.6 }, { do: "move", target: "turtle#head", to: [0, 0, 0], at: 1.7, dur: 0.4 }],
    fish: [{ do: "wiggle", target: "fish", at: 0.3, deg: 18, dur: 1.4 }],
  }[f.id];
  scenes.push({ id: `turn_${f.id}`, title: `Your turn: ${f.name}`, beats: boatTurn({
    id: `t${i}`, ...v.turn, answerWho: f.id, wordId: f.id, slot: i + 1, mini: `mini${i + 1}`, look: f.id, act, mode: f.mode,
  }) });
});

// Recap: fast or slow? (watch the boat), then "who is slow and steady?" point-to-it with Frog and Turtle.
const QL = [-1.6, 0, 2.5];
const QR = [2.5, 0, 2.5];
scenes.push({ id: "quiz", title: "Fast or slow?", beats: [
  beat("x1", 2.6, [
    say("Is the boat fast or slow?", { at: 0.1 }),
    { do: "camera", ...CAM, dur: 1.4 }, flow("slow", 0.2),
    { do: "move", target: "boat", to: HOME, dur: 2.3, ease: "quadInOut" }, row(0, 2.4, "mid"),
    { do: "look", target: "robo", at: 0.2, to: [0, 1.6, 9] },
  ]),
  beat("x2", 2.6, [row(0.1, 2.5, "slow"), { do: "sound", sound: "tick", at: 0.8, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.8, volume: 0.5 }]),
  beat("x3", 2.2, [say("Slow! Slow... slow...", { at: 0.1, speed: SPEED.slow }), word("slow", 0.2), row(0.1, 2.1, "slow")]),
  beat("x4", 2.4, [unword("slow", 0), flow("fast", 0.1), say("And now?", { at: 0.1 }), row(0.1, 2.3, "fast"), { do: "sound", sound: "tick", at: 1.2, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.9, volume: 0.5 }]),
  beat("x5", 2.4, [say("Fast! Fast, fast, fast!", { at: 0.1, speed: SPEED.fast }), word("fast", 0.2), row(0.1, 2.3, "fast"), { do: "feel", target: "robo", feeling: "joyful", at: 0.2 }]),
  beat("x6", 1.0, [unword("fast", 0), flow("slow", 0.1), rest(0.1)]),
  // Point to it: who is slow and steady?
  beat("qa", 2.8, [
    { do: "path", target: "frog", points: [FD.frog.spot, [-2.8, 0.6, 0.4], QL], dur: 1.2, face: true },
    { do: "path", target: "turtle", points: [FD.turtle.spot, [2.6, 0.4, 0.4], QR], dur: 1.2, face: true },
    { do: "turn", target: "frog", to: [0, 10, 0], at: 1.3, dur: 0.4 }, { do: "turn", target: "turtle", to: [0, -10, 0], at: 1.3, dur: 0.4 },
    { do: "shot", target: ["frog", "turtle"], framing: "medium", height: 10, at: 0.3, dur: 1.4 },
    say("Who is slow and steady? Point to it!", { at: 0.6 }),
  ]),
  beat("qb", 2.8, [...countdown(0.1), { do: "wiggle", target: "frog", at: 0.2, deg: 8, dur: 0.6 }, { do: "wiggle", target: "turtle", at: 0.95, deg: 8, dur: 0.6 }, { do: "wiggle", target: "frog", at: 1.7, deg: 8, dur: 0.6 }]),
  beat("qc", 3.0, [
    { do: "mark", target: "turtle", result: "correct", at: 0.1, dur: 2.2 },
    { do: "say", who: "turtle", text: "Slow and steady! That's me!", at: 0.3 },
    { do: "wiggle", target: "turtle", at: 0.3, deg: 12, dur: 1 },
    say("Yes! Slow Turtle!", { at: "after" }),
    { do: "feel", target: "robo", feeling: "joyful", at: 0.6 },
  ]),
  beat("qd", 1.4, [
    { do: "path", target: "frog", points: [QL, [-2.8, 0.6, 0.4], FD.frog.spot], dur: 1.2, face: true },
    { do: "path", target: "turtle", points: [QR, [2.6, 0.4, 0.4], FD.turtle.spot], dur: 1.2, face: true },
    { do: "turn", target: "frog", to: FD.frog.rot, at: 1.0, dur: 0.3 }, { do: "turn", target: "turtle", to: FD.turtle.rot, at: 1.0, dur: 0.3 },
    { do: "camera", ...CAM, dur: 1.2 },
  ]),
]});

// The last chorus with all four friends, then bye-bye: Robo rows off down the river.
const hopAll = (at, h = 0.25) => F.filter((f) => f.id !== "fish").map((f, k) => ({ do: "hop", target: f.id, at: at + k * 0.06, height: h, dur: 0.38 }));
scenes.push({ id: "finale", title: "Everybody row!", music: false, beats: [
  beat("z0", 2.2, [
    say("Everybody row and sing!", { at: 0.1 }),
    { do: "camera", position: [0.2, 3.1, 10.4], lookAt: [0.2, 0.7, -1.0], fov: 40, dur: 1.8 },
    { do: "feel", target: "robo", feeling: "joyful", at: 0.2 }, row(0.2, 2, "mid"),
  ]),
  ...tradVerse("z", [
    [...hopAll(onBeat(3)), ...hopAll(onBeat(6))],
    [{ do: "path", target: "fish", points: [FD.fish.spot, [FD.fish.spot[0] - 0.3, 1.1, FD.fish.spot[2]], FD.fish.spot], at: onBeat(1), dur: 1.2 }, ...splash("rip_fish2", onBeat(1) + 1.0, "splash")],
    [...[0, 1.5, 3, 4.5].flatMap((k) => hopAll(onBeat(k), 0.2)), { do: "burst", target: "confetti", at: onBeat(4.5), dur: 2.4, sound: false }, { do: "sound", sound: "crowd_cheer", at: onBeat(4.5), volume: 0.4 }],
    F.map((f, k) => ({ do: "wiggle", target: f.id, at: onBeat(1) + k * 0.1, deg: 10, dur: 1 })),
  ]),
  beat("z5", 3.6, [
    say("Bye-bye, river friends! Row, row, bye-bye!", { at: 0.2 }),
    { do: "feel", target: "robo", feeling: "joyful", at: 0.2 },
    { do: "say", who: "frog", text: "Ribbit! Bye-bye!", at: "after" },
    ...F.map((f, k) => ({ do: "wiggle", target: f.id, at: 0.4 + k * 0.12, deg: 10, dur: 1.6 })),
    { do: "move", target: "boat", to: [11, BOAT_Y, HOME[2]], at: 0.9, dur: 3.4, ease: "quadIn" },
    row(0.4, 3.2, "mid"),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.8, dur: 2.6 },
    { do: "camera", position: [0, 3.8, 14], lookAt: [0, 0.9, -1], fov: 40, dur: 3.2 },
  ]),
]});

const description = "Row, row, row your boat with Robo! Robo rows down the river and meets four friends on the riverbank: Frog, Duck, Turtle and Fish. Listen for who is hiding, peek, count 3-2-1 for the reveal, then row your arms slow with Frog and Turtle and fast with Duck and Fish. Say ribbit, quack and blub blub, fill the riverbank friends tracker, and play the fast-or-slow game.";
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Row, Row, Row Your Boat", episode: "br06", seed: 306, skills: ["opposites_k", "living_things_k", "listening_prek"], cast,
    youtube: {
      title: "Row, Row, Row Your Boat 🚣 Fast and Slow River Song for Toddlers | Toy Box Friends",
      description: `${description}\n\nYour child learns: fast and slow (the boat, the oars, the water and the voice all change speed); river animals and their sounds (frog, duck, turtle, fish); listening and guessing; moving along with a song.\n\nSing at home: sit on the floor facing your toddler, hold hands and rock back and forth to row the boat. Row slowly for the slow verses and quickly for the fast ones, and make each animal's sound together. The first verse, "Row, Row, Row Your Boat", is a traditional public domain nursery rhyme sung to its traditional tune; the river verses with Frog, Duck, Turtle and Fish are original, written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["row row row your boat", "row your boat", "fast and slow", "opposites for toddlers", "river animals", "nursery rhymes", "baby songs", "toddler learning", "animal sounds", "frog duck turtle fish", "sing along", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "boat", title: "ROW YOUR BOAT", subtitle: "Fast and slow!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "pond",
        camera: { position: [1.7, 1.75, 6.6], lookAt: [2.3, 0.6, -0.6], fov: 36 },
        objects: [
          { id: "river", kind: "shape", shape: "plate", color: "pond", material: "glossy", at: [2, 0.012, -0.6], scale: [20, 1, 4.2] },
          { id: "boat", kind: "prop", model: "rowing_boat", at: [3.55, BOAT_Y, -0.3], rotation: [0, 70, 0], size: 1.1 },
          { id: "robo", kind: "character", character: "robot", parent: "boat", at: [0, 0.12, 0], rotation: [0, -60, 0], clip: "Sitting", feeling: "happy" },
          { id: "frog", kind: "critter", species: "frog", size: 0.8, at: [5.5, 0, -2.3], rotation: [0, -30, 0], feeling: "joyful" },
          { id: "duck", kind: "critter", species: "duck", size: 0.75, at: [5.15, FLOAT, 0.85], rotation: [0, -35, 0], feeling: "joyful" },
          { id: "pad", kind: "prop", model: "lily_pad", at: [2.0, 0.03, 1.0], size: 0.9 },
        ] },
      { name: "friends", title: "WHO'S THERE?", subtitle: "River animal friends!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "pond",
        camera: { position: [1.6, 1.3, 5.6], lookAt: [2.1, 0.55, -0.4], fov: 36 },
        objects: [
          { id: "river", kind: "shape", shape: "plate", color: "pond", material: "glossy", at: [2, 0.012, 0.4], scale: [16, 1, 2.4] },
          { id: "bush", kind: "prop", model: "bush", at: [3.1, 0, -1.3], size: 1.2 },
          { id: "turtle", kind: "critter", species: "turtle", size: 0.85, at: [3.75, 0, -0.55], rotation: [0, -25, 0], feeling: "joyful" },
          { id: "fish", kind: "critter", species: "fish", size: 0.6, at: [4.75, 0.45, 0.65], rotation: [0, -50, 20], feeling: "joyful" },
          { id: "rip", kind: "prop", model: "splash_ripples", at: [4.6, 0.03, 0.65], size: 1 },
          { id: "bubble", kind: "prop", model: "word_bubble", at: [4.85, 1.75, -0.2], size: 0.8 },
          { id: "q", kind: "letter", text: "?", color: "purple", parent: "bubble", at: [0, -0.2, 0.12], size: 0.4 },
        ] },
    ],
  }),
  stage: { preset: "pond", set: [
    { id: "hill", kind: "shape", shape: "sphere", color: "leaf_light", material: "matte", at: [0, -4.2, -15], scale: [40, 9, 8] },
    { id: "tree1", kind: "prop", model: "tree", at: [-7.6, 0, -6.2], size: 2.3 },
    { id: "tree2", kind: "prop", model: "tree", at: [-1.2, 0, -8.6], size: 2.6 },
    { id: "tree3", kind: "prop", model: "tree", at: [4.2, 0, -7.4], size: 2.1 },
    { id: "tree4", kind: "prop", model: "tree", at: [8.4, 0, -5.8], size: 2.4 },
    { id: "bush1", kind: "prop", model: "bush", at: [-6.3, 0, -3.8], size: 1.1 },
    { id: "bush2", kind: "prop", model: "berry_bush", at: [0.6, 0, -4.4] },
    { id: "bush3", kind: "prop", model: "bush", at: [5.8, 0, -3.7], size: 1.15 },
    { id: "rock1", kind: "prop", model: "rock", at: [1.1, 0, -2.85], size: 0.7 },
    { id: "rock2", kind: "prop", model: "rock", at: [6.6, 0, -2.8], size: 0.9 },
    ...[[-7.2, -2.9, "pink"], [-5.4, -3.0, "yellow"], [-2.3, -3.4, "purple"], [0.0, -3.3, "pink"], [4.5, -3.0, "yellow"], [7.5, -3.2, "purple"]].map(([x, z, c], k) => ({ id: `flower${k}`, kind: "prop", model: "flower", color: c, at: [x, 0, z], size: 0.65 })),
    ...[-8, -5.9, -2.2, 0.4, 1.8, 3.9, 5.1, 7.9].map((x, k) => ({ id: `grass${k}`, kind: "prop", model: "grass", at: [x, 0, -2.75 - (k % 3) * 0.2], size: 1.5 })),
  ] },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "row_your_boat");
