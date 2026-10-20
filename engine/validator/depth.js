// Depth and light checks for v3 stories (ENGINE_V3_SPEC 5.1-5.2, V3.2-V3.3): every z stays inside its
// scene's depth range, a node says `z` or `layer` (not both), and light presets exist in the catalog.

import { depthOf, LAYER_Z } from "../depth.js";
import { viewsOf } from "../turnaround.js";

const issue = (code, path, message, fix) => ({ code, path, message, fix });

/**
 * @param {object} story  a normalized v3 story (compiled or not)
 * @returns {object[]} issues: E_DEPTH_RANGE, E_DEPTH_LAYER, E_LIGHT_UNKNOWN, E_CAMERA_MOVE, E_REF_CHARACTER (lens focus), E_VIEW_BODY
 */
export function depthIssues(story, catalog = null) {
  const out = [];
  if (!story.v3) return out;
  // Light rigs (V3.3): a scene's or location's `light` names a catalog preset.
  const lightCheck = (light, path) => {
    const name = typeof light === "string" ? light : light?.preset;
    if (name !== undefined && catalog?.lights && !catalog.lights.rigs[name]) out.push(issue("E_LIGHT_UNKNOWN", path, `Unknown light preset '${name}'.`, `Use one of: ${catalog.lightNames.join(", ")}.`));
  };
  (story.locations || []).forEach((l, i) => lightCheck(l.light, `locations[${i}].light`));
  const locations = new Map((story.locations || []).map((l, i) => [l.id, { l, i }]));
  const check = (node, path, depth, what) => {
    if (typeof node?.z !== "number") return;
    if (node.layer !== undefined) out.push(issue("E_DEPTH_LAYER", path, `${what} gives both "z" and "layer".`, `Keep one: "layer" means z ${LAYER_Z[node.layer] ?? 0}.`));
    if (node.z < depth.far || node.z > depth.near) out.push(issue("E_DEPTH_RANGE", `${path}.z`, `${what} is at z ${node.z}, outside the scene's depth range ${depth.far}..${depth.near}.`, `Keep z between ${depth.far} and ${depth.near}, or widen the scene's "depth".`));
  };
  story.scenes.forEach((scene, si) => {
    if (scene.macro) return;
    const sp = scene.srcPath ?? `scenes[${si}]`;
    lightCheck(scene.light, `${sp}.light`);
    // The v3 camera (V3.4): named moves exist; focus names a character placed in the scene.
    const placed = new Set((scene.cast || []).map((c) => c.id));
    const focusCheck = (id, path) => {
      if (id !== undefined && !placed.has(id)) out.push(issue("E_REF_CHARACTER", path, `Focus on '${id}', who is not in scene '${scene.id}'.`, `Use one of: ${[...placed].join(", ")}.`));
    };
    focusCheck(scene.lens?.focus, `${sp}.lens.focus`);
    // Turnaround views (V3.6): a character only turns to a view its body plan has.
    const planOf = (id) => catalog?.bodies?.[story.cast.find((c) => c.id === id)?.body ?? "stickman"];
    const viewCheck = (id, view, path) => {
      if (view === undefined || !catalog?.bodies) return;
      const plan = planOf(id);
      const have = viewsOf(plan);
      if (!have.includes(view)) out.push(issue("E_VIEW_BODY", path, `'${id}' (${story.cast.find((c) => c.id === id)?.body ?? "stickman"}) has no ${view} view.`, `Use one of: ${have.join(", ")}.`));
    };
    (scene.cast || []).forEach((p, i) => viewCheck(p.id, p.view ?? story.cast.find((c) => c.id === p.id)?.view, `${sp}.cast[${i}].view`));
    (scene.beats || []).forEach((b, i) => viewCheck(b.who, b.view, `${b.path ?? `${sp}.beats[${i}]`}.view`));
    (scene.camera || []).forEach((k, i) => {
      if (k.move !== undefined && catalog?.cameraMoves && !catalog.cameraMoves[k.move]) out.push(issue("E_CAMERA_MOVE", `${sp}.camera[${i}].move`, `Unknown camera move '${k.move}'.`, `Use one of: ${catalog.cameraMoveNames.join(", ")}.`));
      focusCheck(k.focus, `${sp}.camera[${i}].focus`);
    });
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
