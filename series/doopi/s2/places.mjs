// Doopi & Friends season 2 places: the locations episodes pick from (id → theme and set pieces), so a place looks
// the same in every episode. An episode's `locs` takes the ones it uses: { square: PLACES.square, ... }.

export const PLACES = {
  square: { theme: "tokyo_village", stageWidth: 3400, set: [{ id: "lan1", object: "lantern_string", x: 1100, z: -300 }, { id: "lan2", object: "lantern_string", x: 2500, z: -300 }] },
  market: { theme: "tokyo_village", stageWidth: 3400, set: [{ id: "stall", object: "market_stall", x: 1900, z: -250 }] },
  hill: { theme: "banyan_hill", stageWidth: 3600, set: [{ id: "crack", object: "banyan_crack", x: 1800, state: "cracked", z: 0 }] },
  hut: { theme: "home_interior", stageWidth: 2800, set: [{ id: "tbl", object: "table", x: 1500, z: -150 }, { id: "ch1", object: "chair", x: 1250, z: -100 }] },
  road: { theme: "whispering_forest", stageWidth: 4000 },
  camp: { theme: "whispering_forest", stageWidth: 3200, set: [{ id: "fire", object: "campfire", x: 1600, state: "lit", z: -50 }] },
  street: { theme: "city_street", stageWidth: 4000, set: [{ id: "lamp1", object: "lamppost", x: 900, z: -200 }, { id: "lamp2", object: "lamppost", x: 2700, z: -200 }] },
  roofs: { theme: "rooftop_city", stageWidth: 4400, set: [{ id: "tiffins", object: "tiffin_stack", x: 700, z: 0 }] },
  alley: { theme: "alley_night", stageWidth: 3200 },
  tower: { theme: "clock_tower", stageWidth: 3200, set: [{ id: "clock", object: "tower_clock", x: 2300, state: "ticking", z: -200 }, { id: "carrom", object: "carrom_board", x: 1450, z: 0 }] },
  tower_still: { theme: "clock_tower_still", stageWidth: 3200, set: [{ id: "clock", object: "tower_clock", x: 2300, state: "stopped", z: -200 }, { id: "carrom", object: "carrom_board", x: 1450, z: 0 }] },
  sands: { theme: "desert_noon", stageWidth: 4000 },
  well: { theme: "desert_noon", stageWidth: 3200, set: [{ id: "well", object: "desert_well", x: 2000, state: "broken", z: -100 }] },
  dcamp: { theme: "desert_noon", stageWidth: 3200, set: [{ id: "fire", object: "campfire", x: 1600, state: "lit", z: -50 }] },
  arena: { theme: "khel_arena", stageWidth: 3600 },
  peak: { theme: "grey_peak", stageWidth: 3600 },
  snow: { theme: "snow_mountain", stageWidth: 4000 },
  river: { theme: "frozen_river", stageWidth: 3600 },
  shelter: { theme: "mountain_cave", stageWidth: 3200, set: [{ id: "fire", object: "campfire", x: 1500, state: "lit", z: -50 }] },
  door: { theme: "mountain_cave", stageWidth: 3200, set: [{ id: "sdoor", object: "stone_door", x: 1600, state: "closed", z: -250 }] },
  cave: { theme: "crystal_cave", stageWidth: 3600 },
};

/** The places an episode uses: pick("square", "hill") → { square: ..., hill: ... }. */
export const pick = (...ids) => Object.fromEntries(ids.map((id) => [id, PLACES[id]]));
