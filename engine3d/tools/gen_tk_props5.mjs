#!/usr/bin/env node
// Writes catalog/models/tk_props5.json: Toybox 10K props from ENGINE_REQUESTS #164-#170 (babies: cooking_pot,
// flat_pan, jug, fridge, high_chair, spot_halo, spoon_face) and #183-#187 (pop_up_map, zip_suitcase, nightcap,
// pyjama_top, snowman_bunny, snowman_reindeer, snowman_bear, snowman_cat). Edit this file, not the JSON:
//   node engine3d/tools/gen_tk_props5.mjs
// Conventions: props stand on y = 0 facing +z, readable on a picture card. Spots are in each description.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rd = (v) => Math.round(v * 1000) / 1000;
const P = (p, at, s, o = {}) => ({ p, at: at.map(rd), s: s.map(rd), ...o, ...(o.r ? { r: o.r.map(rd) } : {}) });
const ball = (at, w, o = {}) => P("sphere", at, [w, w, w], o);
const props = {};
const add = (name, color, description, tags, parts) => (props[name] = { color, description, tags: [...tags, "toybox10k"], parts });

// #164: a cooking pot with a lid, and a pan lying flat (side view friendly).
add("cooking_pot", "red", "A round cooking pot 0.5 m across and 0.36 m tall in its main colour (red), with two side handles and a `lid` with a knob (lift it: move `<id>#lid` by [0, 0.15, 0], or turn it [-40, 0, 0] to tip it open). Food goes inside at y 0.3; steam (`dust` in white) comes from the top at y 0.4.", ["kitchen", "cooking", "pot", "babies"], [
  P("cylinder", [0, 0.16, 0], [0.5, 0.32, 0.5], { m: "glossy" }),
  P("cylinder", [0, 0.3, 0], [0.46, 0.02, 0.46], { c: "charcoal" }),
  ...[-1, 1].map((sd) => P("torus", [sd * 0.27, 0.26, 0], [0.12, 0.08, 0.04], { c: "charcoal", r: [0, 90, 0] })),
  P("dome", [0, 0.32, 0], [0.52, 0.1, 0.52], { m: "glossy", hang: [0, 0, 0], name: "lid" }),
  ball([0, 0.43, 0], 0.07, { c: "charcoal", name: "lid" }),
]);
add("flat_pan", "charcoal", "A frying pan lying flat on the table or stove, 0.4 m across with its handle out to +x (0.35 m): a dark pan with a grey cooking surface at y 0.05. Food (an egg, a pancake) sits on it at y 0.06; seen from the side it reads as a pan, unlike the face-on frying_pan.", ["kitchen", "cooking", "pan", "babies"], [
  P("cylinder", [0, 0.03, 0], [0.42, 0.06, 0.42], { m: "glossy" }),
  P("cylinder", [0, 0.056, 0], [0.36, 0.01, 0.36], { c: "grey", m: "matte" }),
  P("box", [0.38, 0.05, 0], [0.34, 0.03, 0.05], { c: "wood_dark" }),
]);

// #165: an opaque jug (the water_jug is see-through glass).
add("jug", "blue", "A round china jug 0.4 m tall in its main colour (blue) with a white band, a spout at +x and a loop handle at -x; you cannot see inside. Pour: turn it [0, 0, -50] about its foot.", ["kitchen", "jug", "milk", "babies"], [
  P("sphere", [0, 0.17, 0], [0.32, 0.34, 0.32], { m: "glossy" }),
  P("cylinder", [0, 0.33, 0], [0.2, 0.12, 0.2], { m: "glossy" }),
  P("cylinder", [0, 0.2, 0], [0.33, 0.04, 0.33], { c: "white", m: "glossy" }),
  P("cone", [0.12, 0.37, 0], [0.08, 0.1, 0.06], { m: "glossy", r: [0, 0, -70] }),
  P("torus", [-0.17, 0.22, 0], [0.16, 0.2, 0.05], { m: "glossy", r: [0, 0, 0] }),
]);

// #166: a fridge that opens, a high chair.
add("fridge", "white", "A kitchen fridge 1.7 m tall and 0.8 m wide in its main colour (white), facing +z: a big `door` hinged on its left edge (turn it [0, -100, 0] to open, or use open), a small freezer door on top, a chrome handle; inside (when open) three shelves at y 0.45, 0.85, 1.2 with a milk bottle and fruit. Put food on a shelf at z 0, x -0.25 to 0.25.", ["kitchen", "fridge", "home", "babies"], [
  P("box", [0, 0.85, -0.3], [0.8, 1.7, 0.05]),
  ...[-0.38, 0.38].map((x) => P("box", [x, 0.85, 0], [0.04, 1.7, 0.64])),
  P("box", [0, 0.02, 0], [0.8, 0.04, 0.64]),
  P("box", [0, 1.68, 0], [0.8, 0.04, 0.64]),
  ...[0.45, 0.85, 1.2].map((y) => P("box", [0, y, 0], [0.72, 0.02, 0.55], { c: "sky", m: "glass" })),
  P("cylinder", [-0.15, 0.97, 0], [0.12, 0.24, 0.12], { c: "white", m: "glossy" }),
  ball([0.12, 0.5, 0], 0.12, { c: "red", m: "glossy" }),
  ball([0.24, 0.5, 0.04], 0.1, { c: "orange", m: "glossy" }),
  P("box", [0.38, 0.72, 0.33], [0.76, 1.4, 0.04], { m: "glossy", hang: [-0.38, 0, 0], name: "door" }),
  P("box", [0.38, 0.72, 0.36], [0.03, 0.4, 0.04], { c: "grey", m: "metal", hang: [-0.7, 0, 0], name: "door" }),
  P("box", [0, 1.57, 0.33], [0.76, 0.24, 0.04], { m: "glossy" }),
]);
add("high_chair", "orange", "A baby's high chair 1.05 m tall in its main colour (orange), facing +z: four splayed legs, a seat at y 0.62 with a back and arms, and a white `tray` in front (top at y 0.78, middle z 0.25). A baby or a small critter sits on the seat at [0, 0.62, -0.02]; food goes on the tray.", ["home", "babies", "chair", "eating"], [
  ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => P("cylinder", [sx * 0.2, 0.31, sz * 0.18], [0.04, 0.66, 0.04], { r: [sz * 8, 0, -sx * 8] })),
  P("box", [0, 0.6, 0], [0.42, 0.05, 0.38]),
  P("box", [0, 0.86, -0.18], [0.42, 0.5, 0.05]),
  ...[-1, 1].map((sd) => P("box", [sd * 0.2, 0.72, 0], [0.04, 0.2, 0.34])),
  P("box", [0, 0.78, 0.25], [0.5, 0.04, 0.24], { c: "white", m: "glossy", name: "tray" }),
]);

// #167: a soft pool of light on the wall behind someone.
add("spot_halo", "cream", "A soft round pool of spotlight on the back wall, 1.6 m across (its middle 1.1 m up), glowing and see-through: put it just in front of the wall behind a character to pick them out (set color for a coloured light; grow it from 0 to switch it on). It throws no shadow.", ["stage", "light", "babies", "show"], [
  P("disc", [0, 1.1, 0], [1.6, 0.01, 1.6], { m: "beam", r: [90, 0, 0] }),
  P("disc", [0, 1.1, 0.01], [1.1, 0.01, 1.1], { m: "beam", r: [90, 0, 0] }),
]);

// #169: a spoon standing face-on, its bowl to the camera.
add("spoon_face", "grey", "A toy spoon standing on its handle with the round bowl facing the camera (+z), 0.4 m tall at size 1; the rhymes spoon lies along x and is a thin line from the front. Origin at the handle's foot. Turn it [0, 0, -30] to tip it toward a bowl.", ["kitchen", "spoon", "babies", "eating"], [
  P("box", [0, 0.13, 0], [0.04, 0.26, 0.02], { c: "grey", m: "glossy" }),
  P("oval", [0, 0.25, 0], [0.16, 0.18, 0.03], { c: "grey", m: "glossy" }),
  P("oval", [0, 0.26, 0.012], [0.12, 0.14, 0.01], { c: "white", m: "glossy" }),
]);

// #183: a map that unfolds and whose islands rise.
const isles = [[-0.5, 0.2, 0.22], [0.15, -0.15, 0.18], [0.55, 0.25, 0.15]];
add("pop_up_map", "cream", "A pop-up treasure map lying open on the floor, 1.8 m wide and 1.2 m deep: a cream middle panel with two side flaps `flap_left` and `flap_right` (hinged at x -0.6 and 0.6: start them folded with pose rotation [0, 0, 170] and [0, 0, -170], then turn back to [0, 0, 0] to unfold), a blue sea and three green `islands` that rise out of it (start them with pose scale 0, then grow / show them) and a red X `treasure` on the right island. Look down at it (shot height 35) to read it.", ["map", "treasure", "geography", "pirate"], [
  P("box", [0, 0.01, 0], [1.2, 0.02, 1.2]),
  P("box", [0, 0.022, 0], [1.1, 0.01, 1.1], { c: "sky", m: "matte" }),
  P("box", [-0.6, 0.01, 0], [0.6, 0.02, 1.2], { hang: [-0.3, 0, 0], name: "flap_left" }),
  P("box", [-0.6, 0.022, 0], [0.55, 0.01, 1.1], { c: "sky", m: "matte", hang: [-0.3, 0, 0], name: "flap_left" }),
  P("box", [0.6, 0.01, 0], [0.6, 0.02, 1.2], { hang: [0.3, 0, 0], name: "flap_right" }),
  P("box", [0.6, 0.022, 0], [0.55, 0.01, 1.1], { c: "sky", m: "matte", hang: [0.3, 0, 0], name: "flap_right" }),
  ...isles.map(([x, z, r]) => P("dome", [x, 0.027, z], [r * 2, r * 0.9, r * 1.6], { c: "leaf", m: "matte", name: "islands" })),
  P("box", [0.55, 0.16, 0.25], [0.14, 0.02, 0.03], { c: "red", r: [0, 45, 0], name: "treasure" }),
  P("box", [0.55, 0.16, 0.25], [0.14, 0.02, 0.03], { c: "red", r: [0, -45, 0], name: "treasure" }),
]);

// #185: a suitcase with pockets and a zip that runs.
add("zip_suitcase", "teal", "A soft travel suitcase 0.8 m wide and 0.6 m tall standing up, facing +z, in its main colour: a front `pocket_front` (a flat panel, middle [0, 0.24, 0.17]), a side `pocket_side` (on the +x side), a carry handle, and a gold zip `zip` pull at the top left of the lid seam (move `<id>#zip` by [0.6, 0, 0] to zip it along the top; the `lid` front panel then tips open with turn [-70, 0, 0], hinged at its bottom edge). Things go inside at [0, 0.3, 0].", ["travel", "suitcase", "packing", "holiday"], [
  P("box", [0, 0.3, -0.06], [0.8, 0.6, 0.2], { m: "matte" }),
  P("box", [0, 0.06, 0.09], [0.8, 0.12, 0.1], { m: "matte" }),
  P("box", [0, 0.36, 0.09], [0.78, 0.48, 0.1], { m: "matte", hang: [0, 0.24, 0], name: "lid" }),
  P("box", [0, 0.24, 0.15], [0.5, 0.26, 0.04], { c: "white", m: "matte", hang: [0, 0.12, 0], name: "lid" }),
  P("box", [0, 0.6, 0.14], [0.78, 0.02, 0.02], { c: "charcoal" }),
  P("box", [-0.33, 0.6, 0.16], [0.05, 0.08, 0.02], { c: "gold", m: "metal", name: "zip" }),
  P("box", [0.43, 0.3, -0.02], [0.06, 0.3, 0.22], { c: "white", m: "matte", name: "pocket_side" }),
  P("box", [0, 0.24, 0.17], [0.42, 0.2, 0.02], { c: "white", m: "matte", name: "pocket_front" }),
  P("torus", [0, 0.66, -0.06], [0.22, 0.14, 0.04], { c: "charcoal", r: [0, 0, 0] }),
]);

// #186: sleepwear to put on critters.
add("nightcap", "blue", "A floppy striped nightcap 0.5 m long in its main colour (blue) with white stripes and a white pompom at its drooping tip. Origin at the middle of its brim: `parent` it to a critter with part \"head\" and place it on top of the head (size about the head's width / 0.3).", ["clothes", "bedtime", "sleep", "hat"], [
  P("cylinder", [0, 0.03, 0], [0.3, 0.06, 0.3], { c: "white", m: "matte" }),
  P("cone", [0.04, 0.2, 0], [0.26, 0.32, 0.26], { m: "matte", r: [0, 0, -18] }),
  P("cylinder", [0.06, 0.18, 0], [0.22, 0.04, 0.22], { c: "white", m: "matte", r: [0, 0, -18] }),
  P("cone", [0.2, 0.36, 0], [0.12, 0.22, 0.12], { m: "matte", r: [0, 0, -70] }),
  ball([0.32, 0.32, 0], 0.08, { c: "white", m: "matte" }),
]);
add("pyjama_top", "sky", "A pyjama top (a tunic with white stripes and buttons) in its main colour, 0.5 m tall and 0.45 m wide, origin at its hem's middle: `parent` it to a critter's body (part \"body\") where the body is widest and size it to cover the tummy; pair with a nightcap.", ["clothes", "bedtime", "sleep", "pyjamas"], [
  P("cylinder", [0, 0.22, 0], [0.42, 0.44, 0.34], { m: "matte" }),
  ...[0.1, 0.22, 0.34].map((y) => P("cylinder", [0, y, 0], [0.43, 0.025, 0.35], { c: "white", m: "matte" })),
  ...[0.14, 0.26, 0.38].map((y) => ball([0, y, 0.175], 0.035, { c: "white", m: "glossy" })),
]);

// #187: snowmen with animal features (head parts ride on the snowman's head, as its nose and hat do).
const props_like = {};
props_like.snowman_bunny = { like: "snowman", add: [...[-1, 1].map((sd) => P("capsule", [sd * 0.17, 0.36, 0], [0.08, 0.3, 0.05], { m: "matte", r: [0, 0, sd * -28], on: "head" })), ...[-1, 1].map((sd) => P("capsule", [sd * 0.17, 0.36, 0.02], [0.04, 0.2, 0.02], { c: "pink", m: "matte", r: [0, 0, sd * -28], on: "head" }))],
  description: "A snowman bunny: the catalog snowman with two tall bunny ears (pink inside) on its head, over its hat." };
props_like.snowman_reindeer = { like: "snowman", add: [...[-1, 1].flatMap((sd) => [P("cylinder", [sd * 0.1, 0.42, 0], [0.025, 0.2, 0.025], { c: "wood_dark", r: [0, 0, sd * -25], on: "head" }), P("cylinder", [sd * 0.16, 0.48, 0], [0.02, 0.1, 0.02], { c: "wood_dark", r: [0, 0, sd * -70], on: "head" })]), ball([0, 0.16, 0.27], 0.07, { c: "red", m: "glossy", on: "head" })],
  description: "A snowman reindeer: the catalog snowman with brown antlers on its head and a shiny red ball on its carrot nose." };
props_like.snowman_bear = { like: "snowman", add: [...[-1, 1].map((sd) => ball([sd * 0.13, 0.3, 0], 0.11, { m: "matte", on: "head" })), ...[-1, 1].map((sd) => ball([sd * 0.13, 0.3, 0.03], 0.06, { c: "pink", m: "matte", on: "head" }))],
  description: "A snowman bear cub: the catalog snowman with two round bear ears (pink inside) on its head." };
props_like.snowman_cat = { like: "snowman", add: [...[-1, 1].map((sd) => P("cone", [sd * 0.1, 0.32, 0], [0.1, 0.13, 0.05], { m: "matte", r: [0, 0, sd * -20], on: "head" })), ...[-1, 1].flatMap((sd) => [0.02, -0.02].map((dy) => P("box", [sd * 0.12, 0.15 + dy, 0.15], [0.12, 0.008, 0.008], { c: "ink", r: [0, 0, sd * dy * 300], on: "head" })))],
  description: "A snowman kitten: the catalog snowman with two pointy cat ears on its head and coal whiskers by its nose." };
for (const [k, v] of Object.entries(props_like)) props[k] = { ...v, tags: ["winter", "snow", "snowman", "animal", "toybox10k"] };

// #196: bath things for the babies' bath-time lessons.
add("towel", "sky", "A fluffy bath towel 0.9 m wide hanging on a wall rail (rail at y 1.1), in its main colour with two white stripes near the bottom; `towel` is the cloth (wiggle it, or move it off the rail). Origin at the rail's middle foot on the floor line: put it against a wall.", ["bath", "towel", "babies", "home"], [
  P("cylinder", [0, 1.1, 0], [0.04, 1.0, 0.04], { c: "grey", m: "metal", r: [0, 0, 90] }),
  P("box", [0, 0.78, 0.04], [0.9, 0.66, 0.06], { m: "matte", name: "towel" }),
  ...[0.55, 0.6].map((y) => P("box", [0, y, 0.075], [0.9, 0.03, 0.01], { c: "white", m: "matte", name: "towel" })),
]);
add("washcloth", "pink", "A small folded washcloth 0.3 m square in its main colour (pink) with a white edge, lying flat (0.04 m thick); hold it with a critter's paw via parent, or lay it on the tub's edge.", ["bath", "washcloth", "babies", "home"], [
  P("box", [0, 0.02, 0], [0.3, 0.04, 0.3], { c: "white", m: "matte" }),
  P("box", [0, 0.025, 0], [0.26, 0.04, 0.26], { m: "matte" }),
]);
add("sponge", "yellow", "A soft bath sponge 0.24 m long in its main colour (yellow), a rounded block with a few holes on its face, 0.1 m tall. Squeeze it with grow [1, 0.7, 1] and back; add `dust` in white for suds.", ["bath", "sponge", "babies", "home"], [
  P("capsule", [0, 0.06, 0], [0.24, 0.12, 0.14], { m: "matte", r: [0, 0, 90] }),
  ...[[-0.06, 0.07], [0.02, 0.09], [0.07, 0.05], [-0.01, 0.04]].map(([x, y]) => P("disc", [x, y, 0.07], [0.025, 0.01, 0.025], { c: "orange", r: [90, 0, 0] })),
]);
add("faucet", "grey", "A shiny bath faucet (tap) 0.35 m tall: a curved spout pointing +z and two knobs, red (hot, `knob_hot`) and blue (cold, `knob_cold`) to turn; water runs from the spout mouth at [0, 0.2, 0.22] (add a sky `stroke` or a water_spout there). Put it at the tub's tap end.", ["bath", "tap", "water", "babies"], [
  P("cylinder", [0, 0.12, 0], [0.06, 0.24, 0.06], { m: "metal" }),
  P("cylinder", [0, 0.26, 0.09], [0.05, 0.2, 0.05], { m: "metal", r: [90, 0, 0] }),
  P("cylinder", [0, 0.23, 0.2], [0.05, 0.07, 0.05], { m: "metal" }),
  P("cylinder", [-0.1, 0.18, 0], [0.07, 0.04, 0.07], { c: "red", m: "glossy", name: "knob_hot" }),
  P("cylinder", [0.1, 0.18, 0], [0.07, 0.04, 0.07], { c: "blue", m: "glossy", name: "knob_cold" }),
]);
add("bath_plug", "charcoal", "A rubber bath plug 0.12 m across on a little chain (0.4 m), lying flat: the `plug` (pull it: move by [0, 0.3, 0]) and its silver chain looping beside it. Pull the plug, then `fill` the tub to level 0 to drain it.", ["bath", "plug", "drain", "babies"], [
  P("cylinder", [0, 0.025, 0], [0.12, 0.05, 0.12], { m: "matte", name: "plug" }),
  ball([0, 0.06, 0], 0.03, { c: "grey", m: "metal", name: "plug" }),
  ...Array.from({ length: 8 }, (_, k) => ball([0.08 + k * 0.04, 0.01, Math.sin(k * 0.8) * 0.05], 0.022, { c: "grey", m: "metal" })),
]);

// #190: paper magic: a sheet that folds in half, and the paper bird it becomes.
add("paper_sheet", "white", "A square sheet of paper 0.8 m across standing up, facing +z, in its main colour (white) with a faint fold line down the middle: its right half `flap` is hinged on that line (turn it [0, -180, 0] to fold it over onto the left half, in about 0.8 s), then swap it for a `paper_bird` with hide / pop and a swirl for the magic.", ["paper", "craft", "origami", "magic"], [
  P("box", [-0.2, 0.4, 0], [0.4, 0.8, 0.01], { m: "matte" }),
  P("box", [0, 0.4, 0.006], [0.006, 0.8, 0.002], { c: "grey", m: "matte" }),
  P("box", [0.2, 0.4, 0], [0.4, 0.8, 0.01], { m: "matte", hang: [0.2, 0, 0], name: "flap" }),
]);
add("paper_bird", "white", "A paper bird (an origami crane) 0.6 m long, facing +x, in its main colour (white): a pointed body, a folded neck and head, a tail and two big flat `wings` that flap (wiggle them, or turn [20, 0, 0] and back). Origin under its body; it can fly with move.", ["paper", "origami", "bird", "magic"], [
  P("pyramid", [0, 0.12, 0], [0.26, 0.2, 0.14], { m: "matte" }),
  P("box", [0.2, 0.26, 0], [0.04, 0.3, 0.03], { m: "matte", r: [0, 0, -30] }),
  P("box", [0.28, 0.38, 0], [0.12, 0.03, 0.03], { m: "matte", r: [0, 0, 25] }),
  P("box", [-0.22, 0.24, 0], [0.04, 0.26, 0.03], { m: "matte", r: [0, 0, 35] }),
  ...[-1, 1].map((sd) => P("triangle", [0, 0.2, sd * 0.06], [0.42, 0.32, 0.01], { m: "matte", r: [sd * 70, 0, 0], hang: [0, 0.15, 0], name: "wings" })),
]);

// #211: a cat that can point (front paws named `paw`, a mirrored pair at the shoulders), like lion_paws.
const critters = {
  cat_paws: {
    like: "cat",
    add: [{ p: "capsule", at: [0.2, 0.44, 0.1], s: [0.1, 0.26, 0.1], r: [0, 0, 26], hang: [0, -0.12, 0], name: "paw", mirror: true }],
    description: "The catalog cat with two front paws (named `paw`, a mirrored pair at the shoulders) so it can point, wave and gesture (point, gesture, turn <id>#paw).",
    tags: ["animal", "pet", "cat", "toybox10k"],
  },
};

const out = {
  description: "Toybox 10K props from ENGINE_REQUESTS #164-#170 and #183-#187 (cooking_pot, flat_pan, jug, fridge, high_chair, spot_halo, spoon_face, pop_up_map, zip_suitcase, nightcap, pyjama_top, snowman_bunny, snowman_reindeer, snowman_bear, snowman_cat) and #196 (towel, washcloth, sponge, faucet, bath_plug), #190 (paper_sheet, paper_bird). Generated by tools/gen_tk_props5.mjs: edit the generator and rerun it, not the JSON.",
  props,
  critters,
};
const file = fileURLToPath(new URL("../catalog/models/tk_props5.json", import.meta.url));
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log("wrote", file, Object.keys(props).length, "props");
