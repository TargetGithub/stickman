// The world_map prop's geography (#181): where a country sits on the map, so `on: { map, country }` can put a pin,
// a flag or a critter there without map maths. Pure; shared by the prop generator, the director and the validator.

/** Country -> [latitude, longitude] in degrees (a spot near the middle of the country). */
export const COUNTRIES = {
  usa: [39, -98], canada: [58, -100], mexico: [23, -102], brazil: [-10, -52], argentina: [-36, -64], peru: [-10, -75],
  chile: [-33, -71], colombia: [4, -73], uk: [54, -2], ireland: [53, -8], france: [46, 2], spain: [40, -4],
  italy: [42, 12], germany: [51, 10], greece: [39, 22], norway: [62, 10], iceland: [65, -18], russia: [60, 90],
  egypt: [26, 30], nigeria: [9, 8], kenya: [0, 38], ethiopia: [9, 40], south_africa: [-29, 24], morocco: [32, -6],
  saudi_arabia: [24, 45], india: [22, 79], china: [35, 103], japan: [37, 138], korea: [36, 128], indonesia: [-2, 118],
  philippines: [12, 122], thailand: [15, 101], australia: [-25, 134], new_zealand: [-41, 174], greenland: [72, -42],
  antarctica: [-82, 0],
};

/** The map board: 2.4 m wide (longitude -180..180), 1.3 m tall (latitude -90..90), its middle 1.25 m up. */
export const MAP = { w: 2.2, h: 1.2, cy: 1.25, face: 0.07 };

/** A [lat, lon] (or a country name) -> [x, y, z] on the world_map prop, in its own units. */
export function mapSpot(where) {
  const ll = typeof where === "string" ? COUNTRIES[where] : where;
  if (!ll) return null;
  const [lat, lon] = ll;
  const r = (v) => Math.round(v * 1e4) / 1e4;
  return [r((lon / 180) * (MAP.w / 2)), r(MAP.cy + (lat / 90) * (MAP.h / 2)), MAP.face];
}
