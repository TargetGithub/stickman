// Model sheet: every critter, prop and flat shape side by side, for checking the catalog by eye.
//   node engine3d/tools/render3d.mjs engine3d/scenes/model_sheet.js --speech off --stills 1.5
// Pass --frames to skip the video; the sheet holds still apart from idle motion.

export const meta = { seed: 3, stage: { preset: "studio" }, music: false };

export default function modelSheet(d) {
  const critters = Object.keys(d.catalog.critters);
  const props = Object.keys(d.catalog.props);
  const flats = ["circle", "square", "triangle", "rectangle", "oval", "diamond", "star", "heart"];
  d.set("camera", "position", [0, 3.2, 15]).set("camera", "lookAt", [0, 1.4, 0]).set("camera", "fov", 42);
  critters.forEach((s, i) => d.add({ id: `c_${s}`, kind: "critter", species: s, at: [(i - (critters.length - 1) / 2) * 1.35, 0, 2.2] }));
  props.forEach((m, i) => d.add({ id: `p_${m}`, kind: "prop", model: m, size: m === "tree" || m === "house" ? 0.75 : 0.8, at: [(i - (props.length - 1) / 2) * 1.2, ["cloud", "sun", "moon"].includes(m) ? 0.9 : 0, -0.6] }));
  flats.forEach((f, i) => d.add({ id: `f_${f}`, kind: "shape", shape: f, face: true, size: 0.75, color: ["red", "blue", "yellow", "green", "orange", "purple", "gold", "pink"][i], at: [(i - 3.5) * 1.3, 2.9, -2.5] }));
  d.end(3);
}
