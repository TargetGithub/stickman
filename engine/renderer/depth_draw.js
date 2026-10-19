// Drawing a v3 scene with the depth lane (ENGINE_V3_SPEC 5.1, ADR-023). Milestone: V3.2.
// The scene graph (engine/scene.js) gives the nodes far to near; each is drawn inside its depth transform
// (engine/depth.js): scaled about the camera x, feet lifted toward the horizon as it recedes. The stage-line
// group (loose props, trails, particles, moving objects) draws in the v2 order at z = 0. Contact shadows sit
// at each character's projected feet, and shrink with distance because they are drawn inside the transform.

import { depthTransform, projectJoints, LAYER_Z } from "../depth.js";
import { sceneNodes, characterDepths } from "../scene.js";
import { lowestPoint } from "../skeleton.js";
import { drawSetPiece } from "./objects.js";
import { drawExtras } from "./extras.js";
import { drawCharacter } from "./character.js";
import { drawLitContactShadow, drawCastShadow } from "./shading.js";
import { contactShadow, castShadow, fogAt, fogVeils, rgbText } from "../lighting.js";
import { STAGE } from "../config.js";

/** Draw inside the depth transform of a node whose feet stand at world x. */
export function withDepth(ctx, z, x, cam, depth, draw) {
  if (Math.abs(z) < 1e-6) return draw();
  const t = depthTransform(z, x, cam, STAGE.groundY, depth);
  ctx.save();
  ctx.transform(t.s, 0, 0, t.s, t.tx, t.ty);
  draw();
  ctx.restore();
}

/** The contact shadow under a character (the v2 ellipse; inside a depth transform it scales with the node). */
export function drawContactShadow(ctx, c) {
  if (c.alpha <= 0.01) return;
  const h = STAGE.groundY - lowestPoint(c.j, c.scale, c.dims);
  const k = Math.max(0, 1 - h / 400);
  ctx.fillStyle = `rgba(0,0,0,${0.18 * k * c.alpha})`;
  ctx.beginPath();
  ctx.ellipse(c.j.hip.x, STAGE.groundY + 3, 44 * c.scale * (0.6 + 0.4 * k), 8 * c.scale * (0.6 + 0.4 * k), 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The scene graph of frame f for a v3 scene view.
 * @param {object} sv  scene view with depth, depthEvents (Map id → events), placementZ (Map), extras
 */
export function frameNodes(sv, f, chars, pieces) {
  return sceneNodes({ chars, pieces, extras: sv.extras, depthEvents: sv.depthEvents, placementZ: sv.placementZ, storyT: f.storyT - (sv.storyStart ?? 0), depth: sv.depth });
}

/**
 * Characters with their joints projected to where they really draw (for overlays and particle anchors).
 * @returns {object[]} the same character objects when nobody is off the stage line
 */
export function projectedChars(chars, depths, cam, depth) {
  if (![...depths.values()].some((z) => Math.abs(z) > 1e-6)) return chars;
  return chars.map((c) => {
    const z = depths.get(c.id) || 0;
    return Math.abs(z) < 1e-6 ? c : { ...c, j: projectJoints(c.j, z, c.j.hip.x, cam, STAGE.groundY, depth), z };
  });
}

/**
 * Draw the world of a v3 scene. `stage` draws the z = 0 group (items, trails, particles, moving objects) and
 * `character(c)` draws one character with its looks and effects; both come from renderer/index.js.
 */
export function drawDepthWorld(ctx, r, f, chars, sv, pieces, { stage, character }) {
  const cam = f.cam;
  const nodes = frameNodes(sv, f, chars, pieces);
  const depths = characterDepths(nodes);
  const rig = r.frameLight;
  // Fog by depth (V3.3): veils between the nodes so everything behind a node is fogged by its depth.
  const veils = rig ? fogVeils(nodes.map((n) => fogAt(rig, n.z, sv.depth)), fogAt(rig, sv.depth.far, sv.depth)) : null;
  const cast = rig ? castShadow(rig) : null;
  nodes.forEach((node, i) => {
    if (veils && veils[i] > 0.002) veil(ctx, r, rig.fog.color, veils[i]);
    if (node.kind === "piece") withDepth(ctx, node.z, node.ref.x, cam, sv.depth, () => drawSetPiece(ctx, r.catalog, node.ref, f.fxT));
    else if (node.kind === "extras") withDepth(ctx, node.z, cam.x, cam, sv.depth, () => drawExtras(ctx, r, sv, f, node.ref, true));
    else if (node.kind === "character") {
      const c = node.ref;
      withDepth(ctx, node.z, c.j.hip.x, cam, sv.depth, () => {
        if (!rig) drawContactShadow(ctx, c);
        else {
          drawLitContactShadow(ctx, c, contactShadow(rig, c.scale, bodyHeight(c)), STAGE.groundY);
          if (cast) drawCastShadow(ctx, c, cast, STAGE.groundY, (g, grey) => drawCharacter(g, c.j, { color: grey, outline: false, outlineColor: grey, farBrightness: 1, scale: c.scale, facing: c.facing, mouth: "neutral", dims: c.dims, draw: c.draw, torsoWidth: c.torsoWidth, ...(c.quad ? { quad: Object.fromEntries(Object.entries(c.quad).map(([k, v]) => [k, typeof v === "string" && v.startsWith("#") ? grey : v])), grip: c.grip } : {}) }));
        }
        character(c);
      });
    } else stage();
  });
  return depths;
}

/** Feet to head top, in world px. */
const bodyHeight = (c) => Math.max(1, Math.max(c.j.lFoot.y, c.j.rFoot.y) - c.j.head.y + (c.dims?.headR ?? 22) * c.scale);

/** A screen-space veil of the fog colour. */
function veil(ctx, r, color, alpha) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(${rgbText(color)},${alpha.toFixed(4)})`;
  ctx.fillRect(0, 0, r.W, r.H);
  ctx.restore();
}

export { LAYER_Z };
