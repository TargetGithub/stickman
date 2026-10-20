// Schema for the v3 motion-graphics blocks (ENGINE_V3_SPEC 6, V3.5): layers, text, shapes, tracks and post.
// Times are seconds from the video start, or from the start of `scene` when it is given. Screen layers are
// authored for a 1920 x 1080 frame (scaled to the format); world layers use stage px.

import { ANIMS } from "../compositor.js";

const ID = "^[a-z][a-z0-9_]{0,31}$";
const COLOR = "^#[0-9a-fA-F]{6}$";
const COLOR_A = "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$";
const id = { type: "string", pattern: ID };
const num = (min, max, description) => ({ type: "number", minimum: min, maximum: max, ...(description ? { description } : {}) });
const color = { type: "string", pattern: COLOR };
const colorA = { type: "string", pattern: COLOR_A };
const anim = { type: "object", required: ["type"], additionalProperties: false, properties: { type: { enum: ANIMS }, dur: num(0.05, 5, "Seconds (default 0.4).") } };

/** Fields every timed element shares. */
const timed = {
  scene: { ...id, description: "Times are from this scene's start, and the element shows only in that scene." },
  from: num(0, 3600, "When it appears (seconds)."),
  to: num(0, 3600, "When it goes (seconds; default: never)."),
  in: anim,
  out: anim,
  opacity: num(0, 1),
  x: num(-10000, 20000),
  y: num(-10000, 20000),
  scale: num(0.01, 20),
  rotation: num(-3600, 3600, "Degrees."),
  z: num(-1000, 1000, "Draw order inside its layer (or among layers)."),
};

const gradient = {
  type: "object",
  required: ["type", "stops"],
  additionalProperties: false,
  properties: {
    type: { enum: ["linear", "radial"] },
    angle: num(-360, 360, "Linear gradients: 90 runs top to bottom."),
    stops: { type: "array", minItems: 2, maxItems: 8, items: { type: "array", minItems: 2, maxItems: 2, items: { type: ["number", "string"] } } },
  },
};

export const LAYERS_SCHEMA = {
  type: "array",
  maxItems: 32,
  description: "Named layers that group text and shapes (V3.5).",
  items: {
    type: "object",
    required: ["id"],
    additionalProperties: false,
    properties: {
      id,
      ...timed,
      place: { enum: ["back", "over"], description: "back: after the background, before the world; over (default): over the world." },
      space: { enum: ["screen", "world"], description: "screen (default): 1920 x 1080 frame units; world: stage px, moving with the camera." },
      blend: { enum: ["normal", "multiply", "screen", "add", "overlay"] },
      mask: { type: "object", required: ["shape"], additionalProperties: false, properties: { shape: id, invert: { type: "boolean" } } },
      parent: {
        type: "object",
        additionalProperties: false,
        properties: { char: id, joint: { enum: ["head", "hip", "shoulder", "neckTop", "lHand", "rHand", "lFoot", "rFoot", "center"] }, layer: id },
      },
      reveal: num(0, 1, "How much of the layer shows, wiping from the left (keyable)."),
    },
  },
};

export const TEXT_SCHEMA = {
  type: "array",
  maxItems: 64,
  description: "Titles, captions, lower thirds and labels (V3.5).",
  items: {
    type: "object",
    required: ["id", "text"],
    additionalProperties: false,
    properties: {
      id,
      text: { type: "string", minLength: 1, maxLength: 120, description: "Use \\n for a new line." },
      layer: id,
      style: { ...id, description: "A text style from the catalog (title, subtitle, caption, lower_third, comic, label; E_TEXT_STYLE)." },
      ...timed,
      font: { enum: ["Bangers", "Inter"] },
      size: num(8, 400),
      color,
      outline: color,
      outlineWidth: num(0, 40),
      shadow: colorA,
      box: colorA,
      padding: num(0, 80),
      align: { enum: ["left", "center", "right"] },
      reveal: num(0, 1, "How many of the letters show (keyable; the typewriter animation sets it)."),
    },
  },
};

export const SHAPES_SCHEMA = {
  type: "array",
  maxItems: 64,
  description: "Rectangles, circles, ellipses, lines and paths with fills, gradients and strokes (V3.5).",
  items: {
    type: "object",
    required: ["id", "type"],
    additionalProperties: false,
    properties: {
      id,
      type: { enum: ["rect", "circle", "ellipse", "line", "path"] },
      layer: id,
      ...timed,
      w: num(0, 20000),
      h: num(0, 20000),
      r: num(0, 10000, "Circle radius, or a rectangle's corner radius."),
      x2: num(-10000, 20000),
      y2: num(-10000, 20000),
      d: { type: "array", maxItems: 400, items: { type: "array", minItems: 1, maxItems: 7, items: { type: ["string", "number"] } }, description: "Path commands as in imported art: [\"M\", x, y], [\"L\", x, y], [\"C\", ...], [\"Q\", ...], [\"Z\"]." },
      fill: { oneOf: [colorA, gradient], "x-formMessage": 'Use "#rrggbb" (or "#rrggbbaa") or { "type": "linear"|"radial", "stops": [[0, "#.."], [1, "#.."]] }.' },
      stroke: colorA,
      lineWidth: num(0, 200),
      reveal: num(0, 1),
    },
  },
};

export const TRACKS_SCHEMA = {
  type: "array",
  maxItems: 128,
  description: 'Keyframed properties: { "target": "text.title.y", "keys": [{ "t": 0, "v": 900 }, { "t": 1, "v": 540, "ease": "outBack" }] } (V3.5).',
  items: {
    type: "object",
    required: ["target", "keys"],
    additionalProperties: false,
    properties: {
      target: { type: "string", minLength: 3, maxLength: 64, description: "layer.<id>.<prop>, text.<id>.<prop>, shape.<id>.<prop>, lens.<channel> or post.<prop> (E_TRACK_TARGET)." },
      scene: id,
      keys: {
        type: "array",
        minItems: 1,
        maxItems: 64,
        items: {
          type: "object",
          required: ["t", "v"],
          additionalProperties: false,
          properties: {
            t: num(0, 3600),
            v: { type: ["number", "string"], description: "A number, or a #rrggbb colour for color, fill and stroke." },
            ease: { type: ["string", "array"], description: 'An easing name, "step", "cubic-bezier(x1, y1, x2, y2)" or [x1, y1, x2, y2] (E_TRACK_EASE).' },
          },
        },
      },
    },
  },
};

export const POST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  description: "Post effects over the whole frame (V3.5); a scene's post overrides the script's.",
  properties: {
    exposure: num(-2, 2, "Stops."),
    contrast: num(0, 3),
    saturation: num(0, 3),
    gamma: num(0.3, 3, "Above 1 brightens the midtones."),
    bloom: num(0, 1),
    grain: num(0, 1),
    chroma: num(0, 1, "A tiny chromatic aberration."),
    vignette: num(0, 1),
    letterbox: num(0, 1),
  },
};
