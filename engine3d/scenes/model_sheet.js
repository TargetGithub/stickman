// Model sheet: every critter, prop and flat shape in a grid, for checking the catalog by eye.
//   node engine3d/tools/render3d.mjs engine3d/scenes/model_sheet.js --speech off --music off --stills 1.5
// Critters stand in the front rows, props behind them, flat shapes on the back wall. The camera frames the
// whole grid, so it grows with the catalog.

export const meta = { seed: 3, stage: { preset: "studio", fog: null }, music: false };

const COLS = 14;
const GAP = 1.3;

export default function modelSheet(d) {
  const critters = Object.keys(d.catalog.critters);
  const props = Object.keys(d.catalog.props);
  const flats = Object.keys(d.catalog.shapes).filter((s) => d.catalog.shapes[s].tags?.includes("flat"));
  const colours = ["red", "blue", "yellow", "green", "orange", "purple", "gold", "pink", "teal"];
  let row = 0;
  const place = (list, add) => {
    list.forEach((name, i) => {
      const r = row + Math.floor(i / COLS);
      const inRow = Math.min(COLS, list.length - Math.floor(i / COLS) * COLS);
      add(name, i, [((i % COLS) - (inRow - 1) / 2) * GAP, 0, 4 - r * 1.6]);
    });
    row += Math.ceil(list.length / COLS);
  };
  place(critters, (s, i, at) => d.add({ id: `c_${s}`, kind: "critter", species: s, size: 0.8, at }));
  // One size for every prop, so their sizes compare (small props like coins stay small).
  place(props, (m, i, at) => d.add({ id: `p_${m}`, kind: "prop", model: m, size: 0.7, at }));
  place(flats, (f, i, at) => d.add({ id: `f_${f}`, kind: "shape", shape: f, size: 0.6, color: colours[i % colours.length], at: [at[0], 0.1, at[2]] }));
  const depth = row * 1.6;
  d.set("camera", "position", [0, 5 + depth * 0.45, 13]).set("camera", "lookAt", [0, 0, 4 - depth / 2]).set("camera", "fov", 46);
  d.end(3);
}
