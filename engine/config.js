// Engine constants and defaults. Spec: sections 2, 4, 5, 9, 11.5, 13.
export const FPS = 60;
export const ENGINE_VERSION = "0.1.0";

export const FORMATS = {
  landscape: { width: 1920, height: 1080, groundScreenRatio: 0.82 },
  portrait: { width: 1080, height: 1920, groundScreenRatio: 0.7 },
};

// Render scale (ADR-039): output px per logical frame px. The frame stays 1920x1080 (1080x1920 portrait);
// a resolution preset names a scale for the landscape frame's height.
export const RENDER_SCALE = { min: 0.25, max: 4, presets: { "720p": 2 / 3, "1080p": 1, "1440p": 4 / 3, "4k": 2 } };

export const STAGE = { width: 3200, groundY: 880, margin: 60 };

export const PHYSICS = {
  gravity: 2600,
  groundFriction: 0.86,
  minGap: 40,
  wallRestitution: 0.4,
  launchSpin: 540,
  dustImpactSpeed: 900,
  shakeImpactSpeed: 1600,
};

export const COMBAT = {
  hitRadius: 26,
  blockDamageFactor: 0.2,
  whiffGap: 40,
  maxNudge: 60,
  reactionThresholds: { light: 8, heavy: 16 },
};

export const MOTION = {
  blend: 0.06,
  snapRate: 10,
  overlap: { k: 180, damping: 18 },
  breathing: { amplitude: 2, period: 2.4, armDeg: 2 },
};

export const SHAKE = {
  small: { amplitude: 6, duration: 0.15 },
  med: { amplitude: 14, duration: 0.25 },
  big: { amplitude: 28, duration: 0.45 },
};

export const CAMERA = { omega: 8, padding: 300 };

export const LIMITS = {
  scriptBytes: 512 * 1024,
  beats: 600,
  characters: 6,
  particles: 2000,
  say: 40,
  textPop: 16,
  caption: 80,
  minDuration: 3,
  maxDuration: 900,
  maxApproach: 3,
  queueDriftWarn: 0.5,
};

export const RNG_STREAMS = ["physics", "fx", "camera", "bg", "director", "audio"];

// Story scripts (schema v2, STORY_SPEC 19). v1 shares the long-form limits since S1.10 (900 s, 600 beats, 512 KB).
export const LIMITS_V2 = {
  scriptBytes: 512 * 1024,
  maxDuration: 900,
  sceneMax: 300,
  scenes: 40,
  cast: 16,
  onStage: 8,
  extras: 12,
  locations: 20,
  beatsAuthored: 600,
  beatsCompiled: 4000,
  beatsPerScene: 200,
  storyMin: 300,
  fightMin: 180,
};
