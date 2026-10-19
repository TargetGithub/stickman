// Move checks shared by the draft flow, the catalog build and the bundle checks (CATALOG_BUNDLE_SPEC
// step 11). Browser-safe: engine modules only, no I/O.

import { prepareCatalog, CATEGORIES } from "../../engine/moves.js";
import { createActor, playMove, stepActor } from "../../engine/actor.js";
import { lowestPoint } from "../../engine/skeleton.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { holdableData, holdableProps } from "../../engine/objects.js";

/**
 * Move data checks: the catalog loader's rules (keys, poses, expressions, hits, wind-up), then a run on
 * every body plan: finite joints, the body never below the floor, feet on the floor at the start and
 * the end (unless the move holds a pose or jumps). draft: false (the catalog build, for moves already
 * reviewed) skips the style rules for new drafts: the 0.2-6 s duration and the feet at the start and end.
 * plans: only these body plans (default: every plan of the move's rig).
 */
export function checkMove(def, catalog, { draft = true, plans = null } = {}) {
  const p = [];
  if (!CATEGORIES.includes(def.category)) p.push(`category must be one of ${CATEGORIES.join(", ")}`);
  if (draft && !(def.duration >= 0.2 && def.duration <= 6)) p.push("duration must be 0.2-6 s");
  if (def.face && !catalog.faces?.[def.face]) p.push(`face "${def.face}" is unknown`);
  let moves;
  try {
    moves = prepareCatalog([...catalog.moves.filter((m) => m.name !== def.name), def], catalog.poses, holdableProps(catalog));
  } catch (err) {
    return [...p, ...err.message.split("\n").filter((l) => l.includes(def.name) || !l.startsWith("move '")).map((l) => l.replace(/^\s*-\s*/, ""))];
  }
  return [...p, ...runMove(def, moves, catalog, { draft, plans })];
}

/**
 * The run part of checkMove for a move already prepared in `moves` (prepareCatalog of the catalog's
 * moves): lets a caller prepare once and run many moves (the bundle checks run every base move on a new
 * body plan).
 */
export function runMove(def, moves, catalog, { draft = true, plans = null } = {}) {
  const p = [];
  const prepared = moves.get(def.name);
  const GROUND = 880;
  // Each move runs on the body plans of its rig (STORY_SPEC 6.2): humanoid moves on the six humanoid plans, dog moves on dog plans.
  const rig = prepared.rig === "any" ? null : prepared.rig;
  for (const plan of (plans || Object.keys(catalog.bodies || { stickman: {} })).filter((n) => !rig || (catalog.bodies?.[n]?.rig || "humanoid") === rig)) {
    const a = Object.assign(createActor({ id: "a", x: 1000, facing: 1, groundY: GROUND }), bodyPlan(catalog, plan));
    if (prepared.needsProp) {
      const kind = prepared.needsProp === "any" ? catalog.props.sword?.kind : prepared.needsProp; // "any": whatever is held
      const name = Object.keys(catalog.objects || {}).find((k) => catalog.objects[k].hold?.kind === kind) || Object.keys(catalog.props).find((k) => catalog.props[k].kind === kind);
      const data = name ? holdableData(catalog, name) : null;
      if (!data) { p.push(`needsProp "${prepared.needsProp}" matches no holdable`); break; }
      a.prop = { name, kind: data.kind, data };
    }
    playMove(a, def.name, moves);
    const steps = Math.ceil(prepared.duration * (prepared.params.cycles || 1) * 60) + 2;
    let start = null;
    let end = null;
    for (let i = 0; i <= steps; i++) {
      const j = stepActor(a, i ? 1 / 60 : 0, moves).joints;
      if (Object.values(j).some((q) => !Number.isFinite(q.x) || !Number.isFinite(q.y))) { p.push(`${plan}: a joint becomes NaN`); break; }
      const low = lowestPoint(j, 1, a.dims);
      if (low > GROUND + 1.5) { p.push(`${plan}: the body sinks ${(low - GROUND).toFixed(1)} px below the floor`); break; }
      if (i === 1) start = low;
      if (i === steps - 2) end = low;
    }
    const lifts = (def.root || []).some((k) => typeof k.dy === "number" && k.dy < 0);
    if (draft && !def.flags?.hold && !lifts && [start, end].some((v) => v !== null && Math.abs(v - GROUND) > 3)) p.push(`${plan}: feet are off the floor at the start or the end`);
    if (p.length) break;
  }
  return p;
}
