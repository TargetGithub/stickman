// Drawing a v3 scene with the depth lane (ENGINE_V3_SPEC 5.1, ADR-023). Milestone: V3.2.
// The scene graph (engine/scene.js) gives the nodes far to near; each is drawn inside its depth transform
// (engine/depth.js): scaled about the camera x, feet lifted toward the horizon as it recedes. The stage-line
// group (loose props, trails, particles, moving objects) draws in the v2 order at z = 0. Contact shadows sit
// at each character's projected feet, and shrink with distance because they are drawn inside the transform.

import { depthTransform, projectJoints, LAYER_Z } from "../depth.js";
import { sceneNodes, characterDepths } from "../scene.js";
import { lowestPoint } from "../skeleton.js";
import { drawSetPiece, setPieceDef, glows } from "./objects.js";
import { drawLit, pieceShadow } from "./piece_light.js";
import { drawExtras } from "./extras.js";
import { drawCharacter } from "./character.js";
import { drawLitContactShadow, drawCastShadow } from "./shading.js";
import { contactShadow, castShadow, fogAt, fogVeils, rgbText } from "../lighting.js";
import { blurFor } from "../camera3.js";
import { blurLayer } from "./lens_draw.js";
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
export function drawDepthWorld(ctx0, r, f, chars, sv, pieces, { stage, character }) {
  const cam = f.cam;
  const nodes = frameNodes(sv, f, chars, pieces);
  const depths = characterDepths(nodes);
  const rig = r.frameLight;
  // Fog by depth (V3.3): veils between the nodes so everything behind a node is fogged by its depth.
  const veils = rig ? fogVeils(nodes.map((n) => fogAt(rig, n.z, sv.depth)), fogAt(rig, sv.depth.far, sv.depth)) : null;
  const cast = rig ? castShadow(rig) : null;
  // Depth of field (V3.4): nodes that share a blur level draw into one scratch layer, composited blurred.
  const dof = r.frameDof;
  let layer = null;
  const flush = () => {
    if (layer) layer.end();
    layer = null;
  };
  const target = (px) => {
    if (!px) return flush(), ctx0;
    if (layer?.px !== px) {
      flush();
      layer = { px, ...blurLayer(ctx0, r, px) };
    }
    return layer.ctx;
  };
  nodes.forEach((node, i) => {
    if (veils && veils[i] > 0.002) {
      flush();
      veil(ctx0, r, rig.fog.color, veils[i]);
    }
    const ctx = target(dof ? blurFor(node.z, dof.zf, dof.amount) : 0);
    if (layer && node.kind !== "character" && node.kind !== "piece") layer.add(null); // crowds and the stage group: the whole frame
    if (node.kind === "piece") {
      withDepth(ctx, node.z, node.ref.x, cam, sv.depth, () => {
        const def = setPieceDef(r.catalog, node.ref);
        const box = layer && pieceBox(r.catalog.objects?.[node.ref.object], node.ref);
        if (layer) box ? clipToBox(ctx, layer, box) : layer.add(null);
        // Under a light rig (ADR-035): a contact shadow where it stands, then the piece with the light's tones.
        if (rig && def) {
          pieceShadow(ctx, rig, def, node.ref.x, node.ref.y ?? 0);
          drawLit(ctx, r, glows(def) ? null : r.framePieceTones, pieceBox(def, node.ref), (g) => drawSetPiece(g, r.catalog, node.ref, f.fxT), Math.min(def.w ?? 200, def.h ?? 200) * 0.5);
        } else drawSetPiece(ctx, r.catalog, node.ref, f.fxT);
        if (box) ctx.restore();
      });
    }
    else if (node.kind === "extras") withDepth(ctx, node.z, cam.x, cam, sv.depth, () => drawExtras(ctx, r, sv, f, node.ref, true));
    else if (node.kind === "character") {
      const c = node.ref;
      withDepth(ctx, node.z, c.j.hip.x, cam, sv.depth, () => {
        if (layer) clipToBox(ctx, layer, characterBox(c, !!cast));
        if (!rig) drawContactShadow(ctx, c);
        else {
          drawLitContactShadow(ctx, c, contactShadow(rig, c.scale, bodyHeight(c)), STAGE.groundY);
          if (cast) drawCastShadow(ctx, c, cast, STAGE.groundY, (g, grey, alpha) => drawCharacter(g, c.j, { color: grey, alpha, outline: false, outlineColor: grey, farBrightness: 1, scale: c.scale, facing: c.facing, mouth: "neutral", dims: c.dims, draw: c.draw, torsoWidth: c.torsoWidth, limbStyle: sv.limbStyles?.get(c.id), ...(c.quad ? { quad: Object.fromEntries(Object.entries(c.quad).map(([k, v]) => [k, typeof v === "string" && v.startsWith("#") ? grey : v])), grip: c.grip } : {}) }), !!layer);
        }
        character(c, ctx);
        if (layer) ctx.restore();
      });
    } else stage(ctx);
  });
  flush();
  return depths;
}

/**
 * A generous world box around a character: its joints, hair and hats, a held prop, the contact shadow and (with a
 * cast shadow) the ground and wall around it. A blurred character draws clipped to it (V3.9).
 */
export function characterBox(c, cast) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  for (const p of Object.values(c.j)) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
  }
  const h = bodyHeight(c);
  const side = cast ? h * 2.5 : h * 0.9;
  return { x0: x0 - side, y0: y0 - (cast ? h : h * 0.6), x1: x1 + side, y1: STAGE.groundY + h * 0.5 };
}

/** A generous world box around a set piece from its catalog size (null without one: the whole frame). */
export function pieceBox(def, piece) {
  if (!def || !(def.w > 0) || !(def.h > 0)) return null;
  const base = STAGE.groundY - (piece.y ?? 0);
  const side = Math.max(def.w, def.h * 0.35) + 40; // tall pieces overhang: a lamp's glow, a tree's canopy
  return { x0: piece.x - side, y0: base - def.h * 1.6, x1: piece.x + side, y1: base + Math.max(40, def.h * 0.3) };
}

/** Clip ctx to a world box and announce its screen rect to the blur layer (ctx.save(); the caller restores). */
function clipToBox(ctx, layer, b) {
  const m = ctx.getTransform();
  const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }));
  layer.add({ x0: Math.min(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), x1: Math.max(...pts.map((p) => p.x)), y1: Math.max(...pts.map((p) => p.y)) });
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.clip();
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
