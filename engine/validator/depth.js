// Depth checks for v3 stories (ENGINE_V3_SPEC 5.1, V3.2): every z stays inside its scene's depth range,
// and a node says `z` or `layer`, not both.

import { depthOf, LAYER_Z } from "../depth.js";

const issue = (code, path, message, fix) => ({ code, path, message, fix });

/**
 * @param {object} story  a normalized v3 story (compiled or not)
 * @returns {object[]} issues: E_DEPTH_RANGE, E_DEPTH_LAYER
 */
export function depthIssues(story) {
  const out = [];
  if (!story.v3) return out;
  const locations = new Map((story.locations || []).map((l, i) => [l.id, { l, i }]));
  const check = (node, path, depth, what) => {
    if (typeof node?.z !== "number") return;
    if (node.layer !== undefined) out.push(issue("E_DEPTH_LAYER", path, `${what} gives both "z" and "layer".`, `Keep one: "layer" means z ${LAYER_Z[node.layer] ?? 0}.`));
    if (node.z < depth.far || node.z > depth.near) out.push(issue("E_DEPTH_RANGE", `${path}.z`, `${what} is at z ${node.z}, outside the scene's depth range ${depth.far}..${depth.near}.`, `Keep z between ${depth.far} and ${depth.near}, or widen the scene's "depth".`));
  };
  story.scenes.forEach((scene, si) => {
    if (scene.macro) return;
    const sp = scene.srcPath ?? `scenes[${si}]`;
    const depth = depthOf(scene);
    if (depth.far >= depth.near) out.push(issue("E_DEPTH_RANGE", `${sp}.depth`, `far (${depth.far}) must be below near (${depth.near}).`, "Use a negative far and a positive near."));
    (scene.cast || []).forEach((p, i) => check(p, `${sp}.cast[${i}]`, depth, `'${p.id}'`));
    (scene.set || []).forEach((p, i) => check(p, `${sp}.set[${i}]`, depth, `Set piece '${p.id}'`));
    const loc = locations.get(scene.location);
    (loc?.l.set || []).forEach((p, i) => check(p, `locations[${loc.i}].set[${i}]`, depth, `Set piece '${p.id}' (used by scene '${scene.id}')`));
    (scene.beats || []).forEach((b, i) => {
      if (typeof b.to?.z !== "number") return;
      const path = b.path ?? `${sp}.beats[${i}]`;
      if (b.to.z < depth.far || b.to.z > depth.near) out.push(issue("E_DEPTH_RANGE", `${path}.to.z`, `Beat '${b.id}' walks to z ${b.to.z}, outside the scene's depth range ${depth.far}..${depth.near}.`, `Keep z between ${depth.far} and ${depth.near}.`));
      if (b.layer !== undefined) out.push(issue("E_DEPTH_LAYER", path, `Beat '${b.id}' gives both "to.z" and "layer".`, "Use one: to.z walks there, layer jumps there."));
    });
  });
  return out;
}
