// Builds ../br05_hickory_dickory_dock.json: Hickory Dickory Dock (traditional first verse, public domain) plus
// original verses for the hours two to four. Each hour a different animal goes up the grandfather clock, the clock
// strikes that many bongs (count them), the animal comes down (up or down?), and a clock face fills the tracker.
// Run: node br05.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  DEFAULT_CAM, art, say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, showTracker, fillSlot, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// Hickory Dickory Dock (traditional, public domain), key of C. The tune climbs while the mouse runs up, rings on
// one note for the strike and runs back down to C with the mouse. One note per syllable.
const T = {
  hick: "C4 D4:0.5 E4 F4:0.5 G4 A4:0.5 G4:1.5", // Hick-o-ry, dick-o-ry, dock,
  up: "G4:0.5 A4 B4:0.5 C5 D5:0.5 C5:1.5", // The mouse ran up the clock.
  struck: "C5:0.5 C5 C5:0.5 C5:1.5", // The clock struck one,
  down: "B4:0.5 A4 G4:0.5 E4:1.5", // The mouse ran down,
  end: "G4 F4:0.5 E4 D4:0.5 C4 D4:0.5 C4:1.5", // Hick-o-ry, dick-o-ry, dock.
};

const CAM = { position: [0.3, 2.0, 8.0], lookAt: [0.5, 1.4, -0.6], fov: 40 };
const FACE_CAM = { position: [0.5, 2.05, 4.4], lookAt: [0.5, 1.8, -0.9], fov: 40 };
const CX = 0.5;
const CZ = -0.9;
const TOP = [CX, 2.47, CZ + 0.05]; // standing on the clock's flat top
const HIDE = [CX, 0, -1.7]; // behind the clock case
const FRONT = [1.75, 0, 0.75]; // where a friend stands after the reveal
const BONG = { do: "sound", sound: "clang", volume: 0.55 };
const NUM = ["one", "two", "three", "four"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
// A sung line whose beat is timed by the motion in it (up or down the clock), not fitted to the spoken line:
// fitSung only fits lines at 0.1 s and would squeeze the climb's steps together.
const sungMove = (text, tune, extra = []) => [say(text, { tune, at: 0.12 }), ...extra];

// The four friends, one per hour. how: climb (up the side), jump (one big jump) or fly.
const A = [
  { id: "mouse", species: "mouse", size: 0.65, how: "climb", side: 1, verb: "ran", sound: "Squeak!", word: "Squeak", park: [2.55, 0, 1.0], peek: "I see little pink ears!", voice: { voice: "squeaky", pitch: 1.25, speed: 1.05 }, praise: "Yes! Up, up, up!" },
  { id: "frog", species: "frog", size: 0.7, how: "jump", side: 1, verb: "jumped", sound: "Ribbit!", park: [3.35, 0, 0.55], peek: "I see green feet!", voice: { voice: "deep", pitch: 1.05, speed: 1 }, praise: "Yes! Boing, up!" },
  { id: "duck", species: "duck", size: 0.65, how: "fly", side: 1, verb: "flew", sound: "Quack!", park: [4.15, 0, 0.1], peek: "I see an orange beak!", voice: { voice: "squeaky", pitch: 1.05, speed: 1.05 }, praise: "Yes! Flap, flap, up!" },
  { id: "cat", species: "cat", size: 0.72, how: "climb", side: -1, verb: "climbed", sound: "Meow!", park: [4.95, 0, -0.35], peek: "I see pointy ears!", voice: { voice: "soft", pitch: 1.2, speed: 1 }, praise: "Yes! Up, up, up!" },
];

// ---- Objects --------------------------------------------------------------------------------------------------

const objects = [
  { id: "robo", kind: "character", character: "robot", at: [-3.1, 0, 0.7], rotation: [0, 30, 0], feeling: "happy" },
  { id: "rug_round", kind: "prop", model: "rug", at: [CX + 0.4, 0, 0.3], size: 1.6 },
  { id: "gclock", kind: "prop", model: "grandfather_clock", at: [CX, 0, CZ] },
  { id: "face", kind: "clock", parent: "gclock", at: [0, 1.668, 0.33], size: 0.62, time: "12:00", color: "gold", face: "cream", minuteHand: true },
  { id: "toybox", kind: "prop", model: "toy_box", at: [-4.6, 0, -1.6], rotation: [0, 25, 0], size: 0.9 },
  { id: "plant", kind: "prop", model: "plant", at: [5.6, 0, -2.6], size: 1.2 },
];
for (const a of A) objects.push({ id: a.id, kind: "critter", species: a.species, size: a.size, at: HIDE, rotation: [0, 0, 0] });
objects.push({ id: "confetti", kind: "confetti", at: [CX, 3.2, 0.5] });
// HUD: four clock-face slots (each fills with a little clock showing its hour), "?" on the last, countdown, words.
objects.push(...trackerObjects(4, { colors: ["blue", "orange", "green", "pink"] }));
A.forEach((a, i) => objects.push({ id: `mini${i + 1}`, kind: "clock", hud: true, parent: `slot${i + 1}`, at: [0, -0.37, 0.3], size: 0.5, time: `${i + 1}:00`, color: "gold", face: "white", hidden: true }));
objects.push({ id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot4", at: [0, -0.26, 0.2], size: 0.42, hidden: true });
objects.push(...countdownObjects());
objects.push(...bubbleObjects([...NUM.map((n) => ({ id: n, text: n.toUpperCase() })), { id: "up", text: "UP!", color: "green" }, { id: "down", text: "DOWN!", color: "blue" }]));

const cast = Object.fromEntries(A.map((a) => [a.id, a.voice]));

// ---- Motion helpers (each returns { acts, dur }) ----------------------------------------------------------------

/** Up the clock from `from`, starting at t0. */
function goUp(a, from, t0) {
  const s = a.side;
  if (a.how === "climb") {
    const sx = CX + s * (0.45 + 0.3 * a.size);
    const floor = [CX + s * 0.85, 0, CZ + 0.15];
    const rot = [0, -90 * s, 0]; // upright, nose to the case, side to the camera (critters stand head up on +y)
    return { dur: 2.25, acts: [
      { do: "path", target: a.id, points: [from, floor], dur: 0.6, at: t0, face: true },
      { do: "move", target: a.id, to: [sx, 0.2, CZ + 0.15], at: t0 + 0.62, dur: 0.25 },
      { do: "turn", target: a.id, to: rot, at: t0 + 0.62, dur: 0.25 },
      { do: "move", target: a.id, to: [sx, 2.2, CZ + 0.15], at: t0 + 0.9, dur: 0.95, ease: "sineInOut" },
      { do: "sound", sound: "footstep_soft", at: t0 + 1.0, volume: 0.5 },
      { do: "move", target: a.id, to: TOP, at: t0 + 1.88, dur: 0.32, ease: "backOut" },
      { do: "turn", target: a.id, to: [0, 0, 0], at: t0 + 1.88, dur: 0.32 },
    ] };
  }
  if (a.how === "jump") {
    return { dur: 1.5, acts: [
      { do: "hop", target: a.id, at: t0, height: 0.25, dur: 0.35 },
      { do: "path", target: a.id, points: [from, [1.45, 1.7, 0.1], [1.05, 3.15, -0.5], [CX + 0.15, 3.05, CZ + 0.05], TOP], dur: 0.95, at: t0 + 0.4 },
      { do: "turn", target: a.id, to: [0, 0, 0], at: t0 + 0.4, dur: 0.3 },
      { do: "sound", sound: "boing", at: t0 + 0.4 },
      { do: "sound", sound: "land", at: t0 + 1.35, volume: 0.6 },
    ] };
  }
  // fly: flap up in a loop and land on top.
  return { dur: 2.0, acts: [
    { do: "path", target: a.id, points: [from, [2.1, 1.0, 0.6], [1.75, 2.4, 0.1], [1.2, 3.25, -0.4], [CX + 0.2, 3.1, CZ + 0.05], TOP], dur: 1.75, at: t0 },
    { do: "turn", target: a.id, to: [0, -40, 0], at: t0, dur: 0.3 },
    { do: "turn", target: a.id, to: [0, 0, 0], at: t0 + 1.5, dur: 0.3 },
    { do: "sound", sound: "whoosh", at: t0 + 0.1, volume: 0.6 },
    ...[0, 0.35, 0.7, 1.05, 1.4].map((k) => ({ do: "wiggle", target: a.id, at: t0 + k, deg: 14, dur: 0.33 })),
  ] };
}

/** Down from the top to `to`, starting at t0. */
function goDown(a, to, t0) {
  const s = a.side;
  if (a.how === "climb") {
    const sx = CX + s * (0.45 + 0.3 * a.size);
    const floor = [CX + s * 0.85, 0, CZ + 0.15];
    return { dur: 2.3, acts: [
      { do: "move", target: a.id, to: [sx, 2.2, CZ + 0.15], at: t0, dur: 0.3 },
      { do: "turn", target: a.id, to: [0, -90 * s, 0], at: t0, dur: 0.3 }, // still facing the case, climbing down
      { do: "move", target: a.id, to: [sx, 0.2, CZ + 0.15], at: t0 + 0.33, dur: 0.85, ease: "sineInOut" },
      { do: "sound", sound: "slide_whistle", at: t0 + 0.33, volume: 0.35 },
      { do: "move", target: a.id, to: floor, at: t0 + 1.2, dur: 0.25 },
      { do: "turn", target: a.id, to: [0, 90 * s, 0], at: t0 + 1.2, dur: 0.25 },
      { do: "path", target: a.id, points: [floor, to], dur: 0.7, at: t0 + 1.47, face: true },
    ] };
  }
  if (a.how === "jump") {
    return { dur: 1.3, acts: [
      { do: "path", target: a.id, points: [TOP, [CX + 0.6, 3.1, CZ + 0.3], [1.6, 2.6, 0], [to[0] - 0.4, 1.1, to[2]], to], dur: 0.95, at: t0 },
      { do: "sound", sound: "boing", at: t0 },
      { do: "sound", sound: "land", at: t0 + 0.95, volume: 0.6 },
    ] };
  }
  return { dur: 1.9, acts: [
    { do: "path", target: a.id, points: [TOP, [CX + 0.6, 3.0, CZ + 0.3], [1.9, 2.2, 0.2], [to[0] - 0.3, 0.8, to[2]], to], dur: 1.6, at: t0 },
    { do: "sound", sound: "whoosh", at: t0, volume: 0.6 },
    ...[0, 0.35, 0.7, 1.05].map((k) => ({ do: "wiggle", target: a.id, at: t0 + k, deg: 14, dur: 0.33 })),
  ] };
}

/** The clock strikes n: n bongs from t0, gap seconds apart, each with a pendulum swing and a little clock pulse. */
const bongs = (n, t0, gap = 0.6, count = false) => Array.from({ length: n }, (_, k) => [
  { ...BONG, at: t0 + k * gap },
  { do: "wiggle", target: "gclock#pendulum", at: t0 + k * gap, deg: 10, dur: Math.min(0.55, gap) },
  { do: "grow", target: "face", to: 1.12, at: t0 + k * gap, dur: 0.18 },
  { do: "grow", target: "face", to: 1, at: t0 + k * gap + 0.2, dur: 0.22 },
  count ? { do: "caption", text: String(k + 1), style: "count", at: t0 + k * gap, dur: gap - 0.08 } : null,
  count ? say(`${cap(NUM[k])}!`, { at: t0 + k * gap + 0.05, caption: false }) : null,
]);

// ---- Scenes ---------------------------------------------------------------------------------------------------

const scenes = [];
const mouse = A[0];
const PEEK = (a) => [CX + 0.85, 0, -1.55];

// 0:00 The hook: close on the clock, the hand moves to one, BONG, a mouse peeks out.
scenes.push({ id: "hello", title: "Bong! The clock strikes one", beats: [
  beat("h1", 3.0, [
    { do: "camera", ...FACE_CAM, dur: 0 },
    { do: "clock", target: "face", to: "1:00", at: 0.1, dur: 0.8, sound: "tick" },
    bongs(1, 1.0),
    say("Bong! The clock struck one!", { at: 1.15 }),
    { do: "turn", target: "mouse", to: [0, 60, 0], at: 1.4, dur: 0.1 },
    { do: "move", target: "mouse", to: PEEK(mouse), at: 1.7, dur: 0.35, ease: "backOut" },
    { do: "camera", position: [1.0, 1.6, 5.4], lookAt: [1.1, 1.05, -1.2], fov: 40, at: 1.6, dur: 1.2 },
  ]),
  beat("h2", 2.4, [
    { do: "say", who: "mouse", text: "Squeak!", at: 0.1 },
    { do: "wiggle", target: "mouse", at: 0.15, deg: 12, dur: 0.9 },
    say("A little mouse!", { at: "after" }),
    { do: "move", target: "mouse", to: HIDE, at: 1.7, dur: 0.3 },
  ]),
  beat("h3", 2.6, [
    { do: "camera", ...CAM, dur: 1.4 },
    say("Four friends will climb the clock! Count the bongs with me!", { at: 0.1 }),
    showTracker(4, 0.3),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
  ]),
  beat("h4", 2.6, [
    say("Who climbs at four o'clock? A surprise!", { at: 0.1 }),
    { do: "pop", target: "qmark", at: 0.3, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot4", at: 0.6, deg: 12, dur: 1 },
    { do: "grow", target: "slot4", to: 1.2, at: 1.2, dur: 0.3 }, { do: "grow", target: "slot4", to: 1, at: 1.6, dur: 0.3 },
  ]),
]});

A.forEach((a, i) => {
  const n = i + 1;
  const numw = NUM[i];
  const prev = A[i - 1];
  const upLine = `The ${a.id} ${a.verb} up the clock.`;
  const downLine = `The ${a.id} ${a.verb} down,`;

  // Which animal is next? A peek from behind the clock, a clue, 3-2-1, the reveal.
  const who = [];
  if (i > 0) {
    who.push(
      beat(`${a.id}_w1`, 2.4, [
        { do: "camera", position: [1.2, 1.9, 7.2], lookAt: [1.0, 1.1, -1.0], fov: 40, dur: 1.2 },
        say(["Which animal is next? Listen!", "Who is next? Shh...", "One more friend! Listen!"][i - 1], { at: 0.2 }),
        { do: "look", target: "robo", at: 0.2, to: "gclock" },
        { do: "turn", target: a.id, to: [0, 60, 0], at: 0.1, dur: 0.1 },
      ]),
      beat(`${a.id}_w2`, 2.4, [
        { do: "move", target: a.id, to: PEEK(a), at: 0.1, dur: 0.35, ease: "backOut" },
        { do: "say", who: a.id, text: a.sound, at: 0.4 },
        { do: "wiggle", target: a.id, at: 0.5, deg: 10, dur: 1.1 },
        { do: "move", target: a.id, to: HIDE, at: 1.9, dur: 0.3 },
      ]),
    );
  }
  who.push(
    beat(`${a.id}_w3`, 2.4, [
      i === 0 ? { do: "look", target: "robo", at: 0.2, to: "gclock" } : null,
      say(`${a.peek} Who is it?`, { at: 0.1 }),
      { do: "clip", target: "robo", clip: "Yes", at: 0.3 },
    ]),
    beat(`${a.id}_w4`, 2.6, countdown(0.15)),
    beat(`${a.id}_w5`, 2.6, [
      { do: "path", target: a.id, points: [HIDE, [CX + 1.0, 0, -1.4], FRONT], dur: 0.8, face: true },
      { do: "turn", target: a.id, to: [0, -20, 0], at: 0.85, dur: 0.3 },
      { do: "sound", sound: "ding", at: 0.8 },
      { do: "burst", target: "confetti", at: 0.85, dur: 2.2, sound: false },
      { do: "feel", target: a.id, feeling: "joyful", at: 0.85 },
      { do: "shot", target: [a.id, "gclock"], framing: "wide", dur: 0.9 },
      say(`It's ${art(a.id)} ${a.id}!`, { at: 1.0, caption: false }),
      { do: "caption", text: a.id.toUpperCase(), style: "label", at: 1.0, dur: 1.6 },
      { do: "clip", target: "robo", clip: "Jump", at: 0.9 },
      { do: "look", target: "robo", at: 0.9, to: a.id },
    ]),
  );
  scenes.push({ id: `${a.id}_who`, title: i === 0 ? "Who is behind the clock?" : "Which animal is next?", beats: who });

  // The sung verse (verse 1 traditional, verses 2-4 original).
  const up = goUp(a, FRONT, 0.35);
  const down = goDown(a, FRONT, 0.3);
  const yaw = [-12, 14, -8, 18][i];
  scenes.push({ id: `${a.id}_song`, title: `Sing: ${n} o'clock`, music: false, beats: [
    beat(`${a.id}_s1`, tuneDur(T.hick), sung("Hickory, dickory, dock,", T.hick, [
      { do: "camera", ...CAM, dur: 0.8 },
      { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
      { do: "feel", target: a.id, feeling: "happy", at: 0.2 },
      ...[0, 1.5, 3].map((k) => ({ do: "hop", target: a.id, at: onBeat(k), height: 0.25, dur: 0.4 })),
      { do: "wiggle", target: "gclock#pendulum", at: onBeat(0), deg: 8, dur: 1.2 },
      { do: "sound", sound: "tick", at: onBeat(0), volume: 0.35 }, { do: "sound", sound: "tick", at: onBeat(3), volume: 0.35 },
    ])),
    beat(`${a.id}_s2`, up.dur + 0.7, sungMove(upLine, T.up, [
      ...up.acts,
      word("up", 0.7),
      { do: "look", target: "robo", at: 0.5, to: TOP },
      { do: "orbit", around: [CX, 1.6, CZ], degrees: yaw, dur: 3 },
    ])),
    beat(`${a.id}_s3`, tuneDur(T.struck), sung(`The clock struck ${numw},`, T.struck, [
      unword("up", 0.1),
      { do: "clock", target: "face", to: `${n}:00`, at: 0.15, dur: i === 0 ? 0.1 : 0.9, sound: i === 0 ? false : "tick" },
      { do: "camera", ...FACE_CAM, fov: 46, dur: 1.0 },
      { do: "feel", target: a.id, feeling: "surprised", at: 0.4 },
    ])),
    beat(`${a.id}_bong`, 0.5 + n * 0.62, [
      bongs(n, 0.15, 0.62),
      ...Array.from({ length: n }, (_, k) => ({ do: "hop", target: a.id, at: 0.15 + k * 0.62, height: 0.15, dur: 0.3 })),
    ]),
    beat(`${a.id}_s4`, down.dur + 0.55, sungMove(downLine, T.down, [
      { do: "camera", ...CAM, dur: 0.6 },
      { do: "feel", target: a.id, feeling: "joyful", at: 0.1 },
      ...down.acts,
      word("down", 0.5),
      { do: "look", target: "robo", at: 0.5, to: FRONT },
    ])),
    beat(`${a.id}_s5`, tuneDur(T.end), sung("Hickory, dickory, dock.", T.end, [
      unword("down", 0.1),
      { do: "turn", target: a.id, to: [0, -20, 0], at: 0.1, dur: 0.3 },
      { do: "look", target: "robo", at: 0.2, to: "ahead" },
      ...[0, 1.5, 3].map((k) => ({ do: "hop", target: a.id, at: onBeat(k), height: 0.3, dur: 0.4 })),
      { do: "clip", target: "robo", clip: "Jump", at: onBeat(3.5) },
    ])),
  ]});

  // Count the bongs: the clock strikes again, slowly, with the numbers.
  scenes.push({ id: `${a.id}_count`, title: `Count ${n} bong${n > 1 ? "s" : ""}`, beats: [
    beat(`${a.id}_c1`, 2.4, [
      { do: "camera", ...FACE_CAM, dur: 1.0 },
      say(n === 1 ? "Count the bongs with me! Hold up a finger!" : "Count the bongs! Hold up your fingers!", { at: 0.1 }),
      { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    ]),
    beat(`${a.id}_c2`, 0.5 + n * 0.85, bongs(n, 0.25, 0.85, true)),
    beat(`${a.id}_c3`, 2.8, [
      word(numw, 0.1),
      say(i < 2 ? `${cap(numw)} bong${n > 1 ? "s" : ""}! It's ${numw} o'clock!` : `${cap(numw)} bongs! The little hand points to ${numw}!`, { at: 0.1 }),
      i < 2 ? { do: "camera", ...CAM, dur: 1.0 } : { do: "highlight", target: "face", at: 0.6, dur: 1.6 },
      i < 2 ? { do: "point", target: "robo", to: "face", at: 0.5, hold: 1.6 } : null,
    ]),
    i < 2 ? beat(`${a.id}_c4`, 2.4, [
      say(`The little blue hand points to ${numw}!`, { at: 0.1 }),
      { do: "camera", ...FACE_CAM, dur: 0.9 },
      { do: "highlight", target: "face", at: 0.6, dur: 1.6 },
      { do: "wiggle", target: "bubble", at: 0.4, deg: 8, dur: 1.2 },
    ]) : null,
  ].filter(Boolean)});

  // Up or down? The friend goes up again while Robo asks, then comes down to its spot; the tracker fills.
  const up2 = goUp(a, FRONT, 0.2);
  const down2 = goDown(a, a.park, 0.3);
  scenes.push({ id: `${a.id}_updown`, title: "Up or down?", beats: [
    beat(`${a.id}_u1`, Math.max(2.6, up2.dur + 0.4), [
      unword(numw, 0),
      { do: "camera", ...CAM, dur: 0.8 },
      ...up2.acts,
      say(`Look at the ${a.id}! Up or down?`, { at: 0.3 }),
      { do: "look", target: "robo", at: 0.3, to: a.id },
    ]),
    beat(`${a.id}_u2`, 1.8, [
      { do: "sound", sound: "tick", at: 0.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.1, volume: 0.5 },
      { do: "wiggle", target: a.id, at: 0.3, deg: 8, dur: 1.2 },
    ]),
    beat(`${a.id}_u3`, 2.4, [
      word("up", 0.05),
      say(a.praise, { at: 0.1 }),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.4 },
      { do: "say", who: a.id, text: a.sound, at: "after" },
      { do: "hop", target: a.id, at: 0.6, height: 0.25, dur: 0.4 },
    ]),
    beat(`${a.id}_u4`, Math.max(2.4, down2.dur + 0.5), [
      unword("up", 0),
      word("down", 0.25),
      say("And now... down!", { at: 0.1 }),
      ...down2.acts,
      { do: "look", target: "robo", at: 0.3, to: a.park },
    ]),
    beat(`${a.id}_u5`, 1.6, [
      unword("down", 0),
      i === 3 ? { do: "hide", target: "qmark", at: 0.05, dur: 0.2 } : null,
      fillSlot(n, `mini${n}`, 0.25),
      { do: "turn", target: a.id, to: [0, -25, 0], at: 0.1, dur: 0.4 },
      { do: "look", target: "robo", at: 0.2, to: "ahead" },
      say(`${cap(numw)} o'clock!`, { at: 0.3, caption: false }),
    ]),
  ]});
});

// Recap quiz: point to it.
const back = Object.fromEntries(A.map((a) => [a.id, a.park]));
const quizBeats = [
  beat("q0", 2.4, [
    say("Now a quick game!", { at: 0.1 }),
    { do: "camera", ...CAM, dur: 1.2 },
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
  ]),
  ...quizRound({ id: "q1", q: "Who ran up at one o'clock? Point to it!", left: "cat", right: "mouse", answer: "mouse", answerSay: { who: "mouse", text: "Squeak!" }, back, yes: "Yes! The mouse!" }),
  ...quizRound({ id: "q2", q: "Who flew up the clock? Point to it!", left: "duck", right: "frog", answer: "duck", answerSay: { who: "duck", text: "Quack!" }, back, yes: "Yes! The duck!" }),
];
scenes.push({ id: "quiz", title: "Point to it!", beats: quizBeats });

// Last chorus: everybody (original words), the mouse goes up and down once more, then bye-bye.
const fUp = goUp(mouse, mouse.park, 0.3);
const fDown = goDown(mouse, mouse.park, 0.3);
const all = A.map((a) => a.id);
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("z0", 1.8, [say("Everybody sing!", { at: 0.1 }), { do: "clip", target: "robo", clip: "Dance", at: 0.1 }]),
  beat("z1", tuneDur(T.hick), sung("Hickory, dickory, dock,", T.hick, [
    { do: "camera", position: [0.6, 2.5, 11], lookAt: [0.8, 1.3, -0.6], fov: 40, dur: 2.2 },
    ...all.map((id, k) => ({ do: "hop", target: id, at: onBeat(0.5 + k * 0.8), height: 0.3 })),
    ...all.map((id, k) => ({ do: "feel", target: id, feeling: "joyful", at: 0.3 + k * 0.1 })),
  ])),
  beat("z2", fUp.dur + 0.6, sungMove("We all ran up the clock!", T.up, [...fUp.acts, ...["frog", "duck", "cat"].map((id, k) => ({ do: "hop", target: id, at: 0.4 + k * 0.5, height: 0.45 }))])),
  beat("z3", tuneDur(T.struck), sung("The clock struck four,", T.struck, [bongs(4, onBeat(0.5), 0.5)])),
  beat("z4", fDown.dur + 0.5, sungMove("We all ran down,", T.down, [...fDown.acts, ...["frog", "duck", "cat"].map((id, k) => ({ do: "spin", target: id, at: 0.3 + k * 0.4, dur: 0.8 }))])),
  beat("z5", tuneDur(T.end), sung("Hickory, dickory, dock!", T.end, [
    { do: "burst", target: "confetti", at: 0.2, dur: 2.6 },
    ...all.map((id, k) => ({ do: "hop", target: id, at: onBeat(0.5 + k * 0.7), height: 0.35 })),
    ...[1, 2, 3, 4].map((s, k) => ({ do: "wiggle", target: `slot${s}`, at: 0.3 + k * 0.3, deg: 10, dur: 0.5 })),
    { do: "turn", target: "mouse", to: [0, -25, 0], at: 0.2, dur: 0.3 },
  ])),
  beat("z6", 3.2, [
    say("Bye-bye, friends! Tick, tock, bye-bye!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    ...all.map((id, k) => ({ do: "wiggle", target: id, at: 0.4 + k * 0.1, deg: 8, dur: 1.5 })),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.4 },
    { do: "camera", position: [0.5, 3.4, 14], lookAt: [0.6, 1.6, -1], fov: 40, dur: 3 },
  ]),
]});

// ---- Meta -----------------------------------------------------------------------------------------------------

const description = "Sing Hickory Dickory Dock with Robo and count the bongs! Every hour a different friend goes up the big grandfather clock: a mouse at one o'clock, a frog at two, a duck at three and a cat at four. Count the bongs on your fingers, see where the little hand points, shout up or down, and guess which animal is next. Then a point-to-it quiz and one last song with everyone.";
const clockThumb = (at) => [
  { id: "gclock", kind: "prop", model: "grandfather_clock", at },
  { id: "face", kind: "clock", parent: "gclock", at: [0, 1.668, 0.33], size: 0.62, time: "1:00", color: "gold", face: "cream" },
];
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Hickory Dickory Dock", episode: "br05", seed: 305,
    skills: ["count_to_5_prek", "position_words_prek"],
    cast,
    youtube: {
      title: "Hickory Dickory Dock 🕰️ Count the Bongs 1 to 4 Sing-Along for Toddlers | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: counting 1 to 4 (one bong, two bongs...), the words up and down, and that the little hand on the clock points to the hour.\n\nSing at home: say "Bong!" and hold up a finger for each one, point up and down with the animals, and ask "Who's next?" before each verse. The first verse of Hickory Dickory Dock is a traditional public-domain rhyme; the verses for two, three and four o'clock and the last chorus are original words written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["hickory dickory dock", "nursery rhymes", "counting for toddlers", "count to 4", "up and down", "telling time for kids", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "clock", title: "HICKORY DICKORY", subtitle: "Count the bongs 1, 2, 3, 4!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.0, 1.5, 6.4], lookAt: [1.55, 1.4, -0.4], fov: 38 },
        objects: [
          ...clockThumb([3.0, 0, -0.6]),
          { id: "mouse", kind: "critter", species: "mouse", at: [3.0, 2.47, -0.5], size: 0.6, feeling: "joyful" },
          { id: "frog", kind: "critter", species: "frog", at: [3.8, 0, 0.85], size: 0.6, rotation: [0, -20, 0], feeling: "happy" },
          { id: "duck", kind: "critter", species: "duck", at: [4.85, 0, 0.35], size: 0.6, rotation: [0, -30, 0], feeling: "happy" },
        ] },
      { name: "up", title: "UP THE CLOCK!", subtitle: "Who climbs next?", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [1.5, 1.7, 6.0], lookAt: [2.2, 1.45, -0.6], fov: 38 },
        objects: [
          ...clockThumb([3.4, 0, -0.9]),
          { id: "mouse", kind: "critter", species: "mouse", at: [4.02, 1.3, -0.75], size: 0.6, rotation: [0, -90, 0], feeling: "joyful" },
          { id: "cat", kind: "critter", species: "cat", at: [4.5, 0, 0.5], size: 0.65, rotation: [0, -35, 0], feeling: "surprised" },
        ] },
    ],
  }),
  stage: { preset: "playroom" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "hickory_dickory_dock");
