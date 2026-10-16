// Visual themes (spec 14.3). Backgrounds are procedural: a screen-space sky gradient, parallax layers
// in world space (y measured from the ground line, negative is up), and the ground.
// characterBg is the color usually behind the characters (for the validator's contrast check).
// Themes marked wip get their full layer art in M7.
//
// Layer kinds: sun { x, y (screen 0-1), r, color, glow }, mountains { color, height, step, rough },
// wall { color, top, beam, spacing }, lanterns { color, y, spacing, glow }, grid { color, spacing }.
// factor: parallax (0 = fixed to the screen, 1 = moves with the stage).

export const themes = {
  white_stage: {
    sky: { top: "#fbfbf8", bottom: "#ecebe6" },
    ground: { color: "#e4e2dc", line: "#b9b6ad" },
    layers: [],
    characterBg: "#f2f1ec",
  },
  dojo_dusk: {
    sky: { top: "#2d1b3d", bottom: "#f39c5a" },
    ground: { color: "#5a3a2c", line: "#2a1a14", planks: { color: "#6a4634", spacing: 180 } },
    layers: [
      { kind: "sun", factor: 0.03, x: 0.72, y: 0.36, r: 120, color: "#ffd27a", glow: "rgba(255, 210, 122, 0.35)" },
      { kind: "mountains", factor: 0.2, color: "#6b3b5a", height: 330, step: 140, rough: 0.55 },
      { kind: "mountains", factor: 0.35, color: "#4e2a43", height: 230, step: 110, rough: 0.5 },
      { kind: "wall", factor: 0.65, color: "#3a2230", top: -470, beam: "#2a1822", spacing: 300 },
      { kind: "lanterns", factor: 0.65, color: "#ffb347", y: -380, spacing: 600, glow: "rgba(255, 179, 71, 0.35)" },
    ],
    characterBg: "#3a2230",
  },
  void_grid: {
    wip: true,
    sky: { top: "#05070f", bottom: "#1b2340" },
    ground: { color: "#0d1224", line: "#3df2ff" },
    layers: [{ kind: "grid", factor: 1, color: "rgba(61, 242, 255, 0.25)", spacing: 160 }],
    characterBg: "#11182e",
  },
  rooftop_city: {
    wip: true,
    sky: { top: "#0d1b3a", bottom: "#3b5b8f" },
    ground: { color: "#1a1f2b", line: "#0c0f16" },
    layers: [{ kind: "mountains", factor: 0.3, color: "#162644", height: 300, step: 90, rough: 0.9 }],
    characterBg: "#253a63",
  },
  desert_noon: {
    wip: true,
    sky: { top: "#7ec8ff", bottom: "#fde7b0" },
    ground: { color: "#e2b874", line: "#b98d4f" },
    layers: [
      { kind: "sun", factor: 0.03, x: 0.25, y: 0.2, r: 90, color: "#fff4c2", glow: "rgba(255, 244, 194, 0.5)" },
      { kind: "mountains", factor: 0.3, color: "#e9c88c", height: 160, step: 260, rough: 0.3 },
    ],
    characterBg: "#f6dba4",
  },
  arena: {
    wip: true,
    sky: { top: "#1c1c22", bottom: "#3a3a44" },
    ground: { color: "#6b5a48", line: "#3b3026" },
    layers: [{ kind: "wall", factor: 0.6, color: "#2a2a32", top: -420, beam: "#22222a", spacing: 220 }],
    characterBg: "#2f2f38",
  },
  snow_mountain: {
    wip: true,
    sky: { top: "#9ec9f0", bottom: "#eaf4ff" },
    ground: { color: "#f4f8fc", line: "#c9d8e8" },
    layers: [{ kind: "mountains", factor: 0.25, color: "#c8dcf0", height: 380, step: 160, rough: 0.6 }],
    characterBg: "#dbe9f7",
  },
};

export const THEME_NAMES = Object.keys(themes);
