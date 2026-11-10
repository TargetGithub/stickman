// Stage set dressing: a stage preset (catalog/stages.json) may list `set`, ordinary objects (shapes, props,
// critters...) that make the place: a classroom's back wall and chalkboard, the lab bench, trees, reeds. They
// join the plan before the script's own objects with ids prefixed "set_" (a parent inside the set too), so a
// script can still target them ("set_board"). A script turns them off with stage.set: []. Set pieces stay
// behind the teaching area (z < -2) so they never block what is being taught. A script drops single pieces with
// stage.hide (ids without the prefix; "window_*" drops every id that starts "window_") and moves them with
// stage.move { id: { at?, rotation?, scale? } }: the stage's own word machine out of a lesson that brings its own,
// in the episode and its thumbnails alike (#65). A hidden piece takes its children with it. Pure.

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
  const hide = Array.isArray(stage?.hide) ? stage.hide : [];
  const hidden = new Set(set.filter((o) => hide.some((h) => matchPiece(h, o.id))).map((o) => o.id));
  // Children of a hidden piece go too (in list order, parents come first).
  for (const o of set) if (o.parent != null && hidden.has(o.parent)) hidden.add(o.id);
  const move = stage?.move && typeof stage.move === "object" ? stage.move : {};
  return set
    .filter((o) => !hidden.has(o.id))
    .map((o) => ({ ...o, ...pick(move[o.id]), id: SET_PREFIX + o.id, ...(o.parent != null ? { parent: SET_PREFIX + o.parent } : {}) }));
}

/** Does a stage.hide entry name this piece? "id" exactly, or "prefix*". */
export const matchPiece = (h, id) => (typeof h === "string" && h.endsWith("*") ? id.startsWith(h.slice(0, -1)) : h === id);

const pick = (m) => Object.fromEntries(["at", "rotation", "scale"].filter((k) => Array.isArray(m?.[k])).map((k) => [k, m[k]]));

/** The ids (without prefix) of a stage's set pieces before hide/move: what stage.hide and stage.move may name. */
export function presetPieceIds(stage, catalog) {
  const preset = catalog.stages?.[stage?.preset ?? "playroom"] ?? {};
  const set = stage?.set !== undefined ? stage.set : preset.set;
  return Array.isArray(set) ? set.map((o) => o.id) : [];
}
