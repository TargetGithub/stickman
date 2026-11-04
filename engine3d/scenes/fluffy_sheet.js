// Fluffy model sheet (catalog/models/fluffy.json): one still per panel, each at its own time with its own
// camera. Panels: turnaround (front, 3/4, back, side), the seven looks, and feelings and poses (joyful,
// surprised with hands on cheeks, thumbs up, run).
//   node engine3d/tools/render3d.mjs engine3d/scenes/fluffy_sheet.js --speech off --music off --stills 1,3,5,7,9,11,13,15,17,19,21,23
// The panel times are in PANELS (exported) for tools that tile the stills into one sheet.

export const meta = { seed: 7, stage: { preset: "studio", fog: null }, music: false };

const LOOKS = ["fluffy", "yogurt_man", "dumpling_buddy", "fluffy_smart", "fluffy_magic", "fluffy_sporty", "fluffy_super"];

/** Panel name, still time (s) and label, in sheet order. */
export const PANELS = [
  ["front", 1, "Front"], ["three_quarter", 3, "3/4"], ["back", 5, "Back"], ["side", 7, "Side"],
  ...LOOKS.map((s, i) => [s, 9 + i * 2, s]),
  ["joyful", 23, "Joyful"], ["surprised", 25, "Surprised"], ["thumbs_up", 27, "Thumbs up"], ["run", 29, "Run"],
  ["looks", 31, "All looks"],
];

export default function fluffySheet(d) {
  // Each panel's critter stands in its own spot far from the others; the camera cuts to it.
  const spot = (i) => [i * 6, 0, 0];
  const shot = (i, t, { y = 0.75, dist = 3.1, side = 0.35, fov = 34 } = {}) => {
    const [x] = spot(i);
    d.set("camera", "position", [x + side, y + 0.25, dist], t - 1).set("camera", "lookAt", [x, y, 0], t - 1).set("camera", "fov", fov, t - 1);
  };
  const turn = [0, -38, 180, -90];
  turn.forEach((ry, i) => {
    d.add({ id: `t${i}`, kind: "critter", species: "fluffy", at: spot(i), rotation: [0, ry, 0] });
    shot(i, 1 + i * 2, { side: 0 });
  });
  LOOKS.forEach((s, i) => {
    d.add({ id: `v${i}`, kind: "critter", species: s, at: spot(4 + i), rotation: [0, -18, 0] });
    shot(4 + i, 9 + i * 2, { y: s === "fluffy_magic" ? 0.85 : 0.75, dist: s === "fluffy_magic" ? 3.5 : 3.1 });
  });

  // Feelings and poses (sub-targets: <id>#arm, #leg_left, #leg_right; "lift" turns one arm only).
  const P = 11;
  d.add({ id: "joy", kind: "critter", species: "fluffy", at: spot(P), feeling: "joyful", rotation: [0, -15, 0] });
  d.set("joy#arm", "rotation", [0, 0, 70]);
  shot(P, 23);
  d.add({ id: "wow", kind: "critter", species: "fluffy", at: spot(P + 1), feeling: "surprised", rotation: [0, -12, 0] });
  d.set("wow#arm", "rotation", [95, 0, 145]).set("wow#arm", "position", [-0.04, -0.015, 0.13]);
  shot(P + 1, 25);
  d.add({ id: "thumb", kind: "critter", species: "fluffy", at: spot(P + 2), rotation: [0, -25, 0] });
  d.set("thumb#arm", "rotation", [0, 0, -20]);
  d.set("thumb#arm", "liftSide", -1).set("thumb#arm", "lift", [-105, 0, -18]);
  shot(P + 2, 27);
  d.add({ id: "run", kind: "critter", species: "fluffy", at: spot(P + 3), rotation: [12, -55, 0] });
  d.set("run#arm", "rotation", [45, 0, -25]);
  d.set("run#arm", "liftSide", 1).set("run#arm", "lift", [-95, 0, 0]);
  d.set("run#leg_left", "rotation", [-40, 0, 0]).set("run#leg_right", "rotation", [35, 0, 0]);
  d.set("run", "position", [spot(P + 3)[0], 0.1, 0]);
  shot(P + 3, 29, { side: 0.2 });

  // All seven looks side by side.
  LOOKS.forEach((s, i) => d.add({ id: `all${i}`, kind: "critter", species: s, at: [spot(P + 6)[0] + (i - 3) * 1.15, 0, 0], rotation: [0, -10, 0] }));
  const x = spot(P + 6)[0];
  d.set("camera", "position", [x, 1.1, 8.6], 30).set("camera", "lookAt", [x, 0.72, 0], 30).set("camera", "fov", 36, 30);
  d.end(32);
}
