// Body plans at runtime (STORY_SPEC 6.1, ADR-015). Milestone: S3.
// A plan becomes actor fields: dims (bone lengths, line width, torsoWidth), stride (leg ratio for root
// motion), posture (pose offsets) and plan (its name, stored in the frame store for the renderer).
// The stickman keeps the v1 BODY object itself, so v1 scripts compute exactly as before.

import { BODY, strideOf } from "../skeleton.js";

const cache = new WeakMap(); // catalog → plan name → actor fields (one dims object per plan: reach caches key on it)

/** Actor fields for a body plan from the catalog (the stickman's for an unknown or missing plan). */
export function bodyPlan(catalog, name) {
  if (!cache.has(catalog)) cache.set(catalog, new Map());
  const byName = cache.get(catalog);
  if (!byName.has(name)) {
    const plan = catalog.bodies?.[name];
    if (!plan || name === "stickman") byName.set(name, { dims: BODY, stride: 1, posture: null, plan: "stickman" });
    else {
      const dims = { ...plan.dims, ...(plan.torsoWidth ? { torsoWidth: plan.torsoWidth } : {}) };
      byName.set(name, { dims, stride: strideOf(dims), posture: plan.posture || null, plan: name });
    }
  }
  return byName.get(name);
}
