// Builds ../br13_pat_a_cake.json: Pat-a-Cake, Baker's Man (traditional, public domain: "roll it and pat it and
// mark it with B, and put it in the oven for baby and me") plus two original verses that mark cakes for friends
// (C for Cat, D for Duck). Robo the baker mixes, the dough is rolled, patted and marked with a letter, goes in the
// oven, and a cake comes out with the letter on top. Pip the toddler (catalog/models/rhymes_br04.json) claps and
// pats an AB pattern (CLAP / PAT icons pop on the HUD), we copy it, guess "Which comes next?", name each cake's
// letter, and the three decorated cakes fill the tracker. New models: catalog/models/rhymes_br13.json.
// Run: node br13.mjs, then node tools/sung_durs.mjs on the JSON, then this again (see README.md).
import {
  say, beat, sung, onBeat, tuneDur, trackerObjects, countdownObjects, bubbleObjects, countdown,
  word, unword, showTracker, fillSlot, yourTurn, quizRound, writeRhyme, rhymeMeta, YT_TAIL,
} from "./kit.mjs";

// The rhyme is traditionally chanted with a clapping game; this is a simple sing-song tune in its rhythm (an
// original arrangement in C), one note per syllable. Sung lines end in a comma or a full stop ("!" slows the TTS).
const T = {
  l1: "C4 C4:0.5 C4:0.5 E4 E4:0.5 E4:0.5 G4 G4 E4:2", // Pat-a-cake, pat-a-cake, ba-ker's man,
  l2: "F4 F4:0.5 F4:0.5 E4 E4:0.5 E4:0.5 D4 D4 C4:2", // bake me a cake as fast as you can,
  l3: "C4 C4:0.5 C4:0.5 E4 E4:0.5 E4:0.5 G4 G4:0.5 G4:0.5 C5:2", // roll it and pat it and mark it with B,
  l4: "F4:0.5 F4:0.5 F4:0.5 F4:0.5 E4:0.5 E4:0.5 E4:0.5 E4:0.5 D4 D4 D4 C4:2", // and put it in the o-ven for ba-by and me.
};
const L1 = "Pat-a-cake, pat-a-cake, baker's man,";
const L2 = "bake me a cake as fast as you can,";

// ---- Pip's poses (absolute degrees, from a small IK solve on the toddler model; see br04.mjs) ------------------
const ARM_REST = [0, 0, 8];
const POSES = {
  rest: { hip: 0, arm: ARM_REST, fore: [0, 0, 0] },
  clap: { hip: 0, arm: [-44, -55, 4], fore: [-95, -3, 3] }, // hands together in front of the chest
  open: { hip: 0, arm: [-28, -15, 24], fore: [-120, 2, -5] }, // hands apart, ready to clap
  pat: { hip: 25, arm: [-18, 32, -16], fore: [1, -4, -3] }, // a little bow, hands on the lap
  yay: { hip: -6, arm: [0, 0, 150], fore: [0, 0, 25] },
};
const off = (a) => a.map((v, i) => v - ARM_REST[i]);
const mir = (a) => [a[0], -a[1], -a[2]];
function pose(name, at = 0.1, dur = 0.28) {
  const p = POSES[name];
  return [
    { do: "turn", target: "pip#head", to: [p.hip, 0, 0], at, dur },
    { do: "turn", target: "pip#arm_l", to: off(p.arm), at, dur },
    { do: "turn", target: "pip#fore_l", to: p.fore, at, dur },
    { do: "turn", target: "pip#arm_r", to: mir(off(p.arm)), at, dur },
    { do: "turn", target: "pip#fore_r", to: mir(p.fore), at, dur },
  ];
}
// A clap (hands meet, a wooden "block" click) or a pat (bow, hands on the lap, a soft "land"); each takes 0.3 s.
const clapAt = (t) => [pose("clap", t, 0.1), { do: "sound", sound: "block", at: t + 0.08, volume: 0.8 }, pose("open", t + 0.15, 0.12)];
const patAt = (t) => [pose("pat", t, 0.12), { do: "sound", sound: "land", at: t + 0.1, volume: 0.9 }, pose("open", t + 0.18, 0.12)];
const moveAt = (m, t) => (m === "clap" ? clapAt(t) : patAt(t));

// ---- The set ---------------------------------------------------------------------------------------------------
const TOP = 0.8; // table top
const CAM = { position: [0.4, 1.95, 6.7], lookAt: [0.4, 0.95, -0.6], fov: 40 };
const TABLE_CAM = { position: [0.1, 1.85, 3.5], lookAt: [0.15, 0.92, -0.45], fov: 40 };
const PIP_CAM = { position: [1.4, 1.42, 3.7], lookAt: [2.05, 0.92, 0.2], fov: 40 };
const OVEN_CAM = { position: [-1.0, 1.75, 3.7], lookAt: [-1.45, 0.95, -0.85], fov: 40 };
const FRIEND_CAM = { position: [1.9, 1.55, 4.6], lookAt: [2.8, 0.7, -0.1], fov: 40 };
const cakeCam = (x) => ({ position: [x - 0.45, 1.5, 0.95], lookAt: [x - 0.05, 0.97, -0.42], fov: 40 });

const OV = { at: [-2.6, 0, -1.0], size: 1.6, yaw: 25 };
/** A point in the oven's own frame (home_school.json oven, size 1) → world. */
function ovenPt([x, y, z], dy = 0) {
  const a = (OV.yaw * Math.PI) / 180;
  const r = (v) => Math.round(v * 1000) / 1000;
  return [r(OV.at[0] + OV.size * (x * Math.cos(a) + z * Math.sin(a))), r(OV.size * y + dy), r(OV.at[2] + OV.size * (-x * Math.sin(a) + z * Math.cos(a)))];
}
const DOUGH_R = 0.15;
const DOUGH_SPOT = [-0.15, TOP + DOUGH_R, -0.35];
const DOUGH_ROLLED = [0.12, TOP + DOUGH_R, -0.35];
const DOUGH_FLAT = [0.12, TOP + DOUGH_R * 0.6, -0.35];
const DOUGH_IN = ovenPt([0, 0.31, -0.03], DOUGH_R * 0.6);
const onDough = ([x, y, z]) => [x, Math.round((y + 0.075) * 1000) / 1000, Math.round((z + 0.06) * 1000) / 1000];
const CAKE_IN = ovenPt([0, 0.31, -0.03]);
const OUT = ovenPt([0, 0.44, 0.9]); // just out, over the open door
const MID = [-1.25, 1.35, -0.25];
const BOWL = [-0.85, TOP, -0.5];
const PIP = [2.2, 0, 0.3];
const PIP_YAW = -30;

// The three cakes, in order: B (traditional, for baby: Pip), C for Cat, D for Duck (original verses).
const C = [
  { L: "B", l: "b", who: "pip", name: "Pip", forWhom: "baby", frost: "pink", ink: "blue", slot: "pink", x: 0.45, word: "B is for baby." },
  { L: "C", l: "c", who: "cat", name: "Cat", forWhom: "Kitty", frost: "yellow", ink: "purple", slot: "orange", x: 0.95, word: "C is for Cat." },
  { L: "D", l: "d", who: "duck", name: "Duck", forWhom: "Duckie", frost: "mint", ink: "red", slot: "green", x: 1.45, word: "D is for Duck." },
];
const cakeSpot = (c) => [c.x, TOP, -0.4];
const F = {
  cat: { at: [3.05, 0, -0.55], yaw: -40, size: 0.75, from: [8.5, 0, -0.9], sound: "Meow, meow!", ask: "Who says meow?" },
  duck: { at: [3.5, 0, 0.5], yaw: -45, size: 0.7, from: [8.6, 0, 0.6], sound: "Quack, quack!", ask: "Who says quack?" },
};

// ---- Objects --------------------------------------------------------------------------------------------------
const PAT_X = [-2.4, -0.8, 0.8, 2.4];
const PAT_Y = 3.3;
const objects = [
  { id: "robo", kind: "character", character: "robot", at: [-0.35, 0, -1.3], rotation: [0, 0, 0], feeling: "happy" },
  { id: "hat", kind: "prop", model: "baker_hat", parent: "robo", at: [0, 1.6, 0], size: 1.0 },
  { id: "pip", kind: "critter", species: "toddler", at: PIP, rotation: [0, PIP_YAW, 0], size: 1.05, feeling: "happy" },
  { id: "cat", kind: "critter", species: "cat", at: F.cat.from, rotation: [0, -90, 0], size: F.cat.size, hidden: true },
  { id: "duck", kind: "critter", species: "duck", at: F.duck.from, rotation: [0, -90, 0], size: F.duck.size, hidden: true },
  { id: "oven", kind: "prop", model: "oven", at: OV.at, rotation: [0, OV.yaw, 0], size: OV.size },
  { id: "table1", kind: "prop", model: "table", at: [-0.5, 0, -0.45] },
  { id: "table2", kind: "prop", model: "table", at: [0.9, 0, -0.45] },
  { id: "shelf", kind: "prop", model: "shelf", at: [-5.4, 0, -2.6], rotation: [0, 25, 0] },
  { id: "plant", kind: "prop", model: "plant", at: [5.3, 0, -2.4], size: 1.2 },
  { id: "bowl", kind: "prop", model: "baking_bowl", color: "sky", at: BOWL, size: 1.2 },
  { id: "spoon", kind: "prop", model: "mixing_spoon", parent: "bowl", at: [0.03, 0.19, 0], rotation: [0, 0, 18], size: 1.15 },
  { id: "dough", kind: "shape", shape: "sphere", color: "dough", material: "matte", at: DOUGH_SPOT, size: DOUGH_R * 2, hidden: true },
  // The hook cake (a "B" pops on it), then hidden.
  { id: "cake0", kind: "prop", model: "plain_cake", color: "white", at: [0.75, TOP, -0.2], size: 1.4 },
  { id: "cake0_l", kind: "letter", text: "B", color: "blue", parent: "cake0", at: [0, 0.285, 0], size: 0.24, hidden: true },
  { id: "confetti", kind: "confetti", at: [0.5, 3.0, 0.2] },
];
for (const c of C) {
  // The letter marked on the dough stands on it (not parented: it would be squashed with the pat) and flies with it.
  objects.push({ id: `dough_${c.l}`, kind: "letter", text: c.L, color: c.ink, at: onDough(DOUGH_FLAT), size: 0.17, hidden: true });
  objects.push({ id: `cake_${c.l}`, kind: "prop", model: "plain_cake", color: c.frost, at: CAKE_IN, rotation: [0, OV.yaw, 0], hidden: true });
  objects.push({ id: `cake_${c.l}_l`, kind: "letter", text: c.L, color: c.ink, parent: `cake_${c.l}`, at: [0, 0.205, 0], size: 0.17 });
}
// HUD: three cake slots (each fills with its decorated cake), "?" on the last, the clap/pat pattern row,
// the countdown and the word bubble.
objects.push(...trackerObjects(3, { colors: C.map((c) => c.slot) }));
C.forEach((c, i) => {
  objects.push({ id: `mini${i + 1}`, kind: "prop", model: "plain_cake", color: c.frost, hud: true, parent: `slot${i + 1}`, at: [0, -0.3, 0.15], rotation: [18, 0, 0], size: 1.25, hidden: true });
  objects.push({ id: `mini${i + 1}_l`, kind: "letter", text: c.L, color: c.ink, hud: true, parent: `mini${i + 1}`, at: [0, 0.25, 0], size: 0.22 });
});
objects.push({ id: "qmark", kind: "letter", text: "?", color: "orange", hud: true, parent: "slot3", at: [0, -0.26, 0.2], size: 0.42, hidden: true });
PAT_X.forEach((x, i) => {
  const n = i + 1;
  objects.push({ id: `pc${n}`, kind: "prop", model: "clap_icon", color: "yellow", hud: true, at: [x, PAT_Y, 0], size: 1.5, hidden: true });
  objects.push({ id: `pc${n}_t`, kind: "letter", text: "CLAP", color: "ink", hud: true, parent: `pc${n}`, at: [0, -1.12, 0.05], size: 0.27 });
  objects.push({ id: `pp${n}`, kind: "prop", model: "pat_icon", color: "sky", hud: true, at: [x, PAT_Y, 0], size: 1.5, hidden: true });
  objects.push({ id: `pp${n}_t`, kind: "letter", text: "PAT", color: "ink", hud: true, parent: `pp${n}`, at: [0, -1.12, 0.05], size: 0.27 });
});
objects.push({ id: "pq", kind: "letter", text: "?", color: "orange", hud: true, at: [PAT_X[3], PAT_Y - 0.65, 0], size: 0.95, hidden: true });
objects.push(...countdownObjects());
objects.push(...bubbleObjects([
  { id: "b", text: "B", color: "blue" }, { id: "c", text: "C", color: "purple" }, { id: "d", text: "D", color: "red" },
  { id: "clap", text: "CLAP", color: "orange" }, { id: "pat", text: "PAT", color: "blue" }, { id: "yum", text: "YUM!", color: "orange" },
]));
for (const id of ["b", "c", "d"]) Object.assign(objects.find((o) => o.id === `w_${id}`), { size: 0.62, at: [0, -0.48, 0.18] });

const cast = { pip: { voice: "squeaky", pitch: 1.2, speed: 1 }, cat: { voice: "soft", pitch: 1.25, speed: 1 }, duck: { voice: "squeaky", pitch: 1.0, speed: 1.05 } };
const pipSay = (text, at = 0.1) => ({ do: "say", who: "pip", text, at });
const HOP = (id, at, height = 0.25) => ({ do: "hop", target: id, at, height, dur: 0.4 });

// ---- Pattern helpers --------------------------------------------------------------------------------------------
/** Pop pattern icon n (1-4) as "clap" or "pat". */
const popIcon = (m, n, at) => ({ do: "pop", target: `${m === "clap" ? "pc" : "pp"}${n}`, at, dur: 0.3, sound: "pop" });
/** Hide every icon of a pattern. */
const hideIcons = (pat, at = 0.05) => pat.map((m, i) => ({ do: "hide", target: `${m === "clap" ? "pc" : "pp"}${i + 1}`, at: at + i * 0.05, dur: 0.2 }));
/** Pip does the pattern (and each icon wiggles with it), one move every `gap` seconds from t0. */
const doPattern = (pat, t0, gap = 0.6, wiggle = true) => pat.map((m, i) => [
  moveAt(m, t0 + i * gap),
  wiggle ? { do: "wiggle", target: `${m === "clap" ? "pc" : "pp"}${i + 1}`, at: t0 + i * gap, deg: 12, dur: 0.4 } : null,
]);

/** "Which comes next?": three icons pop as Pip does them, "?", 3-2-1, Pip does the answer and its icon pops. */
function whichNext(id, pat, line) {
  const ans = pat[3];
  return { id, title: "Which comes next?", beats: [
    beat(`${id}1`, 3.4, [
      { do: "camera", ...PIP_CAM, dur: 1.0 },
      say(line, { at: 0.2 }),
      pat.slice(0, 3).map((m, i) => [popIcon(m, i + 1, 0.3 + i * 0.75), moveAt(m, 0.3 + i * 0.75)]),
      { do: "pop", target: "pq", at: 2.6, dur: 0.35, sound: "magic_sparkle" },
      pose("rest", 2.75, 0.3),
    ]),
    beat(`${id}2`, 2.6, [
      say("What comes next? Clap or pat?", { at: 0.1 }),
      { do: "wiggle", target: "pq", at: 0.3, deg: 14, dur: 1.6 },
      { do: "look", target: "pip", at: 0.2, to: [0, 1.4, 8] },
    ]),
    beat(`${id}3`, 2.8, [...countdown(0.1), { do: "wiggle", target: "pq", at: 0.2, deg: 10, dur: 2 }]),
    beat(`${id}4`, 3.0, [
      { do: "hide", target: "pq", at: 0.1, dur: 0.15 },
      popIcon(ans, 4, 0.2), { do: "sound", sound: "ding", at: 0.3 },
      moveAt(ans, 0.2),
      pipSay(ans === "pat" ? "Pat!" : "Clap!", 0.15),
      say(`Yes! ${ans === "pat" ? "Pat" : "Clap"}! ${pat.join(", ").replace(/^./, (s) => s.toUpperCase())}!`, { at: "after" }),
      { do: "look", target: "pip", at: 0.1, to: "ahead" },
      { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.6 },
    ]),
    beat(`${id}6`, 1.0, [hideIcons(pat, 0.05), pose("rest", 0.1, 0.3)]),
  ]};
}

// ---- Scenes ---------------------------------------------------------------------------------------------------
const scenes = [];
const AB = ["clap", "pat", "clap", "pat"];

// 0:00 The hook: Pip claps and a "B!" pops on the cake.
scenes.push({ id: "hello", title: "Clap! B!", beats: [
  beat("h1", 2.6, [
    { do: "camera", position: [1.35, 1.36, 3.0], lookAt: [1.45, 0.9, -0.2], fov: 40, dur: 0 },
    clapAt(0.25),
    { do: "pop", target: "cake0_l", at: 0.4, dur: 0.4, sound: "magic_sparkle" },
    say("Clap! B!", { at: 0.45 }),
    { do: "wiggle", target: "cake0", at: 0.6, deg: 8, dur: 0.8 },
    clapAt(1.5),
    { do: "feel", target: "pip", feeling: "joyful", at: 0.3 },
  ]),
  beat("h2", 2.6, [
    say("B on a cake! Pat-a-cake!", { at: 0.1 }),
    { do: "wiggle", target: "cake0_l", at: 0.3, deg: 12, dur: 1 },
    patAt(1.2), clapAt(1.75),
    { do: "clip", target: "robo", clip: "Jump", at: 0.3 },
  ]),
  beat("h3", 3.0, [
    { do: "camera", ...CAM, dur: 1.2 },
    say("Let's bake three cakes with letters!", { at: 0.1 }),
    showTracker(3, 0.5),
    { do: "clip", target: "robo", clip: "Wave", at: 0.3 },
    pose("rest", 0.2, 0.3),
  ]),
  beat("h4", 2.6, [
    say("Who gets the last cake? A surprise!", { at: 0.1 }),
    { do: "pop", target: "qmark", at: 0.4, dur: 0.4, sound: "magic_sparkle" },
    { do: "wiggle", target: "slot3", at: 0.7, deg: 12, dur: 1 },
    { do: "hide", target: "cake0", at: 1.9, dur: 0.4 },
    { do: "sound", sound: "whoosh", at: 1.9, volume: 0.4 },
  ]),
]});

// Clap and pat: the AB pattern, then copy it.
scenes.push({ id: "pattern", title: "Clap, pat!", beats: [
  beat("p1", 2.4, [
    { do: "camera", ...PIP_CAM, dur: 1.0 },
    say("Pip, show me a clap!", { at: 0.1 }),
    clapAt(1.4), popIcon("clap", 1, 1.45), word("clap", 1.45),
    pipSay("Clap!", 1.5),
  ]),
  beat("p2", 2.4, [
    unword("clap", 0.1),
    say("Now pat your lap!", { at: 0.1 }),
    patAt(1.3), popIcon("pat", 2, 1.35), word("pat", 1.4),
    pipSay("Pat!", 1.45),
  ]),
  beat("p4", 3.2, [
    unword("pat", 0.1),
    say("Clap, pat, clap, pat. A pattern!", { at: 0.1 }),
    doPattern(AB, 0.25, 0.55),
    popIcon("clap", 3, 1.35), popIcon("pat", 4, 1.9),
    { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
    { do: "sound", sound: "sparkle", at: 2.6, volume: 0.6 },
  ]),
  // Copy the pattern: the icons light up one by one while the child (and Pip) claps and pats.
  beat("p5", 2.4, [
    say("Your turn! Copy me!", { at: 0.1 }),
    { do: "look", target: "pip", at: 0.2, to: [0, 1.4, 8] },
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    pose("open", 1.2, 0.3),
  ]),
  beat("p6", 3.2, [
    doPattern(AB, 0.25, 0.7),
    ...AB.map((m, i) => ({ do: "grow", target: `${m === "clap" ? "pc" : "pp"}${i + 1}`, to: 1.2, at: 0.25 + i * 0.7, dur: 0.15 })),
    ...AB.map((m, i) => ({ do: "grow", target: `${m === "clap" ? "pc" : "pp"}${i + 1}`, to: 1, at: 0.5 + i * 0.7, dur: 0.15 })),
  ]),
  beat("p7", 2.2, [
    say("Yay! You did it!", { at: 0.1 }),
    { do: "clip", target: "robo", clip: "ThumbsUp", at: 0.3 },
    { do: "sound", sound: "crowd_cheer", at: 0.2, volume: 0.35 },
    pose("yay", 0.2, 0.3), { do: "feel", target: "pip", feeling: "joyful", at: 0.2 },
    hideIcons(AB, 1.3),
    { do: "look", target: "pip", at: 1.2, to: "ahead" },
  ]),
]});

/** One cake: mix, the sung verse (roll, pat, mark, oven), 3-2-1, the cake comes out, what letter is it? */
function cakeScenes(c, i) {
  const n = i + 1;
  const dl = `dough_${c.l}`;
  const cake = `cake_${c.l}`;
  const L3 = `roll it and pat it and mark it with ${c.L},`;
  const L4 = `and put it in the oven for ${c.forWhom} and me.`;
  const out = [];
  out.push({ id: `mix_${c.l}`, title: `A cake for ${c.name}`, beats: [
    beat(`m_${c.l}1`, 3.2, [
      { do: "camera", ...TABLE_CAM, dur: 1.0 },
      say([`A cake for baby Pip! Mix, mix, mix!`, "A cake for Cat! Mix, mix, mix!", "A cake for Duck! Mix, mix, mix!"][i], { at: 0.1 }),
      { do: "spin", target: "spoon", turns: 3, dur: 2.2, at: 0.6, ease: "linear" },
      { do: "wiggle", target: "bowl", at: 0.6, deg: 4, dur: 2 },
      { do: "point", target: "robo", to: "bowl", at: 0.3, hold: 2.2 },
      i === 0 ? pose("rest", 0.1, 0.3) : null,
    ]),
    beat(`m_${c.l}2`, 2.0, [
      say("Here is the dough!", { at: 0.1 }),
      { do: "move", target: "dough", to: [BOWL[0], TOP + 0.3, BOWL[2]], at: 0, dur: 0.01 },
      { do: "pop", target: "dough", at: 0.3, dur: 0.3, sound: "bubble_pop" },
      { do: "path", target: "dough", points: [[BOWL[0], TOP + 0.3, BOWL[2]], [-0.5, TOP + 0.55, -0.4], DOUGH_SPOT], at: 0.55, dur: 0.8 },
      { do: "sound", sound: "boing", at: 1.35, volume: 0.5 },
    ]),
  ]});
  out.push({ id: `sing_${c.l}`, title: i === 0 ? "Sing: Pat-a-cake" : `Sing: mark it with ${c.L}`, music: false, beats: [
    beat(`s_${c.l}1`, tuneDur(T.l1), sung(L1, T.l1, [
      { do: "camera", ...[PIP_CAM, FRIEND_CAM, PIP_CAM][i], dur: 0.8 },
      { do: "clip", target: "robo", clip: "Dance", at: 0.1 },
      clapAt(onBeat(0)), patAt(onBeat(2)), clapAt(onBeat(4)), patAt(onBeat(6)),
      i > 0 ? HOP(c.who, onBeat(1), 0.2) : null, i > 0 ? HOP(c.who, onBeat(5), 0.2) : null,
    ])),
    beat(`s_${c.l}2`, tuneDur(T.l2), sung(L2, T.l2, [
      { do: "camera", ...TABLE_CAM, dur: 0.8 },
      { do: "spin", target: "spoon", turns: 3, dur: 2.6, at: 0.3, ease: "linear" },
      { do: "wiggle", target: "bowl", at: 0.3, deg: 5, dur: 2.4 },
      pose("rest", 0.1, 0.25),
    ])),
    beat(`s_${c.l}3`, tuneDur(T.l3), sung(L3, T.l3, [
      { do: "orbit", around: [0.0, 0.95, -0.4], degrees: [14, -14, 16][i], dur: 3 },
      // roll it: the dough rolls to the right
      { do: "move", target: "dough", to: DOUGH_ROLLED, at: onBeat(0), dur: 0.55 },
      { do: "spin", target: "dough", axis: "z", turns: -0.6, at: onBeat(0), dur: 0.55 },
      // pat it: squash
      { do: "grow", target: "dough", to: [1.3, 0.6, 1.3], at: onBeat(2), dur: 0.15 },
      { do: "move", target: "dough", to: DOUGH_FLAT, at: onBeat(2), dur: 0.15 },
      { do: "sound", sound: "land", at: onBeat(2) + 0.1, volume: 0.9 },
      // mark it with the letter
      { do: "pop", target: dl, at: onBeat(5.5), dur: 0.35, sound: "pop" },
      word(c.l, onBeat(6)),
    ])),
    beat(`s_${c.l}4`, tuneDur(T.l4), sung(L4, T.l4, [
      unword(c.l, 0.1),
      { do: "camera", ...OVEN_CAM, dur: 0.9 },
      { do: "turn", target: "oven#door", to: [85, 0, 0], at: onBeat(0), dur: 0.4, ease: "backOut" },
      { do: "sound", sound: "door_open", at: onBeat(0), volume: 0.45 },
      { do: "path", target: "dough", points: [DOUGH_FLAT, MID, OUT, DOUGH_IN], at: onBeat(0.6), dur: 0.9 },
      { do: "path", target: dl, points: [DOUGH_FLAT, MID, OUT, DOUGH_IN].map(onDough), at: onBeat(0.6), dur: 0.9 },
      { do: "turn", target: "oven#door", to: [0, 0, 0], at: onBeat(5), dur: 0.35 },
      { do: "sound", sound: "clink", at: onBeat(5.5), volume: 0.5 },
      HOP(c.who, onBeat(6), 0.3),
      { do: "point", target: "robo", to: c.who, at: onBeat(6), hold: 1.0 },
    ])),
  ]});
  out.push({ id: `bake_${c.l}`, title: "Ding! A cake!", beats: [
    beat(`o_${c.l}2`, 3.8, [
      say(["Bake, bake! Count with me!", "Bake! Count with me!", "Bake! Let's count!"][i], { at: 0.1, caption: false }),
      { do: "sound", sound: "windup_click", at: 0.2, volume: 0.4 },
      ...countdown(1.3), { do: "wiggle", target: "oven", at: 0.2, deg: 2, dur: 3.4 },
    ]),
    beat(`o_${c.l}3`, 3.2, [
      { do: "hide", target: "dough", at: 0, dur: 0.05 },
      { do: "hide", target: dl, at: 0, dur: 0.05 },
      { do: "show", target: cake, at: 0.06, dur: 0.05 },
      { do: "turn", target: "oven#door", to: [85, 0, 0], at: 0.15, dur: 0.45, ease: "backOut" },
      { do: "sound", sound: "ding", at: 0.5 },
      say("Ding! A cake!", { at: 0.5 }),
      { do: "path", target: cake, points: [CAKE_IN, OUT, MID, cakeSpot(c)], at: 0.65, dur: 1.4 },
      { do: "turn", target: cake, to: [0, 0, 0], at: 1.0, dur: 0.6 },
      { do: "turn", target: "oven#door", to: [0, 0, 0], at: 2.3, dur: 0.4 },
      { do: "sound", sound: "sparkle", at: 2.1, volume: 0.6 },
      { do: "clip", target: "robo", clip: "Jump", at: 0.6 },
      { do: "camera", ...cakeCam(c.x), at: 1.4, dur: 1.2 },
    ]),
    ...yourTurn({ id: `l_${c.l}`, ask: "What letter is this?", answer: `${c.L}! ${c.word}`, praise: `Yes! ${c.L}!`, wordId: c.l,
      extra: [{ do: "wiggle", target: cake, at: 0.2, deg: 8, dur: 0.8 }] }),
    beat(`y_${c.l}`, 3.0, [
      { do: "camera", ...CAM, dur: 1.0 },
      fillSlot(n, `mini${n}`, 0.25),
      i === 2 ? { do: "hide", target: "qmark", at: 0.2, dur: 0.2 } : null,
      { do: "say", who: c.who, text: ["Yummy! My B cake!", "Meow! Thank you! My C cake!", "Quack! A D cake for me!"][i], at: 0.3 },
      { do: "feel", target: c.who, feeling: "joyful", at: 0.3 },
      HOP(c.who, 0.4, 0.3),
      i === 0 ? pose("yay", 0.4, 0.3) : null,
      i === 0 ? pose("rest", 2.4, 0.3) : null,
    ]),
  ]});
  return out;
}

/** A friend arrives: hear the sound, guess who, they walk in. */
function arrive(id) {
  const f = F[id];
  const name = id === "cat" ? "Cat" : "Duck";
  return { id: `arrive_${id}`, title: id === "duck" ? "The surprise friend" : "Who is coming?", beats: [
    beat(`a_${id}1`, 3.6, [
      { do: "camera", ...FRIEND_CAM, dur: 1.0 },
      say(id === "duck" ? "Listen! Who gets the last cake?" : "Listen! Who is coming?", { at: 0.1 }),
      { do: "look", target: "robo", at: 0.3, to: [6, 1, 0] },
      { do: "look", target: "pip", at: 0.3, to: [6, 1, 0] },
      { do: "say", who: id, text: f.sound, at: "after" },
    ]),
    beat(`a_${id}2`, 2.4, [
      say(f.ask, { at: 0.1 }),
      { do: "sound", sound: "tick", at: 1.3, volume: 0.5 }, { do: "sound", sound: "tick", at: 1.9, volume: 0.5 },
    ]),
    beat(`a_${id}4`, 3.0, [
      { do: "show", target: id, at: 0, dur: 0.05 },
      { do: "path", target: id, points: [f.from, [(f.from[0] + f.at[0]) / 2, 0, f.at[2] + 0.2], f.at], at: 0.05, dur: 1.3, face: true },
      { do: "turn", target: id, to: [0, f.yaw, 0], at: 1.35, dur: 0.3 },
      { do: "sound", sound: "ding", at: 1.3 },
      { do: "burst", target: "confetti", at: 1.3, dur: 2, sound: false },
      say(`It's ${name}!`, { at: 1.3, caption: false }),
      { do: "caption", text: name.toUpperCase(), style: "label", at: 1.3, dur: 1.6 },
      { do: "feel", target: id, feeling: "joyful", at: 1.3 },
      { do: "clip", target: "robo", clip: "Wave", at: 1.4 },
      { do: "look", target: "robo", at: 1.3, to: id },
      { do: "look", target: "pip", at: 1.3, to: id },
    ]),
    beat(`a_${id}5`, 2.4, [
      { do: "say", who: id, text: id === "cat" ? "Hello! Can I have a cake?" : "Quack! A cake for me?", at: 0.1 },
      say(id === "cat" ? "Yes! C is for Cat!" : "Yes! D is for Duck!", { at: "after" }),
      { do: "look", target: "robo", at: 0.2, to: "ahead" },
      { do: "look", target: "pip", at: 0.2, to: "ahead" },
    ]),
  ]};
}

scenes.push(...cakeScenes(C[0], 0));
scenes.push(whichNext("n1", ["clap", "pat", "clap", "pat"], "Clap, pat, clap..."));
scenes.push(arrive("cat"));
scenes.push(...cakeScenes(C[1], 1));
scenes.push(whichNext("n2", ["pat", "clap", "pat", "clap"], "Pat, clap, pat..."));
scenes.push(arrive("duck"));
scenes.push(...cakeScenes(C[2], 2));

// Recap quiz: point to the B cake (the D cake beside it).
scenes.push({ id: "quiz", title: "Point to it!", beats: [
  beat("q0", 1.8, [
    say("Now a quick game!", { at: 0.1 }), { do: "camera", ...TABLE_CAM, dur: 1.0 }, { do: "clip", target: "robo", clip: "Dance", at: 0.2 },
    { do: "move", target: "cake_c", to: [1.02, TOP, -0.66], at: 0.5, dur: 0.8, ease: "sineInOut" },
  ]),
  ...quizRound({ id: "q1", q: "Which cake has the letter B? Point to it!", left: "cake_b", right: "cake_d", answer: "cake_b", yes: "Yes! B! B is for baby!",
    spots: [[0.55, TOP, -0.1], [1.5, TOP, -0.1]], back: { cake_d: cakeSpot(C[2]), cake_b: cakeSpot(C[0]) } }),
  beat("q2", 1.0, [{ do: "move", target: "cake_c", to: cakeSpot(C[1]), at: 0.05, dur: 0.8, ease: "sineInOut" }]),
]});

// The finale: everybody sings and claps the traditional verse, then bye-bye.
scenes.push({ id: "finale", title: "Everybody pat-a-cake!", music: false, beats: [
  beat("z1", 2.6, [
    { do: "camera", position: [0.6, 1.9, 6.4], lookAt: [0.9, 0.9, -0.4], fov: 40, dur: 1.2 },
    say("Three cakes! Everybody clap and sing!", { at: 0.1 }),
    ...[1, 2, 3].map((s, k) => ({ do: "wiggle", target: `slot${s}`, at: 0.4 + k * 0.3, deg: 10, dur: 0.5 })),
    { do: "clip", target: "robo", clip: "Dance", at: 0.3 },
  ]),
  beat("z2", tuneDur(T.l1), sung(L1, T.l1, [
    clapAt(onBeat(0)), patAt(onBeat(2)), clapAt(onBeat(4)), patAt(onBeat(6)),
    HOP("cat", onBeat(1), 0.25), HOP("duck", onBeat(3), 0.25), HOP("cat", onBeat(5), 0.25), HOP("duck", onBeat(7), 0.25),
  ])),
  beat("z3", tuneDur(T.l2), sung(L2, T.l2, [
    { do: "spin", target: "spoon", turns: 3, dur: 2.4, at: 0.3, ease: "linear" },
    clapAt(onBeat(0)), patAt(onBeat(2)), clapAt(onBeat(4)), patAt(onBeat(6)),
    { do: "orbit", around: [0.9, 0.9, -0.4], degrees: 12, dur: 3 },
  ])),
  beat("z4", tuneDur(T.l3), sung("roll it and pat it and mark it with B,", T.l3, [
    word("b", onBeat(5.5)), { do: "wiggle", target: "cake_b", at: onBeat(5.5), deg: 10, dur: 0.8 },
    clapAt(onBeat(0)), patAt(onBeat(2)), clapAt(onBeat(4)),
  ])),
  beat("z5", tuneDur(T.l4), sung("and put it in the oven for baby and me.", T.l4, [
    unword("b", 0.1),
    { do: "burst", target: "confetti", at: onBeat(5), dur: 2.4 },
    HOP("pip", onBeat(6), 0.3), HOP("cat", onBeat(6.3), 0.3), HOP("duck", onBeat(6.6), 0.3),
    { do: "clip", target: "robo", clip: "Jump", at: onBeat(6) },
  ])),
  beat("z6", 2.6, [
    word("yum", 0.2),
    say("Yum, yum! Cake for everyone!", { at: 0.1 }),
    ...["pip", "cat", "duck"].map((id, k) => ({ do: "feel", target: id, feeling: "joyful", at: 0.3 + k * 0.2 })),
    { do: "sound", sound: "giggle", at: 1.0, volume: 0.6 },
    pose("yay", 0.4, 0.3),
  ]),
  beat("z7", 3.4, [
    unword("yum", 0),
    say("Bye-bye! Clap, pat, clap, pat!", { at: 0.2 }),
    { do: "clip", target: "robo", clip: "Wave", at: 0.2 },
    pose("rest", 0.2, 0.3),
    doPattern(AB, 1.4, 0.45, false),
    ...["cat", "duck"].map((id, k) => ({ do: "wiggle", target: id, at: 0.4 + k * 0.1, deg: 8, dur: 1.5 })),
    { do: "caption", text: "Bye-bye!", style: "title", at: 0.8, dur: 2.4 },
    { do: "camera", position: [0.3, 2.5, 9.4], lookAt: [0.3, 1.1, -0.8], fov: 40, dur: 3 },
  ]),
]});

// ---- Meta -----------------------------------------------------------------------------------------------------
const description = "Sing Pat-a-Cake, Baker's Man with Robo the baker, Pip, Cat and Duck, and learn to clap a pattern and the letters B, C and D! Clap, pat, clap, pat: copy the pattern and guess which comes next. Then roll the dough, pat it, mark it with a letter and put it in the oven. Three, two, one, ding! Out comes a cake with B for baby, C for Cat and D for Duck. What letter is this? A point-to-it quiz and the whole song together.";
const cakeOn = (id, x, z, frost, letter, ink, size = 1.6) => [
  { id, kind: "prop", model: "plain_cake", color: frost, at: [x, 0.8, z], size },
  { id: `${id}_l`, kind: "letter", text: letter, color: ink, parent: id, at: [0, 0.21 * size - 0.01, 0], size: 0.17 * size },
];
const script = {
  kind: "video3d", version: 1, description,
  meta: rhymeMeta({
    title: "Pat-a-Cake, Baker's Man", episode: "br13", seed: 313,
    skills: ["ab_patterns_prek", "capital_letters_prek", "listening_prek"],
    cast,
    youtube: {
      title: "Pat-a-Cake, Baker's Man 🎂 Clap a Pattern and Learn B, C, D | Toy Box Friends",
      description: `${description}\n\nWhat your child learns: an AB clapping pattern (clap, pat, clap, pat), copying a pattern and saying what comes next, and the capital letters B, C and D (B for baby, C for Cat, D for Duck).\n\nSing at home: sit facing your child, clap your hands, then pat your laps, and keep the clap, pat pattern going while you sing. On "mark it with B", draw a B in the air or on your child's tummy. Pat-a-Cake is a traditional public-domain rhyme; the tune here is a simple sing-song arrangement of the chant, and the verses for Cat and Duck and the story are original, written for Toy Box Friends.\n\n${YT_TAIL}`,
      tags: ["pat a cake", "pat a cake bakers man", "nursery rhymes", "clapping song", "patterns for toddlers", "ab pattern", "letter b", "abc for toddlers", "baby songs", "toddler learning", "sing along for kids", "kids songs", "preschool", "3D cartoon for kids", "Toy Box Friends"],
    },
    thumbnails: [
      { name: "cake", title: "PAT-A-CAKE", subtitle: "Clap, pat and learn B!", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [2.0, 1.55, 3.1], lookAt: [2.6, 0.95, -0.3], fov: 38 },
        objects: [
          { id: "table", kind: "prop", model: "table", at: [3.45, 0, -0.35] },
          ...cakeOn("cake", 3.25, -0.25, "pink", "B", "blue", 1.8),
          { id: "bowl", kind: "prop", model: "baking_bowl", color: "sky", at: [3.85, 0.8, -0.6], size: 1.0 },
          { id: "spoon", kind: "prop", model: "mixing_spoon", parent: "bowl", at: [0.03, 0.16, 0], rotation: [0, 0, 18] },
          { id: "pip", kind: "critter", species: "toddler", at: [3.9, 0, 0.5], size: 0.95, rotation: [0, -40, 0], feeling: "joyful" },
        ] },
      { name: "clap", title: "CLAP, PAT!", subtitle: "Pat-a-cake pattern", titleColor: "yellow", side: "left", badge: "TODDLERS", stage: "playroom",
        camera: { position: [2.3, 1.45, 3.4], lookAt: [2.75, 0.9, -0.3], fov: 38 },
        objects: [
          { id: "table", kind: "prop", model: "table", at: [3.75, 0, -0.45] },
          ...cakeOn("c1", 3.25, -0.45, "pink", "B", "blue", 1.2),
          ...cakeOn("c2", 3.75, -0.45, "yellow", "C", "purple", 1.2),
          ...cakeOn("c3", 4.25, -0.45, "mint", "D", "red", 1.2),
          { id: "clap", kind: "prop", model: "clap_icon", color: "yellow", at: [3.35, 1.75, -0.3], size: 0.5 },
          { id: "pat", kind: "prop", model: "pat_icon", color: "sky", at: [4.15, 1.75, -0.3], size: 0.5 },
          { id: "cat", kind: "critter", species: "cat", at: [4.3, 0, 0.35], size: 0.68, rotation: [0, -35, 0], feeling: "joyful" },
        ] },
    ],
  }),
  stage: { preset: "classroom", set: kitchenSet() },
  camera: CAM,
  objects,
  scenes,
};

/** The classroom's warm wall, skirting, and two windows, without the chalkboard (a kitchen wall; as br09). */
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

writeRhyme(script, "pat_a_cake");
