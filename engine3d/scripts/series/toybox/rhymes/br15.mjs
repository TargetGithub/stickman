// Builds ../br15_this_old_man.json: This Old Man (traditional, public domain) as a counting song from one to ten.
// There is no grandpa character in the catalog, so Robo is the drummer: "This Robo, he played one" (the
// syllables of "This old man" fit the tune unchanged). Rhymes: one/thumb, two/shoe, three/knee, four/door,
// five/hive, six/sticks, seven/oven (a gentle concrete swap for "up in heaven"), eight/gate, nine/line (swap for
// "spine"), ten/hen. Each number: the number block pops and we count it on our fingers (two HUD hands), Robo
// asks "what rhymes with ...?" (a pause, then the rhyme object pops), the verse is sung (the full verse for one to
// three, a short two-line verse for four to ten) and a mini number block fills the ten-slot tracker. The hen is
// the surprise friend at ten. Then a point-to-it rhyme quiz and the whole verse once more.
// New models: catalog/models/rhymes_br15.json (drum_sticks, bone, shoe, beehive, garden_gate, washing_line, hen).
// Run: node br15.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects,
  word, unword, showTracker, fillSlot, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// This Old Man (traditional, public domain), key of C, one note per syllable. A two-syllable number or rhyme word
// (seven, oven) splits the line's last long note in two. Sung lines end in a comma or a full stop.
const T = {
  a: (syl = 1) => `G4 E4 G4:2 G4 E4 ${syl === 2 ? "G4 G4" : "G4:2"}`, // This Ro-bo, he played one,
  b: (syl = 1) => `A4 G4 F4 E4 D4 E4 ${syl === 2 ? "F4 F4" : "F4:2"}`, // He played knick-knack on my thumb,
  c: "E4:0.5 F4:0.5 G4 C4 C4:0.5 C4:0.5 C4 C4:0.5 D4:0.5 E4:0.5 F4:0.5 G4:2", // With a knick-knack, pad-dy-whack, give a dog a bone,
  d: "G4 D4 D4 F4 E4 D4 C4:2", // This Ro-bo came rol-ling home.
};
/** The counting scale: one note per number (C4 up to E5), "seven" split in two. */
const SCALE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"];
const countTune = (n) => SCALE.slice(0, n).map((x, k) => (k === 6 ? `${x}:0.5 ${x}:0.5` : x)).join(" ").replace(/(\S+)$/, (m) => (m.includes(":") ? m : `${m}:2`));
const L3 = "With a knick-knack, paddywhack, give a dog a bone,";
const L4 = "This Robo came rolling home.";

// ---- Layout ---------------------------------------------------------------------------------------------------

const CAM = { position: [0.1, 2.0, 8.8], lookAt: [0.1, 1.15, -0.2], fov: 40 };
const DRUM_CAM = { position: [-1.6, 1.55, 4.6], lookAt: [-1.9, 0.75, 0.6], fov: 40 };
// One camera angle per verse, all looking at the middle of the play area.
const VCAM = [
  [0.1, 2.0, 8.8], [1.6, 1.9, 8.5], [-1.4, 2.4, 8.6], [0.8, 1.7, 8.2], [-1.8, 2.1, 8.4],
  [2.0, 2.3, 8.4], [-0.6, 1.8, 8.0], [1.2, 2.6, 8.9], [-1.2, 1.9, 8.2], [0.4, 2.2, 8.6],
].map((p) => ({ position: p, lookAt: [0.2, 1.1, -0.2], fov: 40 }));
const ROBO = [-2.85, 0, 0.35];
const DRUM = [-2.05, 0, 1.0];
const DRUM_SIZE = 1.3;
const SKIN_Y = 0.415 * DRUM_SIZE;
const DOG = [-0.75, 0, 1.55];
const BONE = [-0.3, 0, 2.0];
const NUMSPOT = [0.75, 0, 0.45];
const SPOT = [2.85, 0, 0.25];
const UNDER = (p) => [p[0], -2.2, p[2]]; // hidden objects wait below the grass

const NUM = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const FINGERS = ["index", "middle", "ring", "pinky", "thumb"];
const BLOCK_COLORS = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "brown", "gold"];

// The ten rhyme objects: kind/model/species, size and pose at the spot, and a little action while it is sung.
const R = [
  { w: "thumb", kind: "prop", model: "hand", size: 1.15, rot: [0, -15, 0], act: (at) => [{ do: "wiggle", target: "r_thumb#thumb", at, deg: 25, dur: 0.9 }] },
  { w: "shoe", kind: "prop", model: "shoe", size: 2.6, rot: [0, -55, 0], act: (at) => [{ do: "hop", target: "r_shoe", at, height: 0.3 }] },
  { w: "knee", kind: "prop", model: "icon_knees", size: 1.6, y: 0.8, rot: [0, -10, 0], act: (at) => [{ do: "wiggle", target: "r_knee", at, deg: 10, dur: 0.9 }] },
  { w: "door", kind: "prop", model: "door", size: 0.66, rot: [0, -20, 0], act: (at) => [{ do: "turn", target: "r_door#door", to: [0, -60, 0], at, dur: 0.5 }, { do: "sound", sound: "door_open", at }, { do: "turn", target: "r_door#door", to: [0, 0, 0], at: at + 1.0, dur: 0.5 }] },
  { w: "hive", kind: "prop", model: "beehive", size: 1.25, rot: [0, -20, 0], act: (at) => [{ do: "wiggle", target: "r_hive", at, deg: 8, dur: 0.8 }, { do: "sound", sound: "buzz", at, volume: 0.5 }] },
  { w: "sticks", kind: "prop", model: "drum_sticks", size: 2.4, y: 0.42, rot: [0, -35, 0], act: (at) => [{ do: "hop", target: "r_sticks", at, height: 0.25 }, { do: "sound", sound: "block", at: at + 0.1 }] },
  { w: "oven", syl: 2, kind: "prop", model: "oven", size: 1.35, rot: [0, -20, 0], act: (at) => [{ do: "turn", target: "r_oven#door", to: [70, 0, 0], at, dur: 0.5 }, { do: "turn", target: "r_oven#door", to: [0, 0, 0], at: at + 1.0, dur: 0.5 }, { do: "sound", sound: "ding", at: at + 0.5, volume: 0.6 }] },
  { w: "gate", kind: "prop", model: "garden_gate", size: 1.0, rot: [0, -20, 0], act: (at) => [{ do: "turn", target: "r_gate#gate", to: [0, -70, 0], at, dur: 0.5 }, { do: "turn", target: "r_gate#gate", to: [0, 0, 0], at: at + 1.0, dur: 0.5 }] },
  { w: "line", kind: "prop", model: "washing_line", size: 0.95, rot: [0, -20, 0], act: (at) => [{ do: "wiggle", target: "r_line", at, deg: 5, dur: 1.2 }, { do: "sound", sound: "whoosh", at, volume: 0.4 }] },
  { w: "hen", kind: "critter", species: "hen", size: 0.85, rot: [0, -25, 0], act: (at) => [{ do: "hop", target: "r_hen", at, height: 0.3 }, { do: "say", who: "r_hen", text: "Cluck!", at: at + 0.1 }] },
];
R.forEach((r, i) => Object.assign(r, { n: i + 1, id: `r_${r.w}`, at: [SPOT[0], r.y ?? 0, SPOT[2]] }));

// ---- Objects --------------------------------------------------------------------------------------------------

const objects = [
  { id: "robo", kind: "character", character: "robot", at: ROBO, rotation: [0, 18, 0], feeling: "happy" },
  { id: "drum", kind: "prop", model: "drum", at: DRUM, size: DRUM_SIZE, rotation: [0, 20, 0] },
  { id: "sticks", kind: "prop", model: "drum_sticks", at: [DRUM[0], SKIN_Y, DRUM[2] - 0.02], size: 1.3, rotation: [0, 20, 0] },
  { id: "dog", kind: "critter", species: "dog", at: DOG, size: 0.8, rotation: [0, -10, 0], feeling: "happy" },
  { id: "bone", kind: "prop", model: "bone", at: BONE, size: 0.9, rotation: [0, 25, 0], hidden: true },
  { id: "stand", kind: "shape", shape: "disc", color: "cream", at: [SPOT[0], 0, SPOT[2]], size: 1.5 },
  // Garden dressing, all behind the play area.
  { id: "tree_l", kind: "prop", model: "tree", at: [-6.2, 0, -4.2], size: 1.5 },
  { id: "tree_r", kind: "prop", model: "tree", at: [6.4, 0, -4.6], size: 1.7 },
  { id: "bush_l", kind: "prop", model: "bush", at: [-4.6, 0, -2.8], size: 1.1 },
  { id: "bush_r", kind: "prop", model: "bush", at: [4.9, 0, -2.6], size: 1.0 },
  { id: "house", kind: "prop", model: "house", at: [-0.6, 0, -8.5], size: 1.6 },
  ...[[-3.4, -2.4], [-1.6, -3.0], [1.4, -2.9], [3.6, -2.2], [5.4, -1.0]].map(([x, z], k) => ({ id: `flower${k}`, kind: "prop", model: "flower", at: [x, 0, z], size: 0.7, color: ["pink", "yellow", "purple", "orange", "red"][k] })),
  { id: "cloud1", kind: "prop", model: "cloud", at: [-3.8, 5.6, -9], size: 1.4 },
  { id: "cloud2", kind: "prop", model: "cloud", at: [4.2, 6.2, -10], size: 1.6 },
];
R.forEach((r) => objects.push({ id: r.id, kind: r.kind, ...(r.model ? { model: r.model } : { species: r.species }), at: UNDER(r.at), size: r.size, rotation: r.rot, hidden: true }));
objects.push({ id: "bee", kind: "critter", species: "bee", at: UNDER(SPOT), size: 0.4, hidden: true });
// The big number blocks, one per number, waiting under the grass at the number spot.
NUM.forEach((_, i) => objects.push({ id: `num${i + 1}`, kind: "number_block", value: i + 1, color: BLOCK_COLORS[i], at: UNDER(NUMSPOT), size: 0.95, rotation: [0, -8, 0], hidden: true }));
objects.push({ id: "confetti", kind: "confetti", at: [0.5, 3.4, 0.8] });
// HUD: ten small tracker slots (top left) that fill with mini number blocks, "?" on the tenth; the two counting
// hands (bottom right); the 3-2-1 countdown; the word bubble.
objects.push(...trackerObjects(10, { colors: BLOCK_COLORS, x0: -7.35, step: 0.66, size: 0.56, y: 3.9 }));
NUM.forEach((_, i) => objects.push({ id: `mini${i + 1}`, kind: "number_block", value: i + 1, color: BLOCK_COLORS[i], hud: true, parent: `slot${i + 1}`, at: [0, -0.19, 0.2], size: 0.4, hidden: true }));
objects.push({ id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot10", at: [0, -0.2, 0.2], size: 0.32, hidden: true });
objects.push({ id: "hand1", kind: "prop", model: "hand", hud: true, at: [5.2, -3.6, 0.5], size: 2.1, hidden: true });
objects.push({ id: "hand2", kind: "prop", model: "hand", hud: true, at: [7.0, -3.6, 0.5], size: 2.1, hidden: true });
objects.push(...countdownObjects());
objects.push(...bubbleObjects([
  ...R.map((r) => ({ id: r.w, text: r.w.toUpperCase(), color: "ink" })),
]));

for (const o of objects) if (o.parent === "bubble" && o.text.length >= 5) o.size = o.text.length >= 6 ? 0.24 : 0.27;

const cast = {
  dog: { voice: "soft", pitch: 1.1, speed: 1.05 },
  r_hen: { voice: "squeaky", pitch: 1.1, speed: 1.0 },
};

// ---- Helpers --------------------------------------------------------------------------------------------------

/** Finger k (0-9) of the two counting hands. */
const finger = (k) => `hand${k < 5 ? 1 : 2}#${FINGERS[k % 5]}`;
const foldAll = (at, dur = 0.25) => Array.from({ length: 10 }, (_, k) => ({ do: "turn", target: finger(k), to: [80, 0, 0], at, dur }));
const up = (k, at) => ({ do: "turn", target: finger(k), to: [0, 0, 0], at, dur: 0.2 });
/** Two quick taps of Robo's drum sticks (left then right), with drum sounds. */
const taps = (at, n = 2, gap = 0.22, sound = "drum") => Array.from({ length: n }, (_, k) => {
  const s = k % 2 ? "sticks#stick_r" : "sticks#stick_l";
  const t = at + k * gap;
  return [
    { do: "turn", target: s, to: [-28, 0, 0], at: t, dur: 0.08 },
    { do: "turn", target: s, to: [0, 0, 0], at: t + 0.09, dur: 0.08 },
    sound ? { do: "sound", sound, at: t + 0.16, volume: 0.6 } : null,
  ];
});
/** "Knick-knack!": two wooden clicks on the drum's rim. */
const knickKnack = (at) => [...taps(at, 2, 0.25, "block"), { do: "wiggle", target: "drum", at: at + 0.1, deg: 6, dur: 0.5 }];
const pop = (id, to, at, sound = "pop") => [{ do: "move", target: id, to, at: Math.max(0, at - 0.02), dur: 0.01 }, { do: "pop", target: id, at, dur: 0.4, sound }];
const away = (id, at) => [{ do: "hide", target: id, at, dur: 0.25 }, { do: "move", target: id, to: UNDER(id.startsWith("num") ? NUMSPOT : SPOT), at: at + 0.3, dur: 0.01 }];

// ---- Scenes ---------------------------------------------------------------------------------------------------

const scenes = [];

// 0:00 The hook: knick-knack on the drum, number one pops, count to ten, the tracker and the tenth-slot surprise.
scenes.push({ id: "hello", title: "Knick-knack! Number one", beats: [
  beat("h1", 3.0, [
    { do: "camera", ...DRUM_CAM, dur: 0 },
    foldAll(0, 0),
    say("Knick-knack! Number one!", { at: 0.1 }),
    knickKnack(0.1),
    { do: "camera", ...CAM, at: 0.9, dur: 1.4 },
    pop("num1", NUMSPOT, 1.3, "ding"),
    { do: "caption", text: "1", style: "count", at: 1.4, dur: 1.4 },
    { do: "clip", target: "robo", clip: "Jump", at: 1.3 },
  ]),
  beat("h2", 2.8, [
    say("Let's count to ten with Robo's drum!", { at: 0.1 }),
    showTracker(10, 0.3, 0.14),
    taps(1.9, 4, 0.18),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
    { do: "hop", target: "dog", at: 1.2, height: 0.3 },
  ]),
  beat("h3", 2.6, [
    say("Who comes at number ten? A surprise friend!", { at: 0.1 }),
    { do: "pop", target: "qmark", at: 0.4, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot10", at: 0.7, deg: 12, dur: 1 },
    { do: "grow", target: "slot10", to: 1.25, at: 1.3, dur: 0.3 }, { do: "grow", target: "slot10", to: 1, at: 1.7, dur: 0.3 },
  ]),
]});

R.forEach((r, i) => {
  const n = r.n;
  const nw = NUM[i];
  const prev = R[i - 1];
  const cam = VCAM[i];
  const full = n <= 3;
  const countLine = `${NUM.slice(0, n).map((w, k) => (k ? w : cap(w))).join(", ")}.`;

  // Count: the number block pops (number one is already out), hold up n fingers and count them; the count is sung
  // up the scale (one note per number), so it is measured and fitted like the verses.
  scenes.push({ id: `count${n}`, title: `Number ${n}: count it`, music: false, beats: [
    beat(`v${n}_c1`, 2.0, [
      prev ? away(prev.id, 0) : null,
      prev ? away(`num${n - 1}`, 0) : null,
      prev && prev.w === "hive" ? away("bee", 0) : null,
      { do: "camera", ...cam, dur: 1.0 },
      n > 1 ? pop(`num${n}`, NUMSPOT, 0.3, "ding") : { do: "wiggle", target: "num1", at: 0.3, deg: 10, dur: 0.8 },
      say(n === 1 ? "Number one! Hold up one finger!" : `${cap(nw)}! Hold up ${nw} fingers!`, { at: 0.1 }),
      foldAll(0.05),
      { do: "pop", target: "hand1", at: 0.4, dur: 0.35, sound: false },
      n > 5 ? { do: "pop", target: "hand2", at: 0.5, dur: 0.35, sound: false } : null,
    ]),
    beat(`v${n}_c2`, tuneDur(countTune(n)), [
      say(countLine, { tune: countTune(n), at: 0.1, caption: false }),
      ...Array.from({ length: n }, (_, k) => [
        { do: "caption", text: String(k + 1), style: "count", at: onBeat(k), dur: 0.42 },
        up(k, onBeat(k)),
        { do: "sound", sound: "drum", at: onBeat(k), volume: 0.3 },
        k === n - 1 ? { do: "wiggle", target: `num${n}`, at: onBeat(k), deg: 12, dur: 0.8 } : null,
      ]),
      ...taps(onBeat(0) - 0.1, n, onBeat(1) - onBeat(0), false),
    ]),
  ]});

  // What rhymes with n? A pause, then the rhyme object pops at the stand.
  const answer = n === 10 ? "Hen! A hen! Ten, hen!" : `${cap(r.w)}! ${cap(nw)}, ${r.w}!`;
  scenes.push({ id: `rhyme${n}`, title: `What rhymes with ${nw}?`, music: false, beats: [
    beat(`v${n}_r1`, 2.2, [
      say(n === 1 ? `${cap(nw)}... what rhymes with ${nw}? Say it with me!` : `${cap(nw)}... what rhymes with ${nw}?`, { at: 0.15 }),
      { do: "hide", target: "hand1", at: 0.6, dur: 0.25 },
      n > 5 ? { do: "hide", target: "hand2", at: 0.65, dur: 0.25 } : null,
      { do: "look", target: "robo", at: 0.2, to: "ahead" },
      n === 10 ? { do: "hide", target: "qmark", at: 1.5, dur: 0.2 } : null,
      n === 10 ? { do: "wiggle", target: "slot10", at: 1.5, deg: 12, dur: 0.8 } : null,
      { do: "shot", target: ["stand", `num${n}`], framing: "wide", yaw: [-10, 8, -6, 12, -12, 6, -8, 10, -4, 0][i], dur: 1.2 },
    ]),
    beat(`v${n}_r2`, full ? 1.8 : 1.5, [
      { do: "sound", sound: "tick", at: 0.25, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.05, volume: 0.5 },
      { do: "wiggle", target: "stand", at: 0.2, deg: 8, dur: 1.2 },
    ]),
    beat(`v${n}_r3`, full ? 2.6 : 2.4, [
      pop(r.id, r.at, 0.1, n === 10 ? "magic_sparkle" : "pop"),
      r.w === "hive" ? [pop("bee", [SPOT[0] + 0.55, 1.1, SPOT[2] + 0.5], 0.4, "buzz"), { do: "path", target: "bee", points: [[SPOT[0] + 0.55, 1.1, SPOT[2] + 0.5], [SPOT[0] - 0.5, 1.4, SPOT[2] + 0.6], [SPOT[0] - 0.7, 1.0, SPOT[2] - 0.2], [SPOT[0] + 0.7, 1.25, SPOT[2] + 0.3]], at: 0.6, dur: 1.8 }] : null,
      n === 10 ? [{ do: "burst", target: "confetti", at: 0.2, dur: 2.2, sound: false }, { do: "feel", target: "r_hen", feeling: "joyful", at: 0.3 }] : null,
      word(r.w, 0.15),
      say(answer, { at: 0.2 }),
      r.act(0.7),
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.6 },
    ]),
  ]});

  // The sung verse: the full verse for 1-3, the short one for 4-10.
  const L1 = `This Robo, he played ${nw},`;
  const L2 = `He played knick-knack on my ${r.w}${full ? "," : "."}`;
  const beats = [
    beat(`v${n}_s1`, tuneDur(T.a(nw === "seven" ? 2 : 1)), sung(L1, T.a(nw === "seven" ? 2 : 1), [
      unword(r.w, 0.1),
      { do: "camera", ...cam, dur: 1.0 },
      { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
      { do: "look", target: "robo", at: 0.2, to: "ahead" },
      taps(onBeat(0), 2, onBeat(1) - onBeat(0)), taps(onBeat(3), 2, onBeat(1) - onBeat(0)),
      { do: "hop", target: `num${n}`, at: onBeat(4.5), height: 0.3 },
      { do: "feel", target: "dog", feeling: "joyful", at: 0.2 },
    ])),
    beat(`v${n}_s2`, tuneDur(T.b(r.syl ?? 1)), sung(L2, T.b(r.syl ?? 1), [
      knickKnack(onBeat(2)),
      r.act(onBeat(5)),
      { do: "wiggle", target: "dog", at: onBeat(2), deg: 10, dur: 0.8 },
      full ? null : fillSlot(n, `mini${n}`, onBeat(7)),
    ])),
  ];
  if (full) {
    beats.push(
      beat(`v${n}_s3`, tuneDur(T.c), sung(L3, T.c, [
        { do: "shot", target: ["robo", "drum", "dog"], framing: "wide", yaw: 10, dur: 1.2 },
        knickKnack(onBeat(1)), taps(onBeat(3), 3, onBeat(0.5) - onBeat(0)),
        pop("bone", BONE, onBeat(6), "pop"),
        { do: "hop", target: "dog", at: onBeat(6.5), height: 0.35 },
        { do: "say", who: "dog", text: "Woof!", at: onBeat(7) },
      ])),
      beat(`v${n}_s4`, tuneDur(T.d), sung(L4, T.d, [
        { do: "camera", ...CAM, dur: 1.0 },
        { do: "spin", target: "dog", at: onBeat(2), dur: 1.0 },
        { do: "clip", target: "robo", clip: "Jump", at: onBeat(3) },
        { do: "hide", target: "bone", at: onBeat(5), dur: 0.3 },
        fillSlot(n, `mini${n}`, onBeat(6)),
      ])),
    );
  }
  scenes.push({ id: `sing${n}`, title: `Sing: he played ${nw}`, music: false, beats });
});

// Recap quiz: what rhymes with two? with ten?
const QL = [1.25, 0, 1.0];
const QR = [3.35, 0, 1.0];
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 2.6, [
    away("num10", 0),
    { do: "move", target: "r_hen", to: QR, dur: 0.8, at: 0.1 },
    say("A rhyme game! Point to it!", { at: 0.1 }),
    { do: "camera", ...CAM, dur: 1.2 },
    pop("r_shoe", QL, 0.8, "pop"),
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
  ]),
  ...quizRound({ id: "q1", q: "What rhymes with two? The shoe or the hen?", left: "r_shoe", right: "r_hen", answer: "r_shoe", spots: [QL, QR], yes: "Yes! Two, shoe!" }),
]});

// Last chorus: the whole verse with ten, then bye-bye.
const HEN_END = [1.6, 0, 1.4];
scenes.push({ id: "finale", title: "Everybody sing!", music: false, beats: [
  beat("z0", 1.8, [
    ...away("r_shoe", 0),
    { do: "hide", target: "stand", at: 0.2, dur: 0.3 },
    { do: "path", target: "r_hen", points: [QR, [2.3, 0, 1.3], HEN_END], dur: 1.2, at: 0.2, face: true },
    { do: "turn", target: "r_hen", to: [0, -20, 0], at: 1.45, dur: 0.3 },
    say("Everybody sing!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
    { do: "camera", position: [0.0, 2.0, 8.6], lookAt: [-0.1, 1.0, 0.2], fov: 40, dur: 1.8 },
  ]),
  beat("z1", tuneDur(T.a()), sung("This Robo, he played ten,", T.a(), [
    taps(onBeat(0), 2, onBeat(1) - onBeat(0)), taps(onBeat(3), 2, onBeat(1) - onBeat(0)),
    ...NUM.map((_, k) => ({ do: "wiggle", target: `slot${k + 1}`, at: 0.2 + k * 0.22, deg: 10, dur: 0.5 })),
  ])),
  beat("z2", tuneDur(T.b()), sung("He played knick-knack on my hen,", T.b(), [
    knickKnack(onBeat(2)),
    { do: "hop", target: "r_hen", at: onBeat(5), height: 0.35 },
    { do: "feel", target: "r_hen", feeling: "joyful", at: 0.2 },
  ])),
  beat("z3", tuneDur(T.c), sung(L3, T.c, [
    knickKnack(onBeat(1)), taps(onBeat(3), 3, onBeat(0.5) - onBeat(0)),
    pop("bone", BONE, onBeat(6), "pop"),
    { do: "hop", target: "dog", at: onBeat(6.5), height: 0.35 },
    { do: "say", who: "dog", text: "Woof!", at: onBeat(7) },
  ])),
  beat("z4", tuneDur(T.d), sung(L4, T.d, [
    { do: "spin", target: "dog", at: onBeat(1), dur: 1.0 },
    { do: "spin", target: "r_hen", at: onBeat(2), dur: 1.0 },
    { do: "clip", target: "robo", clip: "Jump", at: onBeat(3) },
    { do: "burst", target: "confetti", at: onBeat(4), dur: 2.6 },
  ])),
  beat("z5", 3.2, [
    say("Bye-bye, friends! Knick-knack, bye-bye!", { at: 0.2 }),
    knickKnack(2.0),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    { do: "wiggle", target: "dog", at: 0.4, deg: 8, dur: 1.5 }, { do: "wiggle", target: "r_hen", at: 0.5, deg: 8, dur: 1.5 },
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.6, dur: 2.4 },
    { do: "camera", position: [0.0, 2.6, 11], lookAt: [0.0, 1.3, -0.4], fov: 40, dur: 3 },
  ]),
]});

// ---- Meta -----------------------------------------------------------------------------------------------------

const description = "Count from one to ten with Robo's drum! Sing This Old Man with Robo the drummer: he played one, knick-knack on my thumb, two on my shoe, three on my knee, all the way to ten on my hen. For every number the number block pops up, we hold up our fingers and count, and then guess the rhyme: two... what rhymes with two? Shoe! Watch the number tracker fill from 1 to 10, meet the surprise friend at ten, play a point-to-it rhyme game, and sing the whole song once more with the dog and his bone.";
const thumbBase = (extra = []) => [
  { id: "drum", kind: "prop", model: "drum", at: [2.6, 0, 0.6], size: 1.4, rotation: [0, -15, 0] },
  { id: "sticks", kind: "prop", model: "drum_sticks", at: [2.6, 0.58, 0.58], size: 1.4, rotation: [0, -15, 0] },
  ...extra,
];
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "This Old Man Counts to Ten", episode: "br15", seed: 315,
    skills: ["count_to_10_k", "rhyming_k"],
    cast,
    youtube: {
      title: "This Old Man 🥁 Count to 10 and Rhyme Sing-Along for Toddlers | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: counting from 1 to 10 on their fingers, the numbers 1 to 10 in order, and rhyming words (two and shoe, four and door, ten and hen).\n\nSing at home: hold up a finger for each number, tap knick-knack on your knees like a drum, and pause before each rhyme so your child can shout it: "Two... what rhymes with two?" This Old Man is a traditional public-domain song; Robo sings "This Robo" in place of "This old man", and two gentle word swaps (seven/oven, nine/line) replace the old lines.\n\n${YT_TAIL}`,
      tags: ["this old man", "knick knack paddywhack", "nursery rhymes", "counting to 10", "count to ten", "rhyming words for kids", "numbers for toddlers", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "drum", title: "THIS OLD MAN", subtitle: "Count to 10 with Robo!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "garden",
        camera: { position: [0.9, 1.5, 6.6], lookAt: [1.5, 1.1, -0.2], fov: 38 },
        objects: thumbBase([
          { id: "robo", kind: "character", character: "robot", at: [3.6, 0, -0.3], rotation: [0, -30, 0], clip: "Wave", feeling: "happy" },
          { id: "n1", kind: "number_block", value: 1, color: "red", at: [5.0, 0, 0.3], size: 0.7, rotation: [0, -20, 0] },
          { id: "n2", kind: "number_block", value: 2, color: "orange", at: [5.0, 0.7, 0.3], size: 0.55, rotation: [0, -30, 0] },
          { id: "dog", kind: "critter", species: "dog", at: [3.75, 0, 1.75], size: 0.75, rotation: [0, -30, 0], feeling: "joyful" },
          { id: "bone", kind: "prop", model: "bone", at: [3.0, 0, 2.15], size: 0.9, rotation: [0, 20, 0] },
        ]) },
      { name: "rhyme", title: "KNICK-KNACK!", subtitle: "Two... shoe! Ten... hen!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "garden",
        camera: { position: [1.1, 1.45, 6.2], lookAt: [1.8, 1.0, -0.2], fov: 38 },
        objects: [
          { id: "n2", kind: "number_block", value: 2, color: "orange", at: [2.3, 0, 0.6], size: 0.75, rotation: [0, 15, 0] },
          { id: "shoe", kind: "prop", model: "shoe", at: [3.2, 0, 1.2], size: 1.7, rotation: [0, -50, 0] },
          { id: "n10", kind: "number_block", value: 10, color: "gold", at: [4.0, 0, -0.2], size: 0.75, rotation: [0, -10, 0] },
          { id: "hen", kind: "critter", species: "hen", at: [4.85, 0, 0.75], size: 0.85, rotation: [0, -30, 0], feeling: "joyful" },
        ] },
    ],
  }),
  stage: { preset: "garden" },
  camera: CAM,
  objects,
  scenes,
};
writeRhyme(script, "this_old_man");
