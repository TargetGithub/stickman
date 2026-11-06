// Builds ../br04_head_shoulders_knees_toes.json: Head, Shoulders, Knees and Toes (traditional, public domain) with
// Robo and Pip the toddler (catalog/models/rhymes_br04.json), who touches each body part. Run: node br04.mjs
// (then node tools/sung_durs.mjs on the json and this again, so the sung beats fit their spoken lines).
import {
  YT_TAIL, beat, bubbleObjects, countdown, countdownObjects, fillSlot, onBeat, rhymeMeta, say, showTracker,
  sung, trackerObjects, tuneDur, unword, word, writeRhyme,
} from "./kit.mjs";

// The traditional tune (the "There is a Tavern in the Town" melody, public domain), arranged in C at 112 a minute,
// one note per syllable. ":2" = a two-beat note.
const T = {
  l1: "C4 D4 E4 F4 G4 G4:2 E4 F4 G4:2", // Head, shoul-ders, knees and toes, knees and toes,
  l2: "B3 C4 D4 E4 F4 F4:2 D4 E4 F4:2", // Head, shoul-ders, knees and toes, knees and toes,
  l3: "C5 C5 B4 B4 A4 A4 G4 G4:2", // And eyes and ears and mouth and nose,
  l4: "G4 F4 E4 D4 C4 C4:2 D4 D4 C4:2", // Head, shoul-ders, knees and toes, knees and toes.
};
// Lines. A sung line is keyed by its text in durs/br04.json; the faster round (speed 1.2) reuses the same texts:
// its lines are only ~0.2 s shorter, and an exclamation mark makes the voice slow down (measured: 4.4 s against
// 2.9 s), so every line ends in a comma or a full stop.
const L = {
  hskt: "Head, shoulders, knees and toes, knees and toes,",
  face: "And eyes and ears and mouth and nose,",
  end: "Head, shoulders, knees and toes, knees and toes.",
};
L.fast = L.hskt;
L.fastFace = L.face;
// Tune beats where each body part is sung: lines 1, 2 and 4, and line 3.
const HSKT_BEATS = [["head", 0], ["shoulders", 1], ["knees", 3], ["toes", 5], ["knees", 7], ["toes", 9]];
const FACE_BEATS = [["eyes", 1], ["ears", 3], ["mouth", 5], ["nose", 7]];

// ---- Pip's poses ---------------------------------------------------------------------------------------------
// Absolute angles (degrees) from a small IK solve on the model: hip bend (the head group turns about x), the left
// arm and forearm (Euler XYZ); the right side is the mirror image unless `one` (one hand only, the right arm rests).
const ARM_REST = [0, 0, 8];
const POSES = {
  rest: { hip: 0, arm: ARM_REST, fore: [0, 0, 0] },
  head: { hip: 0, arm: [86, 69, 100], fore: [53, 0, 2] },
  shoulders: { hip: 0, arm: [-21, 5, 22], fore: [-146, 0, -2] },
  knees: { hip: 45, arm: [-19, -7, 0], fore: [-32, 1, -30] },
  toes: { hip: 85, arm: [-50, -11, -15], fore: [-40, 0, 0] },
  eyes: { hip: 0, arm: [-41, -85, 69], fore: [-57, -4, 32] },
  ears: { hip: 0, arm: [40, -2, 106], fore: [130, 6, 38] },
  mouth: { hip: 0, arm: [-80, -1, -14], fore: [-58, 5, -42], one: true },
  nose: { hip: 0, arm: [-93, 12, -18], fore: [-33, 6, -40], one: true },
  yay: { hip: -6, arm: [0, 0, 150], fore: [0, 0, 25] },
  wave: { hip: 0, arm: [0, 0, 140], fore: [0, 0, 35], one: true },
};
const off = (a, rest = ARM_REST) => a.map((v, i) => v - rest[i]);
const mir = (a) => [a[0], -a[1], -a[2]];
/** Pip takes a pose (five part turns) at `at` over `dur` seconds. */
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
/** Pip touches each part on its tune beat (before fitting; fitSung scales the times to the spoken line). */
const touchAlong = (list, dur = 0.24) => list.map(([part, k]) => [pose(part, onBeat(k), dur), part === "head" ? roboHead(onBeat(k), 0.35, 0.2) : null]);
/** Robo puts his left hand on top of his head (a point just above it, tried by eye). */
const roboHead = (at, hold = 1.5, dur = 0.35) => ({ do: "point", target: "robo", to: [ROBO[0] + 0.45, 2.2, ROBO[2] + 0.3], arm: "left", at, dur, hold, look: false });

// ---- The set ---------------------------------------------------------------------------------------------------
const ROBO = [-1.7, 0, 0.5];
const PIP = [1.15, 0, 0.9];
const PIP_YAW = -48; // turned toward Robo, so a bend to the knees or toes reads from the front camera
const PIP_SIZE = 1.05;
const CAM = { position: [-0.1, 1.35, 5.7], lookAt: [-0.25, 0.82, 0.5], fov: 40 };
const WIDE = { position: [0, 2.3, 10.2], lookAt: [0, 1.2, 0], fov: 40 };
/** A point on Pip (model units, Pip's own frame) in the world. */
function pipPt([x, y, z]) {
  const a = (PIP_YAW * Math.PI) / 180;
  const r = (v) => Math.round(v * 1000) / 1000;
  return [r(PIP[0] + PIP_SIZE * (x * Math.cos(a) + z * Math.sin(a))), r(PIP_SIZE * y), r(PIP[2] + PIP_SIZE * (-x * Math.sin(a) + z * Math.cos(a)))];
}

// The four body parts of the tracker, then the bonus face parts.
const PARTS = [
  { id: "head", word: "HEAD", at: [0.12, 1.12, 0.12], from: [0.7, 0.4, 0.25], yaw: 8, intro: "Pip, where is your head?", pip: "Here is my head!", ask: "Your turn! Touch your head!", praise: "Yay! You touched your head!" },
  { id: "shoulders", word: "SHOULDERS", at: [0.3, 0.8, 0.08], from: [0.75, 0.3, 0.3], yaw: -8, intro: "Where are your shoulders?", pip: "Here are my shoulders!", ask: "Your turn! Touch your shoulders!", praise: "Great job! Shoulders!" },
  { id: "knees", word: "KNEES", at: [0.14, 0.28, 0.1], from: [0.75, 0.35, 0.35], yaw: 32, intro: "Where are your knees?", pip: "Here are my knees!", ask: "Your turn! Bend down and touch your knees!", praise: "Wow! Super knees!" },
  { id: "toes", word: "TOES", at: [0.12, 0.07, 0.2], from: [0.75, 0.35, 0.35], yaw: 34, intro: "Where are your toes? Way down low!", pip: "Here are my toes!", ask: "Your turn! Touch your toes!", praise: "Hooray! Wiggly toes!" },
];
const FACE = [
  { id: "eyes", word: "EYES", ask: "Touch your eyes!", pip: "Peekaboo! Eyes!", praise: "I see you!" },
  { id: "ears", word: "EARS", ask: "Touch your ears!", pip: "Ears!", praise: "Listen, listen!" },
  { id: "mouth", word: "MOUTH", ask: "Touch your mouth!", pip: "Mouth! Mmm!", praise: "Yum yum!" },
  { id: "nose", word: "NOSE", ask: "Touch your nose!", pip: "Nose! Beep beep!", praise: "Beep beep! Silly nose!" },
];

const objects = [
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, 30, 0], feeling: "happy" },
  { id: "pip", kind: "critter", species: "toddler", at: PIP, rotation: [0, PIP_YAW, 0], size: PIP_SIZE, feeling: "happy" },
  { id: "ball", kind: "shape", shape: "sphere", color: "red", at: [-3.6, 0.3, -1.6], size: 0.6 },
  { id: "blocks", kind: "shape", shape: "cube", color: "yellow", at: [3.7, 0.25, -1.5], size: 0.5, rotation: [0, 20, 0] },
  { id: "blocks2", kind: "shape", shape: "cube", color: "blue", at: [3.75, 0.75, -1.5], size: 0.45, rotation: [0, -10, 0] },
  { id: "confetti", kind: "confetti", at: [0, 3.2, 1] },
  // Arrows that show each body part on Pip (drawn in, then hidden).
  // The tip is on the part (Pip's own frame); the tail sits up and to the right in the world, toward the camera.
  ...PARTS.map((p) => ({ id: `arrow_${p.id}`, kind: "pointer", from: pipPt(p.at).map((v, i) => Math.round((v + p.from[i]) * 1000) / 1000), to: pipPt(p.at), color: "orange", width: 0.07, bend: 0.12, hidden: true })),
  // Quiz cards: a picture card each (a tracker slot standing in the air with a body-part icon on it).
  ...[["qa_toes", "toes", -1.15], ["qa_head", "head", 0.75], ["qb_knees", "knees", -1.15], ["qb_shoulders", "shoulders", 0.75]].flatMap(([id, part, x], k) => [
    { id, kind: "prop", model: "tracker_slot", color: ["green", "pink", "purple", "orange"][k], at: [x, 1.25, 2.1], size: 1.15, hidden: true },
    { id: `${id}_icon`, kind: "prop", model: `icon_${part}`, parent: id, at: [0, 0, 0.16], size: 0.66 },
  ]),
  // HUD: five tracker slots (four body-part stars and the bonus), icons, stars, a "?", the countdown, the word bubble.
  ...trackerObjects(5),
  ...["head", "shoulders", "knees", "toes", "face"].map((m, i) => ({ id: `mini_${m}`, kind: "prop", model: `icon_${m}`, hud: true, parent: `slot${i + 1}`, at: [0, -0.02, 0.15], size: 0.62, hidden: true })),
  ...[1, 2, 3, 4, 5].map((i) => ({ id: `star${i}`, kind: "shape", shape: "star", color: "gold", hud: true, parent: `slot${i}`, at: [0.36, 0.38, 0.3], size: 0.34, hidden: true })),
  { id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot5", at: [0, -0.26, 0.2], size: 0.42, hidden: true },
  ...countdownObjects(),
  ...bubbleObjects([...PARTS, ...FACE].map((p) => ({ id: p.id, text: p.word, color: "ink" }))),
];
// SHOULDERS is long: a smaller word.
objects.find((o) => o.id === "w_shoulders").size = 0.2;

const cast = { pip: { voice: "squeaky", pitch: 1.2, speed: 1 } };
const pipSay = (text, at = 0.1) => ({ do: "say", who: "pip", text, at });
const fill = (i, mini) => [...fillSlot(i, mini), { do: "pop", target: `star${i}`, at: 0.55, dur: 0.4, sound: "sparkle" }];

const scenes = [];

// 0:00 The hook: "Touch your head!" with Robo and Pip at once, the four stars, the bonus teased.
scenes.push({ id: "hello", title: "Touch your head!", beats: [
  beat("h1", 2.8, [
    { do: "camera", position: [0, 1.6, 6.6], lookAt: [0, 1.05, 0.4], fov: 40, dur: 0 },
    { do: "camera", ...CAM, dur: 2.8 },
    say("Touch your head!", { at: 0.1 }),
    roboHead(0.15, 2.1),
    pose("head", 0.35),
    word("head", 0.5), { do: "sound", sound: "pop", at: 0.5 },
    { do: "feel", target: "pip", feeling: "joyful", at: 0.6 },
  ]),
  beat("h2", 3.4, [
    pipSay("Head!"),
    { do: "hop", target: "pip", at: 0.15, height: 0.2 },
    say("Now shoulders, knees and toes!", { at: "after" }),
    unword("head", 0.9),
    pose("shoulders", 1.2, 0.25), pose("knees", 1.9, 0.25), pose("toes", 2.6, 0.3),
  ]),
  beat("h3", 2.8, [
    pose("rest", 0.1, 0.4),
    { do: "feel", target: "pip", feeling: "happy", at: 0.3 },
    say("Sing and touch them all, and light up four stars!", { at: 0.1 }),
    showTracker(4, 0.4),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
  beat("h4", 2.6, [
    say("And a bonus round at the end!", { at: 0.1 }),
    { do: "pop", target: "slot5", at: 0.2, dur: 0.4, sound: "magic_sparkle" }, { do: "pop", target: "qmark", at: 0.4, dur: 0.4, sound: false },
    { do: "grow", target: "slot5", to: 1.2, at: 1.0, dur: 0.3 }, { do: "grow", target: "slot5", to: 1, at: 1.4, dur: 0.3 },
    { do: "clip", target: "robo", clip: "Jump", at: 0.4 },
  ]),
]});

// Each body part: Pip shows it (arrow and word), the child's turn, a star lights up.
PARTS.forEach((p, i) => {
  const at = pipPt(p.at);
  scenes.push({ id: `${p.id}_learn`, title: `Touch your ${p.id}!`, beats: [
    beat(`${p.id}_l1`, 2.6, [
      { do: "shot", target: ["pip", `arrow_${p.id}`], framing: "medium", yaw: p.yaw, pad: 0.15, dur: 1.2 },
      say(p.intro, { at: 0.1 }),
      { do: "point", target: "robo", to: at, at: 0.3, dur: 0.45, hold: 1.6 },
      { do: "draw", target: `arrow_${p.id}`, at: 0.5, dur: 0.6, sound: "whoosh" },
      word(p.id, 0.7), { do: "sound", sound: "pop", at: 0.7 },
    ]),
    beat(`${p.id}_l2`, 2.4, [
      pose(p.id, 0.1),
      pipSay(p.pip, 0.35),
      { do: "feel", target: "pip", feeling: "joyful", at: 0.5 },
      { do: "wiggle", target: "bubble", at: 0.4, deg: 8, dur: 1.2 },
      { do: "hide", target: `arrow_${p.id}`, at: 1.9, dur: 0.3 },
    ]),
    beat(`${p.id}_l3`, 2.4, [
      pose("rest", 0.1, 0.35),
      { do: "camera", ...CAM, dur: 1.2 },
      say(p.ask, { at: 0.1 }),
      { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
      pose(p.id, 1.3),
    ]),
    beat(`${p.id}_l4`, 2.2, [
      { do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 },
      { do: "wiggle", target: "bubble", at: 0.2, deg: 10, dur: 1.6 },
      { do: "wiggle", target: "pip", at: 0.5, deg: 5, dur: 1.2 },
    ]),
    beat(`${p.id}_l5`, 2.4, [
      say(p.praise, { at: 0.1 }),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.4 },
      { do: "feel", target: "pip", feeling: "joyful", at: 0.3 },
      { do: "sound", sound: "giggle", at: 0.9, volume: 0.6 },
    ]),
    beat(`${p.id}_l6`, 1.8, [
      pose("rest", 0.05, 0.4),
      unword(p.id, 0),
      fill(i + 1, `mini_${p.id}`),
      { do: "feel", target: "pip", feeling: "happy", at: 0.6 },
    ]),
  ]});
});

// The song, touching along; then faster.
const songBeats = (pre, lines, speed) => {
  const o = speed ? { speed } : {};
  const say1 = (text, tune, extra) => [{ ...sung(text, tune)[0], ...o }, ...extra];
  const d = speed ? 0.18 : 0.24;
  return [
    beat(`${pre}1`, tuneDur(T.l1), say1(lines[0], T.l1, [touchAlong(HSKT_BEATS, d), { do: "clip", target: "robo", clip: "Dance", at: 0.1 }, { do: "shot", target: ["robo", "pip"], framing: "wide", yaw: -8, dur: 2 }])),
    beat(`${pre}2`, tuneDur(T.l2), say1(lines[1], T.l2, [touchAlong(HSKT_BEATS, d), { do: "orbit", around: [PIP[0], 0.7, PIP[2]], degrees: 22, dur: 4 }])),
    beat(`${pre}3`, tuneDur(T.l3), say1(lines[2], T.l3, [pose("rest", 0.1, 0.2), touchAlong(FACE_BEATS, d), { do: "shot", target: "pip", framing: "medium", yaw: 5, dur: 1.2 }])),
    beat(`${pre}4`, tuneDur(T.l4), say1(lines[3], T.l4, [touchAlong(HSKT_BEATS, d), { do: "camera", ...CAM, dur: 1.4 }, { do: "clip", target: "robo", clip: "Jump", at: onBeat(9) }])),
  ];
};
scenes.push({ id: "sing", title: "Sing and touch!", music: false, beats: [
  beat("s0", 2.6, [
    say("Now let's sing it! Touch along with Pip!", { at: 0.1 }),
    { do: "camera", ...CAM, dur: 1 },
    { do: "clip", target: "robo", clip: "Yes", at: 0.2 },
  ]),
  ...songBeats("s", [L.hskt, L.hskt, L.face, L.end]),
  beat("s5", 1.8, [pose("yay", 0.1, 0.3), { do: "feel", target: "pip", feeling: "joyful", at: 0.1 }, { do: "sound", sound: "crowd_cheer", at: 0.2, volume: 0.4 }, pose("rest", 1.3, 0.4)]),
]});
scenes.push({ id: "faster", title: "Faster!", music: false, beats: [
  beat("f0", 3.2, [say("Again, faster!", { at: 0.1 }), countdown(0.7), { do: "clip", target: "robo", clip: "Jump", at: 0.2 }]),
  ...songBeats("f", [L.fast, L.fast, L.fastFace, L.fast], 1.2),
  beat("f5", 2.6, [
    pose("yay", 0.1, 0.3),
    say("Whoa! Super fast!", { at: 0.1 }),
    { do: "feel", target: "pip", feeling: "joyful", at: 0.1 }, { do: "sound", sound: "giggle", at: 0.8 },
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.3 },
    pose("rest", 1.9, 0.4),
  ]),
]});

// "What's this?" freeze game: dance, freeze, an arrow shows a part, say its name. Rounds get faster.
const FREEZE = [["knees", 2.6], ["head", 2.2], ["toes", 1.9], ["shoulders", 1.6]];
const freezeBeats = [beat("z0", 2.6, [
  say("Freeze game! Dance, dance... then freeze!", { at: 0.1 }),
  { do: "camera", ...CAM, dur: 1 },
  { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
])];
FREEZE.forEach(([part, danceDur], k) => {
  const p = PARTS.find((x) => x.id === part);
  const sway = [];
  for (let t = 0.1, n = 0; t < danceDur - 0.3; t += 0.42, n++) sway.push(pose(n % 2 ? "rest" : "yay", t, 0.22), { do: "hop", target: "pip", at: t, height: 0.12, dur: 0.38 });
  freezeBeats.push(
    beat(`z${k + 1}a`, danceDur, [
      { do: "music", gain: 1, dur: 0.2 },
      k ? { do: "clip", target: "robo", clip: "Dance", at: 0.05 } : null,
      say(k ? "Dance!" : "Dance, dance, dance!", { at: 0.1, caption: false }),
      sway,
      { do: "camera", ...CAM, dur: 0.6 },
    ]),
    beat(`z${k + 1}b`, 1.8, [
      say("Freeze!", { at: 0.05 }),
      { do: "music", gain: 0.08, dur: 0.15 },
      { do: "sound", sound: "slide_whistle", at: 0.05, volume: 0.5 },
      { do: "clip", target: "robo", clip: "Idle", at: 0.05 },
      pose("rest", 0.05, 0.15),
      { do: "feel", target: "pip", feeling: "surprised", at: 0.1 },
      { do: "draw", target: `arrow_${part}`, at: 0.5, dur: 0.5, sound: "whoosh" },
      { do: "shot", target: ["pip", `arrow_${part}`], framing: "medium", yaw: p.yaw, pad: 0.15, dur: 0.9 },
    ]),
    beat(`z${k + 1}c`, 2.4, [
      say("What's this?", { at: 0.1 }),
      { do: "wiggle", target: `arrow_${part}`, at: 0.3, deg: 6, dur: 1 },
      { do: "sound", sound: "tick", at: 1.0, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.7, volume: 0.5 },
    ]),
    beat(`z${k + 1}d`, 2.6, [
      pipSay(`${part[0].toUpperCase()}${part.slice(1)}!`),
      pose(part, 0.1, 0.3),
      word(part, 0.15), { do: "sound", sound: "ding", at: 0.2 },
      { do: "feel", target: "pip", feeling: "joyful", at: 0.2 },
      say(`Yes! ${part === "head" ? "Your head" : `Your ${part}`}!`, { at: "after" }),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.7 },
      { do: "hide", target: `arrow_${part}`, at: 1.9, dur: 0.3 },
      unword(part, 2.1),
      pose("rest", 2.1, 0.35),
    ]),
  );
});
scenes.push({ id: "freeze", title: "What's this? Freeze!", beats: freezeBeats });

// Bonus round: eyes, ears, mouth and nose; the fifth slot fills; the sung line.
const bonusBeats = [beat("b0", 3.0, [
  say("Bonus round! Eyes, ears, mouth and nose!", { at: 0.1 }),
  { do: "music", gain: 1, dur: 0.3 },
  { do: "shot", target: ["robo", "pip"], framing: "medium", yaw: 4, dur: 1.2 },
  { do: "wiggle", target: "slot5", at: 0.3, deg: 12, dur: 1 }, { do: "wiggle", target: "qmark", at: 0.4, deg: 12, dur: 1 },
  { do: "sound", sound: "magic_sparkle", at: 0.3 },
  { do: "clip", target: "robo", clip: "Jump", at: 0.3 },
])];
FACE.forEach((f, k) => {
  bonusBeats.push(
    beat(`${f.id}_x1`, 2.4, [
      say(f.ask, { at: 0.1 }),
      k === 0 ? { do: "shot", target: "pip", framing: "medium", yaw: 5, dur: 1 } : null,
      pose(f.id, 0.7),
      word(f.id, 0.8), { do: "sound", sound: "pop", at: 0.8 },
    ]),
    beat(`${f.id}_x2`, 2.6, [
      pipSay(f.pip),
      f.id === "eyes" ? [pose("rest", 0.75, 0.25), { do: "sound", sound: "giggle", at: 0.8 }] : null,
      f.id === "nose" ? [{ do: "sound", sound: "squeak", at: 0.7, volume: 0.6 }, { do: "sound", sound: "squeak", at: 1.0, volume: 0.6 }] : null,
      { do: "feel", target: "pip", feeling: "joyful", at: 0.4 },
      say(f.praise, { at: "after" }),
      unword(f.id, 2.0),
      f.id !== "eyes" ? pose("rest", 2.0, 0.35) : null,
    ]),
  );
});
bonusBeats.push(
  beat("b9", 2.0, [
    { do: "hide", target: "qmark", at: 0.05, dur: 0.2 },
    fill(5, "mini_face"),
    say("Bonus star!", { at: 0.3 }),
    { do: "camera", ...CAM, dur: 1.2 },
    { do: "clip", target: "robo", clip: "Jump", at: 0.3 },
  ]),
  beat("b10", tuneDur(T.l3), sung(L.face, T.l3, [touchAlong(FACE_BEATS), { do: "shot", target: "pip", framing: "medium", yaw: -6, dur: 1.4 }])),
  beat("b11", 1.4, [pose("rest", 0.1, 0.35), { do: "camera", ...CAM, dur: 1 }]),
);
scenes.push({ id: "bonus", title: "Bonus: eyes, ears, mouth and nose", music: false, beats: bonusBeats });

// Recap quiz: two picture cards, point to the right one before 3-2-1 ends.
const QUIZ = [
  { pre: "qa", q: "Which one is toes? Point to it!", cards: ["qa_toes", "qa_head"], right: "qa_toes", part: "toes" },
  { pre: "qb", q: "Where are the shoulders? Point to it!", cards: ["qb_knees", "qb_shoulders"], right: "qb_shoulders", part: "shoulders" },
];
const quizBeats = [beat("q0", 2.4, [
  say("You lit up every star! Now a quick game.", { at: 0.1 }),
  { do: "camera", ...CAM, dur: 1 },
  { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
  ...[1, 2, 3, 4, 5].map((n, k) => ({ do: "wiggle", target: `slot${n}`, at: 0.3 + k * 0.2, deg: 10, dur: 0.5 })),
])];
for (const z of QUIZ) {
  const [l, r] = z.cards;
  quizBeats.push(
    beat(`${z.pre}a`, 2.8, [
      { do: "clip", target: "robo", clip: "Idle", at: 0.05 },
      { do: "pop", target: l, at: 0.1, dur: 0.4, sound: "pop" }, { do: "pop", target: r, at: 0.3, dur: 0.4, sound: "pop" },
      { do: "shot", target: [l, r], framing: "wide", dur: 1 },
      say(z.q, { at: 0.5 }),
    ]),
    beat(`${z.pre}b`, 2.8, [countdown(0.1), { do: "wiggle", target: l, at: 0.2, deg: 8, dur: 0.6 }, { do: "wiggle", target: r, at: 0.95, deg: 8, dur: 0.6 }, { do: "wiggle", target: l, at: 1.7, deg: 8, dur: 0.6 }]),
    beat(`${z.pre}c`, 3.0, [
      { do: "mark", target: z.right, result: "correct", at: 0.1, dur: 2.2 },
      { do: "wiggle", target: z.right, at: 0.3, deg: 12, dur: 1 },
      say(`Yes! The ${z.part}!`, { at: 0.4 }),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.6 },
    ]),
    beat(`${z.pre}d`, 2.4, [
      { do: "hide", target: l, at: 0.05, dur: 0.3 }, { do: "hide", target: r, at: 0.05, dur: 0.3 },
      { do: "camera", ...CAM, dur: 0.8 },
      pose(z.part, 0.5),
      pipSay(`My ${z.part}!`, 0.6),
      pose("rest", 1.9, 0.35),
    ]),
  );
}
scenes.push({ id: "quiz", title: "Point to it!", beats: quizBeats });

// Last song with everyone, then bye-bye.
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("e0", 2.4, [
    say("One more time! Everybody sing!", { at: 0.1 }),
    { do: "camera", ...WIDE, dur: 2 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
  ]),
  beat("e1", tuneDur(T.l1), sung(L.hskt, T.l1, [touchAlong(HSKT_BEATS), { do: "shot", target: ["robo", "pip"], framing: "wide", yaw: 10, dur: 2 }])),
  beat("e2", tuneDur(T.l2), sung(L.hskt, T.l2, [touchAlong(HSKT_BEATS), { do: "orbit", around: [0, 0.8, 0.6], degrees: -20, dur: 4 }])),
  beat("e3", tuneDur(T.l3), sung(L.face, T.l3, [pose("rest", 0.1, 0.2), touchAlong(FACE_BEATS), { do: "shot", target: "pip", framing: "medium", yaw: 12, dur: 1.2 }])),
  beat("e4", tuneDur(T.l4), sung(L.end, T.l4, [touchAlong(HSKT_BEATS), { do: "camera", ...CAM, dur: 1.4 }, { do: "burst", target: "confetti", at: onBeat(9), dur: 2.4 }])),
  beat("e5", 2.8, [
    pose("yay", 0.1, 0.3),
    say("You did it! Head, shoulders, knees and toes!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Jump", at: 0.2 },
    { do: "feel", target: "pip", feeling: "joyful", at: 0.1 },
    { do: "hop", target: "pip", at: 0.4, height: 0.3 },
    ...[1, 2, 3, 4, 5].map((n, k) => ({ do: "wiggle", target: `star${n}`, at: 0.3 + k * 0.3, deg: 14, dur: 0.6 })),
    { do: "sound", sound: "crowd_cheer", at: 0.3, volume: 0.4 },
  ]),
  beat("e6", 3.4, [
    pose("wave", 0.1, 0.35),
    { do: "wiggle", target: "pip#fore_l", at: 0.5, deg: 25, dur: 2.2 },
    say("Bye-bye! See you next time!", { at: 0.2 }),
    pipSay("Bye-bye!", 1.6),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.6 },
    { do: "camera", ...WIDE, dur: 3.2 },
  ]),
]});

const description = "Sing Head, Shoulders, Knees and Toes with Robo and Pip, and learn your body parts! Pip touches each part while Robo asks \"Where is your head?\", then it is your turn to touch it too and light up a star. Sing the song together, then sing it again faster, play the \"What's this?\" freeze game, and touch your eyes, ears, mouth and nose in the bonus round, then a quick point-to-it quiz.";
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Head, Shoulders, Knees and Toes", episode: "br04", seed: 304, skills: ["five_senses_prek", "listening_prek"], cast,
    youtube: {
      title: "Head, Shoulders, Knees and Toes 👣 Body Parts Song for Toddlers | Toy Box Friends",
      description: `${description}\n\nBody parts: head, shoulders, knees, toes, then eyes, ears, mouth and nose.\n\nSing at home: touch each part as you sing it, go faster each time, and play freeze: stop, point to a part and ask "What's this?". Head, Shoulders, Knees and Toes is a traditional public-domain rhyme, sung to a traditional public-domain tune.\n\n${YT_TAIL}`,
      tags: ["head shoulders knees and toes", "body parts song", "nursery rhymes", "toddler learning", "baby songs", "sing along for kids", "kids songs", "action songs for kids", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "touch", title: "HEAD SHOULDERS", subtitle: "Knees and toes sing-along!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.1, 1.05, 5.2], lookAt: [1.35, 0.85, 0], fov: 36 },
        objects: [
          { id: "pip", kind: "critter", species: "toddler_hands_on_head", at: [2.35, 0, 0.6], rotation: [0, -12, 0], size: 1.25, feeling: "joyful" },
          { id: "robo", kind: "character", character: "robot", at: [3.75, 0, -0.6], rotation: [0, -35, 0], clip: "Wave", feeling: "happy" },
          { id: "toes", kind: "prop", model: "icon_toes", at: [3.15, 1.95, 0.2], size: 0.45, rotation: [0, -10, 0] },
        ] },
      { name: "whats_this", title: "WHAT'S THIS?", subtitle: "Touch your head and toes!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.6, 0.95, 5.0], lookAt: [1.9, 0.72, 0], fov: 36 },
        objects: [
          { id: "pip", kind: "critter", species: "toddler", at: [2.2, 0, 0.5], rotation: [0, -15, 0], size: 1.3, feeling: "surprised" },
          { id: "arrow", kind: "pointer", from: [3.3, 0.8, 0.9], to: [2.42, 0.3, 0.6], color: "orange", width: 0.09, bend: 0.1 },
          { id: "bubble", kind: "prop", model: "word_bubble", at: [3.25, 1.5, 0.1], size: 0.7 },
          { id: "q", kind: "letter", text: "?", color: "orange", parent: "bubble", at: [0, -0.15, 0.12], size: 0.42 },
        ] },
    ],
  }),
  stage: { preset: "playroom" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "head_shoulders_knees_toes");
