#!/usr/bin/env node
// Writes catalog/models/tk_props3.json: Toybox 10K props from ENGINE_REQUESTS #120, #123, #125, #127, #128, #137,
// #140 (lemon, napkin, muffin, hand_puppet, saw, bugle, bubble_machine, letter_sock, letter_kite, bed_sign, teacup,
// teapot, suitcase, puppet_theater, mouse_door, luggage_cart, letter_board, lamp_post, windup_key, smiling_rock,
// house_cutaway) and the dromedary critter. Edit this file, not the JSON:
//   node engine3d/tools/gen_tk_props3.mjs
// Conventions: props stand on y = 0 facing +z, readable on a picture card. Letter spots are in each description.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEG = 180 / Math.PI;
const rd = (v) => Math.round(v * 1000) / 1000;
const P = (p, at, s, o = {}) => ({ p, at: at.map(rd), s: s.map(rd), ...o, ...(o.r ? { r: o.r.map(rd) } : {}) });
function yTo(n) {
  const L = Math.hypot(...n);
  const [x, y, z] = n.map((v) => v / L);
  return [Math.atan2(z, y) * DEG, 0, -Math.asin(x) * DEG];
}
const rod = (p0, p1, w, o = {}) => {
  const d = p1.map((v, i) => v - p0[i]);
  return P("cylinder", p0.map((v, i) => (v + p1[i]) / 2), [w, Math.hypot(...d), w], { ...o, r: yTo(d) });
};
const ball = (at, w, o = {}) => P("sphere", at, [w, w, w], o);
const props = {};
const critters = {};
const add = (name, color, description, tags, parts) => (props[name] = { color, description, tags: [...tags, "toybox10k"], parts });

add("lemon", "yellow", "A bright yellow lemon, oval with a little bump at each end and a green leaf, 0.5 m long, lying on its side. For the short-e word lemon.", ["food", "fruit", "lemon", "phonics_picture"], [
  P("sphere", [0, 0.2, 0], [0.46, 0.34, 0.34], { m: "glossy" }),
  P("cone", [0.25, 0.2, 0], [0.08, 0.08, 0.08], { r: [0, 0, -90] }),
  P("cone", [-0.25, 0.2, 0], [0.07, 0.07, 0.07], { r: [0, 0, 90] }),
  P("leaf", [0.2, 0.36, 0.02], [0.1, 0.18, 0.08], { c: "leaf", r: [0, 0, -50] }),
]);
add("napkin", "red", "A folded cloth napkin lying flat: a square of cloth in its main colour (red) with a white checked border and one corner folded over, 0.5 m across (it tips toward the camera on a card).", ["kitchen", "napkin", "table"], [
  P("box", [0, 0.02, 0], [0.5, 0.04, 0.5], { c: "white", m: "matte" }),
  P("box", [0, 0.03, 0], [0.42, 0.04, 0.42], { m: "matte" }),
  ...[-0.1, 0.1].flatMap((v) => [P("box", [v, 0.052, 0], [0.03, 0.005, 0.42], { c: "white", m: "matte" }), P("box", [0, 0.052, v], [0.42, 0.005, 0.03], { c: "white", m: "matte" })]),
  P("triangle", [0.12, 0.07, 0.12], [0.26, 0.24, 0.04], { c: "white", m: "matte", r: [-90, 0, 45] }),
]);
add("muffin", "brown", "A blueberry muffin: a fat domed top full of blue berries over a paper cup in its main colour (brown) with pleats, 0.45 m tall.", ["food", "muffin", "baking", "phonics_picture"], [
  P("cylinder", [0, 0.11, 0], [0.32, 0.22, 0.32], { c: "sky", m: "matte" }),
  ...Array.from({ length: 8 }, (_, i) => P("box", [Math.sin((i / 8) * 2 * Math.PI) * 0.16, 0.11, Math.cos((i / 8) * 2 * Math.PI) * 0.16], [0.02, 0.22, 0.02], { c: "white", r: [0, (i / 8) * 360, 0] })),
  P("sphere", [0, 0.26, 0], [0.42, 0.3, 0.42]),
  ...[[0.1, 0.36, 0.1], [-0.08, 0.34, 0.14], [0.02, 0.4, -0.05], [-0.12, 0.3, -0.06], [0.14, 0.28, -0.04], [0, 0.32, 0.17]].map((a) => ball(a, 0.05, { c: "purple", m: "glossy" })),
]);
add("hand_puppet", "orange", "A cosy hand puppet (a sock-and-felt fox puppet): a soft body in its main colour, a big round head with button eyes, felt ears and a red tongue, on a sleeve, 0.8 m tall. Wiggle the named part `head` to make it talk.", ["toy", "puppet", "story", "phonics_picture"], [
  P("cylinder", [0, 0.2, 0], [0.26, 0.4, 0.26], { c: "sky", m: "matte" }),
  P("sphere", [0, 0.48, 0], [0.34, 0.36, 0.3], { m: "matte" }),
  P("sphere", [0, 0.68, 0.02], [0.36, 0.32, 0.32], { m: "matte", name: "head" }),
  ...[-1, 1].flatMap((sd) => [P("cone", [sd * 0.12, 0.85, 0], [0.1, 0.14, 0.06], { m: "matte", r: [0, 0, -sd * 15], name: "head" }), ball([sd * 0.07, 0.72, 0.16], 0.06, { c: "ink", name: "head" })]),
  P("half_circle", [0, 0.6, 0.15], [0.14, 0.08, 0.06], { c: "red", r: [0, 0, 180], name: "head" }),
  ball([0, 0.66, 0.18], 0.05, { c: "ink", name: "head" }),
]);
add("saw", "grey", "A hand saw lying on a slant: a silver blade with a zigzag toothed edge and a red wooden handle, 0.9 m long.", ["tools", "saw", "woodwork", "phonics_picture"], [
  P("box", [0.06, 0.35, 0], [0.62, 0.18, 0.02], { m: "metal", r: [0, 0, 18] }),
  ...Array.from({ length: 9 }, (_, i) => P("triangle", [-0.2 + i * 0.065, 0.24 + i * 0.022, 0], [0.06, 0.05, 0.02], { m: "metal", r: [0, 0, 198] })),
  P("box", [-0.34, 0.24, 0], [0.2, 0.2, 0.06], { c: "red", r: [0, 0, 18] }),
  P("torus", [-0.36, 0.24, 0.0], [0.11, 0.11, 0.3], { c: "barn_red", r: [0, 0, 0] }),
]);
add("bugle", "gold", "A shiny gold bugle (a simple horn): a mouthpiece, one loop of tubing and a wide flared bell to the right, with a red tassel, 0.7 m long.", ["music", "instrument", "bugle", "phonics_picture"], [
  rod([-0.32, 0.3, 0], [0.12, 0.3, 0], 0.05, { m: "metal" }),
  P("torus", [0, 0.2, 0], [0.24, 0.2, 0.12], { m: "metal" }),
  P("cone", [0.24, 0.3, 0], [0.26, 0.26, 0.26], { m: "metal", r: [0, 0, 90] }),
  P("cylinder", [-0.34, 0.3, 0], [0.06, 0.05, 0.06], { m: "metal", r: [0, 0, 90] }),
  rod([0, 0.18, 0.05], [0, 0.04, 0.06], 0.03, { c: "red" }),
]);
add("bubble_machine", "teal", "A toy bubble machine: a round body in its main colour on little feet with a fan grille at the front blowing a stream of see-through bubbles up and to the right (named part `bubbles`: show, hide or wiggle it), 0.6 m tall (bubbles to 1.5 m).", ["toy", "bubbles", "party"], [
  P("box", [0, 0.24, 0], [0.5, 0.36, 0.4], { m: "glossy" }),
  P("cylinder", [0, 0.26, 0.21], [0.26, 0.04, 0.26], { c: "white", r: [90, 0, 0] }),
  ...[-0.06, 0, 0.06].map((x) => P("box", [x, 0.26, 0.235], [0.015, 0.22, 0.01], { c: "grey" })),
  ...[[-0.18, 0.04], [0.18, 0.04]].map(([x, y]) => P("cylinder", [x, y, 0], [0.06, 0.08, 0.06], { c: "charcoal" })),
  ...[[0.3, 0.6, 0.3, 0.16], [0.5, 0.85, 0.35, 0.22], [0.36, 1.1, 0.25, 0.14], [0.7, 1.2, 0.3, 0.2], [0.55, 1.45, 0.2, 0.12]].map(([x, y, z, w]) => ball([x, y, z], w, { c: "sky", m: "glass", name: "bubbles" })),
]);
add("letter_sock", "red", "A sock in its main colour with a white heel and toe, hanging toe-down to the right (a letter sock): its flat front leg panel takes a letter at about [0, 0.55, 0.09] (size 0.22). 0.8 m tall.", ["clothes", "sock", "letters"], [
  P("box", [0, 0.55, 0], [0.28, 0.5, 0.14], { m: "matte" }),
  P("capsule", [0.1, 0.24, 0], [0.32, 0.3, 0.14], { m: "matte", r: [0, 0, 90] }),
  P("sphere", [-0.06, 0.26, 0], [0.18, 0.18, 0.15], { c: "white", m: "matte" }),
  P("sphere", [0.26, 0.24, 0], [0.16, 0.16, 0.15], { c: "white", m: "matte" }),
  P("box", [0, 0.82, 0], [0.3, 0.08, 0.15], { c: "white", m: "matte" }),
]);
add("letter_kite", "yellow", "A diamond kite standing on its tail on the ground (a letter kite), its face toward the camera: a flat panel in its main colour with a cross spar; a letter goes at its middle, [0, 0.95, 0.06] (size 0.3). A bow tail runs down to the ground. 1.4 m tall.", ["kite", "letters", "outdoor"], [
  P("diamond", [0, 0.95, 0], [0.7, 0.9, 0.05], { m: "matte" }),
  rod([-0.35, 0.95, 0.03], [0.35, 0.95, 0.03], 0.02, { c: "wood_dark" }),
  rod([0, 0.5, 0.03], [0, 1.4, 0.03], 0.02, { c: "wood_dark" }),
  rod([0, 0.4, 0], [0.05, 0, 0], 0.015, { c: "twine" }),
  ...[0.3, 0.18].map((y, i) => P("triangle", [0.02 * i, y, 0.01], [0.1, 0.08, 0.03], { c: i ? "blue" : "red", r: [0, 0, 90] })),
]);
add("bed_sign", "wood", "A little wooden sign on a stick for a bed (a name sign), 0.9 m tall: a board 0.6 x 0.3 whose face takes a word at [0, 0.72, 0.04] (text_card width 0.55, size 0.12).", ["sign", "bedroom", "letters"], [
  rod([0, 0, 0], [0, 0.62, 0], 0.04, { c: "wood_dark" }),
  P("box", [0, 0.72, 0], [0.62, 0.32, 0.05]),
  P("box", [0, 0.72, 0.02], [0.54, 0.24, 0.02], { c: "cream" }),
]);
add("teacup", "white", "A teacup with a curly handle on a saucer, filled with tea, in its main colour (white) with a blue rim band, 0.35 m tall.", ["kitchen", "tea", "cup", "phonics_picture"], [
  P("cylinder", [0, 0.02, 0], [0.42, 0.03, 0.42], { m: "glossy" }),
  P("cup", [0, 0.16, 0], [0.26, 0.24, 0.26], { m: "glossy" }),
  P("cylinder", [0, 0.26, 0], [0.22, 0.01, 0.22], { c: "brown" }),
  P("torus", [0, 0.27, 0], [0.27, 0.27, 0.12], { c: "blue", r: [90, 0, 0] }),
  P("torus", [0.15, 0.17, 0], [0.12, 0.12, 0.25], { m: "glossy", name: "handle" }),
]);
add("teapot", "blue", "A round teapot in its main colour (blue) with white spots: a lid with a knob, a curved spout to the right and a loop handle to the left, 0.6 m tall.", ["kitchen", "tea", "teapot", "phonics_picture"], [
  P("sphere", [0, 0.26, 0], [0.5, 0.44, 0.44], { m: "glossy" }),
  P("cylinder", [0, 0.49, 0], [0.24, 0.05, 0.24], { name: "lid" }),
  ball([0, 0.55, 0], 0.08, { c: "white", name: "lid" }),
  rod([0.2, 0.22, 0], [0.38, 0.42, 0], 0.07, { m: "glossy" }),
  P("torus", [-0.26, 0.28, 0], [0.22, 0.24, 0.3], { m: "glossy", name: "handle" }),
  ...[[0.1, 0.3, 0.2], [-0.1, 0.2, 0.19], [0.02, 0.12, 0.2], [-0.05, 0.36, 0.18]].map((a) => P("circle", a, [0.07, 0.07, 0.1], { c: "white" })),
]);
add("suitcase", "red", "A travel suitcase standing up: a rounded case in its main colour with two straps, a handle on top and a luggage tag, 0.7 m tall.", ["travel", "suitcase", "luggage"], [
  P("box", [0, 0.34, 0], [0.62, 0.6, 0.24]),
  ...[-0.16, 0.16].map((x) => P("box", [x, 0.34, 0.125], [0.05, 0.6, 0.01], { c: "wood_dark" })),
  P("torus", [0, 0.7, 0], [0.18, 0.12, 0.3], { c: "charcoal", name: "handle" }),
  ...[-0.24, 0.24].map((x) => P("sphere", [x, 0.03, 0.08], [0.06, 0.06, 0.06], { c: "charcoal" })),
  P("box", [0.24, 0.55, 0.14], [0.1, 0.07, 0.01], { c: "cream", r: [0, 0, -12], name: "tag" }),
]);
add("puppet_theater", "red", "A little puppet theatre booth: a red-and-white striped front 1.6 m wide and 2 m tall with a window (its opening 1 x 0.7 at y 1.1..1.8, front at z 0.15) framed by little gold-trimmed curtains and a scalloped awning. A hand_puppet behind the window at about [0, 0.95, 0] peeks out.", ["theatre", "puppet", "show", "story"], [
  P("box", [0, 0.55, 0], [1.6, 1.1, 0.3]),
  ...[-0.6, -0.2, 0.2, 0.6].map((x) => P("box", [x, 0.55, 0.155], [0.2, 1.1, 0.01], { c: "white" })),
  P("box", [-0.65, 1.45, 0], [0.3, 0.7, 0.3]),
  P("box", [0.65, 1.45, 0], [0.3, 0.7, 0.3]),
  P("box", [0, 1.9, 0], [1.6, 0.2, 0.3]),
  ...[-1, 1].map((sd) => P("box", [sd * 0.42, 1.45, 0.16], [0.16, 0.7, 0.04], { c: "barn_red", name: "curtains" })),
  ...Array.from({ length: 6 }, (_, i) => P("half_circle", [-0.65 + i * 0.26, 2.0, 0.17], [0.26, 0.16, 0.06], { c: i % 2 ? "white" : "yellow", r: [0, 0, 180] })),
  P("box", [0, 1.1, 0.16], [1.06, 0.06, 0.06], { c: "gold", m: "glossy" }),
]);
add("mouse_door", "barn_red", "A tiny mouse door in a skirting board: an arched little door in its main colour (hinged on its left: turn <id>#door to [0, -80, 0] to open it), a round brass knob and a doormat, 0.5 m tall, set in a strip of wall (back at z -0.05).", ["mouse", "door", "story"], [
  P("box", [0, 0.3, -0.05], [1, 0.6, 0.06], { c: "wall_butter", m: "matte" }),
  P("box", [0, 0.04, -0.01], [1, 0.08, 0.04], { c: "wood_dark" }),
  P("box", [0, 0.17, 0], [0.26, 0.26, 0.03], { hang: [0.13, 0, 0], name: "door", at: [-0.13, 0.17, 0] }),
  P("half_circle", [-0.13, 0.3, 0], [0.26, 0.13, 0.03], { hang: [0.13, 0, 0], name: "door" }),
  ball([-0.13, 0.17, 0.03], 0.035, { c: "gold", m: "glossy", hang: [0.22, 0, 0], name: "door" }),
  P("box", [0, 0.005, 0.12], [0.3, 0.01, 0.16], { c: "green", m: "matte" }),
]);
props.mouse_door.parts[2] = P("box", [-0.13, 0.17, 0], [0.26, 0.26, 0.03], { hang: [0.13, 0, 0], name: "door" });
add("luggage_cart", "grey", "A station luggage cart: a flat silver trolley on four wheels with a push bar at the back left, piled with a suitcase and a bag, 1.2 m long and 1 m tall. Put more cases on its bed (top at y 0.28).", ["travel", "station", "luggage", "train"], [
  P("box", [0, 0.24, 0], [1.1, 0.06, 0.6], { m: "metal" }),
  ...[[-0.45, 0.25], [0.45, 0.25], [-0.45, -0.25], [0.45, -0.25]].map(([x, z]) => P("cylinder", [x, 0.1, z], [0.18, 0.06, 0.18], { c: "charcoal", r: [90, 0, 0] })),
  rod([-0.55, 0.27, -0.28], [-0.62, 1.0, -0.28], 0.04, { m: "metal" }),
  rod([-0.55, 0.27, 0.28], [-0.62, 1.0, 0.28], 0.04, { m: "metal" }),
  rod([-0.62, 1.0, -0.3], [-0.62, 1.0, 0.3], 0.05, { c: "charcoal" }),
  P("box", [0.05, 0.52, 0], [0.5, 0.5, 0.36], { c: "red" }),
  P("capsule", [0.38, 0.4, 0], [0.3, 0.2, 0.3], { c: "blue", r: [0, 0, 90] }),
]);
add("letter_board", "charcoal", "A felt letter board on a little easel: a dark ribbed board 1.2 x 0.8 in a wooden frame, its face at z 0.04 taking letters in rows (size 0.18; rows at y 1.05, 0.8, 0.55).", ["school", "letters", "board", "sign"], [
  P("box", [0, 0.8, 0], [1.3, 0.9, 0.06], { c: "wood" }),
  P("box", [0, 0.8, 0.01], [1.2, 0.8, 0.06], { m: "matte" }),
  ...[0.95, 0.7].map((y) => P("box", [0, y, 0.045], [1.18, 0.008, 0.005], { c: "grey" })),
  rod([-0.4, 0, -0.2], [-0.4, 0.5, -0.05], 0.04, { c: "wood_dark" }),
  rod([0.4, 0, -0.2], [0.4, 0.5, -0.05], 0.04, { c: "wood_dark" }),
]);
add("lamp_post", "charcoal", "An old-fashioned street lamp 2.4 m tall that lights up (#127): a dark post with a lantern whose `light` turns on and off (paint <id>#light white or yellow for on, charcoal for off) and a soft `pool` of light on the floor round its foot (hide / show <id>#pool). Start it off with pose { light: ..., pool: { scale: 0 } } and paint the light off.", ["street", "lamp", "light", "night", "town"], [
  P("cylinder", [0, 0.08, 0], [0.3, 0.16, 0.3], { m: "metal" }),
  P("cylinder", [0, 1.1, 0], [0.09, 2, 0.09], { m: "metal" }),
  P("cylinder", [0, 2.1, 0], [0.2, 0.05, 0.2], { m: "metal" }),
  P("box", [0, 2.24, 0], [0.22, 0.26, 0.22], { c: "cream", m: "glow", name: "light" }),
  P("pyramid", [0, 2.43, 0], [0.3, 0.14, 0.3], { m: "metal" }),
  P("cylinder", [0, 0.005, 0], [2.4, 0.01, 2.4], { c: "yellow", m: "glow", name: "pool" }),
]);
add("windup_key", "gold", "A wind-up key (#128) for a toy's back: a gold shaft with a big flat two-lobed key, 0.35 m. Parent it to a toy at its back (e.g. [0, 0.5, -0.3] with rotation [90, 0, 0]) and spin <id>#key about y to wind it.", ["toy", "windup", "key"], [
  rod([0, 0, 0], [0, 0.15, 0], 0.04, { m: "metal", name: "key" }),
  ...[-1, 1].map((sd) => P("torus", [sd * 0.07, 0.2, 0], [0.12, 0.12, 0.35], { m: "metal", name: "key" })),
  P("box", [0, 0.2, 0], [0.12, 0.05, 0.03], { m: "metal", name: "key" }),
]);
add("smiling_rock", "grey", "A friendly smiling rock (#137): a round grey boulder with a happy face (eyes and a smile) and a tuft of moss on top, 0.7 m tall. Feelings do not move it; wiggle or hop it for life.", ["rock", "nature", "friendly", "phonics_picture"], [
  P("sphere", [0, 0.32, 0], [0.8, 0.64, 0.6], { m: "matte" }),
  ball([-0.13, 0.42, 0.28], 0.08, { c: "ink" }),
  ball([0.13, 0.42, 0.28], 0.08, { c: "ink" }),
  P("half_circle", [0, 0.27, 0.29], [0.24, 0.11, 0.05], { c: "ink", r: [0, 0, 180] }),
  P("sphere", [0.1, 0.63, 0], [0.24, 0.1, 0.2], { c: "moss", m: "matte" }),
  ...[-1, 1].map((sd) => ball([sd * 0.22, 0.32, 0.26], 0.09, { c: "rose" })),
]);
add("house_cutaway", "cream", "A dolls'-house cutaway (#140): a two-storey house with its front open so the rooms show, 2.4 m wide and 2.6 m tall. Rooms: downstairs floor at y 0.1 (x -1.1..1.1, z -0.8..0.2), upstairs floor at y 1.3; a red roof; a wall between two rooms upstairs at x 0. Stand critters and furniture in the rooms.", ["house", "home", "rooms", "story"], [
  P("box", [0, 0.05, -0.3], [2.4, 0.1, 1.1], { c: "wood" }),
  P("box", [0, 1.25, -0.3], [2.4, 0.1, 1.1], { c: "wood" }),
  P("box", [0, 1.2, -0.85], [2.4, 2.4, 0.08], { c: "wall_butter", m: "matte" }),
  P("box", [-1.2, 1.2, -0.3], [0.08, 2.4, 1.1]),
  P("box", [1.2, 1.2, -0.3], [0.08, 2.4, 1.1]),
  P("box", [0, 1.85, -0.3], [0.06, 1.1, 1.1], { c: "wall_sage", m: "matte" }),
  P("pyramid", [0, 2.75, -0.3], [2.9, 0.8, 1.3], { c: "barn_red", r: [0, 45, 0] }),
  P("box", [-0.6, 1.8, -0.8], [0.5, 0.5, 0.03], { c: "sky", m: "glow" }),
  P("box", [0.6, 0.65, -0.8], [0.5, 0.5, 0.03], { c: "sky", m: "glow" }),
]);

// A lion that can point (#134): the catalog lion with a front paw on each side (named `paw`, mirrored), so point,
// gesture and wiggle have something to move.
critters.lion_paws = {
  like: "lion",
  add: [{ p: "capsule", at: [0.24, 0.42, 0.1], s: [0.11, 0.26, 0.11], r: [0, 0, 28], hang: [0, -0.12, 0], name: "paw", mirror: true }],
  description: "The kind golden lion with two front paws (named `paw`, a mirrored pair at the shoulders) so it can point, wave and stretch (point, gesture, turn <id>#paw).",
  tags: ["animal", "savanna", "lion", "toybox10k"],
};

// A one-hump camel (dromedary, #124): the camel with its two humps replaced by one big one in the middle.
critters.dromedary = {
  like: "camel",
  dropIndex: [3, 4],
  add: [{ p: "sphere", at: [0, 0.86, -0.07], s: [0.48, 0.5, 0.44] }],
  description: "A dromedary: a one-hump desert camel (the catalog camel has two humps), sandy and gentle, with the camel's head, neck and tail.",
  tags: ["animal", "desert", "camel", "toybox10k"],
};

const out = {
  description: "Toybox 10K props from ENGINE_REQUESTS #120-#140 (lemon, napkin, muffin, hand_puppet, saw, bugle, bubble_machine, letter_sock, letter_kite, bed_sign, teacup, teapot, suitcase, puppet_theater, mouse_door, luggage_cart, letter_board, lamp_post, windup_key, smiling_rock, house_cutaway) and the dromedary critter. Generated by tools/gen_tk_props3.mjs: edit the generator and rerun it, not the JSON.",
  props,
  critters,
};
const file = fileURLToPath(new URL("../catalog/models/tk_props3.json", import.meta.url));
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log("wrote", file, Object.keys(props).length, "props,", Object.keys(critters).length, "critters");
