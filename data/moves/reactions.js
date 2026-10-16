// reactions moves (spec 8.4). Authored with web/editor.html. Schema: spec 8.1.
// Reactions start with no blend (they snap into the hit pose).
export const moves = [
  {
    name: "hit_light",
    category: "reaction",
    duration: 0.45,
    mouth: "shout",
    keys: [
      { t: 0, pose: "hitLight", ease: "linear" },
      { t: 0.35, pose: "hitLight", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    root: [{ t: 0, dx: 0, dy: 0, ease: "outQuad" }, { t: 0.3, dx: -26, dy: 0, ease: "outQuad" }, { t: 1, dx: -32, dy: 0 }],
  },
];
