// More composite kinds (composite.js explains the idea): a `sign` (a board on a post, hanging or on a wall, with
// its words laid out), a `word_train` (an engine pulling cars that each carry a word tile) and a `book` (a big open
// book whose leaves turn on the spine with turn_page). Each becomes a group plus plain child objects. Pure.

import { cardHeight } from "./teach_layout.js";

const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);
/** Space between a book's stacked leaves: more than a text card stands off its page (0.032 m), so no page shows through another. */
export const LEAF = 0.05;
/** A plate standing up, its front face at z = front, centred at (x, y). */
const slab = (x, y, front, w, h, t, color, material = "matte") => ({ kind: "shape", shape: "plate", color, material, at: r3([x, y, front - t]), rotation: [90, 0, 0], scale: r3([w, t / 0.04, h]) });

export const COMPOSITE2_FIELDS = {
  sign: ["style", "text", "width", "height", "size", "color", "bg", "rim", "post"],
  word_train: ["words", "colors", "engine", "gap", "tile", "tileSize"],
  book: ["spreads", "width", "height", "size", "color", "bg", "accent", "frame"],
  choices: ["options", "style", "layout", "gap", "width", "color", "bg", "maxWidth"],
  track: ["style", "length", "width", "color", "posts"],
  crowd: ["count", "rows", "cast", "spacing", "facing", "size"],
  sound_boxes: ["count", "box", "color", "tokenColor", "tokenColors", "gap", "bg"],
};

/**
 * sound_boxes (#135): a row of empty boxes (one per sound in a word: Elkonin boxes) on a board, with a round token
 * waiting under each. fill_box slides token k up into box k. Pieces: <id>_board, <id>_b<k> (box frames, each a
 * group whose middle is where its token lands), <id>_t<k> (tokens). at: the foot of the board's middle.
 */
export function expandSoundBoxes(o, catalog, add, err) {
  const n = o.count ?? 3;
  if (!(Number.isInteger(n) && n >= 1 && n <= 6)) return err("E3D_RANGE", "count", "count must be 1-6 boxes");
  const B = o.box ?? 0.7;
  if (!(typeof B === "number" && B >= 0.3 && B <= 1.5)) return err("E3D_RANGE", "box", "box must be 0.3-1.5 m");
  const gap = o.gap ?? 0.12;
  const W = n * B + (n - 1) * gap;
  const by = 0.25 + B * 1.35; // box middles: the tokens wait below them
  const ty = 0.25 + B * 0.4;
  add("board", slab(0, (by + B / 2 + 0.15 + 0.1) / 2, -0.02, W + 0.5, by + B / 2 + 0.15 - 0.1, 0.04, o.bg ?? "cream"));
  const colors = o.tokenColors ?? [];
  for (let k = 0; k < n; k++) {
    const x = -W / 2 + B / 2 + k * (B + gap);
    add(`b${k + 1}`, { kind: "group", at: r3([x, by, 0.03]) });
    // The box: four bars round an empty square.
    const t = 0.05;
    for (const [nm, dx, dy, w, h] of [["top", 0, B / 2, B, t], ["bot", 0, -B / 2, B, t], ["l", -B / 2, 0, t, B + t], ["r", B / 2, 0, t, B + t]]) {
      add(`b${k + 1}_${nm}`, { kind: "shape", shape: "box", color: o.color ?? "ink", parent: `${o.id}_b${k + 1}`, at: r3([dx, dy - h / 2, 0]), scale: r3([w, h, 0.04]) });
    }
    add(`t${k + 1}`, { kind: "shape", shape: "disc", color: colors[k] ?? o.tokenColor ?? "red", material: "glossy", at: r3([x, ty, 0.06]), rotation: [90, 0, 0], scale: r3([B * 0.55, 1, B * 0.55]) });
  }
}

const CROWD_CAST = ["bunny", "bear", "cat", "dog", "pig", "mouse", "duck", "squirrel", "owl", "raccoon", "hedgehog", "penguin"];

/**
 * crowd (#107): visitors or an audience of toy animals in rows, at the middle of the front row, facing +z (the
 * camera) or turned by facing. Each is <id>_m<k>; back rows stand a little to the side so faces show between.
 * cast: species to cycle through (default a mixed set); the mix and small turns are fixed, not random.
 */
export function expandCrowd(o, catalog, add, err) {
  const n = o.count ?? 8;
  if (!(Number.isInteger(n) && n >= 1 && n <= 24)) return err("E3D_RANGE", "count", "count must be 1-24");
  const rows = o.rows ?? (n > 8 ? 2 : 1);
  if (!(Number.isInteger(rows) && rows >= 1 && rows <= 4)) return err("E3D_RANGE", "rows", "rows must be 1-4");
  const cast = o.cast ?? CROWD_CAST;
  if (!Array.isArray(cast) || !cast.length) return err("E3D_CAST", "cast", "cast must be a list of critter species");
  const bad = cast.find((c) => !catalog.critters?.[c]);
  if (bad) return err("E3D_SPECIES", "cast", `"${bad}" is not a critter`);
  const gap = o.spacing ?? 0.9;
  const per = Math.ceil(n / rows);
  for (let k = 0; k < n; k++) {
    const r = Math.floor(k / per);
    const i = k % per;
    const inRow = Math.min(per, n - r * per);
    const x = (i - (inRow - 1) / 2) * gap + (r % 2 ? gap / 2 : 0);
    const turn = (((k * 37) % 5) - 2) * 5; // -10..10 degrees, a lively but fixed mix
    add(`m${k + 1}`, { kind: "critter", species: cast[(k * 5 + r) % cast.length], ...(o.size != null ? { size: o.size } : {}), at: r3([x, 0, -r * gap * 0.9]), rotation: [0, (o.facing ?? 0) + turn, 0] });
  }
}

/**
 * track (#92): a toy rail track (two rails on wooden sleepers) or a plank bridge (planks across, rope rails on
 * posts) lying on the floor along x, at its middle. Pieces: <id>_rail1/2, <id>_s<k> sleepers; <id>_p<k> planks,
 * <id>_post<k>, <id>_rope1/2. A train or a walker moves along x on top (rails at y 0.12, planks at y 0.1).
 */
export function expandTrack(o, catalog, add, err) {
  const style = o.style ?? "rail";
  if (!["rail", "plank"].includes(style)) return err("E3D_STYLE", "style", "track style must be rail or plank");
  const L = o.length ?? 6;
  const W = o.width ?? (style === "rail" ? 1 : 1.4);
  if (!(typeof L === "number" && L >= 1 && L <= 40)) return err("E3D_RANGE", "length", "length must be 1-40 m");
  if (!(typeof W === "number" && W >= 0.4 && W <= 4)) return err("E3D_RANGE", "width", "width must be 0.4-4 m");
  const box = (x, y, z, sx, sy, sz, color, material = "toy") => ({ kind: "shape", shape: "box", color, material, at: r3([x, y, z]), scale: r3([sx, sy, sz]) });
  if (style === "rail") {
    const n = Math.max(2, Math.round(L / 0.5));
    for (let k = 0; k < n; k++) add(`s${k + 1}`, box(-L / 2 + (k + 0.5) * (L / n), 0, 0, 0.18, 0.06, W + 0.2, o.color ?? "wood_dark"));
    for (const [i, z] of [[1, -W / 2 + 0.1], [2, W / 2 - 0.1]]) add(`rail${i}`, box(0, 0.06, z, L, 0.06, 0.07, "grey", "glossy"));
    return;
  }
  const n = Math.max(2, Math.round(L / 0.3));
  for (let k = 0; k < n; k++) add(`p${k + 1}`, box(-L / 2 + (k + 0.5) * (L / n), 0, 0, (L / n) * 0.86, 0.1, W, k % 2 ? o.color ?? "wood" : "plank", "matte"));
  if (o.posts !== false) {
    const posts = Math.max(2, Math.round(L / 1.5) + 1);
    for (let k = 0; k < posts; k++) {
      const x = -L / 2 + (k * L) / (posts - 1);
      for (const [j, z] of [[0, -W / 2], [1, W / 2]]) add(`post${2 * k + j + 1}`, { kind: "shape", shape: "cylinder", color: "wood_dark", at: r3([x, 0, z]), scale: [0.08, 0.75, 0.08] });
    }
    for (const [i, z] of [[1, -W / 2], [2, W / 2]]) add(`rope${i}`, { kind: "shape", shape: "cylinder", color: "twine", at: r3([-L / 2, 0.68, z]), rotation: [0, 0, -90], scale: r3([0.04, L, 0.04]) });
  }
}

/** Card widths as composite.js sizes them (word and tile grow with the text). */
const cardWidth = (style, n) => (style === "tile" ? Math.max(0.62, n * 0.18 + 0.25) : style === "strip" ? Math.min(7, Math.max(1.6, n * 0.085 + 0.6)) : Math.max(1, n * 0.13 + 0.5));
const CARD_H = { word: 0.55, tile: 0.62, strip: 0.5 };

/**
 * choices: 2-6 answer cards (<id>_o1 .. <id>_oN, challenge options) laid out for their text. layout auto: a row
 * when the cards fit side by side within maxWidth (default 7.6 m), else a column, the first on top, all one width
 * so long answers read as a list. at: the foot of the row's middle, or of the column's bottom card.
 */
export function expandChoices(o, catalog, add, err) {
  const opts = o.options ?? [];
  if (!Array.isArray(opts) || opts.length < 2 || opts.length > 6 || opts.some((t) => typeof t !== "string" || !t.trim() || t.length > 60)) {
    return err("E3D_OPTIONS", "options", "options must be 2-6 strings of 1-60 characters");
  }
  const style = o.style ?? "word";
  if (!CARD_H[style]) return err("E3D_STYLE", "style", "choices style must be word, tile or strip");
  const layout = o.layout ?? "auto";
  if (!["auto", "row", "column"].includes(layout)) return err("E3D_LAYOUT", "layout", "layout must be auto, row or column");
  const gap = o.gap ?? 0.3;
  const maxW = o.maxWidth ?? 7.6;
  const ws = opts.map((t) => o.width ?? cardWidth(style, t.length));
  const rowW = ws.reduce((a, w) => a + w, 0) + gap * (opts.length - 1);
  const row = layout === "row" || (layout === "auto" && rowW <= maxW);
  const H = CARD_H[style];
  const card = (i, x, y, w) => add(`o${i + 1}`, { kind: "card", style, text: opts[i], width: r3([w])[0], ...(o.color ? { color: o.color } : {}), ...(o.bg ? { bg: o.bg } : {}), at: r3([x, y, 0]) });
  if (row) {
    let x = -rowW / 2;
    opts.forEach((_, i) => {
      card(i, x + ws[i] / 2, 0, ws[i]);
      x += ws[i] + gap;
    });
  } else {
    const w = Math.min(maxW, Math.max(...ws));
    const g = Math.min(gap, 0.2);
    opts.forEach((_, i) => card(i, 0, (opts.length - 1 - i) * (H + g), w));
  }
}

/** sign: a board (text word-wrapped, centred) on a post, hanging from two ropes, or flat on a wall. at: the foot. */
export function expandSign(o, catalog, add, err) {
  const style = o.style ?? "post";
  if (!["post", "hanging", "wall"].includes(style)) return err("E3D_STYLE", "style", "sign style must be post, hanging or wall");
  const text = String(o.text ?? "");
  if (!text.trim() || text.length > 120) err("E3D_TEXT", "text", "a sign needs 1-120 characters of text");
  const W = o.width ?? 1.6;
  const S = o.size ?? 0.18;
  const H = o.height ?? Math.max(0.6, cardHeight({ text, width: W - 0.2, size: S }));
  const post = o.post ?? (style === "post" ? 1.2 : 0);
  const y0 = style === "post" ? post : style === "hanging" ? 2.2 : 1.2;
  if (style === "post") add("post", { kind: "shape", shape: "cylinder", color: "wood_dark", at: [0, 0, -0.06], scale: r3([0.1, post + H * 0.6, 0.1]) });
  if (style === "hanging") {
    for (const [k, x] of [["rope1", -W * 0.35], ["rope2", W * 0.35]]) add(k, { kind: "shape", shape: "cylinder", color: "twine", at: r3([x, y0 + H - 0.05, -0.02]), scale: r3([0.025, 0.7, 0.025]) });
  }
  add("rim", slab(0, y0 + H / 2, -0.005, W + 0.1, H + 0.1, 0.05, o.rim ?? "wood_dark", "toy"));
  add("board", slab(0, y0 + H / 2, 0, W, H, 0.05, o.bg ?? "wood", "toy"));
  add("text", { kind: "text_card", text, width: W - 0.12, height: H - 0.08, size: S, align: "center", bg: "none", pad: 0.2, color: o.color ?? "ink", at: r3([0, y0 + 0.04, 0.002]) });
}

/** word_train: an engine (unless engine: false) pulling one car per word, each carrying a word tile, the words reading left to right (car1 is the leftmost, the engine at the right). at: the engine's foot; the train runs toward +x. */
export function expandWordTrain(o, catalog, add, err) {
  const words = o.words ?? [];
  if (!Array.isArray(words) || words.length < 1 || words.length > 8 || words.some((w) => typeof w !== "string" || !w.trim() || w.length > 12)) {
    return err("E3D_WORDS", "words", "words must be 1-8 strings of 1-12 characters");
  }
  const colors = o.colors ?? ["red", "blue", "green", "orange", "purple", "teal", "yellow", "pink"];
  if (o.engine !== false) add("engine", { kind: "prop", model: "train_engine", at: [0, 0, 0] });
  // Each word keeps a readable tile (size 0.6 at least, #96): a long word's car stretches along the track to carry
  // it, and its rider is squeezed back by the same amount so the word is not stretched. gap: the space between cars.
  const space = o.gap != null ? Math.max(0.1, o.gap - 0.86) : 0.34;
  const minSize = o.tileSize ?? 0.6;
  const sizes = words.map((w) => Math.max(minSize, Math.min(0.9, 2.2 / Math.max(2, w.length + 0.5))));
  const stretch = words.map((w, i) => Math.max(1, ((w.length * 0.18 + 0.25) * sizes[i] + 0.12) / 0.86));
  // The train faces +x, so the first word rides in the last car: the sentence reads left to right on screen.
  let x = 0;
  const xs = [];
  for (let i = words.length - 1; i >= 0; i--) {
    x -= space + (0.86 * stretch[i]) / 2 + (i === words.length - 1 ? 0.86 / 2 : (0.86 * stretch[i + 1]) / 2);
    xs[i] = x;
  }
  words.forEach((w, i) => {
    const k = stretch[i];
    add(`car${i + 1}`, { kind: "prop", model: "train_car", color: colors[i % colors.length], at: r3([xs[i], 0, 0]), ...(k > 1 ? { scale: r3([k, 1, 1]) } : {}) });
    // The rider: a chunky word tile standing up in the wagon, its bottom just inside the 0.52 m walls so the whole
    // word shows above them, facing the camera.
    add(`w${i + 1}`, { kind: "card", style: o.tile ?? "tile", text: w, size: r3([sizes[i]])[0], ...(k > 1 ? { scale: r3([1 / k, 1, 1]) } : {}), parent: `${o.id}_car${i + 1}`, at: r3([0, Math.max(0.42, 0.52 - 0.16 * sizes[i]), 0]) });
  });
}

/**
 * book: an open book standing up, its spine at x = 0 and each page width × height. spreads: [{ left, right }],
 * each side { text, picture } (picture: a prop, critter or shape). Leaf k (<id>_leaf<k>) carries spread k's right
 * page on its front and spread k+1's left page on its back; turn_page turns the next leaf over the spine.
 */
export function expandBook(o, catalog, add, err, picture) {
  const spreads = o.spreads ?? [];
  if (!Array.isArray(spreads) || spreads.length < 1 || spreads.length > 8) return err("E3D_SPREADS", "spreads", "spreads must be 1-8 { left, right } pages");
  const W = o.width ?? 1.6;
  const H = o.height ?? 2;
  const S = o.size ?? 0.13;
  const base = 0.3;
  const bg = o.bg ?? "cream";
  const n = spreads.length;
  const face = (prefix, side, x0, z, flip, covered = false) => {
    // One page's content, in the frame of whatever carries it; flip turns it to read from the back of a leaf.
    if (!side) return;
    const rot = flip ? [0, 180, 0] : [0, 0, 0];
    const cx = flip ? -x0 : x0;
    if (side.picture) {
      // A pale panel behind the picture and a fuller relief (#92): a yellow moon on cream paper was nearly invisible.
      // Pages of a turned or waiting leaf are hidden (turn_page), so the depth never shows through another page.
      add(`${prefix}_frame`, { ...slab(cx, base + H * 0.66, z + 0.004, W * 0.78, H * 0.48, 0.004, o.frame ?? "sky"), rotation: flip ? [90, 180, 0] : [90, 0, 0], ...(covered ? { hidden: true } : {}) });
      const pic = picture(side.picture, side.pictureColor, catalog, cx, base + H * 0.45, z + 0.005, W * 0.7, H * 0.42, 0.3);
      if (!pic) err("E3D_PICTURE", "spreads", `picture "${side.picture}" is not a prop, critter or shape`);
      else add(`${prefix}_pic`, { ...pic, rotation: rot, at: [cx, pic.at[1], flip ? z - (pic.at[2] - z) : pic.at[2]], ...(covered ? { hidden: true } : {}) });
    }
    if (side.text) {
      const th = side.picture ? H * 0.35 : H * 0.8;
      add(`${prefix}_text`, { kind: "text_card", text: String(side.text), width: W - 0.25, height: th, size: S, bg: "none", pad: 0.3, color: o.color ?? "ink", rotation: rot, at: r3([cx, base + 0.08, z]), ...(covered ? { hidden: true } : {}) });
    }
  };
  add("cover", slab(0, base + H / 2, -0.03, 2 * W + 0.16, H + 0.16, 0.04, o.accent ?? "red", "toy"));
  add("left", slab(-W / 2, base + H / 2, 0, W, H, 0.03, bg));
  add("right", slab(W / 2, base + H / 2, 0, W, H, 0.03, bg));
  add("stand", { kind: "shape", shape: "box", color: "wood_dark", at: [0, 0, -0.25], scale: r3([2 * W * 0.5, base, 0.4]) });
  // Only the open spread's words and pictures show; the rest wait under the leaves (turn_page shows and hides them as
  // leaves turn, so a picture never shows through a page, #97).
  face("l1", spreads[0].left, -W / 2, 0.002, false);
  face(`r${n}`, spreads[n - 1].right, W / 2, 0.002, false, n > 1);
  for (let k = 1; k < n; k++) {
    const id = `leaf${k}`;
    // Unturned leaves stack on the right, the next one on top (the higher z).
    add(id, { kind: "group", at: r3([0, 0, LEAF * (n - k) + LEAF]) });
    const leafAdd = (suffix, spec) => add(`leaf${k}_${suffix}`, { ...spec, parent: `${o.id}_${id}` });
    leafAdd("page", slab(W / 2, base + H / 2, 0.0015, W, H, 0.003, bg));
    // Its front: spread k's right page; its back: spread k+1's left page (turned to read once the leaf is over).
    const frontAdd = (p, spec) => leafAdd(p.replace(/^/, "f"), spec);
    face2(frontAdd, spreads[k - 1].right, W / 2, 0.003, false, k > 1);
    face2((p, spec) => leafAdd(p.replace(/^/, "b"), spec), spreads[k].left, W / 2, -0.0015, true, true);
  }
  function face2(addTo, side, x0, z, flip, covered) {
    const hid = covered ? { hidden: true } : {};
    if (!side) return;
    const rot = flip ? [0, 180, 0] : [0, 0, 0];
    if (side.picture) {
      const fz = flip ? z - 0.004 : z + 0.004;
      addTo("_frame", { ...slab(x0, base + H * 0.66, fz, W * 0.78, H * 0.48, 0.004, o.frame ?? "sky"), rotation: flip ? [90, 180, 0] : [90, 0, 0], ...hid });
      const pic = picture(side.picture, side.pictureColor, catalog, x0, base + H * 0.45, z + 0.005, W * 0.7, H * 0.42, 0.3);
      if (pic) addTo("_pic", { ...pic, rotation: rot, at: [x0, pic.at[1], flip ? z - (pic.at[2] - z) : pic.at[2]], ...hid });
    }
    if (side.text) {
      const th = side.picture ? H * 0.35 : H * 0.8;
      addTo("_text", { kind: "text_card", text: String(side.text), width: W - 0.25, height: th, size: S, bg: "none", pad: 0.3, color: o.color ?? "ink", rotation: rot, at: r3([x0, base + 0.08, z]), ...hid });
    }
  }
}
