// FX presets (spec 13.1). Each preset is a list of particle layers, plus optional sustained emitters
// (`sustain`) and frame-history trails (`trail`). Sizes, speeds and offsets are at scale 1 and scale
// with the character that triggers the effect. Angles are degrees: 0 = the direction the effect
// faces (attacker facing for hits), -90 = up, 90 = down, 180 = backward.
//
// Layer fields: shape (line|dot|ring|ellipse|star|puff|glow|glyph), count, angle [min,max], speed [min,max],
// life [min,max], size [start,end] (line: length), width, gravity, drag, color (string or list),
// alpha [start,end], offset (spawn radius), spreadY (vertical spawn spread), vrot [min,max] deg/s,
// attach (head|hip|feet: particle follows that joint), orbit { r, w } (rad/s), glyph (drawing name),
// tintable (takes the trigger's color, e.g. a colored aura).

const WARM = ["#fff6c0", "#ffd23f", "#ffffff"];

export const fxPresets = {
  impact_small: {
    anchor: "point",
    layers: [
      { shape: "line", count: 6, angle: [0, 360], speed: [500, 800], life: [0.12, 0.2], size: [18, 4], width: 4, color: WARM, alpha: [1, 0.2] },
      { shape: "ring", count: 1, speed: [0, 0], life: [0.18, 0.18], size: [10, 60], width: 4, color: "#ffffff", alpha: [0.9, 0] },
      { shape: "star", count: 1, speed: [0, 0], life: [0.08, 0.08], size: [34, 40], color: "#fff6c0", alpha: [1, 0.6] },
    ],
  },
  impact_med: {
    anchor: "point",
    layers: [
      { shape: "line", count: 10, angle: [0, 360], speed: [600, 950], life: [0.14, 0.24], size: [26, 5], width: 5, color: WARM, alpha: [1, 0.2] },
      { shape: "ring", count: 1, speed: [0, 0], life: [0.22, 0.22], size: [14, 90], width: 5, color: "#ffffff", alpha: [0.9, 0] },
      { shape: "star", count: 1, speed: [0, 0], life: [0.1, 0.1], size: [46, 54], color: "#fff6c0", alpha: [1, 0.6] },
    ],
  },
  impact_big: {
    anchor: "point",
    layers: [
      { shape: "line", count: 16, angle: [0, 360], speed: [700, 1200], life: [0.16, 0.3], size: [36, 6], width: 6, color: WARM, alpha: [1, 0.2] },
      { shape: "ring", count: 1, speed: [0, 0], life: [0.28, 0.28], size: [20, 140], width: 7, color: "#ffffff", alpha: [0.95, 0] },
      { shape: "ring", count: 1, speed: [0, 0], life: [0.4, 0.4], size: [10, 200], width: 3, color: "#ffd23f", alpha: [0.7, 0] },
      { shape: "star", count: 1, speed: [0, 0], life: [0.12, 0.12], size: [64, 76], color: "#fff6c0", alpha: [1, 0.6] },
      { shape: "dot", count: 8, angle: [-160, -20], speed: [300, 700], life: [0.3, 0.6], size: [6, 2], gravity: 1800, color: WARM, alpha: [1, 0] },
    ],
  },
  block_spark: {
    anchor: "point",
    layers: [
      { shape: "line", count: 8, angle: [140, 220], speed: [500, 900], life: [0.1, 0.18], size: [20, 4], width: 4, color: ["#bfe6ff", "#ffffff", "#6ec1ff"], alpha: [1, 0.2] },
      { shape: "ring", count: 1, speed: [0, 0], life: [0.14, 0.14], size: [8, 46], width: 4, color: "#9fd8ff", alpha: [0.9, 0] },
    ],
  },
  spark: {
    anchor: "point",
    layers: [{ shape: "dot", count: 10, angle: [-170, -10], speed: [300, 700], life: [0.3, 0.6], size: [5, 2], gravity: 1600, color: WARM, alpha: [1, 0] }],
  },
  dust_land: {
    anchor: "feet",
    layers: [
      { shape: "puff", count: 8, angle: [-175, -5], speed: [60, 200], life: [0.4, 0.7], size: [10, 30], gravity: -40, drag: 3, offset: 18, color: ["#c9c2b4", "#b5ad9d"], alpha: [0.6, 0] },
    ],
  },
  dust_run: {
    anchor: "feet",
    layers: [{ shape: "puff", count: 2, angle: [160, 200], speed: [40, 90], life: [0.3, 0.5], size: [6, 16], drag: 3, color: "#c9c2b4", alpha: [0.5, 0] }],
  },
  shockwave: {
    anchor: "feet",
    layers: [
      { shape: "ellipse", count: 1, speed: [0, 0], life: [0.5, 0.5], size: [20, 280], width: 6, color: "#ffffff", alpha: [0.9, 0] },
      { shape: "puff", count: 12, angle: [-180, 0], speed: [200, 400], life: [0.4, 0.6], size: [12, 30], drag: 4, color: "#c9c2b4", alpha: [0.6, 0] },
    ],
  },
  speed_lines: {
    anchor: "hip",
    layers: [{ shape: "line", count: 8, angle: [175, 185], speed: [900, 1100], life: [0.16, 0.24], size: [70, 20], width: 3, spreadY: 90, color: "#9a9a9a", alpha: [0.7, 0] }],
  },
  aura: {
    anchor: "hip",
    sustain: { duration: 1.6, rate: 28 },
    layers: [{ shape: "puff", count: 1, angle: [-100, -80], speed: [60, 140], life: [0.6, 0.9], size: [12, 2], offset: 46, color: ["#ffd23f", "#fff2a8"], tintable: true, alpha: [0.8, 0] }],
    glow: { attach: "hip", life: 1.6, size: [90, 130], color: "#ffd23f", alpha: [0.35, 0] },
  },
  explosion: {
    anchor: "point",
    flash: { color: "#ffffff", dur: 0.12 },
    layers: [
      { shape: "puff", count: 14, angle: [0, 360], speed: [100, 420], life: [0.5, 0.9], size: [30, 80], drag: 2.5, color: ["#ff9a2e", "#ff5a1f", "#ffd23f"], alpha: [0.9, 0] },
      { shape: "line", count: 12, angle: [-170, -10], speed: [400, 900], life: [0.4, 0.8], size: [14, 8], width: 5, gravity: 1800, color: "#4a3a2a", alpha: [1, 0.6] },
      { shape: "ring", count: 1, speed: [0, 0], life: [0.35, 0.35], size: [30, 260], width: 8, color: "#fff6c0", alpha: [0.9, 0] },
    ],
  },
  smoke: {
    anchor: "point",
    layers: [{ shape: "puff", count: 6, angle: [-120, -60], speed: [20, 60], life: [1.2, 2], size: [40, 90], drag: 1, color: "#8f8f8f", alpha: [0.3, 0] }],
  },
  stars_dizzy: {
    anchor: "head",
    layers: [{ shape: "star", count: 3, attach: "head", orbit: { r: 34, w: 6 }, life: [1.6, 1.6], size: [12, 12], color: "#ffd23f", alpha: [1, 0] }],
  },
  sweat_drop: { anchor: "head", layers: [{ shape: "glyph", glyph: "drop", count: 1, attach: "head", offsetXY: [18, -30], life: [1, 1], size: [14, 14], color: "#5fb6ff", alpha: [1, 0] }] },
  anger_mark: { anchor: "head", layers: [{ shape: "glyph", glyph: "anger", count: 1, attach: "head", offsetXY: [-20, -34], life: [1, 1], size: [16, 16], color: "#ff3355", alpha: [1, 0] }] },
  heart: { anchor: "head", layers: [{ shape: "glyph", glyph: "heart", count: 1, attach: "head", offsetXY: [0, -48], life: [1.2, 1.2], size: [18, 22], color: "#ff4f8b", alpha: [1, 0] }] },
  exclaim: { anchor: "head", layers: [{ shape: "glyph", glyph: "exclaim", count: 1, attach: "head", offsetXY: [0, -52], life: [0.9, 0.9], size: [22, 22], color: "#222222", alpha: [1, 0] }] },
  question: { anchor: "head", layers: [{ shape: "glyph", glyph: "question", count: 1, attach: "head", offsetXY: [0, -52], life: [1.1, 1.1], size: [22, 22], color: "#222222", alpha: [1, 0] }] },
  afterimage: { anchor: "hip", trail: { kind: "afterimage", duration: 0.6 } },
  slash_arc: { anchor: "point", trail: { kind: "slash", duration: 0.25 } },
  // Emitted every frame at a flying projectile: a bright core plus a fading glow leaves the trail.
  energy_ball: {
    anchor: "point",
    layers: [
      { shape: "glow", count: 1, speed: [0, 0], life: [0.25, 0.25], size: [46, 20], color: "rgba(80, 190, 255, 0.85)", alpha: [0.9, 0] },
      { shape: "dot", count: 1, speed: [0, 0], life: [0.05, 0.05], size: [30, 26], color: "#eaf8ff", alpha: [1, 1] },
      { shape: "dot", count: 1, angle: [150, 210], speed: [60, 160], life: [0.2, 0.35], size: [6, 1], color: ["#9fe0ff", "#ffffff"], alpha: [1, 0] },
    ],
  },
};

export const FX_NAMES = Object.keys(fxPresets);
