// Objects (STORY_SPEC 8). Catalog data: a drawing, a size and one behavior.
//   static     drawn in place; may have states (door: closed/open)
//   seat       static, with a seat point (sitting comes with the S5 moves)
//   holdable   held like a v1 prop: `hold` is a prop entry (data/props.js format); spawned ones lie
//              on the floor and can be picked up; `use` describes what the use move does with it
//   ball       flies in arcs and bounces (set_object: toX + height, or vx/vy)
//   floater    rises and drifts with a seeded wobble, then pops or floats away
//   vehicle    rolls along the floor (set_object: toX + speed, or exit), wheels turn; can be ridden
//   breakable  set_object state "broken" breaks it into pieces
// draw: a shape in engine/renderer/objects.js, or `paths` (imported SVG, tools/svg_import.mjs).
// Sizes in world px at scale 1. The six v1 props (data/props.js) are holdables too.

const WOOD = "#a0703f";

export const objects = {
  // ---- set pieces ----
  bench: { behavior: "seat", draw: "bench", w: 260, h: 110, seatY: 62, colors: { wood: WOOD, metal: "#3b3b44" } },
  chair: { behavior: "seat", draw: "chair", w: 90, h: 170, seatY: 80, colors: { wood: "#8a5a34" } },
  table: { behavior: "static", draw: "table", w: 220, h: 120, colors: { wood: "#9a6a3e" } },
  tree_big: { behavior: "static", draw: "tree", w: 420, h: 620, colors: { trunk: "#6b4a2f", leaves: "#3f9a4a", leaves2: "#53b35a" } },
  bush: { behavior: "static", draw: "bush", w: 240, h: 120, colors: { leaves: "#3c8f45", leaves2: "#4fa85a" } },
  flower: { behavior: "holdable", draw: "held", hold: { kind: "flower", shape: "flower", len: 40, width: 3, gripAt: 0.1, grip: "rHand", color: "#ff6fa8", trim: "#3c8f45", hitRadius: 8 } },
  lamppost: { behavior: "static", draw: "lamppost", w: 60, h: 520, states: ["on", "off"], colors: { metal: "#2e3440", light: "#ffe7a3" } },
  tennis_net: { behavior: "static", draw: "net", w: 30, h: 150, colors: { post: "#e8e8e8", net: "rgba(240,240,240,0.75)" } },
  sign: { behavior: "static", draw: "sign", w: 140, h: 240, colors: { post: "#6b4a2f", board: "#e9d9a8" } },
  fountain: { behavior: "static", draw: "fountain", w: 360, h: 260, colors: { stone: "#b9b6ad", water: "#7fc8ef" } },
  door: { behavior: "static", draw: "door", w: 130, h: 260, states: ["closed", "open"], sfx: { open: "door_open", closed: "door_open" }, colors: { frame: "#4a3528", door: "#8a5a34" } },
  cage: { behavior: "static", draw: "cage", w: 170, h: 230, states: ["closed", "open"], colors: { bar: "#5a5f6a", base: "#3b3f47" } },
  crate: { behavior: "breakable", draw: "crate", w: 110, h: 110, states: ["whole", "broken"], colors: { wood: "#b07c45", dark: "#7a5230" } },
  box: { behavior: "breakable", draw: "box", w: 90, h: 70, states: ["whole", "broken"], colors: { card: "#d2a96b", tape: "#b8874a" } },

  // ---- vehicles ----
  car: { behavior: "vehicle", draw: "car", w: 320, h: 130, wheelR: 26, seat: { x: -10, y: 40 }, speed: 420, colors: { body: "#e04f4f", window: "#bfe6ff", wheel: "#222222" } },
  bike: { behavior: "vehicle", draw: "bike", w: 170, h: 100, wheelR: 34, seat: { x: -8, y: 70 }, speed: 260, colors: { frame: "#2f7fd9", wheel: "#222222" } },

  // ---- balls and floaters ----
  tennis_ball: { behavior: "ball", draw: "ball", r: 9, bounce: 0.62, colors: { fill: "#d7f04a", seam: "#ffffff" } },
  football: { behavior: "ball", draw: "football", r: 17, bounce: 0.55, colors: { fill: "#ffffff", patch: "#222222" } },
  bubble: { behavior: "floater", draw: "bubble", r: 14, life: [2.2, 4.2], rise: 45, drift: 20, wobble: 16, pop: true, colors: { rim: "rgba(160, 220, 255, 0.95)", shine: "rgba(255,255,255,0.9)" } },
  balloon: { behavior: "floater", draw: "balloon", r: 30, life: [8, 8], rise: 90, drift: 15, wobble: 10, pop: false, colors: { fill: "#ff5a6e" },
    hold: { kind: "balloon", shape: "balloon", len: 120, width: 2, gripAt: 0, grip: "rHand", color: "#ff5a6e", trim: "#444444", hitRadius: 10 } },

  // ---- holdables ----
  racket: { behavior: "holdable", draw: "held", hold: { kind: "racket", shape: "racket", len: 70, width: 4, gripAt: 0.08, grip: "rHand", color: "#f2f2f2", trim: "#d94b4b", hitRadius: 22 } },
  bubble_wand: { behavior: "holdable", draw: "held", use: { spawn: "bubble", count: [3, 6], sfx: "bubble_blow" },
    hold: { kind: "wand", shape: "wand", len: 46, width: 3, gripAt: 0.1, grip: "rHand", color: "#ffcc33", trim: "#7fd8ff", hitRadius: 8 } },
  phone: { behavior: "holdable", draw: "held", use: { fx: ["camera_flash"], sfx: "pop" },
    hold: { kind: "phone", shape: "phone", len: 18, width: 10, gripAt: 0.2, grip: "rHand", color: "#2b2f3a", trim: "#7fd8ff", hitRadius: 8 } },
  ice_cream: { behavior: "holdable", draw: "held", hold: { kind: "ice_cream", shape: "ice_cream", len: 34, width: 10, gripAt: 0.15, grip: "rHand", color: "#ffd6e7", trim: "#d9a35b", hitRadius: 8 } },
  book: { behavior: "holdable", draw: "held", hold: { kind: "book", shape: "book", len: 26, width: 18, gripAt: 0.5, grip: "rHand", color: "#3d7bd9", trim: "#f4f0e0", hitRadius: 10 } },
  rope: { behavior: "holdable", draw: "held", hold: { kind: "rope", shape: "rope", len: 30, width: 18, gripAt: 0.5, grip: "rHand", color: "#c9a26b", trim: "#8a6a3e", hitRadius: 10 } },
  cane: { behavior: "holdable", draw: "held", hold: { kind: "cane", shape: "cane", len: 92, width: 5, gripAt: 0.05, grip: "rHand", color: "#6b4a2f", trim: "#3a2a1c", hitRadius: 14 } },
};

export const OBJECT_NAMES = Object.keys(objects);
