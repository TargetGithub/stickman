// DumpyDoo model sheet (catalog/models/dumpydoo.json): one still per panel, each at its own time with its own
// camera. Panels: turnaround (front, 3/4, side, back) and feelings (happy, joyful, surprised, sad).
//   node engine3d/tools/render3d.mjs engine3d/scenes/dumpydoo_sheet.js --speech off --music off --stills 1,3,5,7,9,11,13,15
// The panel times are in PANELS (exported) for tools that tile the stills into one sheet.

// A grey studio like the reference picture, so the cream dough reads against it.
export const meta = { seed: 11, stage: { preset: "studio", lights: "portrait", fog: [5, 11], background: "grey", floor: "grey" }, music: false };

/** Panel name, still time (s), label, critter turn (deg), feeling, arm pose, gaze (else the eyes glance on their own), forearm pose. */
export const PANELS = [
  ["front", 1, "Front", 0], ["three_quarter", 3, "3/4", -38], ["side", 5, "Side", -90], ["back", 7, "Back", 180],
  ["happy", 9, "Happy", 10, "happy", null, [0, 0]],
  ["joyful", 11, "Joyful", -12, "joyful", [70, 0, 96], null, [45, 0, 40]], // both hands up, elbows bent, clear of the collar
  ["surprised", 13, "Surprised", -12, "surprised", [-20, 0, 70], [0.2, 0.7]],
  ["sad", 15, "Sad", -12, "sad", [12, 0, -14], [-0.4, -1]],
];

export default function dumpyDooSheet(d) {
  // Each panel's critter stands in its own spot far from the others; the camera cuts to it.
  PANELS.forEach(([, t, , ry, feeling, arm, gaze, forearm], i) => {
    const x = i * 6;
    d.add({ id: `b${i}`, kind: "critter", species: "dumpydoo", at: [x, 0, 0], rotation: [0, ry, 0], ...(feeling ? { feeling } : {}) });
    if (arm) d.set(`b${i}#arm`, "rotation", arm);
    if (forearm) d.set(`b${i}#forearm`, "rotation", forearm);
    if (gaze) d.set(`b${i}`, "gaze", gaze);
    d.set("camera", "position", [x, 1.12, 3.3], t - 1).set("camera", "lookAt", [x, 0.66, 0], t - 1).set("camera", "fov", 30, t - 1);
  });
  d.end(16);
}
