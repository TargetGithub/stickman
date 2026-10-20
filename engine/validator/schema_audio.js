// Schema for v3 audio tracks, markers and ducking rules (ENGINE_V3_SPEC 6 `audio.tracks`, V3.8).

const ID = { type: "string", pattern: "^[a-z][a-z0-9_]{0,47}$" };
const num = (min, max, description) => ({ type: "number", minimum: min, maximum: max, ...(description ? { description } : {}) });
const keys = (min, max, what) => ({
  description: `${what}: a number, or keys [{ "t", "v", "ease" }] in seconds from the track's base (its scene's start, or the video start).`,
  oneOf: [num(min, max), { type: "array", minItems: 1, maxItems: 64, items: { type: "object", required: ["t", "v"], additionalProperties: false, properties: { t: num(0, 3600), v: num(min, max), ease: { type: ["string", "array"] } } } }],
});
const at = { type: "array", minItems: 1, maxItems: 64, items: { oneOf: [num(0, 3600), { type: "object", required: ["marker"], additionalProperties: false, properties: { marker: ID, delay: num(-30, 30) } }] } };

export const AUDIO_TRACKS_SCHEMA = {
  type: "array",
  maxItems: 32,
  description: "Audio tracks over the story's own sound (V3.8): music, ambience, sound effects and bus gains.",
  items: {
    type: "object",
    required: ["id", "kind"],
    additionalProperties: false,
    properties: {
      id: ID,
      kind: { enum: ["music", "ambience", "sfx", "bus"] },
      scene: { ...ID, description: "Times are from this scene's start and the track plays inside it." },
      from: num(0, 3600),
      to: num(0, 3600),
      mood: { type: "string", description: "music: a mood from the catalog (E_AUDIO_TRACK)." },
      bed: { type: "string", description: "ambience: an ambience bed (E_AUDIO_TRACK)." },
      sfx: { type: "string", description: "sfx: an SFX key (E_AUDIO_TRACK)." },
      at: { ...at, description: "sfx: when it plays: seconds, or { \"marker\", \"delay\" }." },
      bus: { enum: ["music", "ambience", "sfx", "voice"], description: "bus: the part of the mix the volume keys scale." },
      volume: keys(0, 2, "Volume (1 = as mixed)"),
      pan: keys(-1, 1, "Pan (-1 left, 1 right)"),
      fadeIn: num(0, 10),
      fadeOut: num(0, 10),
      intensity: num(0, 1, "music: how busy the generated music is."),
    },
  },
};

export const MARKERS_SCHEMA = {
  type: "array",
  maxItems: 64,
  description: "Named moments: { \"id\", \"scene\", \"t\" } (seconds into the scene). Beats can start at one: \"at\": { \"marker\": \"drop\" } (E_MARKER_UNKNOWN).",
  items: { type: "object", required: ["id", "scene", "t"], additionalProperties: false, properties: { id: ID, scene: ID, t: num(0, 900) } },
};

export const DUCK_SCHEMA = {
  type: "array",
  maxItems: 8,
  description: "Ducking rules: lower one stem while something else sounds.",
  items: {
    type: "object",
    required: ["duck", "under"],
    additionalProperties: false,
    properties: {
      duck: { enum: ["music", "ambience"] },
      under: { type: "string", description: "voice (speech and narration), sfx (sound effects), or a track id." },
      db: num(-40, 0, "How far down (default -8 dB)."),
      attack: num(0, 5),
      release: num(0, 10),
    },
  },
};
