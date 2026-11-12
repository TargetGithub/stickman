#!/usr/bin/env node
// Writes catalog/models/tk_phonics.json: picture props for grade 1 phonics words (ENGINE_REQUESTS #81, #62), so a
// picture card can show the word without spelling it: push_pin, zipper, wig, bib, pie, necktie, nine_dots, mop,
// spinning_top, rope_coil, nose_face, garden_hose, hand_fan, nail, road_piece, folded_map, hug_pair, fluffy_tail,
// frying_pan, music_note, ten_dots, bubble_gum, huge_ball, flute, prune, sack, ham, flag, ocean_wave, board_game,
// clothes_peg, hand_wave. Parts are laid out here in code, so edit this file, not the JSON:
//   node engine3d/tools/gen_tk_phonics.mjs
// Conventions: each prop stands on y = 0 facing +z (the camera), about 1 m across at size 1, the word's object
// shown the way a picture book draws it (a side view where that reads best). Cards fit pictures to themselves, so
// sizes only matter beside other toys.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEG = 180 / Math.PI;
const rd = (v) => Math.round(v * 1000) / 1000;
const r3 = (v) => (Array.isArray(v) ? v.map(rd) : rd(v));
const P = (p, at, s, o = {}) => {
  const q = { p, at: r3(at), s: r3(s), ...o };
  if (o.r) q.r = r3(o.r);
  return q;
};
/** Rotation (degrees, XYZ) that turns +y toward direction n. */
function yTo(n) {
  const L = Math.hypot(...n);
  const [x, y, z] = n.map((v) => v / L);
  return [Math.atan2(z, y) * DEG, 0, -Math.asin(x) * DEG];
}
/** A cylinder rod from p0 to p1, width w. */
function rod(p0, p1, w, o = {}) {
  const d = p1.map((v, i) => v - p0[i]);
  const mid = p0.map((v, i) => (v + p1[i]) / 2);
  return P("cylinder", mid, [w, Math.hypot(...d), w], { ...o, r: yTo(d) });
}
const ball = (at, w, o = {}) => P("sphere", at, [w, w, w], o);
/** Dots laid out like a ten frame or dice rows: rows of n per row, each a puffy disc facing +z. */
function dots(count, perRow, c, gap = 0.3, y0 = 0.15, w = gap * 0.8) {
  const out = [];
  const rows = Math.ceil(count / perRow);
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / perRow);
    const k = i % perRow;
    out.push(P("circle", [(k - (perRow - 1) / 2) * gap, y0 + (rows - 1 - r) * gap, 0.06], [w, w, 0.5], { c }));
  }
  return out;
}

const props = {};
const add = (name, color, description, tags, parts) => (props[name] = { color, description, tags: [...tags, "phonics_picture", "toybox10k"], parts });

// --- short vowels -----------------------------------------------------------------------------------------------
add("push_pin", "red", "A push pin (pin): a round red head on a short silver point, standing point down, 0.8 m tall. For the short-i word pin.", ["school", "pin"], [
  P("cylinder", [0, 0.2, 0], [0.06, 0.4, 0.06], { c: "grey", m: "glossy" }),
  P("cone", [0, 0.04, 0], [0.06, 0.08, 0.06], { c: "grey", m: "glossy", r: [180, 0, 0] }),
  P("cylinder", [0, 0.44, 0], [0.36, 0.08, 0.36]),
  P("cylinder", [0, 0.56, 0], [0.22, 0.2, 0.22]),
  P("sphere", [0, 0.68, 0], [0.42, 0.24, 0.42], { m: "glossy" }),
]);

const zip = [P("box", [0, 0.55, 0], [0.5, 1.1, 0.04], { c: "denim" })];
for (let i = 0; i < 9; i++) for (const sd of [-1, 1]) zip.push(P("box", [sd * 0.035, 0.12 + i * 0.075 + (sd > 0 ? 0.035 : 0), 0.03], [0.07, 0.04, 0.03], { c: "gold", m: "glossy" }));
zip.push(P("box", [0, 0.86, 0.05], [0.14, 0.12, 0.05], { m: "glossy" }), P("box", [0, 0.72, 0.07], [0.08, 0.2, 0.03], { m: "glossy", name: "pull" }));
add("zipper", "gold", "A zipper (zip) on a strip of blue cloth: gold teeth up the middle, the slider and its pull tab near the top (named part `pull`: move it down to unzip). For the short-i word zip.", ["clothes", "zip"], zip);

add("wig", "yellow", "A curly wig on a round grey stand: a puffy cap of bouncy curls in its main colour (yellow), 0.9 m tall. For the short-i word wig.", ["dress_up", "wig", "hair"], [
  P("cylinder", [0, 0.05, 0], [0.4, 0.1, 0.4], { c: "wood_dark" }),
  P("cylinder", [0, 0.25, 0], [0.08, 0.3, 0.08], { c: "grey" }),
  P("sphere", [0, 0.55, 0], [0.48, 0.5, 0.46], { c: "cream", m: "matte" }),
  ...[[-0.2, 0.62, 0.1], [0.2, 0.62, 0.1], [0, 0.78, 0.08], [-0.24, 0.42, 0.06], [0.24, 0.42, 0.06], [-0.12, 0.8, -0.08], [0.12, 0.8, -0.08], [0, 0.66, -0.2], [-0.25, 0.6, -0.12], [0.25, 0.6, -0.12]].map((a) => ball(a, 0.24, { m: "matte", name: "curls" })),
]);

add("bib", "sky", "A baby's bib: a rounded cloth in its main colour (sky blue) with a white trim, a neck hole and two ties, a yellow duck on the front, 0.8 m tall, standing upright facing the camera. For the short-i word bib.", ["baby", "bib", "clothes"], [
  P("circle", [0, 0.36, 0], [0.7, 0.7, 0.2]),
  P("hoop", [0, 0.36, 0.01], [0.74, 0.74, 0.74], { c: "white", r: [90, 0, 0] }),
  P("circle", [0, 0.72, 0.02], [0.3, 0.3, 0.25], { c: "white" }),
  rod([-0.15, 0.72, 0.02], [-0.32, 0.92, 0.02], 0.04, { c: "white" }),
  rod([0.15, 0.72, 0.02], [0.32, 0.92, 0.02], 0.04, { c: "white" }),
  ball([0, 0.3, 0.06], 0.18, { c: "yellow" }),
  ball([0.07, 0.4, 0.07], 0.12, { c: "yellow" }),
  P("cone", [0.14, 0.4, 0.07], [0.05, 0.06, 0.05], { c: "orange", r: [0, 0, -90] }),
]);

add("mop", "cream", "A floor mop standing up: a wooden handle and a big fluffy head of cream strings on the floor, 1.1 m tall. For the short-o word mop.", ["cleaning", "mop", "home"], [
  P("cylinder", [0, 0.68, 0], [0.08, 0.9, 0.08], { c: "wood" }),
  P("cylinder", [0, 0.24, 0], [0.26, 0.1, 0.26], { c: "blue" }),
  ...[-0.24, -0.16, -0.08, 0, 0.08, 0.16, 0.24].flatMap((x) => [P("capsule", [x, 0.11, 0.05], [0.11, 0.26, 0.11], { m: "matte", name: "strings", r: [0, 0, x * 70] }), P("capsule", [x * 0.85, 0.11, -0.06], [0.11, 0.26, 0.11], { m: "matte", name: "strings", r: [0, 0, -x * 70] })]),
]);

add("spinning_top", "red", "A toy spinning top on its point: a striped round body (red and yellow), a short handle on top, 0.7 m tall (spin it about y to spin). For the short-o word top.", ["toy", "top", "spin"], [
  P("cone", [0, 0.12, 0], [0.18, 0.24, 0.18], { c: "wood_dark", r: [180, 0, 0] }),
  P("sphere", [0, 0.34, 0], [0.62, 0.36, 0.62], { m: "glossy" }),
  P("torus", [0, 0.36, 0], [0.62, 0.62, 0.3], { c: "yellow", m: "glossy", r: [90, 0, 0] }),
  P("cone", [0, 0.5, 0], [0.5, 0.12, 0.5], { c: "yellow", m: "glossy" }),
  P("cylinder", [0, 0.62, 0], [0.07, 0.16, 0.07], { c: "wood" }),
]);

add("hand_fan", "pink", "A folding paper fan opened into a half circle: pleats in its main colour (pink) and white, fanning up from a little wooden handle, 1 m wide, facing the camera. For the short-a word fan.", ["fan", "summer"], [
  ...Array.from({ length: 9 }, (_, i) => {
    const a = (-80 + i * 20) / DEG;
    return P("triangle", [Math.sin(a) * 0.3, 0.12 + Math.cos(a) * 0.3, (i % 2) * 0.01], [0.24, 0.62, 0.15], { c: i % 2 ? "white" : undefined, m: "matte", r: [0, 0, 180 - a * DEG] });
  }),
  P("cylinder", [0, 0.06, 0.03], [0.07, 0.14, 0.07], { c: "wood_dark" }),
]);

add("frying_pan", "charcoal", "A frying pan seen from above, its round face to the camera: a dark pan with a grey cooking surface and a long wooden handle down to the right, 1 m across. For the short-a word pan.", ["kitchen", "pan", "cooking"], [
  P("cylinder", [-0.1, 0.5, 0], [0.7, 0.08, 0.7], { m: "glossy", r: [90, 0, 0] }),
  P("cylinder", [-0.1, 0.5, 0.03], [0.6, 0.04, 0.6], { c: "grey", m: "glossy", r: [90, 0, 0] }),
  rod([0.2, 0.32, 0], [0.38, 0.2, 0], 0.07, { c: "charcoal" }),
  rod([0.34, 0.22, 0], [0.56, 0.06, 0], 0.1, { c: "wood" }),
]);

add("folded_map", "cream", "A folded paper treasure map standing open: three panels with a dotted path, a river, a tree and a red X, 1 m wide. For the short-a word map.", ["map", "treasure", "adventure"], [
  P("box", [-0.33, 0.4, 0.04], [0.33, 0.7, 0.02], { r: [0, 18, 0] }),
  P("box", [0, 0.4, 0], [0.33, 0.7, 0.02]),
  P("box", [0.33, 0.4, 0.04], [0.33, 0.7, 0.02], { r: [0, -18, 0] }),
  P("box", [-0.1, 0.45, 0.02], [0.06, 0.6, 0.01], { c: "sky", r: [0, 0, 20] }),
  ...[[-0.36, 0.2], [-0.28, 0.3], [-0.16, 0.33], [-0.04, 0.3], [0.08, 0.36], [0.2, 0.44], [0.28, 0.54]].map(([x, y]) => ball([x, y, 0.08], 0.04, { c: "barn_red" })),
  P("cross", [0.34, 0.6, 0.08], [0.16, 0.16, 0.2], { c: "red" }),
  P("cone", [-0.3, 0.6, 0.08], [0.14, 0.18, 0.04], { c: "leaf" }),
]);

add("hug_pair", "brown", "Two round toy bears hugging, arms around each other (a hug): one brown, one honey, eyes closed and smiling, 0.9 m tall. For the short-u word hug.", ["hug", "love", "friends"], [
  ...[[-0.2, "brown"], [0.2, "hay"]].flatMap(([x, c]) => [
    ball([x, 0.3, 0], 0.5, { c }),
    ball([x * 0.95, 0.7, 0], 0.4, { c }),
    ball([x * 1.5, 0.88, 0], 0.13, { c }),
    ball([x * 0.4, 0.9, 0], 0.13, { c }),
    ball([x * 0.85, 0.66, 0.18], 0.13, { c: "cream" }),
    P("crescent", [x * 0.95 - 0.06 * Math.sign(x), 0.75, 0.2], [0.07, 0.05, 0.1], { c: "ink", r: [0, 0, 90] }),
  ]),
  rod([-0.38, 0.42, 0.1], [0.12, 0.46, 0.22], 0.12, { c: "brown" }),
  rod([0.38, 0.4, 0.1], [-0.12, 0.38, 0.24], 0.12, { c: "hay" }),
  P("heart", [0, 1.02, 0], [0.18, 0.18, 0.2], { c: "pink" }),
]);

add("ten_dots", "red", "Ten red counters in two rows of five on a sky-blue board (a full ten frame), 1.1 m wide: a picture of the number ten without the word.", ["number", "ten", "counting"], [
  P("box", [0, 0.29, 0], [1.1, 0.5, 0.06], { c: "sky" }),
  ...dots(10, 5, undefined, 0.21, 0.18),
]);

add("bubble_gum", "pink", "A big pink bubble-gum bubble blown from a little pink wrapper with a white stripe, 0.8 m tall. For the short-u word gum.", ["candy", "gum"], [
  ball([0, 0.48, 0.04], 0.62, { m: "glossy" }),
  ball([-0.12, 0.6, 0.3], 0.1, { c: "white", m: "glossy" }),
  P("box", [0.18, 0.06, 0.25], [0.3, 0.12, 0.1], { c: "rose" }),
  P("box", [0.18, 0.06, 0.305], [0.3, 0.03, 0.01], { c: "white" }),
]);

add("sack", "hay", "A tied burlap sack, plump and soft, with a twine bow at its neck, 0.9 m tall. For the short-a word sack.", ["farm", "sack", "bag"], [
  P("egg", [0, 0.4, 0], [0.7, 0.8, 0.6], { m: "matte" }),
  P("cylinder", [0, 0.82, 0], [0.18, 0.1, 0.18], { m: "matte" }),
  P("torus", [0, 0.8, 0], [0.24, 0.24, 0.3], { c: "twine", r: [90, 0, 0] }),
  P("cone", [0, 0.92, 0], [0.26, 0.16, 0.22], { m: "matte", r: [180, 0, 0] }),
]);

add("ham", "rose", "A cartoon ham on the bone, turned so its pale pink cut face shows: a plump rosy joint and a white bone sticking out to the right, 0.9 m long. For the short-a word ham.", ["food", "ham"], [
  P("egg", [-0.06, 0.32, -0.04], [0.6, 0.62, 0.5], { r: [0, 0, 70] }),
  P("circle", [-0.2, 0.32, 0.2], [0.46, 0.5, 0.2], { c: "pink" }),
  P("circle", [-0.2, 0.32, 0.23], [0.2, 0.22, 0.2], { c: "white" }),
  rod([0.18, 0.32, 0], [0.46, 0.34, 0], 0.08, { c: "white" }),
  ball([0.48, 0.38, 0], 0.12, { c: "white" }),
  ball([0.48, 0.3, 0], 0.12, { c: "white" }),
]);

add("flag", "red", "A little flag on a pole: a rectangle of cloth in its main colour (red) with a white star, on a wooden pole with a gold ball, 1.2 m tall (wiggle the named part `cloth` to wave it). For the short-a word flag.", ["flag"], [
  P("cylinder", [-0.3, 0.6, 0], [0.05, 1.2, 0.05], { c: "wood_dark" }),
  ball([-0.3, 1.22, 0], 0.09, { c: "gold", m: "glossy" }),
  P("box", [0.02, 0.98, 0], [0.6, 0.4, 0.02], { name: "cloth" }),
  P("star", [0.02, 0.98, 0.02], [0.2, 0.2, 0.1], { c: "white", name: "cloth" }),
]);

add("clothes_peg", "wood", "A wooden clothes peg (peg), two prongs held by a silver spring, standing up, 0.9 m tall. For the short-e word peg.", ["laundry", "peg"], [
  P("box", [-0.06, 0.45, 0], [0.1, 0.9, 0.14], { r: [0, 0, -3] }),
  P("box", [0.06, 0.45, 0], [0.1, 0.9, 0.14], { r: [0, 0, 3] }),
  P("torus", [0, 0.5, 0], [0.24, 0.24, 0.5], { c: "grey", m: "glossy", r: [0, 90, 0] }),
]);

// --- long vowels (silent e, vowel teams) ---------------------------------------------------------------------------
add("pie", "bun_gold", "A round fruit pie seen from above, its face to the camera: a golden crust rim and a criss-cross lattice over red filling, in a white dish, 0.9 m across. For the long-i word pie.", ["food", "pie", "baking"], [
  P("cylinder", [0, 0.45, -0.04], [0.92, 0.06, 0.92], { c: "white", r: [90, 0, 0] }),
  P("cylinder", [0, 0.45, 0], [0.8, 0.04, 0.8], { c: "red", r: [90, 0, 0] }),
  ...[-0.2, 0, 0.2].flatMap((v) => {
    const L = 2 * Math.sqrt(0.38 ** 2 - v ** 2);
    return [P("box", [v, 0.45, 0.03], [0.08, L, 0.03]), P("box", [0, 0.45 + v, 0.05], [L, 0.08, 0.03])];
  }),
  P("hoop", [0, 0.45, 0.02], [0.9, 4, 0.9], { r: [90, 0, 0] }),
  P("hoop", [0, 0.45, 0.02], [0.82, 4, 0.82], { r: [90, 0, 0] }),
]);

add("necktie", "blue", "A necktie (tie) in its main colour (blue) with yellow stripes and a knot at the top, hanging straight, 1.1 m tall. For the long-i word tie.", ["clothes", "tie"], [
  P("diamond", [0, 0.94, 0], [0.24, 0.2, 0.2]),
  P("triangle", [0, 0.52, 0], [0.34, 0.75, 0.2], { r: [0, 0, 180] }),
  P("diamond", [0, 0.16, 0], [0.38, 0.32, 0.2]),
  ...[0.75, 0.55, 0.35].map((y) => P("box", [0, y, 0.05], [0.26 - (0.8 - y) * 0.1, 0.04, 0.02], { c: "yellow", r: [0, 0, -25] })),
]);

add("nine_dots", "blue", "Nine counters in three rows of three on a yellow board, 0.9 m wide: a picture of the number nine without the word.", ["number", "nine", "counting"], [
  P("box", [0, 0.42, 0], [0.84, 0.82, 0.06], { c: "yellow" }),
  ...dots(9, 3, undefined, 0.25, 0.17),
]);

add("rope_coil", "twine", "A coiled rope (rope) seen from above, face to the camera: a thick rope wound in a flat spiral with one loose end, 1 m across. For the long-o word rope.", ["rope", "outdoor"], [
  ...[0.9, 0.66, 0.42].map((w, k) => P("torus", [k * 0.02, 0.48, k * 0.02], [w, w, 0.45], { m: "matte" })),
  ball([0.04, 0.48, 0.05], 0.14, { m: "matte" }),
  rod([0.42, 0.42, 0.02], [0.62, 0.12, 0.04], 0.1, { m: "matte" }),
]);

add("nose_face", "toddler_skin", "A friendly round face with a big round nose in the middle (point at the named part `nose`), small eyes and a smile, 0.9 m tall. For the long-o word nose.", ["body", "nose", "face"], [
  P("circle", [0, 0.45, 0], [0.9, 0.9, 0.4]),
  ball([0, 0.42, 0.1], 0.26, { c: "rose", name: "nose" }),
  ball([-0.18, 0.6, 0.07], 0.08, { c: "ink" }),
  ball([0.18, 0.6, 0.07], 0.08, { c: "ink" }),
  P("half_circle", [0, 0.22, 0.08], [0.24, 0.12, 0.2], { c: "barn_red", r: [0, 0, 180] }),
]);

add("garden_hose", "green", "A green garden hose coiled in loops facing the camera, its yellow nozzle spraying a little water, 1 m across. For the long-o word hose.", ["garden", "hose", "water"], [
  ...[0.8, 0.6, 0.4].map((w, k) => P("torus", [-0.1 + k * 0.03, 0.45, k * 0.02], [w, w, 0.35], { m: "rubber" })),
  rod([0.28, 0.3, 0.02], [0.45, 0.2, 0.04], 0.07, { m: "rubber" }),
  rod([0.45, 0.2, 0.04], [0.6, 0.24, 0.04], 0.1, { c: "yellow", m: "glossy" }),
  ...[[0.7, 0.3, 0.05], [0.74, 0.22, 0.05], [0.68, 0.18, 0.05]].map((a) => P("drop", a, [0.06, 0.08, 0.06], { c: "sky", m: "glossy", r: [0, 0, -70] })),
]);

add("nail", "grey", "A big shiny nail standing point down: a flat round head on a long shaft, 0.9 m tall. For the long-a word nail.", ["tools", "nail"], [
  P("cylinder", [0, 0.45, 0], [0.08, 0.7, 0.08], { m: "glossy" }),
  P("cone", [0, 0.05, 0], [0.08, 0.12, 0.08], { m: "glossy", r: [180, 0, 0] }),
  P("cylinder", [0, 0.82, 0], [0.28, 0.05, 0.28], { m: "glossy" }),
]);

add("road_piece", "charcoal", "A stretch of road going away into the distance, drawn like a picture facing the camera: dark asphalt narrowing toward the top, dashed yellow centre lines, green grass either side, 1 m wide. For the long-o word road.", ["road", "town", "street"], [
  P("box", [0, 0.45, -0.03], [1, 0.9, 0.04], { c: "leaf" }),
  P("triangle", [0, 0.45, 0], [0.9, 0.95, 0.2]),
  ...[[0.12, 0.08], [0.32, 0.065], [0.5, 0.05], [0.65, 0.035]].map(([y, w]) => P("box", [0, y, 0.04], [w * 0.6, w * 1.6, 0.02], { c: "yellow" })),
]);

add("fluffy_tail", "orange", "A big bushy animal tail (tail) curling up, in its main colour (orange) with a white tip, 1 m tall. For the long-a word tail.", ["animal", "tail"], [
  ...[[0, 0.15, 0.3], [0.14, 0.3, 0.34], [0.22, 0.5, 0.36], [0.2, 0.7, 0.34], [0.08, 0.86, 0.3]].map(([x, y, w]) => ball([x, y, 0], w, { m: "matte", name: "tail" })),
  ball([-0.04, 0.98, 0], 0.24, { c: "white", m: "matte", name: "tail" }),
]);

add("music_note", "purple", "A music note (an eighth note): a round head, a stem and a flag, in its main colour (purple), 1 m tall, facing the camera. For the long-o word note.", ["music", "note"], [
  P("oval", [-0.12, 0.16, 0], [0.4, 0.3, 0.3], { r: [0, 0, 20] }),
  P("box", [0.06, 0.55, 0], [0.06, 0.8, 0.08]),
  P("leaf", [0.2, 0.82, 0], [0.24, 0.36, 0.2], { r: [0, 0, -150] }),
]);

add("huge_ball", "red", "A huge red ball towering over a tiny blue toy block beside it (huge), 1.2 m tall: size shown by contrast. For the long-u word huge.", ["size", "huge", "big"], [
  ball([0, 0.6, 0], 1.2, { m: "glossy" }),
  P("torus", [0, 0.6, 0], [1.2, 1.2, 0.2], { c: "white", m: "glossy", r: [90, 0, 0] }),
  P("block", [0.78, 0.07, 0.3], [0.14, 0.14, 0.14], { c: "blue" }),
]);

add("flute", "grey", "A shiny silver flute held on a slant, its gold keys along the front, 1 m long. For the long-u word flute.", ["music", "flute", "instrument"], [
  rod([-0.45, 0.1, 0], [0.45, 0.62, 0], 0.1, { m: "glossy" }),
  ...[-0.22, -0.08, 0.06, 0.18, 0.28].map((t) => ball([t, 0.36 + t * 0.58, 0.05], 0.07, { c: "gold", m: "glossy" })),
  ball([-0.36, 0.15, 0.05], 0.07, { c: "charcoal" }),
]);

add("prune", "purple", "A plump dark purple prune (a dried plum) with a soft shine and a small brown stalk, 0.6 m wide. For the long-u word prune.", ["food", "fruit", "prune"], [
  P("egg", [0, 0.3, 0], [0.6, 0.5, 0.45], { r: [0, 0, 90] }),
  ball([-0.12, 0.44, 0.17], 0.08, { c: "white", m: "glossy" }),
  rod([0.24, 0.48, 0], [0.3, 0.6, 0], 0.03, { c: "wood_dark" }),
]);

add("ocean_wave", "sea", "An ocean wave curling over with white foam on its crest, 1.2 m wide, from the side. For the long-a word wave (the sea's wave; hand_wave is a waving hand).", ["sea", "wave", "beach"], [
  P("half_circle", [0, 0.1, 0], [1.2, 0.4, 0.4]),
  P("crescent", [0.05, 0.55, 0], [0.9, 0.9, 0.4], { r: [0, 0, -30] }),
  ...[[-0.05, 0.98], [0.15, 0.98], [0.32, 0.88], [0.42, 0.72]].map(([x, y]) => ball([x, y, 0.05], 0.14, { c: "white", m: "matte" })),
]);

add("hand_wave", "toddler_skin", "A friendly open hand waving hello (wave): palm to the camera, fingers spread, little motion lines beside it, 0.9 m tall. Wiggle the named part `hand` to wave.", ["wave", "hello", "hand"], [
  P("circle", [0, 0.35, 0], [0.44, 0.48, 0.3], { name: "hand" }),
  ...[[-0.15, 0.24], [-0.05, 0.27], [0.05, 0.27], [0.15, 0.24]].map(([x, h], i) => P("capsule", [x, 0.6 + h / 2 - 0.1, 0], [0.09, h, 0.09], { name: "hand", r: [0, 0, (i - 1.5) * 6] })),
  P("capsule", [-0.25, 0.36, 0], [0.09, 0.22, 0.09], { name: "hand", r: [0, 0, 50] }),
  P("box", [0, 0.06, 0], [0.24, 0.14, 0.12], { c: "sky" }),
  ...[0.35, 0.5, 0.65].map((y) => P("crescent", [0.42, y, 0], [0.1, 0.16, 0.08], { c: "grey" })),
]);

add("board_game", "green", "A board game ready to play, its board facing the camera: a winding path of coloured squares round the edge, two counters and a white die in front, 1 m across. For the long-a word game.", ["game", "toy", "play"], [
  P("box", [0, 0.5, -0.04], [0.9, 0.9, 0.06]),
  ...Array.from({ length: 12 }, (_, i) => {
    const k = i % 3;
    const side = Math.floor(i / 3);
    const t = -0.3 + k * 0.3;
    const at = [[t, 0.85], [0.35, 0.5 + t], [-t, 0.15], [-0.35, 0.5 - t]][side];
    return P("box", [at[0], at[1], 0], [0.16, 0.16, 0.03], { c: ["red", "yellow", "blue", "orange", "purple", "white"][i % 6] });
  }),
  P("star", [0, 0.5, 0], [0.26, 0.26, 0.1], { c: "gold" }),
  P("cone", [-0.18, 0.08, 0.15], [0.1, 0.16, 0.1], { c: "red", m: "glossy" }),
  P("cone", [0.0, 0.08, 0.18], [0.1, 0.16, 0.1], { c: "blue", m: "glossy" }),
  P("block", [0.22, 0.08, 0.15], [0.15, 0.15, 0.15], { c: "white", r: [0, 25, 0] }),
]);

// ENGINE_REQUESTS #157: more grade 1 words.
add("fig", "purple", "A ripe fig: a plump purple teardrop with a short stalk and a cut half beside it showing pink seedy flesh, 0.5 m. For the short-i word fig.", ["food", "fruit", "fig"], [
  P("drop", [-0.12, 0.26, 0], [0.4, 0.48, 0.36], { m: "glossy" }),
  rod([-0.12, 0.5, 0], [-0.1, 0.58, 0], 0.03, { c: "wood_dark" }),
  P("circle", [0.2, 0.22, 0.05], [0.3, 0.36, 0.2], { c: "purple" }),
  P("circle", [0.2, 0.22, 0.08], [0.24, 0.3, 0.2], { c: "pink" }),
  ...[[0.17, 0.25], [0.23, 0.2], [0.2, 0.28], [0.25, 0.26], [0.16, 0.18]].map(([x, y]) => ball([x, y, 0.12], 0.025, { c: "cream" })),
]);
add("finger_poke", "toddler_skin", "A hand with one finger poking forward (a jab, a quick poke): a fist with the pointing finger out to the right and little motion lines, 0.6 m. For the short-a word jab.", ["hand", "poke", "jab"], [
  P("box", [-0.1, 0.3, 0], [0.3, 0.26, 0.2]),
  P("capsule", [0.16, 0.36, 0], [0.24, 0.09, 0.09], { r: [0, 0, 90] }),
  P("capsule", [-0.1, 0.24, 0.12], [0.24, 0.07, 0.07], { r: [0, 0, 90] }),
  P("box", [-0.3, 0.3, 0], [0.12, 0.22, 0.18], { c: "sky" }),
  ...[0.22, 0.36, 0.5].map((y) => P("box", [0.42, y, 0], [0.12, 0.025, 0.02], { c: "grey" })),
]);
add("door_knock", "wood", "A fist rapping on a wooden door (rap: knock knock): a door panel with a knocker plate and a small fist at it, curved knock lines beside, 0.9 m tall. For the short-a word rap.", ["door", "knock", "rap"], [
  P("box", [0, 0.45, -0.05], [0.6, 0.9, 0.06]),
  P("box", [0, 0.45, -0.01], [0.48, 0.78, 0.02], { c: "wood_dark" }),
  P("box", [0.1, 0.55, 0.05], [0.18, 0.15, 0.12], { c: "toddler_skin" }),
  P("box", [0.24, 0.55, 0.05], [0.12, 0.12, 0.1], { c: "sky" }),
  ...[0.45, 0.6, 0.75].map((y) => P("crescent", [-0.12, y, 0.03], [0.08, 0.12, 0.05], { c: "grey", r: [0, 0, 180] })),
]);
add("wedding_rings", "gold", "Two shiny gold wedding rings linked together with a little heart above them (wed), 0.5 m wide. For the short-e word wed.", ["wedding", "rings", "wed"], [
  P("torus", [-0.1, 0.24, 0], [0.32, 0.32, 0.4], { m: "glossy" }),
  P("torus", [0.1, 0.24, 0.02], [0.32, 0.32, 0.4], { m: "glossy", r: [0, 30, 0] }),
  P("heart", [0, 0.52, 0], [0.16, 0.16, 0.15], { c: "pink" }),
]);
add("fishing_rod", "wood", "A fishing rod held on a slant: a long wooden rod with a reel, a line hanging from its tip and a red-and-white float, 1.2 m. For the short-o word rod.", ["fishing", "rod"], [
  rod([-0.5, 0.05, 0], [0.45, 0.9, 0], 0.04),
  P("cylinder", [-0.32, 0.2, 0.04], [0.12, 0.05, 0.12], { c: "grey", r: [90, 0, 0] }),
  rod([0.45, 0.9, 0], [0.45, 0.25, 0], 0.008, { c: "white" }),
  ball([0.45, 0.22, 0], 0.08, { c: "red" }),
  ball([0.45, 0.17, 0], 0.06, { c: "white" }),
]);
add("glum_face", "sky", "A glum face (sad and fed up): a round face in its main colour with droopy eyes under flat brows and a down-turned mouth, 0.8 m. For the short-u word glum.", ["feelings", "sad", "glum"], [
  P("circle", [0, 0.4, 0], [0.8, 0.8, 0.4]),
  ...[-1, 1].flatMap((sd) => [P("half_circle", [sd * 0.16, 0.48, 0.08], [0.12, 0.07, 0.1], { c: "ink", r: [0, 0, 180] }), P("box", [sd * 0.16, 0.57, 0.08], [0.16, 0.03, 0.03], { c: "ink", r: [0, 0, sd * 8] })]),
  P("half_circle", [0, 0.22, 0.08], [0.26, 0.1, 0.06], { c: "ink" }),
]);
add("plop_splash", "sky", "A plop: a fat water drop landing in a puddle with a little crown splash and ripples, 0.7 m. For the short-o word plop.", ["water", "splash", "plop"], [
  P("cylinder", [0, 0.01, 0], [0.8, 0.02, 0.5], { c: "sea", m: "glossy" }),
  P("torus", [0, 0.03, 0], [0.5, 0.3, 0.3], { c: "white", r: [90, 0, 0] }),
  ...[-0.15, -0.05, 0.05, 0.15].map((x, i) => P("drop", [x, 0.16 + (i % 2) * 0.05, 0], [0.06, 0.1, 0.06], { c: "sky", m: "glossy", r: [0, 0, x * -200] })),
  P("drop", [0, 0.48, 0], [0.16, 0.22, 0.16], { m: "glossy" }),
]);

const out = {
  description: "Toybox 10K picture props for grade 1 phonics words (ENGINE_REQUESTS #81): one recognisable object per word so a picture card shows the word without spelling it. See catalog/asset_map.json for word -> prop. Generated by tools/gen_tk_phonics.mjs: edit the generator and rerun it, not the JSON.",
  props,
};
const file = fileURLToPath(new URL("../catalog/models/tk_phonics.json", import.meta.url));
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log("wrote", file, Object.keys(props).length, "props");
