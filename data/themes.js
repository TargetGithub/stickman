// Visual themes (spec 14.3). Backgrounds are procedural: a screen-space sky gradient, parallax layers
// in world space (y measured from the ground line, negative is up), the floor, and floor layers.
// characterBg is the color usually behind the characters (for the validator's contrast check).
//
// Layer kinds (engine/renderer/background.js): sun, stars, mountains (caps), dunes, skyline (windows),
// wall, lanterns, crowd, spotlights, floorGrid, floorStripes, planks, snowfall.
// factor: parallax (0 = fixed to the screen, 1 = moves with the stage). Animated layers use fx time.

export const themes = {
  white_stage: {
    sky: { top: "#fbfbf8", bottom: "#ecebe6" },
    ground: { color: "#e4e2dc", line: "#b9b6ad" },
    layers: [],
    characterBg: "#f2f1ec",
  },
  dojo_dusk: {
    sky: { top: "#2d1b3d", bottom: "#f39c5a" },
    ground: { color: "#5a3a2c", line: "#2a1a14" },
    layers: [
      { kind: "sun", factor: 0.03, x: 0.72, y: 0.36, r: 120, color: "#ffd27a", glow: "rgba(255, 210, 122, 0.35)" },
      { kind: "mountains", factor: 0.2, color: "#6b3b5a", height: 330, step: 140, rough: 0.55 },
      { kind: "mountains", factor: 0.35, color: "#4e2a43", height: 230, step: 110, rough: 0.5 },
      { kind: "wall", factor: 0.65, color: "#3a2230", top: -470, beam: "#2a1822", spacing: 300 },
      { kind: "lanterns", factor: 0.65, color: "#ffb347", y: -380, spacing: 600, glow: "rgba(255, 179, 71, 0.35)" },
      { kind: "planks", color: "#6a4634", spacing: 180 },
    ],
    characterBg: "#3a2230",
  },
  void_grid: {
    sky: { top: "#05070f", bottom: "#1b2340" },
    ground: { color: "#0d1224", line: "#3df2ff" },
    layers: [
      { kind: "stars", count: 90, color: "#bfe9ff", top: 0.55 },
      { kind: "mountains", factor: 0.15, color: "#121a36", height: 260, step: 220, rough: 0.6 },
      { kind: "floorGrid", color: "rgba(61, 242, 255, 0.35)", spacing: 160 },
    ],
    characterBg: "#11182e",
  },
  rooftop_city: {
    sky: { top: "#0d1b3a", bottom: "#3b5b8f" },
    ground: { color: "#2a2f3b", line: "#11141b" },
    layers: [
      { kind: "stars", count: 60, color: "#dfe8ff", top: 0.4 },
      { kind: "sun", factor: 0.02, x: 0.8, y: 0.18, r: 54, color: "#f4f1de", glow: "rgba(244, 241, 222, 0.25)" },
      { kind: "skyline", factor: 0.2, color: "#162644", windows: "rgba(255, 220, 140, 0.35)", minW: 90, maxW: 200, minH: 260, maxH: 520, lit: 0.25 },
      { kind: "skyline", factor: 0.45, color: "#0f1a30", windows: "rgba(255, 214, 120, 0.6)", minW: 120, maxW: 260, minH: 160, maxH: 380, lit: 0.35 },
      { kind: "floorStripes", color: "#353b4a", at: [0], width: 26 },
    ],
    characterBg: "#253a63",
  },
  desert_noon: {
    sky: { top: "#7ec8ff", bottom: "#fde7b0" },
    ground: { color: "#e2b874", line: "#b98d4f" },
    layers: [
      { kind: "sun", factor: 0.03, x: 0.25, y: 0.2, r: 90, color: "#fff4c2", glow: "rgba(255, 244, 194, 0.5)" },
      { kind: "mountains", factor: 0.12, color: "#d9b99a", height: 200, step: 300, rough: 0.35 },
      { kind: "dunes", factor: 0.3, color: "#efcf94", height: 150, wavelength: 900 },
      { kind: "dunes", factor: 0.55, color: "#e7c283", height: 90, wavelength: 620 },
    ],
    characterBg: "#efcf94",
  },
  arena: {
    sky: { top: "#14141a", bottom: "#2f2f3a" },
    ground: { color: "#6b5a48", line: "#3b3026" },
    layers: [
      { kind: "spotlights", at: [0.25, 0.75], color: "rgba(255, 245, 210, 0.18)" },
      { kind: "crowd", factor: 0.55, color: "#23232b", y: -150, rows: 4, excite: 1 },
      { kind: "wall", factor: 0.75, color: "#3c2f26", top: -140, beam: "#2b2119", spacing: 400 },
      { kind: "floorStripes", color: "#7d6a55", at: [40, 160, 320], width: 8 },
    ],
    characterBg: "#3c2f26",
  },
  snow_mountain: {
    sky: { top: "#9ec9f0", bottom: "#eaf4ff" },
    ground: { color: "#f4f8fc", line: "#c9d8e8" },
    layers: [
      { kind: "mountains", factor: 0.12, color: "#a9c2de", height: 480, step: 300, rough: 0.6, caps: "#ffffff" },
      { kind: "mountains", factor: 0.3, color: "#8aa6c6", height: 320, step: 220, rough: 0.65, caps: "#eef4fa" },
      { kind: "snowfall", count: 140, color: "rgba(255, 255, 255, 0.9)", speed: 90 },
    ],
    characterBg: "#c7d9ee",
  },
};

export const THEME_NAMES = Object.keys(themes);
