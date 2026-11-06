// Builds ../br11_shapes_everywhere.json: Shapes Are Everywhere (original words, original tune). Five shapes
// (circle, square, triangle, star, heart) hide one by one behind Robo's shape sorter box. Each verse: peekaboo (a
// corner peeks out, "What shape is this?", 3-2-1, it pops out), the shape's verse, find that shape in the playroom
// (a choice of two things, 3-2-1, the shape's outline is drawn over the right one: the clock, the present, the
// sailboat's sail, the star on the toy box, the heart card), trace the shape in the air, then the piece drops into
// its hole in the sorter and fills a tracker slot (the fifth, the heart, is a teased surprise). Then a recap
// point-to-it quiz, the last chorus with all five shapes and bye-bye.
// Run: node br11.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, showTracker, fillSlot, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// Original tune (Toy Box Friends), key of C, one note per syllable.
const T = {
  c1: "G4 G4 G4 E4 G4:0.5 A4:0.5 G4:2", // Shapes, shapes, shapes are ev-ery-where, (7)
  c2: "E4 F4 A4:1.5 G4:0.5 F4 D4 C4:2", // Look up high and look down low, (7)
  c3: "G4 G4 G4 E4 G4:0.5 A4:0.5 C5:2", // Shapes, shapes, shapes are ev-ery-where, (7)
  c4: "A4 G4 F4 E4 D4 E4 C4:2", // Find a shape and say hel-lo. (7)
  v1: "C4 C4 E4 E4 G4 G4 E4:2", // verse line 1 (7)
  v2: "F4 F4 D4 D4 E4 D4 C4:2", // verse line 2 (7)
  v3: "C4 C4 E4 E4 G4 A4 G4:2", // verse line 3 (7)
  v4: "A4 G4 F4 E4 D4 D4 C4:2", // verse line 4 (7)
};
const CHORUS = [
  ["Shapes, shapes, shapes are everywhere,", T.c1],
  ["Look up high and look down low,", T.c2],
  ["Shapes, shapes, shapes are everywhere,", T.c3],
  ["Find a shape and say hello.", T.c4],
];

// ---- Layout -----------------------------------------------------------------------------------------------------

const CAM = { position: [0, 2.2, 9.6], lookAt: [0, 1.1, -0.4], fov: 40 };
const PEEK_CAM = { position: [0.5, 1.45, 5.2], lookAt: [0.35, 0.75, -0.3], fov: 40 };
const DROP_CAM = { position: [0.7, 3.0, 3.1], lookAt: [0.05, 1.0, -0.05], fov: 40 };
const SORTER = [0, 0, 0]; // 1.1 m cube, top at 1.13
const TOP = 1.13;
const HIDE = [0, 0, -0.95]; // behind the sorter, out of sight
const PEEK = [0.62, 0, -0.95]; // a corner pokes out past its right side
const STAND = [-1.0, 0, 1.3]; // where a revealed shape stands and dances
const SIDE = [-2.55, 0, 2.3]; // by Robo, out of the find shots
const BIG = 0.62; // the hiding shapes' size
const PIECE = 0.24; // the size that fits a hole
const ROBO = [-3.7, 0, 1.0];

// Height factors of the flat puffy shapes at size 1 (geometry plus the 0.16 bevel).
const H = { circle: 1.16, square: 1.06, triangle: 1.11, star: 1.07, heart: 1.03 };

// Things in the playroom (no turns, so outline points are world offsets).
const TABLE = [-1.3, 0, -2.2];
const ROOM = {
  clock: { at: [TABLE[0], 0.8, TABLE[2]], name: "clock" },
  gift: { at: [2.2, 0, -1.6], size: 1.1, name: "present" },
  boat: { at: [3.55, 0, -0.35], size: 1.3, name: "boat" },
  toybox: { at: [-2.3, 0, 0.15], size: 1.0, name: "toy box" },
  card: { at: [2.75, 0, 1.05], name: "card" },
};
const CLOCK_D = 0.9;

// ---- Outline points (relative to the stroke's at, in the x/y plane) --------------------------------------------

const r3 = (v) => Math.round(v * 1000) / 1000;
const pts = (list) => list.map(([x, y]) => [r3(x), r3(y), 0]);
const circleR = (r) => pts(Array.from({ length: 36 }, (_, i) => [r * Math.sin((i * 2 * Math.PI) / 36), r * Math.cos((i * 2 * Math.PI) / 36)]));
const squarePts = (a) => pts([[-a / 2, a / 2], [a / 2, a / 2], [a / 2, -a / 2], [-a / 2, -a / 2]]);
const trianglePts = (w) => pts([[0, 0.5 * w], [0.55 * w, -0.45 * w], [-0.55 * w, -0.45 * w]]);
const starPts = (w) => pts(Array.from({ length: 10 }, (_, i) => {
  const r = (i % 2 ? 0.21 : 0.5) * w;
  const a = Math.PI / 2 + (i * Math.PI) / 5;
  return [r * Math.cos(a), r * Math.sin(a)];
}));
// The heart (runtime/geometry.js heart()) sampled along its four curves, starting at the top dip.
function heartPts(w) {
  const segs = [
    [[0, 0.28], [0.18, 0.5], [0.5, 0.42], [0.5, 0.15]],
    [[0.5, 0.15], [0.5, -0.1], [0.1, -0.3], [0, -0.45]],
    [[0, -0.45], [-0.1, -0.3], [-0.5, -0.1], [-0.5, 0.15]],
    [[-0.5, 0.15], [-0.5, 0.42], [-0.18, 0.5], [0, 0.28]],
  ];
  const out = [];
  for (const [p0, p1, p2, p3] of segs) for (let i = 0; i < 10; i++) {
    const t = i / 10;
    const u = 1 - t;
    out.push([0, 1].map((k) => (u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]) * w));
  }
  return pts(out);
}
const circlePts = (w) => circleR(w / 2);
const OUTLINE = { circle: circlePts, square: squarePts, triangle: trianglePts, star: starPts, heart: heartPts };

// ---- The five shapes ---------------------------------------------------------------------------------------------

const S = [
  {
    shape: "circle", color: "red", hole: [-0.32, -0.24], right: "clock", wrong: "gift",
    lines: ["Round and round, the circle goes,", "Not one corner, see it roll,", "Ball and clock and dinner plate,", "Circles here and there, how great."],
    reveal: "A circle! Round and round!", find: "Find a circle! The clock or the present?", found: "The clock! The clock is a circle!",
    trace: "Draw a circle in the air! Round and round!", praise: "Round and round! Great!",
    // Outline over the clock face.
    outline: { at: [ROOM.clock.at[0], ROOM.clock.at[1] + CLOCK_D * 0.535, ROOM.clock.at[2] + 0.1], pts: circleR(CLOCK_D * 0.6) },
  },
  {
    shape: "square", color: "blue", hole: [0, -0.24], right: "gift", wrong: "boat",
    lines: ["Here's a square with four straight sides,", "Four the same, one, two, three, four,", "Window, box and building block,", "Squares are here, let's look for more."],
    reveal: "A square! Four sides!", find: "Find a square! The present or the boat?", found: "The present! It's a square!",
    trace: "Draw a square in the air! Side, side, side, side!", praise: "Four sides! Great!",
    outline: { at: [ROOM.gift.at[0], 0.35 * 1.1, ROOM.gift.at[2] + 0.42], pts: squarePts(0.86) },
  },
  {
    shape: "triangle", color: "green", hole: [0.32, -0.24], right: "boat", wrong: "ball",
    lines: ["Three straight sides and corners three,", "A triangle, can you see,", "Rooftop, pizza, boat with sail,", "Triangles for you and me."],
    reveal: "A triangle! Three corners!", find: "Find a triangle! The boat or the ball?", found: "The boat! Its sail is a triangle!",
    trace: "Draw a triangle in the air! Up, down, across!", praise: "Three corners! Great!",
    // The main sail (a wedge): corners (0.04, 0.33), (0.44, 0.33), (0.04, 1.03) at size 1, a little bigger.
    outline: (() => {
      const k = ROOM.boat.size;
      const c = [0.173, 0.563];
      const v = [[0.04, 1.03], [0.44, 0.33], [0.04, 0.33]].map(([x, y]) => [(c[0] + (x - c[0]) * 1.22) * k, (c[1] + (y - c[1]) * 1.22) * k]);
      return { at: [ROOM.boat.at[0], 0, ROOM.boat.at[2] + 0.05], pts: pts(v) };
    })(),
  },
  {
    shape: "star", color: "yellow", hole: [-0.17, 0.22], right: "toybox", wrong: "clock",
    lines: ["Twinkle, sparkle, five points bright,", "Here's a star, a shining light,", "On a badge and in the sky,", "Stars are shining way up high."],
    reveal: "A star! Five points!", find: "Find a star! The toy box or the clock?", found: "The toy box! It has a star!",
    trace: "Draw a star in the air! Point, point, point!", praise: "Five points! Great!",
    outline: { at: [ROOM.toybox.at[0], (0.31 + 0.025) * ROOM.toybox.size, ROOM.toybox.at[2] + 0.4 * ROOM.toybox.size], pts: starPts(0.26 * ROOM.toybox.size * 1.5) },
  },
  {
    shape: "heart", color: "pink", hole: [0.17, 0.22], right: "card", wrong: "gift",
    lines: ["Here's a heart, so soft and sweet,", "Round on top, a point below,", "Make a card for those you love,", "Hearts mean love, and now you know."],
    reveal: "A heart! The surprise!", find: "Find a heart! The card or the present?", found: "The card! It has a heart!",
    trace: "Draw a heart in the air! Round, round, point!", praise: "A lovely heart! Great!",
    outline: { at: [ROOM.card.at[0], 0.43 - 0.01, ROOM.card.at[2] + 0.13], pts: heartPts(0.38 * 1.35) },
  },
];

// ---- Objects ----------------------------------------------------------------------------------------------------

const objects = [
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, 30, 0], feeling: "happy" },
  { id: "sorter", kind: "prop", model: "shape_sorter", at: SORTER },
  { id: "table", kind: "prop", model: "table", at: TABLE },
  { id: "clock", kind: "clock", at: ROOM.clock.at, size: CLOCK_D, time: "3:00", color: "orange" },
  { id: "gift", kind: "prop", model: "gift", color: "red", at: ROOM.gift.at, size: ROOM.gift.size },
  { id: "boat", kind: "prop", model: "boat", at: ROOM.boat.at, size: ROOM.boat.size },
  { id: "toybox", kind: "prop", model: "toy_box", at: ROOM.toybox.at, size: ROOM.toybox.size },
  { id: "card", kind: "prop", model: "heart_card", at: ROOM.card.at },
  { id: "ball", kind: "prop", model: "ball", color: "blue", at: [2.95, 0, -2.1], size: 0.55 },
  { id: "plant", kind: "prop", model: "plant", at: [-5.6, 0, -2.2], size: 1.2 },
  { id: "shelf", kind: "prop", model: "shelf", at: [5.4, 0, -2.3] },
];
for (const s of S) {
  objects.push({ id: s.shape, kind: "shape", shape: s.shape, color: s.color, size: BIG, face: true, at: HIDE, hidden: true });
  objects.push({ id: `ol_${s.shape}`, kind: "stroke", at: s.outline.at, points: s.outline.pts, closed: true, width: 0.05, color: s.shape === "star" ? "orange" : "yellow", pen: "dot", hidden: true });
  // The shape traced in the air in front of Robo.
  objects.push({ id: `air_${s.shape}`, kind: "stroke", at: [-2.45, 1.55, 1.6], points: OUTLINE[s.shape](0.75), closed: true, smooth: false, width: 0.07, color: s.color, pen: "dot", hidden: true });
}
// Quiz and finale shapes (big, with faces).
for (const s of S) objects.push({ id: `f_${s.shape}`, kind: "shape", shape: s.shape, color: s.color, size: 0.7, face: true, at: [0, 0, 1.6], hidden: true });
objects.push({ id: "confetti", kind: "confetti", at: [0, 3.2, 0.5] });
// HUD: five shape slots (each fills with its shape), "?" on the last, countdown, words.
objects.push(...trackerObjects(5, { colors: S.map((s) => s.color) }));
S.forEach((s, i) => objects.push({ id: `mini${i + 1}`, kind: "shape", shape: s.shape, color: s.color, hud: true, parent: `slot${i + 1}`, at: [0, -Math.round(H[s.shape] * 0.42 * 50) / 100, 0.2], size: 0.42, hidden: true }));
objects.push({ id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot5", at: [0, -0.26, 0.2], size: 0.42, hidden: true });
objects.push(...countdownObjects());
objects.push(...bubbleObjects(S.map((s) => ({ id: s.shape, text: s.shape.toUpperCase(), color: s.color === "yellow" ? "orange" : s.color }))));

// ---- Scenes -----------------------------------------------------------------------------------------------------

const scenes = [];

/** Peekaboo: the shape slides out so a corner shows, "What shape is this?", 3-2-1, it pops out over the box. */
function peekaboo(s, i, first) {
  const id = s.shape;
  const ask = first ? "Peekaboo! What shape is this?" : ["", "Peekaboo! What shape is this?", "Who is hiding now? What shape?", "Look! A corner! What shape is this?", "The surprise! What shape is this?"][i];
  return [
    beat(`${id}_k1`, 2.6, [
      { do: "camera", ...PEEK_CAM, dur: first ? 0 : 1.0 },
      { do: "show", target: id, at: 0, dur: 0.01 },
      { do: "move", target: id, to: PEEK, at: 0.05, dur: 0.6, ease: "sineInOut" },
      { do: "sound", sound: "squeak", at: 0.1, volume: 0.5 },
      { do: "wiggle", target: id, at: 0.8, deg: 8, dur: 0.8 },
      say(ask, { at: first ? 0.2 : 0.3 }),
      { do: "look", target: "robo", at: 0.2, to: "sorter" },
    ]),
    beat(`${id}_k2`, 2.5, [
      ...countdown(0.1),
      { do: "wiggle", target: id, at: 0.3, deg: 10, dur: 0.6 },
      { do: "wiggle", target: id, at: 1.8, deg: 10, dur: 0.6 },
    ]),
    beat(`${id}_k3`, 2.5, [
      { do: "path", target: id, points: [PEEK, [-0.2, 1.95, -0.1], STAND], at: 0.05, dur: 0.8 },
      { do: "spin", target: id, turns: 1, at: 0.05, dur: 0.8 },
      { do: "sound", sound: "boing", at: 0.1, volume: 0.6 },
      { do: "sound", sound: "magic_sparkle", at: 0.85, volume: 0.5 },
      { do: "feel", target: id, feeling: "joyful", at: 0.9 },
      { do: "camera", position: [-0.5, 1.6, 6.3], lookAt: [-0.4, 0.8, 0.5], fov: 40, dur: 0.9 },
      say(s.reveal, { at: 0.9 }),
      word(id, 0.95),
      { do: "clip", target: "robo", clip: "Jump", at: 0.9 },
      { do: "look", target: "robo", at: 0.6, to: id },
    ]),
  ];
}

/** The four chorus lines (original). */
function chorus(id, extra = () => [], n = 4) {
  const cams = [
    { do: "camera", position: [-0.8, 2.3, 9.2], lookAt: [0, 1.1, -0.4], fov: 40, dur: 1.4 },
    { do: "camera", position: [1.6, 3.4, 8.2], lookAt: [0.2, 0.6, -0.4], fov: 40, dur: 1.4 },
    { do: "camera", position: [0.8, 1.5, 9.0], lookAt: [0, 1.3, -0.4], fov: 40, dur: 1.4 },
    { do: "camera", ...CAM, dur: 1.4 },
  ];
  return CHORUS.slice(0, n).map(([text, tune], k) => beat(`${id}${k + 1}`, tuneDur(tune), sung(text, tune, [
    cams[k],
    k === 0 ? { do: "clip", target: "robo", clip: "Dance", at: 0.1 } : null,
    k === 1 ? [{ do: "look", target: "robo", at: onBeat(0.5), to: [ROBO[0], 3.2, 0] }, { do: "look", target: "robo", at: onBeat(4), to: [ROBO[0] + 1, 0, 2] }] : null,
    k === 2 ? { do: "look", target: "robo", at: 0.2, to: "ahead" } : null,
    k === 3 ? { do: "wiggle", target: "sorter", at: onBeat(2), deg: 4, dur: 0.8 } : null,
    ...extra(k),
  ])));
}

// 0:00 Hook: the circle peeks out from behind the box.
const c0 = S[0];
scenes.push({ id: "hello", title: "What shape is this?", beats: [
  ...peekaboo(c0, 0, true),
  beat("h4", 2.8, [
    unword("circle", 0.1),
    { do: "camera", ...CAM, dur: 1.2 },
    say("Five shapes are hiding! Let's find them!", { at: 0.2 }),
    showTracker(5, 0.5),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
    { do: "look", target: "robo", at: 0.2, to: "ahead" },
  ]),
  beat("h5", 3.0, [
    say("The last one is a surprise! Let's sing!", { at: 0.1 }),
    { do: "pop", target: "qmark", at: 0.3, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot5", at: 0.6, deg: 12, dur: 1 },
    { do: "hop", target: "circle", at: 0.4, height: 0.25, dur: 0.4 },
  ]),
]});

scenes.push({ id: "chorus1", title: "Sing: Shapes Are Everywhere", music: false, beats: [
  ...chorus("ca", (k) => [{ do: "hop", target: "circle", at: onBeat(1 + k * 0.5), height: 0.25, dur: 0.4 }], 2),
]});

const yaws = [-18, 16, -12, 20, -16];
S.forEach((s, i) => {
  const n = i + 1;
  const id = s.shape;
  if (i > 0) scenes.push({ id: `${id}_peek`, title: `Peekaboo: ${s.shape}`, beats: peekaboo(s, i, false) });

  // The verse (original words, original tune): the shape dances by the box.
  scenes.push({ id: `${id}_song`, title: `Sing: the ${s.shape}`, music: false, beats: [
    beat(`${id}_s1`, tuneDur(T.v1), sung(s.lines[0], T.v1, [
      i === 0 ? null : unword(id, 0.1),
      { do: "shot", target: [id, "sorter"], framing: "medium", yaw: yaws[i], dur: 1.2 },
      { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
      ...[0.5, 2.5, 4.5].map((k) => ({ do: "hop", target: id, at: onBeat(k), height: 0.22, dur: 0.4 })),
    ])),
    beat(`${id}_s2`, tuneDur(T.v2), sung(s.lines[1], T.v2, [
      { do: "wiggle", target: id, at: onBeat(1), deg: 14, dur: 1.6 },
      { do: "highlight", target: id, at: onBeat(2), dur: 1.6 },
    ])),
    beat(`${id}_s3`, tuneDur(T.v3), sung(s.lines[2], T.v3, [
      { do: "camera", ...CAM, dur: 1.2 },
      { do: "wiggle", target: s.right, at: onBeat(2), deg: 6, dur: 0.8 },
      { do: "look", target: "robo", at: 0.3, to: s.right },
    ])),
    beat(`${id}_s4`, tuneDur(T.v4), sung(s.lines[3], T.v4, [
      { do: "camera", position: [STAND[0] - 0.6, 1.3, 4.6], lookAt: [STAND[0] - 0.3, 0.6, STAND[2] - 0.6], fov: 40, dur: 1.2 },
      { do: "look", target: "robo", at: 0.2, to: id },
      ...[0.5, 2.5, 4.5].map((k) => ({ do: "hop", target: id, at: onBeat(k), height: 0.28, dur: 0.4 })),
    ])),
  ]});

  // Find the shape in the room: a choice of two, 3-2-1, the outline is drawn over the right one.
  const r = s.right;
  const w = s.wrong;
  scenes.push({ id: `${id}_find`, title: `Find a ${s.shape}!`, beats: [
    beat(`${id}_f1`, 2.7, [
      { do: "shot", target: [r, w], framing: "wide", yaw: [6, -8, 10, -6, 8][i], dur: 1.0 },
      say(s.find, { at: 0.2 }),
      { do: "path", target: id, points: [STAND, [-1.8, 0.6, 1.9], SIDE], at: 0.05, dur: 0.6, face: false },
      { do: "wiggle", target: r, at: 1.2, deg: 6, dur: 0.6 },
      { do: "wiggle", target: w, at: 1.9, deg: 6, dur: 0.6 },
      { do: "look", target: "robo", at: 0.3, to: r },
    ]),
    beat(`${id}_f2`, 2.5, [
      ...countdown(0.1),
      { do: "wiggle", target: w, at: 0.2, deg: 6, dur: 0.6 },
      { do: "wiggle", target: r, at: 0.95, deg: 6, dur: 0.6 },
      { do: "wiggle", target: w, at: 1.7, deg: 6, dur: 0.6 },
      { do: "look", target: "robo", at: 0.4, to: w },
    ]),
    beat(`${id}_f3`, 2.9, [
      { do: "draw", target: `ol_${id}`, at: 0.1, dur: 1.3, sound: "sparkle" },
      { do: "point", target: "robo", to: r, at: 0.2, hold: 2.2 },
      say(s.found, { at: 0.3 }),
      { do: "sound", sound: "ding", at: 1.4, volume: 0.7 },
      { do: "wiggle", target: r, at: 1.45, deg: 5, dur: 0.6 },
    ]),
  ]});

  // Trace it in the air, then it drops into its hole and fills a slot.
  const pk = PIECE / BIG;
  const above = [r3(s.hole[0]), 1.62, r3(s.hole[1] + (H[id] * PIECE) / 2)];
  const inside = [above[0], 0.75, above[2]];
  const last = i === S.length - 1;
  scenes.push({ id: `${id}_trace`, title: `Draw a ${s.shape}!`, beats: [
    beat(`${id}_t1`, 2.8, [
      { do: "camera", position: [-1.5, 1.7, 6.6], lookAt: [-2.8, 1.2, 0.8], fov: 40, dur: 1.0 },
      { do: "hide", target: `ol_${id}`, at: 0.1, dur: 0.4 },
      { do: "look", target: "robo", at: 0.1, to: "ahead" },
      say(s.trace, { at: 0.2 }),
      { do: "draw", target: `air_${id}`, at: 0.6, dur: 2.2 },
      { do: "point", target: "robo", to: [-2.45, 1.55, 1.6], at: 0.5, hold: 2.0 },
    ]),
    beat(`${id}_t2`, 3.1, [
      say("Your turn!", { at: 0.1 }),
      { do: "draw", target: `air_${id}`, at: 0.1, dur: 1.5 },
      { do: "sound", sound: "tick", at: 1.0, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.6, volume: 0.5 },
      say(s.praise, { at: 2.1 }),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 2.2 },
    ]),
    beat(`${id}_d1`, 3.2, [
      { do: "camera", ...DROP_CAM, dur: 0.9 },
      { do: "hide", target: `air_${id}`, at: 0.05, dur: 0.3 },
      say(i === 0 ? "Into the shape box! In it goes!" : `In goes the ${s.shape}!`, { at: 0.2 }),
      { do: "feel", target: id, feeling: "happy", at: 0.1 },
      { do: "path", target: id, points: [SIDE, [-1.2, 2.0, 1.2], above], at: 0.3, dur: 1.0 },
      { do: "grow", target: id, to: pk, at: 0.3, dur: 0.9 },
      { do: "turn", target: id, to: [-90, 0, 0], at: 0.6, dur: 0.6 },
      { do: "sound", sound: "whoosh", at: 0.3, volume: 0.5 },
      { do: "move", target: id, to: inside, at: 1.6, dur: 0.5, ease: "quadIn" },
      { do: "sound", sound: "block", at: 2.0 },
      { do: "hide", target: id, at: 2.15, dur: 0.05 },
      { do: "wiggle", target: "sorter", at: 2.1, deg: 3, dur: 0.5 },
      last ? { do: "hide", target: "qmark", at: 2.2, dur: 0.2 } : null,
      fillSlot(n, `mini${n}`, 2.35),
    ]),
  ]});
});

// Recap quiz: point to it.
const QSPOTS = [[-1.1, 0, 1.6], [1.1, 0, 1.6]];
const qbeat = (id, l, r) => beat(id, 0.6, [
  { do: "move", target: l, to: QSPOTS[0], at: 0, dur: 0.01 }, { do: "move", target: r, to: QSPOTS[1], at: 0, dur: 0.01 },
  { do: "pop", target: l, at: 0.05, dur: 0.35, sound: "pop" }, { do: "pop", target: r, at: 0.15, dur: 0.35, sound: false },
]);
const qhide = (id, l, r) => beat(id, 0.5, [{ do: "hide", target: l, at: 0, dur: 0.3 }, { do: "hide", target: r, at: 0.05, dur: 0.3 }]);
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 1.6, [say("A quick game!", { at: 0.1 }), { do: "camera", ...CAM, dur: 1.0 }, { do: "clip", target: "robo", clip: "Dance", at: 0.2 }]),
  qbeat("q1p", "f_star", "f_heart"),
  ...quizRound({ id: "q1", q: "Which one is the star? Point to it!", left: "f_star", right: "f_heart", answer: "f_star", spots: QSPOTS, yes: "Yes! The star! Five points!" }),
  qhide("q1h", "f_star", "f_heart"),
].map((b) => (b.id === "q1c" ? { ...b, do: [{ do: "camera", position: [0, 1.9, 7.4], lookAt: [0, 0.8, 0.6], fov: 40, dur: 0.5 }, ...b.do] } : b)),
});

// Last chorus: all five shapes jump out of the shape box and dance.
const ROW = S.map((_, k) => [-1.8 + k * 0.9, 0, 1.55]);
const FIN = S.map((s) => `f_${s.shape}`);
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("z0", 2.6, [
    say("Everybody sing! Shapes, come out!", { at: 0.1 }),
    { do: "camera", position: [0, 2.4, 9.8], lookAt: [0, 1.0, -0.2], fov: 40, dur: 1.2 },
    { do: "wiggle", target: "sorter", at: 0.3, deg: 5, dur: 1.0 },
    ...FIN.map((id, k) => [
      { do: "move", target: id, to: [S[k].hole[0], 0.7, S[k].hole[1]], at: 0, dur: 0.01 },
      { do: "show", target: id, at: 1.0 + k * 0.2, dur: 0.01 },
      { do: "path", target: id, points: [[S[k].hole[0], 0.7, S[k].hole[1]], [S[k].hole[0] + (ROW[k][0] - S[k].hole[0]) / 2, 2.1, 0.8], ROW[k]], at: 1.0 + k * 0.2, dur: 0.7 },
      { do: "sound", sound: "pop", at: 1.0 + k * 0.2, volume: 0.6 },
      { do: "feel", target: id, feeling: "joyful", at: 1.7 + k * 0.2 },
    ]),
  ]),
  ...chorus("z", (k) => FIN.map((id, j) => ({ do: "hop", target: id, at: onBeat(0.5 + ((j + k) % 5) * 0.7), height: 0.28, dur: 0.4 }))),
  beat("z5", 3.4, [
    { do: "burst", target: "confetti", at: 0.1, dur: 2.6 },
    say("Shapes are everywhere! Bye-bye!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    ...FIN.map((id, k) => ({ do: "wiggle", target: id, at: 0.3 + k * 0.1, deg: 10, dur: 1.5 })),
    ...[1, 2, 3, 4, 5].map((n, k) => ({ do: "wiggle", target: `slot${n}`, at: 0.3 + k * 0.2, deg: 10, dur: 0.5 })),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.8, dur: 2.4 },
    { do: "camera", position: [0, 3.2, 13.5], lookAt: [0, 1.3, -1], fov: 40, dur: 3 },
  ]),
]});

// ---- Meta -------------------------------------------------------------------------------------------------------

const description = "Sing Shapes Are Everywhere with Robo! Five shapes play peekaboo behind Robo's shape sorter box: a corner peeks out, guess the shape, 3, 2, 1, and out it pops. Then find each shape in the playroom (a round clock, a square present, a triangle sail, a star on the toy box and a heart card), draw it in the air, and drop it into its hole in the shape box: circle, square, triangle, star and heart.";
const sorterThumb = { id: "sorter", kind: "prop", model: "shape_sorter", at: [2.4, 0, -0.4], rotation: [0, -18, 0] };
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Shapes Are Everywhere", episode: "br11", seed: 311,
    skills: ["basic_shapes_prek", "prewriting_strokes_prek"],
    youtube: {
      title: "Shapes Are Everywhere ⭐ Peekaboo Shapes Song for Toddlers | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: the names of five shapes (circle, square, triangle, star and heart), what makes each one (round with no corners, four equal sides, three corners, five points, round on top with a point below), spotting shapes in everyday things, and drawing shapes in the air, a first step toward writing.\n\nSing at home: play peekaboo with a shape cut from paper behind a book, look around your room for circles and squares, and draw each shape in the air with your finger as Robo does. The words and the tune of Shapes Are Everywhere are original, written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["shapes song", "shapes for toddlers", "circle square triangle star heart", "peekaboo", "shape sorter", "learn shapes", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "peekaboo", title: "WHAT SHAPE IS IT?", subtitle: "Peekaboo shapes!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [0.9, 1.5, 5.2], lookAt: [1.25, 0.8, -0.4], fov: 38 },
        objects: [
          sorterThumb,
          { id: "star", kind: "shape", shape: "star", color: "yellow", size: 0.7, face: true, feeling: "joyful", at: [3.2, 0, -0.75], rotation: [0, 0, -14] },
          { id: "circle", kind: "shape", shape: "circle", color: "red", size: 0.5, face: true, feeling: "happy", at: [2.0, 0, 0.85] },
        ] },
      { name: "five", title: "SHAPES EVERYWHERE", subtitle: "Find all five shapes!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.2, 1.5, 5.6], lookAt: [1.45, 0.8, -0.4], fov: 38 },
        objects: [
          sorterThumb,
          { id: "s1", kind: "shape", shape: "circle", color: "red", size: 0.5, face: true, feeling: "joyful", at: [1.65, 0, 1.05] },
          { id: "s2", kind: "shape", shape: "square", color: "blue", size: 0.5, face: true, feeling: "happy", at: [2.05, 0, 1.0] },
          { id: "s3", kind: "shape", shape: "triangle", color: "green", size: 0.5, face: true, feeling: "joyful", at: [2.8, 0, 1.0] },
          { id: "s4", kind: "shape", shape: "star", color: "yellow", size: 0.55, face: true, feeling: "happy", at: [3.5, 0, 0.6] },
          { id: "s5", kind: "shape", shape: "heart", color: "pink", size: 0.5, face: true, feeling: "joyful", at: [3.6, 0, -0.35] },
        ] },
    ],
  }),
  stage: { preset: "playroom" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "shapes_everywhere");
