// Script schema v3 (ENGINE_V3_SPEC 7, V3.2): the v2 story schema plus the optional depth fields. A v2
// script is a valid v3 script. docs/schema/script-v3.schema.json is generated from jsonSchemaV3
// (tests/unit/schema_v3.test.js keeps them equal); validate() checks with schemaV3For(catalog).
//   scenes[].depth            { near, far, focal, horizon }: the scene's depth range and projection
//   scenes[].cast[].z         where a character stands in depth (0 the stage line; + toward the camera)
//   set[].z                   a set piece's depth (locations and scenes)
//   beats[].to                gains { x?, z }: walk to a depth (and an x)
//   scenes[].light, locations[].light   the light rig (V3.3): a preset name or a preset with overrides
//   scenes[].lens, camera[] lens fields, lag and move   the v3 camera (V3.4)
//   layers, text, shapes, tracks, post (and scenes[].post)   motion graphics (V3.5, schema_motion.js)
//   cast[].view, scenes[].cast[].view, beats[].view   turnaround views (V3.6)
//   cast[].limbStyle, scenes[].limbStyle, scenes[].cast[].limbStyle, motion.stretch   rubber-hose limbs (ADR-034)
//   audio.tracks, audio.markers, audio.duck   audio tracks (V3.8, schema_audio.js); templates and marker `at`s are
//   expanded before the schema check (engine/templates.js)
// `layer` names stay accepted and map to z presets (engine/depth.js LAYER_Z); a node gives one or the other.

import { jsonSchemaV2, schemaV2For } from "./schema_v2.js";
import { DEPTH } from "../depth.js";
import { LAYERS_SCHEMA, TEXT_SCHEMA, SHAPES_SCHEMA, TRACKS_SCHEMA, POST_SCHEMA } from "./schema_motion.js";
import { AUDIO_TRACKS_SCHEMA, MARKERS_SCHEMA, DUCK_SCHEMA } from "./schema_audio.js";

const Z = { type: "number", minimum: -4000, maximum: 2000, description: "Depth in px: 0 the stage line, positive toward the camera, negative away (checked against the scene's depth range: E_DEPTH_RANGE)." };

/** The scene depth block. */
export const DEPTH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  description: `The scene's depth lane (defaults: near ${DEPTH.near}, far ${DEPTH.far}, focal ${DEPTH.focal}, horizon ${DEPTH.horizon}).`,
  properties: {
    near: { type: "number", minimum: 0, maximum: 2000, description: "Nearest z a node may have (toward the camera)." },
    far: { type: "number", minimum: -4000, maximum: 0, description: "Farthest z a node may have." },
    focal: { type: "number", minimum: 600, maximum: 8000, description: "Camera focal length: scale = focal / (focal - z)." },
    horizon: { type: "number", minimum: 0, maximum: 800, description: "How far (px) the feet line rises for a node at infinite distance." },
  },
};

const tint = { type: "object", additionalProperties: false, properties: { color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }, strength: { type: "number", minimum: 0, maximum: 1 } } };
/** A scene's or location's light: a preset name, or a preset with overrides (ENGINE_V3_SPEC 5.2). */
export const LIGHT_SCHEMA = {
  description: 'The light rig: a preset name from the catalog (noon, dawn, golden, moonlit, indoor, stage, gloom, flat; E_LIGHT_UNKNOWN), or { "preset", ...overrides }. Default: the preset for the scene\'s time of day.',
  oneOf: [
    { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}$" },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        preset: { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}$" },
        key: { type: "object", additionalProperties: false, properties: { angle: { type: "number", minimum: 0, maximum: 180 }, color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }, strength: { type: "number", minimum: 0, maximum: 1 } } },
        fill: tint,
        rim: tint,
        ambient: tint,
        shadow: { type: "object", additionalProperties: false, properties: { alpha: { type: "number", minimum: 0, maximum: 1 }, length: { type: "number", minimum: 0, maximum: 3 }, cast: { enum: ["none", "ground", "wall"] } } },
        fog: { type: "object", additionalProperties: false, properties: { color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }, density: { type: "number", minimum: 0, maximum: 1 } } },
      },
    },
  ],
};

const n = (min, max, description) => ({ type: "number", minimum: min, maximum: max, ...(description ? { description } : {}) });
/** Lens channels (V3.4, ENGINE_V3_SPEC 5.3) a camera key or set_camera may set; each blends over the key's dur. */
export const LENS_FIELDS = {
  dolly: n(-1500, 1500, "Move the camera toward (+) or away from (-) the stage, px: near things grow faster than far ones."),
  truck: n(-3000, 3000, "Slide the camera sideways, px; depth layers slide past each other."),
  crane: n(-1000, 1000, "Raise (-) or lower (+) the camera, px."),
  tilt: n(-30, 30, "Tilt the view up (+) or down (-), degrees."),
  roll: n(-45, 45, "Lean the frame, degrees (a dutch angle)."),
  push: n(0.3, 4, "A zoom multiplier on top of the framing (1 = none)."),
  handheld: n(0, 1, "Handheld sway, 0 still to 1 shaky."),
  dof: n(0, 1, "Depth of field: how much things away from the focus blur."),
  focus: { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}$", description: "Keep this character in focus." },
  focusZ: n(-4000, 2000, "Keep this depth in focus."),
  vignette: n(0, 1, "Darkened corners."),
  letterbox: n(0, 1, "Cinema bars: 1 crops to 2.39:1."),
};

/** The scene lens block: the lens a v3 scene starts with. */
export const LENS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  description: "The lens the scene starts with (V3.4); camera keys and set_camera change it. Defaults: vignette 0.18, no depth of field, autoFocus on.",
  properties: {
    ...Object.fromEntries(["dolly", "truck", "crane", "tilt", "roll", "push", "handheld", "dof", "focus", "focusZ", "vignette", "letterbox"].map((k) => [k, LENS_FIELDS[k]])),
    autoFocus: { type: "boolean", description: "Close-ups, over-the-shoulder shots and two-shots pull focus by themselves (default true)." },
  },
};

/** The v3 `to` destination: the v2 forms plus a depth. */
function destV3(dest) {
  return {
    ...dest,
    "x-formMessage": 'Use {"x": <px>}, {"near": "<id>"}, {"exit": "left"|"right"} or {"z": <depth>, "x"?: <px>}.',
    oneOf: [{ type: "object", required: ["z"], additionalProperties: false, properties: { z: Z, x: { type: "number" } } }, ...dest.oneOf],
  };
}

/** jsonSchemaV2 (or a catalog variant of it) with the v3 fields added; the input is not changed. */
export function withDepth(v2) {
  const s = JSON.parse(JSON.stringify(v2));
  s.title = "StickmanStoryV3";
  s.description = "A v2 story with the optional depth fields of ENGINE_V3_SPEC 7 (z on placements, set pieces and walks; a scene depth block).";
  s.properties.version = { const: 3 };
  const setZ = (piece) => { piece.properties.z = Z; };
  for (const loc of [s.properties.locations.items]) {
    setZ(loc.properties.set.items);
    loc.properties.light = LIGHT_SCHEMA;
  }
  const scene = s.properties.scenes.items.oneOf[0];
  scene.properties.depth = DEPTH_SCHEMA;
  scene.properties.light = LIGHT_SCHEMA;
  scene.properties.lens = LENS_SCHEMA;
  // Camera keys (V3.4): follow lag, lens channels and a named move from the catalog.
  const key = scene.properties.camera.items;
  Object.assign(key.properties, LENS_FIELDS, {
    lag: n(0, 1, "Follow with lag: 0 tight, 1 trailing well behind."),
    move: { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}$", description: "A named camera move from the catalog (push_in, pull_out, slow_push, crane_up, crane_down, orbit_sweep, dutch_tilt, level, handheld; E_CAMERA_MOVE)." },
  });
  setZ(scene.properties.set.items);
  scene.properties.cast.items.properties.z = Z;
  const beat = scene.properties.beats.items.oneOf[0];
  beat.properties.to = destV3(beat.properties.to);
  // Turnaround views (V3.6): a cast default, a placement and a beat may name a view.
  const VIEW = { enum: ["side", "three_quarter", "front", "back"], description: "Turnaround view: side, three_quarter, front or back (the body plan must have it: E_VIEW_BODY)." };
  s.properties.cast.items.properties.view = VIEW;
  scene.properties.cast.items.properties.view = VIEW;
  beat.properties.view = { ...VIEW, description: "The character turns to this view from this beat on (E_VIEW_BODY)." };
  // Limb styles (ADR-034): drawn only; a placement wins over its scene, the scene over the cast entry, that over the body plan.
  const LIMB = { enum: ["straight", "bendy", "rubber"], description: "How arms and legs are drawn: straight (default), bendy (smooth curves through elbows and knees) or rubber (cartoon noodle limbs that also stretch on fast reaches and hits)." };
  s.properties.cast.items.properties.limbStyle = LIMB;
  scene.properties.cast.items.properties.limbStyle = { ...LIMB, description: "This character's limb style in this scene (over the scene's and the cast entry's)." };
  scene.properties.limbStyle = { ...LIMB, description: "Limb style for everyone in the scene (over each cast entry's; a placement's own limbStyle wins)." };
  // Motion graphics (V3.5): top-level layers, text, shapes, tracks and post; a scene may set its own post.
  Object.assign(s.properties, { layers: LAYERS_SCHEMA, text: TEXT_SCHEMA, shapes: SHAPES_SCHEMA, tracks: TRACKS_SCHEMA, post: POST_SCHEMA });
  // Audio tracks, markers and ducking (V3.8) on the v2 audio block.
  Object.assign(s.properties.audio.properties, { tracks: AUDIO_TRACKS_SCHEMA, markers: MARKERS_SCHEMA, duck: DUCK_SCHEMA });
  // Motion quality (V3.7): render-time follow-through, squash and stretch, hair sway, breathing and motion blur.
  const amt = (d, def) => ({ type: "number", minimum: 0, maximum: 1, description: `${d} (default ${def}).` });
  s.properties.motion = { type: "object", additionalProperties: false, description: "Motion quality for v3 scenes, drawn over the stored motion (the simulation is unchanged).", properties: {
    followThrough: amt("Arms and head trail and overshoot their poses", 1), squash: amt("Stretch in the air, squash on landing and along a hit", 1),
    secondary: amt("Hair sways with the head", 1), breathing: amt("The upper body breathes while standing still", 1), blur: amt("Faint ghosts behind fast limbs", 0),
    stretch: amt("Rubber limbs stretch on fast reaches and when a blow lands", 1),
    spine: { type: "number", minimum: 0, maximum: 1, description: "The back bends: a hunch or an arch with the lean, a swing that trails the torso, a fold on landings and blows (default 1 for bendy and rubber limbs, 0 for straight ones; rubber bends 1.35x)." },
  } };
  // The automatic v3 look (time-of-day lighting, default vignette, auto focus, automatic turns) at a strength.
  s.properties.look = { type: "object", additionalProperties: false, description: "The automatic v3 look.", properties: { strength: { type: "number", minimum: 0, maximum: 1, description: "How strong the automatic lighting, vignette, focus blur and turns are (default 0.2; explicit lights, lens settings and views are always full)." }, outline: { type: "number", minimum: 0.5, maximum: 2.5, description: "Scale of the dark outline around limbs, heads and bodies (default 1)." }, limbs: { type: "number", minimum: 0.6, maximum: 2, description: "Scale of the limb width (default 1)." }, bubble: { type: "number", minimum: 0.7, maximum: 2, description: "Scale of speech bubbles and their text (default 1)." }, maxTurn: { type: "number", minimum: 0, maximum: 90, description: "How far a body turns from profile toward or away from the camera, in degrees (default 90: full front and back; 60: front is a near-front three-quarter)." } } };
  scene.properties.post = POST_SCHEMA;
  // Pace (ADR-038): preschool-show timing, cutting and captions; a scene's block goes over the script's, false turns it off.
  s.properties.pace = PACE_SCHEMA;
  scene.properties.pace = { oneOf: [{ const: false }, PACE_SCHEMA], description: "This scene's pace over the script's, or false for none." };
  return s;
}

const pn = (min, max, d) => ({ type: "number", minimum: min, maximum: max, description: d });
const PACE_SCHEMA = { type: "object", additionalProperties: false, description: "Snappy preschool-show timing (ADR-038): faster travel and gestures, tight dialogue, a cutting auto camera with medium shots, cut-to-arrival for long walks, bigger bubbles or subtitles. {} takes every default.", properties: {
  travel: { type: "object", additionalProperties: false, description: "Speed multipliers per travel move (defaults: walk 1.7, run 1.25, sneak 2.5, tiptoe 2, walk_together 1.6, swim 1.3).",
    properties: Object.fromEntries(["walk", "run", "sneak", "tiptoe", "walk_together", "swim"].map((m) => [m, pn(0.5, 4, `${m} speed multiplier.`)])) },
  moves: pn(0.5, 2, "Playback speed of other one-shot moves beats start (not attacks, defeats, paired moves, timed holds or speaking beats; default 1.25)."),
  gap: pn(0, 2, "Seconds between dialogue lines (default 0.2)."),
  maxTravel: pn(1, 30, "Seconds a walk may take on screen before it becomes a walk out, a cut and the arrival (default 3)."),
  maxExit: pn(0.5, 10, "Seconds an exit walk lasts before the fade (default 1.5)."),
  arrive: pn(0.3, 5, "Seconds of walking after a travel cut (default 1.2)."),
  leave: pn(0.3, 5, "Seconds of walking before a travel cut (default 0.9)."),
  shot: { type: "array", minItems: 2, maxItems: 2, items: pn(0.5, 20, "Seconds."), description: "[min, max] seconds a dialogue shot lasts before the auto camera cuts (default [2, 4])." },
  establish: pn(0, 10, "Seconds of the opening wide shot (default 2)."),
  minCut: pn(0.5, 10, "Fewest seconds between two auto camera cuts (default shot[0] / 2)."),
  reactions: { type: "boolean", description: "Cut to the listener's face when a line runs past shot[1] (default true)." },
  captions: { enum: ["auto", "bubbles", "subtitles"], description: "auto (default): subtitles when meta.speech is tts, else bubbles." },
  bubble: pn(0.7, 2.5, "Bubble and text scale, times look.bubble (default 1.5)."),
} };

export const jsonSchemaV3 = withDepth(jsonSchemaV2);

/** jsonSchemaV3 with the catalog's mood and activity names; the prebuilt object for the base catalog. */
export function schemaV3For(catalog) {
  const v2 = schemaV2For(catalog);
  return v2 === jsonSchemaV2 ? jsonSchemaV3 : withDepth(v2);
}
