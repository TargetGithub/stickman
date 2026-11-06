// Builds ../br08_humpty_dumpty.json: Humpty Dumpty: Fix It Together. The first verse is the traditional rhyme
// (public domain; its last line gently changed so Humpty is never broken), then original verses: Humpty slides off
// the wall onto a soft pile of pillows (not hurt, he giggles), and the friends build him a staircase from four
// wooden puzzle steps. Each step has a shape hole (rectangle, square, triangle, circle): "Which shape fits?",
// 3-2-1, it clicks in, a verse about that shape, your turn, and a puzzle piece fills the tracker. Then Humpty
// climbs back up (cause and effect: steps take you up), a point-to-it quiz and the last chorus.
// Run: node br08.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  art, say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, showTracker, fillSlot, yourTurn, quizRound, writeRhyme, rhymeMeta, YT_TAIL, BEAT, tuneBeats,
} from "./kit.mjs";
import { readFileSync, existsSync } from "node:fs";

// Measured sung lines (when present): fitSung scales action start times in a sung beat by k but not their
// durations, so motion that must land on a later action (the fall onto the pillows) uses 1/k gaps.
const DURS_FILE = new URL("./durs/br08.json", import.meta.url);
const DURS = existsSync(DURS_FILE) ? JSON.parse(readFileSync(DURS_FILE, "utf8")) : {};
const kOf = (text, tune) => Math.min(1, (DURS[text] ?? Infinity) / (tuneBeats(tune) * BEAT));

// Humpty Dumpty (traditional tune, J. W. Elliott 1870, public domain), key of C, one note per syllable.
const T = {
  l1: "E4 G4:0.5 F4 A4:0.5 G4:0.5 A4:0.5 B4:0.5 C5:1.5", // Hump-ty Dump-ty sat on a wall, (8)
  l2: "C5 A4:0.5 B4 G4:0.5 A4:0.5 F4:0.5 D4:0.5 C4:1.5", // Hump-ty Dump-ty had a great fall. (8)
  l3: "E4:0.5 E4:0.5 E4:0.5 G4 E4:0.5 F4:0.5 F4:0.5 F4:0.5 F4:0.5 A4:1", // All the king's hor-ses and all the king's men (10)
  l4: "G4 G4:0.5 G4 A4:0.5 G4:0.5 F4:0.5 E4:0.5 D4:0.5 E4:0.5 C4:1.5", // Could-n't get Hump-ty back up there a-gain. (10)
};

// ---- Layout -----------------------------------------------------------------------------------------------------

const CAM = { position: [0.9, 2.0, 8.0], lookAt: [0.9, 1.15, -0.4], fov: 40 };
const WALL_CAM = { position: [-0.4, 1.95, 3.7], lookAt: [-0.85, 1.6, -0.7], fov: 40 };
const PILE_CAM = { position: [1.6, 1.4, 3.9], lookAt: [-0.8, 0.8, -0.1], fov: 30 };
const STAIR_CAM = { position: [1.3, 1.6, 5.4], lookAt: [0.9, 0.8, -0.8], fov: 40 };
const WALL = [-0.9, 0, -0.9]; // 2 m wide: x -1.9..0.1, top 1.4, front z -0.65
const HS = 1.15; // Humpty's size
const SIT = [-0.9, 1.4 - 0.25 * HS, -0.67]; // sitting on the wall top, legs over the front
const PILLOW_SEAT = [-0.9, 0.56 - 0.25 * HS, 0.4]; // sitting on the pillow pile
const GROUND = [2.45, 0, -0.45]; // standing at the foot of the stairs
const X0 = 0.14; // the stairs start at the wall's right end (clear of the cap stone)
const SZ = -0.9; // stairs' z (middle)
const H = 0.35; // step height

// The four steps, bottom to top. size: the flat piece that fits the hole; h: its height (with bevel) at size 1.
const S = [
  { shape: "rectangle", L: 1.65, size: 0.2, h: 0.92, color: "orange", friend: "horse", miniSize: 0.36, wrong: "circle", wrongColor: "red" },
  { shape: "square", L: 1.25, size: 0.24, h: 1.06, color: "blue", friend: "bunny", miniSize: 0.42, wrong: "triangle", wrongColor: "green" },
  { shape: "triangle", L: 0.85, size: 0.24, h: 1.11, color: "green", friend: "duck", miniSize: 0.42, wrong: "square", wrongColor: "blue" },
  { shape: "circle", L: 0.45, size: 0.24, h: 1.16, color: "red", friend: "bear", miniSize: 0.4, wrong: "rectangle", wrongColor: "orange" },
];
S.forEach((s, i) => {
  s.cx = X0 + s.L / 2;
  s.y = i * H;
  s.sock = [Math.round((s.cx + s.L / 2 - 0.2) * 1000) / 1000, Math.round((s.y + 0.175 - (s.h * s.size) / 2) * 1000) / 1000, -0.55];
  s.tread = [Math.round((X0 + (s.L + (S[i + 1]?.L ?? 0)) / 2) * 1000) / 1000, (i + 1) * H, SZ + 0.05];
});

// The friends: the king's horse (with a crown) and three more who bring a step each.
const F = {
  horse: { species: "horse", size: 0.75, park: [3.0, 0, 0.8], sound: "Neigh!", voice: { voice: "deep", pitch: 1.0, speed: 1 } },
  bunny: { species: "bunny", size: 0.85, park: [3.85, 0, 0.45], sound: "Hop, hop!", voice: { voice: "squeaky", pitch: 1.2, speed: 1.05 } },
  duck: { species: "duck", size: 0.8, park: [4.6, 0, 0.1], sound: "Quack!", voice: { voice: "squeaky", pitch: 1.05, speed: 1.05 } },
  bear: { species: "bear", size: 0.85, park: [5.3, 0, -0.25], sound: "Hello!", voice: { voice: "deep", pitch: 0.95, speed: 0.95 } },
};
const FIDS = Object.keys(F);
const cast = { humpty: { voice: "soft", pitch: 1.25, speed: 1 }, ...Object.fromEntries(FIDS.map((id) => [id, F[id].voice])) };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ---- Objects ----------------------------------------------------------------------------------------------------

const objects = [
  { id: "robo", kind: "character", character: "robot", at: [-3.5, 0, 0.75], rotation: [0, 30, 0], feeling: "happy" },
  { id: "wall", kind: "prop", model: "brick_wall", at: WALL },
  { id: "humpty", kind: "critter", species: "humpty", size: HS, at: SIT, feeling: "happy" },
  { id: "pil1", kind: "prop", model: "pillow", color: "pink", at: [-1.25, 0, 0.42], rotation: [0, 12, 0] },
  { id: "pil2", kind: "prop", model: "pillow", color: "yellow", at: [-0.55, 0, 0.5], rotation: [0, -18, 0] },
  { id: "pil3", kind: "prop", model: "pillow", color: "sky", at: [-0.9, 0, 0.05], rotation: [0, 5, 0] },
  { id: "pil4", kind: "prop", model: "pillow", color: "mint", at: [-0.9, 0.26, 0.35], rotation: [0, 28, 0] },
  { id: "toybox", kind: "prop", model: "toy_box", at: [-5.0, 0, -1.7], rotation: [0, 25, 0], size: 0.9 },
  { id: "plant", kind: "prop", model: "plant", at: [6.6, 0, -2.4], size: 1.2 },
];
S.forEach((s, i) => {
  objects.push({ id: `step${i + 1}`, kind: "prop", model: `step_${s.shape}`, at: [s.cx, s.y, SZ], hidden: true });
  objects.push({ id: `p_${s.shape}`, kind: "shape", shape: s.shape, color: s.color, size: s.size, at: s.sock, hidden: true });
  objects.push({ id: `x_${s.shape}`, kind: "shape", shape: s.wrong, color: s.wrongColor, size: s.size, at: s.sock, hidden: true });
});
for (const id of FIDS) objects.push({ id, kind: "critter", species: F[id].species, size: F[id].size, at: [8.6, 0, F[id].park[2]], rotation: [0, -90, 0], hidden: true });
objects.push({ id: "crown", kind: "prop", model: "crown", parent: "horse", part: "head", at: [0, 0.27, -0.02], size: 0.85, hidden: true });
// Counting pieces (big, with faces) and the quiz pieces.
const COUNT_AT = (k) => [-1.5 + k * 1.0, 0, 1.5];
S.forEach((s, k) => objects.push({ id: `c_${s.shape}`, kind: "shape", shape: s.shape, color: s.color, size: s.shape === "rectangle" ? 0.62 : 0.75, face: true, at: COUNT_AT(k), hidden: true }));
objects.push({ id: "confetti", kind: "confetti", at: [0, 3.2, 0.5] });
// HUD: four puzzle-piece slots (each fills with its shape), "?" on the last, countdown, words.
objects.push(...trackerObjects(4, { colors: S.map((s) => s.color) }));
S.forEach((s, i) => objects.push({ id: `mini${i + 1}`, kind: "shape", shape: s.shape, color: s.color, hud: true, parent: `slot${i + 1}`, at: [0, -Math.round(s.h * s.miniSize * 50) / 100, 0.2], size: s.miniSize, hidden: true }));
objects.push({ id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot4", at: [0, -0.26, 0.2], size: 0.42, hidden: true });
objects.push(...countdownObjects());
objects.push(...bubbleObjects([...S.map((s) => ({ id: s.shape, text: s.shape.toUpperCase(), color: s.color })), { id: "up", text: "UP!", color: "green" }]));

// ---- Motion helpers ---------------------------------------------------------------------------------------------

const legs = (deg, at, dur = 0.3) => ({ do: "turn", target: "humpty#leg", to: [deg, 0, 0], at, dur });
/** Humpty climbs the stairs from GROUND to the wall top and sits, from t0 (about 4.2 s), counting the steps. */
function climb(t0, count = true) {
  const acts = [legs(0, t0, 0.2), { do: "turn", target: "humpty", to: [0, -90, 0], at: t0, dur: 0.3 }];
  let from = GROUND;
  S.forEach((s, i) => {
    const t = t0 + 0.35 + i * 0.75;
    acts.push({ do: "path", target: "humpty", points: [from, [(from[0] + s.tread[0]) / 2, s.tread[1] + 0.3, (from[2] + s.tread[2]) / 2], s.tread], at: t, dur: 0.5 });
    acts.push({ do: "sound", sound: "boing", at: t, volume: 0.45 });
    acts.push({ do: "wiggle", target: `step${i + 1}`, at: t + 0.48, deg: 3, dur: 0.3 });
    if (count) acts.push({ do: "caption", text: String(i + 1), style: "count", at: t + 0.4, dur: 0.6 }, say(`${["One", "Two", "Three", "Four"][i]}!`, { at: t + 0.35, caption: false }));
    from = s.tread;
  });
  const top = [-0.45, 1.4, SZ + 0.1];
  const t = t0 + 0.35 + 4 * 0.75;
  acts.push(
    { do: "path", target: "humpty", points: [from, [-0.05, 1.75, SZ + 0.1], top], at: t, dur: 0.5 },
    { do: "turn", target: "humpty", to: [0, 0, 0], at: t + 0.5, dur: 0.3 },
    { do: "move", target: "humpty", to: SIT, at: t + 0.85, dur: 0.35, ease: "sineInOut" },
    legs(-30, t + 0.85),
    { do: "sound", sound: "magic_sparkle", at: t + 0.9, volume: 0.6 },
  );
  return { acts, dur: t + 1.3 - t0 };
}

// ---- Scenes -----------------------------------------------------------------------------------------------------

const scenes = [];

// 0:00 The hook: Humpty wobbles on the wall. Will he fall?
scenes.push({ id: "hello", title: "Will Humpty fall?", beats: [
  beat("h1", 3.0, [
    { do: "camera", ...WALL_CAM, dur: 0 },
    legs(-30, 0, 0.01),
    { do: "feel", target: "humpty", feeling: "surprised", at: 0.2 },
    ...[0.1, 0.75, 1.4, 2.05].map((t, k) => ({ do: "wiggle", target: "humpty", at: t, deg: 9 + k * 2, dur: 0.6 })),
    { do: "sound", sound: "boing", at: 0.15, volume: 0.4 },
    say("Uh-oh! Humpty is wobbling! Will he fall?", { at: 0.3 }),
  ]),
  beat("h2", 2.4, [
    { do: "say", who: "humpty", text: "Whoa, whoa! Hee hee!", at: 0.1 },
    { do: "wiggle", target: "humpty#arm", at: 0.1, deg: 30, dur: 1.4 },
    { do: "feel", target: "humpty", feeling: "joyful", at: 1.0 },
  ]),
  beat("h3", 2.8, [
    { do: "camera", ...CAM, dur: 1.4 },
    say("Let's sing! Four puzzle pieces will help Humpty!", { at: 0.1 }),
    showTracker(4, 0.4),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
  beat("h4", 2.4, [
    say("The last piece is a surprise!", { at: 0.1 }),
    { do: "pop", target: "qmark", at: 0.3, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot4", at: 0.6, deg: 12, dur: 1 },
    { do: "feel", target: "humpty", feeling: "happy", at: 0.2 },
  ]),
]});

// Verse 1 (traditional; the last line gently changed): the wobble, "What happens next?", the soft landing.
const FALL_T = onBeat(2.5);
const FALL_K = kOf("Humpty Dumpty had a great fall.", T.l2);
const LAND_T = FALL_T + 0.9 / FALL_K; // after fitting: the landing lands as the 0.9 s path ends
const arrive = (id, t) => [
  { do: "show", target: id, at: t, dur: 0.01 },
  id === "horse" ? { do: "show", target: "crown", at: t, dur: 0.01 } : null,
  { do: "path", target: id, points: [[8.6, 0, F[id].park[2]], F[id].park], at: t, dur: 1.4, face: true },
  { do: "turn", target: id, to: [0, -25, 0], at: t + 1.45, dur: 0.3 },
];
scenes.push({ id: "verse1", title: "Sing: Humpty Dumpty", music: false, beats: [
  beat("v1", tuneDur(T.l1), sung("Humpty Dumpty sat on a wall,", T.l1, [
    { do: "camera", position: [-1.6, 1.9, 4.2], lookAt: [-0.8, 1.45, -0.7], fov: 40, dur: 1.6 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    ...[0, 1.5, 3].map((k) => ({ do: "wiggle", target: "humpty", at: onBeat(k), deg: 7, dur: 0.7 })),
    { do: "wiggle", target: "humpty#leg", at: onBeat(0.5), deg: 18, dur: 2 },
  ])),
  beat("v_next1", 2.6, [
    { do: "camera", ...WALL_CAM, dur: 0.8 },
    { do: "feel", target: "humpty", feeling: "surprised", at: 0.1 },
    ...[0.1, 0.7, 1.3, 1.9].map((t, k) => ({ do: "wiggle", target: "humpty", at: t, deg: 12 + k * 2, dur: 0.55 })),
    say("Wobble, wobble! What happens next?", { at: 0.15 }),
  ]),
  beat("v_next2", 1.8, [
    { do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 },
    { do: "wiggle", target: "humpty", at: 0.2, deg: 16, dur: 1.4 },
  ]),
  beat("v2", tuneDur(T.l2), sung("Humpty Dumpty had a great fall.", T.l2, [
    { do: "camera", ...PILE_CAM, dur: 1.4 },
    { do: "wiggle", target: "humpty", at: onBeat(0.5), deg: 18, dur: 0.6 },
    { do: "sound", sound: "slide_whistle", at: FALL_T, volume: 0.45 },
    { do: "path", target: "humpty", points: [SIT, [-0.9, 1.75, -0.3], [-0.9, 1.0, 0.25], PILLOW_SEAT], at: FALL_T, dur: 0.9 },
    { do: "spin", target: "humpty", axis: "x", turns: 1, at: FALL_T, dur: 0.85 },
    legs(-70, LAND_T - 0.1 / FALL_K, 0.2),
    { do: "sound", sound: "boing", at: LAND_T },
    ...["pil1", "pil2", "pil3", "pil4"].map((p, k) => ({ do: "wiggle", target: p, at: LAND_T + k * 0.05, deg: 6, dur: 0.5 })),
    { do: "look", target: "robo", at: 0.4, to: "pil4" },
  ])),
  beat("v_soft", 3.4, [
    { do: "hop", target: "humpty", at: 0.1, height: 0.25, dur: 0.4, sound: "boing" },
    { do: "hop", target: "humpty", at: 0.55, height: 0.12, dur: 0.3 },
    { do: "feel", target: "humpty", feeling: "joyful", at: 0.1 },
    { do: "say", who: "humpty", text: "Boing! Hee hee! Soft pillows!", at: 0.2 },
    say("Soft pillows! Humpty is okay!", { at: "after" }),
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 1.6 },
  ]),
  beat("v3", tuneDur(T.l3), sung("All the king's horses and all the king's men", T.l3, [
    { do: "camera", ...CAM, dur: 1.2 },
    { do: "look", target: "robo", at: 0.2, to: "ahead" },
    ...FIDS.map((id, k) => arrive(id, 0.15 + k * 0.35)),
    { do: "sound", sound: "footstep_soft", at: 0.4, volume: 0.5 },
  ])),
  beat("v4", tuneDur(T.l4), sung("Couldn't get Humpty back up there again.", T.l4, [
    ...FIDS.map((id, k) => ({ do: "hop", target: id, at: onBeat(0.5 + k * 0.6), height: 0.35, dur: 0.4 })),
    { do: "look", target: "humpty", at: 0.2, to: [-0.9, 1.5, -0.9] },
    { do: "feel", target: "humpty", feeling: "worried", at: onBeat(2) },
    { do: "clip", target: "robo", clip: "No", at: onBeat(3) },
  ])),
]});

// The plan: build steps! Count the puzzle pieces.
scenes.push({ id: "plan", title: "Let's build steps!", beats: [
  beat("p1", 2.8, [
    { do: "look", target: "humpty", at: 0.1, to: "ahead" },
    say("How can Humpty get back up? I know!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Yes", at: 0.3 },
  ]),
  beat("p2", 2.8, [
    say("We can build steps! Steps go up, up, up!", { at: 0.1 }),
    word("up", 0.3),
    { do: "feel", target: "humpty", feeling: "happy", at: 0.4 },
    { do: "clip", target: "robo", clip: "Jump", at: 0.6 },
  ]),
  beat("p3", 2.6, [
    unword("up", 0),
    { do: "shot", target: S.map((s) => `c_${s.shape}`), framing: "wide", dur: 1.0 },
    say("Count the puzzle pieces with me!", { at: 0.1 }),
  ]),
  beat("p4", 3.8, [
    ...S.map((s, k) => [
      { do: "pop", target: `c_${s.shape}`, at: 0.2 + k * 0.85, dur: 0.4, sound: "pop" },
      { do: "caption", text: String(k + 1), style: "count", at: 0.2 + k * 0.85, dur: 0.75 },
      say(`${["One", "Two", "Three", "Four"][k]}!`, { at: 0.25 + k * 0.85, caption: false }),
    ]),
  ]),
  beat("p5", 2.8, [
    say("Four pieces! Let's fit them in!", { at: 0.1 }),
    ...S.map((s, k) => ({ do: "hop", target: `c_${s.shape}`, at: 0.3 + k * 0.2, height: 0.3, dur: 0.4 })),
    ...S.map((s, k) => ({ do: "feel", target: `c_${s.shape}`, feeling: "joyful", at: 0.3 + k * 0.2 })),
    ...S.map((s, k) => ({ do: "hide", target: `c_${s.shape}`, at: 2.2 + k * 0.08, dur: 0.3 })),
  ]),
]});

// One step per verse: the friend brings the block, which shape fits?, the verse, your turn, a piece fills.
const VERSE = {
  rectangle: ["Here's a rectangle, long and flat,", "Put it down by the wall, like that."],
  square: ["Here is a square with four straight sides,", "Stack it on top, it fits just right."],
  triangle: ["Here's a triangle, one, two, three,", "Three pointy corners, can you see?"],
  circle: ["Here is a circle, round and round,", "Click, it fits with a happy sound."],
};
const TURN = {
  rectangle: { ask: "Your turn! Say rectangle!", answer: "Rectangle!", praise: "Yes! Long and flat!" },
  square: { ask: "Count the sides! Hold up your fingers!", answer: "One, two, three, four!", praise: "Four sides! A square!" },
  triangle: { ask: "Make a triangle with your hands!", answer: "Three corners! Pointy!", praise: "Great triangle!" },
  circle: { ask: "Draw a circle in the air! Round and round!", answer: "Round and round!", praise: "Yes! A circle!" },
};
const CLUE = {
  rectangle: "Two long sides, two short sides.",
  square: "Four sides, all the same.",
  triangle: "Three sides, three corners.",
  circle: "Round, with no corners.",
};

S.forEach((s, i) => {
  const n = i + 1;
  const f = F[s.friend];
  const step = `step${n}`;
  const right = `p_${s.shape}`;
  const wrong = `x_${s.shape}`;
  // Two pieces on the floor to the right of the hole (never in front of it), the right one on alternating sides.
  const lx = s.sock[0] + 0.6;
  const rx = s.sock[0] + 1.25;
  const [rightAt, wrongAt] = i % 2 ? [[lx, 0, 0.1], [rx, 0, 0.1]] : [[rx, 0, 0.1], [lx, 0, 0.1]];
  const leftId = i % 2 ? right : wrong;
  const yaw = [-10, 12, -14, 10][i];
  scenes.push({ id: `${s.shape}_fit`, title: `Which shape fits? ${cap(s.shape)}`, beats: [
    beat(`${s.shape}_f1`, 2.8, [
      { do: "camera", ...STAIR_CAM, dur: 1.0 },
      { do: "say", who: s.friend, text: f.sound, at: 0.1 },
      { do: "hop", target: s.friend, at: 0.15, height: 0.3, dur: 0.4 },
      { do: "drop", target: step, to: [s.cx, s.y, SZ], at: 0.5, height: 3, dur: 0.8 },
      say(i === 0 ? `The ${s.friend} brings a block! A step!` : `The ${s.friend} brings ${i === 3 ? "the last" : "another"} block!`, { at: "after" }),
      { do: "look", target: "robo", at: 0.4, to: step },
    ]),
    beat(`${s.shape}_f2`, 2.8, [
      { do: "pop", target: right, at: 0.1, dur: 0.35, sound: false },
      { do: "pop", target: wrong, at: 0.1, dur: 0.35, sound: "pop" },
      { do: "move", target: right, to: rightAt, at: 0.02, dur: 0.01 },
      { do: "move", target: wrong, to: wrongAt, at: 0.02, dur: 0.01 },
      { do: "grow", target: right, to: 1.8, at: 0.45, dur: 0.3 },
      { do: "grow", target: wrong, to: 1.8, at: 0.45, dur: 0.3 },
      { do: "shot", target: [step, right, wrong], framing: "medium", yaw, dur: 0.9 },
      say(`Look, a hole! Which shape fits?`, { at: 0.2 }),
      { do: "highlight", target: step, at: 0.9, dur: 1.4 },
    ]),
    beat(`${s.shape}_f3`, 2.8, [
      ...countdown(0.1),
      { do: "wiggle", target: leftId, at: 0.2, deg: 8, dur: 0.6 },
      { do: "wiggle", target: leftId === right ? wrong : right, at: 0.95, deg: 8, dur: 0.6 },
      { do: "wiggle", target: leftId, at: 1.7, deg: 8, dur: 0.6 },
    ]),
    beat(`${s.shape}_f4`, 3.2, [
      { do: "mark", target: right, result: "correct", at: 0.1, dur: 1.2 },
      say(`The ${s.shape}! ${CLUE[s.shape]}`, { at: 0.2 }),
      { do: "hide", target: wrong, at: 0.5, dur: 0.3 },
      { do: "path", target: right, points: [rightAt, [(rightAt[0] + s.sock[0]) / 2, s.sock[1] + 0.5, -0.2], s.sock], at: 1.2, dur: 0.6 },
      { do: "grow", target: right, to: 1, at: 1.2, dur: 0.5 },
      { do: "sound", sound: "windup_click", at: 1.85 },
      { do: "wiggle", target: step, at: 1.85, deg: 3, dur: 0.4 },
      word(s.shape, 1.9),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 1.9 },
    ]),
  ]});

  // The verse (original), on the traditional tune.
  const [a, b] = VERSE[s.shape];
  const last = i === 3;
  scenes.push({ id: `${s.shape}_song`, title: `Sing: the ${s.shape} step`, music: false, beats: [
    beat(`${s.shape}_s1`, tuneDur(T.l1), sung(a, T.l1, [
      { do: "camera", position: [s.sock[0] - 0.4, s.sock[1] + 0.6, 2.4], lookAt: [s.sock[0] + 0.1, s.sock[1] + 0.1, -0.6], fov: 40, dur: 1.0 },
      { do: "wiggle", target: right, at: onBeat(1), deg: 12, dur: 0.8 },
      { do: "highlight", target: right, at: onBeat(2), dur: 1.6 },
    ])),
    beat(`${s.shape}_s2`, tuneDur(T.l2), sung(b, T.l2, [
      unword(s.shape, 0.1),
      { do: "camera", ...STAIR_CAM, dur: 1.0 },
      { do: "wiggle", target: step, at: onBeat(1.5), deg: 3, dur: 0.6 },
      { do: "hop", target: s.friend, at: onBeat(2), height: 0.3, dur: 0.4 },
    ])),
    beat(`${s.shape}_s3`, tuneDur(T.l3), sung(last ? "Step by step, we built it together," : "Step by step, we can build it together,", T.l3, [
      { do: "camera", ...CAM, dur: 1.0 },
      { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
      ...FIDS.map((id, k) => ({ do: "hop", target: id, at: onBeat(0.5 + k * 0.8), height: 0.3, dur: 0.4 })),
    ])),
    beat(`${s.shape}_s4`, tuneDur(T.l4), sung(last ? "Now Humpty Dumpty can climb up again." : "Then Humpty Dumpty can climb up again.", T.l4, [
      { do: "hop", target: "humpty", at: onBeat(0.5), height: 0.2, dur: 0.4 },
      { do: "hop", target: "humpty", at: onBeat(2.5), height: 0.2, dur: 0.4 },
      { do: "feel", target: "humpty", feeling: "joyful", at: 0.2 },
      { do: "wiggle", target: "humpty#arm", at: onBeat(1), deg: 30, dur: 1.5 },
    ])),
  ]});

  // Your turn, then the piece fills the tracker.
  const t = TURN[s.shape];
  scenes.push({ id: `${s.shape}_turn`, title: "Your turn!", beats: yourTurn({
    id: s.shape, ask: t.ask, answer: t.answer, praise: t.praise, wordId: s.shape, slot: n, mini: `mini${n}`, look: s.friend,
    extra: [last ? { do: "hide", target: "qmark", at: 0.05, dur: 0.2 } : null, { do: "feel", target: "humpty", feeling: "happy", at: 0.2 }].filter(Boolean),
  }) });
});

// Humpty climbs back up: what happens next? Count the steps.
const up = climb(0.3);
scenes.push({ id: "climb", title: "Up, up, up!", beats: [
  beat("k1", 2.8, [
    { do: "camera", ...CAM, dur: 1.0 },
    say("Four steps! What happens next?", { at: 0.1 }),
    { do: "path", target: "humpty", points: [PILLOW_SEAT, [0.2, 0.5, 0.6], [1.5, 0.2, 0.2], GROUND], at: 0.3, dur: 1.6, face: true },
    legs(0, 0.3, 0.25),
    { do: "sound", sound: "boing", at: 0.3, volume: 0.5 },
  ]),
  beat("k2", 1.8, [
    { do: "turn", target: "humpty", to: [0, -30, 0], at: 0.1, dur: 0.3 },
    { do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 },
    { do: "wiggle", target: "humpty", at: 0.3, deg: 8, dur: 1.2 },
  ]),
  beat("k3", up.dur + 2.3, [
    { do: "camera", position: [0.9, 1.9, 6.4], lookAt: [0.5, 1.0, -0.8], fov: 40, dur: 1.2 },
    say("Humpty climbs up! Count the steps!", { at: 0.0, caption: true }),
    ...up.acts.map((x) => ({ ...x, at: x.at + 2.0 })),
    { do: "look", target: "robo", at: 0.4, to: "step4" },
  ]),
  beat("k4", 3.0, [
    { do: "burst", target: "confetti", at: 0.1, dur: 2.4 },
    { do: "feel", target: "humpty", feeling: "joyful", at: 0.1 },
    { do: "say", who: "humpty", text: "I'm up! Thank you, friends!", at: 0.2 },
    { do: "wiggle", target: "humpty#arm", at: 0.2, deg: 35, dur: 1.6 },
    ...FIDS.map((id, k) => ({ do: "hop", target: id, at: 0.4 + k * 0.15, height: 0.35, dur: 0.4 })),
    { do: "clip", target: "robo", clip: "Jump", at: 0.3 },
  ]),
  beat("k5", 2.6, [
    say("Steps help us go up! Hooray!", { at: 0.1 }),
    { do: "look", target: "robo", at: 0.1, to: "ahead" },
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.4 },
  ]),
]});

// Recap quiz: point to it (big friendly shapes on the floor in front).
const QSPOTS = [[-1.1, 0, 1.6], [1.1, 0, 1.6]];
const qbeat = (id, l, r) => beat(id, 0.6, [
  { do: "move", target: l, to: QSPOTS[0], at: 0, dur: 0.01 }, { do: "move", target: r, to: QSPOTS[1], at: 0, dur: 0.01 },
  { do: "pop", target: l, at: 0.05, dur: 0.35, sound: "pop" }, { do: "pop", target: r, at: 0.15, dur: 0.35, sound: false },
]);
const qhide = (id, l, r) => beat(id, 0.5, [{ do: "hide", target: l, at: 0, dur: 0.3 }, { do: "hide", target: r, at: 0.05, dur: 0.3 }]);
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 2.2, [say("Now a quick game!", { at: 0.1 }), { do: "camera", ...CAM, dur: 1.0 }, { do: "clip", target: "robo", clip: "Dance", at: 0.2 }]),
  qbeat("q1p", "c_square", "c_triangle"),
  ...quizRound({ id: "q1", q: "Which one is the triangle? Point to it!", left: "c_square", right: "c_triangle", answer: "c_triangle", spots: QSPOTS, yes: "Yes! The triangle! Three corners!" }),
  qhide("q1h", "c_square", "c_triangle"),
]});

// Last chorus (original words on the traditional tune), then bye-bye.
const all = ["humpty", ...FIDS];
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("z0", 1.8, [say("Everybody sing!", { at: 0.1 }), { do: "clip", target: "robo", clip: "Dance", at: 0.1 }, { do: "camera", position: [0.6, 2.4, 10.8], lookAt: [0.8, 1.3, -0.6], fov: 40, dur: 1.6 }]),
  beat("z1", tuneDur(T.l1), sung("Humpty Dumpty sat on a wall,", T.l1, [
    ...[0, 1.5, 3].map((k) => ({ do: "wiggle", target: "humpty", at: onBeat(k), deg: 7, dur: 0.7 })),
    { do: "wiggle", target: "humpty#leg", at: onBeat(0.5), deg: 18, dur: 2 },
    ...FIDS.map((id, k) => ({ do: "feel", target: id, feeling: "joyful", at: 0.3 + k * 0.1 })),
  ])),
  beat("z2", tuneDur(T.l2), sung("Humpty Dumpty, happy and tall.", T.l2, [
    { do: "camera", ...WALL_CAM, dur: 1.2 },
    { do: "wiggle", target: "humpty#arm", at: onBeat(0.5), deg: 35, dur: 2 },
  ])),
  beat("z3", tuneDur(T.l3), sung("All of his friends built the steps together,", T.l3, [
    { do: "camera", position: [0.8, 2.4, 10.8], lookAt: [0.9, 1.3, -0.6], fov: 40, dur: 1.2 },
    ...FIDS.map((id, k) => ({ do: "hop", target: id, at: onBeat(0.5 + k * 0.8), height: 0.35, dur: 0.4 })),
    ...[1, 2, 3, 4].map((n, k) => ({ do: "wiggle", target: `step${n}`, at: onBeat(0.5 + k * 0.8), deg: 3, dur: 0.4 })),
  ])),
  beat("z4", tuneDur(T.l4), sung("Now Humpty Dumpty is back up again.", T.l4, [
    { do: "burst", target: "confetti", at: 0.2, dur: 2.6 },
    ...all.map((id, k) => ({ do: "hop", target: id, at: onBeat(0.5 + k * 0.6), height: id === "humpty" ? 0.15 : 0.35, dur: 0.4 })),
    ...[1, 2, 3, 4].map((n, k) => ({ do: "wiggle", target: `slot${n}`, at: 0.3 + k * 0.3, deg: 10, dur: 0.5 })),
  ])),
  beat("z5", 3.2, [
    say("Bye-bye, Humpty! Bye-bye, friends!", { at: 0.2 }),
    { do: "say", who: "humpty", text: "Bye-bye!", at: "after" },
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "wiggle", target: "humpty#arm", at: 0.3, deg: 35, dur: 2 },
    ...FIDS.map((id, k) => ({ do: "wiggle", target: id, at: 0.4 + k * 0.1, deg: 8, dur: 1.5 })),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.4 },
    { do: "camera", position: [0.6, 3.2, 13.5], lookAt: [0.8, 1.5, -1], fov: 40, dur: 3 },
  ]),
]});

// ---- Meta -------------------------------------------------------------------------------------------------------

const description = "Sing Humpty Dumpty with Robo, and help Humpty get back up! Humpty wobbles on the wall and slides down onto a big soft pile of pillows (boing, he's okay!). Then the friends build him a staircase from four puzzle steps: find which shape fits each hole (rectangle, square, triangle and circle), count the puzzle pieces, count the steps as Humpty climbs back up, and play a point-to-it shape quiz.";
const thumbWall = [
  { id: "wall", kind: "prop", model: "brick_wall", at: [2.9, 0, -0.8] },
  { id: "humpty", kind: "critter", species: "humpty", size: 1.0, at: [2.9, 1.15, -0.58], feeling: "joyful" },
];
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Humpty Dumpty: Fix It Together", episode: "br08", seed: 308,
    skills: ["basic_shapes_prek", "count_to_5_prek"],
    cast,
    youtube: {
      title: "Humpty Dumpty 🥚 Fix It Together! Shapes Sing-Along for Toddlers | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: the shapes circle, square, triangle and rectangle (and how many sides and corners they have), matching a shape to its hole like a puzzle, counting to four, and cause and effect (soft pillows make a soft landing; steps help you go up).\n\nSing at home: wobble side to side on "sat on a wall", draw each shape in the air with your finger, and ask "What happens next?" before Humpty slides. The first verse of Humpty Dumpty is a traditional public-domain rhyme (its last line is gently changed so Humpty is never broken); the shape verses, the happy ending and the last chorus are original words written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["humpty dumpty", "nursery rhymes", "shapes for toddlers", "circle square triangle rectangle", "shape puzzle", "counting to 4", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "wall", title: "HUMPTY DUMPTY", subtitle: "Will he fall?", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.2, 1.6, 5.4], lookAt: [1.75, 1.35, -0.6], fov: 38 },
        objects: [
          ...thumbWall,
          { id: "pil1", kind: "prop", model: "pillow", color: "pink", at: [2.6, 0, 0.5], rotation: [0, 12, 0] },
          { id: "pil2", kind: "prop", model: "pillow", color: "yellow", at: [3.4, 0, 0.6], rotation: [0, -18, 0] },
          { id: "pil3", kind: "prop", model: "pillow", color: "mint", at: [3.0, 0.26, 0.45], rotation: [0, 28, 0] },
        ] },
      { name: "shapes", title: "FIX IT TOGETHER!", subtitle: "Which shape fits?", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.6, 1.5, 5.6], lookAt: [2.1, 1.0, -0.6], fov: 38 },
        objects: [
          { id: "humpty", kind: "critter", species: "humpty", size: 1.1, at: [3.75, 0, 0.1], rotation: [0, -25, 0], feeling: "joyful" },
          { id: "s1", kind: "shape", shape: "circle", color: "red", size: 0.5, face: true, at: [2.3, 0, 0.75], feeling: "joyful" },
          { id: "s2", kind: "shape", shape: "square", color: "blue", size: 0.5, face: true, at: [2.85, 0, -0.35], feeling: "happy" },
          { id: "s3", kind: "shape", shape: "triangle", color: "green", size: 0.55, face: true, at: [2.95, 0, 0.75], feeling: "joyful" },
          { id: "s4", kind: "shape", shape: "rectangle", color: "orange", size: 0.4, face: true, at: [2.1, 0, -0.3], feeling: "happy" },
        ] },
    ],
  }),
  stage: { preset: "playroom" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "humpty_dumpty");
