// Story script schema v2 (STORY_SPEC 4, S0 freeze). Same JSON Schema subset as v1 (schema.js), so
// the v1 checker validates it. docs/schema/script-v2.schema.json is generated from this object
// (tests/unit/schema_v2.test.js keeps them equal). Not wired into validate() until S1.1.

import { LIMITS_V2 as L } from "../config.js";
import { ID, COLOR, V2_ENUMS as E, DEST } from "./v2_names.js";
import { MACRO_PARAMS, MACRO_ANCHORS } from "./macro_params.js";

const idRef = { type: "string", pattern: ID };
const color = { type: "string", pattern: COLOR };
const DELAY = { type: "number", minimum: 0, maximum: 30, description: "Seconds after the referenced moment." };

const AT = {
  description: "When the beat runs: seconds from the scene start, or relative to another beat in the same scene.",
  "x-formMessage": 'Use a number of seconds, {"after": "<beatId>"}, {"with": "<beatId>"} or {"on": "<beatId>.<anchor>"}, each with an optional "delay".',
  oneOf: [
    { type: "number", minimum: 0, maximum: L.sceneMax },
    { type: "object", required: ["after"], additionalProperties: false, properties: { after: idRef, delay: DELAY } },
    { type: "object", required: ["with"], additionalProperties: false, properties: { with: idRef, delay: DELAY } },
    { type: "object", required: ["on"], additionalProperties: false, properties: { on: { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}\\.[a-zA-Z][a-zA-Z0-9_]{0,23}$", description: "<beatId>.<anchor>: start, windowOpen, hit, end, or a macro anchor." }, delay: DELAY } },
  ],
};

const v1Style = {
  type: "object",
  additionalProperties: false,
  properties: {
    overlap: { type: "boolean" }, outline: { type: "boolean" }, squash: { type: "boolean" },
    glow: color, headband: color, cape: color, hat: color, scarf: color,
  },
};

const appearance = {
  type: "object",
  additionalProperties: false,
  properties: {
    // Option names are catalog data (catalog/characters/appearance.json), checked semantically (E_APPEARANCE).
    eyes: { type: "string" },
    brows: { type: "string" },
    mouthStyle: { type: "string" },
    cheeks: color,
    hair: { type: "string" },
    hairColor: color,
    outfit: { type: "string" },
    outfitColor: color,
    accessories: {
      type: "object",
      description: "Accessory name → color. Also accepts the v1 style accessories (headband, scarf, cape, hat).",
      additionalProperties: false,
      properties: Object.fromEntries(E.accessory.map((a) => [a, color])),
    },
  },
};

const castEntry = {
  type: "object",
  required: ["id", "color"],
  additionalProperties: false,
  properties: {
    id: idRef,
    name: { type: "string", minLength: 1, maxLength: 16, description: "Display name for HP bars and speaker labels." },
    body: { type: "string", description: "Body plan from the catalog (default stickman; E_BODY_UNKNOWN)." },
    color,
    scale: { type: "number", minimum: 0.4, maximum: 4 },
    hp: { type: "number", minimum: 1, maximum: 1000 },
    prop: { type: ["string", "null"], description: "A holdable object kind (the v1 props are holdables)." },
    style: v1Style,
    appearance,
    voice: {
      type: "object",
      additionalProperties: false,
      properties: {
        pitch: { type: "number", minimum: 0.5, maximum: 2 },
        speed: { type: "number", minimum: 0.7, maximum: 1.4 },
        timbre: { enum: E.timbre },
      },
    },
  },
};

const setPiece = {
  type: "object",
  required: ["id", "object", "x"],
  additionalProperties: false,
  properties: {
    id: idRef,
    object: { type: "string", description: "Object kind from the catalog." },
    x: { type: "number" },
    y: { type: "number", description: "Height above the floor (default 0)." },
    layer: { enum: E.layer },
    facing: { enum: [1, -1] },
    state: { type: "string", description: "Initial state for objects with states (door: open/closed)." },
  },
};

const extras = {
  type: "array",
  maxItems: 4,
  items: {
    type: "object",
    required: ["count", "behavior"],
    additionalProperties: false,
    properties: {
      count: { type: "integer", minimum: 1, maximum: L.extras },
      behavior: { enum: E.extrasBehavior },
      layer: { enum: E.layer },
      from: { type: "number", description: "Left edge of their area (world px)." },
      to: { type: "number", description: "Right edge of their area (world px)." },
    },
  },
};

const location = {
  type: "object",
  required: ["id", "theme"],
  additionalProperties: false,
  properties: {
    id: idRef,
    theme: { type: "string", description: "Theme from the catalog." },
    stageWidth: { type: "number", minimum: 1600, maximum: 12000 },
    time: { enum: E.time },
    weather: { enum: E.weather },
    ambience: { enum: E.ambience },
    set: { type: "array", maxItems: 40, items: setPiece },
    extras,
  },
};

const transition = {
  type: "object",
  required: ["type"],
  additionalProperties: false,
  properties: {
    type: { enum: E.transition },
    dur: { type: "number", minimum: 0, maximum: 6 },
    color,
    dir: { enum: E.dir, description: "wipe: direction." },
    target: { ...idRef, description: "iris: the character the circle closes on or opens from." },
    kind: { enum: E.cardKind, description: "card: which card style (default chapter)." },
    title: { type: "string", minLength: 1, maxLength: 60 },
    subtitle: { type: "string", minLength: 1, maxLength: 80 },
    text: { type: "string", minLength: 1, maxLength: 80 },
  },
};

const music = {
  "x-formMessage": 'Use {"mood": "<mood>"} (optional intensity, volume) or null for silence.',
  oneOf: [
    { type: "null" },
    {
      type: "object",
      required: ["mood"],
      additionalProperties: false,
      properties: {
        mood: { enum: E.mood },
        intensity: { type: "number", minimum: 0, maximum: 1 },
        volume: { type: "number", minimum: 0, maximum: 1 },
      },
    },
  ],
};

const sceneCast = {
  type: "array",
  maxItems: L.onStage,
  items: {
    type: "object",
    required: ["id", "x"],
    additionalProperties: false,
    properties: {
      id: idRef,
      x: { type: "number" },
      facing: { enum: [1, -1] },
      face: { type: "string", description: "Face from the catalog (checked semantically: E_FACE_UNKNOWN)." },
      layer: { enum: E.layer },
      hp: { type: "number", minimum: 1, maximum: 1000 },
      prop: { type: ["string", "null"] },
      hidden: { type: "boolean", description: "Placed but invisible until it enters (spawn move or the enter macro)." },
    },
  },
};

const cameraKey = {
  type: "object",
  required: ["at", "mode"],
  additionalProperties: false,
  properties: {
    at: AT,
    mode: { enum: E.cameraMode },
    targets: { type: "array", items: { type: "string" }, maxItems: L.onStage },
    target: { type: "string" },
    from: { type: "string", description: "over_shoulder: the character the camera looks past." },
    zoom: { oneOf: [{ type: "number", minimum: 0.3, maximum: 4 }, { const: "auto" }], "x-formMessage": 'Use a number from 0.3 to 4 or "auto".' },
    padding: { type: "number", minimum: 0, maximum: 1200 },
    x: { type: "number" },
    y: { type: "number" },
    ease: { type: "string" },
    dur: { type: "number", minimum: 0, maximum: 10 },
  },
};

const actionBeat = {
  type: "object",
  required: ["at", "who", "do"],
  additionalProperties: false,
  properties: {
    id: idRef,
    at: AT,
    who: { type: "string", description: 'A character id, or "world" for effects, camera, objects, narration and cards.' },
    do: { type: "string", description: "A move name (characters) or a world command." },
    target: { type: "string" },
    outcome: { enum: ["hit", "whiff", "blocked", "parried", "dodged"] },
    params: {
      type: "object",
      description: "Move or world-command params: numbers, strings, booleans, or a short list of ids (activity `with`).",
      additionalProperties: { oneOf: [{ type: ["number", "string", "boolean"] }, { type: "array", maxItems: 4, items: idRef }] },
    },
    speed: { type: "number", minimum: 0.25, maximum: 3 },
    approach: { enum: ["run", "walk", false] },
    interrupt: { type: "boolean" },
    fx: { type: "array", items: { type: "string" }, maxItems: 6 },
    say: { type: "string", minLength: 1, maxLength: 40 },
    sayDur: { type: "number", minimum: 0.2, maximum: 10 },
    bubble: { enum: E.bubble, description: "How 'say' is drawn (default speech)." },
    face: { type: "string", description: "Emotion from this beat on: a face from the catalog (E_FACE_UNKNOWN)." },
    partner: { ...idRef, description: "The other character in a paired move." },
    object: { ...idRef, description: "The object (set piece or spawned object id) the beat acts on." },
    to: DEST,
    layer: { enum: E.layer },
  },
};

const macroBeat = {
  type: "object",
  required: ["at", "macro"],
  additionalProperties: false,
  properties: {
    id: idRef,
    at: AT,
    macro: { enum: E.beatMacro, description: "A story macro; the compiler expands it into beats." },
    params: { type: "object", description: "Checked per macro; see $defs.macroParams." },
  },
};

const scene = {
  type: "object",
  required: ["id", "location", "cast", "beats"],
  additionalProperties: false,
  properties: {
    id: idRef,
    location: { type: "string", description: "A location id from 'locations', or a theme name (a location with defaults)." },
    time: { enum: E.time },
    weather: { enum: E.weather },
    ambience: { enum: E.ambience },
    duration: { type: "number", minimum: 1, maximum: L.sceneMax, description: "Fixed length; otherwise the last beat's end plus tail." },
    tail: { type: "number", minimum: 0, maximum: 5 },
    transitionIn: transition,
    transitionOut: transition,
    music,
    cast: sceneCast,
    set: { type: "array", maxItems: 20, items: setPiece, description: "Extra set pieces for this scene only." },
    extras,
    camera: { type: "array", maxItems: 60, items: cameraKey },
    beats: {
      type: "array",
      maxItems: L.beatsPerScene,
      items: { "x-select": "macro", "x-formMessage": 'A beat is an action {"at", "who", "do", ...} or a macro {"at", "macro", "params"}.', oneOf: [actionBeat, macroBeat] },
    },
  },
};

const sceneMacro = {
  type: "object",
  required: ["id", "macro", "params"],
  additionalProperties: false,
  properties: {
    id: idRef,
    macro: { enum: E.sceneMacro, description: "A scene macro; expands into several scenes." },
    params: { type: "object", description: "Checked per macro; see $defs.macroParams." },
    transitionIn: transition,
    transitionOut: transition,
    music,
  },
};

export const jsonSchemaV2 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $comment: "Script schema v2.0-rc (S0 freeze, 2026-10-16). Generated from engine/validator/schema_v2.js. Catalog enums (moves, themes, objects, world commands) are filled in on export, as in v1.",
  title: "StickmanStory",
  type: "object",
  required: ["version", "meta", "cast", "scenes"],
  additionalProperties: false,
  properties: {
    version: { const: 2 },
    meta: {
      type: "object",
      required: ["title", "format", "seed"],
      additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 1, maxLength: 80 },
        format: { enum: ["landscape", "portrait"] },
        seed: { type: "integer", minimum: 0, maximum: 2147483647 },
        kind: { enum: E.kind, description: "story (default; at least 300 s), fight (fight-only video; at least 180 s) or clip (no minimum)." },
        audience: { enum: E.audience, description: "Content rules (STORY_SPEC 13). Default kids." },
        style: { enum: E.style },
        mode: { enum: ["choreographed", "simulated"] },
        hpBars: { type: "boolean" },
        autoCamera: { enum: [true, false, "story"] },
        speakerNames: { type: "boolean" },
        tail: { type: "number", minimum: 0, maximum: 3 },
      },
    },
    cast: { type: "array", minItems: 1, maxItems: L.cast, items: castEntry },
    locations: { type: "array", maxItems: L.locations, items: location },
    scenes: {
      type: "array",
      minItems: 1,
      maxItems: L.scenes,
      items: { "x-select": "macro", "x-formMessage": 'A scene is {"id", "location", "cast", "beats", ...} or a scene macro {"id", "macro", "params"}.', oneOf: [scene, sceneMacro] },
    },
    audio: {
      type: "object",
      additionalProperties: false,
      properties: {
        musicVolume: { type: "number", minimum: 0, maximum: 1 },
        ambienceVolume: { type: "number", minimum: 0, maximum: 1 },
        voices: { type: "boolean", description: "Speech sounds while characters talk (default true)." },
      },
    },
  },
  $defs: { enums: E, macroParams: MACRO_PARAMS, macroAnchors: MACRO_ANCHORS },
};
