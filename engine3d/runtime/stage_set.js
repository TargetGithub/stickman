// Stage set dressing: a stage preset (catalog/stages.json) may list `set`, ordinary objects (shapes, props,
// critters...) that make the place: a classroom's back wall and chalkboard, the lab bench, trees, reeds. They
// join the plan before the script's own objects with ids prefixed "set_" (a parent inside the set too), so a
// script can still target them ("set_board"). A script turns them off with stage.set: []. Set pieces stay
// behind the teaching area (z < -2) so they never block what is being taught. Pure.

export const SET_PREFIX = "set_";

/**
 * @param {object} stage  the script's stage ({ preset, ...overrides })
 * @param {object} catalog
 * @returns {object[]} object specs with prefixed ids
 */
export function stageSet(stage, catalog) {
  const preset = catalog.stages?.[stage?.preset ?? "playroom"] ?? {};
  const set = stage?.set !== undefined ? stage.set : preset.set;
  if (!Array.isArray(set)) return [];
  return set.map((o) => ({ ...o, id: SET_PREFIX + o.id, ...(o.parent != null ? { parent: SET_PREFIX + o.parent } : {}) }));
}
