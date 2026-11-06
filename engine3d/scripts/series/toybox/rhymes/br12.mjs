// Builds ../br12_start_the_day.json: This Is the Way We Start the Day. Original verses on the traditional tune of
// "Here We Go Round the Mulberry Bush" (public domain). Teaches a morning routine in order: wake up, wash, brush,
// dress, eat. Run: node br12.mjs (then node tools/sung_durs.mjs on the JSON, and this again).
//
// Plan (specs/baby_rhymes.md): hook = the alarm clock rings, Pip (the br04 toddler, catalog/models/rhymes_br04.json)
// wakes up in bed: "Good morning!", stretch with Pip. The home set runs left to right in routine order (bed, sink,
// clothes rail, breakfast table), so Pip walks through the morning. Each step: "What comes next?" (two picture
// cards, 3-2-1; from step 2 on), Pip goes to the station, the verse with Pip miming along, "Your turn! Do it with
// Robo", a tracker slot fills (soap, toothbrush, T-shirt, bowl; the bowl is teased early). At the end a sequence
// quiz puts the four step cards in order, then the last verse ("This is the way we start the day") and bye-bye.
import {
  YT_TAIL, beat, bubbleObjects, countdown, countdownObjects, fillSlot, onBeat, rhymeMeta, say, showTracker,
  sung, trackerObjects, tuneDur, unword, word, writeRhyme,
} from "./kit.mjs";

// ---- The tune ------------------------------------------------------------------------------------------------------
// Here We Go Round the Mulberry Bush (traditional, public domain), in C at 112 a minute in a lilting 6/8 feel
// (0.5 = an eighth), one note per syllable. Lines 1 and 3 share a tune; the 9-syllable verses split a note.
const T = {
  a8: "C4 C4:0.5 C4 E4:0.5 G4:0.5 G4 E4:0.5 C4:1.5", // This is the way we wash our face, (8)
  a9: "C4 C4:0.5 C4 E4:0.5 G4:0.5 G4:0.5 G4:0.5 E4:0.5 C4:1.5", // This is the way we put on our clothes, (9)
  b6: "D4 D4:0.5 B3:1.5 C4 C4:0.5 E4:1.5", // wash our face, wash our face, (6)
  b8: "D4:0.5 D4:0.5 D4:0.5 B3:1.5 C4:0.5 C4:0.5 C4:0.5 E4:1.5", // put on our shirt, put on our shirt, (8)
  end: "G4:0.5 G4 E4:0.5 C4 D4:0.5 E4 C4:1.5", // so early in the morning. (7)
};
// Sung lines end in a comma or a full stop (an exclamation mark slows the voice down a lot).
const END = "so early in the morning.";
const verse = (a, b, ta, tb) => [[a, ta], [b, tb], [a, ta], [END, T.end]];

// ---- Pip's poses (br04's IK angles, plus a few for the routine) ---------------------------------------------------
const ARM_REST = [0, 0, 8];
const POSES = {
  rest: { hip: 0, arm: ARM_REST, fore: [0, 0, 0] },
  wash: { hip: 0, arm: [-41, -85, 69], fore: [-57, -4, 32] }, // both hands on the face (br04 "eyes")
  brush: { hip: 0, arm: [-80, -1, -14], fore: [-58, 5, -42], one: true }, // one hand at the mouth (br04 "mouth")
  spoon: { hip: 0, arm: [-80, -1, -14], fore: [-58, 5, -42], one: true },
  scoop: { hip: 8, arm: [-38, 0, -6], fore: [-38, 0, -10], one: true }, // the hand down in front, at the bowl
  yay: { hip: -6, arm: [0, 0, 150], fore: [0, 0, 25] }, // arms up (stretch, pull the shirt on)
  wave: { hip: 0, arm: [0, 0, 140], fore: [0, 0, 35], one: true },
};
const off = (a, rest = ARM_REST) => a.map((v, i) => v - rest[i]);
const mir = (a) => [a[0], -a[1], -a[2]];
/** Pip takes a pose (five part turns). */
function pose(name, at = 0.1, dur = 0.28) {
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
const r2 = (v) => Math.round(v * 100) / 100;
const add = (a, b) => a.map((v, i) => r2(v + b[i]));

// ---- The set: the morning runs left to right ---------------------------------------------------------------------
const BED = [-4.2, 0, -1.3];
const STAND = [-5.6, 0, -1.3]; // nightstand by the pillow end
const SINK = [-1.5, 0, -1.7];
const RAIL = [1.35, 0, -1.8];
const TABLE = [4.25, 0, -1.6];
const PIP_SIZE = 1.05;
const PIP_BED = [BED[0] + 0.62, 0.63, BED[2] + 0.12]; // lying on its side on the bed, head on the pillow
const CAM = { position: [0, 2.2, 9.6], lookAt: [0, 1.1, -0.6], fov: 40 };
const QCAM = { position: [0, 1.75, 7.6], lookAt: [0, 1.3, 2.2], fov: 40 };

// The four steps. pip/robo: where they stand; yaw: Pip's turn toward Robo; prop: the thing that goes with it.
const STEPS = [
  {
    id: "wash", word: "WASH", mini: "soap", station: SINK, pip: [-0.8, 0, -1.0], robo: [-2.65, 0, -0.75], yaw: -18,
    lines: verse("This is the way we wash our face,", "wash our face, wash our face,", T.a8, T.b6),
    go: "First, let's wash our face! To the sink!", show: "Splash, splash! Warm water and soap.",
    ask: "Your turn! Wash your face with Robo! Rub, rub, rub!", praise: "Yay! Nice and clean!", pipLine: "Splash!",
  },
  {
    id: "brush", word: "BRUSH", mini: "toothbrush", station: SINK, pip: [-0.8, 0, -1.0], robo: [-2.65, 0, -0.75], yaw: -18,
    lines: verse("This is the way we brush our teeth,", "brush our teeth, brush our teeth,", T.a8, T.b6),
    go: "Brush our teeth! Here's the toothbrush.", show: "Brush, brush, brush! Sparkly teeth.",
    ask: "Your turn! Brush your teeth with Robo! Up and down!", praise: "Wow! Shiny teeth!", pipLine: "Brush, brush!",
  },
  {
    id: "dress", word: "DRESS", mini: "tshirt", station: RAIL, pip: [1.3, 0, -0.95], robo: [-0.35, 0, -0.75], yaw: -18,
    lines: verse("This is the way we put on our clothes,", "put on our shirt, put on our shirt,", T.a9, T.b8),
    go: "Time to get dressed! Off with the pyjamas!", show: "My orange shirt! Arms up, and pull it on.",
    ask: "Your turn! Put on your shirt! Arms up high!", praise: "Hooray! All dressed!", pipLine: "All dressed!",
  },
  {
    id: "eat", word: "EAT", mini: "breakfast_bowl", station: TABLE, pip: [3.05, 0, -1.0], robo: [1.45, 0, -0.75], yaw: -22,
    lines: verse("This is the way we eat our breakfast,", "eat our breakfast, eat our breakfast,", T.a9, T.b8),
    go: "And now... breakfast! Yummy!", show: "A bowl of porridge with berries. Mmm!",
    ask: "Your turn! Eat your breakfast! Scoop and yum!", praise: "Yum yum! A full tummy!", pipLine: "Yum yum!",
  },
];
// "What comes next?" before steps 2-4: the right card and a silly one.
const NEXT = [
  null,
  { right: "brush", wrong: "bed", wrongIcon: "bed", rightSide: "L", silly: "Back to bed? No, silly!" },
  { right: "dress", wrong: "bath", wrongIcon: "bathtub", rightSide: "R", silly: "A bath? Not now!" },
  { right: "eat", wrong: "ball", wrongIcon: "ball", rightSide: "L", silly: "Play ball? After breakfast!" },
];
const ICON = {
  wash: { model: "soap", size: 3.2, rotation: [20, -20, 0], y: -0.12 },
  brush: { model: "toothbrush", size: 2.0, rotation: [10, 0, 35], y: -0.12 },
  dress: { model: "tshirt", size: 1.25, rotation: [0, 0, 0], y: -0.3 },
  eat: { model: "breakfast_bowl", size: 1.9, rotation: [35, 0, 0], y: -0.18 },
  bed: { model: "bed", size: 0.33, rotation: [10, 0, 0], y: -0.2 },
  bath: { model: "bathtub", size: 0.42, rotation: [10, 0, 0], y: -0.22 },
  ball: { model: "ball", size: 0.65, rotation: [0, 0, 0], y: -0.25 },
};
const iconObj = (id, key, parent, z = 0.16, hud = false) => {
  const c = ICON[key];
  return { id, kind: "prop", model: c.model, parent, at: [0, c.y, z], size: c.size, rotation: c.rotation, ...(hud ? { hud: true, hidden: true } : {}) };
};

// Sequence quiz: four cards start shuffled in a top row and drop into numbered spots below, in order.
const SEQ_TOP = { dress: -2.1, eat: -0.7, wash: 0.7, brush: 2.1 };
const SEQ_X = [-2.1, -0.7, 0.7, 2.1];
const SEQ_Y = [2.3, 1.1];
const SEQ_Z = 2.2;

const objects = [
  { id: "robo", kind: "character", character: "robot", at: [-1.2, 0, 1.0], rotation: [0, -40, 0], feeling: "happy" },
  { id: "pip", kind: "critter", species: "toddler", at: PIP_BED, rotation: [0, 0, 90], size: PIP_SIZE, feeling: "sleepy", recolor: { orange: "sky", denim: "purple" } },
  // The bedroom corner.
  { id: "bed", kind: "prop", model: "bed", at: BED },
  { id: "nightstand", kind: "prop", model: "nightstand", at: STAND },
  { id: "alarm", kind: "prop", model: "alarm_clock", at: [STAND[0], 0.6, STAND[2] + 0.04], size: 1.15, rotation: [0, 20, 0] },
  // The bathroom corner.
  { id: "sink", kind: "prop", model: "sink", at: SINK },
  { id: "soap", kind: "prop", model: "soap", at: [SINK[0] + 0.22, 0.96, SINK[2] - 0.31], size: 1.2 },
  { id: "toothbrush", kind: "prop", model: "toothbrush", at: [SINK[0] - 0.2, 0.96, SINK[2] - 0.31], size: 1.1 },
  { id: "toothpaste", kind: "prop", model: "toothpaste", at: [SINK[0] - 0.2, 0.96, SINK[2] - 0.25], size: 0.9, rotation: [0, 180, 0] },
  // The clothes rail.
  { id: "rail", kind: "prop", model: "clothes_rail", at: RAIL },
  { id: "shirt", kind: "prop", model: "tshirt_hanger", parent: "rail", at: [0, 1.45, 0], size: 1.25 },
  // The breakfast table.
  { id: "table", kind: "prop", model: "table", at: TABLE },
  { id: "chair", kind: "prop", model: "chair", at: [TABLE[0] + 0.15, 0, TABLE[2] - 0.75] },
  { id: "bowl", kind: "prop", model: "breakfast_bowl", at: [TABLE[0] - 0.4, 0.8, TABLE[2] + 0.18], size: 1.3 },
  { id: "spoon", kind: "prop", model: "spoon", at: [TABLE[0] - 0.08, 0.8, TABLE[2] + 0.22], size: 1.3, rotation: [0, 20, 0] },
  { id: "juice", kind: "prop", model: "juice_carton", at: [TABLE[0] + 0.25, 0.8, TABLE[2] + 0.05], size: 0.9 },
  { id: "confetti", kind: "confetti", at: [0, 3.2, 1] },
  // "What comes next?" cards (world, in front of the room; shown with the quiz camera).
  ...NEXT.filter(Boolean).flatMap((n, k) => {
    const L = n.rightSide === "L" ? n.right : n.wrong;
    const R = n.rightSide === "L" ? n.wrong : n.right;
    return [[L, -1.0], [R, 1.0]].flatMap(([key, x], j) => [
      { id: `n${k + 2}_${key}`, kind: "prop", model: "tracker_slot", color: ["green", "pink"][j], at: [x, 1.3, 2.3], size: 1.2, hidden: true },
      iconObj(`n${k + 2}_${key}_icon`, key, `n${k + 2}_${key}`),
    ]);
  }),
  // Sequence quiz cards and numbers.
  ...STEPS.flatMap((s, i) => [
    { id: `seq_${s.id}`, kind: "prop", model: "tracker_slot", color: ["blue", "orange", "green", "pink"][i], at: [SEQ_TOP[s.id], SEQ_Y[0], SEQ_Z], size: 1.0, hidden: true },
    iconObj(`seq_${s.id}_icon`, s.id, `seq_${s.id}`),
  ]),
  ...SEQ_X.map((x, i) => ({ id: `num${i + 1}`, kind: "letter", text: String(i + 1), color: "orange", at: [x, 0.16, SEQ_Z + 0.1], size: 0.26, hidden: true })),
  // HUD: four tracker slots (the routine icons), stars, a "?" on the last, the countdown, the word bubble.
  ...trackerObjects(4),
  ...STEPS.map((s, i) => ({ ...iconObj(`mini_${s.id}`, s.id, `slot${i + 1}`, 0.15, true) })),
  ...[1, 2, 3, 4].map((i) => ({ id: `star${i}`, kind: "shape", shape: "star", color: "gold", hud: true, parent: `slot${i}`, at: [0.36, 0.38, 0.3], size: 0.34, hidden: true })),
  { id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot4", at: [0, -0.26, 0.2], size: 0.42, hidden: true },
  ...countdownObjects(),
  ...bubbleObjects([...STEPS.map((s) => ({ id: s.id, text: s.word })), { id: "morning", text: "MORNING" }]),
];
// HUD icons are smaller than the world cards.
for (const s of STEPS) {
  const o = objects.find((x) => x.id === `mini_${s.id}`);
  o.size = r2(o.size * 0.62);
  o.at = [0, r2(o.at[1] * 0.62), 0.15];
}

const cast = { pip: { voice: "squeaky", pitch: 1.2, speed: 1 } };
const pipSay = (text, at = 0.1) => ({ do: "say", who: "pip", text, at });
const fill = (i, mini) => [...fillSlot(i, mini), { do: "pop", target: `star${i}`, at: 0.55, dur: 0.4, sound: "sparkle" }];
/** The alarm clock rings: the bells and the clock wiggle, bell sounds. */
const ring = (at, n = 6) => [
  { do: "wiggle", target: "alarm#bells", at, deg: 18, dur: n * 0.22 },
  { do: "wiggle", target: "alarm", at, deg: 6, dur: n * 0.22 },
  ...Array.from({ length: n }, (_, k) => ({ do: "sound", sound: "bell", at: r2(at + k * 0.22), volume: 0.55 })),
];
/** Pip toddles to a spot: a glide with little hops. */
function toddle(to, at, dur) {
  const hops = [];
  for (let t = at; t < at + dur - 0.2; t += 0.34) hops.push({ do: "hop", target: "pip", at: r2(t), height: 0.08, dur: 0.3 });
  return [{ do: "move", target: "pip", to, at, dur, ease: "sineInOut" }, ...hops];
}
/** Robo walks to a spot and turns to face Pip. */
const roboWalk = (to, at, dur, yaw = -35) => [
  { do: "clip", target: "robo", clip: "Walking", at },
  { do: "move", target: "robo", to, at, dur, ease: "sineInOut" },
  { do: "clip", target: "robo", clip: "Idle", at: r2(at + dur) },
  { do: "turn", target: "robo", to: [0, yaw, 0], at: r2(at + dur - 0.3), dur: 0.4 },
];
/** Robo mimes at his own face (a hand up near his mouth). */
const roboFace = (s, at, hold = 1.6, arm = "left") => ({ do: "point", target: "robo", to: add(s.robo, [arm === "left" ? -0.05 : 0.35, 1.5, 0.75]), arm, at, dur: 0.35, hold, look: false });

// The mime for each step on tune beats k (scaled to the spoken line by fitSung).
function mime(s, ks) {
  if (s.id === "wash") return ks.map((k, j) => [j === 0 ? pose("wash", onBeat(k), 0.25) : null, { do: "wiggle", target: "pip#fore_l", at: r2(onBeat(k) + (j ? 0 : 0.3)), deg: 8, dur: 0.5 }, { do: "wiggle", target: "pip#fore_r", at: r2(onBeat(k) + (j ? 0 : 0.3)), deg: -8, dur: 0.5 }]);
  if (s.id === "brush") return ks.map((k, j) => [j === 0 ? pose("brush", onBeat(k), 0.25) : null, { do: "wiggle", target: "pip#fore_l", at: r2(onBeat(k) + (j ? 0 : 0.3)), deg: 16, dur: 0.6 }]);
  if (s.id === "dress") return ks.map((k, j) => pose(j % 2 ? "rest" : "yay", onBeat(k), 0.3));
  return ks.map((k, j) => pose(j % 2 ? "scoop" : "spoon", onBeat(k), 0.28));
}
const MIME_K = { a: [0, 2, 4, 6], b: [0, 1.5, 3, 4.5], end: [0, 2, 4] };

const scenes = [];

// 0:00 Hook: the alarm clock rings, Pip wakes up: "Good morning!" Stretch, hop out of bed, the tracker.
scenes.push({ id: "hello", title: "Good morning!", beats: [
  beat("h1", 2.6, [
    { do: "camera", position: [-3.6, 1.35, 2.6], lookAt: [-4.1, 0.8, -1.5], fov: 40, dur: 0 },
    { do: "sleep", target: "pip", at: 0, dur: 0.01 },
    ring(0.1, 9),
    say("Ring, ring! Good morning!", { at: 0.3 }),
    { do: "shot", target: ["alarm", "pip"], framing: "medium", dur: 2.2 },
  ]),
  beat("h2", 2.8, [
    { do: "wake", target: "pip", at: 0.1 },
    { do: "feel", target: "pip", feeling: "joyful", at: 0.3 },
    pipSay("Good morning!", 0.3),
    { do: "turn", target: "pip", to: [0, 20, 0], at: 1.2, dur: 0.6 },
    { do: "move", target: "pip", to: [BED[0] + 0.7, 0, BED[2] + 1.05], at: 1.2, dur: 0.6, ease: "sineInOut" },
    { do: "hop", target: "pip", at: 1.2, height: 0.35, dur: 0.6 },
    { do: "sound", sound: "boing", at: 1.25, volume: 0.6 },
    { do: "shot", target: ["pip", "bed", "alarm"], framing: "medium", yaw: 8, dur: 1.2, at: 1.2 },
    word("morning", 0.4),
  ]),
  beat("h3", 3.0, [
    say("Wake up and stretch with Pip! Up, up, up!", { at: 0.1 }),
    { do: "shot", target: ["pip", "robo"], framing: "medium", yaw: 6, dur: 1.4 },
    pose("yay", 0.8, 0.5),
    { do: "clip", target: "robo", clip: "Jump", at: 0.8 },
    { do: "sound", sound: "slide_whistle", at: 0.9, volume: 0.4 },
    unword("morning", 1.0),
  ]),
  beat("h4", 3.0, [
    pose("rest", 0.1, 0.4),
    say("Let's start the day! Wash, brush, dress and eat!", { at: 0.1 }),
    { do: "camera", ...CAM, dur: 1.6 },
    showTracker(4, 0.5, 0.3),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
  beat("h5", 2.4, [
    say("And the last step is a yummy surprise!", { at: 0.1 }),
    { do: "pop", target: "qmark", at: 0.3, dur: 0.4, sound: "magic_sparkle" },
    { do: "grow", target: "slot4", to: 1.2, at: 0.9, dur: 0.3 }, { do: "grow", target: "slot4", to: 1, at: 1.3, dur: 0.3 },
    { do: "wiggle", target: "pip", at: 0.5, deg: 6, dur: 1 },
  ]),
]});

// "What comes next?": two cards (quiz camera), 3-2-1, the right one is marked, the silly one is laughed off.
function nextRound(i) {
  const n = NEXT[i];
  const pre = `n${i + 1}`;
  const L = `${pre}_${n.rightSide === "L" ? n.right : n.wrong}`;
  const R = `${pre}_${n.rightSide === "L" ? n.wrong : n.right}`;
  const right = `${pre}_${n.right}`;
  const wrong = `${pre}_${n.wrong}`;
  return [
    beat(`${pre}a`, 2.8, [
      { do: "camera", ...QCAM, dur: 0.8 },
      { do: "pop", target: L, at: 0.3, dur: 0.4, sound: "pop" }, { do: "pop", target: R, at: 0.5, dur: 0.4, sound: "pop" },
      say("What comes next? Point to it!", { at: 0.4 }),
    ]),
    beat(`${pre}b`, 2.8, [countdown(0.1), { do: "wiggle", target: L, at: 0.2, deg: 8, dur: 0.6 }, { do: "wiggle", target: R, at: 0.95, deg: 8, dur: 0.6 }, { do: "wiggle", target: L, at: 1.7, deg: 8, dur: 0.6 }]),
    beat(`${pre}c`, 3.2, [
      { do: "mark", target: right, result: "correct", at: 0.1, dur: 2.4 },
      { do: "wiggle", target: right, at: 0.3, deg: 12, dur: 1 },
      say(`Yes! ${STEPS[i].word[0]}${STEPS[i].word.slice(1).toLowerCase()} comes next!`, { at: 0.3 }),
      { do: "sound", sound: "ding", at: 0.2 },
    ]),
    beat(`${pre}d`, 2.4, [
      say(n.silly, { at: 0.1 }),
      { do: "wiggle", target: wrong, at: 0.2, deg: 10, dur: 0.8 },
      { do: "sound", sound: "giggle", at: 0.9, volume: 0.6 },
      { do: "hide", target: L, at: 1.6, dur: 0.3 }, { do: "hide", target: R, at: 1.6, dur: 0.3 },
    ]),
  ];
}

// Each step.
STEPS.forEach((s, i) => {
  const beats = [];
  if (NEXT[i]) beats.push(...nextRound(i));
  const prev = STEPS[i - 1];
  const moved = !prev || prev.station !== s.station || i === 0;
  // Go to the station.
  beats.push(beat(`${s.id}_go`, 3.0, [
    say(s.go, { at: 0.1 }),
    { do: "shot", target: ["pip", "robo", i === 0 ? "sink" : s.station === RAIL ? "rail" : s.station === TABLE ? "table" : "sink"], framing: "medium", dur: 1.6 },
    moved ? [toddle(s.pip, 0.4, 2.0), { do: "turn", target: "pip", to: [0, s.yaw, 0], at: 2.0, dur: 0.4 }, roboWalk(s.robo, 0.4, 2.0, s.yaw > 0 ? -35 : 35)] : null,
    word(s.id, 0.6), { do: "sound", sound: "pop", at: 0.6 },
  ]));
  // Show the thing.
  const show = [];
  if (s.id === "wash") show.push({ do: "highlight", target: "soap", at: 0.2, dur: 1.8 }, { do: "sound", sound: "splash", at: 0.4, volume: 0.6 });
  if (s.id === "brush") show.push({ do: "reparent", target: "toothbrush", parent: "pip", part: "fore_l", to: [0.0, -0.27, 0.06], rotation: [0, -90, 90], at: 0.3, dur: 0.6 }, { do: "sound", sound: "whoosh", at: 0.3 });
  if (s.id === "dress") show.push(
    { do: "highlight", target: "shirt", at: 0.1, dur: 1.2 },
    pose("yay", 1.1, 0.3), { do: "hide", target: "shirt", at: 1.2, dur: 0.3 }, { do: "sound", sound: "whoosh", at: 1.2 },
    { do: "paint", target: "pip", from: "sky", color: "orange", at: 1.4, dur: 0.5 }, { do: "paint", target: "pip", from: "purple", color: "denim", at: 1.4, dur: 0.5 },
    { do: "sound", sound: "magic_sparkle", at: 1.5 }, pose("rest", 2.0, 0.35),
  );
  if (s.id === "eat") show.push({ do: "reparent", target: "spoon", parent: "pip", part: "fore_l", to: [0.0, -0.26, 0.05], rotation: [0, -90, 90], at: 0.3, dur: 0.6 }, { do: "highlight", target: "bowl", at: 0.2, dur: 1.6 }, { do: "sound", sound: "clink", at: 0.5 });
  beats.push(beat(`${s.id}_show`, 2.8, [
    say(s.show, { at: 0.1 }),
    show,
    { do: "feel", target: "pip", feeling: "joyful", at: 0.5 },
    { do: "wiggle", target: "bubble", at: 0.4, deg: 8, dur: 1 },
  ]));
  // The verse.
  const shots = [
    { do: "shot", target: ["pip", "robo"], framing: "medium", yaw: [-10, 10, -14, 12][i], dur: 1.6 },
    { do: "orbit", around: add(s.pip, [0, 0.7, 0]), degrees: [18, -18, 20, -20][i], dur: 4 },
    { do: "shot", target: ["pip", s.station === SINK ? "sink" : s.station === RAIL ? "rail" : "table"], framing: "medium", yaw: [8, -8, 6, -6][i], dur: 1.2 },
    { do: "shot", target: ["pip", "robo", s.station === SINK ? "sink" : s.station === RAIL ? "rail" : "table"], framing: "wide", dur: 1.4 },
  ];
  beats.push(beat(`${s.id}_v0`, 1.4, [unword(s.id, 0.05), say("Sing along!", { at: 0.1 }), { do: "clip", target: "robo", clip: "Dance", at: 0.2 }]));
  s.lines.forEach(([text, tune], k) => {
    const ks = k === 3 ? MIME_K.end : tune === T.b6 || tune === T.b8 ? MIME_K.b : MIME_K.a;
    beats.push(beat(`${s.id}_v${k + 1}`, tuneDur(tune), sung(text, tune, [mime(s, ks), shots[k], k === 2 ? roboFace(s, 0.3, 1.8) : null])));
  });
  beats.push(beat(`${s.id}_v5`, 1.2, [pose("rest", 0.1, 0.35), { do: "clip", target: "robo", clip: "Idle", at: 0.1 }]));
  // Your turn: mime with Robo.
  beats.push(
    beat(`${s.id}_t1`, 2.4, [
      say(s.ask, { at: 0.1 }),
      { do: "shot", target: ["pip", "robo"], framing: "medium", dur: 1 },
      { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
      word(s.id, 0.3),
    ]),
    beat(`${s.id}_t2`, 2.6, [
      mime(s, [0, 1.6, 3.2]),
      s.id === "eat" || s.id === "dress" ? null : roboFace(s, 0.2, 1.8),
      s.id === "dress" ? { do: "clip", target: "robo", clip: "Jump", at: 0.3 } : null,
      s.id === "eat" ? roboFace(s, 0.2, 1.6, "right") : null,
      { do: "sound", sound: "tick", at: 0.4, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.3, volume: 0.5 },
      { do: "wiggle", target: "bubble", at: 0.2, deg: 10, dur: 1.6 },
    ]),
    beat(`${s.id}_t3`, 2.4, [
      pose("rest", 0.1, 0.35),
      pipSay(s.pipLine, 0.1),
      say(s.praise, { at: "after" }),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.6 },
      { do: "feel", target: "pip", feeling: "joyful", at: 0.2 },
    ]),
    beat(`${s.id}_t4`, 2.0, [
      unword(s.id, 0),
      i === 3 ? { do: "hide", target: "qmark", at: 0.05, dur: 0.2 } : null,
      fill(i + 1, `mini_${s.id}`),
      s.id === "brush" ? [{ do: "reparent", target: "toothbrush", parent: null, at: 0.6 }, { do: "hide", target: "toothbrush", at: 0.7, dur: 0.3 }] : null,
      { do: "camera", ...CAM, dur: 1.4 },
    ]),
  );
  scenes.push({ id: s.id, title: `This is the way we ${s.id === "eat" ? "eat our breakfast" : s.id === "dress" ? "put on our clothes" : s.id === "brush" ? "brush our teeth" : "wash our face"}`, music: false, beats });
});

// Sequence quiz: put the four steps in order.
const seqBeats = [
  beat("q0", 3.0, [
    say("You did it all! Now put the pictures in order.", { at: 0.1 }),
    { do: "camera", ...QCAM, dur: 1 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
    ...["dress", "eat", "wash", "brush"].map((id, k) => ({ do: "pop", target: `seq_${id}`, at: 0.5 + k * 0.25, dur: 0.4, sound: "pop" })),
    ...[1, 2, 3, 4].map((n, k) => ({ do: "pop", target: `num${n}`, at: 1.6 + k * 0.2, dur: 0.3, sound: false })),
  ]),
];
STEPS.forEach((s, i) => {
  const q = ["What do we do first?", "What comes next?", "And then?", "And last?"][i];
  seqBeats.push(
    beat(`q${i + 1}a`, i === 0 ? 3.6 : 2.4, [
      say(q, { at: 0.1 }),
      i === 0 ? countdown(1.0) : [{ do: "sound", sound: "tick", at: 1.0, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.7, volume: 0.5 }],
      { do: "wiggle", target: `num${i + 1}`, at: 0.4, deg: 12, dur: 0.8 },
    ]),
    beat(`q${i + 1}b`, 2.4, [
      { do: "move", target: `seq_${s.id}`, to: [SEQ_X[i], SEQ_Y[1], SEQ_Z], dur: 0.7, ease: "sineInOut" },
      { do: "sound", sound: "whoosh", at: 0.05 }, { do: "sound", sound: "ding", at: 0.7 },
      say(`${s.word[0]}${s.word.slice(1).toLowerCase()}!`, { at: 0.5 }),
      { do: "wiggle", target: `seq_${s.id}`, at: 0.8, deg: 10, dur: 0.8 },
    ]),
  );
});
seqBeats.push(beat("q5", 3.0, [
  say("Wash, brush, dress, eat! Well done!", { at: 0.1 }),
  ...STEPS.map((s, k) => ({ do: "hop", target: `seq_${s.id}`, at: 0.2 + k * 0.4, height: 0.25, dur: 0.4 })),
  { do: "sound", sound: "crowd_cheer", at: 1.8, volume: 0.4 },
  ...[1, 2, 3, 4].map((n, k) => ({ do: "wiggle", target: `star${n}`, at: 0.3 + k * 0.3, deg: 14, dur: 0.6 })),
]));
seqBeats.push(beat("q6", 1.0, [
  ...STEPS.map((s) => ({ do: "hide", target: `seq_${s.id}`, at: 0.05, dur: 0.3 })),
  ...[1, 2, 3, 4].map((n) => ({ do: "hide", target: `num${n}`, at: 0.05, dur: 0.3 })),
]));
scenes.push({ id: "order", title: "Put them in order!", beats: seqBeats });

// Last verse, everybody, then bye-bye.
const FIN = verse("This is the way we start the day,", "start the day, start the day,", T.a8, T.b6);
const dance = (ks) => ks.map((k, j) => [pose(j % 2 ? "rest" : "yay", onBeat(k), 0.25), { do: "hop", target: "pip", at: onBeat(k), height: 0.15, dur: 0.4 }]);
scenes.push({ id: "finale", title: "This is the way we start the day", music: false, beats: [
  beat("e0", 2.6, [
    say("One more time! This is the way we start the day!", { at: 0.1 }),
    { do: "camera", ...CAM, dur: 1.6 },
    toddle([2.3, 0, 0.2], 0.3, 1.8), { do: "turn", target: "pip", to: [0, 0, 0], at: 0.3, dur: 0.5 },
    roboWalk([0.8, 0, 0.5], 0.3, 1.8, 25),
  ]),
  ...FIN.map(([text, tune], k) => beat(`e${k + 1}`, tuneDur(tune), sung(text, tune, [
    dance(k === 3 ? MIME_K.end : tune === T.b6 ? MIME_K.b : MIME_K.a),
    k === 0 ? { do: "clip", target: "robo", clip: "Dance", at: 0.1 } : null,
    [{ do: "shot", target: ["pip", "robo"], framing: "wide", yaw: 10, dur: 2 }, { do: "orbit", around: [1.5, 0.8, 0.3], degrees: -20, dur: 4 }, { do: "shot", target: ["pip", "robo"], framing: "medium", yaw: -8, dur: 1.2 }, { do: "camera", ...CAM, dur: 1.4 }][k],
    k === 3 ? { do: "burst", target: "confetti", at: onBeat(4), dur: 2.4 } : null,
  ]))),
  beat("e5", 2.8, [
    pose("yay", 0.1, 0.3),
    say("Good morning, everybody! What a great start!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Jump", at: 0.2 },
    { do: "feel", target: "pip", feeling: "joyful", at: 0.1 },
    ...[1, 2, 3, 4].map((n, k) => ({ do: "wiggle", target: `star${n}`, at: 0.3 + k * 0.3, deg: 14, dur: 0.6 })),
    { do: "sound", sound: "crowd_cheer", at: 0.3, volume: 0.4 },
  ]),
  beat("e6", 3.4, [
    pose("wave", 0.1, 0.35),
    { do: "wiggle", target: "pip#fore_l", at: 0.5, deg: 25, dur: 2.2 },
    say("Bye-bye! See you tomorrow morning!", { at: 0.2 }),
    pipSay("Bye-bye!", 1.8),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.6 },
  ]),
]});

const description = "Start the day with Robo and Pip! The alarm clock rings, Pip wakes up and the morning routine begins: wash your face, brush your teeth, put on your clothes and eat your breakfast, all to the tune of Here We Go Round the Mulberry Bush. Do each action with Robo, guess what comes next, light up a star for every step, and put the four pictures in order at the end.";
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "This Is the Way We Start the Day", episode: "br12", seed: 312, skills: ["healthy_habits_prek", "listening_prek"], cast,
    youtube: {
      title: "This Is the Way We Start the Day ⏰ Morning Routine Song for Toddlers | Toy Box Friends",
      description: `${description}\n\nThe routine, in order: wake up, wash, brush, dress, eat.\n\nSing at home: sing a verse while you do each step in the morning, do the actions together, and ask "What comes next?" before each one. The verses are original (Toy Box Friends), sung to the traditional public-domain tune of Here We Go Round the Mulberry Bush.\n\n${YT_TAIL}`,
      tags: ["this is the way we start the day", "morning routine song", "this is the way", "mulberry bush", "nursery rhymes", "toddler learning", "baby songs", "brush your teeth song", "healthy habits for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "wake_up", title: "GOOD MORNING!", subtitle: "Wash, brush, dress, eat!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.4, 1.0, 4.6], lookAt: [1.7, 0.75, 0], fov: 36 },
        objects: [
          { id: "pip", kind: "critter", species: "toddler", at: [2.2, 0, 0.6], rotation: [0, -14, 0], size: 1.2, feeling: "joyful" },
          { id: "alarm", kind: "prop", model: "alarm_clock", at: [3.25, 0, 0.9], rotation: [0, -25, 0], size: 1.5 },
          { id: "brush", kind: "prop", model: "toothbrush", at: [3.15, 1.55, 0.6], rotation: [10, 0, 35], size: 2.0 },
          { id: "bowl", kind: "prop", model: "breakfast_bowl", at: [1.0, 1.55, 0.6], rotation: [35, 0, 0], size: 1.6 },
        ] },
      { name: "what_next", title: "WHAT COMES NEXT?", subtitle: "Morning routine song", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.9, 1.1, 5.4], lookAt: [2.2, 0.9, 0], fov: 36 },
        objects: [
          { id: "robo", kind: "character", character: "robot", at: [4.6, 0, -0.3], rotation: [0, -30, 0], clip: "Wave", feeling: "happy" },
          { id: "pip", kind: "critter", species: "toddler", at: [3.1, 0, 0.5], rotation: [0, 15, 0], size: 1.15, feeling: "joyful" },
          { id: "card", kind: "prop", model: "tracker_slot", color: "green", at: [3.7, 1.95, 0.5], size: 0.8 },
          { id: "card_icon", kind: "prop", model: "toothbrush", parent: "card", at: [0, -0.12, 0.16], size: 2.0, rotation: [10, 0, 35] },
        ] },
    ],
  }),
  stage: { preset: "playroom" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "start_the_day");
