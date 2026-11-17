#!/usr/bin/env node
// Writes catalog/models/tk_props4.json: Toybox 10K props from ENGINE_REQUESTS #142, #145, #147, #150 and #158
// (flower_face, hair_bow, torn_sail, sort_chute, cubby_shelf, star_map, mailbox, echo_machine, fountain,
// chick_face, chick_feet, choir_bench) and #161-#162 (parade_float, wagon, cart, harp, corn_cob, stepping_stone). Edit this file, not the JSON:
//   node engine3d/tools/gen_tk_props4.mjs
// Conventions: props stand on y = 0 facing +z, readable on a picture card. Letter spots are in each description.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mapSpot, MAP } from "../runtime/world_map.js";

const rd = (v) => Math.round(v * 1000) / 1000;
const P = (p, at, s, o = {}) => ({ p, at: at.map(rd), s: s.map(rd), ...o, ...(o.r ? { r: o.r.map(rd) } : {}) });
const ball = (at, w, o = {}) => P("sphere", at, [w, w, w], o);
const props = {};
const add = (name, color, description, tags, parts) => (props[name] = { color, description, tags: [...tags, "toybox10k"], parts });

// #142: a flower whose middle is a flat cream face, so a letter or a smile reads on it (the catalog flower's
// middle is a ball that covers letters).
add("flower_face", "pink", "A big friendly flower 1.3 m tall in its main colour (petals, default pink): a green stem with two leaves and a ring of eight petals round a flat cream face 0.44 m across. Letter spot: the face's middle at local [0, 1.0, 0.07] (a letter of size 0.25 there, `parent` the flower; or put a `face` sticker on it). Named parts `head` (petals and face: wiggle or turn it to nod) and `leaves`.", ["plants", "garden", "flower", "label"], [
  P("cylinder", [0, 0.42, 0], [0.05, 0.84, 0.05], { c: "leaf" }),
  P("leaf", [0.14, 0.34, 0.01], [0.26, 0.12, 0.1], { c: "leaf", r: [0, 0, 25], name: "leaves" }),
  P("leaf", [-0.14, 0.5, 0.01], [0.26, 0.12, 0.1], { c: "leaf", r: [0, 0, 155], name: "leaves" }),
  ...Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4;
    return P("oval", [Math.cos(a) * 0.3, 1.0 + Math.sin(a) * 0.3, -0.01], [0.24, 0.16, 0.06], { r: [0, 0, (k * 45)], m: "glossy", name: "head" });
  }),
  P("disc", [0, 1.0, 0.02], [0.44, 0.06, 0.44], { c: "cream", m: "matte", r: [90, 0, 0], name: "head" }),
]);

// #145: a hair-ribbon bow (two loops, a knot and two tails), to sit on a head.
add("hair_bow", "pink", "A hair-ribbon bow 0.4 m wide in its main colour (default pink): two puffy loops, a round knot and two short tails, facing +z. Its origin is under the knot: `parent` it to a character with part \"head\" and place it on top or at the side of the head (size 0.5 on Pip).", ["clothes", "hair", "bow", "ribbon"], [
  ...[-1, 1].map((sd) => P("oval", [sd * 0.11, 0.12, 0], [0.2, 0.15, 0.08], { m: "glossy", r: [0, 0, sd * 12] })),
  ball([0, 0.12, 0.02], 0.08, { m: "glossy" }),
  ...[-1, 1].map((sd) => P("box", [sd * 0.05, 0.03, 0], [0.05, 0.14, 0.02], { m: "glossy", r: [0, 0, sd * 25] })),
]);

// #145: a little boat's torn sail: the sail has a ragged notch and a loose flap that can flutter.
add("torn_sail", "white", "A mast 1.8 m tall with a torn sail in its main colour (default white): the sail has a ragged gap near its middle and a loose triangle `flap` hanging from it (wiggle it to flutter; turn it [0, 0, 0] to patch it closed with a move back). Stand it in a `boat` or on a raft; the mast's foot is the origin, the sail faces +z.", ["boat", "sea", "sail", "repair"], [
  P("cylinder", [0, 0.9, 0], [0.05, 1.8, 0.05], { c: "wood_dark" }),
  P("triangle", [0.32, 1.42, 0.02], [0.62, 0.62, 0.03], { m: "matte" }),
  P("triangle", [0.36, 0.62, 0.02], [0.7, 0.6, 0.03], { m: "matte", r: [0, 0, 180] }),
  P("triangle", [0.24, 1.0, 0.04], [0.3, 0.24, 0.02], { m: "matte", r: [0, 0, 160], name: "flap" }),
  P("box", [0.36, 0.32, 0.01], [0.72, 0.03, 0.03], { c: "wood_dark" }),
]);

// #147: a sorting chute: drop a card in the hopper, the chute swings left or right into one of two bins.
add("sort_chute", "teal", "A sorting machine 1.6 m wide and 1.7 m tall, facing +z: a hopper on legs with a slot on top (mouth at local [0, 1.62, 0]), a slide `chute` under it (hinged at [0, 1.1, 0.1]; turn it [0, 0, 30] to tip toward the left bin, [0, 0, -30] toward the right) and two open bins at its feet: left `bin_left` (blue, middle [-0.55, 0.2, 0.25]) and right `bin_right` (orange, middle [0.55, 0.2, 0.25]). Label spots: each bin's front at z 0.46, y 0.22 (a card of width 0.5). Move a card from the slot down the chute into a bin.", ["machine", "sorting", "bins", "classroom"], [
  P("cone", [0, 1.45, 0], [0.6, 0.34, 0.6], { r: [180, 0, 0] }),
  P("box", [0, 1.63, 0], [0.4, 0.04, 0.08], { c: "ink" }),
  ...[-1, 1].map((sd) => P("cylinder", [sd * 0.22, 0.68, -0.1], [0.05, 1.36, 0.05], { c: "grey" })),
  P("box", [0, 0.82, 0.1], [0.24, 0.56, 0.05], { c: "yellow", m: "glossy", name: "chute" }),
  P("box", [-0.55, 0.2, 0.25], [0.6, 0.4, 0.42], { c: "blue", name: "bin_left" }),
  P("box", [-0.55, 0.41, 0.25], [0.5, 0.02, 0.32], { c: "ink", name: "bin_left" }),
  P("box", [0.55, 0.2, 0.25], [0.6, 0.4, 0.42], { c: "orange", name: "bin_right" }),
  P("box", [0.55, 0.41, 0.25], [0.5, 0.02, 0.32], { c: "ink", name: "bin_right" }),
]);

// #150: a cubby shelf of 3 x 3 open cubes (classroom storage).
const cubby = [];
// Each cube's dark back wall shows through its opening (a recess just in front of the frame face).
for (const x of [-0.6, 0, 0.6]) for (const y of [0.05, 0.6, 1.15]) cubby.push(P("box", [x, y + 0.27, 0.035], [0.52, 0.48, 0.4], { c: "wood_dark", m: "matte" }));
add("cubby_shelf", "wood", "A classroom cubby shelf 1.85 m wide, 1.75 m tall and 0.45 m deep in its main colour (wood), facing +z, with nine open cubes in three rows. Cube middles (fronts at z 0.22): columns x -0.6, 0, 0.6 and rows y 0.32, 0.87, 1.42; a prop of size 0.4 fits in one, a card label of width 0.45 goes on the cube's lower lip at z 0.24.", ["classroom", "storage", "shelf", "furniture"], [
  P("box", [0, 0.875, 0], [1.85, 1.75, 0.45]),
  ...cubby,
]);

// #150: a star map: a dark board with gold stars joined by dotted lines (constellations).
const stars = [[-0.6, 1.5], [-0.3, 1.65], [0, 1.45], [0.25, 1.7], [0.6, 1.55], [-0.45, 1.05], [-0.1, 0.9], [0.35, 1.0], [0.62, 0.8]];
const links = [[0, 1], [1, 2], [2, 3], [3, 4], [5, 6], [6, 7], [7, 8]];
add("star_map", "midnight", "A star map 1.6 m wide on a little easel, 2 m tall: a dark board (main colour, midnight blue) with nine gold stars joined by dotted lines into two constellations, a moon in the top-left corner, facing +z. Board middle at local [0, 1.25, 0.06]; a title card goes on the frame's bottom edge at y 0.62. Named part `stars` (all stars: twinkle them with highlight or wiggle).", ["space", "stars", "map", "night"], [
  ...[-1, 1].map((sd) => P("cylinder", [sd * 0.5, 0.5, -0.1], [0.05, 1.0, 0.05], { c: "wood_dark", r: [-8, 0, 0] })),
  P("box", [0, 1.25, 0], [1.66, 1.16, 0.06], { c: "wood" }),
  P("box", [0, 1.25, 0.02], [1.56, 1.06, 0.06], { m: "matte" }),
  P("crescent", [-0.62, 1.66, 0.06], [0.16, 0.16, 0.03], { c: "cream", m: "glow" }),
  ...stars.map(([x, y]) => P("star", [x, y, 0.06], [0.12, 0.12, 0.04], { c: "gold", m: "glow", name: "stars" })),
  ...links.flatMap(([a, b]) => [1, 2, 3].map((j) => ball([stars[a][0] + ((stars[b][0] - stars[a][0]) * j) / 4, stars[a][1] + ((stars[b][1] - stars[a][1]) * j) / 4, 0.06], 0.025, { c: "cream", m: "glow" }))),
]);

// #158: a blue collection mailbox with a pull-down slot flap.
add("mailbox", "blue", "A blue street mailbox 1.2 m tall, facing +z: a box with a round top on four short legs, a letter slot with a pull-down `flap` (hinged at its top edge, at [0, 0.98, 0.3]: turn it [-60, 0, 0] to open, then post a card into the slot at [0, 0.93, 0.3]) and a white label panel on the front (label spot at [0, 0.6, 0.31], a card of width 0.45). Set color for another colour.", ["post", "mail", "letters", "street"], [
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => P("box", [sx * 0.24, 0.08, sz * 0.2], [0.06, 0.16, 0.06], { c: "charcoal" }))),
  P("box", [0, 0.58, 0], [0.6, 0.84, 0.56], { m: "glossy" }),
  P("cylinder", [0, 1.0, 0], [0.6, 0.56, 0.3], { m: "glossy", r: [0, 0, 90] }),
  P("box", [0, 0.93, 0.29], [0.4, 0.06, 0.02], { c: "ink" }),
  P("box", [0, 0.92, 0.3], [0.42, 0.1, 0.02], { c: "blue", m: "glossy", hang: [0, -0.05, 0], name: "flap" }),
  P("box", [0, 0.6, 0.29], [0.4, 0.26, 0.01], { c: "white", m: "matte" }),
]);

// #158: an echo machine: a box with a big horn that plays a sound back again, softer.
add("echo_machine", "purple", "An echo machine 1.3 m tall, facing +z: a box in its main colour (purple) on stubby feet with two dials, a red `button` on top (press: move it down 0.03 and back) and a big gold horn `horn` on the right that points up and out (wiggle it as the echo plays). A round speaker grille faces front at [-0.18, 0.5, 0.3]; a `light` (glow) blinks on top. Pair with `sound` `echo` (repeats a sound softer).", ["machine", "sound", "echo", "music"], [
  ...[-1, 1].map((sd) => P("box", [sd * 0.3, 0.04, 0], [0.12, 0.08, 0.4], { c: "charcoal" })),
  P("box", [0, 0.48, 0], [0.86, 0.8, 0.56], { m: "glossy" }),
  P("disc", [-0.18, 0.5, 0.29], [0.34, 0.03, 0.34], { c: "charcoal", r: [90, 0, 0] }),
  ...[-1, 1].map((sd) => P("disc", [0.25, 0.48 + sd * 0.15, 0.29], [0.13, 0.03, 0.13], { c: "cream", r: [90, 0, 0] })),
  P("cylinder", [-0.15, 0.91, 0], [0.12, 0.06, 0.12], { c: "red", m: "glossy", name: "button" }),
  ball([0.15, 0.93, 0], 0.1, { c: "yellow", m: "glow", name: "light" }),
  P("cylinder", [0.36, 1.02, 0.05], [0.07, 0.36, 0.07], { c: "gold", m: "glossy", r: [-20, 0, -25], name: "horn" }),
  P("cone", [0.48, 1.22, 0.12], [0.32, 0.26, 0.32], { c: "gold", m: "glossy", r: [160, 0, 155], name: "horn" }),
]);

// #158: a fountain whose water jet rises and lifts a ball or a letter on top of it.
add("fountain", "grey", "A round garden fountain 1.6 m across: a stone basin (rim top at y 0.45) of blue water with a middle spout and a water `jet` (a glossy water column from y 0.45 up to 1.25). The jet is built to grow from its foot: scale `<id>#jet` to [1, 0.1, 1] to start it low and back to [1, 1, 1] to make it spring up. To lift something on the water, put it at [0, 1.3, 0] (parent the fountain) and move it up with the jet; at scale 0.1 it rests at y 0.53.", ["garden", "water", "fountain", "park"], [
  P("cylinder", [0, 0.2, 0], [1.6, 0.4, 1.6], { m: "matte" }),
  P("torus", [0, 0.38, 0], [1.6, 0.14, 1.6], { m: "matte", r: [90, 0, 0] }),
  P("cylinder", [0, 0.41, 0], [1.4, 0.04, 1.4], { c: "sky", m: "glossy" }),
  P("cylinder", [0, 0.5, 0], [0.18, 0.2, 0.18]),
  // The jet's pivot is its foot on the water, so scaling it grows it upward.
  P("cylinder", [0, 0.45, 0], [0.12, 0.8, 0.12], { c: "sky", m: "glossy", hang: [0, 0.4, 0], name: "jet" }),
  ball([0, 0.45, 0], 0.22, { c: "white", m: "glossy", hang: [0, 0.8, 0], name: "jet" }),
]);

// #158: letter-shaped chicks: a chick's eyes and beak, and its feet, to parent on a letter so the letter is the chick.
add("chick_face", "yellow", "A chick's face to stick on a letter (letter-shaped chicks): two shiny black eyes and an orange beak, plus a little feather tuft on top, 0.3 m wide at size 1, facing +z with its origin at the beak. `parent` it to a letter piece (`word#c1`) near the top of the letter's front face (z just past the letter's depth, about 0.2 x size).", ["animal", "chick", "face", "letters"], [
  ...[-1, 1].map((sd) => ball([sd * 0.08, 0.07, 0], 0.07, { c: "ink", m: "glossy" })),
  P("cone", [0, 0, 0.03], [0.07, 0.09, 0.07], { c: "orange", r: [90, 0, 0] }),
  ...[-1, 0, 1].map((k) => P("oval", [k * 0.03, 0.18, -0.02], [0.04, 0.09, 0.02], { r: [0, 0, -k * 25] })),
]);
add("chick_feet", "orange", "A chick's two orange feet (three toes each), 0.3 m wide at size 1, origin between them on the ground: `parent` it to a letter word at the foot of a letter so the letter stands on chick feet.", ["animal", "chick", "feet", "letters"], [
  ...[-1, 1].flatMap((sd) => [-25, 0, 25].map((a) => P("box", [sd * 0.08 + Math.sin((a * Math.PI) / 180) * 0.04, 0.015, 0.04], [0.025, 0.03, 0.1], { r: [0, a, 0] }))),
  ...[-1, 1].map((sd) => P("cylinder", [sd * 0.08, 0.06, 0], [0.025, 0.1, 0.025])),
]);

// #158: a choir riser bench in one colour (a, e, i, o, u each get their own).
add("choir_bench", "red", "A two-step choir riser bench 1.6 m wide in its main colour (set color: one per vowel), facing +z: a low step (seat top y 0.3, middle z 0.25) in front of a high step (seat top y 0.6, middle z -0.2). Critters stand on it at those heights; a letter or a card label goes on the low step's front at [0, 0.15, 0.46].", ["music", "choir", "bench", "stage", "vowels"], [
  P("box", [0, 0.15, 0.22], [1.6, 0.3, 0.46], { m: "glossy" }),
  P("box", [0, 0.3, -0.22], [1.6, 0.6, 0.44], { m: "glossy" }),
  P("box", [0, 0.305, 0.22], [1.6, 0.01, 0.46], { c: "white", m: "matte" }),
  P("box", [0, 0.605, -0.22], [1.6, 0.01, 0.44], { c: "white", m: "matte" }),
]);

// #161: riders on top, not hidden by walls: a low parade float and a little wagon.
const wheel = (x, z, r, o = {}) => P("cylinder", [x, r, z], [r * 2, 0.08, r * 2], { c: "charcoal", r: [0, 0, 90], ...o });
add("parade_float", "pink", "A low parade float 1.6 m long (along x) and 0.9 m deep, facing +z: a flat deck in its main colour (top at y 0.32) with a scalloped white skirt down to four hidden wheels, a gold rail along the back and a sign board on two poles above the back edge (board middle at local [0, 1.2, -0.38], a card or letter of width up to 1.3 goes on its front at z -0.34). Riders stand on the deck at y 0.32 (z -0.1 to 0.3): nothing hides them. Move it along x for a parade.", ["parade", "vehicle", "float", "festival"], [
  ...[[-0.6, 0.3], [0.6, 0.3], [-0.6, -0.3], [0.6, -0.3]].map(([x, z]) => wheel(x, z, 0.1)),
  P("box", [0, 0.24, 0], [1.6, 0.16, 0.9], { m: "glossy" }),
  ...Array.from({ length: 8 }, (_, k) => P("half_circle", [-0.7 + k * 0.2, 0.17, 0.455], [0.2, 0.1, 0.03], { c: "white", m: "matte", r: [0, 0, 180] })),
  P("box", [0, 0.42, -0.4], [1.6, 0.04, 0.04], { c: "gold", m: "glossy" }),
  ...[-0.7, 0.7].map((x) => P("cylinder", [x, 0.72, -0.42], [0.04, 0.8, 0.04], { c: "gold", m: "glossy" })),
  P("box", [0, 1.2, -0.4], [1.5, 0.5, 0.05], { c: "white", m: "matte" }),
]);
add("wagon", "red", "A little pull wagon 1 m long (along x) in its main colour (red): a low open tray (floor at y 0.26, rim only 0.08 high, so riders and labels show), four black wheels and a handle at the front (+x end) that tilts up. A rider stands on the floor at y 0.26; a label goes on the side at [0, 0.27, 0.31] (a card of width 0.6). Pull it with move (`by` works well).", ["vehicle", "wagon", "toy", "parade"], [
  ...[[-0.35, 0.26], [0.35, 0.26], [-0.35, -0.26], [0.35, -0.26]].map(([x, z]) => wheel(x, z, 0.1)),
  P("box", [0, 0.22, 0], [1.0, 0.06, 0.6], { m: "glossy" }),
  P("box", [0, 0.29, 0.29], [1.0, 0.08, 0.03], { m: "glossy" }),
  P("box", [0, 0.29, -0.29], [1.0, 0.08, 0.03], { m: "glossy" }),
  ...[-0.49, 0.49].map((x) => P("box", [x, 0.29, 0], [0.03, 0.08, 0.6], { m: "glossy" })),
  P("cylinder", [0.75, 0.36, 0], [0.03, 0.55, 0.03], { c: "charcoal", r: [0, 0, -60] }),
  P("box", [0.98, 0.5, 0], [0.04, 0.04, 0.22], { c: "charcoal" }),
]);

// #162: a farm cart, a harp, a corn cob, a stepping stone.
add("cart", "wood", "A wooden farm cart 1.5 m long (along x): an open box bed (floor at y 0.55, sides 0.25 high) on two spoked wheels (0.8 m across) with two long handles reaching out to +x. A load (pumpkins, hay, letters) sits on the floor; a label goes on the side board at [0, 0.68, 0.36]. Main colour: the bed.", ["farm", "vehicle", "cart", "market"], [
  ...[-1, 1].flatMap((sd) => [P("torus", [0, 0.4, sd * 0.42], [0.8, 0.8, 0.1], { c: "wood_dark" }), P("cylinder", [0, 0.4, sd * 0.42], [0.1, 0.1, 0.1], { c: "wood_dark", r: [90, 0, 0] }),
    ...[0, 45, 90, 135].map((a) => P("box", [0, 0.4, sd * 0.42], [0.035, 0.72, 0.025], { c: "wood_dark", r: [0, 0, a] }))]),
  P("box", [0, 0.55, 0], [1.3, 0.06, 0.7]),
  ...[-1, 1].map((sd) => P("box", [0, 0.7, sd * 0.34], [1.3, 0.25, 0.04])),
  ...[-1, 1].map((sd) => P("box", [-0.63, 0.7, 0], [0.04, 0.25, 0.7])),
  ...[-1, 1].map((sd) => P("cylinder", [1.0, 0.5, sd * 0.25], [0.05, 0.8, 0.05], { c: "wood_dark", r: [0, 0, 80] })),
]);
add("harp", "gold", "A golden harp 1.3 m tall, facing +z (its strings in the x-y plane): a curved neck on top, a straight pillar at the front (-x) and a sloping sound box at the back (+x), with nine white strings that are `strings` (wiggle or highlight them to play; pair with a soft chime sound).", ["music", "instrument", "harp"], [
  P("box", [-0.38, 0.62, 0], [0.08, 1.2, 0.08], { m: "glossy" }),
  P("box", [0.22, 0.6, 0], [0.16, 1.15, 0.16], { m: "glossy", r: [0, 0, 22] }),
  P("box", [0.03, 1.17, 0], [0.86, 0.1, 0.08], { m: "glossy", r: [0, 0, -5] }),
  ball([-0.4, 1.24, 0], 0.13, { m: "glossy" }),
  P("box", [0, 0.05, 0], [0.7, 0.1, 0.24], { m: "glossy" }),
  ...Array.from({ length: 9 }, (_, k) => {
    const x = -0.3 + k * 0.06;
    const top = 1.08 - Math.abs(x + 0.06) * 0.15;
    const bot = 0.22 + (x + 0.3) * 1.5;
    return P("cylinder", [x, (top + bot) / 2, 0], [0.012, top - bot, 0.012], { c: "white", m: "glossy", name: "strings" });
  }),
]);
add("corn_cob", "yellow", "A corn cob 0.45 m long standing up: a glossy yellow cob of kernel bumps with three green husk leaves peeled down round its foot and a little stalk. Lay it down with rotation [0, 0, 90] (it then lies along x, middle about 0.12 m up).", ["food", "vegetable", "corn", "farm", "harvest"], [
  P("capsule", [0, 0.27, 0], [0.16, 0.42, 0.16], { m: "glossy" }),
  ...Array.from({ length: 12 }, (_, k) => ball([Math.cos(k * 1.05) * 0.075, 0.12 + (k % 6) * 0.055, Math.sin(k * 1.05) * 0.075], 0.04, { c: "gold", m: "glossy" })),
  ...[0, 120, 240].map((a) => P("leaf", [Math.cos((a * Math.PI) / 180) * 0.08, 0.14, Math.sin((a * Math.PI) / 180) * 0.08], [0.12, 0.3, 0.06], { c: "leaf", r: [0, -a, 12] })),
  P("cylinder", [0, 0.02, 0], [0.05, 0.05, 0.05], { c: "leaf" }),
]);
add("stepping_stone", "grey", "A flat round stepping stone 0.6 m across, top at y 0.1, in its main colour (grey) with a mossy green rim. Lay several in a line across water or grass; a letter, number or tile stands on top at y 0.1 (a hop target for a critter).", ["garden", "water", "path", "stone"], [
  P("cylinder", [0, 0.045, 0], [0.62, 0.09, 0.56], { c: "leaf", m: "matte" }),
  P("cylinder", [0, 0.06, 0], [0.56, 0.09, 0.5], { m: "matte" }),
]);

// #172: trophies, a ferry, a quiz buzzer, a spotlight.
const cupParts = (x, y, z, k, o = {}) => [
  P("box", [x, y + 0.04 * k, z], [0.22 * k, 0.08 * k, 0.16 * k], { c: "wood_dark", ...o }),
  P("cylinder", [x, y + 0.13 * k, z], [0.05 * k, 0.1 * k, 0.05 * k], { c: "gold", m: "glossy", ...o }),
  P("cup", [x, y + 0.18 * k, z], [0.26 * k, 0.24 * k, 0.26 * k], { c: "gold", m: "glossy", ...o }),
  ...[-1, 1].map((sd) => P("torus", [x + sd * 0.14 * k, y + 0.32 * k, z], [0.1 * k, 0.12 * k, 0.04 * k], { c: "gold", m: "glossy", ...o })),
];
add("trophy_cup", "gold", "A gold trophy cup 0.45 m tall on a dark wooden base, with two loop handles, facing +z. A label goes on the base front at [0, 0.04, 0.09] (a card of width 0.2) or a letter or number of size 0.12 on the cup at [0, 0.3, 0.14].", ["prize", "trophy", "award", "competition"], cupParts(0, 0, 0, 1));
add("trophy_cabinet", "wood", "A glass-fronted trophy cabinet 1.4 m wide and 1.8 m tall, facing +z: a wooden frame in its main colour with three shelves (tops at y 0.42, 0.92, 1.42), a gold trophy cup on each, and a see-through glass `door` hinged at its left edge (turn it [0, -100, 0] to open). Put a `trophy_cup` (size 0.8) on a shelf at z 0, x -0.4 to 0.4 to add one; the middle of the top shelf is free.", ["prize", "trophy", "cabinet", "school"], [
  P("box", [0, 0.9, -0.22], [1.4, 1.8, 0.06]),
  ...[-0.68, 0.68].map((x) => P("box", [x, 0.9, 0], [0.06, 1.8, 0.5])),
  ...[0.04, 0.42, 0.92, 1.42, 1.78].map((y) => P("box", [0, y - 0.02, 0], [1.4, 0.04, 0.5])),
  ...cupParts(-0.4, 0.42, 0, 0.9), ...cupParts(0.35, 0.92, 0, 0.9), ...cupParts(-0.3, 1.42, 0, 0.8),
  P("box", [0.66, 0.9, 0.26], [1.32, 1.72, 0.02], { c: "white", m: "glass", hang: [-0.66, 0, 0], name: "door" }),
]);
add("ferry", "white", "A friendly little car ferry 3 m long (along x, bow at +x), floating with its waterline at y 0.25: a white hull with a red stripe and a row of round windows, a flat open deck (top at y 0.6) where a car or characters ride, a small blue cabin with a funnel at the back (-x) and a fold-down `ramp` at the bow (hinged at [1.45, 0.6, 0]; turn it [0, 0, -60] to lower). Move it along x to cross the water; label spot on the cabin front at [-0.55, 1.05, 0.46].", ["boat", "vehicle", "water", "transport"], [
  P("box", [0, 0.35, 0], [2.9, 0.5, 1.0], { m: "glossy" }),
  P("box", [0, 0.3, 0.505], [2.9, 0.1, 0.02], { c: "red", m: "glossy" }),
  P("box", [0, 0.3, -0.505], [2.9, 0.1, 0.02], { c: "red", m: "glossy" }),
  ...[-1, -0.5, 0, 0.5, 1].map((x) => P("disc", [x, 0.46, 0.51], [0.12, 0.02, 0.12], { c: "sky", m: "glossy", r: [90, 0, 0] })),
  P("box", [0, 0.61, 0], [2.9, 0.02, 1.0], { c: "grey", m: "matte" }),
  P("box", [-0.95, 0.9, 0], [0.8, 0.58, 0.9], { c: "blue", m: "glossy" }),
  P("box", [-0.95, 0.95, 0.455], [0.6, 0.18, 0.01], { c: "sky", m: "glossy" }),
  P("cylinder", [-1.15, 1.35, 0], [0.18, 0.4, 0.18], { c: "red", m: "glossy" }),
  P("cylinder", [-1.15, 1.56, 0], [0.19, 0.04, 0.19], { c: "charcoal" }),
  P("box", [1.6, 0.6, 0], [0.3, 0.04, 0.8], { c: "grey", hang: [0.15, 0, 0], name: "ramp" }),
]);
add("quiz_buzzer", "red", "A big round quiz buzzer on a little desk post, 1 m tall, facing +z: a black base and a domed `button` in its main colour (red) on top (press: move `<id>#button` by [0, -0.04, 0] and back, with a buzz or ding sound) and a `light` ring that glows (pop or paint it when a team buzzes in). A team label goes on the post front at [0, 0.55, 0.13] (a card of width 0.35).", ["quiz", "game", "button", "competition"], [
  P("cylinder", [0, 0.03, 0], [0.4, 0.06, 0.4], { c: "charcoal" }),
  P("box", [0, 0.45, 0], [0.24, 0.8, 0.24], { c: "charcoal" }),
  P("cylinder", [0, 0.88, 0], [0.42, 0.08, 0.42], { c: "charcoal" }),
  P("torus", [0, 0.93, 0], [0.38, 0.38, 0.1], { c: "yellow", m: "glow", r: [90, 0, 0], name: "light" }),
  P("dome", [0, 0.92, 0], [0.3, 0.16, 0.3], { m: "glossy", name: "button" }),
]);
add("spotlight", "charcoal", "A stage spotlight 1.7 m tall on a tripod: a dark lamp can (main colour) tilted down toward +z with a glowing lens, and a soft see-through `beam` of light (cream) reaching 3 m ahead and down to the floor about 2.6 m in front. Turn the whole spotlight about y to aim it; hide / show `<id>#beam` to switch it off and on (paint the beam for a coloured light). For a pool of light on the floor add a glowing `disc` shape there.", ["stage", "light", "theatre", "show"], [
  ...[0, 120, 240].map((a) => P("cylinder", [Math.sin((a * Math.PI) / 180) * 0.25, 0.5, Math.cos((a * Math.PI) / 180) * 0.25], [0.04, 1.05, 0.04], { c: "grey", r: [Math.cos((a * Math.PI) / 180) * 14, 0, -Math.sin((a * Math.PI) / 180) * 14] })),
  P("cylinder", [0, 1.15, 0], [0.05, 0.5, 0.05], { c: "grey" }),
  P("cylinder", [0, 1.5, 0], [0.34, 0.5, 0.34], { r: [-55, 0, 0], m: "glossy" }),
  P("disc", [0, 1.36, 0.2], [0.3, 0.03, 0.3], { c: "cream", m: "light", r: [-55, 0, 0] }),
  // The cone's wide end (its -y) turned to point forward and down along the lens axis; its tip on the lens.
  P("cone", [0, 1.36, 0.2], [1.1, 3.0, 1.1], { c: "cream", m: "beam", hr: [-55, 0, 0], hang: [0, -0.86, 1.229], name: "beam" }),
]);

// #181: a wall map of the world whose continents sit where runtime/world_map.js puts countries, so a pin placed with
// on: { map, country } lands on the right land.
const LAND = [
  [[48, -100], 0.5, 0.36, "leaf"], [[18, -92], 0.12, 0.12, "leaf"], [[72, -42], 0.15, 0.12, "white"], [[-15, -60], 0.24, 0.42, "green"],
  [[52, 15], 0.2, 0.15, "leaf"], [[54, -3], 0.035, 0.06, "leaf"], [[64, 15], 0.07, 0.1, "leaf"], [[3, 20], 0.3, 0.44, "sand"],
  [[50, 90], 0.72, 0.36, "green"], [[22, 79], 0.12, 0.14, "sand"], [[24, 45], 0.12, 0.12, "sand"], [[12, 103], 0.1, 0.12, "leaf"],
  [[-2, 118], 0.16, 0.06, "leaf"], [[37, 138], 0.035, 0.08, "leaf"], [[-25, 134], 0.24, 0.17, "sand"], [[-41, 174], 0.03, 0.07, "leaf"],
  [[-80, 0], 1.5, 0.08, "white"],
];
add("world_map", "sky", `A world map on the wall, ${MAP.w + 0.2} m wide and ${MAP.h + 0.2} m tall (its middle 1.25 m up), facing +z: a sky-blue sea (main colour) in a wooden frame with simple green and sandy continents where they really are. Put a pin, flag, label or critter on a country with \`on: { map: "<id>", country: "japan" }\` (or \`lat\` and \`lon\`): it rides on the map at that spot (at adds an offset). Countries: usa, canada, mexico, brazil, argentina, peru, chile, colombia, uk, ireland, france, spain, italy, germany, greece, norway, iceland, russia, egypt, nigeria, kenya, ethiopia, south_africa, morocco, saudi_arabia, india, china, japan, korea, indonesia, philippines, thailand, australia, new_zealand, greenland, antarctica. Stand it on legs: none; hang it on a wall or put it on an easel at y 0.`, ["geography", "map", "world", "classroom"], [
  ...[-1, 1].map((sd) => P("cylinder", [sd * (MAP.w / 2 - 0.1), 0.3, -0.06], [0.05, 0.6, 0.05], { c: "wood_dark" })),
  P("box", [0, MAP.cy, 0], [MAP.w + 0.2, MAP.h + 0.2, 0.06], { c: "wood" }),
  P("box", [0, MAP.cy, 0.02], [MAP.w, MAP.h, 0.06], { m: "matte" }),
  ...LAND.map(([ll, w, h, c]) => { const [x, y] = mapSpot(ll); return P("oval", [x, y - h / 2, 0.055], [w, h, 0.02], { c, m: "matte" }); }),
]);

const out = {
  description: "Toybox 10K props from ENGINE_REQUESTS #142-#158 (flower_face, hair_bow, torn_sail, sort_chute, cubby_shelf, star_map, mailbox, echo_machine, fountain, chick_face, chick_feet, choir_bench) and #161-#162 (parade_float, wagon, cart, harp, corn_cob, stepping_stone), #172 (trophy_cup, trophy_cabinet, ferry, quiz_buzzer, spotlight), #181 (world_map). Generated by tools/gen_tk_props4.mjs: edit the generator and rerun it, not the JSON.",
  props,
};
const file = fileURLToPath(new URL("../catalog/models/tk_props4.json", import.meta.url));
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log("wrote", file, Object.keys(props).length, "props");
