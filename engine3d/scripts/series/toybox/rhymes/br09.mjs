// Builds ../br09_hot_cross_buns.json: Hot Cross Buns (traditional first verse, public domain) plus an original
// sharing verse ("If you have a friend, share one with your friend, one for you and one for me") in place of the
// daughters-and-sons lines. Robo the baker takes trays of two buns out of the oven; four friends knock at the
// door one by one (guess who by the sound), the two buns are counted (one, two) and shared, one each, and every
// time we check "Is it fair?" (the bear grabs both once: not fair, so he shares). Each friend's bun fills the plate
// tracker. Run: node br09.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, showTracker, fillSlot, yourTurn, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// Hot Cross Buns (traditional, public domain), key of C: E D C, E D C, C C C C D D D D, E D C. The sharing verse
// (original words) keeps the traditional second half's shape: four quick Cs, four quick Ds, then E D C.
const T = {
  buns: "E4 D4 C4:2", // Hot cross buns,
  penny: "C4:0.5 C4:0.5 C4:0.5 C4:0.5 D4:0.5 D4:0.5 D4:0.5 D4:0.5", // One a penny, two a penny,
  friend: "C4:0.5 C4:0.5 C4:0.5 C4:0.5 C4", // If you have a friend,
  share: "D4:0.5 D4:0.5 D4:0.5 D4:0.5 D4", // share one with your friend,
  each: "C4:0.5 C4:0.5 C4:0.5 C4:0.5 D4:0.5 D4:0.5 D4", // One for you and one for me,
};

// ---- Layout ---------------------------------------------------------------------------------------------------

const CAM = { position: [0.1, 2.05, 7.6], lookAt: [0.1, 1.0, -0.8], fov: 40 };
const OVEN_CAM = { position: [-2.3, 1.75, 3.9], lookAt: [-2.5, 0.95, -0.9], fov: 40 };
const DOOR_CAM = { position: [2.5, 1.75, 4.6], lookAt: [3.5, 1.1, -1.6], fov: 40 };
const TABLE_CAM = { position: [0.4, 2.05, 5.6], lookAt: [0.5, 0.95, -0.5], fov: 40 };
const TRAY_CAM = { position: [-0.55, 1.95, 2.7], lookAt: [-0.85, 0.95, -0.5], fov: 40 };

const OV = { at: [-3.85, 0, -1.0], size: 1.6, yaw: 15 };
/** A point in the oven's own frame (home_school.json oven, size 1) → world. */
function ovenPt([x, y, z]) {
  const a = (OV.yaw * Math.PI) / 180;
  const r = (v) => Math.round(v * 1000) / 1000;
  return [r(OV.at[0] + OV.size * (x * Math.cos(a) + z * Math.sin(a))), r(OV.size * y), r(OV.at[2] + OV.size * (-x * Math.sin(a) + z * Math.cos(a)))];
}
const TRAY_IN = ovenPt([0, 0.312, -0.03]); // on the oven rack, behind the closed door
const TRAY_OUT = ovenPt([0, 0.44, 0.9]); // just out, over the open door
const TRAY_MID = [-1.9, 1.2, -0.05];
const TRAY_SPOT = [-0.72, 0.8, -0.3]; // on the table
const TOP = 0.8; // table top
const ON_PLATE = TOP + 0.03;
const ROBO_PLATE = [-1.45, TOP, -0.2];
const CHAIR_Z = -1.02;
const SEAT = 0.485;
const DOOR = [3.95, 0, -1.8];
const WAIT = [3.95, -1.6, -2.3]; // under the floor behind the door
const READY = [3.95, 0, -2.3]; // behind the closed door
const STEP = [3.95, 0, -1.15]; // just through the doorway
const HOP = (id, at, height = 0.25) => ({ do: "hop", target: id, at, height, dur: 0.4 });

// The four friends, in the order they knock. x: their seat along the table.
const F = [
  { id: "bunny", species: "bunny", name: "Bunny", x: 0.0, size: 0.8, plate: "pink", sound: "Hop, hop!", who: "Who says hop, hop?", voice: { voice: "soft", pitch: 1.25, speed: 1 } },
  { id: "duck", species: "duck", name: "Duck", x: 0.82, size: 0.75, plate: "orange", sound: "Quack, quack!", who: "Who says quack, quack?", voice: { voice: "squeaky", pitch: 1.05, speed: 1.05 } },
  { id: "bear", species: "bear", name: "Bear", x: 1.64, size: 0.85, plate: "blue", sound: "Grr, grr!", who: "Who says grr, grr?", voice: { voice: "deep", pitch: 1.0, speed: 0.95 }, grabs: true },
  { id: "dog", species: "dog", name: "Puppy", x: 2.46, size: 0.78, plate: "green", sound: "Woof, woof!", who: "Who says woof, woof?", voice: { voice: "soft", pitch: 1.1, speed: 1.05 } },
];
const plateAt = (f) => [f.x, TOP, -0.22];
const seatAt = (f) => [f.x, SEAT, CHAIR_Z + 0.02];

// ---- Objects --------------------------------------------------------------------------------------------------

const objects = [
  { id: "robo", kind: "character", character: "robot", at: [-1.3, 0, -1.2], rotation: [0, 10, 0], feeling: "happy" }, // the baker, behind the table
  { id: "hat", kind: "prop", model: "baker_hat", parent: "robo", at: [0, 1.6, 0], size: 1.0 },
  { id: "oven", kind: "prop", model: "oven", at: OV.at, rotation: [0, OV.yaw, 0], size: OV.size },
  { id: "door", kind: "prop", model: "door", at: DOOR, color: "blue" },
  { id: "table1", kind: "prop", model: "table", at: [-1.0, 0, -0.3] },
  { id: "table2", kind: "prop", model: "table", at: [0.4, 0, -0.3] },
  { id: "table3", kind: "prop", model: "table", at: [1.8, 0, -0.3] },
  { id: "shelf", kind: "prop", model: "shelf", at: [-5.6, 0, -2.6], rotation: [0, 25, 0] },
  { id: "plant", kind: "prop", model: "plant", at: [5.4, 0, -2.3], size: 1.2 },
  { id: "plate_robo", kind: "prop", model: "bun_plate", color: "red", at: ROBO_PLATE },
  { id: "tray", kind: "prop", model: "baker_tray", at: TRAY_IN, rotation: [0, OV.yaw, 0], size: 1.2 },
];
for (const f of F) {
  objects.push({ id: `chair_${f.id}`, kind: "prop", model: "chair", color: f.plate, at: [f.x, 0, CHAIR_Z] });
  objects.push({ id: `plate_${f.id}`, kind: "prop", model: "bun_plate", color: f.plate, at: plateAt(f) });
  objects.push({ id: f.id, kind: "critter", species: f.species, size: f.size, at: WAIT });
}
// Two buns per round on the tray (round 1 is out at the start), four for the finale.
const BUN_L = [-0.15, 0.03, 0];
const BUN_R = [0.15, 0.03, 0];
F.forEach((f, i) => {
  objects.push({ id: `bun${i + 1}a`, kind: "prop", model: "hot_cross_bun", parent: "tray", at: BUN_L, hidden: i > 0 });
  objects.push({ id: `bun${i + 1}b`, kind: "prop", model: "hot_cross_bun", parent: "tray", at: BUN_R, rotation: [0, 20, 0], hidden: i > 0 });
});
const FIN = [[-0.16, 0.03, -0.115], [0.16, 0.03, -0.115], [-0.16, 0.03, 0.115], [0.16, 0.03, 0.115]];
FIN.forEach((p, k) => objects.push({ id: `fbun${k + 1}`, kind: "prop", model: "hot_cross_bun", parent: "tray", at: p, size: 0.95, hidden: true }));
// Quiz: a plate with one bun and a plate with two.
objects.push(
  { id: "plate_one", kind: "prop", model: "bun_plate", color: "purple", at: [-0.85, 0, 3.4], size: 3, hidden: true },
  { id: "q1bun", kind: "prop", model: "hot_cross_bun", parent: "plate_one", at: [0, 0.07, 0], size: 2.0 },
  { id: "plate_two", kind: "prop", model: "bun_plate", color: "teal", at: [0.85, 0, 3.4], size: 3, hidden: true },
  { id: "q2bun1", kind: "prop", model: "hot_cross_bun", parent: "plate_two", at: [-0.22, 0.07, 0], size: 1.7 },
  { id: "q2bun2", kind: "prop", model: "hot_cross_bun", parent: "plate_two", at: [0.22, 0.07, 0.02], size: 1.7, rotation: [0, 25, 0] },
);
objects.push({ id: "confetti", kind: "confetti", at: [1.2, 3.0, 0.2] });
// HUD: four plate slots (each fills with a bun), "?" on the last, countdown, words.
objects.push(...trackerObjects(4, { colors: F.map((f) => f.plate) }));
F.forEach((f, i) => objects.push({ id: `mini${i + 1}`, kind: "prop", model: "hot_cross_bun", hud: true, parent: `slot${i + 1}`, at: [0, -0.16, 0.15], rotation: [55, 0, 0], size: 2.9, hidden: true }));
objects.push({ id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot4", at: [0, -0.26, 0.2], size: 0.42, hidden: true });
objects.push(...countdownObjects());
objects.push(...bubbleObjects([
  { id: "one", text: "ONE", color: "red" }, { id: "two", text: "TWO", color: "blue" }, { id: "share", text: "SHARE", color: "green" },
  { id: "fair", text: "FAIR!", color: "green" }, { id: "yum", text: "YUM!", color: "orange" },
]));

const cast = Object.fromEntries(F.map((f) => [f.id, f.voice]));

// ---- Motion helpers -------------------------------------------------------------------------------------------

/** Door opens, ding, the tray slides out over the door and onto the table; the door shuts. */
const trayOut = (t0) => [
  { do: "turn", target: "oven#door", to: [85, 0, 0], at: t0, dur: 0.45, ease: "backOut" },
  { do: "sound", sound: "door_open", at: t0, volume: 0.5 },
  { do: "sound", sound: "ding", at: t0 + 0.45 },
  { do: "path", target: "tray", points: [TRAY_IN, TRAY_OUT, TRAY_MID, TRAY_SPOT], at: t0 + 0.5, dur: 1.3 },
  { do: "turn", target: "tray", to: [0, 0, 0], at: t0 + 0.9, dur: 0.6 },
  { do: "sound", sound: "sparkle", at: t0 + 1.8, volume: 0.6 },
  { do: "turn", target: "oven#door", to: [0, 0, 0], at: t0 + 1.9, dur: 0.4 },
];
/** The empty tray goes back into the oven (door opens and shuts). */
const trayIn = (t0) => [
  { do: "turn", target: "oven#door", to: [85, 0, 0], at: t0, dur: 0.45, ease: "backOut" },
  { do: "sound", sound: "door_open", at: t0, volume: 0.45 },
  { do: "path", target: "tray", points: [TRAY_SPOT, TRAY_MID, TRAY_OUT, TRAY_IN], at: t0 + 0.4, dur: 1.2 },
  { do: "turn", target: "tray", to: [0, OV.yaw, 0], at: t0 + 0.5, dur: 0.6 },
  { do: "turn", target: "oven#door", to: [0, 0, 0], at: t0 + 1.7, dur: 0.35 },
  { do: "sound", sound: "clink", at: t0 + 2.0, volume: 0.5 },
];
/** A bun hops off the tray (or a plate) in an arc onto a spot: reparent to the world, then a path. */
const serve = (bun, from, to, t0, dur = 0.8) => [
  { do: "reparent", target: bun, parent: null, at: t0 },
  { do: "path", target: bun, points: [from, [(from[0] + to[0]) / 2, 1.45, (from[2] + to[2]) / 2 + 0.1], to], at: t0 + 0.02, dur },
  { do: "sound", sound: "whoosh", at: t0, volume: 0.45 },
  { do: "sound", sound: "pop", at: t0 + dur, volume: 0.5 },
];
// A child's at and size are its own (a parent's size does not scale its children).
const onTray = (p) => [TRAY_SPOT[0] + p[0], TRAY_SPOT[1] + p[1] + 0.005, TRAY_SPOT[2] + p[2]];
const onPlate = ([x, , z], dx = 0) => [x + dx, ON_PLATE, z];

// ---- Scenes ---------------------------------------------------------------------------------------------------

const scenes = [];

// 0:00 The hook: the oven door drops open, ding, a tray of two buns slides out.
scenes.push({ id: "hello", title: "Ding! Buns!", beats: [
  beat("h1", 3.0, [
    { do: "camera", ...OVEN_CAM, dur: 0 },
    trayOut(0.15),
    say("Ding! Buns!", { at: 0.7 }),
    { do: "clip", target: "robo", clip: "Jump", at: 0.75 },
    { do: "look", target: "robo", at: 0.3, to: "tray" },
  ]),
  beat("h2", 2.6, [
    { do: "camera", ...TRAY_CAM, dur: 1.0 },
    say("Hot cross buns! Yummy!", { at: 0.1 }),
    { do: "wiggle", target: "bun1a", at: 0.4, deg: 10, dur: 0.8 },
    { do: "wiggle", target: "bun1b", at: 0.9, deg: 10, dur: 0.8 },
  ]),
  beat("h3", 2.8, [
    { do: "camera", ...CAM, dur: 1.2 },
    say("Friends are coming! Let's sing and share!", { at: 0.1 }),
    showTracker(4, 0.4),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
    { do: "look", target: "robo", at: 0.2, to: "ahead" },
  ]),
  beat("h4", 2.4, [
    say("Who comes last? A surprise!", { at: 0.1 }),
    { do: "pop", target: "qmark", at: 0.3, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot4", at: 0.6, deg: 12, dur: 1 },
    { do: "grow", target: "slot4", to: 1.2, at: 1.2, dur: 0.3 }, { do: "grow", target: "slot4", to: 1, at: 1.6, dur: 0.3 },
  ]),
]});

// The traditional verse, with ONE and TWO on "one a penny, two a penny".
scenes.push({ id: "sing", title: "Sing: Hot Cross Buns", music: false, beats: [
  beat("v1", tuneDur(T.buns), sung("Hot cross buns,", T.buns, [
    { do: "camera", ...TRAY_CAM, dur: 0.8 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    HOP("bun1a", onBeat(0), 0.2), HOP("bun1b", onBeat(1), 0.2), HOP("tray", onBeat(2), 0.08),
  ])),
  beat("v2", tuneDur(T.buns), sung("Hot cross buns,", T.buns, [
    { do: "orbit", around: [-0.72, 0.85, -0.3], degrees: 18, dur: 2.2 },
    HOP("bun1b", onBeat(0), 0.2), HOP("bun1a", onBeat(1), 0.2), HOP("tray", onBeat(2), 0.08),
  ])),
  beat("v3", tuneDur(T.penny), sung("One a penny, two a penny,", T.penny, [
    word("one", onBeat(0)),
    HOP("bun1a", onBeat(0), 0.3),
    { do: "hide", target: "w_one", at: onBeat(2), dur: 0.15 },
    { do: "show", target: "w_two", at: onBeat(2) + 0.15, dur: 0.2 },
    HOP("bun1b", onBeat(2), 0.3),
  ])),
  beat("v4", tuneDur(T.buns), sung("Hot cross buns.", T.buns, [
    unword("two", 0.1),
    { do: "camera", ...OVEN_CAM, dur: 1.2 },
    { do: "clip", target: "robo", clip: "Jump", at: onBeat(2) },
  ])),
]});

// Count the two buns, then your turn.
scenes.push({ id: "count", title: "Count the buns", beats: [
  beat("c2", 3.8, [
    { do: "camera", ...TRAY_CAM, dur: 1.0 },
    say("Let's count the buns!", { at: 0.1 }),
    { do: "point", target: "robo", to: "tray", at: 0.3, hold: 2.6 },
    say("One!", { at: 1.5, caption: false }), { do: "caption", text: "1", style: "count", at: 1.5, dur: 0.9 },
    HOP("bun1a", 1.5, 0.35), { do: "highlight", target: "bun1a", at: 1.5, dur: 0.9 },
    say("Two!", { at: 2.5, caption: false }), { do: "caption", text: "2", style: "count", at: 2.5, dur: 1.2 },
    HOP("bun1b", 2.5, 0.35), { do: "highlight", target: "bun1b", at: 2.5, dur: 1.2 },
  ]),
  ...yourTurn({ id: "c3", ask: "How many buns? Show me!", answer: "Two buns!", praise: "Yes! One, two!", wordId: "two" }),
]});

F.forEach((f, i) => {
  const r = i + 1;
  const a = `bun${r}a`;
  const b = `bun${r}b`;
  const plate = plateAt(f);
  const last = i === F.length - 1;

  // Knock, knock: guess who by the sound, 3-2-1, the door opens, the friend sits down.
  scenes.push({ id: `${f.id}_door`, title: last ? "The surprise at the door" : "Who is at the door?", beats: [
    beat(`${f.id}_k1`, 2.3, [
      { do: "camera", ...DOOR_CAM, dur: 1.2 },
      { do: "move", target: f.id, to: READY, at: 0.05, dur: 0.1 },
      { do: "sound", sound: "block", at: 0.2 }, { do: "sound", sound: "block", at: 0.5 },
      { do: "wiggle", target: "door", at: 0.2, deg: 2, dur: 0.5 },
      say(last ? "Knock, knock! One more friend!" : i === 0 ? "Knock, knock! Who is at the door?" : "Knock, knock!", { at: 0.8 }),
      { do: "look", target: "robo", at: 0.3, to: "door" },
    ]),
    beat(`${f.id}_k2`, 2.4, [
      { do: "say", who: f.id, text: f.sound, at: 0.15 },
      { do: "sound", sound: "tick", at: 1.4, volume: 0.4 },
      say(f.who, { at: "after" }),
    ]),
    i === 0 || last ? beat(`${f.id}_k3`, 2.6, countdown(0.15)) : null,
    beat(`${f.id}_k4`, 2.6, [
      { do: "turn", target: "door#door", to: [0, -90, 0], at: 0.1, dur: 0.5 },
      { do: "sound", sound: "door_open", at: 0.1 },
      { do: "path", target: f.id, points: [READY, STEP], at: 0.45, dur: 0.6, face: true },
      { do: "turn", target: f.id, to: [0, -25, 0], at: 1.1, dur: 0.3 },
      { do: "sound", sound: "ding", at: 1.0 },
      { do: "burst", target: "confetti", at: 1.0, dur: 2, sound: false },
      { do: "feel", target: f.id, feeling: "joyful", at: 1.0 },
      say(`It's ${f.species === "dog" ? "a puppy" : f.id === "duck" ? "a duck" : f.id === "bear" ? "a bear" : "a bunny"}!`, { at: 1.1, caption: false }),
      { do: "caption", text: f.name.toUpperCase(), style: "label", at: 1.1, dur: 1.6 },
      last ? { do: "hide", target: "qmark", at: 1.1, dur: 0.2 } : null,
      { do: "clip", target: "robo", clip: "Jump", at: 1.0 },
    ]),
    beat(`${f.id}_k5`, 2.7, [
      { do: "camera", ...CAM, dur: 1.2 },
      say(`Hello, ${f.name}! Come and sit!`, { at: 0.1 }),
      { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
      { do: "path", target: f.id, points: [STEP, [3.1, 0, -1.6], [f.x, 0, -1.62]], at: 0.15, dur: 1.35, face: true },
      { do: "move", target: f.id, to: seatAt(f), at: 1.55, dur: 0.4, ease: "backOut" },
      { do: "turn", target: f.id, to: [0, 0, 0], at: 1.55, dur: 0.35 },
      { do: "sound", sound: "boing", at: 1.55, volume: 0.5 },
      { do: "turn", target: "door#door", to: [0, 0, 0], at: 1.9, dur: 0.5 },
      { do: "look", target: "robo", at: 0.3, to: f.id },
    ]),
  ].filter(Boolean)});

  // A new tray of two buns (round 1's came out in the hook).
  if (i > 0) {
    scenes.push({ id: `${f.id}_bake`, title: "Ding! More buns!", beats: [
      beat(`${f.id}_b1`, 2.6, [
        { do: "camera", ...OVEN_CAM, dur: 0.9 },
        trayOut(0.2),
        say("Ding! More buns!", { at: 0.75 }),
        { do: "look", target: "robo", at: 0.2, to: "tray" },
        { do: "look", target: f.id, at: 0.4, to: "tray" },
      ]),
      beat(`${f.id}_b2`, 3.4, [
        { do: "camera", ...TRAY_CAM, dur: 0.8 },
        say(["Count with me!", "Count the buns!", "Let's count!"][i - 1], { at: 0.1 }),
        say("One!", { at: 1.2, caption: false }), { do: "caption", text: "1", style: "count", at: 1.2, dur: 0.9 }, HOP(a, 1.2, 0.35),
        say("Two!", { at: 2.1, caption: false }), { do: "caption", text: "2", style: "count", at: 2.1, dur: 1.2 }, HOP(b, 2.1, 0.35),
        word("two", 2.2),
      ]),
    ]});
  }

  // The sharing verse (original words): one bun each... or, for the bear, both!
  const bTo = f.grabs ? onPlate(plate, 0.2) : onPlate(ROBO_PLATE);
  scenes.push({ id: `${f.id}_song`, title: "Sing: share one with your friend", music: false, beats: [
    beat(`${f.id}_s1`, tuneDur(T.friend), sung("If you have a friend,", T.friend, [
      i > 0 ? unword("two", 0.1) : null,
      { do: "camera", ...TABLE_CAM, dur: 0.9 },
      { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
      HOP(f.id, onBeat(0.5), 0.2), HOP(f.id, onBeat(2), 0.2),
      { do: "feel", target: f.id, feeling: "happy", at: 0.2 },
    ])),
    beat(`${f.id}_s2`, tuneDur(T.share), sung("share one with your friend,", T.share, [
      word("share", onBeat(0)),
      { do: "point", target: "robo", to: f.id, at: onBeat(0), hold: 1.2 },
      { do: "orbit", around: [0.4, 0.9, -0.4], degrees: [10, -10, 12, -12][i], dur: 2.4 },
    ])),
    beat(`${f.id}_s3`, tuneDur(T.each), sung("One for you and one for me,", T.each, [
      unword("share", 0.1),
      serve(a, onTray(BUN_L), onPlate(plate, f.grabs ? -0.06 : 0), onBeat(0), 0.75),
      serve(b, onTray(BUN_R), bTo, onBeat(2), 0.75),
      { do: "look", target: "robo", at: onBeat(0), to: f.id },
      { do: "look", target: "robo", at: onBeat(2.2), to: f.grabs ? f.id : "plate_robo" },
      f.grabs ? { do: "feel", target: "robo", feeling: "surprised", at: onBeat(2.6) } : null,
    ])),
    beat(`${f.id}_s4`, tuneDur(T.buns), sung("Hot cross buns.", T.buns, [
      HOP(f.id, onBeat(0), 0.3), HOP(f.id, onBeat(1), 0.3),
      f.grabs ? null : { do: "clip", target: "robo", clip: "Jump", at: onBeat(1.5) },
      f.grabs ? { do: "feel", target: f.id, feeling: "joyful", at: 0.2 } : null,
    ])),
  ]});

  // Is it fair? One each: yes! (The bear's round: two and none, not fair, so he shares one back.)
  const fair = [];
  if (f.grabs) {
    fair.push(
      beat(`${f.id}_f1`, 2.8, [
        { do: "shot", target: ["plate_robo", `plate_${f.id}`, f.id], framing: "medium", dur: 1.0 },
        say("Two for Bear... and none for Robo! Is it fair?", { at: 0.2 }),
        { do: "mark", target: `plate_${f.id}`, result: "incorrect", at: 1.2, dur: 1.6 },
        { do: "clip", target: "robo", clip: "No", at: 1.0 },
      ]),
      beat(`${f.id}_f2`, 1.7, [{ do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 }, { do: "wiggle", target: f.id, at: 0.3, deg: 8, dur: 1.2 }]),
      beat(`${f.id}_f3`, 4.4, [
        say("No! Not fair! Share, Bear!", { at: 0.1 }),
        word("share", 0.3),
        { do: "feel", target: "robo", feeling: "happy", at: 0.2 },
        { do: "feel", target: f.id, feeling: "surprised", at: 0.4 },
        { do: "say", who: f.id, text: "Oops! One for you, Robo!", at: "after" },
        { do: "feel", target: f.id, feeling: "happy", at: 2.0 },
        serve(b, bTo, onPlate(ROBO_PLATE), 3.0, 0.8),
        { do: "move", target: a, to: onPlate(plate), at: 3.1, dur: 0.4 },
        { do: "look", target: "robo", at: 3.0, to: "plate_robo" },
      ]),
      beat(`${f.id}_f5`, 2.8, [
        unword("share", 0),
        word("fair", 0.3),
        say("One for Bear, one for Robo. Now it's fair!", { at: 0.1 }),
        { do: "mark", target: `plate_${f.id}`, result: "correct", at: 0.6, dur: 1.8 },
        { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.8 },
      ]),
    );
  } else {
    fair.push(
      beat(`${f.id}_f1`, 2.6, [
        { do: "shot", target: ["plate_robo", `plate_${f.id}`, f.id], framing: "medium", dur: 1.0 },
        say(`One for ${f.name}, one for Robo. Is it fair?`, { at: 0.2 }),
        { do: "look", target: "robo", at: 0.3, to: "ahead" },
      ]),
      beat(`${f.id}_f2`, 1.7, [
        { do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 },
        { do: "wiggle", target: a, at: 0.3, deg: 10, dur: 0.6 }, { do: "wiggle", target: b, at: 1.0, deg: 10, dur: 0.6 },
      ]),
      beat(`${f.id}_f3`, 2.6, [
        word("fair", 0.1),
        say(["Yes! One each! That's fair!", "Yes! One and one! Fair!", "", "Yes! One each! So fair!"][i], { at: 0.1 }),
        { do: "mark", target: `plate_${f.id}`, result: "correct", at: 0.4, dur: 1.8 },
        { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.6 },
        i === 0 ? { do: "say", who: f.id, text: "Thank you, Robo!", at: "after" } : null,
      ]),
    );
  }
  fair.push(beat(`${f.id}_f6`, 2.1, [
    unword("fair", 0),
    word("yum", 0.3),
    say("Yum, yum, yum!", { at: 0.2 }),
    { do: "hide", target: a, at: 0.9, dur: 0.5 }, { do: "hide", target: b, at: 1.0, dur: 0.5 },
    { do: "sound", sound: "giggle", at: 0.9, volume: 0.6 },
    { do: "wiggle", target: f.id, at: 0.6, deg: 10, dur: 1.2 },
    { do: "feel", target: f.id, feeling: "joyful", at: 0.5 },
    { do: "clip", target: "robo", clip: "Yes", at: 0.5 },
  ]));
  fair.push(beat(`${f.id}_f7`, 2.6, [
    unword("yum", 0),
    fillSlot(r, `mini${r}`, 0.25),
    say(last ? "Everyone had a bun! One more tray!" : "More buns in the oven!", { at: 0.4 }),
    { do: "camera", ...CAM, dur: 1.0 },
    trayIn(0.4),
    last
      ? FIN.map((_, k) => ({ do: "show", target: `fbun${k + 1}`, at: 2.5, dur: 0.05 }))
      : [{ do: "show", target: `bun${r + 1}a`, at: 2.5, dur: 0.05 }, { do: "show", target: `bun${r + 1}b`, at: 2.5, dur: 0.05 }],
  ]));
  scenes.push({ id: `${f.id}_fair`, title: "Is it fair?", beats: fair });
});

// Recap quiz: point to it.
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 2.0, [
    say("Now a quick game!", { at: 0.1 }),
    { do: "camera", position: [0, 2.3, 7.0], lookAt: [0, 0.4, 3.0], fov: 40, dur: 1.0 },
    { do: "pop", target: "plate_one", at: 0.6, dur: 0.4, sound: "pop" },
    { do: "pop", target: "plate_two", at: 0.9, dur: 0.4, sound: "pop" },
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
  ]),
  ...quizRound({ id: "q1", q: "Which plate has two buns? Point to it!", left: "plate_one", right: "plate_two", answer: "plate_two", yes: "Yes! Two buns! One, two!",
    spots: [[-0.85, 0, 3.4], [0.85, 0, 3.4]] }),
  beat("q1e", 1.0, [{ do: "hide", target: "plate_one", at: 0.05, dur: 0.3 }, { do: "hide", target: "plate_two", at: 0.1, dur: 0.3 }]),
]});

// The finale: a big tray for everyone, then the whole song, then bye-bye.
const all = F.map((f) => f.id);
scenes.push({ id: "finale", title: "Buns for everyone!", music: false, beats: [
  beat("z1", 2.8, [{ do: "camera", ...OVEN_CAM, dur: 0.8 }, trayOut(0.2), say("Ding! Buns for everyone!", { at: 0.75 }), { do: "clip", target: "robo", clip: "Jump", at: 0.8 }]),
  beat("z2", 4.6, [
    { do: "camera", ...TABLE_CAM, dur: 1.0 },
    say("One for you, and you, and you, and you!", { at: 0.2 }),
    ...F.map((f, k) => serve(`fbun${k + 1}`, onTray(FIN[k]), onPlate(plateAt(f)), 0.4 + k * 0.7, 0.7)),
    ...F.map((f, k) => HOP(f.id, 1.15 + k * 0.7, 0.25)),
    ...F.map((f, k) => ({ do: "feel", target: f.id, feeling: "joyful", at: 1.1 + k * 0.7 })),
    say("Everybody sing!", { at: "after" }),
    { do: "clip", target: "robo", clip: "Dance", at: 3.2 },
    { do: "camera", position: [0.3, 2.1, 7.0], lookAt: [0.4, 1.0, -0.8], fov: 40, at: 3.0, dur: 1.4 },
  ]),
  beat("z4", tuneDur(T.buns), sung("Hot cross buns,", T.buns, all.map((id, k) => HOP(id, onBeat(k * 0.7), 0.3)))),
  beat("z5", tuneDur(T.buns), sung("Hot cross buns,", T.buns, all.map((id, k) => HOP(id, onBeat(2.1 - k * 0.7), 0.3)))),
  beat("z6", tuneDur(T.penny), sung("One a penny, two a penny,", T.penny, [word("one", onBeat(0)), { do: "hide", target: "w_one", at: onBeat(2), dur: 0.15 }, { do: "show", target: "w_two", at: onBeat(2) + 0.15, dur: 0.2 }])),
  beat("z7", tuneDur(T.buns), sung("Hot cross buns.", T.buns, [unword("two", 0.1), { do: "clip", target: "robo", clip: "Jump", at: onBeat(1.5) }])),
  beat("z8", tuneDur(T.friend), sung("If you have a friend,", T.friend, [{ do: "orbit", around: [0.6, 0.9, -0.4], degrees: 14, dur: 2.6 }, ...all.map((id, k) => ({ do: "wiggle", target: id, at: onBeat(k * 0.6), deg: 10, dur: 0.6 }))])),
  beat("z9", tuneDur(T.share), sung("share one with your friend,", T.share, [word("share", onBeat(0)), { do: "point", target: "robo", to: "bunny", at: onBeat(0.5), hold: 1.0 }])),
  beat("z10", tuneDur(T.each), sung("One for you and one for me,", T.each, [unword("share", 0.1), ...all.map((id, k) => HOP(id, onBeat(k * 0.8), 0.3))])),
  beat("z11", tuneDur(T.buns), sung("Hot cross buns.", T.buns, [
    { do: "burst", target: "confetti", at: 0.2, dur: 2.6 },
    ...[1, 2, 3, 4].map((s, k) => ({ do: "wiggle", target: `slot${s}`, at: 0.3 + k * 0.3, deg: 10, dur: 0.5 })),
    { do: "clip", target: "robo", clip: "Jump", at: onBeat(1) },
  ])),
  beat("z12", 3.4, [
    say("Bye-bye, friends! Share with a friend!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    ...all.map((id, k) => ({ do: "wiggle", target: id, at: 0.4 + k * 0.1, deg: 8, dur: 1.5 })),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.8, dur: 2.4 },
    { do: "camera", position: [0.1, 2.6, 9.6], lookAt: [0.1, 1.2, -1], fov: 40, dur: 3 },
  ]),
]});

// ---- Meta -----------------------------------------------------------------------------------------------------

const description = "Sing Hot Cross Buns with Robo the baker and learn to count and share! Ding! A tray of hot cross buns comes out of the oven. Count them, one, two, then knock, knock: guess which friend is at the door by the sound. Every friend shares the two buns with Robo, one each, and we ask: is it fair? Watch out for Bear, who takes two! Then a point-to-it quiz and the whole song with everyone.";
// Thumbnails: the classroom without its chalkboard is a set override the thumbnail scenes cannot take, so they
// use the playroom; the buns are big (sizes are absolute: a parent's size does not scale its children).
const bigTray = (x, z) => [
  { id: "table", kind: "prop", model: "table", at: [x, 0, z] },
  { id: "tray", kind: "prop", model: "baker_tray", at: [x, 0.8, z], size: 1.7 },
  ...[[-0.21, -0.14], [0.21, -0.14], [-0.21, 0.15], [0.21, 0.15]].map(([bx, bz], k) => ({ id: `tb${k}`, kind: "prop", model: "hot_cross_bun", parent: "tray", at: [bx, 0.04, bz], size: 1.45, rotation: [0, k * 25, 0] })),
];
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Hot Cross Buns", episode: "br09", seed: 309,
    skills: ["count_to_5_prek", "feelings_prek"],
    cast,
    youtube: {
      title: "Hot Cross Buns 🥯 Count 1, 2 and Share Sing-Along for Toddlers | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: counting one and two, sharing one each, and what "fair" means (the same for you and the same for me).\n\nSing at home: hold up one finger, then two, on "one a penny, two a penny", share two snacks with a friend or a teddy, one each, and ask "Is it fair?". The first verse of Hot Cross Buns is a traditional public-domain rhyme sung to its traditional tune; the sharing verse ("If you have a friend, share one with your friend") and the story are original, written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["hot cross buns", "nursery rhymes", "counting for toddlers", "count to 2", "sharing for kids", "learn to share", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "buns", title: "HOT CROSS BUNS", subtitle: "Count 1, 2 and share!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.6, 1.75, 3.5], lookAt: [2.15, 0.9, -0.3], fov: 38 },
        objects: [
          ...bigTray(3.0, -0.3),
          { id: "oven", kind: "prop", model: "oven", at: [3.6, 0, -1.7], size: 1.6, rotation: [0, -15, 0] },
          { id: "bunny", kind: "critter", species: "bunny", at: [3.7, 0, 0.75], size: 0.85, rotation: [0, -35, 0], feeling: "joyful" },
        ] },
      { name: "share", title: "ONE FOR YOU!", subtitle: "Share hot cross buns", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.75, 1.6, 3.1], lookAt: [1.95, 0.95, -0.4], fov: 38 },
        objects: [
          { id: "table", kind: "prop", model: "table", at: [2.75, 0, -0.3] },
          { id: "p1", kind: "prop", model: "bun_plate", color: "pink", at: [2.35, 0.8, -0.15], size: 1.6 },
          { id: "b1", kind: "prop", model: "hot_cross_bun", parent: "p1", at: [0, 0.04, 0], size: 1.7 },
          { id: "p2", kind: "prop", model: "bun_plate", color: "blue", at: [3.2, 0.8, -0.15], size: 1.6 },
          { id: "b2", kind: "prop", model: "hot_cross_bun", parent: "p2", at: [0, 0.04, 0], size: 1.7, rotation: [0, 30, 0] },
          { id: "chair1", kind: "prop", model: "chair", color: "pink", at: [2.35, 0, -0.95] },
          { id: "chair2", kind: "prop", model: "chair", color: "blue", at: [3.2, 0, -0.95] },
          { id: "bunny", kind: "critter", species: "bunny", at: [2.35, 0.485, -0.93], size: 0.85, rotation: [0, 10, 0], feeling: "joyful" },
          { id: "duck", kind: "critter", species: "duck", at: [3.2, 0.485, -0.93], size: 0.8, rotation: [0, -10, 0], feeling: "happy" },
        ] },
    ],
  }),
  stage: { preset: "classroom", set: kitchenSet() },
  camera: CAM,
  objects,
  scenes,
};

/** The classroom's warm wall, skirting, and two windows, without the chalkboard (a kitchen wall). */
function kitchenSet() {
  const plate = (id, color, at, scale, material = "matte") => ({ id, kind: "shape", shape: "plate", color, material, at, rotation: [90, 0, 0], scale });
  return [
    plate("wall", "wall_warm", [0, 6, -6.6], [120, 1, 12]),
    plate("skirting", "wood_dark", [0, 0.16, -6.55], [120, 1, 0.32]),
    ...[-3.2, 3.2].flatMap((x, k) => [
      plate(`window_frame${k}`, "white", [x, 3, -6.52], [2.5, 1, 2.3]),
      plate(`window${k}`, "sky", [x, 3, -6.48], [2.2, 1, 2], "glossy"),
      plate(`window_bar${k}`, "white", [x, 3, -6.45], [0.08, 1, 2]),
    ]),
  ];
}

writeRhyme(script, "hot_cross_buns");
