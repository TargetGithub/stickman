// Objects (STORY_SPEC 8). S1 ships the static set pieces needed for locations; S4 adds behaviors
// (seat, holdable, ball, floater, vehicle, breakable) and the rest of the catalog.
// draw: the renderer's procedural shape (engine/renderer/objects.js); sizes in world px at scale 1.
// Colors are defaults; a set piece may not override them yet.

export const objects = {
  bench: { behavior: "seat", draw: "bench", w: 260, h: 110, colors: { wood: "#a0703f", metal: "#3b3b44" } },
  chair: { behavior: "seat", draw: "chair", w: 90, h: 170, colors: { wood: "#8a5a34" } },
  table: { behavior: "static", draw: "table", w: 220, h: 120, colors: { wood: "#9a6a3e" } },
  tree_big: { behavior: "static", draw: "tree", w: 420, h: 620, colors: { trunk: "#6b4a2f", leaves: "#3f9a4a", leaves2: "#53b35a" } },
  bush: { behavior: "static", draw: "bush", w: 240, h: 120, colors: { leaves: "#3c8f45", leaves2: "#4fa85a" } },
  lamppost: { behavior: "static", draw: "lamppost", w: 60, h: 520, colors: { metal: "#2e3440", light: "#ffe7a3" } },
  tennis_net: { behavior: "static", draw: "net", w: 30, h: 150, colors: { post: "#e8e8e8", net: "rgba(240,240,240,0.75)" } },
  sign: { behavior: "static", draw: "sign", w: 140, h: 240, colors: { post: "#6b4a2f", board: "#e9d9a8" } },
  crate: { behavior: "breakable", draw: "crate", w: 110, h: 110, colors: { wood: "#b07c45", dark: "#7a5230" } },
  fountain: { behavior: "static", draw: "fountain", w: 360, h: 260, colors: { stone: "#b9b6ad", water: "#7fc8ef" } },
  door: { behavior: "static", draw: "door", w: 130, h: 260, states: ["closed", "open"], colors: { frame: "#4a3528", door: "#8a5a34" } },
};
