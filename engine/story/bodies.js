// Body plans at runtime (STORY_SPEC 6.1, ADR-015). Milestone: S3.
// A plan becomes actor fields: dims (bone lengths, line width, torsoWidth; rig and bodyWidth for
// quadrupeds), stride (leg ratio for root motion), posture (pose offsets), plan (its name, stored in the frame
// store for the renderer), rig and moveMap (generic move names → this rig's moves; engine/moves.js resolveMove),
// and grip (where a quadruped holds things: its mouth).
// The stickman keeps the v1 BODY object itself, so v1 scripts compute exactly as before.

import { BODY, strideOf } from "../skeleton.js";

const cache = new WeakMap(); // catalog → plan name → actor fields (one dims object per plan: reach caches key on it)

/** Actor fields for a body plan from the catalog (the stickman's for an unknown or missing plan). */
export function bodyPlan(catalog, name) {
  if (!cache.has(catalog)) cache.set(catalog, new Map());
  const byName = cache.get(catalog);
  if (!byName.has(name)) {
    const plan = catalog.bodies?.[name];
    if (!plan || name === "stickman") byName.set(name, { dims: BODY, stride: 1, posture: null, plan: "stickman", rig: "humanoid", moveMap: null, grip: null });
    else {
      const quad = plan.rig === "quadruped";
      const dims = { ...plan.dims, ...(plan.torsoWidth ? { torsoWidth: plan.torsoWidth } : {}), ...(quad ? { rig: plan.rig, bodyWidth: plan.bodyWidth } : {}) };
      // Quadruped moves are authored in the plan's own pixels, so their root motion is not rescaled (ADR-020).
      byName.set(name, { dims, stride: quad ? 1 : strideOf(dims), posture: plan.posture || null, plan: name, rig: plan.rig || "humanoid", moveMap: plan.moves || null, grip: plan.grip || null });
    }
  }
  return byName.get(name);
}
